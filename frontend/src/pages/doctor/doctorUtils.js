export function formatSymptomsFromCase(item) {
  let structured = item?.structured_symptoms;
  if (typeof structured === 'string') {
    try {
      structured = JSON.parse(structured);
    } catch {
      structured = null;
    }
  }
  if (structured && typeof structured === 'object') {
    const parts = [];
    if (structured.fever) parts.push('Fever');
    if (structured.dehydration) parts.push('Dehydration');
    if (structured.weakness) parts.push('Weakness');
    if (structured.chestPain) parts.push('Chest pain');
    if (structured.breathingDifficulty) parts.push('Breathing difficulty');
    if (structured.vomiting) parts.push('Vomiting');
    if (structured.diarrhea) parts.push('Diarrhea');
    if (structured.durationLabel || structured.duration) {
      parts.push(`Duration: ${structured.durationLabel || structured.duration}`);
    }
    if (parts.length) return parts.join(' · ');
  }
  return item?.symptoms_summary || item?.reason || '—';
}

export function resolveRiskScore(item) {
  const raw = typeof item === 'number' ? item : item?.risk_score ?? item?.riskScore;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return Math.min(Math.round(n), 100);
  const sev = String(item?.severity || '').toLowerCase();
  if (sev === 'critical' || sev === 'severe') return 85;
  if (sev === 'high') return 75;
  if (sev === 'moderate') return 45;
  return 0;
}

export function riskTone(score) {
  if (score >= 70) return 'critical';
  if (score >= 30) return 'moderate';
  return 'low';
}

export function getCaseStatus(item) {
  const caseStatus =
    String(item?.case_status || item?.healthcare_case_status || '').toUpperCase() ||
    '';
  if (caseStatus) {
    if (caseStatus === 'RESOLVED') return 'resolved';
    if (caseStatus === 'UNDER_MONITORING') return 'monitoring';
    if (caseStatus === 'FOLLOW_UP' || caseStatus === 'FOLLOW_UP_PENDING' || caseStatus === 'PRESCRIPTION_ADDED') return 'pending';
    if (caseStatus === 'DOCTOR_ESCALATED') return 'pending';
    if (caseStatus === 'NEW') return 'pending';
    return 'pending';
  }

  const status = String(item?.status || 'pending').toLowerCase();
  if (status === 'resolved') return 'resolved';
  if (status === 'monitoring' || status === 'visited') return status;
  return 'pending';
}

export function getLifecycleStatus(item) {
  const caseStatus =
    String(item?.case_status || item?.healthcare_case_status || '').toUpperCase() ||
    '';
  const status = String(item?.status || '').toLowerCase();
  const triage = String(item?.triage_status || '').toUpperCase();
  const score = resolveRiskScore(item);

  if (caseStatus) {
    if (caseStatus === 'RESOLVED') return 'RESOLVED';
    if (caseStatus === 'DOCTOR_ESCALATED') return 'DOCTOR_ESCALATED';
    if (caseStatus === 'PRESCRIPTION_ADDED') return 'PRESCRIPTION_ADDED';
    if (caseStatus === 'FOLLOW_UP' || caseStatus === 'FOLLOW_UP_PENDING') return 'FOLLOW_UP_PENDING';
    if (caseStatus === 'UNDER_MONITORING') return 'ASHA_MONITORING';
    if (caseStatus === 'NEW') return 'NEW';
  }

  if (status === 'resolved') return 'RESOLVED';
  if (triage === 'DOCTOR_ESCALATED' || score >= 70) return 'DOCTOR_ESCALATED';
  if (status === 'visited') return 'ASHA_MONITORING';
  if (status === 'monitoring') return 'ASHA_MONITORING';
  if (triage === 'ASHA_REVIEW') return 'UNDER_REVIEW';
  if (status === 'pending') return 'NEW';
  return 'UNDER_REVIEW';
}

export function lifecycleBadgeVariant(lifecycle) {
  switch (lifecycle) {
    case 'RESOLVED':
      return 'success';
    case 'DOCTOR_ESCALATED':
      return 'danger';
    case 'FOLLOW_UP':
    case 'FOLLOW_UP_PENDING':
    case 'PRESCRIPTION_ADDED':
      return 'warning';
    case 'ASHA_MONITORING':
      return 'info';
    case 'UNDER_REVIEW':
      return 'primary';
    case 'NEW':
    default:
      return 'default';
  }
}

export function getEscalationSource(item) {
  const triage = String(item?.triage_status || '').toUpperCase();
  const source = String(item?.source || 'manual').toLowerCase();
  const reason = String(item?.escalation_reason || item?.reason || '');

  if (reason.includes('ASHA') || reason.includes('Asha')) return 'ASHA Escalation';
  if (triage === 'DOCTOR_ESCALATED' && source === 'ai_triage') return 'AI Escalation';
  if (triage === 'DOCTOR_ESCALATED') return 'Doctor Escalation';
  if (triage === 'ASHA_REVIEW') return 'AI Moderate Risk';
  if (source === 'ai_triage') return 'AI Triage';
  return 'Manual Flag';
}

export function isDoctorEscalated(item) {
  const caseStatus = String(item?.case_status || item?.healthcare_case_status || '').toUpperCase();
  const triage = String(item?.triage_status || '').toUpperCase();
  const score = resolveRiskScore(item);
  return caseStatus === 'DOCTOR_ESCALATED' || triage === 'DOCTOR_ESCALATED' || score >= 70;
}
