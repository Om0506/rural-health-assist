import { query } from '../config/database.js';
import { buildEscalationReason } from './riskScoringService.js';
import {
  CASE_STATUS,
  ensureHealthcareCase,
  updateHealthcareCaseStatus,
} from './caseWorkflowService.js';

export const createNotification = async (userId, message, extra = {}) => {
  const { patientId = null, title = null, type = 'system', caseId = null } = extra;
  if (title || patientId || caseId) {
    return query(
      `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, patientId, title, message, type, caseId]
    );
  }
  return query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [userId, message]);
};

const getPatientContext = async (userId) => {
  const res = await query(
    `SELECT id, name, village_id FROM users WHERE id = $1`,
    [userId]
  );
  return res.rows[0] || null;
};

const getAshaWorkersForVillage = async (villageId) => {
  if (!villageId) return [];
  const res = await query(
    `SELECT DISTINCT u.id, u.name
     FROM users u
     JOIN asha_villages av ON av.asha_worker_id = u.id
     WHERE av.village_id = $1 AND u.role IN ('ASHA Worker', 'ASHA')`,
    [villageId]
  );
  return res.rows;
};

const getAllDoctors = async () => {
  const res = await query(`SELECT id, name FROM users WHERE role = 'Doctor'`);
  return res.rows;
};

const hasStructuredClinicalSignal = (structuredSymptoms = {}) => {
  const flags = [
    structuredSymptoms.fever,
    structuredSymptoms.cough,
    structuredSymptoms.headache,
    structuredSymptoms.vomiting,
    structuredSymptoms.diarrhea,
    structuredSymptoms.weakness,
    structuredSymptoms.dehydration,
    structuredSymptoms.chestPain,
    structuredSymptoms.breathingDifficulty,
    structuredSymptoms.bodyPain,
  ];
  if (flags.some(Boolean)) return true;
  return Array.isArray(structuredSymptoms.symptomList) && structuredSymptoms.symptomList.length > 0;
};

export const createAIFlaggedCase = async ({
  userId,
  reason,
  severity,
  riskScore,
  triageStatus,
  structuredSymptoms,
  escalationReason,
}) => {
  const patient = await getPatientContext(userId);
  let ashaWorkerId = null;
  if (patient?.village_id) {
    const ashaWorkers = await getAshaWorkersForVillage(patient.village_id);
    ashaWorkerId = ashaWorkers[0]?.id || null;
  }

  const healthcareCase = await ensureHealthcareCase({
    patientId: userId,
    escalationReason: escalationReason || reason,
    riskLevel: severity,
    assignedASHA: ashaWorkerId,
  });

  const inserted = await query(
    `INSERT INTO flagged_cases (
       user_id, patient_id, asha_worker_id, reason, severity, status,
       risk_score, triage_status, structured_symptoms, escalation_reason, source, symptoms_summary, case_id
     ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, 'ai_triage', $10, $11)
     RETURNING *`,
    [
      userId,
      userId,
      ashaWorkerId,
      reason,
      severity,
      riskScore,
      triageStatus,
      JSON.stringify(structuredSymptoms || {}),
      escalationReason,
      escalationReason,
      healthcareCase.id,
    ]
  );
  return { flagged: inserted.rows[0] || null, healthcareCase };
};

/**
 * Backend-only triage automation. Groq never calls this.
 */
export const runTriageAutomation = async ({
  userId,
  triageStatus,
  riskScore,
  originalMessage,
  structuredSymptoms,
  scoreReasons = [],
  allowAutomation = true,
  aiSummary = '',
}) => {
  if (!allowAutomation || triageStatus === 'LOW') {
    return { action: 'none', filtered: true };
  }

  if (!hasStructuredClinicalSignal(structuredSymptoms)) {
    return { action: 'none', filtered: true, reason: 'missing_clinical_symptoms' };
  }

  if (triageStatus === 'DOCTOR_ESCALATED' && Number(riskScore) < 80) {
    return { action: 'none', filtered: true, reason: 'doctor_threshold_not_met' };
  }

  if (triageStatus === 'ASHA_REVIEW' && Number(riskScore) < 30) {
    return { action: 'none', filtered: true, reason: 'asha_threshold_not_met' };
  }

  const patient = await getPatientContext(userId);
  const patientLabel = patient?.name ? `${patient.name} (ID ${userId})` : `patient ID ${userId}`;

  if (triageStatus === 'ASHA_REVIEW') {
    const escalationReason =
      buildEscalationReason({ riskScore, scoreReasons, triageStatus }) ||
      `AI moderate-risk triage (score ${riskScore}/100)`;

    const existingAsha = await query(
      `SELECT fc.id, fc.case_id
       FROM flagged_cases fc
       LEFT JOIN healthcare_cases hc ON hc.id = fc.case_id
       WHERE (fc.patient_id = $1 OR fc.user_id = $1)
         AND fc.source = 'ai_triage'
         AND fc.triage_status = 'ASHA_REVIEW'
         AND fc.status IS DISTINCT FROM 'resolved'
         AND COALESCE(hc.status, 'NEW') <> 'RESOLVED'
         AND fc.created_at > NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [userId]
    );

    if (existingAsha.rows.length && existingAsha.rows[0]?.case_id) {
      return {
        action: 'asha_review_existing_case',
        caseId: existingAsha.rows[0].case_id,
        duplicateSuppressed: true,
      };
    }

    let caseId = null;
    if (!existingAsha.rows.length || !existingAsha.rows[0]?.case_id) {
      const { flagged } = await createAIFlaggedCase({
        userId,
        reason: (aiSummary || originalMessage || 'AI flagged for ASHA follow-up').slice(0, 500),
        severity: 'moderate',
        riskScore,
        triageStatus: 'ASHA_REVIEW',
        structuredSymptoms,
        escalationReason,
      });
      caseId = flagged?.case_id || null;
      if (caseId) {
        await updateHealthcareCaseStatus({
          caseId,
          status: CASE_STATUS.UNDER_MONITORING,
          timelineTitle: 'AI escalated for ASHA monitoring',
          timelineDetails: escalationReason,
        });
        await createNotification(userId, 'A healthcare case has been created and is under ASHA monitoring.', {
          patientId: userId,
          title: 'Case created',
          type: 'case_created',
          caseId,
        });
      }
    }

    if (!caseId) {
      return { action: 'none', filtered: true, reason: 'case_creation_failed' };
    }

    const ashaWorkers = patient?.village_id
      ? await getAshaWorkersForVillage(patient.village_id)
      : [];

    const notifyIds = ashaWorkers.length
      ? ashaWorkers.map((w) => w.id)
      : [];

    if (!notifyIds.length) {
      await createNotification(userId, `ASHA follow-up recommended for your symptoms.`, {
        patientId: userId,
        title: 'ASHA monitoring suggested',
        type: 'asha_followup',
        caseId,
      });
    } else {
      await Promise.all(
        notifyIds.map((ashaId) =>
          createNotification(
            ashaId,
            `Moderate-risk triage: ${patientLabel} reported "${originalMessage}". Risk score: ${riskScore}. Please follow up.`,
            {
              patientId: userId,
              title: 'AI flagged case — follow-up required',
              type: 'ai_flagged',
              caseId,
            }
          )
        )
      );
    }

    return { action: 'asha_review', notified: notifyIds.length || 1 };
  }

  if (triageStatus === 'DOCTOR_ESCALATED') {
    const escalationReason = buildEscalationReason({
      riskScore,
      scoreReasons,
      triageStatus,
    });

    const existing = await query(
      `SELECT fc.id, fc.case_id
       FROM flagged_cases fc
       LEFT JOIN healthcare_cases hc ON hc.id = fc.case_id
       WHERE (fc.patient_id = $1 OR fc.user_id = $1)
         AND fc.source = 'ai_triage'
         AND fc.triage_status = 'DOCTOR_ESCALATED'
         AND fc.status IS DISTINCT FROM 'resolved'
         AND COALESCE(hc.status, 'NEW') <> 'RESOLVED'
         AND fc.created_at > NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [userId]
    );

    if (existing.rows.length && existing.rows[0]?.case_id) {
      return {
        action: 'doctor_escalated_existing_case',
        caseId: existing.rows[0].case_id,
        duplicateSuppressed: true,
      };
    }

    let caseId = null;
    if (!existing.rows.length || !existing.rows[0]?.case_id) {
      const { flagged } = await createAIFlaggedCase({
        userId,
        reason: (aiSummary || `AI escalation: ${originalMessage}`).slice(0, 500),
        severity: 'critical',
        riskScore,
        triageStatus,
        structuredSymptoms,
        escalationReason,
      });
      caseId = flagged?.case_id || null;
      if (caseId) {
        await updateHealthcareCaseStatus({
          caseId,
          status: CASE_STATUS.DOCTOR_ESCALATED,
          timelineTitle: 'AI escalated to doctor',
          timelineDetails: escalationReason,
        });
        await createNotification(userId, 'Your case has been escalated to a doctor for urgent review.', {
          patientId: userId,
          title: 'Doctor escalation',
          type: 'doctor_escalation',
          caseId,
        });
      }
    }

    if (!caseId) {
      return { action: 'none', filtered: true, reason: 'case_creation_failed' };
    }

    const doctors = await getAllDoctors();
    await Promise.all(
      doctors.map((doc) =>
        createNotification(
          doc.id,
          `High-risk AI escalation for ${patientLabel}. Score ${riskScore}/100. "${originalMessage}"`,
          {
            patientId: userId,
            title: 'Urgent: AI escalated case',
            type: 'doctor_escalation',
            caseId,
          }
        )
      )
    );

    if (patient?.village_id) {
      const ashaWorkers = await getAshaWorkersForVillage(patient.village_id);
      await Promise.all(
        ashaWorkers.map((w) =>
          createNotification(
            w.id,
            `Doctor escalation for ${patientLabel}. Risk score ${riskScore}. Coordinate urgent care.`,
            {
              patientId: userId,
              title: 'Doctor escalation — ASHA alert',
              type: 'doctor_escalation',
              caseId,
            }
          )
        )
      );
    }

    return { action: 'doctor_escalated' };
  }

  return { action: 'none' };
};

/** @deprecated Use runTriageAutomation — kept for any legacy callers */
export const createFlaggedCase = async (userId, reason, severity) => {
  const result = await createAIFlaggedCase({
    userId,
    reason,
    severity,
    riskScore: null,
    triageStatus: 'DOCTOR_ESCALATED',
    structuredSymptoms: {},
    escalationReason: reason,
  });
  return result.flagged;
};

export const runSeverityAutomation = async ({ userId, severity, originalMessage, emergency = false }) => {
  const triageStatus =
    severity === 'SEVERE' || emergency ? 'DOCTOR_ESCALATED' : severity === 'MODERATE' ? 'ASHA_REVIEW' : 'LOW';
  const riskScore = triageStatus === 'DOCTOR_ESCALATED' ? 75 : triageStatus === 'ASHA_REVIEW' ? 45 : 10;
  return runTriageAutomation({
    userId,
    triageStatus,
    riskScore,
    originalMessage,
    structuredSymptoms: {},
    scoreReasons: [`Legacy severity mapping: ${severity}`],
  });
};
