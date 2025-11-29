import { createContext, useContext, useEffect, useState } from 'react';
import { translate } from '../i18n/translations.js';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (text) => text
});

const STORAGE_KEY = 'rha_language';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'hi' || stored === 'mr') {
        setLanguageState(stored);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setLanguage = (lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  };

  const t = (text) => translate(text, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;


