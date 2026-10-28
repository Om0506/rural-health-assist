/**
 * Backward-compatible wrappers around sessionStateService.
 */
import {
  createEmptySessionState,
  storageToSessionState,
  sessionStateToStorage,
  getNextStep,
  assessmentComplete,
  isQuestionDone,
  hasSymptoms,
  getPrimarySymptom,
  addSymptomsFromMessage,
  applyDurationToState,
  applyNegativeAnswer,
  applyPositiveAnswer,
  setAwaitingQuestion,
  buildSymptomFlags,
} from './sessionStateService.js';
import { extractDuration } from './durationExtractionService.js';

export const EMPTY_SYMPTOM_MEMORY = () => sessionStateToStorage(createEmptySessionState());

export const normalizeSymptomMemory = (raw) => sessionStateToStorage(storageToSessionState(raw));

export const parseDuration = extractDuration;

export const updateSymptomMemory = (memory, message, detected = []) =>
  sessionStateToStorage(addSymptomsFromMessage(storageToSessionState(memory), message, detected));

export const applyDurationAnswer = (memory, message) =>
  sessionStateToStorage(applyDurationToState(storageToSessionState(memory), message));

export const applyConfirmationAnswer = (memory, questionKey, polarity, message = '') => {
  const state = storageToSessionState(memory);
  if (polarity === 'no') {
    return sessionStateToStorage(applyNegativeAnswer(state, questionKey));
  }
  return sessionStateToStorage(applyPositiveAnswer(state, questionKey, message));
};

export const getActiveSymptomList = (memory) => storageToSessionState(memory).symptoms;

export const countActiveSymptoms = (memory) => getActiveSymptomList(memory).length;

export const hasEmergencySymptoms = (memory) => {
  const f = buildSymptomFlags(storageToSessionState(memory));
  return f.chestPain || f.breathingDifficulty;
};

export const hasDuration = (memory) => Boolean(storageToSessionState(memory).durationKey);

export const needsMoreAssessment = (memory) => !assessmentComplete(storageToSessionState(memory));

export const wasQuestionAnswered = (memory, key) =>
  isQuestionDone(storageToSessionState(memory), key);

export const getNextAssessmentStep = (memory, language) =>
  getNextStep(storageToSessionState(memory), language);

export const getPrimarySymptomLabel = (memory, language) =>
  getPrimarySymptom(storageToSessionState(memory), language);

export const setPendingQuestion = setAwaitingQuestion;
export const markFollowUpAsked = setAwaitingQuestion;

export const getNextFollowUpQuestion = (memory, language) => {
  const step = getNextStep(storageToSessionState(memory), language);
  if (!step) return null;
  return { question: step.question, followUpKey: step.key };
};
