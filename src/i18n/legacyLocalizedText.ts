import type { Lang } from "../contexts/LangContext";
import { DICT } from "./index";
import {
  createUiLiteralTranslator,
  registerUiLiteralTranslationSource,
} from "./uiLiteralSafety";

/**
 * Compatibility bridge for historical FR/EN/ES inline strings.
 *
 * Old screens often used:
 *   lang === "fr" ? fr : lang === "es" ? es : en
 * which makes every newer selectable language silently display English.
 *
 * FR/EN/ES keep their authored copy. Every other language first reuses any
 * deterministic target-language dictionary match; if none exists, the
 * canonical French string is registered for the local translation safety-net.
 */
export function pickLegacyLocalizedText(
  lang: Lang | string,
  fr: string,
  en: string,
  es: string
): string {
  const target = String(lang || "fr").toLowerCase().split("-")[0];
  if (target === "fr") return fr;
  if (target === "en") return en;
  if (target === "es") return es;

  const deterministic = createUiLiteralTranslator(DICT as any, target)(fr);
  if (deterministic !== fr) return deterministic;

  registerUiLiteralTranslationSource(fr, "fr");
  return fr;
}

export function localeForLang(lang: Lang | string): string {
  const target = String(lang || "fr").toLowerCase().split("-")[0];
  const locales: Record<string, string> = {
    fr: "fr-FR",
    en: "en-GB",
    es: "es-ES",
    de: "de-DE",
    it: "it-IT",
    pt: "pt-PT",
    nl: "nl-NL",
    ru: "ru-RU",
    zh: "zh-CN",
    ja: "ja-JP",
    ar: "ar-SA",
    hi: "hi-IN",
    tr: "tr-TR",
    da: "da-DK",
    no: "nb-NO",
    sv: "sv-SE",
    is: "is-IS",
    pl: "pl-PL",
    ro: "ro-RO",
    sr: "sr-Cyrl-RS",
    hr: "hr-HR",
    cs: "cs-CZ",
  };
  return locales[target] || "en-GB";
}

function registerFrenchValue(value: unknown): void {
  if (typeof value === "string") {
    registerUiLiteralTranslationSource(value, "fr");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(registerFrenchValue);
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach(registerFrenchValue);
  }
}

export function pickLegacyLocalizedValue<T>(
  lang: Lang | string,
  fr: T,
  en: T,
  es: T
): T {
  const target = String(lang || "fr").toLowerCase().split("-")[0];
  if (target === "fr") return fr;
  if (target === "en") return en;
  if (target === "es") return es;
  registerFrenchValue(fr);
  return fr;
}

export function pickLegacyLocalizedTextWithOverrides(
  lang: Lang | string,
  fr: string,
  en: string,
  es: string,
  overrides: Partial<Record<string, string>> = {}
): string {
  const target = String(lang || "fr").toLowerCase().split("-")[0];
  const override = overrides[target];
  if (typeof override === "string") return override;
  return pickLegacyLocalizedText(target, fr, en, es);
}

export function pickLegacyBilingualText(
  lang: Lang | string,
  fr: string,
  en: string
): string {
  const target = String(lang || "fr").toLowerCase().split("-")[0];
  if (target === "fr") return fr;
  if (target === "en") return en;

  const deterministic = createUiLiteralTranslator(DICT as any, target)(fr);
  if (deterministic !== fr) return deterministic;

  registerUiLiteralTranslationSource(fr, "fr");
  return fr;
}
