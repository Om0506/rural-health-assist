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
      CREATE TABLE IF NOT EXISTS health_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vitals JSONB,
        notes TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS flagged_cases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        severity VARCHAR(50),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
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

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

export default pool;
