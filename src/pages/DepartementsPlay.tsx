// ============================================
// src/pages/DepartementsPlay.tsx
// TERRITORIES (Départements / Pays) — PLAY
// ✅ Carte cliquable + colorisée + liée au pays choisi en config
// ✅ KPI Objectif + Territoire (neon) au-dessus de la map (sans doublon)
// ✅ Bouton "i" sur la map : ouvre la liste valeurs (territoire ↔ numéro)
// ✅ Frame map uniforme (toutes les maps s'adaptent au même cadre)
// ✅ Config appliquée : targetSelectionMode / captureRule / victoryMode / winRegions (FR) / time
// ============================================

import React from "react";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";

import PageHeader from "../components/PageHeader";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import RulesModal from "../components/RulesModal";
import ScoreInputHub from "../components/ScoreInputHub";
import ProfileAvatar from "../components/ProfileAvatar";

import type { Dart as UIDart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type {
  TerritoriesCountry,
  TerritoriesGameState,
  TerritoriesPlayer,
  TerritoriesTeam,
  TerritoriesVictoryCondition,
} from "../territories/types";
import { buildTerritoriesMap, getBaseSvgForCountry } from "../territories/map";
import TerritoriesMapView from "../territories/TerritoriesMapView";
import { getFrenchDepartmentFlagUrl } from "../territories/frDepartmentFlags";
import {
  applyBalancedTerritoryValues,
  buildTerritoryValueCalibration,
  buildTerritoryValueCalibrationFromAverage,
} from "../territories/territoryValueBalancing";
import {
  normalizeTerritoriesState,
  selectTerritory,
  applyVisit,
  endTurn,
  countOwnedByOwnerId,
  sumOwnedValueByOwnerId,
  initializeEqualTerritoryOwnership,
  getOwnerIdForPlayer,
} from "../territories/engine";

import { TERRITORY_MAPS as TERRITORY_MAP_REGISTRY } from "../lib/territories/maps";
import { pushTerritoriesHistory } from "../lib/territories/territoriesStats";
import { speak } from "../lib/voice";
import { playGolfTickerSound, unlockAudio } from "../lib/sfx";
import { x01EnsureAudioUnlocked, x01PlaySfxV3 } from "../lib/x01SfxV3";
import { loadBotPlayers } from "../lib/bots";
import targetBgUrl from "../assets/target_bg.png";

// Config payload saved by DepartementsConfig.tsx
export type TerritoriesConfigPayload = {
  players: number;
  teamSize: 1 | 2 | 3;
  teamCount?: number;
  selectedIds: string[];
  teamsById?: Record<string, number>;
  participantProfiles?: Record<string, { name: string; avatarDataUrl?: string | null; isBot?: boolean; botLevel?: string | null }>;
  botsEnabled: boolean;
  botLevel: "easy" | "normal" | "hard";
  rounds: number;
  objective: number;
  mapId: string;

  gameMode?: "classic" | "fortress";
  fortressVictoryMode?: "majority" | "value" | "conquest";
  maxFortressesPerOwner?: number;
  targetSelectionMode?: "free" | "by_score";
  captureRule?: "exact" | "gte";
  victoryMode?: "territories" | "regions" | "time";
  winTerritories?: number;
  winRegions?: number;
  timeLimitMin?: number;
  bullReplayEnabled?: boolean;
  missPassTurn?: boolean;
  valueSkillAverage3?: number;
  valueTargetMin?: number;
  valueTargetMax?: number;
  valueDifficultyLabel?: string;
};

const tickerGlob = import.meta.glob("../assets/tickers/ticker_territories_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

// Country flags (used as subtle watermark in "CARTE" button)
const flagGlob = import.meta.glob("../assets/flags/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

// Drapeaux graphiques des 22 territoires de la carte MONDE UN.
// Les fichiers utilisent directement les IDs du SVG un-regions.svg.
const unRegionFlagGlob = import.meta.glob("../assets/flags_un/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const UN_REGION_NAMES_FR: Record<string, string> = {
  nAfrica: "Afrique du Nord",
  wAfrica: "Afrique de l’Ouest",
  mAfrica: "Afrique centrale",
  eAfrica: "Afrique de l’Est",
  sAfrica: "Afrique australe",
  nAmerica: "Amérique du Nord",
  cAmerica: "Amérique centrale",
  caribbean: "Caraïbes",
  sAmerica: "Amérique du Sud",
  nEurope: "Europe septentrionale",
  wEurope: "Europe occidentale",
  sEurope: "Europe méridionale",
  eEurope: "Europe orientale",
  cAsia: "Asie centrale",
  wAsia: "Asie occidentale",
  sAsia: "Asie du Sud",
  eAsia: "Asie de l’Est",
  seAsia: "Asie du Sud-Est",
  australiaNZ: "Australie et Nouvelle-Zélande",
  melanesia: "Mélanésie",
  micronesia: "Micronésie",
  polynesia: "Polynésie",
};

function findUnRegionFlag(regionId: string | null | undefined): string | null {
  const wanted = String(regionId || "").trim().toLowerCase();
  if (!wanted) return null;
  for (const [path, src] of Object.entries(unRegionFlagGlob)) {
    const filename = path.split("/").pop()?.replace(/\.png$/i, "").toLowerCase();
    if (filename === wanted) return src;
  }
  return null;
}

// France regions icons (used in values modal)
const regionsFrGlob = import.meta.glob("../assets/regions_fr/FR-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

// INSEE region codes => (short icon code + display name)
const FR_REGION_META: Record<string, { code: string; name: string }> = {
  "FR-11": { code: "IDF", name: "Île-de-France" },
  "FR-24": { code: "CVL", name: "Centre-Val de Loire" },
  "FR-27": { code: "BFC", name: "Bourgogne-Franche-Comté" },
  "FR-28": { code: "NOR", name: "Normandie" },
  "FR-32": { code: "HDF", name: "Hauts-de-France" },
  "FR-44": { code: "GES", name: "Grand Est" },
  "FR-52": { code: "PDL", name: "Pays de la Loire" },
  "FR-53": { code: "BRE", name: "Bretagne" },
  "FR-75": { code: "NAQ", name: "Nouvelle-Aquitaine" },
  "FR-76": { code: "OCC", name: "Occitanie" },
  "FR-84": { code: "ARA", name: "Auvergne-Rhône-Alpes" },
  "FR-93": { code: "PAC", name: "Provence-Alpes-Côte d’Azur" },
  "FR-94": { code: "COR", name: "Corse" },
};

function findFrRegionIcon(regionCode: string): string | null {
  const code = String(regionCode || "").toUpperCase().trim();
  if (!code) return null;
  const suffix = `/FR-${code}.png`;
  for (const k of Object.keys(regionsFrGlob)) {
    if (k.toUpperCase().endsWith(suffix.toUpperCase())) return regionsFrGlob[k];
  }
  return null;
}

function findTerritoriesTicker(mapId: string): string | null {
  const id = String(mapId || "").toLowerCase();
  const suffix = `/ticker_territories_${id}.png`;
  for (const k of Object.keys(tickerGlob)) {
    if (k.toLowerCase().endsWith(suffix)) return tickerGlob[k];
  }
  return null;
}

function findFlagByCountry(country: string): string | null {
  const c = String(country || "").toUpperCase().trim();
  if (!c) return null;
  // IMPORTANT: keys from import.meta.glob are file paths; case can vary across toolchains.
  // We compare uppercased strings on BOTH sides so '/FR.png' matches even if the key ends with '/FR.PNG'.
  const suffix = `/${c}.png`.toUpperCase();
  for (const k of Object.keys(flagGlob)) {
    if (k.toUpperCase().endsWith(suffix)) return flagGlob[k];
  }
  // Some assets use GB for UK
  if (c === "UK") {
    const gb = `/GB.png`.toUpperCase();
    for (const k of Object.keys(flagGlob)) {
      if (k.toUpperCase().endsWith(gb)) return flagGlob[k];
    }
  }
  return null;
}


const CONTINENT_MAP_IDS = new Set<TerritoriesCountry>(["AF", "ASIA", "EU", "NA", "SAM", "WORLD"]);
// Ces fichiers représentent une CARTE/CONTINENT, pas le pays portant le même code ISO.
// Les collisions AF (Afrique/Afghanistan) et NA (North America/Namibie) utilisent
// des fichiers explicites pour que les deux visuels puissent cohabiter.
const MAP_LEVEL_FLAG_CODES = new Set(["ASIA", "EU", "SAM", "WORLD", "UN"]);
const TERRITORY_FLAG_ALIASES: Record<string, string> = {
  AF: "AF_COUNTRY",
  NA: "NA_COUNTRY",
  KV: "XK",
};

function normalizeTerritoryFlagCode(countryCode: string | null): string | null {
  const raw = String(countryCode || "").toUpperCase().trim();
  if (!raw) return null;
  if (raw.startsWith("WORLD-")) return normalizeTerritoryFlagCode(raw.slice(6));
  if (raw === "KV") return "KV";
  if (/^UM(?:-|$)/.test(raw)) return "UM";
  const match = /^([A-Z]{2})(?:-|$)/.exec(raw);
  return match?.[1] || null;
}

function findTerritoryFlagByCountry(countryCode: string | null): string | null {
  const rawCode = normalizeTerritoryFlagCode(countryCode);
  if (!rawCode) return null;

  const assetCode = TERRITORY_FLAG_ALIASES[rawCode] || rawCode;
  if (MAP_LEVEL_FLAG_CODES.has(rawCode) && !TERRITORY_FLAG_ALIASES[rawCode]) return null;

  // Priorité absolue aux ressources locales fournies, utilisables hors ligne.
  const local = findFlagByCountry(assetCode);
  if (local) return local;

  // Secours réseau uniquement pour un vrai code ISO à deux lettres.
  const remoteCode = rawCode === "KV" ? "XK" : rawCode;
  return /^[A-Z]{2}$/.test(remoteCode)
    ? `https://flagcdn.com/w320/${remoteCode.toLowerCase()}.png`
    : null;
}

function getTerritoryCountryCode(country: TerritoriesCountry, territoryId?: string | null): string | null {
  if (!CONTINENT_MAP_IDS.has(country)) return null;
  const raw = String(territoryId || "")
    .toUpperCase()
    .replace(/^WORLD-/, "")
    .trim();
  return normalizeTerritoryFlagCode(raw);
}

function getLocalizedTerritoryName(code: string | null, lang: string, fallback: string): string {
  if (!code) return fallback;
  const displayCode = code === "KV" ? "XK" : code;
  try {
    const DisplayNamesCtor = (Intl as any)?.DisplayNames;
    if (typeof DisplayNamesCtor === "function") {
      const label = new DisplayNamesCtor([lang || "fr", "fr"], { type: "region" }).of(displayCode);
      if (label && label !== displayCode) return String(label);
    }
  } catch {}
  return fallback || displayCode;
}

function isoCodeToFlagEmoji(code: string | null): string | undefined {
  const normalized = code === "KV" ? "XK" : code;
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) return undefined;
  const base = 0x1f1e6;
  return Array.from(normalized)
    .map((char) => String.fromCodePoint(base + char.charCodeAt(0) - 65))
    .join("");
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeMapIdToCountry(mapId?: string): TerritoriesCountry {
  const m = String(mapId || "FR").toUpperCase().trim();
  if (m === "EN" || m === "GB" || m === "UK") return "UK";
  if (m === "WORLD") return "WORLD";

  const supported: TerritoriesCountry[] = [
    "FR",
    "UK",
    "IT",
    "DE",
    "ES",
    "US",
    "CN",
    "AU",
    "JP",
    "RU",
    "WORLD",
    "AF",
    "AR",
    "ASIA",
    "AT",
    "BE",
    "BR",
    "CA",
    "HR",
    "CZ",
    "DK",
    "EG",
    "EU",
    "FI",
    "GR",
    "IS",
    "IN",
    "MX",
    "NL",
    "NA",
    "NO",
    "PL",
    "SA",
    "SAM",
    "KR",
    "SE",
    "CH",
    "UA",
    "UN",
  ];

  if (supported.includes(m as TerritoriesCountry)) return m as TerritoriesCountry;
  return "FR";
}

function shortName(id: string) {
  const s = String(id || "").trim();
  if (!s) return "Player";
  if (s.length <= 12) return s;
  return `${s.slice(0, 12)}…`;
}

const OWNER_COLORS = [
  "#ffd25a", "#ff5abe", "#52f7ff", "#7cff6b", "#c38bff",
  "#ff8f52", "#58a6ff", "#ff6b6b", "#4ee1b8", "#f4a6ff",
];

const OWNER_NAMES = ["Gold", "Pink", "Blue", "Green", "Violet", "Orange", "Azur", "Red", "Mint", "Rose"];

function interleaveTeams(groups: string[][]) {
  const out: string[] = [];
  const n = Math.max(0, ...groups.map((group) => group.length));
  for (let playerIndex = 0; playerIndex < n; playerIndex += 1) {
    for (const group of groups) {
      const id = group[playerIndex];
      if (id) out.push(id);
    }
  }
  return out;
}

function dartScore(d: UIDart) {
  if (!d) return 0;
  if (d.v === 0) return 0;
  if (d.v === 25) return d.mult === 2 ? 50 : 25;
  return d.v * (d.mult || 1);
}

function computeVisitScores(darts: UIDart[]) {
  // Une volée peut être validée après 1, 2 ou 3 fléchettes.
  return [...(darts || [])].slice(0, 3).map(dartScore);
}

// Totaux réellement disponibles avec une fléchette. Le 0 représente une fléchette
// manquée et permet au calcul de couvrir aussi une validation avant la 3e fléchette.
const TERRITORIES_DART_TOTALS = Array.from(new Set([
  0,
  ...Array.from({ length: 20 }, (_, index) => index + 1),
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 2),
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 3),
  25,
  50,
])).sort((a, b) => a - b);

const TERRITORIES_REACHABLE_ADDITIONAL_TOTALS: Array<Set<number>> = [new Set([0])];
for (let darts = 1; darts <= 3; darts += 1) {
  const previous = TERRITORIES_REACHABLE_ADDITIONAL_TOTALS[darts - 1];
  const next = new Set<number>();
  for (const subtotal of previous) {
    for (const dartTotal of TERRITORIES_DART_TOTALS) next.add(subtotal + dartTotal);
  }
  TERRITORIES_REACHABLE_ADDITIONAL_TOTALS.push(next);
}

function canStillReachTerritoryValue(currentTotal: number, targetValue: number, dartsRemaining: number): boolean {
  const remaining = Math.max(0, Math.min(3, Math.floor(dartsRemaining)));
  const needed = targetValue - currentTotal;
  return needed >= 0 && TERRITORIES_REACHABLE_ADDITIONAL_TOTALS[remaining]?.has(needed) === true;
}

const TERRITORIES_BOT_DARTS: UIDart[] = [
  ...Array.from({ length: 20 }, (_, index) => ({ v: index + 1, mult: 1 as const })),
  ...Array.from({ length: 20 }, (_, index) => ({ v: index + 1, mult: 2 as const })),
  ...Array.from({ length: 20 }, (_, index) => ({ v: index + 1, mult: 3 as const })),
  { v: 25, mult: 1 as const },
  { v: 25, mult: 2 as const },
];

const TERRITORIES_BOT_VISIT_BY_TOTAL = (() => {
  const out = new Map<number, UIDart[]>();
  const ordered = [...TERRITORIES_BOT_DARTS].sort((a, b) => dartScore(b) - dartScore(a));
  for (const dart of ordered) {
    const total = dartScore(dart);
    if (!out.has(total)) out.set(total, [dart]);
  }
  for (const a of ordered) for (const b of ordered) {
    const total = dartScore(a) + dartScore(b);
    if (total <= 180 && !out.has(total)) out.set(total, [a, b]);
  }
  for (const a of ordered) for (const b of ordered) for (const c of ordered) {
    const total = dartScore(a) + dartScore(b) + dartScore(c);
    if (total <= 180 && !out.has(total)) out.set(total, [a, b, c]);
  }
  return out;
})();

function botVisitForTotal(total: number): UIDart[] | null {
  const visit = TERRITORIES_BOT_VISIT_BY_TOTAL.get(Math.round(total));
  return visit ? visit.map((dart) => ({ ...dart })) : null;
}

function randomBotMissVisit(): UIDart[] {
  const count = 2 + Math.floor(Math.random() * 2);
  return Array.from({ length: count }, () => {
    const value = 1 + Math.floor(Math.random() * 20);
    const roll = Math.random();
    return { v: value, mult: roll > 0.90 ? 3 : roll > 0.72 ? 2 : 1 } as UIDart;
  });
}

type TerritoryStealSuggestion = {
  territoryId: string;
  territoryName: string;
  value: number;
  needed: number;
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  fortress: boolean;
};

type PlayerLiveStats = {
  darts: number;
  visits: number;
  captures: number;
  steals: number;
  lost: number;
  fortresses: number;
  breaches: number;
  bulls: number;
  dbulls: number;
  misses: number;
  bullReplays: number;
  missPasses: number;
  captureValueTotal: number;
  maxCaptureValue: number;
  exactCaptures: number;
  gteCaptures: number;
};

const EMPTY_PLAYER_LIVE_STATS: PlayerLiveStats = {
  darts: 0,
  visits: 0,
  captures: 0,
  steals: 0,
  lost: 0,
  fortresses: 0,
  breaches: 0,
  bulls: 0,
  dbulls: 0,
  misses: 0,
  bullReplays: 0,
  missPasses: 0,
  captureValueTotal: 0,
  maxCaptureValue: 0,
  exactCaptures: 0,
  gteCaptures: 0,
};

const TTS_LANG_BY_APP_LANG: Record<string, string> = {
  fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE", it: "it-IT", pt: "pt-PT",
  nl: "nl-NL", ru: "ru-RU", zh: "zh-CN", ja: "ja-JP", ar: "ar-SA", hi: "hi-IN",
  tr: "tr-TR", da: "da-DK", no: "nb-NO", sv: "sv-SE", is: "is-IS", pl: "pl-PL",
  ro: "ro-RO", sr: "sr-RS", hr: "hr-HR", cs: "cs-CZ",
};

function FortressLineIcon(props: { size?: number; color?: string; glowColor?: string; title?: string }) {
  const size = props.size ?? 20;
  const color = props.color ?? "#ffffff";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={props.title ? "img" : undefined}
      aria-label={props.title}
      aria-hidden={props.title ? undefined : true}
      style={{
        display: "block",
        color,
        flex: "0 0 auto",
        filter: props.glowColor ? `drop-shadow(0 0 4px ${props.glowColor}) drop-shadow(0 0 8px ${props.glowColor})` : undefined,
      }}
    >
      <path
        d="M4 20V9h4V5h3v4h2V5h3v4h4v11H4Zm4 0v-5h8v5M4 12h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeaderModeIcons(props: {
  teamMode: boolean;
  fortressMode: boolean;
  color: string;
  timeRemaining?: string | null;
  compact?: boolean;
  roundProgress?: string | null;
  selectionMode?: "free" | "by_score";
  captureRule?: "exact" | "gte";
  victoryKind?: "value" | "territories" | "conquest" | "regions" | "time";
  onOpenLegend?: () => void;
}) {
  const iconShell: React.CSSProperties = {
    width: props.compact ? 24 : 28,
    height: props.compact ? 24 : 28,
    borderRadius: props.compact ? 8 : 10,
    display: "grid",
    placeItems: "center",
    color: props.color,
    background: "rgba(0,0,0,0.30)",
    border: `1px solid ${props.color}66`,
    boxShadow: `0 0 10px ${props.color}22`,
  };

  const commonSvg = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const clickableShell = (title: string): React.CSSProperties => ({
    ...iconShell,
    padding: 0,
    cursor: props.onOpenLegend ? "pointer" : "default",
  });

  const wrapClickable = (title: string, child: React.ReactNode) => (
    <button type="button" onClick={props.onOpenLegend} title={title} aria-label={title} style={clickableShell(title)}>
      {child}
    </button>
  );

  const victoryTitle = props.victoryKind === "value"
    ? "Victoire : valeur cumulée"
    : props.victoryKind === "conquest"
      ? "Victoire : conquête totale"
      : props.victoryKind === "regions"
        ? "Victoire : régions"
        : props.victoryKind === "time"
          ? "Victoire : temps"
          : "Victoire : territoires";

  return (
    <div
      style={{
        marginTop: props.compact ? 0 : "auto",
        paddingTop: props.compact ? 0 : 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: props.compact ? 5 : 7,
        minHeight: props.compact ? 24 : 28,
        flexWrap: "nowrap",
      }}
    >
      {wrapClickable(props.teamMode ? "Mode équipes" : "Mode solo", props.teamMode ? (
        <svg {...commonSvg}>
          <path d="M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
          <path d="M15.8 10.2a2.6 2.6 0 1 0 0-5.2" />
          <path d="M3.2 20v-1.6c0-3 2.3-5.2 5.3-5.2s5.3 2.2 5.3 5.2V20" />
          <path d="M15 13.5c3.2.2 5.8 2 5.8 4.9V20" />
        </svg>
      ) : (
        <svg {...commonSvg}>
          <circle cx="12" cy="7.5" r="3.4" />
          <path d="M5.3 20v-1.8c0-3.7 2.8-6.3 6.7-6.3s6.7 2.6 6.7 6.3V20" />
        </svg>
      ))}

      {wrapClickable(props.fortressMode ? "Mode forteresses" : "Mode conquête", props.fortressMode ? (
        <svg {...commonSvg}>
          <path d="M4 20V9h4V5h3v4h2V5h3v4h4v11H4Z" />
          <path d="M8 20v-5h8v5M4 12h16" />
        </svg>
      ) : (
        <svg {...commonSvg}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      ))}

      {wrapClickable(props.selectionMode === "by_score" ? "Volée directe" : "Sélection libre", props.selectionMode === "by_score" ? (
        <svg {...commonSvg}><path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z" /></svg>
      ) : (
        <svg {...commonSvg}><path d="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6" /><circle cx="12" cy="12" r="2.5" /></svg>
      ))}

      {wrapClickable(props.captureRule === "gte" ? "Capture GTE" : "Capture exacte", (
        <span style={{ fontSize: 13, lineHeight: 1, fontWeight: 1000 }}>{props.captureRule === "gte" ? "≥" : "="}</span>
      ))}

      {wrapClickable(victoryTitle, props.victoryKind === "value" ? (
        <svg {...commonSvg}><path d="M12 3 4 8l8 5 8-5-8-5Z" /><path d="m4 12 8 5 8-5M4 16l8 5 8-5" /></svg>
      ) : props.victoryKind === "conquest" ? (
        <svg {...commonSvg}><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.2 2.3 3.3 4.9 3.3 8S14.2 17.7 12 20M12 4C9.8 6.3 8.7 8.9 8.7 12S9.8 17.7 12 20" /></svg>
      ) : props.victoryKind === "time" ? (
        <svg {...commonSvg}><circle cx="12" cy="13" r="7" /><path d="M12 10v4l3 2M9 2h6" /></svg>
      ) : (
        <svg {...commonSvg}><path d="M6 21V4" /><path d="M6 5h11l-2.4 3L17 11H6" /></svg>
      ))}

      {props.roundProgress ? (
        <button type="button" onClick={props.onOpenLegend} title="Tour en cours" style={{ ...clickableShell("Tour en cours"), minWidth: 42, width: "auto", padding: "0 7px", fontSize: 10, fontWeight: 950 }}>
          {props.roundProgress}
        </button>
      ) : null}

      {props.timeRemaining ? (
        <div title="Temps restant" style={{ minWidth: 42, height: 24, padding: "0 7px", borderRadius: 8, display: "grid", placeItems: "center", color: props.color, background: "rgba(0,0,0,0.30)", border: `1px solid ${props.color}55`, fontSize: 10, fontWeight: 950 }}>
          {props.timeRemaining}
        </div>
      ) : null}
    </div>
  );
}


function TerritoriesLegendGlyph(props: {
  kind: "solo" | "teams" | "classic" | "fortress" | "free" | "direct" | "exact" | "gte" | "value" | "territories" | "conquest" | "regions" | "time" | "round";
  color: string;
}) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const k = props.kind;
  if (k === "teams") return <svg {...common}><path d="M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="M15.8 10.2a2.6 2.6 0 1 0 0-5.2"/><path d="M3.2 20v-1.6c0-3 2.3-5.2 5.3-5.2s5.3 2.2 5.3 5.2V20"/><path d="M15 13.5c3.2.2 5.8 2 5.8 4.9V20"/></svg>;
  if (k === "solo") return <svg {...common}><circle cx="12" cy="7.5" r="3.4"/><path d="M5.3 20v-1.8c0-3.7 2.8-6.3 6.7-6.3s6.7 2.6 6.7 6.3V20"/></svg>;
  if (k === "fortress") return <svg {...common}><path d="M4 20V9h4V5h3v4h2V5h3v4h4v11H4Z"/><path d="M8 20v-5h8v5M4 12h16"/></svg>;
  if (k === "classic") return <svg {...common}><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>;
  if (k === "direct") return <svg {...common}><path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z"/></svg>;
  if (k === "free") return <svg {...common}><path d="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6"/><circle cx="12" cy="12" r="2.5"/></svg>;
  if (k === "exact" || k === "gte") return <span style={{fontSize:13,fontWeight:1000,lineHeight:1}}>{k === "gte" ? "≥" : "="}</span>;
  if (k === "value") return <svg {...common}><path d="M12 3 4 8l8 5 8-5-8-5Z"/><path d="m4 12 8 5 8-5M4 16l8 5 8-5"/></svg>;
  if (k === "conquest") return <svg {...common}><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.2 2.3 3.3 4.9 3.3 8S14.2 17.7 12 20M12 4C9.8 6.3 8.7 8.9 8.7 12S9.8 17.7 12 20"/></svg>;
  if (k === "time") return <svg {...common}><circle cx="12" cy="13" r="7"/><path d="M12 10v4l3 2M9 2h6"/></svg>;
  if (k === "regions") return <svg {...common}><path d="M4 5h7v6H4zM13 4h7v7h-7zM5 13h6v7H5zM13 13h7v6h-7z"/></svg>;
  if (k === "round") return <svg {...common}><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>;
  return <svg {...common}><path d="M6 21V4"/><path d="M6 5h11l-2.4 3L17 11H6"/></svg>;
}

