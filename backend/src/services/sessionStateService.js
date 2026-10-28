import { detectSymptoms } from './severityEngine.js';
import { extractDuration } from './durationExtractionService.js';
import { STAGES } from './conversationStages.js';

/** Canonical per-session conversational state */
export const createEmptySessionState = () => ({
  currentStage: STAGES.IDLE,
  lastQuestion: '',
  symptoms: [],
  duration: null,
  durationKey: null,
  durationDays: null,
  durationLabel: null,
  additionalSymptoms: [],
  severity: null,
  answeredQuestions: [],
  askedQuestions: [],
  symptomFlags: {},
});

const SYMPTOM_KEY_MAP = {
  fever: 'fever',
  cough: 'cough',
  headache: 'headache',
  vomiting: 'vomiting',
  diarrhea: 'diarrhea',
  'body pain': 'bodyPain',
  fatigue: 'fatigue',
  'chest pain': 'chestPain',
  'breathing problem': 'breathingDifficulty',
  'breathing difficulty': 'breathingDifficulty',
  weakness: 'weakness',
};

export const normalizeSessionState = (raw = {}) => {
  const base = createEmptySessionState();
  if (!raw || typeof raw !== 'object') return base;

  const merged = {
    ...base,
    ...raw,
    symptoms: Array.isArray(raw.symptoms) ? [...raw.symptoms] : [],
    additionalSymptoms: Array.isArray(raw.additionalSymptoms) ? [...raw.additionalSymptoms] : [],
    answeredQuestions: Array.isArray(raw.answeredQuestions)
      ? [...raw.answeredQuestions]
      : Array.isArray(raw.answeredFollowUps)
      ? [...raw.answeredFollowUps]
      : [],
    askedQuestions: Array.isArray(raw.askedQuestions)
      ? [...raw.askedQuestions]
      : [],
  };

  if (raw.currentStage) merged.currentStage = raw.currentStage;
  if (raw.lastQuestion) merged.lastQuestion = raw.lastQuestion;
  if (raw.pendingQuestion && !merged.lastQuestion) merged.lastQuestion = raw.pendingQuestion;

  if (!merged.symptoms.length) {
    merged.symptoms = flagsToSymptomList(raw);
  }

  if (!merged.duration && raw.duration) {
    merged.duration = raw.duration;
    merged.durationLabel = raw.durationLabel || raw.duration;
    merged.durationKey = raw.durationKey || raw.duration;
    merged.durationDays = raw.durationDays ?? null;
  }

  merged.symptomFlags = buildSymptomFlags(merged);
  return merged;
};

export const sessionStateToStorage = (state) => {
  const s = normalizeSessionState(state);
  const flags = buildSymptomFlags(s);
  return {
    ...s,
    ...flags,
    currentStage: s.currentStage,
    lastQuestion: s.lastQuestion,
    pendingQuestion: s.lastQuestion || null,
    answeredFollowUps: s.answeredQuestions,
    askedFollowUps: s.askedQuestions,
    duration: s.durationLabel || s.duration,
  };
};

export const storageToSessionState = (raw) => normalizeSessionState(raw);

function flagsToSymptomList(raw) {
  const list = [];
  const keys = ['fever', 'cough', 'headache', 'vomiting', 'diarrhea', 'bodyPain', 'weakness', 'chestPain', 'breathingDifficulty'];
  keys.forEach((k) => {
    if (raw[k]) list.push(k === 'bodyPain' ? 'body pain' : k === 'breathingDifficulty' ? 'breathing difficulty' : k);
  });
  return list;
}

export function buildSymptomFlags(state) {
  const flags = { ...(state.symptomFlags || {}) };
  (state.symptoms || []).forEach((s) => {
    const key = SYMPTOM_KEY_MAP[s] || SYMPTOM_KEY_MAP[s.toLowerCase()] || s;
    flags[key] = true;
  });
  (state.additionalSymptoms || []).forEach((s) => {
    const key = SYMPTOM_KEY_MAP[s] || s;
    flags[key] = true;
  });
  if ((state.symptoms || []).includes('dehydration')) flags.dehydration = true;
  return flags;
}

export const addSymptomsFromMessage = (state, message, detected = []) => {
  const next = normalizeSessionState(state);
  const found = [...new Set([...detected, ...detectSymptoms(message)])];
  const text = String(message).toLowerCase();

  found.forEach((s) => {
    const canonical = s.toLowerCase();
    if (!next.symptoms.includes(canonical) && !next.symptoms.includes(s)) {
      next.symptoms.push(canonical);
    }
    const flagKey = SYMPTOM_KEY_MAP[canonical] || canonical;
    if (flagKey) next.symptomFlags[flagKey] = true;
  });

  if (/(headache|सिरदर्द|डोकेदुखी)/i.test(text) && !next.symptoms.includes('headache')) {
    next.symptoms.push('headache');
    next.symptomFlags.headache = true;
  }
  if (/(fever|बुखार|ताप)/i.test(text) && !next.symptoms.includes('fever')) {
    next.symptoms.push('fever');
    next.symptomFlags.fever = true;
  }
  if (/(cough|खांसी|खोकला)/i.test(text) && !next.symptoms.includes('cough')) {
    next.symptoms.push('cough');
    next.symptomFlags.cough = true;
  }
  if (/(weakness|कमजोरी|अशक्त)/i.test(text)) {
    next.additionalSymptoms.push('weakness');
    next.symptomFlags.weakness = true;
  }

  return next;
};

export const applyDurationToState = (state, message) => {
  let next = normalizeSessionState(state);
  const extracted = extractDuration(message);
  if (!extracted) return next;

  next.duration = extracted.key;
  next.durationKey = extracted.key;
  next.durationLabel = extracted.label;
  next.durationDays = extracted.days;
  next = markQuestionAnswered(next, 'duration');
  return next;
};

