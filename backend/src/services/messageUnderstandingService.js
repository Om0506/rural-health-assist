/**
 * Flexible message understanding — negatives, affirmatives, typos.
 */

const normalize = (text = '') =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s'?-]/g, '')
    .replace(/\s+/g, ' ');

/** Collapse stretched negatives: nooo → no, nahhh → nah */
const collapseStutter = (text) =>
  text
    .replace(/\b(n)o{2,}\b/gi, 'no')
    .replace(/\b(na)h{2,}\b/gi, 'nah')
    .replace(/\b(nop)e{2,}\b/gi, 'nope');

/**
 * Flexible negative detection — NOT exact string equality.
 */
export const isNegativeResponse = (message = '') => {
  const raw = normalize(message);
  if (!raw) return false;

  const text = collapseStutter(raw);

  const negativePhrases = [
    /^no\b/,
    /^no[,.\s]/,
    /\bnope?\b/,
    /\bnah+\b/,
    /\bnahi\b/,
    /\bnah[iī]\b/,
    /\bnot\s+really\b/,
    /\bnot\s+at\s+all\b/,
    /\bno\s+other\s+symptom/,
    /\bno\s+other\b/,
    /\bonly\s+this\b/,
    /\bjust\s+this\b/,
    /\bonly\s+(this|that|it)\b/,
    /\bnothing\s+else\b/,
    /\bnone\s+else\b/,
    /\bdon'?t\s+have\b/,
    /\bdo\s+not\s+have\b/,
    /\bwithout\s+(any\s+)?other\b/,
    /\bno\s+fever\b/,
    /\bno\s+cough\b/,
    /\bno\s+weakness\b/,
    /\bनहीं\b/,
    /\bनाही\b/,
    /\bफक्त\s+हेच\b/,
    /\bइतर\s+नाही\b/,
  ];

  if (negativePhrases.some((p) => p.test(text))) return true;

  if (/^(no|nah|nope|nahi|नahi|नाही)[!.?\s]*$/i.test(text)) return true;

  if (text.length <= 12 && /^n+o+\W*$/i.test(text.replace(/\s/g, ''))) return true;

  return false;
};

export const isAffirmativeResponse = (message = '') => {
  const text = collapseStutter(normalize(message));
  if (isNegativeResponse(message)) return false;

  const yesPatterns = [
    /^yes\b/,
    /^yeah\b/,
    /^yep\b/,
    /^yup\b/,
    /^haan?\b/,
    /^हाँ\b/,
    /^हां\b/,
    /^होय\b/,
    /\bi\s+have\b/,
    /\bi\s+do\s+have\b/,
    /\balso\s+have\b/,
    /\bgot\s+(fever|cough|it)\b/,
    /^yes,/,
  ];

  return yesPatterns.some((p) => p.test(text));
};

export const mentionsAdditionalSymptom = (message = '') => {
  const text = normalize(message);
  if (isNegativeResponse(message)) return false;
  return /(fever| cough|headache|weakness|body pain|खांसी|बुखार|ताप|खोकला|कमजोरी)/i.test(text);
};
