import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { canAccessUserData } from '../middleware/authorization.js';

const router = express.Router();

router.get('/:userId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const { userId } = req.params;

    const [
      profileRes,
      healthRes,
      visitsRes,
      prescriptionsRes,
      flaggedRes,
      docsRes,
      medicineRes,
      notificationsRes,
      chatRes,
      casesRes,
      caseTimelineRes,
    ] = await Promise.all([
      query(
        `SELECT u.*, v.village_name
         FROM users u
         LEFT JOIN villages v ON v.id = u.village_id
         WHERE u.id = $1`,
        [userId]
      ),
      query(
        `SELECT
           hr.*,
           d.name AS doctor_name,
           a.name AS asha_name,
           hc.status AS case_status,
           hc.escalation_reason AS case_title
         FROM health_records hr
         LEFT JOIN users d ON d.id = hr.doctor_id
         LEFT JOIN users a ON a.id = hr.asha_worker_id
         LEFT JOIN healthcare_cases hc ON hc.id = hr.case_id
         WHERE hr.patient_id = $1 OR hr.user_id = $1
         ORDER BY COALESCE(hr.created_at, hr.date) DESC
         LIMIT 100`,
        [userId]
      ),
      query(
        `SELECT dv.*, aw.name AS asha_name
         FROM daily_visits dv
         LEFT JOIN users aw ON aw.id = dv.asha_worker_id
         WHERE dv.patient_id = $1
         ORDER BY dv.visit_date DESC
         LIMIT 100`,
        [userId]
      ),
      query(
        `SELECT p.*, d.name AS doctor_name
         FROM prescriptions p
         LEFT JOIN users d ON d.id = p.doctor_id
         WHERE p.patient_id = $1 OR p.user_id = $1
         ORDER BY COALESCE(p.created_at, p.date) DESC
         LIMIT 100`,
        [userId]
      ),
      query(
        `SELECT fc.*, aw.name AS flagged_by
         FROM flagged_cases fc
         LEFT JOIN users aw ON aw.id = fc.asha_worker_id
         WHERE fc.patient_id = $1 OR fc.user_id = $1
         ORDER BY COALESCE(fc.created_at, fc.date) DESC
         LIMIT 100`,
        [userId]
      ),
      query(
        `SELECT d.*, u.name AS uploaded_by_name
         FROM medical_documents d
         LEFT JOIN users u ON u.id = d.uploaded_by
         WHERE d.patient_id = $1
         ORDER BY d.created_at DESC
         LIMIT 100`,
        [userId]
      ),
      query(
        `SELECT ml.*, aw.name AS asha_name
         FROM medicine_logs ml
         LEFT JOIN users aw ON aw.id = ml.asha_worker_id
         WHERE ml.patient_id = $1
         ORDER BY ml.distributed_date DESC
         LIMIT 100`,
        [userId]
      ),
      query(
        `SELECT
           n.id,
           n.user_id,
           n.patient_id,
           COALESCE(n.title, 'Notification') AS title,
           n.message,
           COALESCE(n.type, 'system') AS type,
           n.is_read,
           COALESCE(n.created_at, n.date) AS created_at
         FROM notifications n
         WHERE n.patient_id = $1 OR n.user_id = $1
         ORDER BY COALESCE(n.created_at, n.date) DESC
         LIMIT 50`,
        [userId]
      ),
      query(
        `SELECT id, session_title, risk_score, triage_status, structured_symptoms, current_severity,
                symptom_memory, created_at, updated_at
         FROM chat_sessions
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 20`,
        [userId]
      ),
      query(
        `SELECT hc.*, d.name AS assigned_doctor_name, a.name AS assigned_asha_name
         FROM healthcare_cases hc
         LEFT JOIN users d ON d.id = hc.assigned_doctor
         LEFT JOIN users a ON a.id = hc.assigned_asha
         WHERE hc.patient_id = $1
         ORDER BY hc.created_at DESC
         LIMIT 50`,
        [userId]
      ),
      query(
        `SELECT ct.*, u.name AS actor_name
         FROM case_timeline ct
         JOIN healthcare_cases hc ON hc.id = ct.case_id
         LEFT JOIN users u ON u.id = ct.actor_user_id
         WHERE hc.patient_id = $1
         ORDER BY ct.created_at DESC
         LIMIT 200`,
        [userId]
      ),
    ]);

    if (!profileRes.rows.length) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    return res.json({
      patient: profileRes.rows[0],
      healthHistory: healthRes.rows,
      ashaVisits: visitsRes.rows,
      prescriptions: prescriptionsRes.rows,
      flaggedCases: flaggedRes.rows,
      documents: docsRes.rows,
      medicineLogs: medicineRes.rows,
      notifications: notificationsRes.rows,
      chatSessions: chatRes.rows,
      healthcareCases: casesRes.rows,
      caseTimeline: caseTimelineRes.rows,
    });
  } catch (error) {
    console.error('Error loading patient history bundle:', error);
    return res.status(500).json({ error: 'Failed to load patient history' });
  }
});

export default router;
