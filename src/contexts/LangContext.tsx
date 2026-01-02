// ============================================
// src/contexts/LangContext.tsx
// Contexte langue + i18n très simple
// ============================================

import React from "react";
import { DICT } from "../i18n";

// -----------------------------
// Types publics
// -----------------------------

export type Lang =
  | "fr"
  | "en"
  | "es"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "ru"
  | "zh"
  | "ja"
  | "ar"
  | "hi"
  | "tr"
  | "da"
  | "no"
  | "sv"
  | "is"
  | "pl"
  | "ro"
  | "sr"
  | "hr"
  | "cs";

export type Dict = Record<string, string>;

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

const LangContext = React.createContext<LangContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "dc_lang_v1";

const ALL_LANGS: Lang[] = [
  "fr",
  "en",
  "es",
  "de",
  "it",
  "pt",
  "nl",
  "ru",
  "zh",
  "ja",
  "ar",
  "hi",
  "tr",
  "da",
  "no",
  "sv",
  "is",
  "pl",
  "ro",
  "sr",
  "hr",
  "cs",
];

// Force type dynamique
const DICT_ANY = DICT as any;

// -----------------------------
// Helpers
// -----------------------------

function getDictFor(code: Lang): Dict | undefined {
  return DICT_ANY[code] as Dict | undefined;
}

// -----------------------------
// Provider
// -----------------------------

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("fr");

  // --- Chargement depuis localStorage ---
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.lang !== "string") return;

      const candidate = parsed.lang as Lang;
      if (ALL_LANGS.includes(candidate)) {
        setLangState(candidate);
      }
    } catch {
      // silencieux : FR par défaut
    }
  }, []);

  // --- setLang() ---
  const setLang = React.useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lang: next })
      );
    } catch {}
  }, []);

  // --- Valeur du contexte ---
  const value = React.useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string, fallback?: string) => {
        const dictCurrent = getDictFor(lang);
        const dictFr = getDictFor("fr") || {};

        // 1) Dictionnaire langue courante
        if (
          dictCurrent &&
          Object.prototype.hasOwnProperty.call(dictCurrent, key)
        ) {
          return dictCurrent[key];
        }

        // 2) Fallback FR
        if (Object.prototype.hasOwnProperty.call(dictFr, key)) {
          return dictFr[key];
        }

        // 3) Fallback manuel ou clé brute
        return fallback ?? key;
      },
    }),
    [lang]
  );

  return (
    <LangContext.Provider value={value}>{children}</LangContext.Provider>
  );
}

// -----------------------------
// Hook
// -----------------------------

export function useLang(): LangContextValue {
  const ctx = React.useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within LangProvider");
  }
  return ctx;
}
