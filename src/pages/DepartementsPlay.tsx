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
import { buildTerritoriesMap } from "../territories/map";
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

import { pushTerritoriesHistory } from "../lib/territories/territoriesStats";
import { speak } from "../lib/voice";

// Config payload saved by DepartementsConfig.tsx
export type TerritoriesConfigPayload = {
  players: number;
  teamSize: 1 | 2 | 3;
  teamCount?: number;
  selectedIds: string[];
  teamsById?: Record<string, number>;
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
  const norm: UIDart[] = [...(darts || [])];
  while (norm.length < 3) norm.push({ v: 0, mult: 1 });
  return norm.slice(0, 3).map(dartScore);
}

type PlayerLiveStats = { darts: number; captures: number; steals: number; lost: number; fortresses: number; breaches: number };

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
}) {
  const iconShell: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    color: props.color,
    background: "rgba(0,0,0,0.30)",
    border: `1px solid ${props.color}66`,
    boxShadow: `0 0 10px ${props.color}22`,
  };

  const commonSvg = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  return (
    <div
      style={{
        marginTop: "auto",
        paddingTop: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        minHeight: 30,
      }}
    >
      <div style={iconShell} title={props.teamMode ? "Mode équipes" : "Mode solo"} aria-label={props.teamMode ? "Mode équipes" : "Mode solo"}>
        {props.teamMode ? (
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
        )}
      </div>

      <div style={iconShell} title={props.fortressMode ? "Mode forteresses" : "Mode conquête"} aria-label={props.fortressMode ? "Mode forteresses" : "Mode conquête"}>
        {props.fortressMode ? (
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
        )}
      </div>

      {props.timeRemaining ? (
        <div
          title="Temps restant"
          style={{
            minWidth: 42,
            height: 30,
            padding: "0 7px",
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            color: props.color,
            background: "rgba(0,0,0,0.30)",
            border: `1px solid ${props.color}55`,
            fontSize: 10,
            fontWeight: 950,
          }}
        >
          {props.timeRemaining}
        </div>
      ) : null}
    </div>
  );
}

