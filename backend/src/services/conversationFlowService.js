import { detectIntent, INTENTS } from './intentDetectionService.js';
import { STAGES, isAssessmentStage } from './conversationStages.js';
import { classifySeverityWithReason } from './severityEngine.js';
import {
  normalizeSessionState,
  storageToSessionState,
  sessionStateToStorage,
  addSymptomsFromMessage,
  applyDurationToState,
  applyNegativeAnswer,
  applyPositiveAnswer,
  setAwaitingQuestion,
  getNextStep,
  assessmentComplete,
  getPrimarySymptom,
  toSeverityMemory,
  hasSymptoms,
} from './sessionStateService.js';
import {
  pickDurationAck,
  pickSymptomAck,
  pickGuidanceOpening,
  pickQuestionVariant,
} from './responseTemplatesService.js';

const ASHA_REPLY = {
  English:
    'ASHA workers are local healthcare workers who help monitor symptoms and guide patients to healthcare centers if required. You can contact your village ASHA if symptoms persist or worsen.',
  Hindi:
    'ASHA कार्यकर्ता स्थानीय स्वास्थ्य सहायक हैं जो लक्षणों की निगरानी करते हैं और जरूरत पड़ने पर स्वास्थ्य केंद्र तक मार्गदर्शन करते हैं।',
  Marathi:
    'आशा सेविका स्थानिक आरोग्य सहाय्यक आहेत ज्या लक्षणांचे निरीक्षण करतात आणि गरज पडल्यास आरोग्य केंद्राकडे मार्गदर्शन करतात.',
};

const GREETING = {
  English: 'Hello! Tell me what symptoms you are experiencing and I will guide you step by step.',
  Hindi: 'नमस्ते! अपने लक्षण बताएं, मैं चरण दर चरण मार्गदर्शन करूँगा।',
  Marathi: 'नमस्कार! लक्षणे सांगा, मी टप्प्याटप्प्याने मार्गदर्शन करेन.',
};

export const processConversationTurn = async ({
  message,
  language,
  symptomMemory: incomingMemory,
  priorPrescriptions = [],
  detectedSymptoms = [],
  sessionId = null,
}) => {
  let state = storageToSessionState(incomingMemory);
  const seed = `${sessionId || ''}-${state.symptoms.join(',')}-${Date.now()}`;
  const intent = detectIntent(message, state);

  const severityMem = toSeverityMemory(state);
  if (severityMem.chestPain || severityMem.breathingDifficulty || detectEmergencyText(message)) {
    return finalizeEscalation(state, message, language, detectedSymptoms);
  }

  switch (intent.intent) {
    case INTENTS.GREETING:
      return state.symptoms.length
        ? continueFlow(state, language, priorPrescriptions, { seed })
        : replyOnly(GREETING[language] || GREETING.English, state, STAGES.IDLE, 'main_symptom', language);

    case INTENTS.DURATION_ANSWER: {
      state = applyDurationToState(state, message);
      const ack = pickDurationAck(language, state.durationLabel, seed);
      return continueFlow(state, language, priorPrescriptions, { prefix: ack, seed });
    }

    case INTENTS.NEGATIVE_RESPONSE:
      state = applyNegativeAnswer(state, intent.answeringQuestion || state.lastQuestion);
      return continueFlow(state, language, priorPrescriptions, {
        prefix: negativeAck(language),
        seed,
      });

    case INTENTS.POSITIVE_RESPONSE:
      state = applyPositiveAnswer(
        state,
        intent.answeringQuestion || state.lastQuestion,
        message,
        detectedSymptoms
      );
      return continueFlow(state, language, priorPrescriptions, { seed });

    case INTENTS.SYMPTOM_INPUT: {
      state = addSymptomsFromMessage(state, message, intent.symptoms || detectedSymptoms);
      const label = getPrimarySymptom(state, language);
      const ack = pickSymptomAck(language, label, seed);
      return continueFlow(state, language, priorPrescriptions, { prefix: ack, seed });
    }

    case INTENTS.RECOMMENDATION_REQUEST:
      return handleRecommendation(state, language, priorPrescriptions, seed);

    case INTENTS.FOLLOWUP_QUESTION:
      return handleFollowUp(intent, state, language, priorPrescriptions, seed);

    case INTENTS.THANKS:
      return replyOnly(
        language === 'Hindi'
          ? 'आपका स्वागत है। लक्षण बदलें तो फिर बताएं।'
          : 'You are welcome. Reach out again if anything changes.',
        state,
        STAGES.PROVIDING_GUIDANCE,
        'guidance',
        language
      );

    default:
      if (state.lastQuestion === 'duration' || state.currentStage === STAGES.ASKING_DURATION) {
        state = applyDurationToState(state, message);
        if (state.durationKey) {
          return continueFlow(state, language, priorPrescriptions, { seed });
        }
      }
      if (!hasSymptoms(state)) {
        return askQuestion(state, language, seed);
      }
      state = addSymptomsFromMessage(state, message, detectedSymptoms);
      return continueFlow(state, language, priorPrescriptions, { seed });
  }
};

