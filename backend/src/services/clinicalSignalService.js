/**
 * Natural-language clinical signal detection for conversational symptom capture.
 * Complements keyword lists in severityEngine — used for risk scoring, not Groq escalation.
 */

export const detectClinicalSignals = (message = '') => {
  const text = String(message).toLowerCase().replace(/\s+/g, ' ');

  const signals = {
    fever: false,
    chestPain: false,
    bodyPain: false,
    worsening: false,
    sharpPain: false,
    continuousPain: false,
  };

  if (
    /(fever|feeling\s+hot|feel(ing)?\s+hot|fell?ing\s+hot|mild\s+fever|high\s+fever|body\s+heat|body\s+is\s+hot|temperature\s+high|बुखार|ताप)/i.test(
      text
    )
  ) {
    signals.fever = true;
  }

  if (/(sharp\s+pain|stabbing\s+pain|severe\s+pain|intense\s+pain)/i.test(text)) {
    signals.sharpPain = true;
  }

  if (
    /(continuously|constant(ly)?|non[- ]?stop|won'?t\s+go\s+away|doesn'?t\s+stop|all\s+the\s+time|keeps\s+paining)/i.test(
      text
    )
  ) {
    signals.continuousPain = true;
  }

  if (
    /(getting\s+worse|worsening|worse\s+than|more\s+painful|pain\s+(is\s+)?worse|increasing\s+pain|बढ़)/i.test(
      text
    )
  ) {
    signals.worsening = true;
  }

  const chestRegionPain =
    /(chest\s+pain|pain\s+(in|on|above|near|around|below)\s+(the\s+)?chest|above\s+(the\s+)?chest|near\s+(the\s+)?chest|heart\s+(area|region|side)|left\s+side.*(chest|pain|sharp)|pain.*left\s+side|right\s+side.*chest|छाती\s*(में|दर्द)?)/i.test(
      text
    );

  const sharpNearChest =
    signals.sharpPain && /(chest|above|heart|left\s+side|rib|breastbone)/i.test(text);

  if (chestRegionPain || sharpNearChest) {
    signals.chestPain = true;
  }

  if (
    /\b(pain|paining|hurts?|hurt|ache|aching|discomfort)\b/i.test(text) &&
    /(body|inner|inside|internal|abdomen|stomach|belly)/i.test(text) &&
    !signals.chestPain
  ) {
    signals.bodyPain = true;
  }

  if (
    /\b(pain|paining|hurts?|hurt)\b/i.test(text) &&
    /(chest|above|heart|rib|left\s+side)/i.test(text)
  ) {
    signals.chestPain = true;
  }

  return signals;
};

export const mergeClinicalSignalsIntoState = (state, message = '') => {
  const signals = detectClinicalSignals(message);
  const next = { ...state, symptomFlags: { ...(state.symptomFlags || {}) } };

  if (signals.fever) {
    next.symptomFlags.fever = true;
    if (!next.symptoms.includes('fever')) next.symptoms.push('fever');
  }
  if (signals.chestPain) {
    next.symptomFlags.chestPain = true;
    if (!next.symptoms.includes('chest pain')) next.symptoms.push('chest pain');
  }
  if (signals.bodyPain) {
    next.symptomFlags.bodyPain = true;
    if (!next.symptoms.includes('body pain')) next.symptoms.push('body pain');
  }
  if (signals.worsening) next.symptomFlags.worsening = true;
  if (signals.sharpPain) next.symptomFlags.sharpPain = true;
  if (signals.continuousPain) next.symptomFlags.continuousPain = true;

  return next;
};
