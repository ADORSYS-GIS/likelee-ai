import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import modular translation files
import enCreator from "./locales/creator/en.json";
import enBrand from "./locales/brand/en.json";
import enCommon from "./locales/common/en.json";
import enAgency from "./locales/agency/en.json";
import enAuth from "./locales/auth/en.json";

import esCreator from "./locales/creator/es.json";
import esBrand from "./locales/brand/es.json";
import esCommon from "./locales/common/es.json";
import esAgency from "./locales/agency/es.json";
import esAuth from "./locales/auth/es.json";

import deCreator from "./locales/creator/de.json";
import deBrand from "./locales/brand/de.json";
import deCommon from "./locales/common/de.json";
import deAgency from "./locales/agency/de.json";
import deAuth from "./locales/auth/de.json";

import frCreator from "./locales/creator/fr.json";
import frBrand from "./locales/brand/fr.json";
import frCommon from "./locales/common/fr.json";
import frAgency from "./locales/agency/fr.json";
import frAuth from "./locales/auth/fr.json";

// Merge all modules into single translation object for backward compatibility
// This allows existing components to work without changes
const resources = {
  en: {
    translation: {
      ...enCommon,
      ...enCreator,
      ...enBrand,
      ...enAgency,
      ...enAuth,
    },
  },
  es: {
    translation: {
      ...esCommon,
      ...esCreator,
      ...esBrand,
      ...esAgency,
      ...esAuth,
    },
  },
  de: {
    translation: {
      ...deCommon,
      ...deCreator,
      ...deBrand,
      ...deAgency,
      ...deAuth,
    },
  },
  fr: {
    translation: {
      ...frCommon,
      ...frCreator,
      ...frBrand,
      ...frAgency,
      ...frAuth,
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