function continueFlow(state, language, priorPrescriptions, opts = {}) {
  if (!assessmentComplete(state)) {
    const asked = askQuestion(state, language, opts.seed);
    if (opts.prefix) asked.reply = `${opts.prefix}\n\n${asked.reply}`;
    return asked;
  }
  return provideAssessment(state, language, priorPrescriptions, opts);
}

function askQuestion(state, language, seed) {
  const step = getNextStep(state, language);
  if (!step) return provideAssessment(state, language, [], { seed });

  const symptom = getPrimarySymptom(state, language);
  const question =
    step.key === 'duration' || step.key === 'additional_symptoms'
      ? pickQuestionVariant(step.key, language, { symptom }, seed)
      : step.question;

  const updated = setAwaitingQuestion(state, step.key, step.stage);
  return buildResult({
    reply: question,
    state: updated,
    stage: step.stage,
    followUpNeeded: true,
    quickReplies: quickReplies(step.key, language),
  });
}

function provideAssessment(state, language, priorPrescriptions, opts = {}) {
  const severityMem = toSeverityMemory(state);
  const severityResult = classifySeverityWithReason({
    symptomMemory: severityMem,
    language,
    symptoms: state.symptoms,
  });

  state.severity = severityResult.level;
  state.currentStage = STAGES.PROVIDING_GUIDANCE;

  const opening = pickGuidanceOpening(
    language,
    severityResult.displayLevel || severityResult.level,
    opts.seed
  );
  const primary = getPrimarySymptom(state, language);
  const durationPart = state.durationLabel
    ? language === 'Hindi'
      ? ` (लगभग ${state.durationLabel} से)`
      : language === 'Marathi'
      ? ` (सुमारे ${state.durationLabel} पासून)`
      : ` (for about ${state.durationLabel})`
    : '';

  let body = `${opening} Regarding ${primary}${durationPart}: ${severityResult.recommendation || ''}`;
  if (severityResult.reasonText) body += ` ${severityResult.reasonText}`;
  body += ' This is preliminary guidance, not a final diagnosis.';

  if (priorPrescriptions?.length) {
    const meds = priorPrescriptions
      .slice(0, 2)
      .map((p) => p.medicine_name)
      .join(', ');
    body += ` Medicines (${meds}) only with doctor/ASHA advice.`;
  }

  if (opts.prefix) body = `${opts.prefix}\n\n${body}`;

  return buildResult({
    reply: body,
    state,
    stage: STAGES.PROVIDING_GUIDANCE,
    severityResult,
    severityLine: `Severity Level: ${severityResult.displayLevel || severityResult.level}`,
    showSeverity: true,
    quickReplies: quickReplies('guidance', language),
  });
}

function handleRecommendation(state, language, priorPrescriptions, seed) {
  if (assessmentComplete(state) || state.currentStage === STAGES.PROVIDING_GUIDANCE) {
    const severityResult = classifySeverityWithReason({
      symptomMemory: toSeverityMemory(state),
      language,
    });
    const rec = severityResult.recommendation || '';
    const openings = {
      English: [
        `Here is what I suggest: ${rec}`,
        `My recommendation: ${rec}`,
        `Based on your assessment: ${rec}`,
      ],
      Hindi: [`मेरी सलाह: ${rec}`],
      Marathi: [`माझा सल्ला: ${rec}`],
    };
    const pool = openings[language] || openings.English;
    const reply =
      pool[Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % pool.length] +
      ' Visit ASHA or a health center if symptoms worsen.';

    return buildResult({
      reply,
      state,
      stage: STAGES.PROVIDING_GUIDANCE,
      severityResult,
      quickReplies: quickReplies('guidance', language),
    });
  }

  return buildResult({
    reply:
      language === 'Hindi'
        ? 'पहले ऊपर के सवाल का जवाब दें, फिर मैं सटीक सलाह दूँगा।'
        : 'Please answer the question above first — then I can give you specific advice.',
    state,
    stage: state.currentStage,
    followUpNeeded: true,
    quickReplies: quickReplies(state.lastQuestion || 'duration', language),
  });
}

