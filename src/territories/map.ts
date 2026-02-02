// ============================================
// TERRITORIES — STEP 3 (UPDATED): MAP LOADER + SVG BINDING HELPERS
// Location: src/territories/map.ts
//
// Key change (per your request):
// - For France, the BASE map is the existing departments SVG already used in-game:
//     src/assets/maps/france_departements.svg
// - france_regions.svg is used ONLY as an overlay (region boundaries) for UI + future region-win rules.
// ============================================

import type { TerritoriesCountry, TerritoriesMap, Territory } from "./types";

// FR: base departments SVG from existing project assets
import svgFranceDepartements from "../assets/maps/france_departements.svg?raw";

// FR overlay: region boundaries SVG (from svg pack)
import svgFranceRegionsOverlay from "./svg/france_regions.svg?raw";

// Other countries: from svg pack in src/territories/svg
import svgAustralia from "./svg/australia.svg?raw";
import svgChina from "./svg/china.svg?raw";
import svgGermany from "./svg/germany.svg?raw";
import svgItaly from "./svg/italy.svg?raw";
import svgJapan from "./svg/japan.svg?raw";
import svgRussia from "./svg/russia.svg?raw";
import svgSpain from "./svg/spain.svg?raw";
import svgUKCounties from "./svg/united-kingdom-counties.svg?raw";
import svgUSA from "./svg/usa.svg?raw";
import svgWorld from "./svg/world.svg?raw";
import svgNorway from "./svg/norway.svg?raw";
import svgUNRegions from "./svg/un-regions.svg?raw";
import svgSouthAmerica from "./svg/south-america.svg?raw";
import svgNorthAmerica from "./svg/north-america.svg?raw";
import svgAsia from "./svg/asia.svg?raw";
import svgEurope from "./svg/europe.svg?raw";

import svgSpainProvinces from "./svg/spain-provinces.svg?raw";
import svgUkraine from "./svg/ukraine.svg?raw";
import svgSwitzerland from "./svg/switzerland.svg?raw";
import svgSweden from "./svg/sweden.svg?raw";
import svgSouthKorea from "./svg/south-korea.svg?raw";
import svgSaudiArabia from "./svg/saudi-arabia.svg?raw";
import svgPoland from "./svg/poland.svg?raw";
import svgNetherlands from "./svg/netherlands.svg?raw";
import svgMexico from "./svg/mexico.svg?raw";
import svgIndia from "./svg/india.svg?raw";
import svgIceland from "./svg/iceland.svg?raw";
import svgGreece from "./svg/greece.svg?raw";
import svgFinland from "./svg/finland.svg?raw";
import svgEgypt from "./svg/egypt.svg?raw";
import svgDenmark from "./svg/denmark.svg?raw";
import svgCzechRepublic from "./svg/czech-republic.svg?raw";
import svgCroatia from "./svg/croatia.svg?raw";
import svgCanada from "./svg/canada.svg?raw";
import svgBrazil from "./svg/brazil.svg?raw";
import svgBelgium from "./svg/belgium.svg?raw";
import svgAustria from "./svg/austria.svg?raw";
import svgArgentina from "./svg/argentina.svg?raw";
import svgAfrica from "./svg/africa.svg?raw";
// How to assign numeric "values" to territories (used by the capture rule).
// - FR uses department codes (code_numeric).
// - Most countries are more playable with a deterministic numbering.
export type TerritoryValueStrategy = "code_numeric" | "hash_20_99" | "hash_21_180" | "sequential";

export interface TerritoryMetaOverride {
  name?: string;
  region?: string;
  value?: number;
  svgPathId?: string;
}

export interface BuildMapOptions {
  valueStrategy?: TerritoryValueStrategy;
  metaById?: Record<string, TerritoryMetaOverride>;
}

