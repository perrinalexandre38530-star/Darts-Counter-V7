// @ts-nocheck
// =============================================================
// src/lib/geoAssets.ts
// Assets locaux (flags pays + logos régions FR) pour un rendu fiable sur tous navigateurs.
// =============================================================

import flagFR from "../assets/flags/FR.png";
import flagBE from "../assets/flags/BE.png";
import flagCH from "../assets/flags/CH.png";
import flagES from "../assets/flags/ES.png";
import flagIT from "../assets/flags/IT.png";
import flagDE from "../assets/flags/DE.png";
import flagPT from "../assets/flags/PT.png";
import flagGB from "../assets/flags/GB.png";
import flagUS from "../assets/flags/US.png";

import regARA from "../assets/regions_fr/FR-ARA.png";
import regBFC from "../assets/regions_fr/FR-BFC.png";
import regBRE from "../assets/regions_fr/FR-BRE.png";
import regCVL from "../assets/regions_fr/FR-CVL.png";
import regCOR from "../assets/regions_fr/FR-COR.png";
import regGES from "../assets/regions_fr/FR-GES.png";
import regHDF from "../assets/regions_fr/FR-HDF.png";
import regIDF from "../assets/regions_fr/FR-IDF.png";
import regNOR from "../assets/regions_fr/FR-NOR.png";
import regNAQ from "../assets/regions_fr/FR-NAQ.png";
import regOCC from "../assets/regions_fr/FR-OCC.png";
import regPDL from "../assets/regions_fr/FR-PDL.png";
import regPAC from "../assets/regions_fr/FR-PAC.png";
import regGP from "../assets/regions_fr/FR-GP.png";
import regMQ from "../assets/regions_fr/FR-MQ.png";
import regGF from "../assets/regions_fr/FR-GF.png";
import regRE from "../assets/regions_fr/FR-RE.png";
import regYT from "../assets/regions_fr/FR-YT.png";

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
