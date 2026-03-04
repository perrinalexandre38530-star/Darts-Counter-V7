// @ts-nocheck
// =============================================================
// src/lib/geoAssets.ts
// Assets locaux (flags pays + logos régions FR) pour un rendu fiable sur tous navigateurs.
// =============================================================

import flagFR from "../assets-webp/flags/FR.webp";
import flagBE from "../assets-webp/flags/BE.webp";
import flagCH from "../assets-webp/flags/CH.webp";
import flagES from "../assets-webp/flags/ES.webp";
import flagIT from "../assets-webp/flags/IT.webp";
import flagDE from "../assets-webp/flags/DE.webp";
import flagPT from "../assets-webp/flags/PT.webp";
import flagGB from "../assets-webp/flags/GB.webp";
import flagUS from "../assets-webp/flags/US.webp";

import regARA from "../assets-webp/regions_fr/FR-ARA.webp";
import regBFC from "../assets-webp/regions_fr/FR-BFC.webp";
import regBRE from "../assets-webp/regions_fr/FR-BRE.webp";
import regCVL from "../assets-webp/regions_fr/FR-CVL.webp";
import regCOR from "../assets-webp/regions_fr/FR-COR.webp";
import regGES from "../assets-webp/regions_fr/FR-GES.webp";
import regHDF from "../assets-webp/regions_fr/FR-HDF.webp";
import regIDF from "../assets-webp/regions_fr/FR-IDF.webp";
import regNOR from "../assets-webp/regions_fr/FR-NOR.webp";
import regNAQ from "../assets-webp/regions_fr/FR-NAQ.webp";
import regOCC from "../assets-webp/regions_fr/FR-OCC.webp";
import regPDL from "../assets-webp/regions_fr/FR-PDL.webp";
import regPAC from "../assets-webp/regions_fr/FR-PAC.webp";
import regGP from "../assets-webp/regions_fr/FR-GP.webp";
import regMQ from "../assets-webp/regions_fr/FR-MQ.webp";
import regGF from "../assets-webp/regions_fr/FR-GF.webp";
import regRE from "../assets-webp/regions_fr/FR-RE.webp";
import regYT from "../assets-webp/regions_fr/FR-YT.webp";

const COUNTRY_FLAGS: Record<string, string> = {
  FR: flagFR,
  BE: flagBE,
  CH: flagCH,
  ES: flagES,
  IT: flagIT,
  DE: flagDE,
  PT: flagPT,
  GB: flagGB,
  US: flagUS,
};

const FR_REGION_LOGOS: Record<string, string> = {
  "FR-ARA": regARA,
  "FR-BFC": regBFC,
  "FR-BRE": regBRE,
  "FR-CVL": regCVL,
  "FR-COR": regCOR,
  "FR-GES": regGES,
  "FR-HDF": regHDF,
  "FR-IDF": regIDF,
  "FR-NOR": regNOR,
  "FR-NAQ": regNAQ,
  "FR-OCC": regOCC,
  "FR-PDL": regPDL,
  "FR-PAC": regPAC,
  "FR-GP": regGP,
  "FR-MQ": regMQ,
  "FR-GF": regGF,
  "FR-RE": regRE,
  "FR-YT": regYT,
};

function normCountry(code?: string) {
  const c = String(code || "FR").toUpperCase().slice(0, 2);
  if (c === "UK") return "GB";
  return c;
}

function normRegion(code?: string) {
  const r = String(code || "FR-IDF").toUpperCase().trim();
  if (!r.startsWith("FR-")) return "FR-IDF";
  return r;
}

// -------------------------------------------------------------
// Exports
// -------------------------------------------------------------

export function getCountryFlagSrc(countryCode?: string): string | null {
  const c = normCountry(countryCode);
  return COUNTRY_FLAGS[c] || null;
}

// Ancien nom (compat)
export function getFRRegionLogoSrc(regionCode?: string): string | null {
  const r = normRegion(regionCode);
  return FR_REGION_LOGOS[r] || null;
}

// ✅ NOUVEAU nom standard (celui que tes pages importent)
export function getRegionFlagSrc(regionCode?: string): string | null {
  return getFRRegionLogoSrc(regionCode);
}
