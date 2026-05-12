import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import sn from './locales/sn.json';
import zu from './locales/zu.json';
import af from './locales/af.json';
import pt from './locales/pt.json';
import sw from './locales/sw.json';

i18n
  .use(LanguageDetector)       
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sn: { translation: sn },
      zu: { translation: zu },
      af: { translation: af },
      pt: { translation: pt },
      sw: { translation: sw },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;