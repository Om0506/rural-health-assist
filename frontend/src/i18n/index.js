import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/common';
import hi from './locales/hi/common';
import mr from './locales/mr/common';

export const STORAGE_KEY = 'rha_language';

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { value: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
];

export const resources = {
  en: { common: en },
  hi: { common: hi },
  mr: { common: mr },
};

const getInitialLanguage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'hi' || stored === 'mr') return stored;
  } catch {
    // ignore storage errors
  }
  return 'en';
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
  });
}

export const toApiLanguage = (language) => {
  if (language === 'hi') return 'Hindi';
  if (language === 'mr') return 'Marathi';
  return 'English';
};

export const fromApiLanguage = (language) => {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('hi')) return 'hi';
  if (value.startsWith('mar') || value.startsWith('mr')) return 'mr';
  return 'en';
};

export default i18n;