function TerritoriesConfigLegend(props: {
  open: boolean;
  onClose: () => void;
  color: string;
  teamMode: boolean;
  fortressMode: boolean;
  selectionMode: "free" | "by_score";
  captureRule: "exact" | "gte";
  victoryLabel: string;
  victoryKind: "value" | "territories" | "conquest" | "regions" | "time";
  roundProgress: string;
  bullReplayEnabled: boolean;
  missPassTurn: boolean;
}) {
  if (!props.open) return null;
  const rows: Array<{ kind: React.ComponentProps<typeof TerritoriesLegendGlyph>["kind"]; label: string }> = [
    { kind: props.teamMode ? "teams" : "solo", label: props.teamMode ? "Équipes" : "Solo" },
    { kind: props.fortressMode ? "fortress" : "classic", label: props.fortressMode ? "Forteresses" : "Conquête classique" },
    { kind: props.selectionMode === "by_score" ? "direct" : "free", label: props.selectionMode === "by_score" ? "Volée directe — sans sélection" : "Sélection libre sur la carte" },
    { kind: props.captureRule === "gte" ? "gte" : "exact", label: props.captureRule === "gte" ? "Capture GTE — supérieur ou égal" : "Capture EXACTE" },
    { kind: props.victoryKind, label: props.victoryLabel },
    { kind: "round", label: `Tour ${props.roundProgress}` },
  ];
  return (
    <div
      onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 13050, display: "grid", placeItems: "center", padding: 18, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(5px)" }}
    >
      <div style={{ width: "min(360px, 94vw)", borderRadius: 20, padding: 14, background: "rgba(7,12,21,0.97)", border: `1px solid ${props.color}88`, boxShadow: `0 0 26px ${props.color}44, 0 18px 54px rgba(0,0,0,.72)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 11 }}>
          <div style={{ color: props.color, fontSize: 14, fontWeight: 1000, letterSpacing: .8, textTransform: "uppercase", textShadow: `0 0 10px ${props.color}88` }}>Configuration de la partie</div>
          <button type="button" onClick={props.onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", color: props.color, background: "rgba(0,0,0,.38)", border: `1px solid ${props.color}66`, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "grid", gap: 7 }}>
          {rows.map((row) => (
            <div key={row.label} style={{ minHeight: 38, display: "grid", gridTemplateColumns: "38px minmax(0,1fr)", alignItems: "center", gap: 9, padding: "6px 9px", borderRadius: 12, background: `${props.color}0d`, border: `1px solid ${props.color}2f` }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", color: props.color, background: "rgba(0,0,0,.35)", border: `1px solid ${props.color}55` }}><TerritoriesLegendGlyph kind={row.kind} color={props.color} /></div>
              <div style={{ fontSize: 11.5, lineHeight: 1.25, fontWeight: 900, color: "#fff" }}>{row.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 12, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)", fontSize: 10.5, lineHeight: 1.4, color: "rgba(255,255,255,.78)" }}>
          <strong style={{ color: props.color }}>Règles de lancer :</strong> Bull/DBull rejoue 1× {props.bullReplayEnabled ? "ACTIF" : "OFF"} · Miss passe le tour {props.missPassTurn ? "ACTIF" : "OFF"}. Le bouton VALIDER permet toujours d'arrêter la volée après 1, 2 ou 3 fléchettes.
        </div>
      </div>
    </div>
  );
}

function TerritoryTargetSuggestions(props: {
  suggestions: TerritoryStealSuggestion[];
  currentTotal: number;
  dartsRemaining: number;
  accentColor: string;
  players: TerritoriesPlayer[];
  profileById: Record<string, any>;
  onSelect?: (territoryId: string) => void;
}) {
  const ownerAvatarProfile = (ownerId: string) => {
    const member = props.players.find((player) => String(player.teamId || player.id) === ownerId);
    if (!member) return null;
    return props.profileById[member.id] ?? { id: member.id, name: member.name, avatar: member.avatar };
  };

  // The most valuable reachable enemy territories must always be presented first.
  const visibleBase = [...props.suggestions]
    .sort((a, b) => (
      b.value - a.value
      || Number(b.fortress) - Number(a.fortress)
      || a.needed - b.needed
      || a.territoryName.localeCompare(b.territoryName, undefined, { sensitivity: "base" })
    ));
  const fillCount = visibleBase.length >= 5 && visibleBase.length % 5 !== 0 ? (5 - (visibleBase.length % 5)) : 0;
  const visible = [...visibleBase, ...Array.from({ length: fillCount }, () => null as any)];

  return (
    <div style={{ width: "100%", marginTop: 5, minWidth: 0 }}>
      {visible.length ? (
        <div
          className="dc-scroll-thin"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 4,
            maxHeight: "64px",
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: 2,
            WebkitOverflowScrolling: "touch",
            alignContent: "start",
          }}
        >
          {visible.map((suggestion, index) => {
            if (!suggestion) {
              return <div key={`territory-suggestion-empty-${index}`} aria-hidden style={{ height: 30, borderRadius: 9, opacity: 0 }} />;
            }
            const ownerProfile = ownerAvatarProfile(suggestion.ownerId);
            return (
              <button
                key={suggestion.territoryId}
                type="button"
                onClick={() => props.onSelect?.(suggestion.territoryId)}
                title={`${suggestion.value} · ${suggestion.territoryName} · ${suggestion.ownerName}${suggestion.fortress ? " · Forteresse" : ""}`}
                style={{
                  width: "100%",
                  minWidth: 0,
                  height: 30,
                  borderRadius: 9,
                  border: `1px solid ${suggestion.ownerColor}72`,
                  background: `linear-gradient(180deg, ${suggestion.ownerColor}1f, rgba(2,5,10,0.88))`,
                  color: suggestion.ownerColor,
                  display: "grid",
                  placeItems: "center",
                  cursor: props.onSelect ? "pointer" : "default",
                  boxShadow: `0 0 7px ${suggestion.ownerColor}18, inset 0 0 8px ${suggestion.ownerColor}12`,
                  position: "relative",
                  overflow: "hidden",
                  isolation: "isolate",
                  padding: 1,
                }}
              >
                {ownerProfile ? (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      pointerEvents: "none",
                      opacity: 0.18,
                      zIndex: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        transform: "scale(1.08)",
                        filter: `saturate(1.15) drop-shadow(0 0 8px ${suggestion.ownerColor})`,
                      }}
                    >
                      <ProfileAvatar
                        profile={ownerProfile}
                        size={42}
                        showStars={false}
                        showDartOverlay={false}
                        noFrame
                      />
                    </div>
                  </div>
                ) : null}

                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.40))",
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                />

                {suggestion.fortress ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      zIndex: 2,
                      width: 12,
                      height: 12,
                      borderRadius: 4,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(0,0,0,0.44)",
                      border: `1px solid ${suggestion.ownerColor}66`,
                    }}
                  >
                    <FortressLineIcon size={7} color="#fff" glowColor={suggestion.ownerColor} title="Forteresse à briser" />
                  </div>
                ) : null}

                <strong
                  style={{
                    position: "relative",
                    zIndex: 1,
                    fontSize: 12.5,
                    lineHeight: 1,
                    fontWeight: 1000,
                    letterSpacing: -0.25,
                    color: suggestion.ownerColor,
                    textShadow: `0 0 8px ${suggestion.ownerColor}, 0 1px 5px rgba(0,0,0,0.98)`,
                  }}
                >
                  {suggestion.value}
                </strong>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            minHeight: 22,
            padding: "4px 5px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.18)",
            fontSize: 7.5,
            fontWeight: 900,
            lineHeight: 1.15,
            opacity: 0.52,
            textAlign: "center",
          }}
        >
          Aucune cible atteignable
        </div>
      )}
    </div>
  );
}

function TerritoryOwnerBadge(props: {
  ownerId?: string;
  hasFortress: boolean;
  players: TerritoriesPlayer[];
  profileById: Record<string, any>;
  ownerColor?: string;
  compact?: boolean;
}) {
  const members = props.ownerId
    ? props.players.filter((player) => (player.teamId || player.id) === props.ownerId)
    : [];

  if (!props.ownerId || !members.length) {
    return (
      <span
        style={{
          fontSize: props.compact ? 7.5 : 10,
          fontWeight: 900,
          opacity: 0.5,
          whiteSpace: "nowrap",
          textShadow: "0 1px 4px rgba(0,0,0,0.95)",
        }}
      >
        LIBRE
      </span>
    );
  }

  const color = props.ownerColor || members[0]?.color || "#ffffff";
  const avatarBox = props.compact ? 20 : 32;
  const avatarSize = props.compact ? 18 : 28;
  const overlap = props.compact ? -5 : -8;
  const avatarStack = (
    <div style={{ display: "flex", alignItems: "center", paddingLeft: members.length > 1 ? (props.compact ? 5 : 7) : 0 }}>
      {members.slice(0, 3).map((member, index) => (
        <div
          key={member.id}
          style={{
            width: avatarBox,
            height: avatarBox,
            marginLeft: index === 0 ? 0 : overlap,
            borderRadius: 999,
            overflow: "hidden",
            border: `${props.compact ? 1.5 : 2}px solid ${color}`,
            background: "rgba(2,5,10,0.92)",
            boxShadow: `0 0 8px ${color}88`,
            position: "relative",
            zIndex: members.length - index,
          }}
        >
          <ProfileAvatar
            profile={props.profileById[member.id] ?? { id: member.id, name: member.name }}
            size={avatarSize}
            showStars={false}
            showDartOverlay={false}
            noFrame
          />
        </div>
      ))}
    </div>
  );

  if (props.compact) {
    return (
      <div
        title={members.map((member) => member.name).join(" · ")}
        style={{ minWidth: 24, display: "grid", justifyItems: "center", gap: 0, flex: "0 0 auto" }}
      >
        {avatarStack}
        {props.hasFortress ? (
          <div style={{ marginTop: -1, display: "grid", placeItems: "center" }}>
            <FortressLineIcon size={10} color="#fff" glowColor={color} title="Forteresse active" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      title={members.map((member) => member.name).join(" · ")}
      style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, flex: "0 0 auto" }}
    >
      {props.hasFortress ? (
        <FortressLineIcon size={22} color="#fff" glowColor={color} title="Forteresse active" />
      ) : null}
      {avatarStack}
    </div>
  );
}



type TerritoryShapeGeometry = {
  d: string;
  transform?: string;
  fillRule?: "nonzero" | "evenodd";
  clipRule?: "nonzero" | "evenodd";
};

function getTerritoryShapeGeometry(
  country: TerritoriesCountry,
  territoryId: string,
  svgPathId?: string,
): TerritoryShapeGeometry | null {
  if (typeof DOMParser === "undefined") return null;
  try {
    const raw = getBaseSvgForCountry(country);
    const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
    const paths = Array.from(doc.querySelectorAll("path"));
    const wantedPathId = String(svgPathId || "").trim();
    const wantedTerritoryId = String(territoryId || "").trim();
    const wantedDepartment = wantedTerritoryId.startsWith("FR-")
      ? wantedTerritoryId.slice(3)
      : wantedPathId;

    const path = paths.find((candidate) => {
      if (country === "FR") {
        return String(candidate.getAttribute("data-numerodepartement") || "") === wantedDepartment;
      }
      return String(candidate.getAttribute("id") || "") === wantedPathId
        || String(candidate.getAttribute("id") || "") === wantedTerritoryId;
    });
    const d = path?.getAttribute("d");
    if (!path || !d) return null;

    const normalizeRule = (value: string | null): "nonzero" | "evenodd" | undefined =>
      value === "evenodd" ? "evenodd" : value === "nonzero" ? "nonzero" : undefined;

    return {
      d,
      transform: path.getAttribute("transform") || undefined,
      fillRule: normalizeRule(path.getAttribute("fill-rule")),
      clipRule: normalizeRule(path.getAttribute("clip-rule")),
    };
  } catch {
    return null;
  }
}

function TerritorySilhouetteBadge(props: {
  country: TerritoriesCountry;
  territoryId: string;
  svgPathId?: string;
  territoryValue: number;
  flagSrc?: string | null;
  flagEmoji?: string;
  color: string;
  height?: number;
  showValue?: boolean;
}) {
  const geometry = React.useMemo(
    () => getTerritoryShapeGeometry(props.country, props.territoryId, props.svgPathId),
    [props.country, props.territoryId, props.svgPathId],
  );
  const measureRef = React.useRef<SVGPathElement | null>(null);
  const [bounds, setBounds] = React.useState({ x: 0, y: 0, width: 100, height: 100 });
  const [viewBox, setViewBox] = React.useState("0 0 100 100");
  const [center, setCenter] = React.useState({ x: 50, y: 50, fontSize: 34 });
  const clipId = React.useId().replace(/:/g, "");
  const glowId = `${clipId}-glow`;

  React.useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    try {
      const bbox = node.getBBox();
      if (!Number.isFinite(bbox.width) || !Number.isFinite(bbox.height) || bbox.width <= 0 || bbox.height <= 0) return;
      const pad = Math.max(bbox.width, bbox.height) * 0.11;
      const x = bbox.x - pad;
      const y = bbox.y - pad;
      const width = bbox.width + pad * 2;
      const height = bbox.height + pad * 2;
      setBounds({ x, y, width, height });
      setViewBox(`${x} ${y} ${width} ${height}`);
      setCenter({
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
        fontSize: Math.max(12, Math.min(bbox.width, bbox.height) * 0.34),
      });
    } catch {
      // Keep the resilient fallback viewBox.
    }
  }, [geometry?.d, geometry?.transform]);

  if (!geometry) {
    return (
      <div
        style={{
          width: "100%",
          height: props.height ?? 112,
          display: "grid",
          placeItems: "center",
          borderRadius: 24,
          border: `2px solid ${props.color}`,
          background: `radial-gradient(circle, ${props.color}20, rgba(0,0,0,.48) 70%)`,
          boxShadow: `0 0 20px ${props.color}55`,
          color: "#fff",
          fontSize: 40,
          fontWeight: 1000,
        }}
      >
        {props.showValue === false ? null : props.territoryValue}
      </div>
    );
  }

  const commonPathProps = {
    d: geometry.d,
    transform: geometry.transform,
    fillRule: geometry.fillRule,
    clipRule: geometry.clipRule,
  } as const;

  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={`Territoire, valeur ${props.territoryValue}`}
      style={{ width: "100%", height: props.height ?? 118, display: "block", overflow: "visible" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path {...commonPathProps} />
        </clipPath>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path ref={measureRef} {...commonPathProps} fill="transparent" stroke="transparent" />

      {!props.flagSrc && !props.flagEmoji ? (
        <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill={props.color} clipPath={`url(#${clipId})`} />
      ) : null}
      {props.flagSrc ? (
        <image
          href={props.flagSrc}
          x={bounds.x - bounds.width * 0.06}
          y={bounds.y - bounds.height * 0.06}
          width={bounds.width * 1.12}
          height={bounds.height * 1.12}
          preserveAspectRatio="xMidYMid slice"
          opacity="1"
          clipPath={`url(#${clipId})`}
          style={{ filter: "saturate(1.1) contrast(1.05)" }}
        />
      ) : props.flagEmoji ? (
        <text
          x={center.x}
          y={center.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={center.fontSize * 2.2}
          opacity="0.52"
          clipPath={`url(#${clipId})`}
        >
          {props.flagEmoji}
        </text>
      ) : null}
      <path {...commonPathProps} fill={props.flagSrc || props.flagEmoji ? "rgba(255,255,255,0.02)" : `${props.color}18`} stroke="rgba(255,255,255,.98)" strokeWidth="2.6" vectorEffect="non-scaling-stroke" filter={`url(#${glowId})`} />
      {props.showValue === false ? null : (
        <text
          x={center.x}
          y={center.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={center.fontSize}
          fontWeight="1000"
          fill="#fff"
          stroke="rgba(0,0,0,.84)"
          strokeWidth={Math.max(1.4, center.fontSize * 0.08)}
          paintOrder="stroke fill"
          style={{ filter: `drop-shadow(0 0 7px ${props.color})` }}
        >
          {props.territoryValue}
        </text>
      )}
    </svg>
  );
}

function TerritoriesTurnCarousel(props: {
  players: TerritoriesPlayer[];
  activeId: string;
  profileById: Record<string, any>;
  ownedByOwner: Record<string, number>;
  ownedValueByOwner: Record<string, number>;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const active = itemRefs.current[props.activeId];
    if (!wrap || !active) return;
    const wrapRect = wrap.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const delta = activeRect.left + activeRect.width / 2 - (wrapRect.left + wrapRect.width / 2);
    wrap.scrollBy({ left: delta, behavior: "smooth" });
  }, [props.activeId, props.players.length]);

  return (
    <div style={{ padding: "3px 10px 0" }}>
      <div
        ref={wrapRef}
        className="dc-scroll-thin"
        style={{
          display: "flex",
          gap: 9,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "3px 2px 5px",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x proximity",
        }}
      >
        {props.players.map((player) => {
          const ownerId = player.teamId || player.id;
          const count = Math.max(0, Number(props.ownedByOwner[ownerId] || 0));
          const value = Math.max(0, Number(props.ownedValueByOwner[ownerId] || 0));
          const active = player.id === props.activeId;
          const color = player.color || "#52f7ff";
          const profile = props.profileById[player.id] ?? { id: player.id, name: player.name, avatar: player.avatar };

          return (
            <div
              key={player.id}
              ref={(node) => { itemRefs.current[player.id] = node; }}
              title={`${player.name} · ${value} points de territoires`}
              style={{
                flex: "0 0 auto",
                height: 44,
                minWidth: 132,
                maxWidth: 164,
                display: "grid",
                gridTemplateColumns: "54px minmax(72px, 1fr)",
                alignItems: "stretch",
                overflow: "hidden",
                borderRadius: 999,
                border: `1px solid ${active ? color : `${color}77`}`,
                background: active
                  ? `linear-gradient(180deg, ${color}24, rgba(4,7,13,.94))`
                  : "rgba(0,0,0,.34)",
                boxShadow: active ? `0 0 0 1px ${color}55, 0 0 20px ${color}66` : "none",
                scrollSnapAlign: "center",
              }}
            >
              <div style={{ position: "relative", width: 54, height: 44, overflow: "hidden", background: `${color}18` }}>
                <div
                  style={{
                    position: "absolute",
                    left: -7,
                    top: -13,
                    width: 68,
                    height: 68,
                    transform: "scale(1.22)",
                    transformOrigin: "center",
                  }}
                >
                  <ProfileAvatar
                    profile={profile}
                    size={68}
                    showStars={false}
                    showDartOverlay={false}
                    noFrame
                  />
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(90deg, transparent 58%, rgba(3,6,12,.82) 100%)",
                    pointerEvents: "none",
                  }}
                />
              </div>

              <div
                style={{
                  minWidth: 0,
                  padding: "5px 9px 4px 6px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 5,
                  lineHeight: 1,
                }}
              >
                <div
                  title={`${count} territoires possédés`}
                  style={{
                    flex: "0 0 auto",
                    minWidth: 27,
                    height: 24,
                    padding: "0 6px",
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 1000,
                    color,
                    background: `${color}18`,
                    border: `1px solid ${color}66`,
                    boxShadow: `inset 0 0 8px ${color}12`,
                  }}
                >
                  {count}
                </div>
                <div
                  title={`${value} points de territoires`}
                  style={{
                    minWidth: 0,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: 17,
                    fontWeight: 1000,
                    color,
                    textShadow: active ? `0 0 10px ${color}` : "none",
                  }}
                >
                  {value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type TerritoryCaptureToastData = {
  id: number;
  country: TerritoriesCountry;
  territoryId: string;
  svgPathId?: string;
  territoryName: string;
  territoryValue: number;
  capturerName: string;
  capturerPlayerId: string;
  previousOwnerName?: string;
  previousOwnerPlayerId?: string;
  stolen: boolean;
  color: string;
  previousOwnerColor?: string;
  flagSrc?: string | null;
  flagEmoji?: string;
};

function TerritoryCaptureToast(props: {
  data: TerritoryCaptureToastData | null;
  profileById: Record<string, any>;
}) {
  const data = props.data;
  if (!data) return null;

  const rightPlayerId = data.stolen && data.previousOwnerPlayerId
    ? data.previousOwnerPlayerId
    : data.capturerPlayerId;
  const rightPlayerName = data.stolen && data.previousOwnerName
    ? data.previousOwnerName
    : data.capturerName;
  const rightColor = data.stolen
    ? data.previousOwnerColor || "#fff"
    : data.color;
  const rightProfile = props.profileById[rightPlayerId] ?? {
    id: rightPlayerId,
    name: rightPlayerName,
  };

  return (
    <div
      key={data.id}
      aria-live="assertive"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        pointerEvents: "none",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "clamp(96px, 15vh, 150px) 12px 14px",
      }}
    >
      <style>{`
        @keyframes territoriesCaptureToast {
          0% { opacity: 0; transform: translateY(-18px) scale(.88); }
          9% { opacity: 1; transform: translateY(0) scale(1.02); }
          15%, 78% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-8px) scale(.96); }
        }
        @keyframes territoriesCapturedAvatarPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.055); }
        }
      `}</style>
      <div
        style={{
          position: "relative",
          width: "min(540px, calc(100vw - 24px))",
          minHeight: 192,
          overflow: "hidden",
          borderRadius: 24,
          border: `2px solid ${data.color}`,
          background: "rgba(7,10,18,.97)",
          boxShadow: `0 0 24px ${data.color}88, 0 18px 52px rgba(0,0,0,.76)`,
          animation: "territoriesCaptureToast 3.25s ease both",
          isolation: "isolate",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(circle at 28% 48%, ${data.color}35, transparent 42%),
              linear-gradient(90deg, rgba(5,8,15,.98) 0%, rgba(5,8,15,.94) 64%, rgba(5,8,15,.78) 100%)
            `,
            zIndex: -2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${data.color}, transparent)`,
            boxShadow: `0 0 14px ${data.color}`,
          }}
        />

        <div
          style={{
            minHeight: 192,
            padding: "14px 15px 15px",
            display: "grid",
            gridTemplateRows: "auto 1fr",
            gap: 8,
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              lineHeight: 1,
              fontWeight: 1000,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: data.stolen ? "#ffcf58" : data.color,
              textShadow: `0 0 10px ${data.stolen ? "#ffcf58" : data.color}`,
            }}
          >
            {data.stolen ? "Vol de territoire" : "Territoire conquis"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 104px",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
            }}
          >
            <div style={{ minWidth: 0, display: "grid", alignContent: "center" }}>
              <TerritorySilhouetteBadge
                country={data.country}
                territoryId={data.territoryId}
                svgPathId={data.svgPathId}
                territoryValue={data.territoryValue}
                flagSrc={data.flagSrc}
                flagEmoji={data.flagEmoji}
                color={data.color}
                showValue={false}
              />
              <div
                style={{
                  marginTop: 1,
                  padding: "0 4px",
                  textAlign: "center",
                  fontSize: "clamp(17px, 4.6vw, 24px)",
                  lineHeight: 1.05,
                  fontWeight: 1000,
                  color: "#fff",
                  textShadow: "0 2px 10px rgba(0,0,0,.95)",
                  overflowWrap: "anywhere",
                }}
              >
                {data.territoryName}
              </div>
              <div
                style={{
                  marginTop: 5,
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 900,
                  color: data.color,
                }}
              >
                {data.capturerName}
              </div>
            </div>

            <div
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                paddingLeft: 10,
                borderLeft: "1px solid rgba(255,255,255,.11)",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  lineHeight: 1,
                  fontWeight: 1000,
                  letterSpacing: 0.9,
                  color: data.stolen ? "rgba(255,255,255,.64)" : data.color,
                  textAlign: "center",
                }}
              >
                {data.stolen ? "DESTITUÉ" : "CONQUÉRANT"}
              </div>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "transparent",
                  boxShadow: `0 0 0 1px ${rightColor}66, 0 0 16px ${rightColor}99, 0 0 30px ${rightColor}55`,
                  animation: "territoriesCapturedAvatarPulse 1.1s ease-in-out 2",
                }}
              >
                <ProfileAvatar
                  profile={rightProfile}
                  size={76}
                  ringColor={rightColor}
                  textColor="#fff"
                  showStars={false}
                  showDartOverlay={false}
                  noFrame
                />
              </div>
              <div
                style={{
                  maxWidth: 96,
                  textAlign: "center",
                  fontSize: 11,
                  lineHeight: 1.05,
                  fontWeight: 950,
                  color: rightColor,
                  overflowWrap: "anywhere",
                }}
              >
                {rightPlayerName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function captureAnnouncementPhrases(
  lang: string,
  playerName: string,
  territoryName: string,
  stolen: boolean,
  previousOwnerName?: string,
): string[] {
  const formerOwner = previousOwnerName || (lang === "fr" ? "l'adversaire" : "the opponent");

  if (lang === "fr") {
    return stolen
      ? [
          `${playerName} arrache ${territoryName} à ${formerOwner} !`,
          `${territoryName} change de camp. ${formerOwner} est destitué par ${playerName} !`,
          `Coup stratégique ! ${playerName} prend ${territoryName} à ${formerOwner}.`,
          `${playerName} renverse ${formerOwner} et s'empare de ${territoryName}.`,
          `Territoire volé ! ${territoryName} passe de ${formerOwner} à ${playerName}.`,
        ]
      : [
          `${playerName} conquiert ${territoryName} !`,
          `Nouvelle conquête pour ${playerName} : ${territoryName}.`,
          `${territoryName} tombe aux mains de ${playerName}.`,
          `${playerName} prend le contrôle de ${territoryName}.`,
          `Territoire sécurisé ! ${playerName} s'empare de ${territoryName}.`,
        ];
  }

  return stolen
    ? [
        `${playerName} steals ${territoryName} from ${formerOwner}!`,
        `${territoryName} changes sides. ${formerOwner} is displaced by ${playerName}!`,
        `${playerName} takes ${territoryName} from ${formerOwner}.`,
      ]
    : [
        `${playerName} conquers ${territoryName}!`,
        `New territory for ${playerName}: ${territoryName}.`,
        `${territoryName} is now controlled by ${playerName}.`,
      ];
}

const RULES_TEXT = (cfg: {
  gameMode: "classic" | "fortress";
  fortressVictoryMode: "majority" | "value" | "conquest";
  selectionMode: "free" | "by_score";
  captureRule: "exact" | "gte";
  victoryMode: "territories" | "regions" | "time";
  winTerritories: number;
  winRegions: number;
  timeLimitMin: number;
  maxRounds: number;
  maxFortressesPerOwner: number;
  valueDifficultyLabel: string;
  valueTargetMin: number;
  valueTargetMax: number;
  themeColor: string;
  bullReplayEnabled: boolean;
  missPassTurn: boolean;
}) => {
  const {
    gameMode,
    fortressVictoryMode,
    selectionMode,
    captureRule,
    victoryMode,
    winTerritories,
    winRegions,
    timeLimitMin,
    maxRounds,
    maxFortressesPerOwner,
    valueDifficultyLabel,
    valueTargetMin,
    valueTargetMax,
    themeColor,
    bullReplayEnabled,
    missPassTurn,
  } = cfg;

  const section = (title: string, lines: string[]) => (
    <div style={{ display: "grid", gap: 7, padding: "10px 12px", borderRadius: 14, background: `${themeColor}10`, border: `1px solid ${themeColor}33`, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.02), 0 0 18px ${themeColor}10` }}>
      <div style={{ color: themeColor, fontWeight: 1000, letterSpacing: 0.7, textTransform: "uppercase", fontSize: 13, textDecoration: "underline" }}>{title}</div>
      <div style={{ display: "grid", gap: 6, fontSize: 13, lineHeight: 1.38 }}>
        {lines.map((line, index) => (
          <div key={`${title}-${index}`} style={{ display: "grid", gridTemplateColumns: "10px minmax(0, 1fr)", gap: 8, alignItems: "start" }}>
            <span style={{ color: themeColor, fontWeight: 1000 }}>•</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const commonValues = [
    "Les valeurs suivent la surface réelle de la carte : les plus grands territoires ont les valeurs les plus élevées.",
    `Chaque territoire jouable possède une valeur unique. Difficulté ${valueDifficultyLabel} · plage ${valueTargetMin} à ${valueTargetMax}.`,
    "Au-delà de 180 territoires, la partie garde 180 cibles jouables et grise les autres.",
  ];

  if (gameMode === "fortress") {
    return (
      <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.4 }}>
        <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: `1px solid ${themeColor}33` }}>
          <div style={{ color: themeColor, fontWeight: 1000, fontSize: 14, letterSpacing: 0.8, textTransform: "uppercase" }}>Forteresses</div>
          <div style={{ marginTop: 6, opacity: 0.92 }}>Construis, protège et conquiers : le contrôle de la carte passe par la défense de tes meilleurs territoires.</div>
        </div>
        {section("Départ", [
          "Chaque joueur ou équipe reçoit exactement le même nombre de territoires. Si la carte ne se divise pas parfaitement, le surplus reste neutre.",
          "Chaque camp possède sa propre couleur sur la carte et dans les KPI.",
        ])}
        {section("Valeurs des territoires", commonValues)}
        {section("Défendre", [
          "Choisis l’un de tes territoires et réalise EXACTEMENT sa valeur.",
          `Le territoire devient une forteresse. Chaque camp peut en maintenir jusqu’à ${maxFortressesPerOwner} simultanément.`,
          "Si cette limite est atteinte, la nouvelle forteresse remplace automatiquement la plus ancienne.",
        ])}
        {section("Attaquer", [
          "Un territoire adverse sans forteresse est conquis par une réussite exacte.",
          "Un territoire protégé nécessite d’abord une réussite exacte pour briser la forteresse, puis une seconde réussite exacte pour le conquérir.",
        ])}
        {section("Cible", [selectionMode === "free" ? "Choix libre sur la carte avant la volée." : "Volée directe : aucune sélection obligatoire, le total de la volée désigne automatiquement le territoire correspondant."])}
        {section("Lancer", [
          "Tu peux appuyer sur VALIDER après 1, 2 ou 3 fléchettes : tu n’es jamais obligé de lancer les trois.",
          bullReplayEnabled ? "Bull / Double Bull : donne une volée supplémentaire au même joueur, une seule fois." : "Bonus Bull / Double Bull : désactivé.",
          missPassTurn ? "MISS (0) : termine immédiatement le tour et passe au joueur suivant." : "MISS (0) : compte simplement comme une fléchette à zéro.",
        ])}
        {section("Victoire", [
          fortressVictoryMode === "conquest"
            ? "Conquête totale : posséder toute la carte."
            : fortressVictoryMode === "value"
              ? `Majorité en valeur : après ${maxRounds} rounds, le total cumulé le plus élevé gagne.`
              : `Majorité en nombre : après ${maxRounds} rounds, le plus grand nombre de territoires gagne.`,
        ])}
      </div>
    );
  }

  const cap = captureRule === "gte" ? "Capture GTE : total supérieur ou égal à la valeur." : "Capture EXACT : total strictement égal à la valeur.";
  return (
    <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.4 }}>
      <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: `1px solid ${themeColor}33` }}>
        <div style={{ color: themeColor, fontWeight: 1000, fontSize: 14, letterSpacing: 0.8, textTransform: "uppercase" }}>Conquête classique</div>
        <div style={{ marginTop: 6, opacity: 0.92 }}>Capture les territoires neutres et vole les territoires adverses pour prendre l’ascendant sur la carte.</div>
      </div>
      {section("But", ["Capturer un maximum de territoires neutres ou adverses."])}
      {section("Valeurs des territoires", commonValues)}
      {section("Cible", [selectionMode === "free" ? "Choisis précisément la cible sur la carte avant la volée." : "Volée directe : joue immédiatement, le total de la volée désigne automatiquement le territoire correspondant."])}
      {section("Capture", ["" + cap, "Une volée contient de 1 à 3 fléchettes."])}
      {section("Lancer", [
        "Tu peux appuyer sur VALIDER après 1, 2 ou 3 fléchettes : tu n’es jamais obligé de lancer les trois.",
        bullReplayEnabled ? "Bull / Double Bull : donne une volée supplémentaire au même joueur, une seule fois." : "Bonus Bull / Double Bull : désactivé.",
        missPassTurn ? "MISS (0) : termine immédiatement le tour et passe au joueur suivant." : "MISS (0) : compte simplement comme une fléchette à zéro.",
      ])}
      {section("Victoire", [
        victoryMode === "territories"
          ? `Atteindre ${winTerritories} territoires.`
          : victoryMode === "regions"
            ? `Compléter ${winRegions} régions.`
            : `Après ${timeLimitMin} minutes, le joueur qui possède le plus de territoires gagne.`,
        `Si l’objectif n’est pas atteint avant ${maxRounds} rounds, le plus de possessions l’emporte.`,
      ])}
    </div>
  );
};

export default function DepartementsPlay(props: any) {
  useFullscreenPlay();
  const { theme } = useTheme();
  const { lang } = useLang();

  // Map is heavy vertically on mobile -> open it in a dedicated modal via a compact card.
  const [showMapModal, setShowMapModal] = React.useState(false);
  const [showTerritoryListModal, setShowTerritoryListModal] = React.useState(false);
  const [valuesSortMode, setValuesSortMode] = React.useState<"value" | "owner">("value");
  const [valuesOwnerFilter, setValuesOwnerFilter] = React.useState<string>("all");

  // Profiles store (names + avatars)
  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;
  const storeProfiles: any[] = ((store as any)?.profiles || []) as any[];
  const profileById = React.useMemo(() => {
    const out: Record<string, any> = {};
    for (const p of storeProfiles) {
      if (!p?.id) continue;
      out[String(p.id)] = p;
    }
    return out;
  }, [storeProfiles]);

  const cfg:
    | TerritoriesConfigPayload
    | null =
    (props?.params?.config as TerritoriesConfigPayload) ||
    (props?.config as TerritoriesConfigPayload) ||
    safeParse<TerritoriesConfigPayload>(localStorage.getItem("dc_modecfg_departements"));

  const effectiveCfg: TerritoriesConfigPayload = cfg || {
    players: 2,
    teamSize: 1,
    selectedIds: ["Player A", "Player B"],
    botsEnabled: false,
    botLevel: "normal",
    rounds: 12,
    objective: 10,
    mapId: "FR",
    gameMode: "classic",
    fortressVictoryMode: "majority",
    maxFortressesPerOwner: 2,
    targetSelectionMode: "free",
    captureRule: "exact",
    victoryMode: "territories",
    winTerritories: 10,
    winRegions: 3,
    timeLimitMin: 20,
    bullReplayEnabled: false,
    missPassTurn: false,
  };

  const visualProfileById = React.useMemo(() => {
    const out: Record<string, any> = { ...profileById };
    for (const [id, meta] of Object.entries(effectiveCfg.participantProfiles || {})) {
      if (out[id]) continue;
      out[id] = {
        id,
        name: meta?.name || id,
        avatarDataUrl: meta?.avatarDataUrl || null,
        avatar: meta?.avatarDataUrl || null,
        isBot: meta?.isBot === true,
        botLevel: meta?.botLevel || null,
      };
    }
    return out;
  }, [profileById, JSON.stringify(effectiveCfg.participantProfiles)]);

  const mapId = String(effectiveCfg.mapId || "FR");
  const country = normalizeMapIdToCountry(mapId);
  const mapDisplayName = String(
    (TERRITORY_MAP_REGISTRY as Record<string, { name?: string }>)[mapId.toUpperCase()]?.name
      || (TERRITORY_MAP_REGISTRY as Record<string, { name?: string }>)[country]?.name
      || country,
  );

  const maxRounds = Math.max(1, Number(effectiveCfg.rounds || 12));
  const gameMode: "classic" | "fortress" = effectiveCfg.gameMode === "fortress" ? "fortress" : "classic";
  const fortressVictoryMode: "majority" | "value" | "conquest" =
    effectiveCfg.fortressVictoryMode === "conquest"
      ? "conquest"
      : effectiveCfg.fortressVictoryMode === "value"
        ? "value"
        : "majority";
  const maxFortressesPerOwner = Math.max(
    1,
    Math.min(10, Math.floor(Number(effectiveCfg.maxFortressesPerOwner ?? 2) || 2)),
  );

  const selectionMode: "free" | "by_score" =
    effectiveCfg.targetSelectionMode === "by_score" ? "by_score" : "free";
  const captureRule: "exact" | "gte" = gameMode === "fortress" ? "exact" : effectiveCfg.captureRule === "gte" ? "gte" : "exact";

  // Regions only for FR (hard gate)
  const requestedVictoryMode =
    effectiveCfg.victoryMode === "regions"
      ? "regions"
      : effectiveCfg.victoryMode === "time"
        ? "time"
        : "territories";
  const victoryMode: "territories" | "regions" | "time" =
    country === "FR" ? requestedVictoryMode : requestedVictoryMode === "regions" ? "territories" : requestedVictoryMode;

  const winTerritories = Math.max(
    1,
    Number(effectiveCfg.winTerritories || (effectiveCfg as any).objectiveTerritories || effectiveCfg.objective || 10),
  );
  const winRegions = Math.max(1, Number(effectiveCfg.winRegions || (effectiveCfg as any).objectiveRegions || 3));
  const timeLimitMin = Math.max(1, Number(effectiveCfg.timeLimitMin || 20));
  const bullReplayEnabled = effectiveCfg.bullReplayEnabled === true;
  const missPassTurn = effectiveCfg.missPassTurn === true;
  const victoryConfigKind: "value" | "territories" | "conquest" | "regions" | "time" = gameMode === "fortress"
    ? fortressVictoryMode === "value" ? "value" : fortressVictoryMode === "conquest" ? "conquest" : "territories"
    : victoryMode === "regions" ? "regions" : victoryMode === "time" ? "time" : "territories";
  const victoryConfigLabel = gameMode === "fortress"
    ? fortressVictoryMode === "value" ? "Victoire : valeur cumulée" : fortressVictoryMode === "conquest" ? "Victoire : conquête totale" : "Victoire : majorité de territoires"
    : victoryMode === "regions" ? "Victoire : objectif régions" : victoryMode === "time" ? "Victoire : majorité au temps" : "Victoire : objectif territoires";

  const territoryValueCalibration = React.useMemo(() => {
    const savedAverage = Number(effectiveCfg.valueSkillAverage3);
    if (Number.isFinite(savedAverage) && savedAverage > 0) {
      return buildTerritoryValueCalibrationFromAverage(savedAverage);
    }

    const selectedProfiles = (effectiveCfg.selectedIds || []).map((id) => {
      const stored = profileById[String(id)];
      if (stored) return stored;
      return {
        id,
        isBot: true,
        botLevel: effectiveCfg.botLevel || "normal",
      };
    });
    return buildTerritoryValueCalibration(selectedProfiles, effectiveCfg.botLevel || "normal");
  }, [effectiveCfg.valueSkillAverage3, effectiveCfg.botLevel, JSON.stringify(effectiveCfg.selectedIds), profileById]);

  const tickerSrc = findTerritoriesTicker(mapId) || findTerritoriesTicker(country) || undefined;
  const flagSrc = React.useMemo(() => findFlagByCountry(country), [country]);

  // Players/teams + owner colors
  const { players, teams, ownerColors } = React.useMemo(() => {
    const selected = Array.isArray(effectiveCfg.selectedIds) && effectiveCfg.selectedIds.length
      ? effectiveCfg.selectedIds.slice(0, 10)
      : ["Player A", "Player B"];

    if (effectiveCfg.teamSize > 1 && selected.length) {
      const teamsById = effectiveCfg.teamsById || {};
      const configuredCount = Math.max(
        2,
        Math.min(4, Number(effectiveCfg.teamCount || (Math.max(...selected.map((id) => Number(teamsById[id] ?? 0))) + 1) || 2)),
      );
      const groups = Array.from({ length: configuredCount }, (_, teamIndex) =>
        selected.filter((id) => Number(teamsById[id]) === teamIndex),
      );
      const order = interleaveTeams(groups);
      const builtTeams: TerritoriesTeam[] = groups.map((_, teamIndex) => ({
        id: `TEAM${teamIndex}`,
        name: `TEAM ${OWNER_NAMES[teamIndex] || teamIndex + 1}`,
        color: OWNER_COLORS[teamIndex % OWNER_COLORS.length] || "#52f7ff",
      }));

      const ps: TerritoriesPlayer[] = order.map((id) => {
        const teamIndex = Math.max(0, Math.min(configuredCount - 1, Number(teamsById[id] ?? 0)));
        const team = builtTeams[teamIndex] || builtTeams[0]!;
        return {
          id,
          name: profileById[id]?.name || profileById[id]?.displayName || effectiveCfg.participantProfiles?.[id]?.name || shortName(id),
          avatar: profileById[id]?.avatarDataUrl || profileById[id]?.avatar || effectiveCfg.participantProfiles?.[id]?.avatarDataUrl || undefined,
          color: team.color,
          teamId: team.id,
          capturedTerritories: [],
        };
      });

      const colors: Record<string, string> = {};
      builtTeams.forEach((team) => { colors[team.id] = team.color; });
      return { players: ps, teams: builtTeams, ownerColors: colors };
    }

    const ps: TerritoriesPlayer[] = selected.map((id, i) => ({
      id,
      name: profileById[id]?.name || profileById[id]?.displayName || effectiveCfg.participantProfiles?.[id]?.name || shortName(id),
      avatar: profileById[id]?.avatarDataUrl || profileById[id]?.avatar || effectiveCfg.participantProfiles?.[id]?.avatarDataUrl || undefined,
      color: OWNER_COLORS[i % OWNER_COLORS.length] || "#52f7ff",
      capturedTerritories: [],
    }));

    const colors: Record<string, string> = {};
    for (const p of ps) colors[p.id] = p.color;
    return { players: ps, teams: undefined as TerritoriesTeam[] | undefined, ownerColors: colors };
  }, [effectiveCfg.teamSize, effectiveCfg.teamCount, JSON.stringify(effectiveCfg.selectedIds), JSON.stringify(effectiveCfg.teamsById), JSON.stringify(effectiveCfg.participantProfiles), profileById]);

  const victoryCondition: TerritoriesVictoryCondition = React.useMemo(() => {
    if (gameMode === "fortress") {
      return fortressVictoryMode === "conquest"
        ? { type: "conquest" }
        : fortressVictoryMode === "value"
          ? { type: "rounds_value" }
          : { type: "rounds" };
    }
    if (victoryMode === "regions") return { type: "regions", value: winRegions };
    if (victoryMode === "time") return { type: "time", minutes: timeLimitMin };
    return { type: "territories", value: winTerritories };
  }, [gameMode, fortressVictoryMode, victoryMode, winTerritories, winRegions, timeLimitMin]);

  const initialState = React.useMemo<TerritoriesGameState>(() => {
    const rawMap = buildTerritoriesMap(country);
    const map = applyBalancedTerritoryValues(
      rawMap,
      country,
      territoryValueCalibration,
    );
    const base: TerritoriesGameState = {
      meta: {
        startedAtMs: Date.now(),
      },
      config: {
        country,
        gameMode,
        initialDistribution: gameMode === "fortress" ? "equal" : "neutral",
        maxFortressesPerOwner,
        targetSelectionMode: selectionMode,
        captureRule,
        multiCapture: false,
        minTerritoryValue: 1,
        allowEnemyCapture: true,
        maxRounds,
        victoryCondition,
        voiceAnnouncements: false,
        bullReplayEnabled,
        missPassTurn,
        valueSkillAverage3: territoryValueCalibration.referenceAvg3,
        valueTargetMin: map.assignedValueMin ?? territoryValueCalibration.minTarget,
        valueTargetMax: map.assignedValueMax ?? territoryValueCalibration.maxTarget,
        valueDifficultyLabel: territoryValueCalibration.label,
      },
      players,
      teams,
      map,
      turnIndex: 0,
      roundIndex: 1,
      turn: {
        activePlayerId: players[0]?.id || "P1",
        selectedTerritoryId: undefined,
        dartsThrown: 0,
        capturedThisTurn: [],
      },
      status: "playing",
    };

    // La distribution initiale s'effectue APRES l'attribution des valeurs
    // uniques et ignore donc automatiquement les territoires gris/non jouables.
    const distributed = gameMode === "fortress" ? initializeEqualTerritoryOwnership(base) : base;
    return normalizeTerritoriesState(distributed).state;
  }, [country, gameMode, selectionMode, captureRule, maxRounds, maxFortressesPerOwner, victoryCondition, players, teams, territoryValueCalibration, bullReplayEnabled, missPassTurn]);

  const [game, setGame] = React.useState<TerritoriesGameState>(initialState);
  const [captureToast, setCaptureToast] = React.useState<TerritoryCaptureToastData | null>(null);
  const captureToastTimerRef = React.useRef<number | null>(null);
  const submitLockRef = React.useRef(false);
  const backNavigationLockedRef = React.useRef(false);
  const lastCaptureVoiceIndexRef = React.useRef(-1);
  const bullReplayOwnerRef = React.useRef<string | null>(null);
  const botActingRef = React.useRef(false);
  const victorySoundPlayedRef = React.useRef(false);
  const [showConfigLegend, setShowConfigLegend] = React.useState(false);

  // Score input state
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [territoriesVisitLog, setTerritoriesVisitLog] = React.useState<any[]>([]);

  const [playerStats, setPlayerStats] = React.useState<Record<string, PlayerLiveStats>>(() => {
    const out: Record<string, PlayerLiveStats> = {};
    for (const p of players) out[p.id] = { ...EMPTY_PLAYER_LIVE_STATS };
    return out;
  });

  React.useLayoutEffect(() => {
    setGame(initialState);
    setCurrentThrow([]);
    setMultiplier(1);
    setCaptureToast(null);
    bullReplayOwnerRef.current = null;
    botActingRef.current = false;
    victorySoundPlayedRef.current = false;
    if (captureToastTimerRef.current != null) {
      window.clearTimeout(captureToastTimerRef.current);
      captureToastTimerRef.current = null;
    }
    const out: Record<string, PlayerLiveStats> = {};
    for (const p of players) out[p.id] = { ...EMPTY_PLAYER_LIVE_STATS };
    setPlayerStats(out);
  }, [initialState, players]);

  React.useEffect(() => () => {
    if (captureToastTimerRef.current != null) window.clearTimeout(captureToastTimerRef.current);
  }, []);

  const activePlayer = React.useMemo(
    () => game.players.find((p) => p.id === game.turn.activePlayerId),
    [game.players, game.turn.activePlayerId],
  );
  const knownBotIds = React.useMemo(() => {
    const ids = new Set<string>();
    try { for (const bot of loadBotPlayers()) if (bot?.id) ids.add(String(bot.id)); } catch {}
    for (const id of effectiveCfg.selectedIds || []) {
      const value = String(id || "");
      if (effectiveCfg.participantProfiles?.[value]?.isBot || /^pro_/i.test(value) || /^bot[_:-]/i.test(value) || /^cpu[_:-]/i.test(value)) ids.add(value);
    }
    return ids;
  }, [JSON.stringify(effectiveCfg.selectedIds)]);
  const activeIsBot = knownBotIds.has(String(game.turn.activePlayerId));
  const themeColor = theme?.primary || "#F6C256";
  const activeColor = activePlayer?.color || themeColor;
  const activeOwnerId = activePlayer?.teamId || activePlayer?.id || "";
  const activeOwnerLabel = teams?.find((team) => team.id === activeOwnerId)?.name || activePlayer?.name || "Player";

  const ownedByOwner = React.useMemo(() => countOwnedByOwnerId(game), [game]);
  const ownedValueByOwner = React.useMemo(() => sumOwnedValueByOwnerId(game), [game]);
  const playableTerritoryCount = React.useMemo(
    () => game.map.playableTerritoryCount
      ?? game.map.territories.filter((territory) => territory.playable !== false).length,
    [game.map.playableTerritoryCount, game.map.territories],
  );
  const disabledTerritoryCount = React.useMemo(
    () => game.map.disabledTerritoryCount
      ?? game.map.territories.filter((territory) => territory.playable === false).length,
    [game.map.disabledTerritoryCount, game.map.territories],
  );
  const assignedValueMin = game.map.assignedValueMin ?? territoryValueCalibration.minTarget;
  const assignedValueMax = game.map.assignedValueMax ?? territoryValueCalibration.maxTarget;

  const currentVisitTotal = React.useMemo(
    () => currentThrow.reduce((total, dart) => total + dartScore(dart), 0),
    [currentThrow],
  );
  const dartsRemaining = Math.max(0, 3 - currentThrow.length);

  const territoryStealSuggestions = React.useMemo<TerritoryStealSuggestion[]>(() => {
    if (game.status !== "playing" || !activeOwnerId) return [];
    if (gameMode !== "fortress" && game.config.allowEnemyCapture === false) return [];

    const ownerNameById: Record<string, string> = {};
    for (const team of game.teams || []) ownerNameById[String(team.id)] = String(team.name || team.id);
    for (const player of game.players) {
      const ownerId = String(player.teamId || player.id);
      if (!ownerNameById[ownerId]) ownerNameById[ownerId] = String(player.name || ownerId);
    }

    return game.map.territories
      .filter((territory) => (
        territory.playable !== false
        && Boolean(territory.ownerId)
        && String(territory.ownerId) !== String(activeOwnerId)
        && canStillReachTerritoryValue(
          currentVisitTotal,
          Number(territory.value) || 0,
          dartsRemaining,
        )
      ))
      .map((territory) => {
        const ownerId = String(territory.ownerId || "");
        const countryCode = country === "UN" || country === "FR"
          ? null
          : getTerritoryCountryCode(country, territory.id);
        const territoryName = country === "UN"
          ? (UN_REGION_NAMES_FR[String(territory.id)] || String(territory.name || territory.id))
          : country === "FR"
            ? String(territory.name || territory.id)
            : getLocalizedTerritoryName(
                countryCode,
                lang,
                String(territory.name || territory.id),
              );
        const value = Number(territory.value) || 0;
        return {
          territoryId: String(territory.id),
          territoryName,
          value,
          needed: Math.max(0, value - currentVisitTotal),
          ownerId,
          ownerName: ownerNameById[ownerId] || ownerId,
          ownerColor: ownerColors[ownerId] || "#ffffff",
          fortress: Boolean(
            gameMode === "fortress"
            && territory.fortressOwnerId
            && territory.fortressOwnerId === territory.ownerId
          ),
        };
      })
      .sort((a, b) => (
        b.value - a.value
        || Number(b.fortress) - Number(a.fortress)
        || a.needed - b.needed
        || a.territoryName.localeCompare(b.territoryName, lang === "fr" ? "fr" : undefined, { sensitivity: "base" })
      ));
  }, [
    activeOwnerId,
    country,
    currentVisitTotal,
    dartsRemaining,
    game.config.allowEnemyCapture,
    game.map.territories,
    game.players,
    game.status,
    game.teams,
    gameMode,
    lang,
    ownerColors,
  ]);

  const selectedTerritory = React.useMemo(() => {
    const id = game.turn.selectedTerritoryId;
    if (!id) return null;
    return game.map.territories.find((x) => x.id === id) || null;
  }, [game.turn.selectedTerritoryId, game.map.territories]);

  const objectiveValueLabel = selectedTerritory ? String(selectedTerritory.value) : "—";

  // Live territory preview: after every entered dart, display the territory whose
  // unique value exactly matches the current visit total. This is only a visual
  // preview and never silently changes the selected objective.
  const liveScoreTerritory = React.useMemo(() => {
    if (!currentThrow.length) return null;
    return game.map.territories.find((territory) => (
      territory.playable !== false
      && Number(territory.value) === currentVisitTotal
    )) || null;
  }, [currentThrow.length, currentVisitTotal, game.map.territories]);

  const displayedTerritory = currentThrow.length > 0 ? liveScoreTerritory : selectedTerritory;
  const displayedTerritoryCountryCode =
    country === "UN" || country === "FR"
      ? null
      : getTerritoryCountryCode(country, displayedTerritory?.id);
  const displayedTerritoryName = displayedTerritory
    ? country === "UN"
      ? (UN_REGION_NAMES_FR[String(displayedTerritory.id)] || String(displayedTerritory.name || displayedTerritory.id))
      : country === "FR"
        ? String(displayedTerritory.name || displayedTerritory.id)
        : getLocalizedTerritoryName(
            displayedTerritoryCountryCode,
            lang,
            String(displayedTerritory.name || displayedTerritory.id),
          )
    : currentThrow.length > 0
      ? "Aucun territoire"
      : "—";
  const displayedTerritoryHasFortress = Boolean(
    displayedTerritory?.ownerId
    && displayedTerritory.fortressOwnerId === displayedTerritory.ownerId,
  );
  const displayedTerritoryOwnerColor = displayedTerritory?.ownerId
    ? ownerColors[displayedTerritory.ownerId]
    : undefined;
  const territoryNameLabel = displayedTerritoryName;
  const territoryFlagSrc =
    country === "UN"
      ? findUnRegionFlag(displayedTerritory?.id)
      : country === "FR"
        ? getFrenchDepartmentFlagUrl(displayedTerritory?.id)
        : findTerritoryFlagByCountry(displayedTerritoryCountryCode);
  // Les régions UN et les départements français utilisent leur visuel dédié.
  // Les emojis restent uniquement le secours des territoires ISO classiques.
  const territoryFlagEmoji =
    country === "UN"
      ? undefined
      : country === "FR"
        ? "🇫🇷"
        : isoCodeToFlagEmoji(displayedTerritoryCountryCode);

  const isFrRegionsVictory = gameMode === "classic" && country === "FR" && victoryMode === "regions";

  // Owned regions (FR) — a region is owned when ALL its departments share the same owner.
  const ownedRegionsByOwner = React.useMemo(() => {
    if (!isFrRegionsVictory) return null;

    const byRegion = new Map<string, any[]>();
    for (const tt of game.map.territories) {
      if (tt.playable === false) continue;
      const regionId = String((tt as any).region || "FR-00");
      const arr = byRegion.get(regionId) || [];
      arr.push(tt);
      byRegion.set(regionId, arr);
    }

    const regionOwner: Record<string, string | undefined> = {};
    for (const [regionId, terrs] of byRegion.entries()) {
      if (!terrs.length) continue;
      const first = terrs[0]?.ownerId ? String(terrs[0].ownerId) : "";
      if (!first) {
        regionOwner[regionId] = undefined;
        continue;
      }
      const allSame = terrs.every((t) => (t?.ownerId ? String(t.ownerId) : "") === first);
      regionOwner[regionId] = allSame ? first : undefined;
    }

    const possibleOwners = game.teams?.length ? game.teams.map((t) => t.id) : game.players.map((p) => p.id);
    const counts: Record<string, number> = {};
    for (const oid of possibleOwners) counts[String(oid)] = 0;

    for (const rid of Object.keys(regionOwner)) {
      const owner = regionOwner[rid];
      if (owner && counts[owner] != null) counts[owner] += 1;
    }

    return counts;
  }, [isFrRegionsVictory, game.map.territories, game.players, game.teams]);

  const classement = React.useMemo(() => {
    const rows = game.teams?.length
      ? game.teams.map((team) => ({
          id: team.id,
          name: team.name,
          color: team.color,
          owned: (ownedByOwner[team.id] || 0) as number,
          value: (ownedValueByOwner[team.id] || 0) as number,
        }))
      : game.players.map((player) => ({
          id: player.id,
          name: player.name,
          color: player.color,
          owned: (ownedByOwner[player.id] || 0) as number,
          value: (ownedValueByOwner[player.id] || 0) as number,
        }));
    rows.sort((a, b) => {
      if (gameMode === "fortress" && fortressVictoryMode === "value") {
        return b.value - a.value || b.owned - a.owned || a.name.localeCompare(b.name);
      }
      return b.owned - a.owned || b.value - a.value || a.name.localeCompare(b.name);
    });
    return rows;
  }, [game.players, game.teams, gameMode, fortressVictoryMode, ownedByOwner, ownedValueByOwner]);

  const ownerProfilesById = React.useMemo(() => {
    const out: Record<string, any[]> = {};
    for (const player of game.players) {
      const ownerId = String(player.teamId || player.id);
      if (!out[ownerId]) out[ownerId] = [];
      out[ownerId].push(
        visualProfileById[player.id] ?? {
          id: player.id,
          name: player.name,
          avatar: player.avatar,
        },
      );
    }
    return out;
  }, [game.players, visualProfileById]);

  const selectedMapTerritoryCountryCode =
    country === "UN" || country === "FR"
      ? null
      : getTerritoryCountryCode(country, selectedTerritory?.id);
  const selectedMapTerritoryName = selectedTerritory
    ? country === "UN"
      ? (UN_REGION_NAMES_FR[String(selectedTerritory.id)] || String(selectedTerritory.name || selectedTerritory.id))
      : country === "FR"
        ? String(selectedTerritory.name || selectedTerritory.id)
        : getLocalizedTerritoryName(
            selectedMapTerritoryCountryCode,
            lang,
            String(selectedTerritory.name || selectedTerritory.id),
          )
    : "";
  const selectedMapTerritoryFlagSrc = selectedTerritory
    ? country === "UN"
      ? findUnRegionFlag(selectedTerritory.id)
      : country === "FR"
        ? getFrenchDepartmentFlagUrl(selectedTerritory.id)
        : findTerritoryFlagByCountry(selectedMapTerritoryCountryCode)
    : null;
  const selectedMapTerritoryFlagEmoji = selectedTerritory
    ? country === "UN"
      ? undefined
      : country === "FR"
        ? "🇫🇷"
        : isoCodeToFlagEmoji(selectedMapTerritoryCountryCode)
    : undefined;

  function goBack() {
    // Verrou de sécurité : même en cas de double activation matérielle, une seule
    // navigation vers la configuration TERRITORIES est autorisée.
    if (backNavigationLockedRef.current) return;
    backNavigationLockedRef.current = true;
    setShowMapModal(false);

    const navigate = props?.go || props?.setTab;
    if (navigate) {
      navigate("departements_config", {
        config: effectiveCfg,
        fromTerritoriesPlay: true,
      });
      window.setTimeout(() => {
        backNavigationLockedRef.current = false;
      }, 700);
      return;
    }

    window.history.back();
    window.setTimeout(() => {
      backNavigationLockedRef.current = false;
    }, 700);
  }

  function handleMapSelect(territoryId: string) {
    // A second tap on the currently selected territory cancels the objective.
    if (String(game.turn.selectedTerritoryId || "") === String(territoryId)) {
      setGame({
        ...game,
        turn: {
          ...game.turn,
          selectedTerritoryId: undefined,
        },
      });
      return true;
    }

    const res = selectTerritory(game, territoryId);
    if (res.error) return false;
    setGame(res.state);
    return true;
  }

  function handleValuesTerritorySelect(territoryId: string, close: () => void) {
    if (!handleMapSelect(territoryId)) return;
    close();
    setShowMapModal(false);
  }

  function playTerritoriesSfx(key: "dart_hit" | "triple" | "bull" | "dbull" | "victory") {
    try {
      x01EnsureAudioUnlocked();
      void x01PlaySfxV3(key, { volume: key === "dart_hit" ? 0.58 : 0.82, rateLimitMs: 35 });
    } catch {}
  }

  function handleMissEndsTurn() {
    if (game.status !== "playing") return;
    const activeId = game.turn.activePlayerId;
    const dartsUsed = Math.max(1, Math.min(3, currentThrow.length + 1));
    setPlayerStats((prev) => {
      const out = { ...prev };
      const current = out[activeId] || { ...EMPTY_PLAYER_LIVE_STATS };
      out[activeId] = {
        ...current,
        darts: current.darts + dartsUsed,
        visits: current.visits + 1,
        misses: current.misses + 1,
        missPasses: current.missPasses + 1,
      };
      return out;
    });
    setTerritoriesVisitLog((prev) => [
      ...prev,
      {
        index: prev.length + 1,
        round: Number(game.roundIndex || 1),
        playerId: String(activeId),
        ownerId: String(getOwnerIdForPlayer(game, activeId) || activeId),
        darts: [{ v: 0, mult: 1, score: 0, label: "MISS" }],
        total: 0,
        missPass: true,
      },
    ]);
    setCurrentThrow([]);
    setMultiplier(1);
    bullReplayOwnerRef.current = null;
    const ended = endTurn(game).state;
    setGame(ended);
  }

  function resolveTerritoriesVisit(throwDarts: UIDart[], forcedTerritoryId?: string) {
    if (game.status !== "playing") return;
    const darts = [...throwDarts].slice(0, 3);
    if (!darts.length) return;

    const dartScores = computeVisitScores(darts);
    const activeId = game.turn.activePlayerId;
    const activeOwner = getOwnerIdForPlayer(game, activeId) || activeId;

    const r1 = applyVisit(game, dartScores, forcedTerritoryId ? { territoryId: forcedTerritoryId } : undefined);
    if (r1.error) return;
    const next = r1.state;

    const capturedEvent = (r1.events as any[])?.find((event) => event?.type === "territory_captured");
    const capturedTid: string | undefined = capturedEvent?.territoryId;
    const beforeOwner = capturedTid ? game.map.territories.find((territory) => territory.id === capturedTid)?.ownerId : undefined;
    const previousOwnerPlayerId = beforeOwner
      ? game.players.find((player) => (player.teamId || player.id) === beforeOwner)?.id
      : undefined;
    const fortressBuilt = r1.events?.some((event) => event.type === "fortress_built") || false;
    const fortressBroken = r1.events?.some((event) => event.type === "fortress_broken") || false;
    const visitTotal = dartScores.reduce((acc, value) => acc + Number(value || 0), 0);
    const bullCount = darts.filter((dart) => Number(dart.v) === 25 && Number(dart.mult || 1) !== 2).length;
    const dbullCount = darts.filter((dart) => Number(dart.v) === 25 && Number(dart.mult || 1) === 2).length;
    const missCount = darts.filter((dart) => Number(dart.v) === 0).length;
    const capturedBefore = capturedTid ? game.map.territories.find((territory) => territory.id === capturedTid) : undefined;
    const capturedValue = capturedTid
      ? Number(next.map.territories.find((territory) => territory.id === capturedTid)?.value || capturedBefore?.value || 0)
      : 0;
    const captureWasGte = Boolean(capturedTid && captureRule === "gte" && visitTotal > capturedValue);

    if (capturedTid) {
      const capturedTerritory = next.map.territories.find((territory) => territory.id === capturedTid);
      const capturedCode = getTerritoryCountryCode(country, capturedTid);
      const capturedName = country === "UN"
        ? (UN_REGION_NAMES_FR[String(capturedTid)] || String(capturedTerritory?.name || capturedTid))
        : country === "FR"
          ? String(capturedTerritory?.name || capturedTid)
          : getLocalizedTerritoryName(capturedCode, lang, capturedTerritory?.name || capturedTid);
      const currentPlayer = game.players.find((player) => player.id === activeId);
      const currentOwnerLabel = game.teams?.find((team) => String(team.id) === String(activeOwner))?.name || currentPlayer?.name || "Joueur";
      const stolen = Boolean(beforeOwner && beforeOwner !== activeOwner);
      const previousOwnerName = beforeOwner
        ? game.teams?.find((team) => String(team.id) === String(beforeOwner))?.name
          || game.players.find((player) => String(player.teamId || player.id) === String(beforeOwner))?.name
          || String(beforeOwner)
        : undefined;
      const previousOwnerColor = beforeOwner ? ownerColors[String(beforeOwner)] : undefined;
      const capturedFlagSrc = country === "UN"
        ? findUnRegionFlag(capturedTid)
        : country === "FR"
          ? getFrenchDepartmentFlagUrl(capturedTid)
          : findTerritoryFlagByCountry(capturedCode);
      const capturedFlagEmoji = country === "UN" ? undefined : country === "FR" ? "🇫🇷" : isoCodeToFlagEmoji(capturedCode);
      const currentColor = currentPlayer?.color || themeColor;

      if (captureToastTimerRef.current != null) window.clearTimeout(captureToastTimerRef.current);
      setCaptureToast({
        id: Date.now(),
        country,
        territoryId: capturedTid,
        svgPathId: capturedTerritory?.svgPathId,
        territoryName: capturedName,
        territoryValue: Number(capturedTerritory?.value) || 0,
        capturerName: currentOwnerLabel,
        capturerPlayerId: activeId,
        previousOwnerName,
        previousOwnerPlayerId,
        stolen,
        color: currentColor,
        previousOwnerColor,
        flagSrc: capturedFlagSrc,
        flagEmoji: capturedFlagEmoji,
      });
      captureToastTimerRef.current = window.setTimeout(() => {
        setCaptureToast(null);
        captureToastTimerRef.current = null;
      }, 3250);

      // Le ticker Golf ne sonne QUE lorsqu'un territoire est réellement volé à un adversaire.
      if (stolen) {
        try {
          unlockAudio();
          playGolfTickerSound("SIMPLE", 0.96);
        } catch {}
      }

      const phrases = captureAnnouncementPhrases(lang, currentOwnerLabel, capturedName, stolen, previousOwnerName);
      let phraseIndex = Math.floor(Math.random() * phrases.length);
      if (phrases.length > 1 && phraseIndex === lastCaptureVoiceIndexRef.current) phraseIndex = (phraseIndex + 1) % phrases.length;
      lastCaptureVoiceIndexRef.current = phraseIndex;
      const phrase = phrases[phraseIndex];
      if (phrase) {
        window.setTimeout(() => {
          speak(phrase, { lang: TTS_LANG_BY_APP_LANG[lang] || "fr-FR", rate: 0.94, pitch: 1.02, interrupt: false });
        }, 560);
      }
    }

    setPlayerStats((prev) => {
      const out = { ...prev };
      const current = out[activeId] || { ...EMPTY_PLAYER_LIVE_STATS };
      out[activeId] = {
        ...current,
        darts: current.darts + darts.length,
        visits: current.visits + 1,
        bulls: current.bulls + bullCount,
        dbulls: current.dbulls + dbullCount,
        misses: current.misses + missCount,
        fortresses: current.fortresses + (fortressBuilt ? 1 : 0),
        breaches: current.breaches + (fortressBroken ? 1 : 0),
      };
      if (capturedEvent) {
        out[activeId] = {
          ...out[activeId],
          captures: (out[activeId]?.captures || 0) + 1,
          steals: (out[activeId]?.steals || 0) + (beforeOwner && beforeOwner !== activeOwner ? 1 : 0),
          captureValueTotal: (out[activeId]?.captureValueTotal || 0) + capturedValue,
          maxCaptureValue: Math.max(Number(out[activeId]?.maxCaptureValue || 0), capturedValue),
          exactCaptures: (out[activeId]?.exactCaptures || 0) + (captureWasGte ? 0 : 1),
          gteCaptures: (out[activeId]?.gteCaptures || 0) + (captureWasGte ? 1 : 0),
        };
        if (previousOwnerPlayerId && beforeOwner !== activeOwner) {
          const previous = out[previousOwnerPlayerId] || { ...EMPTY_PLAYER_LIVE_STATS };
          out[previousOwnerPlayerId] = { ...previous, lost: previous.lost + 1 };
        }
      }
      return out;
    });

    setCurrentThrow([]);
    setMultiplier(1);

    // Toujours vérifier la victoire avant d'accorder une volée bonus Bull/DBull.
    const endPreview = endTurn(next).state;
    if (endPreview.status === "game_end") {
      bullReplayOwnerRef.current = null;
      setGame(endPreview);
      return;
    }

    const hasBull = darts.some((dart) => dart.v === 25);
    const canReplay = bullReplayEnabled && hasBull && bullReplayOwnerRef.current !== activeId;

    setTerritoriesVisitLog((prev) => [
      ...prev,
      {
        index: prev.length + 1,
        round: Number(game.roundIndex || 1),
        playerId: String(activeId),
        ownerId: String(activeOwner),
        darts: darts.map((dart) => ({
          v: Number(dart.v || 0),
          mult: Number(dart.mult || 1),
          score: Number(dart.v || 0) * Number(dart.mult || 1),
          label: Number(dart.v) === 0
            ? "MISS"
            : Number(dart.v) === 25
              ? (Number(dart.mult || 1) === 2 ? "DBULL" : "BULL")
              : `${Number(dart.mult || 1) === 3 ? "T" : Number(dart.mult || 1) === 2 ? "D" : "S"}${Number(dart.v || 0)}`,
        })),
        total: visitTotal,
        targetTerritoryId: forcedTerritoryId || game.turn.selectedTerritoryId || undefined,
        targetValue: forcedTerritoryId || game.turn.selectedTerritoryId
          ? Number(game.map.territories.find((territory) => territory.id === (forcedTerritoryId || game.turn.selectedTerritoryId))?.value || 0)
          : undefined,
        capturedTerritoryId: capturedTid,
        capturedValue: capturedTid ? capturedValue : undefined,
        previousOwnerId: beforeOwner || null,
        stolen: Boolean(beforeOwner && beforeOwner !== activeOwner),
        fortressBuilt,
        fortressBroken,
        bull: bullCount > 0,
        dbull: dbullCount > 0,
        bullReplay: canReplay,
      },
    ]);

    if (canReplay) {
      setPlayerStats((prev) => {
        const out = { ...prev };
        const current = out[activeId] || { ...EMPTY_PLAYER_LIVE_STATS };
        out[activeId] = { ...current, bullReplays: current.bullReplays + 1 };
        return out;
      });
      bullReplayOwnerRef.current = activeId;
      const replayState = normalizeTerritoriesState(next).state;
      setGame(replayState);
      window.setTimeout(() => {
        speak(lang === "fr" ? "Bull ! Tu rejoues une fois." : "Bull! One extra turn.", {
          lang: TTS_LANG_BY_APP_LANG[lang] || "fr-FR",
          rate: 0.96,
          pitch: 1.02,
          interrupt: false,
        });
      }, 260);
      return;
    }

    bullReplayOwnerRef.current = null;
    setGame(endPreview);
  }

  function validateThrow() {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    window.setTimeout(() => (submitLockRef.current = false), 250);
    if (game.status !== "playing" || currentThrow.length === 0) return;
    if (game.config.targetSelectionMode === "free" && !game.turn.selectedTerritoryId) return;
    resolveTerritoriesVisit(currentThrow, game.turn.selectedTerritoryId);
  }

  React.useEffect(() => {
    if (game.status !== "game_end") {
      victorySoundPlayedRef.current = false;
      return;
    }
    if (victorySoundPlayedRef.current) return;
    victorySoundPlayedRef.current = true;
    try {
      x01EnsureAudioUnlocked();
      void x01PlaySfxV3("victory", { volume: 0.92, rateLimitMs: 250 });
    } catch {}
  }, [game.status]);

  React.useEffect(() => {
    if (game.status !== "playing" || !activeIsBot) {
      botActingRef.current = false;
      return;
    }
    if (botActingRef.current) return;
    botActingRef.current = true;

    const activeId = game.turn.activePlayerId;
    const ownerId = getOwnerIdForPlayer(game, activeId) || activeId;
    const level = /^pro_/i.test(activeId) ? "hard" : effectiveCfg.botLevel || "normal";
    const successChance = level === "hard" ? 0.92 : level === "easy" ? 0.58 : 0.76;

    const playable = game.map.territories.filter((territory) => territory.playable !== false);
    const attackable = playable
      .filter((territory) => territory.ownerId !== ownerId)
      .filter((territory) => botVisitForTotal(Number(territory.value) || 0))
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));

    const ownFortifiable = gameMode === "fortress"
      ? playable
          .filter((territory) => territory.ownerId === ownerId && territory.fortressOwnerId !== ownerId)
          .filter((territory) => botVisitForTotal(Number(territory.value) || 0))
          .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
      : [];

    let target = attackable[0];
    if (ownFortifiable.length && Math.random() < 0.20) target = ownFortifiable[0];
    const planned = target ? botVisitForTotal(Number(target.value) || 0) : null;
    const succeeds = Boolean(target && planned && Math.random() <= successChance);
    const darts = succeeds && planned ? planned : randomBotMissVisit();

    const timers: number[] = [];
    setCurrentThrow([]);
    setMultiplier(1);

    darts.forEach((dart, index) => {
      timers.push(window.setTimeout(() => {
        setCurrentThrow((prev) => [...prev, { ...dart }].slice(0, 3));
        if (dart.v === 25 && dart.mult === 2) playTerritoriesSfx("dbull");
        else if (dart.v === 25) playTerritoriesSfx("bull");
        else if (dart.mult === 3) playTerritoriesSfx("triple");
        else playTerritoriesSfx("dart_hit");
      }, 500 + index * 420));
    });

    timers.push(window.setTimeout(() => {
      if (succeeds && target) {
        resolveTerritoriesVisit(darts, target.id);
      } else {
        setPlayerStats((prev) => {
          const out = { ...prev };
          const current = out[activeId] || { ...EMPTY_PLAYER_LIVE_STATS };
          out[activeId] = { ...current, darts: current.darts + darts.length };
          return out;
        });
        setCurrentThrow([]);
        setMultiplier(1);
        bullReplayOwnerRef.current = null;
        setGame(endTurn(game).state);
      }
      botActingRef.current = false;
    }, 650 + darts.length * 420 + 420));

    return () => {
      // Ne pas annuler une animation en cours à cause d'un simple rerender du keypad.
      // L'effet est réinstallé uniquement au changement de tour / joueur actif.
      for (const timer of timers) window.clearTimeout(timer);
      if (game.turn.activePlayerId !== activeId) botActingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, activeIsBot]);

  const replay = React.useCallback(() => {
    setGame(initialState);
    setCurrentThrow([]);
    setMultiplier(1);
    const reset: Record<string, PlayerLiveStats> = {};
    for (const player of players) reset[player.id] = { ...EMPTY_PLAYER_LIVE_STATS };
    setPlayerStats(reset);
    setTerritoriesVisitLog([]);
  }, [initialState, players]);

  // Time remaining (UI only)
  const timeRemaining = React.useMemo(() => {
    if (game.config.victoryCondition.type !== "time") return null;
    const start = game.meta?.startedAtMs || Date.now();
    const dur = (game.config.victoryCondition.minutes || 0) * 60 * 1000;
    const elapsed = Date.now() - start;
    const left = Math.max(0, dur - elapsed);
    const mm = Math.floor(left / 60000);
    const ss = Math.floor((left % 60000) / 1000);
    return `${mm}:${String(ss).padStart(2, "0")}`;
  }, [game.config.victoryCondition, game.meta?.startedAtMs, game.turnIndex]);

  const possessionsForActive = React.useMemo(() => {
    if (!activeOwnerId) return 0;
    if (gameMode === "classic" && victoryMode === "regions" && ownedRegionsByOwner) {
      return ownedRegionsByOwner[activeOwnerId] || 0;
    }
    return ownedByOwner[activeOwnerId] || 0;
  }, [activeOwnerId, gameMode, ownedByOwner, ownedRegionsByOwner, victoryMode]);

  const possessionValueForActive = activeOwnerId ? ownedValueByOwner[activeOwnerId] || 0 : 0;

  const possessionsGoal = React.useMemo(() => {
    if (gameMode === "fortress") return playableTerritoryCount;
    if (victoryMode === "regions") return winRegions;
    return winTerritories;
  }, [gameMode, playableTerritoryCount, victoryMode, winRegions, winTerritories]);

  const activeStats = React.useMemo<PlayerLiveStats>(() => {
    const total: PlayerLiveStats = { ...EMPTY_PLAYER_LIVE_STATS };
    for (const player of game.players) {
      if ((player.teamId || player.id) !== activeOwnerId) continue;
      const stats = playerStats[player.id];
      if (!stats) continue;
      total.darts += stats.darts;
      total.captures += stats.captures;
      total.steals += stats.steals;
      total.lost += stats.lost;
      total.fortresses += stats.fortresses;
      total.breaches += stats.breaches;
    }
    return total;
  }, [activeOwnerId, game.players, playerStats]);

  /* -------------------------------------------
     ENDGAME (victory + stats recording)
  ------------------------------------------- */
  const ownersOrder = React.useMemo(() => {
    return teams?.length ? teams.map((t) => t.id) : players.map((p) => p.id);
  }, [teams, players]);

  const winnerOwnerId = React.useMemo(() => {
    if (game.status !== "game_end") return null;

    // Use regions count if mode=regions and map supports it, else territories.
    const ownedCounts: Record<string, number> =
      gameMode === "classic" && victoryMode === "regions" && ownedRegionsByOwner
        ? ownedRegionsByOwner
        : ownedByOwner;

    const vc = game.config.victoryCondition;

    // Objective-based win
    if (vc.type === "territories" || vc.type === "regions") {
      const threshold = Number((vc as any).value || 0);
      let best: { id: string; v: number } | null = null;
      for (const oid of ownersOrder) {
        const v = ownedCounts[oid] || 0;
        if (v >= threshold) {
          if (!best || v > best.v) best = { id: oid, v };
        }
      }
      if (best) return best.id;
    }

    // In Forteresses + valeur, the final ranking is the sum of territory values.
    const finalScores = vc.type === "rounds_value" ? ownedValueByOwner : ownedCounts;
    let maxId: string | null = null;
    let maxV = -1;
    let tied = false;
    for (const oid of ownersOrder) {
      const value = finalScores[oid] || 0;
      if (value > maxV) {
        maxV = value;
        maxId = oid;
        tied = false;
      } else if (value === maxV) {
        tied = true;
      }
    }
    return tied ? null : maxId;
  }, [game.status, game.config.victoryCondition, gameMode, victoryMode, ownedByOwner, ownedValueByOwner, ownedRegionsByOwner, ownersOrder]);

  const recordedRef = React.useRef(false);
  React.useEffect(() => {
    if (game.status !== "game_end") {
      recordedRef.current = false;
      return;
    }
    if (recordedRef.current) return;

    const ownedCounts: Record<string, number> =
      gameMode === "classic" && victoryMode === "regions" && ownedRegionsByOwner
        ? ownedRegionsByOwner
        : ownedByOwner;

    // Map each player to an ownerId (teamId in teams mode, else playerId)
    const ownerByPlayer: Record<string, string> = {};
    for (const p of players) ownerByPlayer[p.id] = p.teamId || p.id;

    const capturedByOwner: Record<string, number> = {};
    const dartsByOwner: Record<string, number> = {};
    const stealsByOwner: Record<string, number> = {};
    const lostByOwner: Record<string, number> = {};
    const fortressesByOwner: Record<string, number> = {};
    const breachesByOwner: Record<string, number> = {};
    const visitsByOwner: Record<string, number> = {};
    const bullsByOwner: Record<string, number> = {};
    const dbullsByOwner: Record<string, number> = {};
    const missesByOwner: Record<string, number> = {};
    const bullReplaysByOwner: Record<string, number> = {};
    const missPassesByOwner: Record<string, number> = {};
    const captureValueByOwner: Record<string, number> = {};
    const maxCaptureValueByOwner: Record<string, number> = {};
    const exactCapturesByOwner: Record<string, number> = {};
    const gteCapturesByOwner: Record<string, number> = {};

    for (const [pid, st] of Object.entries(playerStats || {})) {
      const oid = ownerByPlayer[pid] || pid;
      capturedByOwner[oid] = (capturedByOwner[oid] || 0) + (st?.captures || 0);
      dartsByOwner[oid] = (dartsByOwner[oid] || 0) + (st?.darts || 0);
      stealsByOwner[oid] = (stealsByOwner[oid] || 0) + (st?.steals || 0);
      lostByOwner[oid] = (lostByOwner[oid] || 0) + (st?.lost || 0);
      fortressesByOwner[oid] = (fortressesByOwner[oid] || 0) + (st?.fortresses || 0);
      breachesByOwner[oid] = (breachesByOwner[oid] || 0) + (st?.breaches || 0);
      visitsByOwner[oid] = (visitsByOwner[oid] || 0) + (st?.visits || 0);
      bullsByOwner[oid] = (bullsByOwner[oid] || 0) + (st?.bulls || 0);
      dbullsByOwner[oid] = (dbullsByOwner[oid] || 0) + (st?.dbulls || 0);
      missesByOwner[oid] = (missesByOwner[oid] || 0) + (st?.misses || 0);
      bullReplaysByOwner[oid] = (bullReplaysByOwner[oid] || 0) + (st?.bullReplays || 0);
      missPassesByOwner[oid] = (missPassesByOwner[oid] || 0) + (st?.missPasses || 0);
      captureValueByOwner[oid] = (captureValueByOwner[oid] || 0) + (st?.captureValueTotal || 0);
      maxCaptureValueByOwner[oid] = Math.max(maxCaptureValueByOwner[oid] || 0, st?.maxCaptureValue || 0);
      exactCapturesByOwner[oid] = (exactCapturesByOwner[oid] || 0) + (st?.exactCaptures || 0);
      gteCapturesByOwner[oid] = (gteCapturesByOwner[oid] || 0) + (st?.gteCaptures || 0);
    }

    const winner = winnerOwnerId || ownersOrder[0] || "";
    const winnerTeamIndex = Math.max(0, ownersOrder.indexOf(winner));

    const now = Date.now();
    const durationMs = Math.max(0, now - (game.meta?.startedAtMs || now));

    pushTerritoriesHistory({
      id: `territories_${now}_${Math.random().toString(16).slice(2)}`,
      ts: now,
      mapId,
      mapName: mapDisplayName,
      mode: teams?.length ? "teams" : "solo",
      teams: teams?.length ? teams.length : players.length,
      teamSize: teams?.length ? (effectiveCfg.teamSize || 2) : 1,
      gameMode,
      maxFortressesPerOwner,
      victory: gameMode === "fortress"
        ? fortressVictoryMode === "conquest" ? "conquest" : fortressVictoryMode === "value" ? "value" : "majority"
        : victoryMode,
      objective: gameMode === "fortress"
        ? fortressVictoryMode === "conquest" ? playableTerritoryCount : maxRounds
        : victoryMode === "time" ? timeLimitMin : victoryMode === "regions" ? winRegions : winTerritories,
      rounds: game.roundIndex || 1,
      durationMs,
      winnerTeam: winnerTeamIndex,
      captured: ownersOrder.map((oid) => capturedByOwner[oid] || 0),
      darts: ownersOrder.map((oid) => dartsByOwner[oid] || 0),
      steals: ownersOrder.map((oid) => stealsByOwner[oid] || 0),
      lost: ownersOrder.map((oid) => lostByOwner[oid] || 0),
      fortresses: ownersOrder.map((oid) => fortressesByOwner[oid] || 0),
      breaches: ownersOrder.map((oid) => breachesByOwner[oid] || 0),
      visits: ownersOrder.map((oid) => visitsByOwner[oid] || 0),
      bulls: ownersOrder.map((oid) => bullsByOwner[oid] || 0),
      dbulls: ownersOrder.map((oid) => dbullsByOwner[oid] || 0),
      misses: ownersOrder.map((oid) => missesByOwner[oid] || 0),
      bullReplays: ownersOrder.map((oid) => bullReplaysByOwner[oid] || 0),
      missPasses: ownersOrder.map((oid) => missPassesByOwner[oid] || 0),
      captureValueTotal: ownersOrder.map((oid) => captureValueByOwner[oid] || 0),
      maxCaptureValue: ownersOrder.map((oid) => maxCaptureValueByOwner[oid] || 0),
      exactCaptures: ownersOrder.map((oid) => exactCapturesByOwner[oid] || 0),
      gteCaptures: ownersOrder.map((oid) => gteCapturesByOwner[oid] || 0),
      domination: ownersOrder.map((oid) => ownedCounts[oid] || 0),
      dominationValue: ownersOrder.map((oid) => ownedValueByOwner[oid] || 0),
      schemaVersion: 2,
      configSnapshot: {
        gameMode,
        fortressVictoryMode,
        targetSelectionMode: selectionMode,
        captureRule,
        victoryMode,
        maxFortressesPerOwner,
        bullReplayEnabled,
        missPassTurn,
        valueSkillAverage3: territoryValueCalibration.referenceAvg3,
        valueTargetMin: game.map.assignedValueMin ?? territoryValueCalibration.minTarget,
        valueTargetMax: game.map.assignedValueMax ?? territoryValueCalibration.maxTarget,
        valueDifficultyLabel: territoryValueCalibration.label,
        playableTerritories: Number(game.map.playableTerritoryCount || game.map.territories.filter((territory) => territory.playable !== false).length),
        disabledTerritories: Number(game.map.disabledTerritoryCount || game.map.territories.filter((territory) => territory.playable === false).length),
        initialDistribution: gameMode === "fortress" ? "equal" : "neutral",
      },
      playerStats: Object.fromEntries(
        Object.entries(playerStats || {}).map(([playerId, stats]) => [String(playerId), { ...EMPTY_PLAYER_LIVE_STATS, ...(stats || {}) }]),
      ),
      visitLog: territoriesVisitLog,
      finalTerritories: game.map.territories.map((territory) => ({
        id: String(territory.id),
        name: territory.name,
        region: territory.region,
        value: Number(territory.value || 0),
        ownerId: territory.ownerId || null,
        fortressOwnerId: territory.fortressOwnerId || null,
        playable: territory.playable !== false,
      })),
      owners: ownersOrder.map((ownerId, teamIndex) => ({
        id: String(ownerId),
        name: teams?.find((team) => String(team.id) === String(ownerId))?.name
          || players.find((player) => String(player.teamId || player.id) === String(ownerId))?.name
          || `Camp ${teamIndex + 1}`,
        color: ownerColors[String(ownerId)] || players.find((player) => String(player.teamId || player.id) === String(ownerId))?.color,
        teamIndex,
      })),
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        avatarDataUrl: profileById[player.id]?.avatarDataUrl ?? profileById[player.id]?.avatar ?? player.avatar ?? null,
        teamIndex: Math.max(0, ownersOrder.indexOf(player.teamId || player.id)),
      })),
    });

    recordedRef.current = true;
  }, [
    game.status,
    game.meta?.startedAtMs,
    game.roundIndex,
    gameMode,
    maxFortressesPerOwner,
    fortressVictoryMode,
    maxRounds,
    playableTerritoryCount,
    victoryMode,
    ownedByOwner,
    ownedValueByOwner,
    ownedRegionsByOwner,
    ownersOrder,
    players,
    teams,
    mapId,
    mapDisplayName,
    ownerColors,
    winRegions,
    winTerritories,
    timeLimitMin,
    winnerOwnerId,
    playerStats,
    territoriesVisitLog,
    selectionMode,
    captureRule,
    bullReplayEnabled,
    missPassTurn,
    territoryValueCalibration,
    profileById,
    effectiveCfg.teamSize,
  ]);

  const valuesOwnerOptions = React.useMemo(() => {
    if (game.teams?.length) {
      return game.teams.map((team) => ({ id: String(team.id), name: String(team.name), color: team.color || ownerColors[team.id] || themeColor }));
    }
    return game.players.map((player) => ({ id: String(player.id), name: String(player.name), color: player.color || ownerColors[player.id] || themeColor }));
  }, [game.players, game.teams, ownerColors, themeColor]);

  const sortedTerritoriesForValues = React.useMemo(() => {
    const ownerOrder = new Map<string, number>();
    valuesOwnerOptions.forEach((owner, index) => ownerOrder.set(owner.id, index));

    const filtered = game.map.territories.filter((territory) => {
      if (valuesSortMode !== "owner" || valuesOwnerFilter === "all") return true;
      if (valuesOwnerFilter === "free") return !territory.ownerId;
      return String(territory.ownerId || "") === valuesOwnerFilter;
    });

    return [...filtered].sort((a, b) => {
      const disabledOrder = Number(a.playable === false) - Number(b.playable === false);
      if (disabledOrder !== 0) return disabledOrder;

      if (valuesSortMode === "owner") {
        const aOwner = a.ownerId ? String(a.ownerId) : "";
        const bOwner = b.ownerId ? String(b.ownerId) : "";
        const aRank = aOwner ? (ownerOrder.get(aOwner) ?? valuesOwnerOptions.length + 1) : valuesOwnerOptions.length;
        const bRank = bOwner ? (ownerOrder.get(bOwner) ?? valuesOwnerOptions.length + 1) : valuesOwnerOptions.length;
        if (aRank !== bRank) return aRank - bRank;
      }

      return (a.value - b.value) || String(a.name).localeCompare(String(b.name), lang === "fr" ? "fr" : undefined, { sensitivity: "base" });
    });
  }, [game.map.territories, lang, valuesOwnerFilter, valuesOwnerOptions, valuesSortMode]);

  const renderTerritoryValueRow = (tt: any, close: () => void) => {
    const disabled = tt.playable === false;
    const selected = game.turn.selectedTerritoryId === tt.id;
    const canSelect = !disabled && game.status === "playing";
    const hasFortress = Boolean(tt.ownerId && tt.fortressOwnerId === tt.ownerId);
    const ownerColor = tt.ownerId ? ownerColors[tt.ownerId] : undefined;
    const territoryCode = getTerritoryCountryCode(country, tt.id);
    const displayName = getLocalizedTerritoryName(territoryCode, lang, String(tt.name || tt.id));

    return (
      <button
        key={tt.id}
        type="button"
        disabled={!canSelect}
        aria-pressed={selected}
        onClick={() => handleValuesTerritorySelect(tt.id, close)}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "76px minmax(0, 1fr) auto",
          alignItems: "center",
          gap: 10,
          padding: "9px 11px",
          borderRadius: 12,
          color: "#fff",
          textAlign: "left",
          background: disabled
            ? "rgba(120,126,140,0.08)"
            : selected
              ? `${themeColor}20`
              : ownerColor
                ? `${ownerColor}12`
                : "rgba(255,255,255,0.04)",
          border: disabled
            ? "1px solid rgba(160,166,180,0.14)"
            : selected
              ? `2px solid ${themeColor}`
              : `1px solid ${ownerColor ? `${ownerColor}55` : "rgba(255,255,255,0.08)"}`,
          boxShadow: selected ? `0 0 18px ${themeColor}44` : "none",
          opacity: disabled ? 0.52 : 1,
          cursor: canSelect ? "pointer" : "default",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div
          style={{
            minWidth: 0,
            textAlign: "center",
            fontWeight: 1000,
            fontSize: disabled ? 9 : 16,
            color: disabled ? "rgba(255,255,255,0.45)" : themeColor,
            textShadow: disabled ? "none" : `0 0 12px ${themeColor}88`,
          }}
        >
          {disabled ? "HORS PARTIE" : tt.value}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 900,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</span>
            {selected ? <span style={{ color: themeColor, fontSize: 10 }}>✓</span> : null}
          </div>
          <div style={{ fontSize: 10, opacity: 0.62, marginTop: 2 }}>
            {tt.id}{canSelect ? (game.config.targetSelectionMode === "by_score" ? " · cible manuelle pour cette volée" : " · toucher pour sélectionner") : ""}
          </div>
        </div>

        <TerritoryOwnerBadge
          ownerId={tt.ownerId}
          hasFortress={hasFortress}
          players={game.players}
          profileById={visualProfileById}
          ownerColor={ownerColor}
        />
      </button>
    );
  };

  const valuesHelpContent = (
    <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
      <div style={{ padding: "10px 12px", borderRadius: 14, background: `${themeColor}10`, border: `1px solid ${themeColor}33` }}>
        <div style={{ color: themeColor, fontWeight: 1000, textTransform: "uppercase", textDecoration: "underline", marginBottom: 6 }}>Comprendre les valeurs</div>
        <div>Chaque territoire jouable possède une valeur strictement unique. Les territoires les plus grands demandent les scores les plus élevés.</div>
      </div>
      <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div><span style={{ color: themeColor, fontWeight: 1000 }}>Niveau</span> <strong>{territoryValueCalibration.label}</strong></div>
        <div style={{ marginTop: 4 }}><span style={{ color: themeColor, fontWeight: 1000 }}>Plage réelle</span> <strong>{assignedValueMin}–{assignedValueMax}</strong></div>
        {disabledTerritoryCount > 0 ? (
          <div style={{ marginTop: 6 }}>{playableTerritoryCount} territoires sont jouables. Les {disabledTerritoryCount} autres sont grisés pour conserver un maximum de 180 valeurs uniques.</div>
        ) : null}
      </div>
      {gameMode === "fortress" ? (
        <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ color: themeColor, fontWeight: 1000 }}>Forteresse</span> · le contour blanc pointillé et l’icône de château indiquent une protection active.
        </div>
      ) : null}
      <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ color: themeColor, fontWeight: 1000 }}>Sélection</span> · {game.config.targetSelectionMode === "free"
          ? "Touchez une carte pour sélectionner immédiatement le territoire et revenir au clavier."
          : "En volée directe, aucune sélection n’est obligatoire. Vous pouvez néanmoins toucher une carte pour définir une cible manuelle pour la volée en cours."}
      </div>
    </div>
  );

  const valuesModalContent = ({ close }: { close: () => void }) => (
    <div style={{ maxHeight: "70vh", overflow: "auto" }} className="dc-scroll-thin">
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 4,
          display: "grid",
          gap: 8,
          padding: "2px 0 10px",
          background: "linear-gradient(180deg, rgba(10,24,40,0.98) 0%, rgba(10,24,40,0.94) 78%, rgba(10,24,40,0) 100%)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {(["value", "owner"] as const).map((mode) => {
            const active = valuesSortMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setValuesSortMode(mode);
                  if (mode === "value") setValuesOwnerFilter("all");
                }}
                style={{
                  minHeight: 36,
                  borderRadius: 11,
                  border: `1px solid ${active ? `${themeColor}AA` : "rgba(255,255,255,0.12)"}`,
                  background: active ? `${themeColor}20` : "rgba(255,255,255,0.045)",
                  color: active ? themeColor : "rgba(255,255,255,0.82)",
                  fontWeight: 950,
                  fontSize: 11,
                  letterSpacing: 0.35,
                  cursor: "pointer",
                }}
              >
                {mode === "value" ? "PAR VALEUR" : "PAR PROPRIÉTAIRE"}
              </button>
            );
          })}
        </div>

        {valuesSortMode === "owner" ? (
          <div className="dc-scroll-thin" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {[
              { id: "all", name: "Tous", color: themeColor },
              { id: "free", name: "Libres", color: "rgba(255,255,255,0.72)" },
              ...valuesOwnerOptions,
            ].map((owner) => {
              const active = valuesOwnerFilter === owner.id;
              return (
                <button
                  key={owner.id}
                  type="button"
                  onClick={() => setValuesOwnerFilter(owner.id)}
                  style={{
                    flex: "0 0 auto",
                    minHeight: 31,
                    padding: "0 10px",
                    borderRadius: 999,
                    border: `1px solid ${active ? owner.color : "rgba(255,255,255,0.12)"}`,
                    background: active
                      ? owner.id === "free"
                        ? "rgba(255,255,255,0.10)"
                        : `${owner.color}24`
                      : "rgba(0,0,0,0.24)",
                    color: active ? owner.color : "rgba(255,255,255,0.82)",
                    fontWeight: 900,
                    fontSize: 10,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {owner.name}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sortedTerritoriesForValues.map((tt) => renderTerritoryValueRow(tt, close))}
        {sortedTerritoriesForValues.length === 0 ? (
          <div style={{ padding: 18, textAlign: "center", opacity: 0.68, fontWeight: 800 }}>Aucun territoire dans ce filtre.</div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050607", color: "#fff", display: "flex", flexDirection: "column" }}>
      <PageHeader
        tickerSrc={tickerSrc}
        tickerAlt="TERRITORIES"
        tickerHeight={92}
        left={<BackDot onClick={goBack} title="Retour à la configuration TERRITORIES" />}
        right={<InfoDot title="Règles" content={RULES_TEXT({ gameMode, fortressVictoryMode, selectionMode, captureRule, victoryMode, winTerritories, winRegions, timeLimitMin, maxRounds, maxFortressesPerOwner, valueDifficultyLabel: territoryValueCalibration.label, valueTargetMin: assignedValueMin, valueTargetMax: assignedValueMax, themeColor, bullReplayEnabled, missPassTurn })} />}
      />

      <TerritoryCaptureToast data={captureToast} profileById={visualProfileById} />

      {/* END OF MATCH MODAL */}
      {game.status === "game_end" && (
        <TerritoriesEndModal
          themeColor={themeColor}
          winnerOwnerId={winnerOwnerId}
          ownersOrder={ownersOrder}
          players={players}
          teams={teams}
          ownedByOwner={gameMode === "classic" && victoryMode === "regions" && ownedRegionsByOwner ? ownedRegionsByOwner : ownedByOwner}
          ownedValueByOwner={ownedValueByOwner}
          victoryMode={gameMode === "fortress" ? fortressVictoryMode : victoryMode}
          objective={gameMode === "fortress"
            ? fortressVictoryMode === "conquest" ? playableTerritoryCount : maxRounds
            : victoryMode === "time" ? timeLimitMin : victoryMode === "regions" ? winRegions : winTerritories}
          onReplay={replay}
          onQuit={goBack}
        />
      )}

      <TerritoriesTurnCarousel
        players={game.players}
        activeId={game.turn.activePlayerId}
        profileById={visualProfileById}
        ownedByOwner={ownedByOwner}
        ownedValueByOwner={ownedValueByOwner}
      />

      {/* ACTIVE PLAYER HEADER (style proche GolfPlay) */}
      <div style={{ padding: "6px 12px 10px" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 12,
            alignItems: "stretch",
            padding: "9px 10px",
            borderRadius: 18,
            background: "rgba(12, 14, 26, 0.55)",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Watermark avatar (like X01Play/GolfPlay) */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            {/* Avatar on the right (transparent) */}
            <div
              style={{
                position: "absolute",
                right: -42,
                top: -24,
                bottom: -24,
                width: "64%",
                display: "grid",
                placeItems: "center",
                opacity: 0.16,
                filter: "saturate(1.06)",
              }}
            >
              {/* Same feel as X01V3: much larger, cropped on the right, heavy fade on the left */}
              <div style={{ transform: "scale(2.05)", transformOrigin: "center" }}>
                <ProfileAvatar
                  profile={visualProfileById[game.turn.activePlayerId] ?? { id: game.turn.activePlayerId, name: activePlayer?.name, avatar: activePlayer?.avatar }}
                  size={210}
                  ringColor={activeColor}
                  textColor="#fff"
                  showStars={false}
                />
              </div>
            </div>
            {/* Strong left fade over the avatar */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(12,14,26,0.995) 0%, rgba(12,14,26,0.985) 52%, rgba(12,14,26,0.62) 76%, rgba(12,14,26,0.14) 100%)",
              }}
            />
          </div>

          {/* Left: big avatar + name underneath */}
          <div
            style={{
              // Responsive to avoid any horizontal overflow on mobile
              width: "clamp(112px, 34vw, 154px)",
              flex: "0 0 auto",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              alignSelf: "stretch",
              paddingRight: 6,
            }}
          >
            <div
              style={{
                width: 82,
                height: 82,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                overflow: "visible",
                boxShadow: `0 0 0 1px ${activeColor}66, 0 0 16px ${activeColor}88, 0 0 28px ${activeColor}55`,
              }}
            >
              <ProfileAvatar
                profile={visualProfileById[game.turn.activePlayerId] ?? { id: game.turn.activePlayerId, name: activePlayer?.name, avatar: activePlayer?.avatar }}
                size={82}
                ringColor={activeColor}
                textColor="#fff"
                showStars={false}
                noFrame
              />
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                fontWeight: 950,
                color: activeColor,
                textShadow: `0 0 12px ${activeColor}77`,
                textAlign: "center",
                width: "100%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {activePlayer?.name || "Player"}
            </div>

            <TerritoryTargetSuggestions
              suggestions={territoryStealSuggestions}
              currentTotal={currentVisitTotal}
              dartsRemaining={dartsRemaining}
              accentColor={activeColor}
              players={game.players}
              profileById={visualProfileById}
              onSelect={(territoryId) => {
                handleMapSelect(territoryId);
              }}
            />

          </div>

          {/* Right: compact live stats. Captures = all territories taken; Vols = enemy territories taken. */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", zIndex: 1, minWidth: 0 }}>
            <div
              style={{
                width: "clamp(166px, 45vw, 238px)",
                minWidth: 0,
                padding: 7,
                borderRadius: 15,
                background: "rgba(0,0,0,0.22)",
                border: `1px solid ${activeColor}55`,
                boxShadow: `0 0 18px ${activeColor}1f`,
                display: "grid",
                gap: 5,
                alignContent: "center",
              }}
            >
              <HeaderModeIcons
                teamMode={Boolean(teams?.length)}
                fortressMode={gameMode === "fortress"}
                color={activeColor}
                timeRemaining={timeRemaining}
                compact
                roundProgress={`${Math.max(1, Math.min(maxRounds, game.roundIndex || 1))}/${maxRounds}`}
                selectionMode={selectionMode}
                captureRule={captureRule}
                victoryKind={victoryConfigKind}
                onOpenLegend={() => setShowConfigLegend(true)}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 5 }}>
                <ProfileStatKpi label="Territoires" value={`${possessionsForActive}/${possessionsGoal}`} color={activeColor} />
                <ProfileStatKpi label="Valeur" value={String(possessionValueForActive)} color={activeColor} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 5 }}>
                <ProfileStatIconKpi icon="darts" title="Fléchettes jouées" value={String(activeStats.darts)} />
                {gameMode === "fortress" ? (
                  <>
                    <ProfileStatIconKpi icon="fortress" title="Forteresses construites" value={String(activeStats.fortresses)} />
                    <ProfileStatIconKpi icon="breach" title="Forteresses brisées" value={String(activeStats.breaches)} />
                  </>
                ) : (
                  <>
                    <ProfileStatIconKpi icon="neutral" title="Territoires libres capturés" value={String(Math.max(0, activeStats.captures - activeStats.steals))} color="#7de9ff" />
                    <ProfileStatIconKpi icon="balance" title="Solde net de territoires (captures - pertes)" value={String(activeStats.captures - activeStats.lost)} color={activeStats.captures - activeStats.lost < 0 ? "#ff6f7d" : "#7de9ff"} />
                  </>
                )}
                <ProfileStatIconKpi icon="capture" title="Captures totales : territoires libres et territoires volés" value={String(activeStats.captures)} color="#59f18d" />
                <ProfileStatIconKpi icon="steal" title="Vols : territoires pris à un adversaire" value={String(activeStats.steals)} color="#59f18d" />
                <ProfileStatIconKpi icon="lost" title="Territoires perdus" value={String(activeStats.lost)} color="#ff6f7d" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI: OBJECTIF + TERRITOIRE (single row, neon) */}
      <div style={{ padding: "0 12px 10px", display: "flex", gap: 12 }}>
        <KpiCard
          title="OBJECTIF"
          titleColor={activeColor}
          titleGlowColor={`${activeColor}AA`}
          value={selectedTerritory ? objectiveValueLabel : ""}
          valueColor={activeColor}
          borderColor={`${activeColor}55`}
          glowColor={`${activeColor}22`}
          centerValue
          watermarkSrc={targetBgUrl}
          onClick={!selectedTerritory ? () => setShowTerritoryListModal(true) : undefined}
        />
        <KpiCard
          title="TERRITOIRE"
          titleColor={displayedTerritoryOwnerColor || activeColor}
          titleFontSize={8.2}
          titleGlowColor={`${(displayedTerritoryOwnerColor || activeColor)}AA`}
          value={territoryNameLabel}
          valueColor="#fff"
          borderColor={`${(displayedTerritoryOwnerColor || activeColor)}66`}
          glowColor={`${(displayedTerritoryOwnerColor || activeColor)}40`}
          valueFontSize={10.5}
          allowWrap
          centerValue
          fitValue
          watermarkSrc={territoryFlagSrc || undefined}
          watermarkEmoji={territoryFlagEmoji}
          fortressActive={displayedTerritoryHasFortress}
          fortressColor={displayedTerritoryOwnerColor || themeColor}
          showFortressIcon={false}
          titleAddon={displayedTerritory ? (
            <TerritoryOwnerBadge
              ownerId={displayedTerritory?.ownerId}
              hasFortress={displayedTerritoryHasFortress}
              players={game.players}
              profileById={visualProfileById}
              ownerColor={displayedTerritoryOwnerColor}
              compact
            />
          ) : undefined}
        />
        <KpiCard
          title="CARTE"
          titleColor={activeColor}
          titleGlowColor={`${activeColor}AA`}
          value=""
          valueColor={activeColor}
          borderColor={`${activeColor}55`}
          glowColor={`${activeColor}18`}
          onClick={() => setShowMapModal(true)}
          watermarkSrc={flagSrc || undefined}
        />
      </div>

      {/* MAP MODAL (keeps base UI compact + prevents cutting the active player stats) */}
      {showMapModal && (
        <TerritoriesMapModal
          title="CARTE"
          mapName={mapDisplayName}
          themeColor={themeColor}
          headerFlagSrc={flagSrc || undefined}
          headerFlagEmoji={flagSrc ? undefined : isoCodeToFlagEmoji(country)}
          onClose={() => setShowMapModal(false)}
          valuesModalContent={valuesModalContent}
          valuesModalTitleAddon={
            <InfoDot
              size={28}
              title="Comprendre les valeurs"
              content={valuesHelpContent}
              color={themeColor}
              glow={`${themeColor}88`}
            />
          }
          legend={
            <div className="dc-scroll-thin" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "7px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {classement.map((row) => {
                const hasFortress = game.map.territories.some((territory) => territory.fortressOwnerId === row.id && territory.ownerId === row.id);
                const ownerProfiles = ownerProfilesById[String(row.id)] || [];
                const ownerProfile = ownerProfiles[0];
                return (
                  <div
                    key={row.id}
                    title={row.name}
                    style={{
                      flex: "0 0 auto",
                      height: 34,
                      minWidth: 132,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "0 10px 0 43px",
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${row.color}1f, rgba(0,0,0,0.34))`,
                      border: `1px solid ${row.color}66`,
                      position: "relative",
                      overflow: "hidden",
                      boxShadow: `0 0 9px ${row.color}16`,
                    }}
                  >
                    {ownerProfile ? (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: -4,
                          top: -10,
                          width: 48,
                          height: 54,
                          display: "grid",
                          placeItems: "center",
                          overflow: "hidden",
                          opacity: 0.95,
                          filter: `drop-shadow(0 0 7px ${row.color})`,
                        }}
                      >
                        <div style={{ transform: "scale(1.42)", transformOrigin: "center" }}>
                          <ProfileAvatar
                            profile={ownerProfile}
                            size={48}
                            showStars={false}
                            showDartOverlay={false}
                            noFrame
                          />
                        </div>
                      </div>
                    ) : null}
                    <span
                      title={`${row.owned} territoires possédés`}
                      style={{
                        minWidth: 26,
                        height: 22,
                        padding: "0 6px",
                        borderRadius: 7,
                        display: "grid",
                        placeItems: "center",
                        color: row.color,
                        fontSize: 10,
                        fontWeight: 1000,
                        background: `${row.color}18`,
                        border: `1px solid ${row.color}66`,
                      }}
                    >
                      {row.owned}
                    </span>
                    <span style={{ color: row.color, fontSize: 11, fontWeight: 1000, whiteSpace: "nowrap" }}>
                      {row.value}
                    </span>
                    {hasFortress ? <FortressLineIcon size={12} color="#fff" glowColor={row.color} title="Forteresse active" /> : null}
                  </div>
                );
              })}
            </div>
          }
        >
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <TerritoriesMapView
              country={country}
              map={game.map}
              ownerColors={ownerColors}
              selectedTerritoryId={game.turn.selectedTerritoryId}
              activeColor={themeColor}
              themeColor={themeColor}
              interactive={game.status === "playing" && game.config.targetSelectionMode !== "imposed"}
              isSelectableTerritoryId={(territoryId) =>
                game.map.territories.some((territory) => territory.id === territoryId && territory.playable !== false)
              }
              onSelectTerritory={handleMapSelect}
            />

            {selectedTerritory ? (
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  width: "min(300px, calc(100% - 24px))",
                  minHeight: 94,
                  padding: "8px 12px",
                  borderRadius: 18,
                  display: "grid",
                  gridTemplateColumns: "minmax(124px, 1.1fr) 82px minmax(46px, 0.55fr)",
                  alignItems: "center",
                  justifyItems: "center",
                  gap: 8,
                  background: "rgba(5,8,16,0.9)",
                  border: `1px solid ${(selectedTerritory.ownerId ? ownerColors[selectedTerritory.ownerId] : themeColor) || themeColor}77`,
                  boxShadow: `0 0 18px ${(selectedTerritory.ownerId ? ownerColors[selectedTerritory.ownerId] : themeColor) || themeColor}33, 0 8px 24px rgba(0,0,0,0.42)`,
                  backdropFilter: "blur(8px)",
                  pointerEvents: "none",
                  zIndex: 6,
                  overflow: "hidden",
                }}
              >
                {selectedTerritory.ownerId && (ownerProfilesById[String(selectedTerritory.ownerId)] || [])[0] ? (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      right: -18,
                      top: -12,
                      bottom: -12,
                      width: 116,
                      display: "grid",
                      placeItems: "center",
                      opacity: 0.18,
                      filter: `drop-shadow(0 0 14px ${(selectedTerritory.ownerId ? ownerColors[selectedTerritory.ownerId] : themeColor) || themeColor})`,
                    }}
                  >
                    <div style={{ transform: "scale(1.82)", transformOrigin: "center" }}>
                      <ProfileAvatar
                        profile={(ownerProfilesById[String(selectedTerritory.ownerId)] || [])[0]}
                        size={70}
                        showStars={false}
                        showDartOverlay={false}
                        noFrame
                      />
                    </div>
                  </div>
                ) : null}

                <div style={{ minWidth: 0, width: "100%", display: "grid", justifyItems: "center", alignContent: "center", gap: 2, position: "relative", zIndex: 1 }}>
                  <TerritorySilhouetteBadge
                    country={country}
                    territoryId={selectedTerritory.id}
                    svgPathId={selectedTerritory.svgPathId}
                    territoryValue={Number(selectedTerritory.value) || 0}
                    flagSrc={selectedMapTerritoryFlagSrc}
                    flagEmoji={selectedMapTerritoryFlagEmoji}
                    color={(selectedTerritory.ownerId ? ownerColors[selectedTerritory.ownerId] : themeColor) || themeColor}
                    height={48}
                    showValue={false}
                  />
                  <div
                    style={{
                      width: "100%",
                      textAlign: "center",
                      fontSize: 9.5,
                      lineHeight: 1.05,
                      fontWeight: 950,
                      color: "#fff",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textShadow: "0 1px 5px rgba(0,0,0,0.95)",
                    }}
                  >
                    {selectedMapTerritoryName}
                  </div>
                </div>
                <div style={{ position: "relative", zIndex: 1, display: "grid", placeItems: "center" }}>
                  <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 1000, color: (selectedTerritory.ownerId ? ownerColors[selectedTerritory.ownerId] : themeColor) || themeColor, textShadow: `0 0 12px ${((selectedTerritory.ownerId ? ownerColors[selectedTerritory.ownerId] : themeColor) || themeColor)}88` }}>
                    {Number(selectedTerritory.value) || 0}
                  </div>
                </div>
                <div aria-hidden style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }} />
              </div>
            ) : null}
          </div>
        </TerritoriesMapModal>
      )}

      <TerritoriesConfigLegend
        open={showConfigLegend}
        onClose={() => setShowConfigLegend(false)}
        color={activeColor}
        teamMode={Boolean(teams?.length)}
        fortressMode={gameMode === "fortress"}
        selectionMode={selectionMode}
        captureRule={captureRule}
        victoryLabel={victoryConfigLabel}
        victoryKind={victoryConfigKind}
        roundProgress={`${Math.max(1, Math.min(maxRounds, game.roundIndex || 1))}/${maxRounds}`}
        bullReplayEnabled={bullReplayEnabled}
        missPassTurn={missPassTurn}
      />

      <RulesModal
        open={showTerritoryListModal}
        onClose={() => setShowTerritoryListModal(false)}
        title="Valeurs des territoires"
        titleAddon={
          <InfoDot
            size={28}
            title="Comprendre les valeurs"
            content={valuesHelpContent}
            color={themeColor}
            glow={`${themeColor}88`}
          />
        }
      >
        {valuesModalContent({ close: () => setShowTerritoryListModal(false) })}
      </RulesModal>

      {/* KEYPAD (volée X01-like via ScoreInputHub) */}
      <div style={{ paddingBottom: 10 }}>
        <ScoreInputHub
          currentThrow={currentThrow}
          multiplier={multiplier}
          onSimple={() => {
            playTerritoriesSfx("dart_hit");
            setMultiplier(1);
          }}
          onDouble={() => {
            playTerritoriesSfx("dart_hit");
            setMultiplier(2);
          }}
          onTriple={() => {
            playTerritoriesSfx("triple");
            setMultiplier(3);
          }}
          onNumber={(n) => {
            playTerritoriesSfx("dart_hit");
            if (n === 0 && missPassTurn) {
              handleMissEndsTurn();
              return;
            }
            if (currentThrow.length >= 3) return;
            setCurrentThrow((prev) => [...prev, { v: n, mult: multiplier }]);
            setMultiplier(1);
          }}
          onBull={() => {
            if (multiplier === 2) playTerritoriesSfx("dbull");
            else playTerritoriesSfx("bull");
            if (currentThrow.length >= 3) return;
            setCurrentThrow((prev) => [...prev, { v: 25, mult: multiplier === 2 ? 2 : 1 }]);
            setMultiplier(1);
          }}
          onBackspace={() => {
            playTerritoriesSfx("dart_hit");
            setCurrentThrow((prev) => prev.slice(0, -1));
          }}
          onCancel={() => {
            playTerritoriesSfx("dart_hit");
            setCurrentThrow([]);
            setMultiplier(1);
          }}
          onValidate={() => {
            playTerritoriesSfx("dart_hit");
            validateThrow();
          }}
          // Territories: UI must stay compact; method tabs waste vertical space.
          // We keep "keypad" as the single visible method.
          switcherMode="hidden"
          showPlaceholders={false}
        />
      </div>
    </div>
  );
}