/** Base SVG used for interactions and fills. */
export function getBaseSvgForCountry(country: TerritoriesCountry): string {
  switch (country) {
    case "FR":
      return svgFranceDepartements;
    case "AU":
      return svgAustralia;
    case "CN":
      return svgChina;
    case "DE":
      return svgGermany;
    case "IT":
      return svgItaly;
    case "JP":
      return svgJapan;
    case "RU":
      return svgRussia;
    case "ES":
      return svgSpain;
    case "UK":
      return svgUKCounties;
    case "US":
      return svgUSA;

    case "AF":
      return svgAfrica;
    case "AR":
      return svgArgentina;
    case "AT":
      return svgAustria;
    case "BE":
      return svgBelgium;
    case "BR":
      return svgBrazil;
    case "CA":
      return svgCanada;
    case "HR":
      return svgCroatia;
    case "CZ":
      return svgCzechRepublic;
    case "DK":
      return svgDenmark;
    case "EG":
      return svgEgypt;
    case "FI":
      return svgFinland;
    case "GR":
      return svgGreece;
    case "IS":
      return svgIceland;
    case "IN":
      return svgIndia;
    case "MX":
      return svgMexico;
    case "NL":
      return svgNetherlands;
    case "NO":
      return svgNorway;
    case "PL":
      return svgPoland;
    case "SA":
      return svgSaudiArabia;
    case "KR":
      return svgSouthKorea;
    case "SE":
      return svgSweden;
    case "CH":
      return svgSwitzerland;
    case "UA":
      return svgUkraine;
    case "EU":
      return svgEurope;
    case "ASIA":
      return svgAsia;
    case "NA":
      return svgNorthAmerica;
    case "SAM":
      return svgSouthAmerica;
    case "UN":
      return svgUNRegions;
    case "EN":
      return svgUKCounties;
    case "UK":
      return svgUKCounties;

    case "WORLD":
      return svgWorld;
    default:
      return svgWorld;
  }
}

/** Optional overlay SVG (region boundaries etc). */
export function getOverlaySvgForCountry(country: TerritoriesCountry): string | null {
  // France: region boundaries overlay (departments remain in the base map).
  if (country === "FR") return null; // regions boundaries handled via department coloring
  return null;
}

/** Returns SVG viewBox if present; otherwise derive from width/height; else fallback. */
export function getViewBoxFromSvg(svgText: string): string {
  const vb = matchAttr(svgText, "viewBox");
  if (vb) return vb;

  const w = matchAttr(svgText, "width");
  const h = matchAttr(svgText, "height");

  const wn = w ? parseFloat(w) : NaN;
  const hn = h ? parseFloat(h) : NaN;

  if (Number.isFinite(wn) && Number.isFinite(hn)) return `0 0 ${wn} ${hn}`;
  return "0 0 1000 600";
}

/**
 * Country-specific extraction of territories from the base SVG.
 * - FR: <path data-numerodepartement="75" data-nom="Paris" ...> inside <g class="region ..." data-code_insee="11">
 * - Others: <path id="US-CA" ...>
 */
export function buildTerritoriesMap(country: TerritoriesCountry, opts: BuildMapOptions = {}): TerritoriesMap {
  const svg = getBaseSvgForCountry(country);
  const svgViewBox = getViewBoxFromSvg(svg);

  // ✅ Default: for non-FR maps, use deterministic sequential numbering.
  // (FR is already numeric via department codes).
  const effectiveOpts: BuildMapOptions = {
    ...opts,
    valueStrategy:
      opts.valueStrategy ?? (country === "FR" ? "code_numeric" : "sequential"),
  };

  let territories: Territory[] = [];

  if (country === "FR") {
    territories = extractFranceDepartments(svg, effectiveOpts);
  } else if (country === "WORLD") {
    territories = extractByPathId(svg, country, effectiveOpts).map((t) => ({
      ...t,
      id: normalizeTerritoryId("WORLD", t.id),
      country: "WORLD",
    }));
  } else {
    territories = extractByPathId(svg, country, effectiveOpts);
  }

  return { country, svgViewBox, territories };
}

/** Extract territories from <path id="...">. */
function extractByPathId(svgText: string, country: TerritoriesCountry, opts: BuildMapOptions): Territory[] {
  const ids: string[] = [];
  const re = /<path\b[^>]*\bid="([^"]+)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svgText))) ids.push(m[1]);

  // Stable order for sequential numbering
  const sorted = [...ids].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }));
  const seqValueById: Record<string, number> = {};
  if (opts.valueStrategy === "sequential") {
    let n = 1;
    for (const pid of sorted) seqValueById[pid] = n++;
  }

  return ids.map((pid) => {
    const id = pid.trim();
    const base: Territory = {
      id,
      country,
      region: country,
      name: id,
      value:
        opts.valueStrategy === "sequential"
          ? (seqValueById[pid] ?? defaultValueForId(id, "hash_21_180"))
          : defaultValueForId(id, (opts.valueStrategy ?? "hash_21_180") as any),
      svgPathId: pid.trim(),
      ownerId: undefined,
    };
    return applyMeta(base, opts.metaById?.[base.id]);
  });
}