function handleFollowUp(intent, state, language, priorPrescriptions, seed) {
  if (intent.topic === 'asha') {
    return buildResult({
      reply: ASHA_REPLY[language] || ASHA_REPLY.English,
      state,
      stage: state.currentStage || STAGES.PROVIDING_GUIDANCE,
      quickReplies: quickReplies('guidance', language),
    });
  }
  if (intent.topic === 'severity' && assessmentComplete(state)) {
    return provideAssessment(state, language, priorPrescriptions, { seed });
  }
  return buildResult({
    reply:
      language === 'Hindi'
        ? 'मैं प्रारंभिक मार्गदर्शन देता हूँ। कृपया लक्षण साझा करें।'
        : 'I provide preliminary health guidance. Please share your symptoms to begin.',
    state,
    stage: state.currentStage,
    quickReplies: quickReplies('main_symptom', language),
  });
}

function finalizeEscalation(state, message, language, detectedSymptoms) {
  const severityResult = classifySeverityWithReason({
    message,
    symptoms: detectedSymptoms,
    symptomMemory: toSeverityMemory(state),
    language,
  });
  state.currentStage = STAGES.ESCALATION_STAGE;
  state.severity = severityResult.level;
  return buildResult({
    reply:
      language === 'Hindi'
        ? 'यह गंभीर हो सकता है। तुरंत ASHA या स्वास्थ्य केंद्र से संपर्क करें।'
        : 'This may be urgent. Please contact your ASHA worker or nearest health center immediately.',
    state,
    stage: STAGES.ESCALATION_STAGE,
    severityResult,
    quickReplies: [],
  });
}

function negativeAck(language) {
  if (language === 'Hindi') return 'ठीक है, नोट कर लिया।';
  if (language === 'Marathi') return 'ठीक आहे, नोंद केली.';
  return 'Understood, thanks for clarifying.';
}

function replyOnly(reply, state, stage, quickKey, language) {
  state.currentStage = stage;
  return buildResult({
    reply,
    state,
    stage,
    followUpNeeded: stage !== STAGES.PROVIDING_GUIDANCE,
    quickReplies: quickReplies(quickKey, language),
  });
}

function buildResult({
  reply,
  state,
  stage,
  severityResult = null,
  severityLine = null,
  showSeverity = false,
  followUpNeeded = false,
  quickReplies = [],
}) {
  state.currentStage = stage;
  const storage = sessionStateToStorage(state);
  return {
    reply,
    symptomMemory: storage,
    conversationState: stage,
    sessionState: state,
    severityResult,
    severityLine,
    showSeverity,
    followUpNeeded,
    quickReplies,
  };
}

function detectEmergencyText(message) {
  return /(chest pain|can't breathe|cannot breathe|unconscious)/i.test(message);
}

export const shouldUseGemini = (memory) => {
  const state = storageToSessionState(memory);
  const stage = state.currentStage;
  return !isAssessmentStage(stage) && stage !== STAGES.ESCALATION_STAGE;
};

function quickReplies(key, language) {
  const sets = {
    main_symptom: {
      English: ['I have fever', 'I have headache', 'I have cough', 'Body pain'],
      Hindi: ['बुखार है', 'सिरदर्द है', 'खांसी है', 'शरीर दर्द'],
      Marathi: ['ताप आहे', 'डोकेदुखी', 'खोकला', 'अंगदुखी'],
    },
    duration: {
      English: ['Since today', 'Yesterday', '2 days', 'Past few hours'],
      Hindi: ['आज से', 'कल से', '2 दिन', 'कुछ घंटे'],
      Marathi: ['आजपासून', 'कालपासून', '2 दिवस', 'काही तास'],
    },
    additional_symptoms: {
      English: ['Yes, fever', 'Yes, weakness', 'No', 'No other symptoms'],
      Hindi: ['हाँ, बुखार', 'हाँ, कमजोरी', 'नहीं', 'कोई और नहीं'],
      Marathi: ['होय, ताप', 'होय, अशक्तपणा', 'नाही', 'इतर नाही'],
    },
    guidance: {
      English: ['Thank you', 'What should I do?', 'Contact ASHA?'],
      Hindi: ['धन्यवाद', 'क्या करूं?', 'ASHA से संपर्क?'],
      Marathi: ['धन्यवाद', 'काय करावे?', 'आशा सेविकेशी संपर्क?'],
    },
  };
  return sets[key]?.[language] || sets.duration[language] || sets.duration.English;
}

/** Backward compat */
export const normalizeSymptomMemory = storageToSessionState;
