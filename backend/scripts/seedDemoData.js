import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env BEFORE database module — static imports run first in ESM,
// so database.js must be dynamically imported after dotenv.config().
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../.env');
dotenv.config({ path: envPath });

const ensureVillage = async (query) => {
  const result = await query(
    `INSERT INTO villages (village_name, village_code, district, state, population)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (village_code) DO UPDATE
     SET village_name = EXCLUDED.village_name
     RETURNING id`,
    ['Green Valley', 'GV-001', 'Demo District', 'Demo State', 2450]
  );
  return result.rows[0].id;
};

const upsertUser = async (query, { uid, name, age, role, phone, email, villageId, workerId = null }) => {
  const result = await query(
    `INSERT INTO users (firebase_uid, name, age, role, phone, email, village_id, worker_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (firebase_uid) DO UPDATE
     SET name = EXCLUDED.name,
         age = EXCLUDED.age,
         role = EXCLUDED.role,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         village_id = EXCLUDED.village_id,
         worker_id = COALESCE(EXCLUDED.worker_id, users.worker_id)
     RETURNING id`,
    [uid, name, age, role, phone, email, villageId, workerId]
  );
  return result.rows[0].id;
};

const ensureAshaVillageLink = async (query, ashaId, villageId) => {
  await query(
    `INSERT INTO asha_villages (asha_worker_id, village_id)
     VALUES ($1, $2)
     ON CONFLICT (asha_worker_id, village_id) DO NOTHING`,
    [ashaId, villageId]
  );
};

const ensureHealthRecord = async (query, patientId, ashaId) => {
  const existing = await query(
    `SELECT id FROM health_records WHERE patient_id = $1 LIMIT 1`,
    [patientId]
  );
  if (existing.rows.length) return;

  await query(
    `INSERT INTO health_records (user_id, patient_id, asha_worker_id, temperature, blood_pressure, symptoms, notes, visit_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      patientId,
      patientId,
      ashaId,
      100.1,
      '130/88',
      'Fever, weakness, mild dehydration',
      'Follow-up required in 2 days.',
      'home_visit',
    ]
  );
};

const ensureFlags = async (query, patientId, ashaId) => {
  const existing = await query(
    `SELECT id FROM flagged_cases
     WHERE patient_id = $1 AND source = 'ai_triage' AND status IS DISTINCT FROM 'resolved'
     LIMIT 1`,
    [patientId]
  );
  if (existing.rows.length) return;

  await query(
    `INSERT INTO flagged_cases
      (user_id, patient_id, asha_worker_id, reason, severity, status, risk_score, triage_status, source, symptoms_summary, escalation_reason)
     VALUES
      ($1, $1, $2, $3, 'moderate', 'monitoring', 52, 'ASHA_REVIEW', 'ai_triage', $4, $5),
      ($1, $1, $2, $6, 'critical', 'pending', 86, 'DOCTOR_ESCALATED', 'ai_triage', $7, $8)`,
    [
      patientId,
      ashaId,
      'Moderate risk triage: persistent fever with fatigue.',
      'Fever, weakness, dehydration trend',
      'AI suggested ASHA monitoring and hydration follow-up.',
      'ASHA escalated due to worsening breathing discomfort.',
      'Breathing difficulty with fever progression',
      'ASHA manual escalation for urgent doctor review.',
    ]
  );
};

const ensurePrescription = async (query, patientId, doctorId) => {
  const existing = await query(
    `SELECT id FROM prescriptions WHERE patient_id = $1 LIMIT 1`,
    [patientId]
  );
  if (existing.rows.length) return;

  await query(
    `INSERT INTO prescriptions (user_id, patient_id, doctor_id, medicine_name, dosage, duration, instructions, doctor_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      patientId,
      patientId,
      doctorId,
      'Paracetamol',
      '500mg twice daily',
      '3 days',
      'Hydration and rest. Return if breathing worsens.',
      'Monitor fever trend and oxygen saturation.',
    ]
  );
};

const ensureNotifications = async (query, patientId, ashaId, doctorId) => {
  const existing = await query(
    `SELECT id FROM notifications WHERE patient_id = $1 AND type = 'ai_flagged' LIMIT 1`,
    [patientId]
  );
  if (existing.rows.length) return;

  await query(
    `INSERT INTO notifications (user_id, patient_id, title, message, type)
     VALUES
      ($1, $2, 'AI flagged case — follow-up required', 'Moderate-risk triage for patient needs ASHA check.', 'ai_flagged'),
      ($3, $2, 'Urgent: AI escalated case', 'High-risk triage requires doctor review.', 'doctor_escalation'),
      ($2, $2, 'ASHA follow-up scheduled', 'ASHA worker will visit for symptom reassessment.', 'asha_followup')`,
    [ashaId, patientId, doctorId]
  );
};

const main = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error(`DATABASE_URL is not set. Expected env file at: ${envPath}`);
      process.exit(1);
    }

    const { query, initializeDatabase } = await import('../src/config/database.js');

    await initializeDatabase();

    const villageId = await ensureVillage(query);

    const villagerId = await upsertUser(query, {
      uid: 'demo-villager-uid',
      name: 'Ravi Kumar',
      age: 38,
      role: 'Villager',
      phone: '9000000001',
      email: 'demo.villager@rha.local',
      villageId,
    });

    const ashaId = await upsertUser(query, {
      uid: 'demo-asha-uid',
      name: 'Sita Devi',
      age: 29,
      role: 'ASHA',
      phone: '9000000002',
      email: 'demo.asha@rha.local',
      villageId,
      workerId: 'ASHA-001',
    });

    const doctorId = await upsertUser(query, {
      uid: 'demo-doctor-uid',
      name: 'Dr. Anil Mehta',
      age: 44,
      role: 'Doctor',
      phone: '9000000003',
      email: 'demo.doctor@rha.local',
      villageId,
    });

    await ensureAshaVillageLink(query, ashaId, villageId);
    await ensureHealthRecord(query, villagerId, ashaId);
    await ensureFlags(query, villagerId, ashaId);
    await ensurePrescription(query, villagerId, doctorId);
    await ensureNotifications(query, villagerId, ashaId, doctorId);

    console.log('Demo seed complete: village, users, records, flags, notifications, prescription.');
    process.exit(0);
  } catch (error) {
    console.error('Demo seed failed:', error);
    process.exit(1);
  }
};

main();
