// @ts-nocheck
// =============================================================
// src/lib/geoAssets.ts
// Assets locaux (flags pays + logos régions FR) pour un rendu fiable sur tous navigateurs.
// =============================================================

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

const FLAG_MODULES = import.meta.glob("../assets/flags/*.{png,svg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const COUNTRY_FLAGS: Record<string, string> = Object.fromEntries(
  Object.entries(FLAG_MODULES)
    .map(([path, src]) => {
      const file = path.split("/").pop() || "";
      const code = file.replace(/\.(png|svg|webp)$/i, "").toUpperCase();
      return [code, src];
    })
    .filter(([code, src]) => Boolean(code && src))
);

const COUNTRY_CODE_ALIASES: Record<string, string> = {
  UK: "GB",
  "GB-ENG": "ENG",
  ENGLAND: "ENG",
  ANGLETERRE: "ENG",
  "GB-SCT": "SCO",
  "GB-SCO": "SCO",
  SCOTLAND: "SCO",
  ECOSSE: "SCO",
  "ÉCOSSE": "SCO",
  "GB-WLS": "WAL",
  "GB-WAL": "WAL",
  WALES: "WAL",
  "PAYS DE GALLES": "WAL",
};

const SPECIAL_COUNTRY_LABELS: Record<string, Record<string, string>> = {
  ENG: { fr: "Angleterre", en: "England" },
  SCO: { fr: "Écosse", en: "Scotland" },
  WAL: { fr: "Pays de Galles", en: "Wales" },
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

export function normalizeCountryAssetCode(code?: string | null): string {
  const raw = String(code || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase().replace(/_/g, "-");
  return COUNTRY_CODE_ALIASES[upper] || upper;
}

function normRegion(code?: string) {
  const r = String(code || "FR-IDF").toUpperCase().trim();
  if (!r.startsWith("FR-")) return "FR-IDF";
  return r;
}

export function getCountryFlagSrc(countryCode?: string | null): string | null {
  const code = normalizeCountryAssetCode(countryCode);
  if (!code) return null;
  return COUNTRY_FLAGS[code] || null;
}

export type CountryFlagOption = { code: string; label: string; flagSrc: string };

export function getCountryFlagOptions(locale = "fr"): CountryFlagOption[] {
  const lang = String(locale || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
  let displayNames: Intl.DisplayNames | null = null;
  try {
    displayNames = new Intl.DisplayNames([lang], { type: "region" });
  } catch {}

  const options: CountryFlagOption[] = [];
  for (const [code, flagSrc] of Object.entries(COUNTRY_FLAGS)) {
    if (!flagSrc) continue;
    if (SPECIAL_COUNTRY_LABELS[code]) {
      options.push({ code, label: SPECIAL_COUNTRY_LABELS[code][lang] || SPECIAL_COUNTRY_LABELS[code].fr, flagSrc });
      continue;
    }
    if (!/^[A-Z]{2}$/.test(code) || code === "UN" || code === "UK" || code === "EN") continue;
    let label = "";
    try {
      label = String(displayNames?.of(code) || "").trim();
    } catch {}
    if (!label || label.toUpperCase() === code) continue;
    options.push({ code, label, flagSrc });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, lang, { sensitivity: "base" }));
}

// Ancien nom (compat)
export function getFRRegionLogoSrc(regionCode?: string): string | null {
  const r = normRegion(regionCode);
  return FR_REGION_LOGOS[r] || null;
}

export function getRegionFlagSrc(regionCode?: string): string | null {
  return getFRRegionLogoSrc(regionCode);
}
