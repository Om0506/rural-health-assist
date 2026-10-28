const USER_STATE = new Map();

export const STATES = {
  GREETING: 'GREETING',
  COLLECTING_SYMPTOMS: 'COLLECTING_SYMPTOMS',
  FOLLOW_UP: 'FOLLOW_UP',
  GUIDANCE: 'GUIDANCE',
  EMERGENCY: 'EMERGENCY'
};

const hasDurationHint = (text = '') =>
  /(today|yesterday|since|day|days|week|weeks|from today|since yesterday|2 days|3 days|दिवस|आज|काल)/i.test(text);

export const getConversationState = (userId) => USER_STATE.get(String(userId)) || STATES.GREETING;

export const setConversationState = (userId, state) => {
  USER_STATE.set(String(userId), state);
  return state;
};

export const clearConversationState = (userId) => {
  USER_STATE.delete(String(userId));
};

export const resolveNextState = ({ currentState, detectedSymptoms = [], message = '', emergency = false }) => {
  if (emergency) return STATES.EMERGENCY;

  if (detectedSymptoms.length >= 2) {
    return STATES.GUIDANCE;
  }

  if (detectedSymptoms.length === 1) {
    return hasDurationHint(message) ? STATES.GUIDANCE : STATES.FOLLOW_UP;
  }

  if (currentState === STATES.GREETING) {
    return STATES.COLLECTING_SYMPTOMS;
  }

  return STATES.COLLECTING_SYMPTOMS;
};