function TerritoryOwnerBadge(props: {
  ownerId?: string;
  hasFortress: boolean;
  players: TerritoriesPlayer[];
  profileById: Record<string, any>;
  ownerColor?: string;
}) {
  const members = props.ownerId
    ? props.players.filter((player) => (player.teamId || player.id) === props.ownerId)
    : [];

  if (!props.ownerId || !members.length) {
    return <span style={{ fontSize: 10, fontWeight: 900, opacity: 0.42, whiteSpace: "nowrap" }}>LIBRE</span>;
  }

  const color = props.ownerColor || members[0]?.color || "#ffffff";
  return (
    <div
      title={members.map((member) => member.name).join(" · ")}
      style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, flex: "0 0 auto" }}
    >
      {props.hasFortress ? (
        <FortressLineIcon size={22} color="#fff" glowColor={color} title="Forteresse active" />
      ) : null}
      <div style={{ display: "flex", alignItems: "center", paddingLeft: members.length > 1 ? 7 : 0 }}>
        {members.slice(0, 3).map((member, index) => (
          <div
            key={member.id}
            style={{
              width: 32,
              height: 32,
              marginLeft: index === 0 ? 0 : -8,
              borderRadius: 999,
              overflow: "hidden",
              border: `2px solid ${color}`,
              background: "rgba(2,5,10,0.92)",
              boxShadow: `0 0 8px ${color}88`,
              position: "relative",
              zIndex: members.length - index,
            }}
          >
            <ProfileAvatar
              profile={props.profileById[member.id] ?? { id: member.id, name: member.name }}
              size={28}
              showStars={false}
              showDartOverlay={false}
              noFrame
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function captureAnnouncementPhrases(lang: string, playerName: string, territoryName: string, stolen: boolean): string[] {
  if (lang === "fr") {
    return stolen
      ? [
          `${playerName} arrache ${territoryName} à l'adversaire !`,
          `${territoryName} change de camp. Belle conquête de ${playerName} !`,
          `Coup stratégique ! ${playerName} prend le contrôle de ${territoryName}.`,
          `${playerName} renverse la défense et s'empare de ${territoryName}.`,
          `Territoire volé ! ${territoryName} appartient maintenant à ${playerName}.`,
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
        `${playerName} steals ${territoryName} from the opponent!`,
        `${territoryName} changes sides. Great capture by ${playerName}!`,
        `${playerName} takes control of ${territoryName}.`,
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
}) => {
  const { gameMode, fortressVictoryMode, selectionMode, captureRule, victoryMode, winTerritories, winRegions, timeLimitMin, maxRounds, maxFortressesPerOwner, valueDifficultyLabel, valueTargetMin, valueTargetMax } = cfg;
  if (gameMode === "fortress") {
    return `FORTERESSES

Départ
- Chaque joueur ou équipe reçoit exactement le même nombre de territoires. Si la carte ne se divise pas parfaitement, le surplus reste neutre au départ.
- Chaque camp possède une couleur.

Valeurs des territoires
- Elles suivent la surface réelle de la carte : les plus grands territoires ont les valeurs les plus élevées.
- Chaque territoire jouable possède une valeur différente. Difficulté ${valueDifficultyLabel}, plage ${valueTargetMin} à ${valueTargetMax}. Une carte de plus de 180 territoires limite la partie à 180 cibles et grise les autres.

Défendre
- Choisis un de tes territoires et réalise EXACTEMENT sa valeur.
- Il devient une forteresse. Chaque camp peut en maintenir jusqu'à ${maxFortressesPerOwner} simultanément.
- Lorsque cette limite est atteinte, une nouvelle forteresse déplace automatiquement la plus ancienne.

Attaquer
- Territoire adverse sans forteresse : une réussite exacte le conquiert.
- Territoire adverse protégé : une première réussite exacte brise la forteresse ; une seconde réussite exacte conquiert le territoire.

Cible
- ${selectionMode === "free" ? "Choix libre sur la carte." : "Volée directe : joue sans sélectionner de cible ; le total désigne automatiquement le territoire correspondant."}

Victoire
- ${fortressVictoryMode === "conquest"
    ? "Conquête totale : posséder toute la carte."
    : fortressVictoryMode === "value"
      ? `Majorité en valeur : la distribution initiale équilibre les valeurs entre les camps. Après ${maxRounds} rounds, le total cumulé le plus élevé gagne.`
      : `Majorité en nombre : posséder le plus de territoires après ${maxRounds} rounds.`}`;
  }

  const cap = captureRule === "gte" ? "GTE : total supérieur ou égal" : "EXACT : total strictement égal";
  return `CONQUÊTE CLASSIQUE

But
- Capturer les territoires neutres ou adverses.

Valeurs des territoires
- Elles suivent la surface réelle de la carte : les plus grands territoires ont les valeurs les plus élevées.
- Chaque territoire jouable possède une valeur différente. Difficulté ${valueDifficultyLabel}, plage ${valueTargetMin} à ${valueTargetMax}. Une carte de plus de 180 territoires limite la partie à 180 cibles et grise les autres.

Cible
- ${selectionMode === "free" ? "Choisis précisément la cible sur la carte avant la volée." : "Volée directe : joue immédiatement ; le total de la volée désigne automatiquement l’unique territoire correspondant."}

Capture
- ${cap} à la valeur du territoire, sur une volée de 1 à 3 fléchettes.

Victoire
- ${victoryMode === "territories" ? `Atteindre ${winTerritories} territoires.` : victoryMode === "regions" ? `Atteindre ${winRegions} régions complètes.` : `Après ${timeLimitMin} minutes, le plus de territoires gagne.`}
- Si l'objectif n'est pas atteint avant ${maxRounds} rounds, le plus de possessions gagne.`;
};

export default function DepartementsPlay(props: any) {
  useFullscreenPlay();
  const { theme } = useTheme();
  const { lang } = useLang();

  // Map is heavy vertically on mobile -> open it in a dedicated modal via a compact card.
  const [showMapModal, setShowMapModal] = React.useState(false);
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
  };

  const mapId = String(effectiveCfg.mapId || "FR");
  const country = normalizeMapIdToCountry(mapId);

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
          name: profileById[id]?.name || profileById[id]?.displayName || shortName(id),
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
      name: profileById[id]?.name || profileById[id]?.displayName || shortName(id),
      color: OWNER_COLORS[i % OWNER_COLORS.length] || "#52f7ff",
      capturedTerritories: [],
    }));

    const colors: Record<string, string> = {};
    for (const p of ps) colors[p.id] = p.color;
    return { players: ps, teams: undefined as TerritoriesTeam[] | undefined, ownerColors: colors };
  }, [effectiveCfg.teamSize, effectiveCfg.teamCount, JSON.stringify(effectiveCfg.selectedIds), JSON.stringify(effectiveCfg.teamsById), profileById]);

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
  }, [country, gameMode, selectionMode, captureRule, maxRounds, maxFortressesPerOwner, victoryCondition, players, teams, territoryValueCalibration]);

  const [game, setGame] = React.useState<TerritoriesGameState>(initialState);
  const submitLockRef = React.useRef(false);
  const backNavigationLockedRef = React.useRef(false);
  const lastCaptureVoiceIndexRef = React.useRef(-1);

  // Score input state
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

  const [playerStats, setPlayerStats] = React.useState<Record<string, PlayerLiveStats>>(() => {
    const out: Record<string, PlayerLiveStats> = {};
    for (const p of players) out[p.id] = { darts: 0, captures: 0, steals: 0, lost: 0, fortresses: 0, breaches: 0 };
    return out;
  });

  React.useLayoutEffect(() => {
    setGame(initialState);
    setCurrentThrow([]);
    setMultiplier(1);
    const out: Record<string, PlayerLiveStats> = {};
    for (const p of players) out[p.id] = { darts: 0, captures: 0, steals: 0, lost: 0, fortresses: 0, breaches: 0 };
    setPlayerStats(out);
  }, [initialState, players]);

  const activePlayer = React.useMemo(
    () => game.players.find((p) => p.id === game.turn.activePlayerId),
    [game.players, game.turn.activePlayerId],
  );
  const activeColor = activePlayer?.color || theme?.accent || "#52f7ff";
  const themeColor = theme?.accent || activeColor;
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
  const totalMapValue = React.useMemo(
    () => game.map.territories.reduce((sum, territory) => (
      territory.playable === false
        ? sum
        : sum + Math.max(0, Number(territory.value) || 0)
    ), 0),
    [game.map.territories],
  );

  const selectedTerritory = React.useMemo(() => {
    const id = game.turn.selectedTerritoryId;
    if (!id) return null;
    return game.map.territories.find((x) => x.id === id) || null;
  }, [game.turn.selectedTerritoryId, game.map.territories]);

  const objectiveValueLabel = selectedTerritory ? String(selectedTerritory.value) : "—";
  const selectedTerritoryCountryCode =
    country === "UN" || country === "FR"
      ? null
      : getTerritoryCountryCode(country, selectedTerritory?.id);
  const selectedTerritoryDisplayName = selectedTerritory
    ? country === "UN"
      ? (UN_REGION_NAMES_FR[String(selectedTerritory.id)] || String(selectedTerritory.name || selectedTerritory.id))
      : country === "FR"
        ? String(selectedTerritory.name || selectedTerritory.id)
        : getLocalizedTerritoryName(
            selectedTerritoryCountryCode,
            lang,
            String(selectedTerritory.name || selectedTerritory.id),
          )
    : "—";
  const selectedTerritoryHasFortress = Boolean(
    selectedTerritory?.ownerId
    && selectedTerritory.fortressOwnerId === selectedTerritory.ownerId,
  );
  const selectedTerritoryOwnerColor = selectedTerritory?.ownerId
    ? ownerColors[selectedTerritory.ownerId]
    : undefined;
  const territoryNameLabel = selectedTerritory ? selectedTerritoryDisplayName : "—";
  const territoryFlagSrc =
    country === "UN"
      ? findUnRegionFlag(selectedTerritory?.id)
      : country === "FR"
        ? getFrenchDepartmentFlagUrl(selectedTerritory?.id)
        : findTerritoryFlagByCountry(selectedTerritoryCountryCode);
  // Les régions UN et les départements français utilisent leur visuel dédié.
  // Les emojis restent uniquement le secours des territoires ISO classiques.
  const territoryFlagEmoji =
    country === "UN"
      ? undefined
      : country === "FR"
        ? "🇫🇷"
        : isoCodeToFlagEmoji(selectedTerritoryCountryCode);

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

  function validateThrow() {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setTimeout(() => (submitLockRef.current = false), 250);

    if (game.status !== "playing") return;

    // Free mode requires a selected territory
    if (game.config.targetSelectionMode === "free" && !game.turn.selectedTerritoryId) return;

    const dartScores = computeVisitScores(currentThrow);

    // Snapshot before applying
    const activeId = game.turn.activePlayerId;
    const activeOwner = getOwnerIdForPlayer(game, activeId) || activeId;

    const r1 = applyVisit(game, dartScores);
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

    if (capturedTid) {
      const capturedTerritory = next.map.territories.find((territory) => territory.id === capturedTid);
      const capturedCode = getTerritoryCountryCode(country, capturedTid);
      const capturedName = getLocalizedTerritoryName(
        capturedCode,
        lang,
        capturedTerritory?.name || capturedTid,
      );
      const playerName = activePlayer?.name || activeOwnerLabel || "Joueur";
      const stolen = Boolean(beforeOwner && beforeOwner !== activeOwner);
      const phrases = captureAnnouncementPhrases(lang, playerName, capturedName, stolen);
      let phraseIndex = Math.floor(Math.random() * phrases.length);
      if (phrases.length > 1 && phraseIndex === lastCaptureVoiceIndexRef.current) {
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
      lastCaptureVoiceIndexRef.current = phraseIndex;
      const phrase = phrases[phraseIndex];
      if (phrase) {
        window.setTimeout(() => {
          speak(phrase, {
            lang: TTS_LANG_BY_APP_LANG[lang] || "fr-FR",
            rate: 0.94,
            pitch: 1.02,
            interrupt: false,
          });
        }, 260);
      }
    }

    setPlayerStats((prev) => {
      const out = { ...prev };
      const current = out[activeId] || { darts: 0, captures: 0, steals: 0, lost: 0, fortresses: 0, breaches: 0 };
      out[activeId] = {
        ...current,
        darts: current.darts + 3,
        fortresses: current.fortresses + (fortressBuilt ? 1 : 0),
        breaches: current.breaches + (fortressBroken ? 1 : 0),
      };

      if (capturedEvent) {
        out[activeId] = {
          ...out[activeId],
          captures: (out[activeId]?.captures || 0) + 1,
          steals: (out[activeId]?.steals || 0) + (beforeOwner && beforeOwner !== activeOwner ? 1 : 0),
        };
        if (previousOwnerPlayerId && beforeOwner !== activeOwner) {
          const previous = out[previousOwnerPlayerId] || { darts: 0, captures: 0, steals: 0, lost: 0, fortresses: 0, breaches: 0 };
          out[previousOwnerPlayerId] = { ...previous, lost: previous.lost + 1 };
        }
      }
      return out;
    });

    setCurrentThrow([]);
    setMultiplier(1);
    setGame(next.status === "playing" ? endTurn(next).state : next);
  }

  const replay = React.useCallback(() => {
    setGame(initialState);
    setCurrentThrow([]);
    setMultiplier(1);
    const reset: Record<string, PlayerLiveStats> = {};
    for (const player of players) reset[player.id] = { darts: 0, captures: 0, steals: 0, lost: 0, fortresses: 0, breaches: 0 };
    setPlayerStats(reset);
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
    const total: PlayerLiveStats = { darts: 0, captures: 0, steals: 0, lost: 0, fortresses: 0, breaches: 0 };
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

    for (const [pid, st] of Object.entries(playerStats || {})) {
      const oid = ownerByPlayer[pid] || pid;
      capturedByOwner[oid] = (capturedByOwner[oid] || 0) + (st?.captures || 0);
      dartsByOwner[oid] = (dartsByOwner[oid] || 0) + (st?.darts || 0);
      stealsByOwner[oid] = (stealsByOwner[oid] || 0) + (st?.steals || 0);
      lostByOwner[oid] = (lostByOwner[oid] || 0) + (st?.lost || 0);
      fortressesByOwner[oid] = (fortressesByOwner[oid] || 0) + (st?.fortresses || 0);
      breachesByOwner[oid] = (breachesByOwner[oid] || 0) + (st?.breaches || 0);
    }

    const winner = winnerOwnerId || ownersOrder[0] || "";
    const winnerTeamIndex = Math.max(0, ownersOrder.indexOf(winner));

    const now = Date.now();
    const durationMs = Math.max(0, now - (game.meta?.startedAtMs || now));

    pushTerritoriesHistory({
      id: `territories_${now}_${Math.random().toString(16).slice(2)}`,
      ts: now,
      mapId,
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
      domination: ownersOrder.map((oid) => ownedCounts[oid] || 0),
      dominationValue: ownersOrder.map((oid) => ownedValueByOwner[oid] || 0),
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
    winRegions,
    winTerritories,
    timeLimitMin,
    winnerOwnerId,
    playerStats,
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
              ? `${activeColor}20`
              : ownerColor
                ? `${ownerColor}12`
                : "rgba(255,255,255,0.04)",
          border: disabled
            ? "1px solid rgba(160,166,180,0.14)"
            : selected
              ? `2px solid ${activeColor}`
              : `1px solid ${ownerColor ? `${ownerColor}55` : "rgba(255,255,255,0.08)"}`,
          boxShadow: selected ? `0 0 18px ${activeColor}44` : "none",
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
            {selected ? <span style={{ color: activeColor, fontSize: 10 }}>✓</span> : null}
          </div>
          <div style={{ fontSize: 10, opacity: 0.62, marginTop: 2 }}>
            {tt.id}{canSelect ? (game.config.targetSelectionMode === "by_score" ? " · cible manuelle pour cette volée" : " · toucher pour sélectionner") : ""}
          </div>
        </div>

        <TerritoryOwnerBadge
          ownerId={tt.ownerId}
          hasFortress={hasFortress}
          players={game.players}
          profileById={profileById}
          ownerColor={ownerColor}
        />
      </button>
    );
  };

  const valuesHelpContent = (
    <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
      <div>
        Chaque territoire jouable possède une valeur strictement unique. Les valeurs suivent la surface réelle de la carte : les territoires les plus grands demandent les scores les plus élevés.
      </div>
      <div>
        Niveau <strong>{territoryValueCalibration.label}</strong> · plage réelle <strong>{assignedValueMin}–{assignedValueMax}</strong>.
      </div>
      {disabledTerritoryCount > 0 ? (
        <div>
          {playableTerritoryCount} territoires sont jouables. Les {disabledTerritoryCount} autres sont grisés et exclus de cette partie afin de conserver au maximum 180 valeurs uniques.
        </div>
      ) : null}
      {gameMode === "fortress" ? (
        <div>Le contour blanc pointillé et l’icône de château indiquent une forteresse active.</div>
      ) : null}
      <div>
        {game.config.targetSelectionMode === "free"
          ? "Touchez une carte pour sélectionner immédiatement le territoire et revenir au clavier."
          : "En VOLÉE DIRECTE, aucune sélection n’est obligatoire. Vous pouvez néanmoins toucher une carte pour définir une cible manuelle uniquement pour la volée en cours ; sans sélection, le total choisit automatiquement le territoire correspondant."}
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
                  border: `1px solid ${active ? `${activeColor}AA` : "rgba(255,255,255,0.12)"}`,
                  background: active ? `${activeColor}20` : "rgba(255,255,255,0.045)",
                  color: active ? activeColor : "rgba(255,255,255,0.82)",
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
        right={<InfoDot title="Règles" content={RULES_TEXT({ gameMode, fortressVictoryMode, selectionMode, captureRule, victoryMode, winTerritories, winRegions, timeLimitMin, maxRounds, maxFortressesPerOwner, valueDifficultyLabel: territoryValueCalibration.label, valueTargetMin: assignedValueMin, valueTargetMax: assignedValueMax })} />}
      />

      {/* END OF MATCH MODAL */}
      {game.status === "game_end" && (
        <TerritoriesEndModal
          themeColor={activeColor}
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

      {/* ACTIVE PLAYER HEADER (style proche GolfPlay) */}
      <div style={{ padding: "10px 12px" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 12,
            alignItems: "stretch",
            padding: "12px 12px",
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
                  profile={profileById[game.turn.activePlayerId] ?? { id: game.turn.activePlayerId, name: activePlayer?.name }}
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
                boxShadow: `0 0 24px ${activeColor}aa`,
                outline: `2px solid ${activeColor}66`,
                outlineOffset: 2,
              }}
            >
              <ProfileAvatar
                profile={profileById[game.turn.activePlayerId] ?? { id: game.turn.activePlayerId, name: activePlayer?.name }}
                size={82}
                ringColor={activeColor}
                textColor="#fff"
                showStars={false}
              />
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 15,
                fontWeight: 950,
                color: activeColor,
                textAlign: "center",
                width: "100%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {activePlayer?.name || "Player"}
            </div>

            <HeaderModeIcons
              teamMode={Boolean(teams?.length)}
              fortressMode={gameMode === "fortress"}
              color={activeColor}
              timeRemaining={timeRemaining}
            />
          </div>

          {/* Right: live stats as compact KPI cards */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", zIndex: 1, minWidth: 0 }}>
            <div
              style={{
                width: "clamp(170px, 45vw, 238px)",
                minWidth: 0,
                padding: 8,
                borderRadius: 16,
                background: "rgba(0,0,0,0.22)",
                border: `1px solid ${activeColor}55`,
                boxShadow: `0 0 18px ${activeColor}1f`,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 6,
                alignContent: "center",
              }}
            >
              <ProfileStatKpi label="Possessions" value={`${possessionsForActive}/${possessionsGoal}`} color={activeColor} />
              <ProfileStatKpi label="Valeur" value={`${possessionValueForActive}/${totalMapValue}`} color={fortressVictoryMode === "value" ? activeColor : undefined} />
              <ProfileStatKpi label="Fléchettes" value={String(activeStats.darts)} />
              <ProfileStatKpi label="Captures" value={String(activeStats.captures)} />
              {gameMode === "fortress" ? <ProfileStatKpi label="Forteresses" value={String(activeStats.fortresses)} /> : null}
              {gameMode === "fortress" ? <ProfileStatKpi label="Brèches" value={String(activeStats.breaches)} /> : null}
              <ProfileStatKpi label="Vols" value={String(activeStats.steals)} />
              <ProfileStatKpi label="Perdus" value={String(activeStats.lost)} />
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
          value={objectiveValueLabel}
          valueColor={activeColor}
          borderColor={`${activeColor}55`}
          glowColor={`${activeColor}22`}
          centerValue
        />
        <KpiCard
          title="TERRITOIRE"
          titleColor={activeColor}
          titleGlowColor={`${activeColor}AA`}
          value={territoryNameLabel}
          valueColor="#fff"
          borderColor="rgba(255,255,255,0.12)"
          glowColor="rgba(0,0,0,0.0)"
          valueFontSize={13}
          allowWrap
          centerValue
          fitValue
          watermarkSrc={territoryFlagSrc || undefined}
          watermarkEmoji={territoryFlagEmoji}
          fortressActive={selectedTerritoryHasFortress}
          fortressColor={selectedTerritoryOwnerColor || activeColor}
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
          title={country === "FR" ? "CARTE — France" : "CARTE"}
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
            <div className="dc-scroll-thin" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "9px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {classement.map((row) => {
                const hasFortress = game.map.territories.some((territory) => territory.fortressOwnerId === row.id && territory.ownerId === row.id);
                return (
                  <div key={row.id} style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 999, background: "rgba(0,0,0,0.28)", border: `1px solid ${row.color}66` }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: row.color, boxShadow: `0 0 9px ${row.color}` }} />
                    <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, fontWeight: 950 }}>{row.name}</span>
                    <span style={{ color: row.color, fontSize: 11, fontWeight: 1000 }}>
                      {row.owned}<span style={{ opacity: 0.72, marginLeft: 4 }}>• {row.value} pts</span>
                    </span>
                    {hasFortress ? <span title="Forteresse active" style={{ fontSize: 12 }}>🛡</span> : null}
                  </div>
                );
              })}
            </div>
          }
        >
          <TerritoriesMapView
            country={country}
            map={game.map}
            ownerColors={ownerColors}
            selectedTerritoryId={game.turn.selectedTerritoryId}
            activeColor={activeColor}
            themeColor={themeColor}
            interactive={game.status === "playing" && game.config.targetSelectionMode !== "imposed"}
            isSelectableTerritoryId={(territoryId) =>
              game.map.territories.some((territory) => territory.id === territoryId && territory.playable !== false)
            }
            onSelectTerritory={handleMapSelect}
          />
        </TerritoriesMapModal>
      )}

      {/* KEYPAD (volée X01-like via ScoreInputHub) */}
      <div style={{ paddingBottom: 10 }}>
        <ScoreInputHub
          currentThrow={currentThrow}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onNumber={(n) => {
            if (currentThrow.length >= 3) return;
            setCurrentThrow((prev) => [...prev, { v: n, mult: multiplier }]);
            setMultiplier(1);
          }}
          onBull={() => {
            if (currentThrow.length >= 3) return;
            setCurrentThrow((prev) => [...prev, { v: 25, mult: multiplier === 2 ? 2 : 1 }]);
            setMultiplier(1);
          }}
          onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
          onCancel={() => {
            setCurrentThrow([]);
            setMultiplier(1);
          }}
          onValidate={validateThrow}
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
          fontSize: 11,
          letterSpacing: 1.2,
          fontWeight: 950,
          color: props.titleColor || "rgba(255,255,255,0.78)",
          textShadow: props.titleColor
            ? `0 0 10px ${props.titleGlowColor || props.titleColor}, 0 0 18px ${props.titleGlowColor || props.titleColor}`
            : undefined,
          opacity: props.titleColor ? 1 : 0.78,
          position: "relative",
          zIndex: 2,
        }}
      >
        {props.title}
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
            lineHeight: props.allowWrap ? 1.08 : undefined,
            padding: props.centerValue ? "0 2px" : undefined,
            textShadow: props.centerValue ? "0 1px 5px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.8)" : undefined,
          }}
        >
          {props.value}
        </div>
      ) : null}

      {props.fortressActive ? (
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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontWeight: 950, letterSpacing: 0.8, fontSize: 12, opacity: 0.9 }}>{props.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <InfoDot
              title="Valeurs des territoires"
              content={props.valuesModalContent}
              modalTitleAddon={props.valuesModalTitleAddon}
            />
            <button
              onClick={props.onClose}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.30)",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Fermer
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

function ProfileStatKpi(props: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        minWidth: 0,
        minHeight: 43,
        padding: "6px 7px",
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
          fontSize: 8.5,
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
          marginTop: 4,
          fontSize: 13,
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