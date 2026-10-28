export const normalizeToken = (value = '') =>
  String(value || '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

export const translateStatus = (t, status) => {
  const token = normalizeToken(status);
  if (!token) return t('status_ACTIVE');
  return t(`status_${token}`, { defaultValue: String(status).replaceAll('_', ' ') });
};

export const translateSeverity = (t, severity) => {
  const token = normalizeToken(severity);
  if (!token) return '';
  return t(`severity_${token}`, { defaultValue: String(severity).replaceAll('_', ' ') });
};

export const translateEscalation = (t, escalation) => {
  const token = String(escalation || '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
  if (!token) return '';
  return t(`escalation_${token}`, { defaultValue: String(escalation).replaceAll('_', ' ') });
};

export const detectLanguageFromText = (text, fallback = 'en') => {
  const value = String(text || '').toLowerCase();
  if (!/[\u0900-\u097f]/.test(value)) return 'en';

  const marathiHints = [
    'आहे',
    'आहेत',
    'मला',
    'माझ',
    'तुम',
    'काय',
    'होय',
    'नाही',
    'डोके',
    'खोकला',
    'जुलाब',
    'उलटी',
    'दुखत',
  ];
  if (marathiHints.some((hint) => value.includes(hint))) return 'mr';

  const hindiHints = [
    'है',
    'हैं',
    'मुझे',
    'मेरा',
    'आप',
    'क्या',
    'हाँ',
    'नहीं',
    'सिर',
    'खांसी',
    'दस्त',
    'उल्टी',
    'दर्द',
  ];
  if (hindiHints.some((hint) => value.includes(hint))) return 'hi';

  return fallback === 'mr' ? 'mr' : 'hi';
};