function KpiCard(props: {
  title: string;
  titleColor?: string;
  titleGlowColor?: string;
  value: string;
  valueColor: string;
  borderColor: string;
  glowColor: string;
  onClick?: () => void;
  valueFontSize?: number;
  allowWrap?: boolean;
  watermarkSrc?: string;
  watermarkEmoji?: string;
  centerValue?: boolean;
  fitValue?: boolean;
  fortressActive?: boolean;
  fortressColor?: string;
  valueAddon?: React.ReactNode;
  titleAddon?: React.ReactNode;
  showFortressIcon?: boolean;
  titleFontSize?: number;
}) {
  const fittedValueFontSize = props.fitValue
    ? Math.max(8, Math.min(props.valueFontSize ?? 13, 16 - Math.max(0, props.value.length - 10) * 0.22))
    : (props.valueFontSize ?? 20);
  const [watermarkFailed, setWatermarkFailed] = React.useState(false);
  React.useEffect(() => setWatermarkFailed(false), [props.watermarkSrc]);
  const showWatermarkImage = !!props.watermarkSrc && !watermarkFailed;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: "12px 14px",
        borderRadius: 16,
        background: "rgba(0,0,0,0.22)",
        border: props.fortressActive
          ? "2px dashed rgba(255,255,255,0.94)"
          : `1px solid ${props.borderColor}`,
        boxShadow: props.fortressActive
          ? `0 0 8px ${props.fortressColor || props.glowColor}, 0 0 20px ${props.glowColor}`
          : `0 0 18px ${props.glowColor}`,
        cursor: props.onClick ? "pointer" : "default",
        userSelect: "none",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      role={props.onClick ? "button" : undefined}
      tabIndex={props.onClick ? 0 : undefined}
      onClick={props.onClick}
      onKeyDown={(e) => {
        if (!props.onClick) return;
        if (e.key === "Enter" || e.key === " ") props.onClick();
      }}
    >
      {props.fortressActive ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            backgroundColor: props.fortressColor || props.borderColor,
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent 0 7px, rgba(255,255,255,0.34) 7px 10px, transparent 10px 18px)",
            opacity: 0.24,
          }}
        />
      ) : null}

      {showWatermarkImage || props.watermarkEmoji ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: showWatermarkImage ? 0.32 : 0.24,
            zIndex: 0,
          }}
        >
          {showWatermarkImage ? (
            <img
              src={props.watermarkSrc}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                filter: "saturate(1.15) contrast(1.05) drop-shadow(0 0 12px rgba(0,0,0,0.35))",
                mixBlendMode: "normal",
              }}
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => setWatermarkFailed(true)}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                fontSize: "clamp(38px, 10vw, 62px)",
                lineHeight: 1,
                fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
                filter: "saturate(1.1) drop-shadow(0 0 12px rgba(0,0,0,0.45))",
                transform: "scale(1.12)",
              }}
            >
              {props.watermarkEmoji}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.11) 55%, rgba(0,0,0,0.30) 100%)",
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 5,
          minWidth: 0,
        }}
      >
        <div
          style={{
            minWidth: 0,
            fontSize: props.titleFontSize ?? 11,
            letterSpacing: props.titleFontSize && props.titleFontSize < 10 ? 0.75 : 1.2,
            fontWeight: 950,
            color: props.titleColor || "rgba(255,255,255,0.78)",
            textShadow: props.titleColor
              ? `0 0 10px ${props.titleGlowColor || props.titleColor}, 0 0 18px ${props.titleGlowColor || props.titleColor}`
              : undefined,
            opacity: props.titleColor ? 1 : 0.78,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {props.title}
        </div>
        {props.titleAddon ? (
          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            {props.titleAddon}
          </div>
        ) : null}
      </div>
      {props.value ? (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: props.centerValue ? 2 : 4,
            flex: props.centerValue ? 1 : undefined,
            minHeight: 0,
            fontSize: fittedValueFontSize,
            fontWeight: 950,
            color: props.valueColor,
            whiteSpace: props.allowWrap ? "normal" : "nowrap",
            overflow: props.fitValue ? "visible" : "hidden",
            textOverflow: props.fitValue ? "clip" : "ellipsis",
            display: props.centerValue ? "grid" : props.allowWrap ? "-webkit-box" : "block",
            placeItems: props.centerValue ? "center" : undefined,
            textAlign: props.centerValue ? "center" : undefined,
            overflowWrap: props.fitValue ? "anywhere" : undefined,
            wordBreak: props.fitValue ? "normal" : undefined,
            WebkitLineClamp: props.allowWrap && !props.fitValue ? 3 : undefined,
            WebkitBoxOrient: props.allowWrap && !props.fitValue ? ("vertical" as any) : undefined,
            lineHeight: props.allowWrap ? 1.02 : undefined,
            maxHeight: props.fitValue ? "2.15em" : undefined,
            padding: props.centerValue
              ? props.valueAddon
                ? "0 44px 0 2px"
                : "0 2px"
              : undefined,
            textShadow: props.centerValue ? "0 1px 5px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.8)" : undefined,
          }}
        >
          {props.value}
        </div>
      ) : null}

      {props.valueAddon ? (
        <div
          style={{
            position: "absolute",
            right: 7,
            bottom: 8,
            zIndex: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            maxWidth: "46%",
            pointerEvents: "none",
          }}
        >
          {props.valueAddon}
        </div>
      ) : null}

      {props.fortressActive && props.showFortressIcon !== false ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: 7,
            bottom: 7,
            zIndex: 3,
            width: 24,
            height: 24,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background: "rgba(2,6,12,0.72)",
            border: "1px solid rgba(255,255,255,0.84)",
            boxShadow: `0 0 9px ${props.fortressColor || "#ffffff"}`,
          }}
        >
          <FortressLineIcon size={17} color="#fff" glowColor={props.fortressColor} />
        </div>
      ) : null}
    </div>
  );
}

