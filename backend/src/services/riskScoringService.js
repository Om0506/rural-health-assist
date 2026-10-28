import { detectEmergency, detectSymptoms } from './severityEngine.js';

const CASUAL_NON_HEALTH_PATTERNS = [
  /^(hi|hello|hey|hii|yo|ok|okay|thanks|thank you|bye|goodbye|namaste)\b/i,
  /^(good\s*(morning|evening|afternoon|night))\b/i,
  /\b(are\s*you\s*mad|you\s*are\s*mad|stupid|idiot|shut\s*up|nonsense)\b/i,
  /\b(suggest\s*(me\s*)?medicine|prescribe\s*me|give\s*me\s*(a\s*)?medicine|which\s*medicine\s*should)\b/i,
  /\b(who\s*are\s*you|what\s*can\s*you\s*do|how\s*are\s*you)\b/i,
  /\b(random|joke|funny|bored|nothing happened|nothing is happening)\b/i,
  /\b(i\s*am|i'm|im)?\s*(dead|dying)\b/i,
  /\b(kill me|end my life|life is boring)\b/i,
];

const CURRENT_HEALTH_UPDATE_PATTERNS =
  /\b(since|for)\s+(\d+|one|two|three|four|five|six|seven)\s+(hour|hours|day|days|week|weeks)\b|more than\s+\d+\s+days?|few hours|today|yesterday|worse|worsening|increasing|not improving|continuous|severe|unable to|can't\s+(sleep|eat|walk|sit|stand|breathe)|cannot\s+(sleep|eat|walk|sit|stand|breathe)|oxygen|spo2|temperature|fever\b/i;

/** Canonical structured symptoms for DB + analytics */
export const buildStructuredSymptoms = (snapshot = {}) => ({
  fever: Boolean(snapshot.fever),
  cough: Boolean(snapshot.cough),
  headache: Boolean(snapshot.headache),
  vomiting: Boolean(snapshot.vomiting),
  diarrhea: Boolean(snapshot.diarrhea),
  weakness: Boolean(snapshot.weakness),
  dehydration: Boolean(snapshot.dehydration),
  chestPain: Boolean(snapshot.chestPain),
  breathingDifficulty: Boolean(snapshot.breathingDifficulty),
  bodyPain: Boolean(snapshot.bodyPain),
  worsening: Boolean(snapshot.worsening),
  sharpPain: Boolean(snapshot.sharpPain),
  continuousPain: Boolean(snapshot.continuousPain),
  duration: snapshot.duration || snapshot.durationKey || null,
  durationLabel: snapshot.durationLabel || null,
  durationDays: snapshot.durationDays ?? null,
  symptomList: Array.isArray(snapshot.symptoms) ? snapshot.symptoms : [],
});

/**
 * Numeric risk score (backend-only escalation driver).
 * Groq does NOT use this — chatbot route computes after each message.
 */
export const computeRiskScore = ({ snapshot = {}, message = '' }) => {
  let score = 0;
  const reasons = [];

  if (snapshot.fever) {
    score += 10;
    reasons.push('Fever reported (+10)');
  }
  if (snapshot.dehydration) {
    score += 20;
    reasons.push('Dehydration indicators (+20)');
  }
  const durationDays = Number(snapshot.durationDays) || 0;
  const durationKey = String(snapshot.duration || '');
  const persistentDuration =
    durationDays > 2 ||
    /^(3|4|5|6|7|more)_days$/.test(durationKey) ||
    durationKey === '1_week' ||
    /(3|three|4|four|5|five)\s*day/i.test(String(message));
  if (persistentDuration) {
    score += 20;
    reasons.push('Symptoms persisting beyond 2 days (+20)');
  }
  if (snapshot.weakness) {
    score += 15;
    reasons.push('Weakness reported (+15)');
  }
  if (snapshot.vomiting && durationDays >= 2) {
    score += 15;
    reasons.push('Persistent vomiting (+15)');
  }
  if (snapshot.breathingDifficulty) {
    score += 50;
    reasons.push('Breathing difficulty (+50)');
  }
  if (snapshot.chestPain) {
    score += 50;
    reasons.push('Chest pain (+50)');
  }
  if (snapshot.bodyPain && !snapshot.chestPain) {
    score += 15;
    reasons.push('Body pain (+15)');
  }
  if (snapshot.sharpPain) {
    score += 15;
    reasons.push('Sharp pain (+15)');
  }
  if (snapshot.continuousPain) {
    score += 15;
    reasons.push('Continuous pain (+15)');
  }
  if (snapshot.worsening) {
    score += 20;
    reasons.push('Symptoms worsening (+20)');
  }
  if (snapshot.chestPain && (snapshot.worsening || snapshot.continuousPain || snapshot.sharpPain)) {
    score += 25;
    reasons.push('Acute concerning chest pain pattern (+25)');
  }
  if (snapshot.chestPain && snapshot.fever) {
    score += 10;
    reasons.push('Chest pain with fever (+10)');
  }
  const acuteHours =
    durationDays < 0.25 ||
    durationKey === '1_hour' ||
    durationKey === 'few_hours' ||
    /past\s+hour|past\s+\d+\s+hour/i.test(String(message));
  if (snapshot.chestPain && acuteHours) {
    score += 15;
    reasons.push('Recent onset chest pain (+15)');
  }
  const hasClinicalContext = hasClinicallyRelevantSymptoms(snapshot, detectSymptoms(message));
  if (detectEmergency(message) && hasClinicalContext) {
    score += 30;
    reasons.push('Emergency keywords with clinical context (+30)');
  }
  if (/(oxygen|spo2).*(below|under|less).*(90)|unconscious|severe dehydration/i.test(String(message))) {
    score += 40;
    reasons.push('Critical vital signs mentioned (+40)');
  }

  return { riskScore: Math.min(score, 100), scoreReasons: reasons };
};

export const hasClinicallyRelevantSymptoms = (snapshot = {}, messageSymptoms = []) => {
  const clinicalFlags = [
    snapshot.fever,
    snapshot.cough,
    snapshot.headache,
    snapshot.vomiting,
    snapshot.diarrhea,
    snapshot.weakness,
    snapshot.dehydration,
    snapshot.chestPain,
    snapshot.breathingDifficulty,
    snapshot.bodyPain,
  ];
  if (clinicalFlags.some(Boolean)) return true;
  if (Array.isArray(messageSymptoms) && messageSymptoms.length > 0) return true;
  if (Array.isArray(snapshot.symptomList) && snapshot.symptomList.length > 0) return true;
  if (Array.isArray(snapshot.symptoms) && snapshot.symptoms.length > 0) return true;
  return false;
};

export const isCasualNonHealthMessage = (message = '') => {
  const text = String(message).trim();
  if (!text) return true;
  if (text.length <= 2) return true;
  return CASUAL_NON_HEALTH_PATTERNS.some((pattern) => pattern.test(text));
};

export const hasCurrentTurnClinicalContext = (message = '', messageSymptoms = []) => {
  if (Array.isArray(messageSymptoms) && messageSymptoms.length > 0) return true;
  return CURRENT_HEALTH_UPDATE_PATTERNS.test(String(message || ''));
};

export const shouldIgnoreForTriage = ({ message = '', messageSymptoms = [] } = {}) =>
  isCasualNonHealthMessage(message) && !hasCurrentTurnClinicalContext(message, messageSymptoms);

export const hasEscalationQualifyingSignal = ({
  snapshot = {},
  message = '',
  messageSymptoms = [],
  groqAnalysis = {},
} = {}) => {
  if (!hasClinicallyRelevantSymptoms(snapshot, messageSymptoms)) return false;
  const durationDays = Number(snapshot.durationDays) || 0;
  const currentClinicalContext = hasCurrentTurnClinicalContext(message, messageSymptoms);
  const currentEmergency = detectEmergency(message) && currentClinicalContext;

  return Boolean(
    snapshot.chestPain ||
      snapshot.breathingDifficulty ||
      snapshot.dehydration ||
      (snapshot.fever && (durationDays >= 3 || snapshot.weakness)) ||
      (snapshot.vomiting && durationDays >= 2) ||
      (snapshot.worsening && currentClinicalContext) ||
      (groqAnalysis.progressionDetected && currentClinicalContext) ||
      (groqAnalysis.functionalImpairment && currentClinicalContext) ||
      currentEmergency
  );
};

const hasHighRiskClinicalIndicator = (snapshot = {}, message = '') =>
  Boolean(
    snapshot.chestPain ||
      snapshot.breathingDifficulty ||
      snapshot.dehydration ||
      (snapshot.chestPain && (snapshot.worsening || snapshot.sharpPain || snapshot.continuousPain)) ||
      (snapshot.fever && (snapshot.weakness || Number(snapshot.durationDays) > 2)) ||
      detectEmergency(message)
  );

export const mapRiskScoreToTriage = (riskScore) => {
  // Raise doctor escalation threshold slightly to avoid over-escalating mild chats.
  if (riskScore >= 80) return 'DOCTOR_ESCALATED';
  if (riskScore >= 30) return 'ASHA_REVIEW';
  return 'LOW';
};

/**
 * Full tririage decision: score + healthcare validity + escalation gating.
 */
export const evaluateTriage = ({ snapshot = {}, message = '', messageSymptoms = [] }) => {
  const { riskScore: rawScore, scoreReasons } = computeRiskScore({ snapshot, message });
  let riskScore = rawScore;
  let reasons = [...scoreReasons];

  if (shouldIgnoreForTriage({ message, messageSymptoms })) {
    return {
      riskScore: 0,
      triageStatus: 'LOW',
      scoreReasons: ['Non-health or casual message filtered'],
      allowAutomation: false,
    };
  }

  if (!hasClinicallyRelevantSymptoms(snapshot, messageSymptoms)) {
    return {
      riskScore: 0,
      triageStatus: 'LOW',
      scoreReasons: ['No clinical symptoms detected — escalation skipped'],
      allowAutomation: false,
    };
  }

  if (isCasualNonHealthMessage(message) && !hasCurrentTurnClinicalContext(message, messageSymptoms)) {
    return {
      riskScore: Math.min(riskScore, 10),
      triageStatus: 'LOW',
      scoreReasons: [...reasons, 'Non-health or casual message filtered'],
      allowAutomation: false,
    };
  }

  let triageStatus = mapRiskScoreToTriage(riskScore);

  if (
    triageStatus === 'DOCTOR_ESCALATED' &&
    !hasHighRiskClinicalIndicator(snapshot, message)
  ) {
    triageStatus = 'ASHA_REVIEW';
    riskScore = Math.min(riskScore, 65);
    reasons = [...reasons, 'Downgraded: no high-risk clinical indicator for doctor escalation'];
  }

  if (triageStatus !== 'LOW' && !hasEscalationQualifyingSignal({ snapshot, message, messageSymptoms })) {
    triageStatus = 'LOW';
    riskScore = Math.min(riskScore, 25);
    reasons = [...reasons, 'No persistence, worsening, or high-risk indicator for escalation'];
  }

  return {
    riskScore,
    triageStatus,
    scoreReasons: reasons,
    allowAutomation: triageStatus !== 'LOW',
  };
};

export const triageToLegacySeverity = (triageStatus) => {
  if (triageStatus === 'DOCTOR_ESCALATED') return 'SEVERE';
  if (triageStatus === 'ASHA_REVIEW') return 'MODERATE';
  return 'LOW';
};

export const getTriageLabel = (triageStatus) => {
  const labels = {
    LOW: 'Low Risk',
    ASHA_REVIEW: 'Moderate Risk — ASHA Monitoring',
    DOCTOR_ESCALATED: 'High Risk — Doctor Escalation',
  };
  return labels[triageStatus] || triageStatus;
};

export const getTriageRecommendation = (triageStatus, language = 'English') => {
  const recs = {
    LOW: {
      English: 'Rest, stay hydrated, and follow basic home care. Contact ASHA if symptoms continue.',
      Hindi: 'आराम करें, पानी पिएं और घरेलू देखभाल करें। लक्षण जारी रहें तो ASHA से संपर्क करें।',
      Marathi: 'विश्रांती घ्या, पाणी प्या आणि घरगुती काळजी घ्या. त्रास सुरू राहिला तर आशा सेविकेशी संपर्क करा.',
    },
    ASHA_REVIEW: {
      English: 'Your ASHA worker should monitor you. Seek care if symptoms worsen or persist.',
      Hindi: 'ASHA कार्यकर्ता आपकी निगरानी करेंगे। लक्षण बढ़ें तो तुरंत सहायता लें।',
      Marathi: 'आशा सेविका तुमचे निरीक्षण करेल. त्रास वाढल्यास लगेच मदत घ्या.',
    },
    DOCTOR_ESCALATED: {
      English: 'Urgent: visit a healthcare center or contact your doctor/ASHA immediately.',
      Hindi: 'तत्काल: स्वास्थ्य केंद्र जाएं या तुरंत डॉक्टर/ASHA से संपर्क करें।',
      Marathi: 'तातडीच: आरोग्य केंद्रात जा किंवा लगेच डॉक्टर/आशा सेविकेशी संपर्क करा.',
    },
  };
  return recs[triageStatus]?.[language] || recs[triageStatus]?.English || '';
};

export const buildEscalationReason = ({ riskScore, scoreReasons = [], triageStatus }) => {
  const prefix = `AI triage score ${riskScore}/100 → ${getTriageLabel(triageStatus)}`;
  if (!scoreReasons.length) return prefix;
  return `${prefix}. Factors: ${scoreReasons.join('; ')}`;
};
