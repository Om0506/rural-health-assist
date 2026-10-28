import { createContext, useContext, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGE_OPTIONS, STORAGE_KEY } from '../i18n';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, options) => options?.defaultValue || key,
});

export function LanguageProvider({ children }) {
  const { t, i18n: i18next } = useTranslation('common');
  const language = i18next.resolvedLanguage || i18next.language || 'en';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
  }, [language]);

  const setLanguage = (lang) => {
    const next = LANGUAGE_OPTIONS.some((option) => option.value === lang) ? lang : 'en';
    i18n.changeLanguage(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
