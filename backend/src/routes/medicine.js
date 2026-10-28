import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { canAccessUserData, requireRole } from '../middleware/authorization.js';
import {
  addCaseTimelineEvent,
  attachRecordToCaseIfMissing,
  CASE_STATUS,
  updateHealthcareCaseStatus,
} from '../services/caseWorkflowService.js';

const router = express.Router();

router.post('/log', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const { patient_id, medicine_name, quantity, notes, case_id = null } = req.body;
    const actor = await query('SELECT id FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (!actor.rows.length) return res.status(404).json({ error: 'User not found' });

    const linkedCaseId = await attachRecordToCaseIfMissing({
      patientId: patient_id,
      explicitCaseId: case_id || null,
    });

    const result = await query(
      `INSERT INTO medicine_logs
        (patient_id, asha_worker_id, medicine_name, quantity, notes, case_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [patient_id, actor.rows[0].id, medicine_name, quantity, notes || null, linkedCaseId]
    );

    if (linkedCaseId) {
      await addCaseTimelineEvent({
        caseId: linkedCaseId,
        eventType: 'MEDICINE_LOG_RECORDED',
        title: 'Medicine log added',
        details: `${medicine_name} · Qty ${quantity}`,
        actorUserId: actor.rows[0].id,
      });
      await updateHealthcareCaseStatus({
        caseId: linkedCaseId,
        status: CASE_STATUS.UNDER_MONITORING,
        actorUserId: actor.rows[0].id,
      });
    }
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error logging medicine:', error);
    res.status(500).json({ error: 'Failed to log medicine distribution' });
  }
});

router.get('/patient/:patientId', authenticateUser, async (req, res) => {
  try {
    const { patientId } = req.params;

    req.params.userId = String(patientId);
    await new Promise((resolve, reject) => {
      canAccessUserData(req, res, (err) => (err ? reject(err) : resolve()));
    });

    const result = await query(
      'SELECT * FROM medicine_logs WHERE patient_id = $1 ORDER BY distributed_date DESC',
      [patientId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching medicine logs:', error);
    res.status(500).json({ error: 'Failed to fetch medicine logs' });
  }
});

router.put('/:logId', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const { logId } = req.params;
    const { medicine_name, quantity, notes } = req.body || {};

    const existing = await query(`SELECT * FROM medicine_logs WHERE id = $1`, [logId]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Medicine log not found' });
    const row = existing.rows[0];

    req.params.userId = String(row.patient_id);
    await new Promise((resolve, reject) => {
      canAccessUserData(req, res, (err) => (err ? reject(err) : resolve()));
    });

    const updated = await query(
      `UPDATE medicine_logs
       SET medicine_name = COALESCE($1, medicine_name),
           quantity = COALESCE($2, quantity),
           notes = COALESCE($3, notes),
           distributed_date = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [medicine_name ?? null, quantity ?? null, notes ?? null, logId]
    );
    return res.json(updated.rows[0]);
  } catch (error) {
    console.error('Error updating medicine log:', error);
    return res.status(500).json({ error: 'Failed to update medicine log' });
  }
});

router.delete('/:logId', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const { logId } = req.params;
    const existing = await query(`SELECT * FROM medicine_logs WHERE id = $1`, [logId]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Medicine log not found' });
    const row = existing.rows[0];

    req.params.userId = String(row.patient_id);
    await new Promise((resolve, reject) => {
      canAccessUserData(req, res, (err) => (err ? reject(err) : resolve()));
    });

    await query(`DELETE FROM medicine_logs WHERE id = $1`, [logId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting medicine log:', error);
    return res.status(500).json({ error: 'Failed to delete medicine log' });
  }
});

export default router;
