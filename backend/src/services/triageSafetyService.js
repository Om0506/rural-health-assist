import { detectEmergency } from './severityEngine.js';
import { evaluateTriage, getTriageLabel, getTriageRecommendation } from './riskScoringService.js';
import {
  ESCALATION_ROUTES,
  mergeGroqAnalysisIntoMemory,
  normalizeHealthMemory,
  routeToTriageStatus,
} from './healthMemoryService.js';
import {
  hasClinicallyRelevantSymptoms,
  hasCurrentTurnClinicalContext,
  hasEscalationQualifyingSignal,
  shouldIgnoreForTriage,
} from './riskScoringService.js';

const FUNCTIONAL_PATTERNS =
  /unable to (sleep|eat|walk|sit|stand|work)|can't (sleep|eat|walk|sit)|cannot (sleep|eat|walk)/i;

/**
 * Backend safety layer: merge Groq contextual analysis with rule-based triage.
 */
export const finalizeTriageDecision = ({
  groqAnalysis = {},
  healthMemory,
  snapshot = {},
  message = '',
  messageSymptoms = [],
  language = 'English',
}) => {
  const rule = evaluateTriage({ snapshot, message, messageSymptoms });

  if (shouldIgnoreForTriage({ message, messageSymptoms })) {
    const safeMemory = {
      ...normalizeHealthMemory(healthMemory),
      riskScore: 0,
      riskLevel: 'LOW',
      trend: 'stable',
      escalationRoute: ESCALATION_ROUTES.SELF_CARE,
      aiSummary: '',
      lastUpdatedAt: new Date().toISOString(),
    };
    return {
      healthMemory: safeMemory,
      riskScore: 0,
      riskLevel: 'LOW',
      triageStatus: 'LOW',
      escalationRoute: ESCALATION_ROUTES.SELF_CARE,
      allowAutomation: false,
      scoreReasons: rule.scoreReasons || ['Non-health or casual message filtered'],
      triageLabel: getTriageLabel('LOW'),
      recommendation: getTriageRecommendation('LOW', language),
      aiSummary: '',
    };
  }

  let mergedMemory = mergeGroqAnalysisIntoMemory(healthMemory, groqAnalysis, snapshot);

  // Start from the more conservative of previous memory and rule-based score.
  let baseScore = Math.max(mergedMemory.riskScore, rule.riskScore || 0);

  // LLM provides only a small signed delta. Keep it conservative.
  const rawDelta = Number(groqAnalysis.severityDelta ?? 0) || 0;
  const clampedDelta = Math.max(-15, Math.min(20, rawDelta));

  // Apply small delta for mild updates; larger deltas only when LLM clearly signals.
  let riskScore = baseScore + clampedDelta;

  // Additional smoothing: prevent huge jumps from very low to very high in one step.
  if (baseScore < 30 && riskScore > 70) {
    riskScore = 70;
  }
  if (baseScore < 10 && riskScore > 40) {
    riskScore = 40;
  }

  const hasAnyHighRiskSignal = Boolean(
    snapshot.chestPain ||
      snapshot.breathingDifficulty ||
      snapshot.dehydration ||
      (detectEmergency(message) && hasCurrentTurnClinicalContext(message, messageSymptoms))
  );
  const symptomCount = [
    snapshot.fever,
    snapshot.cough,
    snapshot.headache,
    snapshot.vomiting,
    snapshot.diarrhea,
    snapshot.weakness,
    snapshot.bodyPain,
    snapshot.chestPain,
    snapshot.breathingDifficulty,
  ].filter(Boolean).length;

  // If symptoms are mild and non-progressive, don't let score drift high.
  if (!hasAnyHighRiskSignal && !groqAnalysis.progressionDetected && symptomCount <= 2) {
    riskScore = Math.min(riskScore, 45);
  }

  // Respect improvement: if delta is negative and no rule-based red flags, allow moderate decrease.
  if (clampedDelta < 0 && !snapshot.chestPain && !snapshot.breathingDifficulty) {
    const maxDrop = 15;
    const newScore = baseScore + clampedDelta;
    riskScore = Math.max(0, Math.max(newScore, baseScore - maxDrop));
  }

  // Bound global score range.
  riskScore = Math.max(0, Math.min(100, riskScore));

  let escalationRoute = mergedMemory.escalationRoute;

  if (FUNCTIONAL_PATTERNS.test(message)) {
    riskScore = Math.min(100, riskScore + 20);
    if (!mergedMemory.functionalImpairments.length) {
      mergedMemory.functionalImpairments = ['unable_to_function_normally'];
    }
  }

  if (groqAnalysis.functionalImpairment) {
    riskScore = Math.min(100, Math.max(riskScore, 55));
  }

  if (
    groqAnalysis.progressionDetected ||
    groqAnalysis.trend === 'deteriorating' ||
    groqAnalysis.trend === 'worsening'
  ) {
    riskScore = Math.min(100, riskScore + 12);
  }

  if (snapshot.chestPain || snapshot.breathingDifficulty) {
    riskScore = Math.max(riskScore, 85);
    escalationRoute = ESCALATION_ROUTES.DOCTOR_ESCALATION;
  }

  if (
    detectEmergency(message) &&
    hasClinicallyRelevantSymptoms(snapshot, messageSymptoms) &&
    hasCurrentTurnClinicalContext(message, messageSymptoms)
  ) {
    riskScore = Math.max(riskScore, 80);
    escalationRoute = ESCALATION_ROUTES.DOCTOR_ESCALATION;
  }

  if (riskScore >= 80) {
    escalationRoute = ESCALATION_ROUTES.DOCTOR_ESCALATION;
  } else if (riskScore >= 30) {
    if (escalationRoute === ESCALATION_ROUTES.SELF_CARE) {
      escalationRoute = ESCALATION_ROUTES.ASHA_REVIEW;
    }
  } else {
    escalationRoute = ESCALATION_ROUTES.SELF_CARE;
  }

  const hasQualifyingEscalationSignal = hasEscalationQualifyingSignal({
    snapshot,
    message,
    messageSymptoms,
    groqAnalysis,
  });

  if (!hasQualifyingEscalationSignal && riskScore >= 30) {
    riskScore = Math.min(riskScore, 25);
    escalationRoute = ESCALATION_ROUTES.SELF_CARE;
  }

  const riskLevel =
    riskScore >= 80 ? 'HIGH' : riskScore >= 30 ? 'MODERATE' : 'LOW';

  mergedMemory = mergeGroqAnalysisIntoMemory(mergedMemory, {
    riskScore,
    riskLevel,
    escalationRoute,
    summary: groqAnalysis.summary || mergedMemory.aiSummary,
  });

  const triageStatus = routeToTriageStatus(escalationRoute);
  const allowAutomation =
    rule.allowAutomation !== false &&
    triageStatus !== 'LOW' &&
    hasClinicallyRelevantSymptoms(snapshot, messageSymptoms) &&
    hasQualifyingEscalationSignal;

  const scoreReasons = [
    ...(rule.scoreReasons || []),
    `Groq contextual score: ${groqAnalysis.riskScore ?? 'n/a'}`,
    `Final route: ${escalationRoute}`,
    `Trend: ${mergedMemory.trend}`,
  ];

  return {
    healthMemory: mergedMemory,
    riskScore,
    riskLevel,
    triageStatus,
    escalationRoute,
    allowAutomation,
    scoreReasons,
    triageLabel: getTriageLabel(triageStatus),
    recommendation: getTriageRecommendation(triageStatus, language),
    aiSummary: mergedMemory.aiSummary || groqAnalysis.summary || '',
  };
};
