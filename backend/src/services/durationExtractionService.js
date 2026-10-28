/**
 * Normalized duration extraction from free-text user messages.
 */

const normalize = (text = '') =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ');

/** @returns {{ key: string, label: string, days: number } | null} */
export const extractDuration = (message = '') => {
  const text = normalize(message);
  if (!text) return null;

  if (/(?:past|last|for\s+(?:the\s+)?past)\s+(?:an?\s+)?hour\b|past\s+one\s+hour|continuously\s+from\s+past\s+hour/i.test(text)) {
    return { key: '1_hour', label: 'past hour', days: 0.05 };
  }

  if (
    /(?:past|last|for\s+(?:the\s+)?past)\s+(\d+)\s*hours?/i.test(text)
  ) {
    const m = text.match(/(?:past|last|for\s+(?:the\s+)?past)\s+(\d+)\s*hours?/i);
    const hours = m ? Number(m[1]) : 1;
    return {
      key: `${hours}_hours`,
      label: `past ${hours} hour${hours > 1 ? 's' : ''}`,
      days: hours / 24,
    };
  }

  if (
    /(?:past\s+)?few\s+hours?|couple\s+of\s+hours?|since\s+morning|this\s+morning|few\s+hrs?|hours?\s+ago|last\s+few\s+hours?/i.test(
      text
    )
  ) {
    return { key: 'few_hours', label: 'a few hours', days: 0.25 };
  }

  if (/(since\s+)?(today|from\s+today|started\s+today|आज)/i.test(text)) {
    return { key: 'today', label: 'since today', days: 1 };
  }

  if (/(yesterday|from\s+yesterday|since\s+yesterday|काल)/i.test(text)) {
    return { key: '1_day', label: 'since yesterday', days: 1 };
  }

  if (/(last\s+night|overnight)/i.test(text)) {
    return { key: '1_day', label: 'since last night', days: 1 };
  }

  const hourMatch = text.match(/(\d+)\s*(hour|hours|hr|hrs|घंटे)/i);
  if (hourMatch) {
    const hours = Number(hourMatch[1]);
    const days = hours >= 24 ? hours / 24 : 0.25;
    return {
      key: hours <= 6 ? 'few_hours' : `${hours}_hours`,
      label: `${hours} hour${hours > 1 ? 's' : ''}`,
      days,
    };
  }

  const dayMatch = text.match(/(\d+)\s*(day|days|दिन|दिवस)/i);
  if (dayMatch) {
    const n = Number(dayMatch[1]);
    return {
      key: `${n}_days`,
      label: `${n} day${n > 1 ? 's' : ''}`,
      days: n,
    };
  }

  if (/more\s+than\s+(\d+)\s*days?/i.test(text)) {
    const m = text.match(/more\s+than\s+(\d+)/i);
    const n = m ? Number(m[1]) : 3;
    return { key: `${n + 1}_days`, label: `more than ${n} days`, days: n + 1 };
  }

  if (/(a\s+)?week|7\s*days|सप्ताह/i.test(text)) {
    return { key: '1_week', label: 'about a week', days: 7 };
  }

  if (/^\d+$/.test(text)) {
    const n = Number(text);
    if (n > 0 && n < 60) {
      return { key: `${n}_days`, label: `${n} days`, days: n };
    }
  }

  if (/(couple\s+of\s+days|2-3\s+days)/i.test(text)) {
    return { key: '2_days', label: 'a couple of days', days: 2 };
  }

  return null;
};

export const isLikelyDurationMessage = (message = '', context = {}) => {
  if (extractDuration(message)) return true;
  const text = normalize(message);
  if (context.lastQuestion === 'duration' || context.currentStage === 'ASKING_DURATION') {
    return /(since|for|from|ago|today|yesterday|day|hour|morning|कल|आज|दिन)/i.test(text) || /^\d+$/.test(text);
  }
  return false;
};
