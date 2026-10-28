import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireRole, canAccessUserData } from '../middleware/authorization.js';
import {
  addCaseTimelineEvent,
  attachRecordToCaseIfMissing,
  CASE_STATUS,
  updateHealthcareCaseStatus,
} from '../services/caseWorkflowService.js';

const router = express.Router();

router.post('/add', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const {
      userId,
      patient_id,
      vitals,
      notes,
      temperature,
      blood_pressure,
      pulse,
      weight,
      oxygen_level,
      symptoms,
      medicines_given,
      visit_type,
      case_id,
    } = req.body;
    const patientId = patient_id || userId;

    const userExists = await query(
      'SELECT id FROM users WHERE id = $1',
      [patientId]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const actor = await query('SELECT id, role FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (actor.rows.length === 0) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    const ashaWorkerId = actor.rows[0].id;

    const mergedVitals = {
      ...(vitals || {}),
      ...(temperature ?? vitals?.temperature
        ? { temperature: temperature ?? vitals?.temperature }
        : {}),
      ...(blood_pressure ?? vitals?.blood_pressure
        ? { blood_pressure: blood_pressure ?? vitals?.blood_pressure }
        : {}),
      ...(pulse ?? vitals?.pulse ? { pulse: pulse ?? vitals?.pulse } : {}),
      ...(weight ?? vitals?.weight ? { weight: weight ?? vitals?.weight } : {}),
      ...(oxygen_level ?? vitals?.oxygen_level
        ? { oxygen_level: oxygen_level ?? vitals?.oxygen_level }
        : {}),
    };

    const linkedCaseId = await attachRecordToCaseIfMissing({
      patientId,
      explicitCaseId: case_id || null,
    });

    const result = await query(
      `INSERT INTO health_records 
      (user_id, patient_id, asha_worker_id, vitals, notes, temperature, blood_pressure, symptoms, medicines_given, visit_type, case_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        patientId,
        patientId,
        ashaWorkerId,
        JSON.stringify(mergedVitals),
        notes,
        temperature ?? vitals?.temperature ?? null,
        blood_pressure ?? vitals?.blood_pressure ?? null,
        symptoms || null,
        medicines_given || null,
        visit_type || 'home_visit',
        linkedCaseId,
      ]
    );
    if (linkedCaseId) {
      await addCaseTimelineEvent({
        caseId: linkedCaseId,
        eventType: 'HEALTH_RECORD_ADDED',
        title: 'Health record updated',
        details: symptoms || notes || 'Vitals and notes recorded by ASHA.',
        actorUserId: ashaWorkerId,
      });
      await updateHealthcareCaseStatus({
        caseId: linkedCaseId,
        status: CASE_STATUS.UNDER_MONITORING,
      });
    }

    const notificationMessage = `Health record added for patient ID ${patientId}.`;
    if (linkedCaseId) {
      await query(
        `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [patientId, patientId, 'Health record updated', notificationMessage, 'health_record', linkedCaseId]
      );
    }

    const severityText = `${symptoms || ''} ${notes || ''}`.toLowerCase();
    const hasSevereSignals = /(chest pain|breathing|severe|unconscious|blood|critical|high fever)/.test(severityText);
    if (hasSevereSignals && linkedCaseId) {
      await updateHealthcareCaseStatus({
        caseId: linkedCaseId,
        status: CASE_STATUS.DOCTOR_ESCALATED,
        actorUserId: ashaWorkerId,
        timelineTitle: 'ASHA escalated from health record',
        timelineDetails: symptoms || notes || 'Severe symptoms recorded by ASHA.',
      });
      await query(
        `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
         SELECT u.id, $1, $2, $3, $4, $5
         FROM users u
         WHERE u.role = 'Doctor'`,
        [
          patientId,
          'Patient condition requires attention',
          `Severe symptoms detected for patient ID ${patientId}.`,
          'doctor_escalation',
          linkedCaseId,
        ]
      );
    }

    const needsFollowUp =
      /\b(revisit|follow up|follow-up|recheck|review)\b/i.test(String(notes || '')) ||
      /\b(revisit|follow up|follow-up|recheck|review)\b/i.test(String(symptoms || ''));

    if (needsFollowUp && linkedCaseId) {
      await updateHealthcareCaseStatus({
        caseId: linkedCaseId,
        status: CASE_STATUS.FOLLOW_UP_PENDING,
        actorUserId: ashaWorkerId,
        timelineTitle: 'Follow-up pending',
        timelineDetails: notes || symptoms || 'Follow-up requested from ASHA health record.',
      });
      await query(
        `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          patientId,
          patientId,
          'Follow-up reminder',
          `Follow-up reminder for patient ID ${patientId}.`,
          'follow_up',
          linkedCaseId,
        ]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding health record:', error);
    res.status(500).json({ error: 'Failed to add health record' });
  }
});

router.get('/:userId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
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
       WHERE hr.user_id = $1 OR hr.patient_id = $1
       ORDER BY COALESCE(hr.created_at, hr.date) DESC`,
      [userId]
    );

    const normalized = result.rows.map((row) => {
      const existingVitals = row.vitals && typeof row.vitals === 'object' ? row.vitals : {};
      return {
        ...row,
        // Backward-compatible: ensure vitals always includes key fields for villager UI.
        vitals: {
          ...existingVitals,
          ...(row.temperature != null ? { temperature: row.temperature } : {}),
          ...(row.blood_pressure != null ? { blood_pressure: row.blood_pressure } : {})
        }
      };
    });

    res.json(normalized);
  } catch (error) {
    console.error('Error fetching health records:', error);
    res.status(500).json({ error: 'Failed to fetch health records' });
  }
});

