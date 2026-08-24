// ============================================
// src/i18n/index.ts
// Index i18n — importe toutes les langues
// ============================================

import type { Dict } from "../contexts/LangContext";

import { fr } from "./fr";
import { en } from "./en";
import { es } from "./es";
import { de } from "./de";
import { it } from "./it";
import { pt } from "./pt";
import { nl } from "./nl";
import { ru } from "./ru";
import { zh } from "./zh";
import { ja } from "./ja";
import { ar } from "./ar";
import { hi } from "./hi";
import { tr } from "./tr";
import { da } from "./da";
import { no } from "./no";
import { sv } from "./sv";
import { is } from "./is";
import { pl } from "./pl";
import { ro } from "./ro";
import { sr } from "./sr";
import { hr } from "./hr";
import { cs } from "./cs";
import { frAuto, enAuto, esAuto } from "./auto";
import { frExtras, enExtras, esExtras } from "./extras";
import { CORE_UI_OVERRIDES } from "./coreUiOverrides";

// Mapping global utilisable par LangContext
export const DICT: Record<string, Dict> = {
  fr: { ...fr, ...frAuto, ...frExtras, ...(CORE_UI_OVERRIDES.fr || {}) },
  en: { ...en, ...enAuto, ...enExtras, ...(CORE_UI_OVERRIDES.en || {}) },
  es: { ...es, ...esAuto, ...esExtras, ...(CORE_UI_OVERRIDES.es || {}) },
  de: { ...de, ...(CORE_UI_OVERRIDES.de || {}) },
  it: { ...it, ...(CORE_UI_OVERRIDES.it || {}) },
  pt: { ...pt, ...(CORE_UI_OVERRIDES.pt || {}) },
  nl: { ...nl, ...(CORE_UI_OVERRIDES.nl || {}) },
  ru: { ...ru, ...(CORE_UI_OVERRIDES.ru || {}) },
  zh: { ...zh, ...(CORE_UI_OVERRIDES.zh || {}) },
  ja: { ...ja, ...(CORE_UI_OVERRIDES.ja || {}) },
  ar: { ...ar, ...(CORE_UI_OVERRIDES.ar || {}) },
  hi: { ...hi, ...(CORE_UI_OVERRIDES.hi || {}) },
  tr: { ...tr, ...(CORE_UI_OVERRIDES.tr || {}) },
  da: { ...da, ...(CORE_UI_OVERRIDES.da || {}) },
  no: { ...no, ...(CORE_UI_OVERRIDES.no || {}) },
  sv: { ...sv, ...(CORE_UI_OVERRIDES.sv || {}) },
  is: { ...is, ...(CORE_UI_OVERRIDES.is || {}) },
  pl: { ...pl, ...(CORE_UI_OVERRIDES.pl || {}) },
  ro: { ...ro, ...(CORE_UI_OVERRIDES.ro || {}) },
  sr: { ...sr, ...(CORE_UI_OVERRIDES.sr || {}) },
  hr: { ...hr, ...(CORE_UI_OVERRIDES.hr || {}) },
  cs: { ...cs, ...(CORE_UI_OVERRIDES.cs || {}) },
};
