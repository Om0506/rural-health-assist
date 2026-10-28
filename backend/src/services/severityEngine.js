import { countActiveSymptoms, hasEmergencySymptoms, normalizeSymptomMemory } from './symptomMemoryService.js';

const SYMPTOM_ALIASES = {
  fever: [
    'fever',
    'high fever',
    'mild fever',
    'body getting heat',
    'feeling hot',
    'feel hot',
    'felling hot',
    'hot body',
    'body heat',
    'tap',
    'taap',
    'ताप',
    'बुखार',
  ],
  cough: ['cough', 'dry cough', 'wet cough', 'खांसी', 'खोकला'],
  headache: ['headache', 'head pain', 'small headache', 'सिरदर्द', 'डोकेदुखी'],
  vomiting: ['vomiting', 'vomit', 'nausea', 'throwing up', 'उल्टी', 'ओकाऱ्या'],
  diarrhea: ['diarrhea', 'loose motion', 'loose motions', 'julab', 'जुलाब', 'दस्त'],
  'body pain': [
    'body pain',
    'body ache',
    'muscle pain',
    'inner pain',
    'pain inside',
    'pain in body',
    'paining',
    'अंगदुखी',
    'अंग दुखतं',
  ],
  fatigue: ['fatigue', 'weakness', 'tired', 'low energy', 'थकवा', 'कमजोरी'],
  'chest pain': [
    'chest pain',
    'pain in heart',
    'heart pain',
    'heart hurting',
    'above chest',
    'above the chest',
    'pain above',
    'left side pain',
    'sharp pain',
    'छाती',
  ],
  'breathing problem': ['breathing problem', 'breathing issue', "can't breathe", 'cannot breathe', 'shortness of breath'],
  'breathing difficulty': ['breathing difficulty', 'difficult breathing', 'सांस'],
  dehydration: ['dehydration', 'dry mouth', 'very thirsty', 'less urine', 'dark urine'],
};

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'heart pain',
  'pain in heart',
  'breathing problem',
  'breathing difficulty',
  "can't breathe",
  'cannot breathe',
  'unconscious',
  'severe vomiting',
  'severe dehydration',
  'oxygen',
];

const normalize = (value = '') => value.toLowerCase().trim();

export const detectSymptoms = (message = '') => {
  const text = normalize(message);
  return Object.entries(SYMPTOM_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => text.includes(alias)))
    .map(([symptom]) => symptom);
};

export const detectEmergency = (message = '') => {
  const text = normalize(message);
  return EMERGENCY_KEYWORDS.some((keyword) => text.includes(keyword));
};

const SEVERITY_LABELS = {
  CRITICAL: 'Critical',
  SEVERE: 'Severe',
  MODERATE: 'Moderate',
  LOW: 'Low',
};

const RECOMMENDATIONS = {
  CRITICAL: {
    English: 'Seek urgent care immediately. Contact your ASHA worker or nearest health center now.',
    Hindi: 'तुरंत तत्काल चिकित्सा लें। अभी ASHA कार्यकर्ता या नजदीकी स्वास्थ्य केंद्र से संपर्क करें।',
    Marathi: 'तात्काळ तातडीची काळजी घ्या. आत्ताच आशा सेविका किंवा जवळच्या आरोग्य केंद्राशी संपर्क करा.',
  },
  SEVERE: {
    English: 'Please visit a healthcare center or ASHA worker today for evaluation.',
    Hindi: 'कृपया आज ही स्वास्थ्य केंद्र या ASHA कार्यकर्ता से मिलें।',
    Marathi: 'कृपया आजच आरोग्य केंद्र किंवा आशा सेविकेशी भेट द्या.',
  },
  MODERATE: {
    English: 'Monitor symptoms closely. Consult an ASHA worker if symptoms persist or worsen.',
    Hindi: 'लक्षणों पर नजर रखें। अगर तकलीफ बनी रहे या बढ़े तो ASHA कार्यकर्ता से मिलें।',
    Marathi: 'लक्षणांवर लक्ष ठेवा. त्रास कायम राहिला किंवा वाढला तर आशा सेविकेशी भेट द्या.',
  },
  LOW: {
    English: 'Rest, stay hydrated, and follow basic home care. Contact ASHA if symptoms continue.',
    Hindi: 'आराम करें, पानी पिएं और घरेलू देखभाल करें। लक्षण जारी रहें तो ASHA से संपर्क करें।',
    Marathi: 'विश्रांती घ्या, पाणी प्या आणि घरगुती काळजी घ्या. त्रास सुरू राहिला तर आशा सेविकेशी संपर्क करा.',
  },
};

