import { query } from '../config/database.js';

const mapHealthRecords = (rows) =>
  rows.map((row) => ({
    notes: row.notes,
    vitals: row.vitals,
    date: row.date
  }));

export const getPatientHistoryContext = async (userId) => {
  const [userResult, healthResult, notificationResult, flaggedResult] = await Promise.all([
    query('SELECT id, name, age FROM users WHERE id = $1', [userId]),
    query(
      'SELECT notes, vitals, date FROM health_records WHERE user_id = $1 ORDER BY date DESC LIMIT 5',
      [userId]
    ),
    query(
      'SELECT message, date FROM notifications WHERE user_id = $1 ORDER BY date DESC LIMIT 5',
      [userId]
    ),
    query(
      'SELECT reason, severity, date FROM flagged_cases WHERE user_id = $1 ORDER BY date DESC LIMIT 5',
      [userId]
    )
  ]);

  let prescriptionsResult = { rows: [] };
  try {
    prescriptionsResult = await query(
      'SELECT medicine_name, dosage, doctor_notes, date FROM prescriptions WHERE user_id = $1 ORDER BY date DESC LIMIT 5',
      [userId]
    );
  } catch (error) {
    // Keep chatbot functional even if prescriptions table is not yet available.
    prescriptionsResult = { rows: [] };
  }

  return {
    user: userResult.rows[0] || null,
    healthRecords: mapHealthRecords(healthResult.rows),
    prescriptions: prescriptionsResult.rows,
    notifications: notificationResult.rows,
    flaggedCases: flaggedResult.rows
  };
};

export const formatHistoryForPrompt = (history) => {
  const chunks = [];

  if (history.user) {
    chunks.push(`Patient: ${history.user.name}, Age: ${history.user.age ?? 'unknown'}`);
  }

  if (history.healthRecords.length) {
    const lines = history.healthRecords.map((item) => `- Health note: ${item.notes || 'No note'} (Date: ${item.date})`);
    chunks.push(`Recent Health Records:\n${lines.join('\n')}`);
  }

  if (history.prescriptions.length) {
    const lines = history.prescriptions.map(
      (item) => `- ${item.medicine_name} (${item.dosage || 'dosage not specified'}), note: ${item.doctor_notes || 'none'}`
    );
    chunks.push(`Recent Prescriptions:\n${lines.join('\n')}`);
  }

  if (history.flaggedCases.length) {
    const lines = history.flaggedCases.map((item) => `- ${item.reason} (${item.severity || 'unknown severity'})`);
    chunks.push(`Recent Flagged Cases:\n${lines.join('\n')}`);
  }

  if (history.notifications.length) {
    const lines = history.notifications.map((item) => `- ${item.message}`);
    chunks.push(`Recent Notifications:\n${lines.join('\n')}`);
  }

  return chunks.join('\n\n') || 'No prior patient history available.';
};