/** Extract France departments using data-numerodepartement + region code. */
function extractFranceDepartments(svgText: string, opts: BuildMapOptions): Territory[] {
  // We capture: region code_insee from <g ... data-code_insee="11"> and then paths within
  // Note: This is a resilient regex approach; later we can move to DOMParser in-browser if needed.
  const territories: Territory[] = [];

  // Match each region group chunk
  const regionRe = /<g\b[^>]*\bdata-code_insee="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g;
  let rm: RegExpExecArray | null;

  // In some SVGs, groups are nested; the above naive regex may miss. Use a simpler scan:
  // We'll instead find each path and read data-code_insee by nearest preceding <g ... data-code_insee="..">.
  const pathRe = /<path\b([^>]*?)>/g;
  let pm: RegExpExecArray | null;
  let currentRegion = "FR";

  // Track last seen region code in the text stream.
  const tagRe = /<(g|path)\b([^>]*?)>/g;
  let tm: RegExpExecArray | null;

  while ((tm = tagRe.exec(svgText))) {
    const tag = tm[1];
    const attrs = tm[2] || "";

    if (tag === "g") {
      const code = matchAttrFromAttrs(attrs, "data-code_insee");
      if (code) currentRegion = `FR-${code}`; // region id like FR-11
      continue;
    }

    if (tag === "path") {
      const dep = matchAttrFromAttrs(attrs, "data-numerodepartement");
      if (!dep) continue;

      const depName = matchAttrFromAttrs(attrs, "data-nom") ?? `DEP-${dep}`;
      const territoryId = `FR-${dep}`;

      const base: Territory = {
        id: territoryId,
        country: "FR",
        region: currentRegion,
        name: depName,
        value: clamp(parseInt(dep, 10), 1, 180),
        // For FR we use svgPathId as the department number, because the SVG has no path id
        svgPathId: dep,
        ownerId: undefined,
      };

      territories.push(applyMeta(base, opts.metaById?.[territoryId]));
    }
  }

  // Deduplicate (in case of quirks)
  const seen = new Set<string>();
  return territories.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

/**
 * Given a clicked SVG element, returns the territory id for the current country.
 * UI uses this for event delegation (click on <path>).
 */
export function getTerritoryIdFromSvgElement(country: TerritoriesCountry, el: Element): string | null {
  if (!el) return null;

  if (country === "FR") {
    const dep = (el as any).getAttribute?.("data-numerodepartement") ?? (el as any).dataset?.numerodepartement;
    if (dep) return `FR-${String(dep)}`;
    return null;
  }

  const id = (el as any).id || (el as any).getAttribute?.("id");
  if (!id) return null;

  if (country === "WORLD") return normalizeTerritoryId("WORLD", String(id));
  return String(id);
}

export function normalizeTerritoryId(country: TerritoriesCountry, raw: string): string {
  const clean = raw.trim();
  if (country === "WORLD") {
    return clean.startsWith("WORLD-") ? clean : `WORLD-${clean}`;
  }
  return clean;
}

export function defaultValueForId(territoryId: string, strategy: TerritoryValueStrategy): number {
  if (strategy === "code_numeric") {
    const m = /([0-9]{1,3})$/.exec(territoryId);
    if (m) return clamp(parseInt(m[1], 10), 1, 180);
  }

  const h = hash32(territoryId);
  if (strategy === "hash_21_180") return 21 + (h % 160); // 21..180
  return 20 + (h % 80); // 20..99 (legacy)
}

export function buildSvgPathIdToTerritoryIdIndex(map: TerritoriesMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of map.territories) out[t.svgPathId] = t.id;
  return out;
}

function applyMeta(t: Territory, meta?: TerritoryMetaOverride): Territory {
  if (!meta) return t;
  return {
    ...t,
    name: meta.name ?? t.name,
    region: meta.region ?? t.region,
    value: typeof meta.value === "number" ? meta.value : t.value,
    svgPathId: meta.svgPathId ?? t.svgPathId,
  };
}

function matchAttr(svgText: string, attr: string): string | null {
  const re = new RegExp(`${attr}="([^"]+)"`);
  const m = re.exec(svgText);
  return m ? m[1] : null;
}

function matchAttrFromAttrs(attrs: string, attr: string): string | null {
  const re = new RegExp(`${attr}="([^"]+)"`);
  const m = re.exec(attrs);
  return m ? m[1] : null;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function hash32(s: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
