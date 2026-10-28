import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const query = (text, params) => pool.query(text, params);

export const initializeDatabase = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS villages (
        id SERIAL PRIMARY KEY,
        village_name VARCHAR(255) NOT NULL,
        village_code VARCHAR(100) UNIQUE,
        district VARCHAR(255),
        state VARCHAR(255),
        population INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        age INTEGER,
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS village_id INTEGER REFERENCES villages(id) ON DELETE SET NULL
    `);
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS worker_id VARCHAR(100) UNIQUE
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS healthcare_cases (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(40) NOT NULL DEFAULT 'NEW',
        escalation_reason TEXT,
        risk_level VARCHAR(30),
        assigned_doctor INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_asha INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS case_timeline (
        id SERIAL PRIMARY KEY,
        case_id INTEGER REFERENCES healthcare_cases(id) ON DELETE CASCADE,
        event_type VARCHAR(60) NOT NULL,
        title VARCHAR(255) NOT NULL,
        details TEXT,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_healthcare_cases_patient ON healthcare_cases(patient_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_case_timeline_case ON case_timeline(case_id, created_at DESC)`);
    await query(`
      UPDATE healthcare_cases
      SET status = 'FOLLOW_UP_PENDING'
      WHERE status = 'FOLLOW_UP'
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS health_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vitals JSONB,
        notes TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS asha_worker_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS temperature NUMERIC`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS blood_pressure VARCHAR(50)`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS symptoms TEXT`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS medicines_given TEXT`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS visit_type VARCHAR(50)`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS doctor_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS diagnosis TEXT`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS follow_up_date DATE`);
    await query(`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES healthcare_cases(id) ON DELETE SET NULL`);

    await query(`
      CREATE TABLE IF NOT EXISTS flagged_cases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        severity VARCHAR(50),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS asha_worker_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS doctor_notes TEXT`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS risk_score INTEGER`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS triage_status VARCHAR(30)`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS escalation_reason TEXT`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS structured_symptoms JSONB`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'manual'`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS symptoms_summary TEXT`);
    await query(`ALTER TABLE flagged_cases ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES healthcare_cases(id) ON DELETE SET NULL`);
    await query(`
      UPDATE flagged_cases fc
      SET status = 'resolved'
      FROM healthcare_cases hc
      WHERE fc.case_id = hc.id AND hc.status = 'RESOLVED' AND fc.status IS DISTINCT FROM 'resolved'
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255)`);
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'system'`);
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES healthcare_cases(id) ON DELETE SET NULL`);

    await query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        medicine_name VARCHAR(255) NOT NULL,
        dosage VARCHAR(255),
        doctor_notes TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
    await query(`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS duration VARCHAR(255)`);
    await query(`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS instructions TEXT`);
    await query(`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await query(`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES healthcare_cases(id) ON DELETE SET NULL`);

    await query(`
      CREATE TABLE IF NOT EXISTS medical_documents (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        category VARCHAR(50) DEFAULT 'general',
        title VARCHAR(255),
        original_name VARCHAR(255),
        stored_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(120),
        size_bytes INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES healthcare_cases(id) ON DELETE SET NULL`);
    await query(`CREATE INDEX IF NOT EXISTS idx_medical_documents_patient ON medical_documents(patient_id)`);

    await query(`
      CREATE TABLE IF NOT EXISTS asha_villages (
        id SERIAL PRIMARY KEY,
        asha_worker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        village_id INTEGER REFERENCES villages(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (asha_worker_id, village_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS medicine_logs (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        asha_worker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        medicine_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        notes TEXT,
        distributed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE medicine_logs ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES healthcare_cases(id) ON DELETE SET NULL`);

    await query(`
      CREATE TABLE IF NOT EXISTS daily_visits (
        id SERIAL PRIMARY KEY,
        asha_worker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        visit_notes TEXT,
        symptoms_observed TEXT,
        follow_up_required BOOLEAN DEFAULT FALSE,
        visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE daily_visits ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES healthcare_cases(id) ON DELETE SET NULL`);

    await query(`
      CREATE TABLE IF NOT EXISTS qrcodes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        qr_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS villager_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        age INTEGER,
        gender VARCHAR(50),
        phone VARCHAR(20),
        address TEXT,
        village_name VARCHAR(255),
        emergency_contact VARCHAR(20),
        family_id VARCHAR(100),
        height_cm NUMERIC,
        weight_kg NUMERIC,
        bp_systolic INTEGER,
        bp_diastolic INTEGER,
        heart_rate INTEGER,
        temperature NUMERIC,
        blood_sugar NUMERIC,
        spo2 INTEGER,
        existing_diseases JSONB,
        allergies JSONB,
        past_surgeries TEXT,
        smoker BOOLEAN,
        alcohol_consumption VARCHAR(50),
        activity_level VARCHAR(50),
        eating_pattern VARCHAR(50),
        covid_vaccination_status VARCHAR(50),
        tetanus_vaccine_date DATE,
        other_vaccinations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_message TEXT NOT NULL,
        bot_response TEXT NOT NULL,
        detected_symptoms JSONB,
        severity VARCHAR(20),
        language VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_title VARCHAR(255) DEFAULT 'New Health Chat',
        symptom_memory JSONB DEFAULT '{}',
        current_severity VARCHAR(20),
        conversation_state VARCHAR(40) DEFAULT 'COLLECTING_SYMPTOMS',
        language VARCHAR(20) DEFAULT 'English',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS risk_score INTEGER`);
    await query(`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS triage_status VARCHAR(30)`);
    await query(`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS structured_symptoms JSONB`);
    await query(`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS health_memory JSONB DEFAULT '{}'`);
    await query(`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS pending_escalation JSONB`);

    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
        sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'bot')),
        message TEXT NOT NULL,
        detected_symptoms JSONB,
        severity VARCHAR(20),
        severity_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

export default pool;
