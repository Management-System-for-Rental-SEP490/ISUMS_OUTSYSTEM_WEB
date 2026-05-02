import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import viCommon from "./locales/vi/common.json";
import enCommon from "./locales/en/common.json";
import jaCommon from "./locales/ja/common.json";

const STORAGE_KEY = "outsystem_lang";
const SUPPORTED = new Set(["vi", "en", "ja"]);

/**
 * Resolution order (first hit wins):
 *  1. URL ?lang=xx  — set by the email magic link (BE uses this to respect
 *     contract.contractLanguage). Takes precedence so the tenant's first
 *     view of their contract is in the language agreed at signing.
 *  2. localStorage — sticks for the session if the user clicks the language
 *     switcher later.
 *  3. navigator.language — best effort, falls back to vi.
 */
function resolveInitialLanguage() {
  try {
    const qs = new URLSearchParams(window.location.search);
    const fromUrl = (qs.get("lang") || "").toLowerCase();
    if (SUPPORTED.has(fromUrl)) {
      // Persist so a page refresh keeps the chosen language.
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
  } catch {
    // ignore — fall through
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.has(saved)) return saved;
  } catch {
    // ignore
  }
  try {
    const nav = (navigator.language || "vi").slice(0, 2).toLowerCase();
    if (SUPPORTED.has(nav)) return nav;
  } catch {
    // ignore
  }
  return "vi";
}

i18n.use(initReactI18next).init({
  lng: resolveInitialLanguage(),
  fallbackLng: "vi",
  resources: {
    vi: { common: viCommon },
    en: { common: enCommon },
    ja: { common: jaCommon },
  },
  interpolation: { escapeValue: false },
  // Namespace defaults — most UI lives under "common".
  ns: ["common"],
  defaultNS: "common",
});

// Expose for manual switches (e.g. a language picker in the header).
export function setLanguage(lang) {
  if (!SUPPORTED.has(lang)) return;
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

export default i18n;