export const applyNegativeAnswer = (state, questionKey) => {
  let next = normalizeSessionState(state);
  if (questionKey === 'additional_symptoms') {
    next.additionalSymptoms = [];
  }
  next = markQuestionAnswered(next, questionKey || next.lastQuestion || 'additional_symptoms');
  return next;
};

export const applyPositiveAnswer = (state, questionKey, message, detected = []) => {
  let next = normalizeSessionState(state);
  const key = questionKey || next.lastQuestion || 'additional_symptoms';
  if (key === 'additional_symptoms') {
    next = addSymptomsFromMessage(next, message, detected);
    const extras = detectSymptoms(message).filter((s) => !next.symptoms.includes(s));
    extras.forEach((s) => {
      if (!next.additionalSymptoms.includes(s)) next.additionalSymptoms.push(s);
    });
  }
  next = markQuestionAnswered(next, key);
  return next;
};

export const setAwaitingQuestion = (state, questionKey, stage) => {
  const next = normalizeSessionState(state);
  next.lastQuestion = questionKey;
  next.currentStage = stage;
  if (questionKey && !next.askedQuestions.includes(questionKey)) {
    next.askedQuestions.push(questionKey);
  }
  return next;
};

export const markQuestionAnswered = (state, questionKey) => {
  const next = normalizeSessionState(state);
  if (questionKey && !next.answeredQuestions.includes(questionKey)) {
    next.answeredQuestions.push(questionKey);
  }
  if (next.lastQuestion === questionKey) {
    next.lastQuestion = '';
  }
  next.pendingQuestion = null;
  return next;
};

export const isQuestionDone = (state, key) => {
  const s = normalizeSessionState(state);
  if (key === 'duration') {
    return Boolean(s.durationKey || s.duration) || s.answeredQuestions.includes('duration');
  }
  return s.answeredQuestions.includes(key);
};

export const hasSymptoms = (state) => normalizeSessionState(state).symptoms.length > 0;

export const getPrimarySymptom = (state, language = 'English') => {
  const s = normalizeSessionState(state);
  const labels = {
    English: { fever: 'fever', cough: 'cough', headache: 'headache', vomiting: 'vomiting', 'body pain': 'body pain', weakness: 'weakness' },
    Hindi: { fever: 'बुखार', cough: 'खांसी', headache: 'सिरदर्द', vomiting: 'उल्टी', 'body pain': 'शरीर दर्द', weakness: 'कमजोरी' },
    Marathi: { fever: 'ताप', cough: 'खोकला', headache: 'डोकेदुखी', vomiting: 'उलटी', 'body pain': 'अंगदुखी', weakness: 'अशक्तपणा' },
  };
  const map = labels[language] || labels.English;
  const primary = s.symptoms[0] || 'your symptoms';
  return map[primary] || primary;
};

export const getNextStep = (state, language = 'English') => {
  const s = normalizeSessionState(state);

  if (!hasSymptoms(s)) {
    return { key: 'main_symptom', stage: STAGES.IDLE, question: questions.main_symptom[language] };
  }
  if (!isQuestionDone(s, 'duration')) {
    const label = getPrimarySymptom(s, language);
    return {
      key: 'duration',
      stage: STAGES.ASKING_DURATION,
      question: (questions.duration[language] || questions.duration.English).replace('{symptom}', label),
    };
  }
  if (!isQuestionDone(s, 'additional_symptoms')) {
    const label = getPrimarySymptom(s, language);
    return {
      key: 'additional_symptoms',
      stage: STAGES.ASKING_ADDITIONAL_SYMPTOMS,
      question: (questions.additional_symptoms[language] || questions.additional_symptoms.English).replace(
        '{symptom}',
        label
      ),
    };
  }
  return null;
};

export const assessmentComplete = (state) => {
  const s = normalizeSessionState(state);
  if (!hasSymptoms(s)) return false;
  if (!isQuestionDone(s, 'duration')) return false;
  if (!isQuestionDone(s, 'additional_symptoms')) return false;
  return true;
};

/** Legacy-compatible object for severity engine */
export const toSeverityMemory = (state) => {
  const s = normalizeSessionState(state);
  const flags = buildSymptomFlags(s);
  return {
    ...flags,
    duration: s.durationLabel || s.duration,
    durationDays: s.durationDays,
    durationKey: s.durationKey,
    weakness: flags.weakness || s.additionalSymptoms.includes('weakness'),
    currentStage: s.currentStage,
    lastQuestion: s.lastQuestion,
    answeredFollowUps: s.answeredQuestions,
  };
};

const questions = {
  main_symptom: {
    English:
      'I can help with a quick health check. What symptoms are you experiencing — for example fever, cough, headache, or body pain?',
    Hindi: 'मैं स्वास्थ्य जांच में मदद कर सकता हूँ। आज आपको क्या तकलीफ है?',
    Marathi: 'मी आरोग्य तपासणीत मदत करू शकतो. आज तुम्हाला काय त्रास आहे?',
  },
  duration: {
    English: 'Since when have you been experiencing {symptom}?',
    Hindi: '{symptom} कब से है?',
    Marathi: '{symptom} कधीपासून आहे?',
  },
  additional_symptoms: {
    English: 'Thanks for sharing. Besides {symptom}, do you also have fever, cough, or weakness?',
    Hindi: 'धन्यवाद। {symptom} के अलावा बुखार, खांसी या कमजोरी भी है?',
    Marathi: 'धन्यवाद. {symptom} व्यतिरिक्त ताप, खोकला किंवा अशक्तपणा आहे का?',
  },
};
