import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { canAccessUserData } from '../middleware/authorization.js';

const router = express.Router();

router.get('/patient/:userId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const { userId } = req.params;
    const cases = await query(
      `SELECT
         hc.*,
         d.name AS assigned_doctor_name,
         a.name AS assigned_asha_name,
         (
           SELECT ct.title
           FROM case_timeline ct
           WHERE ct.case_id = hc.id
           ORDER BY ct.created_at DESC
           LIMIT 1
         ) AS latest_update,
         (
           SELECT ct.details
           FROM case_timeline ct
           WHERE ct.case_id = hc.id
           ORDER BY ct.created_at DESC
           LIMIT 1
         ) AS latest_update_details,
         (
           SELECT ct.details
           FROM case_timeline ct
           WHERE ct.case_id = hc.id
             AND ct.event_type = 'DOCTOR_CONSULTATION'
           ORDER BY ct.created_at DESC
           LIMIT 1
         ) AS latest_doctor_notes,
         (
           SELECT ct.created_at
           FROM case_timeline ct
           WHERE ct.case_id = hc.id
           ORDER BY ct.created_at DESC
           LIMIT 1
         ) AS latest_update_at,
         (SELECT COUNT(*)::int FROM prescriptions p WHERE p.case_id = hc.id) AS prescription_count,
         (SELECT COUNT(*)::int FROM medical_documents md WHERE md.case_id = hc.id) AS report_count,
         (
           SELECT md.title
           FROM medical_documents md
           WHERE md.case_id = hc.id
           ORDER BY md.created_at DESC
           LIMIT 1
         ) AS latest_report_title,
         (
           SELECT COALESCE(hr.symptoms, hr.notes, hr.diagnosis)
           FROM health_records hr
           WHERE hr.case_id = hc.id
           ORDER BY COALESCE(hr.created_at, hr.date) DESC
           LIMIT 1
         ) AS latest_vitals_summary,
         (
           SELECT fc.source
           FROM flagged_cases fc
           WHERE fc.case_id = hc.id
           ORDER BY COALESCE(fc.created_at, fc.date) DESC
           LIMIT 1
         ) AS escalation_source,
         (
           SELECT MAX(hr.follow_up_date)
           FROM health_records hr
           WHERE hr.case_id = hc.id AND hr.follow_up_date IS NOT NULL
         ) AS follow_up_date
       FROM healthcare_cases hc
       LEFT JOIN users d ON d.id = hc.assigned_doctor
       LEFT JOIN users a ON a.id = hc.assigned_asha
       WHERE hc.patient_id = $1
       ORDER BY hc.created_at DESC`,
      [userId]
    );
    return res.json(cases.rows);
  } catch (error) {
    console.error('Error loading patient cases:', error);
    return res.status(500).json({ error: 'Failed to load patient cases' });
  }
});

router.get('/:caseId/timeline', authenticateUser, async (req, res) => {
  try {
    const { caseId } = req.params;
    const healthcareCase = await query(
      `SELECT patient_id FROM healthcare_cases WHERE id = $1`,
      [caseId]
    );
    if (!healthcareCase.rows.length) return res.status(404).json({ error: 'Case not found' });
    req.params.userId = String(healthcareCase.rows[0].patient_id);
    let authorized = false;
    await canAccessUserData(req, res, () => {
      authorized = true;
    });
    if (!authorized) return;

    const timeline = await query(
      `SELECT ct.*, u.name AS actor_name
       FROM case_timeline ct
       LEFT JOIN users u ON u.id = ct.actor_user_id
       WHERE ct.case_id = $1
       ORDER BY ct.created_at DESC`,
      [caseId]
    );
    return res.json(timeline.rows);
  } catch (error) {
    console.error('Error loading case timeline:', error);
    return res.status(500).json({ error: 'Failed to load case timeline' });
  }
});

export default router;
