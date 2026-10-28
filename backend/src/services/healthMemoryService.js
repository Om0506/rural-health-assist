/**
 * Structured session health memory — token-efficient context for Groq triage.
 */

export const ESCALATION_ROUTES = {
  SELF_CARE: 'SELF_CARE',
  ASHA_REVIEW: 'ASHA_REVIEW',
  DOCTOR_ESCALATION: 'DOCTOR_ESCALATION',
};

export const createEmptyHealthMemory = () => ({
  currentSymptoms: [],
  symptomCategories: [],
  severityIndicators: [],
  progressionIndicators: [],
  functionalImpairments: [],
  duration: null,
  durationLabel: null,
  riskScore: 0,
  riskLevel: 'LOW',
  trend: 'stable',
  escalationRoute: ESCALATION_ROUTES.SELF_CARE,
  aiSummary: '',
  lastUpdatedAt: null,
});

const uniq = (arr = []) => [...new Set((arr || []).filter(Boolean).map(String))];

export const normalizeHealthMemory = (raw) => {
  const base = createEmptyHealthMemory();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    currentSymptoms: uniq(raw.currentSymptoms),
    symptomCategories: uniq(raw.symptomCategories),
    severityIndicators: uniq(raw.severityIndicators),
    progressionIndicators: uniq(raw.progressionIndicators),
    functionalImpairments: uniq(raw.functionalImpairments),
    duration: raw.duration ?? null,
    durationLabel: raw.durationLabel ?? null,
    riskScore: Math.min(100, Math.max(0, Number(raw.riskScore) || 0)),
    riskLevel: ['LOW', 'MODERATE', 'HIGH'].includes(raw.riskLevel) ? raw.riskLevel : 'LOW',
    trend: ['stable', 'worsening', 'deteriorating', 'improving'].includes(raw.trend)
      ? raw.trend
      : 'stable',
    escalationRoute: Object.values(ESCALATION_ROUTES).includes(raw.escalationRoute)
      ? raw.escalationRoute
      : ESCALATION_ROUTES.SELF_CARE,
    aiSummary: String(raw.aiSummary || '').slice(0, 2000),
    lastUpdatedAt: raw.lastUpdatedAt || null,
  };
};

export const getHealthMemoryFromSession = (session) => {
  if (session?.health_memory && typeof session.health_memory === 'object') {
    return normalizeHealthMemory(session.health_memory);
  }
  const nested = session?.symptom_memory?.healthMemory;
  if (nested) return normalizeHealthMemory(nested);
  return createEmptyHealthMemory();
};

/** Merge Groq structured analysis into persisted memory */
export const mergeGroqAnalysisIntoMemory = (prevMemory, groqAnalysis = {}, ruleSnapshot = {}) => {
  const prev = normalizeHealthMemory(prevMemory);
  const a = groqAnalysis || {};

  const trend =
    a.trend ||
    (a.progressionDetected ? 'deteriorating' : prev.trend) ||
    'stable';

  // Groq is allowed to describe context, but final risk scoring happens in
  // triageSafetyService. Do not trust raw model scores/routes here.
  let riskScore = prev.riskScore;
  if (trend === 'deteriorating' || trend === 'worsening') {
    riskScore = Math.min(100, riskScore + (a.progressionDetected ? 10 : 0));
  }

  const riskLevel =
    a.riskLevel ||
    (riskScore >= 80 ? 'HIGH' : riskScore >= 30 ? 'MODERATE' : 'LOW');

  const escalationRoute =
    riskScore >= 80
      ? ESCALATION_ROUTES.DOCTOR_ESCALATION
      : riskScore >= 30
        ? ESCALATION_ROUTES.ASHA_REVIEW
        : ESCALATION_ROUTES.SELF_CARE;

  const duration =
    a.duration || ruleSnapshot.duration || ruleSnapshot.durationKey || prev.duration;
  const durationLabel =
    a.durationLabel || ruleSnapshot.durationLabel || prev.durationLabel;

  return normalizeHealthMemory({
    currentSymptoms: uniq([
      ...prev.currentSymptoms,
      ...(a.currentSymptoms || []),
      ...(ruleSnapshot.symptoms || []),
    ]),
    symptomCategories: uniq([...prev.symptomCategories, ...(a.symptomCategories || [])]),
    severityIndicators: uniq([...prev.severityIndicators, ...(a.severityIndicators || [])]),
    progressionIndicators: uniq([
      ...prev.progressionIndicators,
      ...(a.progressionIndicators || []),
      ...(a.progressionDetected ? ['progression_detected'] : []),
    ]),
    functionalImpairments: uniq([
      ...prev.functionalImpairments,
      ...(a.functionalImpairments || []),
      ...(a.functionalImpairment ? ['functional_impact'] : []),
    ]),
    duration,
    durationLabel,
    riskScore,
    riskLevel,
    trend,
    escalationRoute,
    aiSummary: a.summary || a.aiSummary || prev.aiSummary,
    lastUpdatedAt: new Date().toISOString(),
  });
};

export const routeToTriageStatus = (escalationRoute) => {
  if (escalationRoute === ESCALATION_ROUTES.DOCTOR_ESCALATION) return 'DOCTOR_ESCALATED';
  if (escalationRoute === ESCALATION_ROUTES.ASHA_REVIEW) return 'ASHA_REVIEW';
  return 'LOW';
};
