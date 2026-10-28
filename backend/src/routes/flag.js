import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import {
  CASE_STATUS,
  ensureHealthcareCase,
  updateHealthcareCaseStatus,
} from '../services/caseWorkflowService.js';

const router = express.Router();

const createFlagCase = async (req, res, patientIdFromParam = null) => {
  try {
    const { patient_id, reason, severity } = req.body;
    const userId = patientIdFromParam || patient_id;

    const targetUserResult = await query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const userResult = await query(
      'SELECT id, role FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = userResult.rows[0];
    const isAuthorized = 
      currentUser.role === 'ASHA Worker' || 
      currentUser.role === 'ASHA' || 
      currentUser.role === 'Doctor' || 
      currentUser.id.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'You can only flag your own cases' });
    }

    const healthcareCase = await ensureHealthcareCase({
      patientId: userId,
      escalationReason: reason,
      riskLevel: severity || 'moderate',
      assignedASHA: currentUser.role === 'Doctor' ? null : currentUser.id,
      assignedDoctor: currentUser.role === 'Doctor' ? currentUser.id : null,
    });

    const result = await query(
      `INSERT INTO flagged_cases
        (user_id, patient_id, asha_worker_id, reason, severity, status, source, case_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'manual', $7)
       RETURNING *`,
      [
        userId,
        userId,
        currentUser.role === 'Doctor' ? null : currentUser.id,
        reason,
        severity || 'moderate',
        'pending',
        healthcareCase.id,
      ]
    );
    const flagged = result.rows[0];
    await updateHealthcareCaseStatus({
      caseId: healthcareCase.id,
      status: currentUser.role === 'Doctor' ? CASE_STATUS.DOCTOR_ESCALATED : CASE_STATUS.UNDER_MONITORING,
      actorUserId: currentUser.id,
      timelineTitle: currentUser.role === 'Doctor' ? 'Doctor opened case' : 'ASHA manually flagged case',
      timelineDetails: reason,
    });

    await query(
      `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        userId,
        'Case created',
        'A healthcare case has been created and is under ASHA monitoring.',
        'case_created',
        healthcareCase.id,
      ]
    );

    return res.status(201).json({ ...result.rows[0], case_id: healthcareCase.id });
  } catch (error) {
    console.error('Error flagging case:', error);
    return res.status(500).json({ error: 'Failed to flag case' });
  }
};

router.post('/', authenticateUser, async (req, res) => {
  return createFlagCase(req, res);
});

router.post('/:userId', authenticateUser, async (req, res) => {
  return createFlagCase(req, res, req.params.userId);
});

router.get('/village/:villageId', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const { villageId } = req.params;
    const result = await query(`
      SELECT fc.*, u.name, u.phone, u.village_id
      FROM flagged_cases fc
      JOIN users u ON fc.user_id = u.id
      WHERE u.village_id = $1
      ORDER BY COALESCE(fc.created_at, fc.date) DESC
    `, [villageId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching village flagged cases:', error);
    res.status(500).json({ error: 'Failed to fetch village flagged cases' });
  }
});

/** AI moderate-risk cases for ASHA monitoring */
router.get('/ai-flagged', authenticateUser, requireRole(['ASHA', 'ASHA Worker', 'Doctor']), async (req, res) => {
  try {
    const viewerResult = await query('SELECT id, role FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (!viewerResult.rows.length) return res.status(404).json({ error: 'User not found' });
    const viewer = viewerResult.rows[0];

    const params = [];
    let villageClause = '';
    if (viewer.role !== 'Doctor') {
      // Keep AI triage visible for ASHA workers even if assignment mapping is incomplete.
      villageClause = '';
    }

    const result = await query(
      `SELECT
         fc.*,
         u.name AS patient_name,
         u.phone,
         v.village_name,
         hc.status AS case_status,
         hc.risk_level AS case_risk_level,
         hc.escalation_reason AS case_escalation_reason,
         doc.name AS assigned_doctor_name
       FROM flagged_cases fc
       JOIN users u ON u.id = COALESCE(fc.patient_id, fc.user_id)
       LEFT JOIN villages v ON v.id = u.village_id
       LEFT JOIN healthcare_cases hc ON hc.id = fc.case_id
       LEFT JOIN users doc ON doc.id = hc.assigned_doctor
       WHERE fc.source = 'ai_triage'
         AND fc.status IS DISTINCT FROM 'resolved'
         AND COALESCE(hc.status, 'NEW') <> 'RESOLVED'
         ${villageClause}
       ORDER BY COALESCE(fc.risk_score, 0) DESC, COALESCE(fc.created_at, fc.date) DESC
       LIMIT 100`,
      params
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching AI flagged cases:', error);
    return res.status(500).json({ error: 'Failed to fetch AI flagged cases' });
  }
});

router.put('/:caseId/notes', authenticateUser, requireRole(['ASHA', 'ASHA Worker', 'Doctor']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { notes, status } = req.body;
    const viewer = await query('SELECT id, role FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (!viewer.rows.length) return res.status(404).json({ error: 'User not found' });

    const updated = await query(
      `UPDATE flagged_cases
       SET doctor_notes = COALESCE($1, doctor_notes),
           status = COALESCE($2, status)
       WHERE id = $3
       RETURNING *`,
      [notes || null, status || null, caseId]
    );
    if (!updated.rows.length) return res.status(404).json({ error: 'Case not found' });
    const row = updated.rows[0];
    if (row.case_id) {
      const currentCase = await query(`SELECT status FROM healthcare_cases WHERE id = $1`, [row.case_id]);
      const currentCaseStatus = currentCase.rows[0]?.status;
      const mappedStatus = String(status || '').toLowerCase() === 'resolved'
        ? CASE_STATUS.RESOLVED
        : currentCaseStatus === CASE_STATUS.DOCTOR_ESCALATED
        ? CASE_STATUS.DOCTOR_ESCALATED
        : CASE_STATUS.UNDER_MONITORING;
      await updateHealthcareCaseStatus({
        caseId: row.case_id,
        status: mappedStatus,
        actorUserId: viewer.rows[0].id,
        timelineTitle: mappedStatus === CASE_STATUS.RESOLVED ? 'Case resolved' : 'ASHA/Doctor updated notes',
        timelineDetails: notes || null,
      });
    }
    return res.json(updated.rows[0]);
  } catch (error) {
    console.error('Error updating case notes:', error);
    return res.status(500).json({ error: 'Failed to update case' });
  }
});

router.post('/:caseId/escalate-doctor', authenticateUser, requireRole(['ASHA', 'ASHA Worker']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { reason } = req.body;
    const asha = await query('SELECT id, name FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (!asha.rows.length) return res.status(404).json({ error: 'User not found' });

    const updated = await query(
      `UPDATE flagged_cases
       SET triage_status = 'DOCTOR_ESCALATED', severity = 'critical',
           escalation_reason = COALESCE($1, escalation_reason),
           risk_score = GREATEST(COALESCE(risk_score, 0), 80)
       WHERE id = $2
       RETURNING *`,
      [reason || `ASHA ${asha.rows[0].name} requested doctor review`, caseId]
    );
    if (!updated.rows.length) return res.status(404).json({ error: 'Case not found' });

    let fc = updated.rows[0];
    let healthcareCaseId = fc.case_id;
    if (!healthcareCaseId) {
      const healthcareCase = await ensureHealthcareCase({
        patientId: fc.patient_id || fc.user_id,
        escalationReason: reason || fc.escalation_reason || fc.reason,
        riskLevel: 'critical',
        assignedASHA: asha.rows[0].id,
      });
      healthcareCaseId = healthcareCase?.id || null;
      if (healthcareCaseId) {
        const linked = await query(
          `UPDATE flagged_cases SET case_id = $1 WHERE id = $2 RETURNING *`,
          [healthcareCaseId, fc.id]
        );
        fc = linked.rows[0] || fc;
      }
    }
    if (!healthcareCaseId) {
      return res.status(409).json({ error: 'Unable to create linked healthcare case for escalation' });
    }

    await updateHealthcareCaseStatus({
      caseId: healthcareCaseId,
      status: CASE_STATUS.DOCTOR_ESCALATED,
      actorUserId: asha.rows[0].id,
      timelineTitle: 'Escalated to doctor',
      timelineDetails: reason || null,
    });

    await query(
      `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
       SELECT u.id, $1, $2, $3, $4, $5 FROM users u WHERE u.role = 'Doctor'`,
      [
        fc.patient_id || fc.user_id,
        'ASHA requested doctor escalation',
        reason || `ASHA escalated case #${caseId} for doctor review`,
        'doctor_escalation',
        healthcareCaseId,
      ]
    );
    await query(
      `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        fc.patient_id || fc.user_id,
        fc.patient_id || fc.user_id,
        'Case escalated to doctor',
        'Your case has been escalated to a doctor.',
        'doctor_escalation',
        healthcareCaseId,
      ]
    );
    return res.json(updated.rows[0]);
  } catch (error) {
    console.error('Error escalating to doctor:', error);
    return res.status(500).json({ error: 'Failed to escalate case' });
  }
});

router.get('/all', authenticateUser, requireRole(['ASHA', 'ASHA Worker', 'Doctor']), async (req, res) => {
  try {
    const viewerResult = await query('SELECT id, role FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (viewerResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const viewer = viewerResult.rows[0];

    let result;
    if (viewer.role === 'Doctor') {
      result = await query(`
        SELECT
          fc.*,
          u.name AS patient_name,
          u.phone,
          u.village_id,
          v.village_name,
          hc.status AS case_status,
          hc.risk_level AS case_risk_level,
          hc.escalation_reason AS case_escalation_reason,
          doc.name AS assigned_doctor_name
        FROM flagged_cases fc 
        JOIN users u ON u.id = COALESCE(fc.patient_id, fc.user_id)
        LEFT JOIN villages v ON v.id = u.village_id
        LEFT JOIN healthcare_cases hc ON hc.id = fc.case_id
        LEFT JOIN users doc ON doc.id = hc.assigned_doctor
        ORDER BY COALESCE(fc.created_at, fc.date) DESC
      `);
    } else {
      result = await query(`
        SELECT
          fc.*,
          u.name AS patient_name,
          u.phone,
          u.village_id,
          v.village_name,
          hc.status AS case_status,
          hc.risk_level AS case_risk_level,
          hc.escalation_reason AS case_escalation_reason,
          doc.name AS assigned_doctor_name
        FROM flagged_cases fc
        JOIN users u ON u.id = COALESCE(fc.patient_id, fc.user_id)
        LEFT JOIN villages v ON v.id = u.village_id
        LEFT JOIN healthcare_cases hc ON hc.id = fc.case_id
        LEFT JOIN users doc ON doc.id = hc.assigned_doctor
        WHERE
          fc.source = 'ai_triage'
          OR fc.asha_worker_id = $1
          OR u.village_id IN (
            SELECT village_id FROM asha_villages WHERE asha_worker_id = $1
          )
          OR u.village_id = (
            SELECT village_id FROM users WHERE id = $1
          )
        ORDER BY COALESCE(fc.created_at, fc.date) DESC
      `, [viewer.id]);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching flagged cases:', error);
    res.status(500).json({ error: 'Failed to fetch flagged cases' });
  }
});

export default router;