export const classifySeverity = ({ message = '', symptoms = [], symptomMemory = null }) => {
  const result = classifySeverityWithReason({ message, symptoms, symptomMemory });
  return result.level;
};

export const classifySeverityWithReason = ({
  message = '',
  symptoms = [],
  symptomMemory = null,
  language = 'English',
}) => {
  const memory = normalizeSymptomMemory(symptomMemory || {});
  const text = normalize(message);
  const symptomList = symptoms.length ? symptoms : [];
  const combined = [text, ...symptomList].join(' | ');

  const reasons = [];

  if (hasEmergencySymptoms(memory) || detectEmergency(message)) {
    reasons.push('Emergency symptoms such as chest pain or breathing difficulty were reported.');
    return buildResult('CRITICAL', reasons, language);
  }

  if (/(oxygen|spo2).*(below|under|less).*(90)|unconscious/i.test(combined)) {
    reasons.push('Very low oxygen or unconsciousness indicators were mentioned.');
    return buildResult('CRITICAL', reasons, language);
  }

  const durationDays = memory.durationDays || 0;
  if (memory.fever && durationDays >= 3) {
    reasons.push('Fever has continued for more than 2–3 days.');
  }
  if (memory.weakness || memory.fatigue) {
    reasons.push('Weakness or fatigue is present.');
  }
  if (memory.vomiting && durationDays >= 2) {
    reasons.push('Vomiting has persisted for multiple days.');
  }
  if (memory.breathingDifficulty || combined.includes('breathing')) {
    reasons.push('Breathing difficulty was noted.');
  }

  if (
    reasons.some((r) => r.includes('Breathing')) ||
    (memory.fever && durationDays >= 3 && memory.weakness)
  ) {
    return buildResult('SEVERE', reasons, language);
  }

  if (
    memory.fever ||
    memory.vomiting ||
    memory.bodyPain ||
    symptomList.includes('fever') ||
    /fever.*(2|two|3)\s*day/i.test(message)
  ) {
    if (memory.fever && (durationDays >= 2 || memory.weakness || memory.headache)) {
      if (!reasons.length) {
        reasons.push('Fever with ongoing duration or associated symptoms suggests moderate concern.');
      }
      return buildResult('MODERATE', reasons, language);
    }
    if (memory.fever || memory.vomiting) {
      if (!reasons.length) reasons.push('Active fever or vomiting symptoms need monitoring.');
      return buildResult('MODERATE', reasons, language);
    }
  }

  if (countActiveSymptoms(memory) >= 2) {
    reasons.push('Multiple symptoms are present together.');
    return buildResult('MODERATE', reasons, language);
  }

  if (memory.headache || memory.cough || countActiveSymptoms(memory) === 1) {
    reasons.push('Symptoms appear mild at this stage.');
    return buildResult('LOW', reasons, language);
  }

  return buildResult('LOW', ['Limited symptom information so far.'], language);
};

function buildResult(level, reasons, language) {
  const normalizedLevel = level === 'CRITICAL' ? 'CRITICAL' : level;
  const mapLevel = normalizedLevel === 'CRITICAL' ? 'SEVERE' : normalizedLevel;
  return {
    level: mapLevel,
    displayLevel: SEVERITY_LABELS[normalizedLevel] || SEVERITY_LABELS[mapLevel] || mapLevel,
    reasons,
    reasonText: reasons.join(' '),
    recommendation: (RECOMMENDATIONS[normalizedLevel] || RECOMMENDATIONS[mapLevel])?.[language]
      || RECOMMENDATIONS[mapLevel]?.English,
  };
}
