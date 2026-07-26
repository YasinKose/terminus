import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

export const SUPPORTED_LANGUAGES = ["en", "tr"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function parseSupportedLanguage(
  language: string | null | undefined,
): SupportedLanguage | null {
  const baseLanguage = language?.trim().toLowerCase().split(/[-_]/)[0];
  return baseLanguage === "en" || baseLanguage === "tr" ? baseLanguage : null;
}

export function resolveSupportedLanguage(
  language: string | null | undefined,
): SupportedLanguage {
  return parseSupportedLanguage(language) ?? "en";
}

export function detectSystemLanguage(): SupportedLanguage {
  if (typeof navigator === "undefined") return "en";
  return resolveSupportedLanguage(navigator.languages?.[0] ?? navigator.language);
}

const resources = {
  en: { translation: en },
  tr: { translation: tr },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: detectSystemLanguage(),
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGES,
  load: "languageOnly",
  initAsync: false,
  interpolation: {
    escapeValue: false,
  },
});

export function applyDocumentLanguage(language: SupportedLanguage): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
}

applyDocumentLanguage(resolveSupportedLanguage(i18n.resolvedLanguage));
i18n.on("languageChanged", (language) => {
  applyDocumentLanguage(resolveSupportedLanguage(language));
});

export async function changeLanguage(
  language: SupportedLanguage,
): Promise<void> {
  await i18n.changeLanguage(language);
}

export default i18n;
