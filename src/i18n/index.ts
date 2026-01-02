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

// Mapping global utilisable par LangContext
export const DICT: Record<string, Dict> = {
  fr,
  en,
  es,
  de,
  it,
  pt,
  nl,
  ru,
  zh,
  ja,
  ar,
  hi,
  tr,
  da,
  no,
  sv,
  is,
  pl,
  ro,
  sr,
  hr,
  cs,
};