router.put('/:recordId', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const { recordId } = req.params;
    const {
      notes,
      temperature,
      blood_pressure,
      pulse,
      weight,
      oxygen_level,
      symptoms,
      medicines_given,
      visit_type,
      vitals,
    } = req.body || {};

    const existing = await query(`SELECT * FROM health_records WHERE id = $1`, [recordId]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Health record not found' });
    const row = existing.rows[0];

    req.params.userId = String(row.patient_id || row.user_id);
    await new Promise((resolve, reject) => {
      canAccessUserData(req, res, (err) => (err ? reject(err) : resolve()));
    });

    const existingVitals = row.vitals && typeof row.vitals === 'object' ? row.vitals : {};
    const mergedVitals = {
      ...existingVitals,
      ...(vitals && typeof vitals === 'object' ? vitals : {}),
      ...(temperature != null ? { temperature } : {}),
      ...(blood_pressure != null ? { blood_pressure } : {}),
      ...(pulse != null ? { pulse } : {}),
      ...(weight != null ? { weight } : {}),
      ...(oxygen_level != null ? { oxygen_level } : {}),
    };

    const updated = await query(
      `UPDATE health_records
       SET notes = COALESCE($1, notes),
           temperature = COALESCE($2, temperature),
           blood_pressure = COALESCE($3, blood_pressure),
           symptoms = COALESCE($4, symptoms),
           medicines_given = COALESCE($5, medicines_given),
           visit_type = COALESCE($6, visit_type),
           vitals = $7,
           created_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        notes ?? null,
        temperature ?? null,
        blood_pressure ?? null,
        symptoms ?? null,
        medicines_given ?? null,
        visit_type ?? null,
        JSON.stringify(mergedVitals),
        recordId,
      ]
    );

    return res.json(updated.rows[0]);
  } catch (error) {
    console.error('Error updating health record:', error);
    return res.status(500).json({ error: 'Failed to update health record' });
  }
});

router.delete('/:recordId', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const { recordId } = req.params;
    const existing = await query(`SELECT * FROM health_records WHERE id = $1`, [recordId]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Health record not found' });
    const row = existing.rows[0];

    req.params.userId = String(row.patient_id || row.user_id);
    await new Promise((resolve, reject) => {
      canAccessUserData(req, res, (err) => (err ? reject(err) : resolve()));
    });

    await query(`DELETE FROM health_records WHERE id = $1`, [recordId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting health record:', error);
    return res.status(500).json({ error: 'Failed to delete health record' });
  }
});

export default router;
