import { detectSymptoms } from './severityEngine.js';
import { extractDuration } from './durationExtractionService.js';
import { mergeClinicalSignalsIntoState } from './clinicalSignalService.js';
import {
  storageToSessionState,
  sessionStateToStorage,
  addSymptomsFromMessage,
  normalizeSessionState,
} from './sessionStateService.js';

/**
 * Merge newly detected information from the latest user message into session symptom memory.
 * Does not drive conversation — only structured storage for severity engine + summary panel.
 */
export const accumulateSymptomsFromMessage = (storedMemory, message = '') => {
  const detected = detectSymptoms(message);
  let state = storageToSessionState(storedMemory);
  state = addSymptomsFromMessage(state, message, detected);
  state = mergeClinicalSignalsIntoState(state, message);

  const duration = extractDuration(message);
  if (duration) {
    state.duration = duration.key;
    state.durationKey = duration.key;
    state.durationLabel = duration.label;
    state.durationDays = duration.days;
  }

  const text = String(message).toLowerCase();
  if (/(dehydrat|dry mouth|very thirsty|less urine|dark urine|प्यास)/i.test(text)) {
    if (!state.symptoms.includes('dehydration')) state.symptoms.push('dehydration');
    state.symptomFlags = state.symptomFlags || {};
    state.symptomFlags.dehydration = true;
  }

  state.currentStage = 'CONVERSATIONAL';
  return sessionStateToStorage(state);
};

export const getStructuredSymptomSnapshot = (storedMemory) => {
  const s = normalizeSessionState(storageToSessionState(storedMemory));
  const flags = s.symptomFlags || {};
  return {
    fever: Boolean(flags.fever),
    cough: Boolean(flags.cough),
    headache: Boolean(flags.headache),
    vomiting: Boolean(flags.vomiting),
    diarrhea: Boolean(flags.diarrhea),
    bodyPain: Boolean(flags.bodyPain),
    weakness: Boolean(flags.weakness),
    chestPain: Boolean(flags.chestPain),
    breathingDifficulty: Boolean(flags.breathingDifficulty),
    dehydration: Boolean(flags.dehydration),
    worsening: Boolean(flags.worsening),
    sharpPain: Boolean(flags.sharpPain),
    continuousPain: Boolean(flags.continuousPain),
    symptoms: s.symptoms,
    additionalSymptoms: s.additionalSymptoms,
    duration: s.durationKey || s.duration,
    durationLabel: s.durationLabel,
    durationDays: s.durationDays,
  };
};
