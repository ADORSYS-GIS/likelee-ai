import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import modular translation files
import enCreator from "./locales/creator/en.json";
import enBrand from "./locales/brand/en.json";
import enCommon from "./locales/common/en.json";
import enAgency from "./locales/agency/en.json";
import enAuth from "./locales/auth/en.json";
import enCreatorTerms from "./locales/creatorTerms/en.json";
import enBrandAgencyTerms from "./locales/brandAgencyTerms/en.json";

import esCreator from "./locales/creator/es.json";
import esBrand from "./locales/brand/es.json";
import esCommon from "./locales/common/es.json";
import esAgency from "./locales/agency/es.json";
import esAuth from "./locales/auth/es.json";
import esCreatorTerms from "./locales/creatorTerms/es.json";
import esBrandAgencyTerms from "./locales/brandAgencyTerms/es.json";

import deCreator from "./locales/creator/de.json";
import deBrand from "./locales/brand/de.json";
import deCommon from "./locales/common/de.json";
import deAgency from "./locales/agency/de.json";
import deAuth from "./locales/auth/de.json";
import deCreatorTerms from "./locales/creatorTerms/de.json";
import deBrandAgencyTerms from "./locales/brandAgencyTerms/de.json";

import frCreator from "./locales/creator/fr.json";
import frBrand from "./locales/brand/fr.json";
import frCommon from "./locales/common/fr.json";
import frAgency from "./locales/agency/fr.json";
import frAuth from "./locales/auth/fr.json";
import frCreatorTerms from "./locales/creatorTerms/fr.json";
import frBrandAgencyTerms from "./locales/brandAgencyTerms/fr.json";

// Deep merge utility — prevents shared top-level keys (e.g. "common") in
// different locale modules from silently overwriting each other during spread.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(...sources: Record<string, any>[]): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  for (const source of sources) {
    for (const key of Object.keys(source)) {
      if (
        result[key] &&
        typeof result[key] === "object" &&
        !Array.isArray(result[key]) &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
}

// Merge all modules into single translation object for backward compatibility
// This allows existing components to work without changes
const resources = {
  en: {
    common: enCommon,
    creator: enCreator,
    brand: enBrand,
    agency: enAgency,
    auth: enAuth,
    creatorTerms: enCreatorTerms,
    brandAgencyTerms: enBrandAgencyTerms,
    translation: deepMerge(
      enCommon,
      enCreator,
      enBrand,
      enAgency,
      enAuth,
      enCreatorTerms,
      enBrandAgencyTerms,
    ),
  },
  es: {
    common: esCommon,
    creator: esCreator,
    brand: esBrand,
    agency: esAgency,
    auth: esAuth,
    creatorTerms: esCreatorTerms,
    brandAgencyTerms: esBrandAgencyTerms,
    translation: deepMerge(
      esCommon,
      esCreator,
      esBrand,
      esAgency,
      esAuth,
      esCreatorTerms,
      esBrandAgencyTerms,
    ),
  },
  de: {
    common: deCommon,
    creator: deCreator,
    brand: deBrand,
    agency: deAgency,
    auth: deAuth,
    creatorTerms: deCreatorTerms,
    brandAgencyTerms: deBrandAgencyTerms,
    translation: deepMerge(
      deCommon,
      deCreator,
      deBrand,
      deAgency,
      deAuth,
      deCreatorTerms,
      deBrandAgencyTerms,
    ),
  },
  fr: {
    common: frCommon,
    creator: frCreator,
    brand: frBrand,
    agency: frAgency,
    auth: frAuth,
    creatorTerms: frCreatorTerms,
    brandAgencyTerms: frBrandAgencyTerms,
    translation: deepMerge(
      frCommon,
      frCreator,
      frBrand,
      frAgency,
      frAuth,
      frCreatorTerms,
      frBrandAgencyTerms,
    ),
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "translation",
    ns: [
      "translation",
      "common",
      "creator",
      "brand",
      "agency",
      "auth",
      "creatorTerms",
      "brandAgencyTerms",
    ],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
