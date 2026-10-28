import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import {
  addCaseTimelineEvent,
  attachRecordToCaseIfMissing,
  CASE_STATUS,
  updateHealthcareCaseStatus,
} from '../services/caseWorkflowService.js';

const router = express.Router();

router.post('/add', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const { patient_id, visit_notes, symptoms_observed, follow_up_required, case_id = null } = req.body;
    const actor = await query('SELECT id FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (!actor.rows.length) return res.status(404).json({ error: 'User not found' });

    const linkedCaseId = await attachRecordToCaseIfMissing({
      patientId: patient_id,
      explicitCaseId: case_id || null,
    });

    const result = await query(
      `INSERT INTO daily_visits
        (asha_worker_id, patient_id, visit_notes, symptoms_observed, follow_up_required, case_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        actor.rows[0].id,
        patient_id,
        visit_notes || null,
        symptoms_observed || null,
        Boolean(follow_up_required),
        linkedCaseId,
      ]
    );

    const needsFollowUp =
      Boolean(follow_up_required) ||
      /\b(revisit|follow up|follow-up|recheck|review)\b/i.test(String(visit_notes || '')) ||
      /\b(revisit|follow up|follow-up|recheck|review)\b/i.test(String(symptoms_observed || ''));

    if (needsFollowUp) {
      await query(
        `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          actor.rows[0].id,
          patient_id,
          'Follow-up reminder',
          `Follow-up reminder for patient ID ${patient_id}.`,
          'follow_up',
          linkedCaseId,
        ]
      );
    }

    if (linkedCaseId) {
      await addCaseTimelineEvent({
        caseId: linkedCaseId,
        eventType: 'ASHA_VISIT_RECORDED',
        title: 'ASHA follow-up added',
        details: symptoms_observed || visit_notes || 'ASHA visit recorded',
        actorUserId: actor.rows[0].id,
      });
      if (needsFollowUp) {
        await updateHealthcareCaseStatus({
          caseId: linkedCaseId,
          status: CASE_STATUS.FOLLOW_UP_PENDING,
          actorUserId: actor.rows[0].id,
          timelineTitle: 'Follow-up pending',
          timelineDetails: 'ASHA follow-up planned / required.',
        });
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding daily visit:', error);
    res.status(500).json({ error: 'Failed to add daily visit' });
  }
});

router.get('/asha/:workerId', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const { workerId } = req.params;
    const result = await query(
      'SELECT * FROM daily_visits WHERE asha_worker_id = $1 ORDER BY visit_date DESC',
      [workerId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily visits:', error);
    res.status(500).json({ error: 'Failed to fetch daily visits' });
  }
});

export default router;
