import { detectSymptoms } from './severityEngine.js';
import { extractDuration, isLikelyDurationMessage } from './durationExtractionService.js';
import {
  isNegativeResponse,
  isAffirmativeResponse,
  mentionsAdditionalSymptom,
} from './messageUnderstandingService.js';
import {
  hasSymptoms,
  isQuestionDone,
  normalizeSessionState,
} from './sessionStateService.js';

export const INTENTS = {
  GREETING: 'greeting',
  SYMPTOM_INPUT: 'symptom_input',
  DURATION_ANSWER: 'duration_answer',
  NEGATIVE_RESPONSE: 'negative_response',
  POSITIVE_RESPONSE: 'positive_response',
  FOLLOWUP_QUESTION: 'followup_question',
  RECOMMENDATION_REQUEST: 'recommendation_request',
  THANKS: 'thanks',
  UNKNOWN: 'unknown',
};

const normalize = (text = '') => String(text).toLowerCase().trim();

const GREETING = /^(hi|hello|hey|namaste|नमस्ते|good\s*(morning|afternoon|evening))\b/i;
const THANKS = /^(thanks|thank you|धन्यवाद|ok thanks)\b/i;
const RECOMMENDATION =
  /(what should i do|what to do|what do i do|next step|advice|recommend|suggest|क्या करू|काय करावे)/i;
const ASHA_FOLLOWUP =
  /(contact asha|call asha|who is asha|what is asha|asha worker|asha से|आशा सेविका|आशा काय|reach asha)/i;

/**
 * Detect user message intent using context-aware rules (not exact keyword equality).
 */
export const detectIntent = (message = '', sessionState = {}) => {
  const state = normalizeSessionState(sessionState);
  const text = normalize(message);
  const lastQ = state.lastQuestion;
  const stage = state.currentStage;

  if (!text) return { intent: INTENTS.UNKNOWN };

  if (THANKS.test(text)) return { intent: INTENTS.THANKS };

  if (GREETING.test(text) && !detectSymptoms(message).length) {
    return { intent: INTENTS.GREETING };
  }

  if (ASHA_FOLLOWUP.test(text)) {
    return { intent: INTENTS.FOLLOWUP_QUESTION, topic: 'asha' };
  }

  if (RECOMMENDATION.test(text)) {
    return { intent: INTENTS.RECOMMENDATION_REQUEST };
  }

  if (/(how serious|is it serious|severity|dangerous)/i.test(text)) {
    return { intent: INTENTS.FOLLOWUP_QUESTION, topic: 'severity' };
  }

  if (
    lastQ === 'additional_symptoms' ||
    lastQ === 'cough_check' ||
    stage === 'ASKING_ADDITIONAL_SYMPTOMS'
  ) {
    if (isNegativeResponse(message)) {
      return { intent: INTENTS.NEGATIVE_RESPONSE, answeringQuestion: lastQ || 'additional_symptoms' };
    }
    if (isAffirmativeResponse(message) || mentionsAdditionalSymptom(message)) {
      return {
        intent: INTENTS.POSITIVE_RESPONSE,
        answeringQuestion: lastQ || 'additional_symptoms',
      };
    }
  }

  if (lastQ === 'duration' || stage === 'ASKING_DURATION') {
    if (extractDuration(message) || isLikelyDurationMessage(message, state)) {
      return { intent: INTENTS.DURATION_ANSWER };
    }
  }

  if (isNegativeResponse(message) && lastQ) {
    return { intent: INTENTS.NEGATIVE_RESPONSE, answeringQuestion: lastQ };
  }

  if (
    (extractDuration(message) || isLikelyDurationMessage(message, state)) &&
    hasSymptoms(state) &&
    !isQuestionDone(state, 'duration')
  ) {
    return { intent: INTENTS.DURATION_ANSWER };
  }

  const symptoms = detectSymptoms(message);
  const hasPhrase = /(i have|i am having|feeling|pain|ache|fever|cough|headache|मुझे|मला)/i.test(text);

  if (symptoms.length || (hasPhrase && !extractDuration(message))) {
    return { intent: INTENTS.SYMPTOM_INPUT, symptoms };
  }

  if (isAffirmativeResponse(message) && lastQ) {
    return { intent: INTENTS.POSITIVE_RESPONSE, answeringQuestion: lastQ };
  }

  return { intent: INTENTS.UNKNOWN };
};

export const isDurationAnswer = (message, state = {}) =>
  detectIntent(message, state).intent === INTENTS.DURATION_ANSWER;
