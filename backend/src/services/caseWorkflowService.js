import { query } from '../config/database.js';

export const CASE_STATUS = {
  NEW: 'NEW',
  UNDER_MONITORING: 'UNDER_MONITORING',
  DOCTOR_ESCALATED: 'DOCTOR_ESCALATED',
  PRESCRIPTION_ADDED: 'PRESCRIPTION_ADDED',
  FOLLOW_UP_PENDING: 'FOLLOW_UP_PENDING',
  FOLLOW_UP: 'FOLLOW_UP_PENDING',
  RESOLVED: 'RESOLVED',
};

const ACTIVE_CASE_STATUSES = [
  CASE_STATUS.NEW,
  CASE_STATUS.UNDER_MONITORING,
  CASE_STATUS.DOCTOR_ESCALATED,
  CASE_STATUS.PRESCRIPTION_ADDED,
  CASE_STATUS.FOLLOW_UP_PENDING,
];

export const isResolvedCaseStatus = (status) => String(status || '').toUpperCase() === CASE_STATUS.RESOLVED;

export const normalizeCaseStatus = (status) => {
  const value = String(status || '').trim().toUpperCase();
  if (value === 'FOLLOW_UP') return CASE_STATUS.FOLLOW_UP_PENDING;
  if (Object.values(CASE_STATUS).includes(value)) return value;
  return CASE_STATUS.NEW;
};

const shouldPreserveCurrentStatus = (currentStatus, nextStatus) => {
  const current = normalizeCaseStatus(currentStatus);
  const next = normalizeCaseStatus(nextStatus);
  if (current === CASE_STATUS.RESOLVED && next !== CASE_STATUS.RESOLVED) return true;
  if (
    current === CASE_STATUS.DOCTOR_ESCALATED &&
    [CASE_STATUS.NEW, CASE_STATUS.UNDER_MONITORING].includes(next)
  ) {
    return true;
  }
  if (
    [CASE_STATUS.PRESCRIPTION_ADDED, CASE_STATUS.FOLLOW_UP_PENDING].includes(current) &&
    [CASE_STATUS.NEW, CASE_STATUS.UNDER_MONITORING].includes(next)
  ) {
    return true;
  }
  return false;
};

export const addCaseTimelineEvent = async ({
  caseId,
  eventType,
  title,
  details = null,
  actorUserId = null,
  metadata = null,
}) => {
  if (!caseId || !eventType || !title) return null;
  const result = await query(
    `INSERT INTO case_timeline (case_id, event_type, title, details, actor_user_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [caseId, eventType, title, details, actorUserId, metadata ? JSON.stringify(metadata) : null]
  );
  return result.rows[0] || null;
};

export const getLatestActiveCaseForPatient = async (patientId) => {
  if (!patientId) return null;
  const result = await query(
    `SELECT *
     FROM healthcare_cases
     WHERE patient_id = $1 AND status = ANY($2::text[])
     ORDER BY created_at DESC
     LIMIT 1`,
    [patientId, ACTIVE_CASE_STATUSES]
  );
  return result.rows[0] || null;
};

export const createHealthcareCase = async ({
  patientId,
  escalationReason,
  riskLevel = 'moderate',
  assignedDoctor = null,
  assignedASHA = null,
  status = CASE_STATUS.NEW,
}) => {
  const created = await query(
    `INSERT INTO healthcare_cases
      (patient_id, status, escalation_reason, risk_level, assigned_doctor, assigned_asha)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [patientId, status, escalationReason || null, riskLevel || null, assignedDoctor, assignedASHA]
  );
  const healthcareCase = created.rows[0];
  await addCaseTimelineEvent({
    caseId: healthcareCase.id,
    eventType: 'CASE_CREATED',
    title: 'Case created',
    details: escalationReason || 'Healthcare case created from escalation flow.',
    actorUserId: assignedASHA || assignedDoctor || null,
  });
  return healthcareCase;
};

export const ensureHealthcareCase = async ({
  patientId,
  escalationReason,
  riskLevel = 'moderate',
  assignedDoctor = null,
  assignedASHA = null,
}) => {
  const activeCase = await getLatestActiveCaseForPatient(patientId);
  if (activeCase) return activeCase;
  return createHealthcareCase({
    patientId,
    escalationReason,
    riskLevel,
    assignedDoctor,
    assignedASHA,
    status: CASE_STATUS.NEW,
  });
};

export const attachRecordToCaseIfMissing = async ({
  patientId,
  explicitCaseId = null,
  createIfMissing = false,
  escalationReason = 'Case created during care workflow.',
  riskLevel = 'moderate',
}) => {
  if (explicitCaseId) {
    const existing = await query(
      `SELECT id, patient_id
       FROM healthcare_cases
       WHERE id = $1
       LIMIT 1`,
      [explicitCaseId]
    );
    if (existing.rows.length && String(existing.rows[0].patient_id) === String(patientId)) {
      return existing.rows[0].id;
    }
  }
  const activeCase = await getLatestActiveCaseForPatient(patientId);
  if (activeCase?.id) return activeCase.id;

  if (!createIfMissing) return null;

  const created = await createHealthcareCase({
    patientId,
    escalationReason,
    riskLevel,
  });
  return created?.id || null;
};

export const updateHealthcareCaseStatus = async ({
  caseId,
  status,
  actorUserId = null,
  timelineTitle = null,
  timelineDetails = null,
}) => {
  if (!caseId || !status) return null;
  let normalizedStatus = normalizeCaseStatus(status);
  const current = await query(`SELECT * FROM healthcare_cases WHERE id = $1`, [caseId]);
  const currentCase = current.rows[0] || null;
  if (!currentCase) return null;
  if (shouldPreserveCurrentStatus(currentCase.status, normalizedStatus)) {
    normalizedStatus = normalizeCaseStatus(currentCase.status);
  }
  const result = await query(
    `UPDATE healthcare_cases
     SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [normalizedStatus, caseId]
  );
  const updated = result.rows[0] || null;
  if (!updated) return null;

  await query(
    `UPDATE flagged_cases
     SET status = CASE
       WHEN $2 = 'RESOLVED' THEN 'resolved'
       WHEN status = 'resolved' THEN 'pending'
       ELSE status
     END
     WHERE case_id = $1`,
    [caseId, normalizedStatus]
  );

  if (timelineTitle) {
    await addCaseTimelineEvent({
      caseId,
      eventType: 'STATUS_UPDATED',
      title: timelineTitle,
      details: timelineDetails || `Case moved to ${normalizedStatus}`,
      actorUserId,
      metadata: { status: normalizedStatus },
    });
  }
  return updated;
};