function TerritoriesMapModal(props: {
  title: string;
  mapName: string;
  themeColor: string;
  headerFlagSrc?: string;
  headerFlagEmoji?: string;
  onClose: () => void;
  valuesModalContent: React.ReactNode | ((controls: { close: () => void }) => React.ReactNode);
  valuesModalTitleAddon?: React.ReactNode;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.68)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding:
          "calc(12px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left))",
      }}
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
          borderRadius: 20,
          overflow: "hidden",
          background: "rgba(12, 14, 26, 0.92)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto minmax(0, 1fr) auto",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderBottom: `1px solid ${props.themeColor}22`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            {props.headerFlagSrc ? (
              <img
                src={props.headerFlagSrc}
                alt={props.mapName}
                style={{
                  width: 46,
                  height: 28,
                  objectFit: "cover",
                  borderRadius: 7,
                  border: `1px solid ${props.themeColor}55`,
                  boxShadow: `0 0 12px ${props.themeColor}22`,
                }}
              />
            ) : props.headerFlagEmoji ? (
              <span role="img" aria-label={props.mapName} style={{ fontSize: 25, lineHeight: 1 }}>{props.headerFlagEmoji}</span>
            ) : (
              <div style={{ width: 46 }} />
            )}
          </div>

          <div
            style={{
              minWidth: 0,
              textAlign: "center",
              color: props.themeColor,
              fontSize: "clamp(12px, 3.4vw, 16px)",
              fontWeight: 1000,
              letterSpacing: 1.15,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: `0 0 12px ${props.themeColor}88`,
            }}
          >
            {props.mapName}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <InfoDot
              title="Valeurs des territoires"
              content={props.valuesModalContent}
              modalTitleAddon={props.valuesModalTitleAddon}
              color={props.themeColor}
              glow={`${props.themeColor}88`}
            />
            <button
              type="button"
              onClick={props.onClose}
              aria-label="Fermer la carte"
              title="Fermer"
              style={{
                width: 42,
                height: 42,
                padding: 0,
                borderRadius: 999,
                border: "2px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.48)",
                color: props.themeColor,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                boxShadow: `0 0 0 2px rgba(0,0,0,0.22), 0 0 22px ${props.themeColor}88, 0 0 44px ${props.themeColor}66`,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
                style={{ filter: `drop-shadow(0 0 10px ${props.themeColor})` }}
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        {props.legend}

        <div
          style={{
            position: "relative",
            flex: 1,
            minHeight: 260,
            padding: 12,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "clamp(320px, calc(100dvh - 205px), 760px)",
              minHeight: 0,
              position: "relative",
              borderRadius: 18,
              background: "rgba(12, 14, 26, 0.65)",
              border: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
}

type ProfileStatIconName = "darts" | "fortress" | "breach" | "capture" | "steal" | "lost" | "neutral" | "balance";

function ProfileStatLineIcon(props: { icon: ProfileStatIconName; size?: number }) {
  const size = props.size ?? 16;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (props.icon === "fortress") {
    return (
      <svg {...common}>
        <path d="M4 20V9h4V5h3v4h2V5h3v4h4v11H4Z" />
        <path d="M8 20v-5h8v5M4 12h16" />
      </svg>
    );
  }
  if (props.icon === "darts") {
    return (
      <svg {...common}>
        <path d="m5 19 10-10" />
        <path d="m13 5 6-1-1 6-3-1-1-3Z" />
        <path d="m5 19 4-1-3-3-1 4Z" />
      </svg>
    );
  }
  if (props.icon === "breach") {
    return (
      <svg {...common}>
        <path d="M4 20V9h4V5h3v4h2V5h3v4h4v11" />
        <path d="M4 12h6l-2 3 4 1-2 4h10" />
      </svg>
    );
  }
  if (props.icon === "neutral") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="7" />
        <path d="M8.5 12h7M12 8.5v7" />
      </svg>
    );
  }
  if (props.icon === "balance") {
    return (
      <svg {...common}>
        <path d="M4 8h16M7 5 4 8l3 3M17 13l3 3-3 3M20 16H4" />
      </svg>
    );
  }
  if (props.icon === "capture") {
    return (
      <svg {...common}>
        <path d="M6 21V4" />
        <path d="M6 5h10l-2.2 3L16 11H6" />
        <circle cx="18" cy="17" r="3" />
        <path d="m16.8 17 1 1 1.6-2" />
      </svg>
    );
  }
  if (props.icon === "steal") {
    return (
      <svg {...common}>
        <path d="M4 8h12" />
        <path d="m13 5 3 3-3 3" />
        <path d="M20 16H8" />
        <path d="m11 13-3 3 3 3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3 5 6v5c0 4.4 2.8 8.3 7 10 4.2-1.7 7-5.6 7-10V6l-7-3Z" />
      <path d="m9 10 6 6M15 10l-6 6" />
    </svg>
  );
}

function ProfileStatIconKpi(props: {
  icon: ProfileStatIconName;
  title: string;
  value: string;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <div
      title={props.title}
      aria-label={`${props.title} : ${props.value}`}
      style={{
        minWidth: 0,
        height: 34,
        padding: "0 5px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.042)",
        border: "1px solid rgba(255,255,255,0.085)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        color: props.disabled ? "rgba(255,255,255,0.28)" : (props.color || "rgba(255,255,255,0.84)"),
        overflow: "hidden",
      }}
    >
      <span style={{ display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <ProfileStatLineIcon icon={props.icon} size={15} />
      </span>
      <strong
        style={{
          minWidth: 0,
          fontSize: 12.5,
          lineHeight: 1,
          fontWeight: 1000,
          color: props.disabled ? "rgba(255,255,255,0.28)" : (props.color || "#fff"),
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {props.disabled ? "—" : props.value}
      </strong>
    </div>
  );
}

function ProfileStatKpi(props: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        minWidth: 0,
        minHeight: 38,
        padding: "5px 7px",
        borderRadius: 11,
        background: props.color ? `${props.color}14` : "rgba(255,255,255,0.045)",
        border: `1px solid ${props.color ? `${props.color}55` : "rgba(255,255,255,0.09)"}`,
        boxShadow: props.color ? `0 0 12px ${props.color}18` : undefined,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: props.label.length > 10 ? 7.1 : 8.5,
          lineHeight: 1,
          opacity: 0.76,
          fontWeight: 950,
          letterSpacing: 0.45,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {props.label}
      </div>
      <div
        style={{
          marginTop: 3,
          fontSize: 12.5,
          lineHeight: 1,
          fontWeight: 1000,
          color: props.color || "#fff",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

function TerritoriesEndModal(props: {
  themeColor: string;
  winnerOwnerId: string | null;
  ownersOrder: string[];
  players: any[];
  teams?: any[] | null;
  ownedByOwner: Record<string, number>;
  ownedValueByOwner: Record<string, number>;
  victoryMode: "territories" | "regions" | "time" | "majority" | "value" | "conquest";
  objective: number;
  onReplay: () => void;
  onQuit: () => void;
}) {
  const winnerId = props.winnerOwnerId || "";

  const winnerLabel = React.useMemo(() => {
    if (!winnerId) return "Égalité";
    if (props.teams?.length) {
      const t = props.teams.find((x) => String(x.id) === String(winnerId));
      return t?.name || "Équipe";
    }
    const p = props.players.find((x) => String(x.id) === String(winnerId));
    return p?.name || p?.displayName || "Joueur";
  }, [winnerId, props.players, props.teams]);

  const recap = React.useMemo(() => {
    const rows = props.ownersOrder.map((id) => {
      const label = props.teams?.length
        ? props.teams.find((t) => String(t.id) === String(id))?.name || "Équipe"
        : props.players.find((p) => String(p.id) === String(id))?.name || "Joueur";
      return {
        id,
        label,
        owned: props.ownedByOwner[id] || 0,
        value: props.ownedValueByOwner[id] || 0,
      };
    });
    rows.sort((a, b) => props.victoryMode === "value"
      ? b.value - a.value || b.owned - a.owned
      : b.owned - a.owned || b.value - a.value);
    return rows;
  }, [props.ownersOrder, props.ownedByOwner, props.ownedValueByOwner, props.players, props.teams, props.victoryMode]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(18,20,28,0.95), rgba(8,9,12,0.95))",
          border: `1px solid ${props.themeColor}55`,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 18px 60px rgba(0,0,0,0.65)`,
          padding: 14,
        }}
      >
        <div style={{ textAlign: "center", padding: "6px 4px 10px" }}>
          <div style={{ fontSize: 12, letterSpacing: 0.8, fontWeight: 950, opacity: 0.85, textTransform: "uppercase" }}>
            Partie terminée
          </div>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 1000, color: props.themeColor }}>
            {winnerLabel}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
            {props.victoryMode === "majority"
              ? `Majorité en nombre après ${props.objective} rounds`
              : props.victoryMode === "value"
                ? `Majorité en valeur après ${props.objective} rounds`
                : props.victoryMode === "conquest"
                  ? "Conquête totale de la carte"
                  : `Victoire par ${props.victoryMode === "time" ? "temps" : props.victoryMode === "regions" ? "régions" : "territoires"}${props.victoryMode === "time" ? ` (${props.objective} min)` : ` (objectif: ${props.objective})`}`}
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, opacity: 0.85, marginBottom: 8, textTransform: "uppercase" }}>
            {props.victoryMode === "value" ? "Classement par valeur" : "Récap possession"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recap.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: r.id === winnerId ? `linear-gradient(180deg, ${props.themeColor}22, rgba(0,0,0,0.15))` : "rgba(0,0,0,0.18)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.label}
                </div>
                <div style={{ textAlign: "right", lineHeight: 1.05 }}>
                  <div style={{ fontSize: 13, fontWeight: 1000, color: props.themeColor }}>
                    {props.victoryMode === "value" ? `${r.value} pts` : `${r.owned} territoires`}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 10, opacity: 0.68, fontWeight: 850 }}>
                    {props.victoryMode === "value" ? `${r.owned} territoires` : `${r.value} pts cumulés`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            onClick={props.onReplay}
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              padding: "12px 10px",
              fontWeight: 950,
              cursor: "pointer",
              color: "#fff",
            }}
          >
            Rejouer
          </button>
          <button
            onClick={props.onQuit}
            style={{
              borderRadius: 16,
              border: `1px solid ${props.themeColor}55`,
              background: `linear-gradient(180deg, ${props.themeColor}33, rgba(0,0,0,0.10))`,
              padding: "12px 10px",
              fontWeight: 1000,
              cursor: "pointer",
              color: props.themeColor,
            }}
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}