import i18n, { LANGUAGE_OPTIONS, resources } from './index';

export { LANGUAGE_OPTIONS };

export const TRANSLATIONS = {
  en: resources.en.common,
  hi: resources.hi.common,
  mr: resources.mr.common,
};

export const translate = (key, language = i18n.language, options = {}) => {
  if (!key) return key;
  return i18n.t(key, { lng: language, defaultValue: key, ...options });
};
