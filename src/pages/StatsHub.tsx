// ============================================
// src/pages/StatsHub.tsx — Stats + Historique + Training (v2 complet)
// ============================================
import React from "react";
import { useSport } from "../contexts/SportContext";
import { History } from "../lib/history";
import { loadStore } from "../lib/storage";
import StatsPlayerDashboard, {
  type PlayerDashboardStats,
  GoldPill,
  ProfilePill,
} from "../components/StatsPlayerDashboard";
import { useQuickStats } from "../hooks/useQuickStats";
import { getOrRebuildStatsIndex } from "../lib/stats/rebuildStatsFromHistory";
import HistoryPage from "./HistoryPage";
import MolkkyStatsHistoryPage from "./molkky/MolkkyStatsHistoryPage";

import SparklinePro from "../components/SparklinePro";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import type { Dart as UIDart } from "../lib/types";
import {
  getCricketProfileStats,
  getX01MultiLegsSetsForProfile,
  getBatardProfileStats,
  type X01MultiLegsSets,
  type BatardProfileStats,
} from "../lib/statsBridge";
import type { CricketProfileStats } from "../lib/cricketStats";

// ---- Utils ----
const STATSHUB_HISTORY_LIGHT_CAP = 300;
const STATSHUB_HISTORY_HYDRATE_CAP = 120;
const STATSHUB_STORE_HISTORY_CAP = 200;

function takeRecent<T>(arr: T[], cap: number): T[] {
  if (!Array.isArray(arr)) return [];
  if (!Number.isFinite(cap) || cap <= 0) return arr.slice();
  return arr.length > cap ? arr.slice(-cap) : arr.slice();
}

// toArrLoc: normalise unknown "players/teams" shapes to array (prevents TDZ crash in hooks)
function toArrLoc<T,>(v: any): T[] {
  if (Array.isArray(v)) return v as T[];
  // Support object maps (id -> value)
  if (v && typeof v === "object") {
    try {
      return Object.values(v) as T[];
    } catch {
      return [];
    }
  }
  // Support JSON-encoded arrays (defensive for legacy/local storage)
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}


// ---- Sport adapters (minimal) ----
type DiceUnified = {
  sport?: string;
  mode?: string;
  players?: Array<{ id: string; name: string; win?: boolean; score?: number }>;
  global?: { diceCount?: number; targetScore?: number };
};

function buildDiceDashboardForPlayer(playerId: string, playerName: string, rows: any[]): PlayerDashboardStats {
  const mine = (rows || []).filter((r: any) =>
    (r?.payload?.stats?.players || []).some((p: any) => p?.id === playerId)
  );

  const sessions = mine.length || 0;
  const wins = mine.filter((r: any) => (r?.payload?.stats?.players || []).some((p: any) => p?.id === playerId && p?.win)).length;
  const winRatePct = sessions ? Math.round((wins / sessions) * 100) : 0;

  const scores = mine.map((r: any) => {
    const p = (r?.payload?.stats?.players || []).find((x: any) => x?.id === playerId);
    return Number(p?.score ?? 0) || 0;
  });

  const bestVisit = scores.length ? Math.max(...scores) : 0;
  const avgScore = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

  // On mappe "avg3Overall" vers une moyenne lisible (score moyen), on conserve le champ pour l'UI identique.
  const avg3Overall = Number.isFinite(avgScore) ? Math.round(avgScore * 10) / 10 : 0;

  const evolution = mine
    .slice(0, 30)
    .reverse()
    .map((r: any) => {
      const date = new Date(r?.createdAt || r?.updatedAt || Date.now());
      return { date: date.toISOString().slice(0, 10), avg3: avg3Overall };
    });

  // Distribution: on utilise avgScore pour ranger dans des buckets "darts-like" sans crasher l'UI.
  const dist: any = { "0-59": 0, "60-99": 0, "100+": 0, "140+": 0, "180": 0 };
  mine.forEach((r: any) => {
    const p = (r?.payload?.stats?.players || []).find((x: any) => x?.id === playerId);
    const sc = Number(p?.score ?? 0) || 0;
    if (sc >= 180) dist["180"]++;
    else if (sc >= 140) dist["140+"]++;
    else if (sc >= 100) dist["100+"]++;
    else if (sc >= 60) dist["60-99"]++;
    else dist["0-59"]++;
  });

  return {
    playerId,
    playerName,
    avg3Overall,
    bestVisit,
    winRatePct,
    evolution,
    distribution: dist,
    sessionsByMode: { "Dice Duel": sessions },
  };
}


function isMolkkyRecord(r: any) {
  const sport = String(r?.sport ?? r?.payload?.stats?.sport ?? r?.payload?.sport ?? r?.kind ?? r?.summary?.sport ?? "").toLowerCase();
  const mode = String(r?.payload?.stats?.mode ?? r?.payload?.mode ?? r?.summary?.mode ?? "").toLowerCase();
  return sport === "molkky" || mode === "molkky";
}

function molkkyPlayerInRecord(r: any, playerId: string, playerName: string) {
  const pid = String(playerId || "").trim();
  const pname = String(playerName || "").trim().toLowerCase();
  const pools = [
    ...(Array.isArray(r?.players) ? r.players : []),
    ...(Array.isArray(r?.payload?.stats?.players) ? r.payload.stats.players : []),
    ...(Array.isArray(r?.summary?.players) ? r.summary.players : []),
  ];
  return pools.some((p: any) => {
    const id = String(p?.id ?? p?.playerId ?? p?.profileId ?? "").trim();
    const name = String(p?.name ?? p?.playerName ?? p?.label ?? "").trim().toLowerCase();
    return (pid && id === pid) || (pname && name === pname);
  });
}

function molkkyPlayerScore(r: any, playerId: string, playerName: string) {
  const pid = String(playerId || "").trim();
  const pname = String(playerName || "").trim().toLowerCase();
  const pools = [
    ...(Array.isArray(r?.payload?.stats?.players) ? r.payload.stats.players : []),
    ...(Array.isArray(r?.players) ? r.players : []),
    ...(Array.isArray(r?.summary?.players) ? r.summary.players : []),
  ];
  const hit = pools.find((p: any) => {
    const id = String(p?.id ?? p?.playerId ?? p?.profileId ?? "").trim();
    const name = String(p?.name ?? p?.playerName ?? p?.label ?? "").trim().toLowerCase();
    return (pid && id === pid) || (pname && name === pname);
  });
  return Number(hit?.score ?? hit?.points ?? hit?.total ?? 0) || 0;
}

function buildMolkkyDashboardForPlayer(playerId: string, playerName: string, rows: any[]): PlayerDashboardStats {
  const molkkyRows = (rows || []).filter((r: any) => isMolkkyRecord(r));
  const mine = molkkyRows.filter((r: any) => molkkyPlayerInRecord(r, playerId, playerName));
  const agg = aggregateMolkkyPlayers(mine as any).find(
    (x: any) => String(x?.name ?? "").trim().toLowerCase() === String(playerName || "").trim().toLowerCase()
  );

  const sessions = mine.length || 0;
  const wins = Number(agg?.wins ?? 0) || 0;
  const winRatePct = sessions ? Math.round((wins / sessions) * 100) : 0;
  const avgPts = Number(agg?.avgPtsPerThrow ?? 0) || 0;
  const bestTurns = Number(agg?.bestTurns ?? 0) || 0;
  const avgTurns = Number(agg?.avgTurns ?? 0) || 0;
  const scores = mine.map((r: any) => molkkyPlayerScore(r, playerId, playerName)).filter((n: number) => Number.isFinite(n));
  const bestScore = scores.length ? Math.max(...scores) : 0;

  const evolution = mine
    .slice()
    .sort((a: any, b: any) => Number(a?.createdAt ?? a?.updatedAt ?? 0) - Number(b?.createdAt ?? b?.updatedAt ?? 0))
    .slice(-30)
    .map((r: any) => ({
      date: new Date(Number(r?.createdAt ?? r?.updatedAt ?? Date.now()) || Date.now()).toISOString().slice(0, 10),
      avg3: Number(molkkyPlayerScore(r, playerId, playerName) || avgPts || 0),
    }));

  const dist: any = { "0-59": 0, "60-99": 0, "100+": 0, "140+": 0, "180": 0 };
  mine.forEach((r: any) => {
    const turns = Number(r?.summary?.turns ?? r?.summary?.rounds ?? 0) || 0;
    if (turns > 0 && turns <= 8) dist["180"]++;
    else if (turns > 0 && turns <= 12) dist["140+"]++;
    else if (turns > 0 && turns <= 16) dist["100+"]++;
    else if (turns > 0 && turns <= 22) dist["60-99"]++;
    else dist["0-59"]++;
  });

  return {
    playerId,
    playerName,
    avg3Overall: Number.isFinite(avgPts) ? Math.round(avgPts * 10) / 10 : 0,
    bestVisit: bestTurns > 0 ? bestTurns : bestScore,
    bestCheckout: avgTurns > 0 ? Math.round(avgTurns * 10) / 10 : undefined,
    winRatePct,
    evolution,
    distribution: dist,
    sessionsByMode: { "Mölkky Classic": sessions },
  };
}
// ✅ KEEP en import normal (léger / utilisé souvent)
import StatsX01Compare from "./StatsX01Compare";
import StatsTrainingSummary from "../components/stats/StatsTrainingSummary";
import StatsTrainingModesLocal from "../components/stats/StatsTrainingModesLocal";
import StatsTrainingLeaderboards from "../components/stats/StatsTrainingLeaderboards";
import TrainingProfileCard from "../components/profile/TrainingProfileCard";
import { useCurrentProfile } from "../hooks/useCurrentProfile";
import { useDevMode } from "../contexts/DevModeContext";
import { computeKillerAggForPlayer } from "../lib/statsKillerAgg";
import StatsDartSetsSection from "../components/StatsDartSetsSection";

// ✅ LAZY-LOAD des modules lourds (gros gain bundle + parse)

// ---- PATCH: React.lazy with retry (prod cache / chunk mismatch) ----
function lazyWithRetry<T extends React.ComponentType<any>>(loader: () => Promise<{ default: T }>) {
  return React.lazy(() =>
    loader().catch(async (err) => {
      // If a chunk failed to load (stale index.html / CDN cache), do a one-shot reload
      try {
        const msg = String((err as any)?.message || err || "");
        const isChunk =
          msg.includes("Failed to fetch dynamically imported module") ||
          msg.includes("Importing a module script failed") ||
          msg.includes("ChunkLoadError") ||
          msg.includes("dynamically imported module");
        if (isChunk) {
          const k = "dc_chunk_reload_once_v1";
          if (sessionStorage.getItem(k) !== "1") {
            sessionStorage.setItem(k, "1");
            const u = new URL(window.location.href);
            u.searchParams.set("cb", String(Date.now()));
            window.location.replace(u.toString());
          }
        }
      } catch {}
      throw err;
    })
  );
}
// ---- END PATCH ----


const TrainingRadar = React.lazy(() => import("../components/TrainingRadar"));
const StatsCricketDashboard = React.lazy(
  () => import("../components/StatsCricketDashboard")
);
const StatsShanghaiDashboard = lazyWithRetry(() => import("../components/stats/StatsShanghaiDashboard"));
const X01MultiStatsTabFull = React.lazy(
  () => import("../stats/X01MultiStatsTabFull")
);
const StatsLeaderboardsTab = React.lazy(
  () => import("../components/stats/StatsLeaderboardsTab")
);
const StatsKiller = React.lazy(() => import("./StatsKiller"));

// ✅ TERRITORIES (stats locales)
const StatsTerritoriesTab = React.lazy(() => import("./StatsTerritories"));

import {
  loadNormalizedHistory,
  type NormalizedMatch,
} from "../lib/statsNormalized";
import { buildDashboardFromNormalized } from "../lib/statsUnifiedAgg";
import { computeX01MultiAgg } from "../lib/x01MultiAgg";
import { aggregatePlayers as aggregateMolkkyPlayers } from "../lib/molkkyStats";

// ============================================================
// 🧪 DEBUG RUNTIME (téléphone)
// Active un overlay dans StatsHub pour voir EXACTEMENT ce qui est chargé.
// Mets false une fois le diagnostic terminé.
// ============================================================



// ------------------------------------------------------------
// Helper: check if a pid exists in normalized matches players list.
// ------------------------------------------------------------
function historyHasPlayerId(nmEffective: any, pid: string) {
  const nm = Array.isArray(nmEffective) ? nmEffective : [];
  if (!pid) return false;
  return nm.some((m: any) => {
    const ps = Array.isArray(m?.players) ? m.players : [];
    return ps.some((p: any) => String(p?.playerId ?? p?.id ?? "") === String(pid));
  });
}

// Effet "shimmer" à l'intérieur des lettres du nom du joueur
const statsNameCss = `
.dc-stats-name-wrapper {
  position: relative;
  display: inline-block;
  font-weight: 900;
}

/* couche de base, couleur thème — SANS GROS HALO LUMINEUX */
.dc-stats-name-base {
  color: var(--dc-accent, #f6c256);
  text-shadow: none !important;
}

/* couche animée : gradient qui défile à l'intérieur des lettres */
.dc-stats-name-shimmer {
  position: absolute;
  inset: 0;
  color: transparent;

  /* GRADIENT SANS OPACITÉS QUI DÉBORDENT */
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.08) 40%,
    rgba(255,255,255,0.55) 50%,
    rgba(255,255,255,0.08) 60%,
    transparent 100%
  );

  background-size: 200% 100%;
  background-position: 0% 0%;
  -webkit-background-clip: text;
  background-clip: text;

  animation: dcStatsNameShimmer 2.4s linear infinite;
  pointer-events: none;
}

/* animation du balayage gauche -> droite */
@keyframes dcStatsNameShimmer {
  0% {
    background-position: -80% 0%;
  }
  100% {
    background-position: 120% 0%;
  }
}
`;

// ============================================================
// ✅ FAST STATS CACHE (StatsHub)
// - Affiche instantanément un dashboard depuis un cache localStorage
// - Puis laisse ton calcul normal remplacer derrière
// - Tolérant: ne casse pas si cache absent/corrompu
// ============================================================

const STATS_CACHE_KEYS = (profileId: string) => [
  `dc_stats_cache_v2:${profileId}`,
  `dc_stats_cache:${profileId}`,
  `dc-stats-cache:${profileId}`,
];

function safeJsonParseStatsHub<T = any>(raw: any): T | null {
  try {
    if (!raw) return null;
    if (typeof raw === "object") return raw as T;
    if (typeof raw === "string") return JSON.parse(raw) as T;
    return null;
  } catch {
    return null;
  }
}

// 🔒 Garde-fou : évite d’utiliser un cache vide / incomplet
function looksLikeDashboard(x: any): boolean {
  if (!x || typeof x !== "object") return false;

  return Boolean(
    x.playerId ||
    Number.isFinite(Number(x.avg3Overall)) ||
    x.distribution
  );
}

function readStatsCache(profileId: string): any | null {
  if (!profileId) return null;
  try {
    for (const k of STATS_CACHE_KEYS(profileId)) {
      const raw = localStorage.getItem(k);
      const parsed = safeJsonParseStatsHub(raw);
      if (parsed) return parsed;
    }
  } catch {}
  return null;
}

/**
 * Hook: renvoie un "dashboard" instantané depuis cache, puis laisse le calcul normal faire le reste.
 * Convention attendue du cache:
 * - soit { dashboard: <PlayerDashboardStats> }
 * - soit directement <PlayerDashboardStats>
 */

function useFastDashboardCache(profileId: string | null) {
  const [cachedDashboard, setCachedDashboard] = React.useState<any | null>(null);
  const [cacheLoaded, setCacheLoaded] = React.useState(false);

  React.useEffect(() => {
    setCacheLoaded(false);
    setCachedDashboard(null);

    const pid = String(profileId || "");
    if (!pid) {
      setCacheLoaded(true);
      return;
    }

    // 🔥 lecture sync ultra-rapide (localStorage)
    const hit = readStatsCache(pid);

    if (hit) {
      const dash = hit?.dashboard ?? hit;
      // ⚠️ CRITIQUE : on rejette les dashboards vides / incomplets
      setCachedDashboard(looksLikeDashboard(dash) ? dash : null);
    }

    setCacheLoaded(true);
  }, [profileId]);

  return { cachedDashboard, cacheLoaded };
}

function useInjectStatsNameCss() {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("dc-stats-name-css")) return;

    const style = document.createElement("style");
    style.id = "dc-stats-name-css";
    style.innerHTML = statsNameCss;
    document.head.appendChild(style);
  }, []);
}

// ================== Modes principaux du centre de stats ==================
type StatsMainMode =
  | "dashboard"
  | "x01_multi"
  | "x01_compare"   // 👈 NOUVEAU
  | "cricket"
  | "battle_royale"
  | "history"
  | "leaderboards";

const STATS_MAIN_MODES: { id: StatsMainMode; label: string }[] = [
  { id: "dashboard", label: "Dashboard (vue globale)" },
  { id: "x01_multi", label: "X01 Multi" },
  { id: "cricket", label: "Cricket" },
  { id: "battle_royale", label: "Battle Royale" },
  { id: "history", label: "Historique" },
];

/* ---------- Thème ---------- */
const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  text30: "rgba(255,255,255,.30)",

  edge: "rgba(255,255,255,.10)",
  card: "linear-gradient(180deg,rgba(17,18,20,.94),rgba(13,14,17,.92))",

  // 🔥 Ajout des clés manquantes utilisées partout dans StatsHub
  accent: "#F6C256",
  accent20: "rgba(246,194,86,.20)",
  accent30: "rgba(246,194,86,.30)",
  accent40: "rgba(246,194,86,.40)",
  accent50: "rgba(246,194,86,.50)",
  accentGlow: "rgba(246,194,86,.60)",
};

const goldNeon = {
  fontSize: 14,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#F6C256",
  textShadow: "0 0 8px rgba(246,194,86,.9), 0 0 16px rgba(246,194,86,.45)",
  letterSpacing: 0.8,
};

/* ---------- Types ---------- */
type PlayerLite = {
  id: string;
  name?: string;
  avatarDataUrl?: string | null;
  dartSetId?: string | null;
};

type SavedMatch = {
  id: string;
  kind?: "x01" | "cricket" | string;
  status?: "in_progress" | "finished";
  players?: PlayerLite[];
  winnerId?: string | null;
  createdAt?: number;
  updatedAt?: number;
  summary?: any;
  payload?: any;

  // Champs libres tolérés (comme dans lib/history.ts)
  mode?: string;
  variant?: string;
  game?: string;
  [k: string]: any;
};

// Onglet principal demandé par le menu Stats
type StatsHubMainTab = "history" | "stats" | "training";

// ---------- Props ----------
type StatsMode = "active" | "locals";

type Props = {
  go?: (tab: string, params?: any) => void;
  tab?: StatsHubMainTab;

  memHistory?: SavedMatch[];

  // Navigation depuis History / X01PlayV3
  initialPlayerId?: string | null;
  initialStatsSubTab?:
    | "dashboard"
    | "dartsets"
    | "x01_multi"
    | "x01_compare"
    | "cricket"
    | "shanghai"
    | "killer"
    | "territories"
    | "leaderboards"
    | "history";

  // Nouveau : mode d’ouverture
  mode?: StatsMode; // "active" = joueur actif / "locals" = profils locaux
  playerId?: string | null; // compat : StatsShell envoie playerId pour le joueur actif
  sportOverride?: string | null;
};

/* ---------- Helpers génériques ---------- */
const toArr = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
const toObj = <T,>(v: any): T => (v && typeof v === "object" ? v : ({} as T));
const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const fmtDate = (ts?: number) =>
  new Date(N(ts, Date.now())).toLocaleString();

/* ---------- Normalise les joueurs (support X01 V3) ---------- */
function normalizeRecordPlayers(
  rec: SavedMatch,
  storeProfiles: PlayerLite[]
): SavedMatch {
  // ⚠️ Ne pas muter/écraser rec.game (objet dans le nouveau schéma).
  // On normalise uniquement les players et on laisse la détection du mode à getGameMode().
  const players = Array.isArray((rec as any)?.players) ? (rec as any).players : [];
  const withAvatars = players.map((p: any) => ({
    ...p,
    avatar: p.avatar ?? p.avatarDataUrl ?? (p.profile?.avatarDataUrl ?? null),
  }));

  return {
    ...rec,
    players: withAvatars,
    payload: {
      ...(rec.payload ?? {}),
      players: withAvatars,
    },
  };
}


/* ========== TRAINING X01 : SESSIONS LOCALSTORAGE ========== */

type TimeRange = "all" | "day" | "week" | "month" | "year";

// ✅ on garde NOTRE type local, plus d’import en double
export type TrainingX01Session = {
  id: string;
  date: number;
  profileId: string;
  darts: number;
  avg3D: number;
  avg1D: number;
  bestVisit: number;
  bestCheckout: number | null;
  best9Score?: number | null;
  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull: number;
  dBull: number;
  bust: number;
  coAttempts?: number;
  coSuccess?: number;

  // ancien format global
  bySegment?: Record<string, number>;

  // nouveaux formats détaillés S / D / T
  bySegmentS?: Record<string, number>;
  bySegmentD?: Record<string, number>;
  bySegmentT?: Record<string, number>;

  // détail fléchette par fléchette
  dartsDetail?: UIDart[];
};

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

const SEGMENTS: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25, // +25 ajouté
];

/* ---------- Charge sessions ---------- */
function loadTrainingSessions(): TrainingX01Session[] {
  if (typeof window === "undefined") return [];
  try {
    const sources = [
      "dc_training_x01_full_v1",
      TRAINING_X01_STATS_KEY,
    ];

    const normalize = (row: any, idx: number): TrainingX01Session => {
      const darts = Number(row?.darts) || 0;
      const avg3D = Number(row?.avg3D) || 0;

      const avg1DExplicit =
        row?.avg1D !== undefined && row?.avg1D !== null
          ? Number(row.avg1D) || 0
          : null;
      const avg1D =
        avg1DExplicit !== null ? avg1DExplicit : darts > 0 ? avg3D / 3 : 0;

      const bestCheckoutRaw =
        row?.bestCheckout !== undefined && row?.bestCheckout !== null
          ? row.bestCheckout
          : row?.checkout;
      const bestCheckout =
        bestCheckoutRaw === null || bestCheckoutRaw === undefined
          ? null
          : Number(bestCheckoutRaw) || 0;

      const bySegmentRaw =
        row?.bySegment && typeof row.bySegment === "object"
          ? (row.bySegment as Record<string, any>)
          : undefined;

      const bySegmentSRaw =
        row?.bySegmentS && typeof row.bySegmentS === "object"
          ? (row.bySegmentS as Record<string, any>)
          : undefined;

      const bySegmentDRaw =
        row?.bySegmentD && typeof row.bySegmentD === "object"
          ? (row.bySegmentD as Record<string, any>)
          : undefined;

      const bySegmentTRaw =
        row?.bySegmentT && typeof row.bySegmentT === "object"
          ? (row.bySegmentT as Record<string, any>)
          : undefined;

      let dartsDetail: UIDart[] | undefined = undefined;

      if (Array.isArray(row?.dartsDetail)) {
        dartsDetail = row.dartsDetail;
      } else if (bySegmentSRaw || bySegmentDRaw || bySegmentTRaw) {
        const tmp: UIDart[] = [];
        const keys = new Set<string>([
          ...Object.keys(bySegmentSRaw || {}),
          ...Object.keys(bySegmentDRaw || {}),
          ...Object.keys(bySegmentTRaw || {}),
        ]);

        const cap = (n: number) => Math.min(200, Math.max(0, Math.round(n)));

        for (const segStr of keys) {
          const seg = Number(segStr);
          if (!Number.isFinite(seg) || seg <= 0) continue;

          const sCount = cap(Number(bySegmentSRaw?.[segStr] || 0));
          const dCount = cap(Number(bySegmentDRaw?.[segStr] || 0));
          const tCount = cap(Number(bySegmentTRaw?.[segStr] || 0));

          for (let i = 0; i < sCount; i++) tmp.push({ v: seg, mult: 1 } as UIDart);
          for (let i = 0; i < dCount; i++) tmp.push({ v: seg, mult: 2 } as UIDart);
          for (let i = 0; i < tCount; i++) tmp.push({ v: seg, mult: 3 } as UIDart);
        }

        dartsDetail = tmp;
      } else if (bySegmentRaw) {
        const tmp: UIDart[] = [];
        const cap = (n: number) => Math.min(200, Math.max(0, Math.round(n)));

        for (const [segStr, entry] of Object.entries(bySegmentRaw)) {
          const seg = Number(segStr);
          if (!Number.isFinite(seg) || seg <= 0) continue;

          let sCount = 0, dCount = 0, tCount = 0;
          if (typeof entry === "number") {
            sCount = cap(entry);
          } else if (entry && typeof entry === "object") {
            sCount = cap(Number((entry as any).S || 0));
            dCount = cap(Number((entry as any).D || 0));
            tCount = cap(Number((entry as any).T || 0));
          }

          for (let i = 0; i < sCount; i++) tmp.push({ v: seg, mult: 1 } as UIDart);
          for (let i = 0; i < dCount; i++) tmp.push({ v: seg, mult: 2 } as UIDart);
          for (let i = 0; i < tCount; i++) tmp.push({ v: seg, mult: 3 } as UIDart);
        }

        dartsDetail = tmp;
      }

      return {
        id: row?.id ?? String(idx),
        date: Number(row?.date) || Date.now(),
        profileId: String(row?.profileId ?? "unknown"),
        darts,
        avg3D,
        avg1D,
        bestVisit: Number(row?.bestVisit) || 0,
        bestCheckout,
        best9Score: Number(row?.best9Score) || 0,
        hitsS: Number(row?.hitsS) || 0,
        hitsD: Number(row?.hitsD) || 0,
        hitsT: Number(row?.hitsT) || 0,
        miss: Number(row?.miss) || 0,
        bull: Number(row?.bull) || 0,
        dBull: Number(row?.dBull) || 0,
        bust: Number(row?.bust) || 0,
        coAttempts: Number(row?.coAttempts) || 0,
        coSuccess: Number(row?.coSuccess) || 0,
        bySegment: bySegmentRaw,
        bySegmentS: bySegmentSRaw,
        bySegmentD: bySegmentDRaw,
        bySegmentT: bySegmentTRaw,
        dartsDetail,
      } as TrainingX01Session;
    };

    const dedup = new Map<string, TrainingX01Session>();
    for (const key of sources) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      parsed.forEach((row: any, idx: number) => {
        const normalized = normalize(row, idx);
        const dedupKey = String(normalized.id || `${normalized.profileId}-${normalized.date}-${normalized.darts}`);
        if (!dedup.has(dedupKey)) dedup.set(dedupKey, normalized);
      });
    }

    return Array.from(dedup.values()).sort((a, b) => b.date - a.date);
  } catch (e) {
    console.warn("[StatsHub] loadTrainingSessions failed", e);
    return [];
  }
}

function filterByRange(sessions: TrainingX01Session[], range: TimeRange) {
  if (range === "all") return sessions;
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const delta =
    range === "day"
      ? ONE_DAY
      : range === "week"
      ? 7 * ONE_DAY
      : range === "month"
      ? 30 * ONE_DAY
      : 365 * ONE_DAY;
  const minDate = now - delta;
  return sessions.filter((s) => s.date >= minDate);
}

function formatShortDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function safePercent(num: number, den: number) {
  if (!den) return 0;
  
  // ------------------------------------------------------------
  // ✅ UX: éviter le flash sur un profil local (ex: Antoine) pendant l'hydratation du profil online.
  // Si on est en mode "active" et qu'un profil online est attendu mais pas encore dispo,
  // on affiche un écran de chargement court au lieu de sélectionner le 1er joueur local.
  // ------------------------------------------------------------
  const shouldHoldForActiveProfile = React.useMemo(() => {
    if (mode !== "active") return false;
    const hasOnlineId = Boolean((profile as any)?.id);
    const hasLocalActive = Boolean(activePlayerId);
    // Si on n'a pas encore d'id online MAIS qu'on a un activePlayerId local,
    // on ne bloque pas (offline/local).
    // Si l'id online arrive, on utilisera activeKeyId + mapping.
    return !hasOnlineId && !hasLocalActive;
  }, [mode, profile, activePlayerId]);

  if (shouldHoldForActiveProfile) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.85)" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Chargement du profil actif…</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>Synchronisation en cours</div>
      </div>
    );
  }

return (num / den) * 100;
}

/* ---------- Hooks Historique ---------- */
function useHistoryAPI(): SavedMatch[] {
  const [rows, setRows] = React.useState<SavedMatch[]>([]);

  React.useEffect(() => {
    // ✅ Guard SSR / build (window undefined)
    if (typeof window === "undefined") return;

    let mounted = true;

    // Hydrate payloads for modes that need deep stats (X01, etc.).
    // History.list() is intentionally "light" (no payload) for most games; the dashboard
    // needs the full payload for X01 KPIs.
    const hydrateMissingPayloads = async (list: any[]): Promise<SavedMatch[]> => {
      const arr = toArr<SavedMatch>(list);

      // Keep fast: only hydrate records likely used by the dashboard.
      const NEED = new Set(["x01", "cricket", "killer", "golf", "shanghai", "training", "batard", "scram", "warfare", "tour", "clock", "battle_royale", "territories", "five_lives", "molkky", "dicegame", "babyfoot", "pingpong", "petanque"]);

      const toHydrate: string[] = [];
      for (const r of arr) {
        const hasPayload = !!(r as any)?.payload;
        if (hasPayload) continue;

        const mode = classifyRecordMode(r);
        if (!NEED.has(mode)) continue;

        const id = (r as any)?.id;
        if (typeof id === "string" && id) toHydrate.push(id);
        // Safety cap: dashboard doesn’t need thousands of full payloads
        if (toHydrate.length >= STATSHUB_HISTORY_HYDRATE_CAP) break;
      }

      if (!toHydrate.length) return arr;

      const byId = new Map<string, SavedMatch>();
      arr.forEach((r: any) => {
        if (r?.id) byId.set(String(r.id), r);
      });

      // Chunk to avoid hammering IDB / blocking UI
      const CHUNK = 25;
      for (let i = 0; i < toHydrate.length; i += CHUNK) {
        const slice = toHydrate.slice(i, i + CHUNK);
        const got = await Promise.all(
          slice.map(async (id) => {
            try {
              return (await History.get(id)) as any;
            } catch {
              return null;
            }
          })
        );

        for (const full of got) {
          if (!full?.id) continue;
          byId.set(String(full.id), full as any);
        }
      }

      // Preserve original order
      return arr.map((r: any) => byId.get(String(r?.id ?? "")) ?? r);
    };

    const load = async () => {
      try {
        const list = await History.list();
        if (!mounted) return;
        const base = takeRecent(toArr<SavedMatch>(list), STATSHUB_HISTORY_LIGHT_CAP);
        setRows(base);

        // Then hydrate in background and refresh once.
        // If hydration fails, we keep the light list.
        try {
          const hydrated = await hydrateMissingPayloads(base as any);
          if (!mounted) return;
          setRows(hydrated);
        } catch {
          // ignore
        }
      } catch {
        if (!mounted) return;
        setRows([]);
      }
    };

    load();

    const onUpd = () => load();

    window.addEventListener("dc-history-updated", onUpd as any);
    return () => {
      mounted = false;
      window.removeEventListener("dc-history-updated", onUpd as any);
    };
  }, []);

  return rows;
}

function useStoreHistory(): SavedMatch[] {
  const [rows, setRows] = React.useState<SavedMatch[]>([]);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const store: any = await loadStore<any>();
        if (!mounted) return;
        setRows(takeRecent(toArr<SavedMatch>(store?.history), STATSHUB_STORE_HISTORY_CAP));
      } catch {
        setRows([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return rows;
}

/* ---------- Compte les "sessions" par mode pour un joueur ---------- */
type SessionsByMode = Record<string, number>;


function getGameMode(rec: any): string {
  // Normalise toutes les sources possibles, sans casser les anciens records
  try {
    const pick = (...vals: any[]) => {
      for (const v of vals) {
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return "";
    };

    const g = rec?.game;
    if (g && typeof g === "object") {
      const m = pick(g?.mode, g?.gameMode, g?.variant, g?.kind);
      if (m) return m;
    }

    const payload = rec?.payload ?? null;
    const nested = payload?.payload ?? null;
    const summary = rec?.summary ?? payload?.summary ?? nested?.summary ?? null;
    const cfg = payload?.config ?? payload?.cfg ?? nested?.config ?? nested?.cfg ?? null;
    const resume = rec?.resume ?? payload?.resume ?? nested?.resume ?? null;

    const direct = pick(
      rec?.game,
      rec?.mode,
      rec?.variant,
      rec?.kind,
      payload?.game,
      payload?.mode,
      payload?.gameMode,
      payload?.variant,
      payload?.kind,
      nested?.game,
      nested?.mode,
      nested?.gameMode,
      nested?.variant,
      nested?.kind,
      cfg?.mode,
      cfg?.gameMode,
      cfg?.variant,
      cfg?.kind,
      summary?.mode,
      summary?.gameMode,
      summary?.kind,
      summary?.game?.mode,
      summary?.game?.game,
      resume?.mode,
      resume?.gameMode,
      resume?.kind,
      resume?.game?.mode,
      resume?.game?.game,
    );
    if (direct) return direct;

    const isX01V3 = rec?.variant === "x01v3" || rec?.mode === "x01v3" || payload?.variant === "x01v3";
    if (isX01V3) return "x01";
  } catch {}
  return "";
}

function classifyRecordMode(rec: SavedMatch): string {
  // ⚠️ IMPORTANT: selon les générations de matches, kind/mode/variant peuvent être
  // au top-level, dans payload, payload.payload, summary ou config.
  const payload: any = (rec as any)?.payload ?? null;
  const nested: any = payload?.payload ?? null;
  const summary: any = (rec as any)?.summary ?? payload?.summary ?? nested?.summary ?? null;
  const cfg: any = payload?.config ?? payload?.cfg ?? nested?.config ?? nested?.cfg ?? null;
  const resume: any = (rec as any)?.resume ?? payload?.resume ?? nested?.resume ?? null;

  const parts = [
    (rec as any)?.kind,
    (rec as any)?.mode,
    (rec as any)?.variant,
    getGameMode(rec),
    (rec as any)?.sport,
    payload?.kind,
    payload?.mode,
    payload?.gameMode,
    payload?.variant,
    payload?.sport,
    payload?.game,
    nested?.kind,
    nested?.mode,
    nested?.gameMode,
    nested?.variant,
    nested?.sport,
    nested?.game,
    cfg?.kind,
    cfg?.mode,
    cfg?.gameMode,
    cfg?.variant,
    summary?.kind,
    summary?.mode,
    summary?.gameMode,
    summary?.sport,
    summary?.game?.mode,
    summary?.game?.game,
    resume?.kind,
    resume?.mode,
    resume?.gameMode,
    resume?.game?.mode,
    resume?.game?.game,
  ];

  const tag = parts
    .filter((v) => v !== undefined && v !== null)
    .map((v) => String(v).toLowerCase())
    .join("|");

  if (!tag) return "other";

  if (tag.includes("molkky")) return "molkky";
  if (tag.includes("dice")) return "dice";
  if (tag.includes("babyfoot") || tag.includes("baby-foot") || tag.includes("baby_foot")) return "babyfoot";
  if (tag.includes("pingpong") || tag.includes("ping-pong") || tag.includes("ping_pong")) return "pingpong";
  if (tag.includes("petanque") || tag.includes("pétanque")) return "petanque";
  if (tag.includes("cricket")) return "cricket";
  if (tag.includes("killer")) return "killer";
  if (tag.includes("shanghai")) return "shanghai";
  if (tag.includes("golf")) return "golf";
  if (tag.includes("territ") || tag.includes("departement")) return "territories";
  if (tag.includes("batard") || tag.includes("bastard")) return "batard";
  if (tag.includes("scram")) return "scram";
  if (tag.includes("warfare")) return "warfare";
  if (tag.includes("five_lives") || tag.includes("five lives")) return "five_lives";
  if (tag.includes("clock") || tag.includes("horloge") || tag.includes("tour")) return "clock";
  if (tag.includes("battle") || tag.includes("royale")) return "battle_royale";

  // X01 (inclut les variantes x01v3 / 301 / 501 / 701)
  if (tag.includes("x01") || tag.includes("301") || tag.includes("501") || tag.includes("701")) {
    return "x01";
  }

  return "other";
}

function recordMatchesEffectiveSport(rec: any, sportName: string): boolean {
  const sp = String(sportName || "").toLowerCase();
  if (!sp) return true;

  const mode = classifyRecordMode(rec as any);
  const payload = (rec as any)?.payload ?? {};
  const summary = (rec as any)?.summary ?? payload?.summary ?? {};
  const tag = [
    (rec as any)?.sport,
    (rec as any)?.kind,
    (rec as any)?.mode,
    (rec as any)?.variant,
    (rec as any)?.game,
    payload?.sport,
    payload?.kind,
    payload?.mode,
    payload?.variant,
    payload?.game,
    payload?.stats?.sport,
    payload?.stats?.mode,
    summary?.sport,
    summary?.kind,
    summary?.mode,
    summary?.game?.mode,
    summary?.game?.game,
  ]
    .filter((v) => v !== undefined && v !== null)
    .map((v) => String(v).toLowerCase())
    .join("|");

  if (sp.includes("dice")) return mode === "dice" || tag.includes("dice");
  if (sp === "molkky") return mode === "molkky" || tag.includes("molkky");
  if (sp === "babyfoot") return mode === "babyfoot" || tag.includes("babyfoot") || tag.includes("baby-foot") || tag.includes("baby_foot");
  if (sp === "pingpong") return mode === "pingpong" || tag.includes("pingpong") || tag.includes("ping-pong") || tag.includes("ping_pong");
  if (sp === "petanque" || sp === "pétanque") return mode === "petanque" || tag.includes("petanque") || tag.includes("pétanque");
  if (sp === "darts") {
    return !["molkky", "dice", "babyfoot", "pingpong", "petanque"].includes(mode)
      && !tag.includes("molkky")
      && !tag.includes("dice")
      && !tag.includes("babyfoot")
      && !tag.includes("baby-foot")
      && !tag.includes("baby_foot")
      && !tag.includes("pingpong")
      && !tag.includes("ping-pong")
      && !tag.includes("ping_pong")
      && !tag.includes("petanque")
      && !tag.includes("pétanque");
  }
  return tag.includes(sp) || mode === sp;
}

function normalizedMatchMatchesEffectiveSport(m: any, sportName: string): boolean {
  const sp = String(sportName || "").toLowerCase();
  if (!sp) return true;

  const mode = String(m?.mode ?? m?.kind ?? "").toLowerCase();
  const rawTag = [
    m?.mode,
    m?.kind,
    m?.raw?.sport,
    m?.raw?.kind,
    m?.raw?.mode,
    m?.raw?.variant,
    m?.raw?.game,
    m?.raw?.payload?.sport,
    m?.raw?.payload?.kind,
    m?.raw?.payload?.mode,
    m?.raw?.payload?.variant,
    m?.raw?.payload?.game,
    m?.raw?.payload?.stats?.sport,
    m?.raw?.payload?.stats?.mode,
  ]
    .filter((v) => v !== undefined && v !== null)
    .map((v) => String(v).toLowerCase())
    .join("|");

  if (sp.includes("dice")) return mode.includes("dice") || rawTag.includes("dice");
  if (sp === "molkky") return mode === "molkky" || rawTag.includes("molkky");
  if (sp === "babyfoot") return mode === "babyfoot" || rawTag.includes("babyfoot") || rawTag.includes("baby-foot") || rawTag.includes("baby_foot");
  if (sp === "pingpong") return mode === "pingpong" || rawTag.includes("pingpong") || rawTag.includes("ping-pong") || rawTag.includes("ping_pong");
  if (sp === "petanque" || sp === "pétanque") return mode === "petanque" || rawTag.includes("petanque") || rawTag.includes("pétanque");
  if (sp === "darts") return !["molkky", "dicegame", "babyfoot", "pingpong", "petanque"].includes(mode);
  return mode === sp || rawTag.includes(sp);
}

// Dashboard: certains records n'ont pas `players` au niveau racine (ils sont dans payload).
// Si on ne détecte pas le joueur, tout le dashboard tombe à 0/UNKNOWN.
function recordHasPlayer(r: any, pid: string): boolean {
  if (!r || !pid) return false;

  const norm = (v: any) => String(v ?? "").replace(/^online:/, "");
  const target = norm(pid);

  const matchAny = (p: any) => {
    if (!p) return false;

    // Snapshot variants sometimes store ids as plain strings
    if (typeof p === "string" || typeof p === "number") return norm(p) === target;

    const candidates = [p?.id, p?.playerId, p?.profileId, p?.uid, p?.userId, p?.pid, p?.key]
      .filter((x: any) => x !== undefined && x !== null && String(x).length > 0)
      .map(norm);

    return candidates.includes(target);
  };

  const direct = toArrLoc<any>(r?.players);
  const payloadPlayers = [
    ...toArrLoc<any>(r?.payload?.players),
    ...toArrLoc<any>(r?.payload?.config?.players),
    ...toArrLoc<any>(r?.payload?.stats?.players),
    ...toArrLoc<any>(r?.summary?.players),
    ...toArrLoc<any>(r?.summary?.rankings),
    ...toArrLoc<any>(r?.payload?.summary?.players),
    ...toArrLoc<any>(r?.payload?.summary?.rankings),
  ];
  const all = [...direct, ...payloadPlayers];

  if (all.some(matchAny)) return true;

  const keyedMaps = [
    r?.payload?.state?.statsByPlayer,
    r?.payload?.state?.totalsByPlayer,
    r?.summary?.playerStats,
    r?.summary?.perPlayer,
    r?.summary?.totals,
    r?.payload?.playerStats,
    r?.payload?.perPlayer,
    r?.payload?.statsByPlayer,
    r?.payload?.summary?.totals,
  ];

  for (const map of keyedMaps) {
    if (map && typeof map === "object") {
      const keys = Object.keys(map).map(norm);
      if (keys.includes(target)) return true;
    }
  }

  // Teams / rosters
  const teams = [...toArrLoc<any>(r?.teams), ...toArrLoc<any>(r?.payload?.teams), ...toArrLoc<any>(r?.payload?.config?.teams)];
  for (const t of teams) {
    const members = [
      ...toArrLoc<any>(t?.players),
      ...toArrLoc<any>(t?.members),
      ...toArrLoc<any>(t?.roster),
      ...toArrLoc<any>(t?.teamPlayers),
    ];

    if (members.some(matchAny)) return true;
  }

  return false;
}

/* ---------- Resolve active profile playerId (local-only) ---------- */
function resolveActivePlayerIdLocalOnly(opts: {
  activeId: string | null | undefined;
  activeName: string | null | undefined;
  allPlayers: PlayerLite[];
  records: any[];
}): string {
  const activeId = (opts.activeId ?? "").toString();
  const activeName = (opts.activeName ?? "").toString().trim();
  const allPlayers = opts.allPlayers ?? [];
  const records = opts.records ?? [];

  if (!activeId && !activeName) return activeId;

  // 1) If activeId already exists in detected players, keep it.
  if (activeId && allPlayers.some((p) => String(p?.id) === String(activeId))) return activeId;

  // 2) Try exact name match (common when history uses numeric ids).
  const nameLc = activeName.toLowerCase();
  const byName = nameLc
    ? allPlayers.filter((p) => (p?.name ?? "").toLowerCase() === nameLc)
    : [];

  if (byName.length === 1) return String(byName[0].id);

  // 3) If multiple (or none), choose the id that appears most in history.
  const candidates = (byName.length > 0 ? byName : allPlayers)
    .map((p) => String(p?.id))
    .filter((id) => id.length > 0);

  if (candidates.length === 0) return activeId;

  const counts = new Map<string, number>();
  for (const r of records) {
    for (const cid of candidates) {
      if (recordHasPlayer(r, cid)) counts.set(cid, (counts.get(cid) ?? 0) + 1);
    }
  }

  let bestId = "";
  let best = 0;
  for (const [cid, c] of counts.entries()) {
    if (c > best) {
      best = c;
      bestId = cid;
    }
  }

  return bestId || activeId;
}

/* ---------- Adaptateur → PlayerDashboardStats ---------- */
function buildDashboardForPlayer(
  player: PlayerLite,
  records: SavedMatch[],
  quick: any
): PlayerDashboardStats | null {
  const pid = player?.id;
  if (!pid) return null;

  // --------- Accumulateurs fallback (si quick absent / incomplet)
  let fbAvg3 = 0;
  let fbBestVisit = 0;
  let fbBestCO = 0;
  let fbWins = 0;
  let fbMatches = 0;

  const fbBuckets: Record<string, number> = {
    "0-59": 0,
    "60-99": 0,
    "100+": 0,
    "140+": 0,
    "180": 0,
  };

  const evo: Array<{ date: string; avg3: number }> = [];
  const byDate: Array<{ t: number; a3: number }> = [];

  // ✅ Compteur de sessions par mode
  const sessionsByMode: Record<string, number> = {};

  // --------- Helpers
  const Nloc = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);

  // ✅ Normalisation buckets (tolère variantes de clés / formats)
  const normalizeBuckets = (raw: any): Record<string, number> => {
    const out: Record<string, number> = {
      "0-59": 0,
      "60-99": 0,
      "100+": 0,
      "140+": 0,
      "180": 0,
    };
    if (!raw || typeof raw !== "object") return out;

    const Nn = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

    // cherche une clé dans plusieurs variantes possibles
    const pick = (k: string) => {
      const r: any = raw;

      // 1) clé exacte
      if (r[k] != null) return r[k];

      // 2) variantes simples
      const kUnd = k.replace("-", "_");
      if (r[kUnd] != null) return r[kUnd];

      // 3) variantes "+" -> "plus"
      const kPlusWord = k.replace("+", "plus"); // "100plus"
      if (r[kPlusWord] != null) return r[kPlusWord];

      // 4) variantes "+", "_" combinées
      const kPlusUnd = k.replace("+", "_plus"); // "100_plus"
      if (r[kPlusUnd] != null) return r[kPlusUnd];

      // 5) variantes "0_59"
      if (k.includes("-")) {
        const k0 = k.split("-").join("_");
        if (r[k0] != null) return r[k0];
      }

      return null;
    };

    out["0-59"] = Nn(pick("0-59") ?? pick("0_59"));
    out["60-99"] = Nn(pick("60-99") ?? pick("60_99"));
    out["100+"] = Nn(pick("100+") ?? pick("100plus") ?? pick("100_plus"));
    out["140+"] = Nn(pick("140+") ?? pick("140plus") ?? pick("140_plus"));
    out["180"] = Nn(pick("180"));

    return out;
  };

  // ✅ Ajoute un bucket normalisé dans fbBuckets (somme)
  const addBucketsToFb = (raw: any) => {
    const nb = normalizeBuckets(raw);
    fbBuckets["0-59"] += Nloc(nb["0-59"]);
    fbBuckets["60-99"] += Nloc(nb["60-99"]);
    fbBuckets["100+"] += Nloc(nb["100+"]);
    fbBuckets["140+"] += Nloc(nb["140+"]);
    fbBuckets["180"] += Nloc(nb["180"]);
  };

  // --------- Loop records
  for (const r of records || []) {
    const inMatch = recordHasPlayer(r as any, pid);
    if (!inMatch) continue;

    fbMatches++;

    // ✅ Compte le mode (safe)
    try {
      const modeKey = classifyRecordMode(r) || "other";
      sessionsByMode[modeKey] = (sessionsByMode[modeKey] || 0) + 1;
    } catch {
      sessionsByMode.other = (sessionsByMode.other || 0) + 1;
    }

    const ss: any = (r as any)?.summary ?? (r as any)?.payload?.summary ?? {};
    const per: any[] = ss.perPlayer ?? ss.players ?? (r as any)?.payload?.summary?.perPlayer ?? [];

    const pstat =
      per.find((x) => x?.playerId === pid) ??
      (ss?.[pid] || ss?.players?.[pid] || ss?.perPlayer?.[pid]) ??
      {};

    const a3 =
      Nloc(pstat.avg3) ||
      Nloc(pstat.avg_3) ||
      Nloc(pstat.avg3Darts) ||
      Nloc(pstat.average3);

    const bestV = Nloc(pstat.bestVisit);
    const bestCO = Nloc(pstat.bestCheckout);

    if (a3 > 0) {
      byDate.push({
        t: Nloc((r as any)?.updatedAt ?? (r as any)?.createdAt),
        a3,
      });
    }

    fbAvg3 += a3;
    fbBestVisit = Math.max(fbBestVisit, bestV);
    fbBestCO = Math.max(fbBestCO, bestCO);
    if ((r as any)?.winnerId === pid) fbWins++;

    // Buckets : on tente plusieurs sources
    const bucketsFromSummary = ss?.buckets?.[pid];
    const bucketsFromPstat = pstat?.buckets;
    const bucketsRaw = bucketsFromSummary ?? bucketsFromPstat ?? null;

    if (bucketsRaw) addBucketsToFb(bucketsRaw);
  }

  // --------- Evolution (20 derniers points)
  byDate.sort((a, b) => a.t - b.t);
  for (const it of byDate.slice(-20)) {
    evo.push({
      date: new Date(it.t).toLocaleDateString(),
      avg3: it.a3,
    });
  }

  // --------- Fallback stats
  const fbAvg3Mean = fbMatches > 0 ? fbAvg3 / fbMatches : 0;
  const fbWinPct = fbMatches > 0 ? Math.round((fbWins / fbMatches) * 1000) / 10 : 0;

  // Si aucun match et aucune quick-stat dispo → on laisse le composant gérer
  if (!fbMatches && !quick) return null;

  // ✅ Distribution finale : priorité quick (mais normalisée), sinon fbBuckets (déjà agrégés)
  const finalDistribution = normalizeBuckets(quick?.buckets ?? fbBuckets);

  return {
    playerId: pid,
    playerName: player?.name || "Joueur",
    avg3Overall: Number.isFinite(Number(quick?.avg3)) ? Number(quick?.avg3) : fbAvg3Mean,
    bestVisit: Number.isFinite(Number(quick?.bestVisit)) ? Number(quick?.bestVisit) : fbBestVisit,
    bestCheckout: Number.isFinite(Number(quick?.bestCheckout)) ? Number(quick?.bestCheckout) : fbBestCO,
    winRatePct: Number.isFinite(Number(quick?.winRatePct)) ? Number(quick?.winRatePct) : fbWinPct,

    // ✅ IMPORTANT : normalisé pour éviter clés différentes / 0 fantômes
    distribution: finalDistribution,

    evolution: evo.length
      ? evo
      : [
          {
            date: new Date().toLocaleDateString(),
            avg3: Number.isFinite(Number(quick?.avg3)) ? Number(quick?.avg3) : fbAvg3Mean,
          },
        ],

    // ✅ sessionsByMode (pour "mode préféré" + ranking)
    sessionsByMode,
  };
}

/* ---------- Styles cartes/verre ---------- */
const card: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  backdropFilter: "blur(10px)",
};

// ✅ Variante "soft" (sans padding par défaut) — utilisée par certains blocs (ex: GOLF)
// ⚠️ IMPORTANT: doit exister pour éviter ReferenceError: softCard is not defined
const softCard: React.CSSProperties = {
  background: "rgba(0,0,0,0.22)",
  border: `1px solid ${T.edge}`,
  borderRadius: 18,
  boxShadow: "0 8px 22px rgba(0,0,0,.28)",
  backdropFilter: "blur(10px)",
};

const row: React.CSSProperties = {
  ...card,
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: 8,
};

const statsPageWrap: React.CSSProperties = {
  width: "100%",
  maxWidth: 640,
  margin: "0 auto",
  padding: "0 12px",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const statsStack: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  boxSizing: "border-box",
};

const LazyFallback = ({ label = "Chargement…" }: { label?: string }) => (
  <div
    style={{
      ...card,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 120,
      color: T.text70,
      fontSize: 12,
      textAlign: "center",
    }}
  >
    {label}
  </div>
);

/* ============================================================
   ONGLET TRAINING X01 — v2 complet
   ============================================================ */
   function TrainingX01StatsTab() {
    const [sessions, setSessions] = React.useState<TrainingX01Session[]>([]);
    const [range, setRange] = React.useState<TimeRange>("all");
    const [selected, setSelected] = React.useState<TrainingX01Session | null>(null);
  
    // Ordre de défilement des métriques de la sparkline
    const metricKeys: Array<
      "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
    > = ["darts", "avg3D", "pctS", "pctD", "pctT", "BV", "CO"];
  
    const [metric, setMetric] = React.useState<
      "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
    >("avg3D");
  
    // true = l’utilisateur a cliqué, on met l’auto défilement en pause
    const [metricLocked, setMetricLocked] = React.useState(false);
  
    const [page, setPage] = React.useState(1);
  
    React.useEffect(() => {
      setSessions(loadTrainingSessions());
    }, []);

    // Auto-défilement des métriques de la sparkline (toutes les 4s)
  React.useEffect(() => {
    if (!sessions.length) return; // rien à afficher
    if (metricLocked) return;     // l'utilisateur a cliqué, on laisse tranquille

    const id = window.setInterval(() => {
      setMetric((prev) => {
        const idx = metricKeys.indexOf(prev);
        const nextIdx =
          idx === -1 ? 0 : (idx + 1) % metricKeys.length;
        return metricKeys[nextIdx];
      });
    }, 4000);

    return () => window.clearInterval(id);
  }, [sessions.length, metricLocked]);

  // Quand l'utilisateur clique sur une métrique, on bloque l'auto-défilement 15s
  React.useEffect(() => {
    if (!metricLocked) return;
    const id = window.setTimeout(() => {
      setMetricLocked(false);
    }, 15000); // 15 secondes de « pause utilisateur »

    return () => window.clearTimeout(id);
  }, [metricLocked]);
  
    /* ---------- Sessions filtrées ---------- */
    const filtered = React.useMemo(
      () =>
        filterByRange(sessions, range).sort((a, b) => a.date - b.date),
      [sessions, range]
    );
  
    const totalSessions = filtered.length;
    const totalDarts = filtered.reduce((s, x) => s + x.darts, 0);
    const avgDarts = totalSessions > 0 ? totalDarts / totalSessions : 0;
  
    const bestVisit =
      totalSessions > 0
        ? Math.max(...filtered.map((x) => x.bestVisit))
        : 0;
  
    const bestCheckout =
      totalSessions > 0
        ? Math.max(...filtered.map((x) => x.bestCheckout || 0))
        : 0;
  
    const globalAvg3D =
      totalSessions > 0
        ? filtered.reduce((s, x) => s + x.avg3D, 0) / totalSessions
        : 0;
  
    const globalAvg1D =
      totalSessions > 0
        ? filtered.reduce((s, x) => s + x.avg1D, 0) / totalSessions
        : 0;
  
    /* ============================================================
       AGRÉGATION FLÉCHETTES GLOBALES (période)
       ============================================================ */
       let gHitsS = 0,
       gHitsD = 0,
       gHitsT = 0,
       gMiss = 0,
       gBull = 0,
       gDBull = 0,
       gBust = 0;
 
     // Min / Max par session
     let minDarts: number | null = null,
       maxDarts: number | null = null,
       minHits: number | null = null,
       maxHits: number | null = null,
       minS: number | null = null,
       maxS: number | null = null,
       minD: number | null = null,
       maxD: number | null = null,
       minT: number | null = null,
       maxT: number | null = null,
       minMiss: number | null = null,
       maxMiss: number | null = null,
       minBull: number | null = null,
       maxBull: number | null = null,
       minDBull: number | null = null,
       maxDBull: number | null = null,
       minBust: number | null = null,
       maxBust: number | null = null;
 
     for (const s of filtered) {
       const darts = s.darts || 0;
       const sS = s.hitsS ?? 0;
       const sD = s.hitsD ?? 0;
       const sT = s.hitsT ?? 0;
       const sMiss = s.miss ?? 0;
       const sBull = s.bull ?? 0;
       const sDBull = s.dBull ?? 0;
       const sBust = s.bust ?? 0;
       const sHits = sS + sD + sT;
 
       const hasCounters =
         sS + sD + sT + sMiss + sBull + sDBull + sBust > 0;
 
       if (hasCounters) {
         // Totaux globaux
         gHitsS += sS;
         gHitsD += sD;
         gHitsT += sT;
         gMiss += sMiss;
         gBull += sBull;
         gDBull += sDBull;
         gBust += sBust;
 
         if (darts > 0) {
           // Darts
           if (minDarts === null || darts < minDarts) minDarts = darts;
           if (maxDarts === null || darts > maxDarts) maxDarts = darts;
 
           // Hits
           if (minHits === null || sHits < minHits) minHits = sHits;
           if (maxHits === null || sHits > maxHits) maxHits = sHits;
 
           // S / D / T
           if (minS === null || sS < minS) minS = sS;
           if (maxS === null || sS > maxS) maxS = sS;
 
           if (minD === null || sD < minD) minD = sD;
           if (maxD === null || sD > maxD) maxD = sD;
 
           if (minT === null || sT < minT) minT = sT;
           if (maxT === null || sT > maxT) maxT = sT;
 
           // Miss / Bull / DBull / Bust
           if (minMiss === null || sMiss < minMiss) minMiss = sMiss;
           if (maxMiss === null || sMiss > maxMiss) maxMiss = sMiss;
 
           if (minBull === null || sBull < minBull) minBull = sBull;
           if (maxBull === null || sBull > maxBull) maxBull = sBull;
 
           if (minDBull === null || sDBull < minDBull) minDBull = sDBull;
           if (maxDBull === null || sDBull > maxDBull) maxDBull = sDBull;
 
           if (minBust === null || sBust < minBust) minBust = sBust;
           if (maxBust === null || sBust > maxBust) maxBust = sBust;
         }
 
         continue;
       }
 
       /* ---------- Fallback depuis dartsDetail (vieux enregistrements) ---------- */
       if (Array.isArray(s.dartsDetail)) {
         for (const d of s.dartsDetail) {
           const v = Number((d as any)?.v) || 0;
           const mult = Number((d as any)?.mult) || 0;
 
           if (v === 0 || mult === 0) {
             gMiss++;
             continue;
           }
 
           if (v === 25 && mult === 2) gDBull++;
           else if (v === 25) gBull++;
 
           if (mult === 1) gHitsS++;
           else if (mult === 2) gHitsD++;
           else if (mult === 3) gHitsT++;
         }
       }
     }
 
     const totalHits = gHitsS + gHitsD + gHitsT;
     const totalThrows = totalHits + gMiss;
 
     const hitsPercent = totalThrows > 0 ? (totalHits / totalThrows) * 100 : 0;
     const simplePercent = totalHits > 0 ? (gHitsS / totalHits) * 100 : 0;
     const doublePercent = totalHits > 0 ? (gHitsD / totalHits) * 100 : 0;
     const triplePercent = totalHits > 0 ? (gHitsT / totalHits) * 100 : 0;
 
  
    /* ---------- Dérivés session ---------- */
    const avgHitsSPerSession =
      totalSessions > 0 ? gHitsS / totalSessions : 0;
    const avgHitsDPerSession =
      totalSessions > 0 ? gHitsD / totalSessions : 0;
    const avgHitsTPerSession =
      totalSessions > 0 ? gHitsT / totalSessions : 0;
    const avgMissPerSession =
      totalSessions > 0 ? gMiss / totalSessions : 0;
    const avgBustPerSession =
      totalSessions > 0 ? gBust / totalSessions : 0;
    const avgBullPerSession =
      totalSessions > 0 ? gBull / totalSessions : 0;
    const avgDBullPerSession =
      totalSessions > 0 ? gDBull / totalSessions : 0;
    const bestAvg3DSession =
      totalSessions > 0 ? Math.max(...filtered.map((x) => x.avg3D || 0)) : 0;  
  
    const pctHitsGlobal = totalThrows > 0 ? hitsPercent : null;
    const pctMissGlobal =
      totalThrows > 0 ? (gMiss / totalThrows) * 100 : null;
    const pctSimpleGlobal =
      totalHits > 0 ? (gHitsS / totalHits) * 100 : null;
    const pctDoubleGlobal =
      totalHits > 0 ? (gHitsD / totalHits) * 100 : null;
    const pctTripleGlobal =
      totalHits > 0 ? (gHitsT / totalHits) * 100 : null;
  
    const totalBullHits = gBull + gDBull;
    // %Bull et %DBull calculés sur le total de darts
    const pctBullGlobal =
      totalDarts > 0 ? (gBull / totalDarts) * 100 : null;

    const pctDBullGlobal =
      totalDarts > 0 ? (gDBull / totalDarts) * 100 : null;
    const pctBustGlobal =
      totalThrows > 0 ? (gBust / totalThrows) * 100 : null;
  
    /* ---------- Normalisation d’une fléchette ---------- */
    function normalizeTrainingDart(raw: any): UIDart | null {
      if (!raw) return null;

      const rawV =
        (raw as any).v ??
        (raw as any).value ??
        (raw as any).segment ??
        (raw as any).s;

      const rawMult =
        (raw as any).mult ??
        (raw as any).m ??
        (raw as any).multiplier ??
        (raw as any).type;

      const vNum = Number(rawV) || 0;

      let mNum: number;
      if (rawMult === "S") mNum = 1;
      else if (rawMult === "D") mNum = 2;
      else if (rawMult === "T") mNum = 3;
      else mNum = Number(rawMult) || 0;

      if (!Number.isFinite(vNum)) return null;
      if (!Number.isFinite(mNum)) mNum = 0;

      return { v: vNum, mult: mNum as 0 | 1 | 2 | 3 };
    }

    /* ---------- Détails fléchettes pour graph + radar ---------- */
    const trainingDartsAll: UIDart[] = React.useMemo(() => {
      const out: UIDart[] = [];
    
      for (const s of filtered) {
        // 1) Cas idéal : on a le détail fléchette par fléchette
        if (Array.isArray(s.dartsDetail) && s.dartsDetail.length) {
          for (const raw of s.dartsDetail) {
            const nd = normalizeTrainingDart(raw);
            if (nd) out.push(nd);
          }
          continue;
        }
    
        // 2) Fallback : on reconstruit depuis bySegment (sessions plus anciennes)
        if (s.bySegment && typeof s.bySegment === "object") {
          for (const [segStr, entry] of Object.entries(s.bySegment)) {
            const seg = Number(segStr);
            if (!Number.isFinite(seg) || seg <= 0) continue;
    
            // entry peut être : nombre, ou {S,D,T}
            let S = 0, D = 0, T = 0;
    
            if (typeof entry === "number") {
              // vieux format = tout en simple
              S = Math.max(0, Math.round(entry));
            } else if (typeof entry === "object") {
              S = Number((entry as any).S) || 0;
              D = Number((entry as any).D) || 0;
              T = Number((entry as any).T) || 0;
            }
    
            // Simple
            for (let i = 0; i < S; i++) {
              out.push({ v: seg, mult: 1 });
            }
            // Double
            for (let i = 0; i < D; i++) {
              out.push({ v: seg, mult: 2 });
            }
            // Triple
            for (let i = 0; i < T; i++) {
              out.push({ v: seg, mult: 3 });
            }
          }
        }
      }

      return out;
    }, [filtered]);
  
    /* ============================================================
       HIT PRÉFÉRÉ (GLOBAL)
       ============================================================ */
       const segmentCount: Record<string, number> = {};
       for (const d of trainingDartsAll) {
      const v = Number((d as any)?.v) || 0;
      if (v <= 0) continue;
      const key = v === 25 ? "25" : String(v);
      segmentCount[key] = (segmentCount[key] || 0) + 1;
    }
  
    let favoriteSegmentKey: string | null = null;
    let favoriteSegmentCount = 0;
  
    for (const [k, c] of Object.entries(segmentCount)) {
      if (c > favoriteSegmentCount) {
        favoriteSegmentCount = c;
        favoriteSegmentKey = k;
      }
    }
  
    let favoriteHitDisplay: string | null = null;
    if (favoriteSegmentKey !== null) {
      favoriteHitDisplay =
        favoriteSegmentKey === "25"
          ? "25 (Bull)"
          : `${favoriteSegmentKey}`;
    }
  
   /* ============================================================
   STACK S/D/T PAR SEGMENT + MISS
   ============================================================ */
// S/D/T par valeur, construits à partir de trainingDartsAll (hits uniquement)
const segSDTMap: Record<string, { S: number; D: number; T: number }> = {};

// Miss = compteur global déjà calculé plus haut
let chartMissCount = gMiss;

for (const d of trainingDartsAll) {
  const v = Number((d as any)?.v) || 0;
  const mult = Number((d as any)?.mult) || 0;

  // On ignore les miss dans trainingDartsAll
  if (v === 0 || mult === 0) {
    continue;
  }

  const key = v === 25 ? "25" : String(v);
  if (!segSDTMap[key]) segSDTMap[key] = { S: 0, D: 0, T: 0 };

  if (mult === 1) segSDTMap[key].S++;
  else if (mult === 2) segSDTMap[key].D++;
  else if (mult === 3) segSDTMap[key].T++;
}

const HITS_SEGMENTS: (number | "MISS")[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  25,
  "MISS",
];

const maxStackHits = HITS_SEGMENTS.reduce(
  (max, seg) => {
    if (seg === "MISS") {
      return chartMissCount > max ? chartMissCount : max;
    }
    const data = segSDTMap[String(seg)];
    const tot = data ? data.S + data.D + data.T : 0;
    return tot > max ? tot : max;
  },
  0
);

    // Préférences par type de hit (S / D / T) + segment le moins touché
    let favSimpleKey: string | null = null;
    let favSimpleCount = 0;
    let favDoubleKey: string | null = null;
    let favDoubleCount = 0;
    let favTripleKey: string | null = null;
    let favTripleCount = 0;

    for (const [key, val] of Object.entries(segSDTMap)) {
      if (val.S > favSimpleCount) {
        favSimpleCount = val.S;
        favSimpleKey = key;
      }
      if (val.D > favDoubleCount) {
        favDoubleCount = val.D;
        favDoubleKey = key;
      }
      if (val.T > favTripleCount) {
        favTripleCount = val.T;
        favTripleKey = key;
      }
    }

    let leastHitKey: string | null = null;
    let leastHitCount = Infinity;

    for (const [key, count] of Object.entries(segmentCount)) {
      if (count > 0 && count < leastHitCount) {
        leastHitCount = count;
        leastHitKey = key;
      }
    }

    const labelForSegment = (k: string | null) =>
      k === null ? null : k === "25" ? "25 (Bull)" : k;

    const favoriteSimpleDisplay = labelForSegment(favSimpleKey);
    const favoriteDoubleDisplay = labelForSegment(favDoubleKey);
    const favoriteTripleDisplay = labelForSegment(favTripleKey);
    const leastHitDisplay = labelForSegment(leastHitKey);
  
    /* ============================================================
       Sparkline
       ============================================================ */
    function valueForMetric(
      s: TrainingX01Session,
      m: "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
    ): number {
      switch (m) {
        case "darts":
          return s.darts;
        case "avg3D":
          return s.avg3D;
        case "pctS": {
          const t = s.hitsS + s.hitsD + s.hitsT;
          return t > 0 ? (s.hitsS / t) * 100 : 0;
        }
        case "pctD": {
          const t = s.hitsS + s.hitsD + s.hitsT;
          return t > 0 ? (s.hitsD / t) * 100 : 0;
        }
        case "pctT": {
          const t = s.hitsS + s.hitsD + s.hitsT;
          return t > 0 ? (s.hitsT / t) * 100 : 0;
        }
        case "BV":
          return s.bestVisit;
        case "CO":
          return s.bestCheckout || 0;
        default:
          return 0;
      }
    }
  
    const sparkSeries = filtered.map((s) => ({
      x: s.date,
      y: valueForMetric(s, metric),
      session: s,
    }));
  
    /* ============================================================
       KPI CARROUSELS (5 BLOCS)
       ============================================================ */
  
    type RawKpiItem =
      | {
          kind: "num";
          label: string;
          raw: number | null;
          format?: (v: number) => string;
          allowZero?: boolean;
        }
      | {
          kind: "text";
          label: string;
          text: string | null;
        };
  
    type KpiDisplayItem = { label: string; value: string };
  
    function finalizeKpiItems(items: RawKpiItem[]): KpiDisplayItem[] {
      const out: KpiDisplayItem[] = [];
  
      for (const it of items) {
        if (it.kind === "num") {
          if (it.raw === null || Number.isNaN(it.raw)) continue;
          if (!it.allowZero && it.raw === 0) continue;
          const fmt = it.format ?? ((v: number) => `${v}`);
          out.push({ label: it.label, value: fmt(it.raw) });
        } else {
          if (!it.text) continue;
          out.push({ label: it.label, value: it.text });
        }
      }
      return out;
    }
  
    /* ---------- Bloc 1 — Doré (Cumul) ---------- */
    const goldItems = finalizeKpiItems([
      { kind: "num", label: "Darts totaux", raw: totalDarts, allowZero: true },
      { kind: "num", label: "Sessions", raw: totalSessions, allowZero: true },
      { kind: "num", label: "Hits S cumulés", raw: gHitsS },
      { kind: "num", label: "Hits D cumulés", raw: gHitsD },
      { kind: "num", label: "Hits T cumulés", raw: gHitsT },
      { kind: "num", label: "Miss cumulés", raw: gMiss },
      { kind: "num", label: "Bull cumulés", raw: gBull },
      { kind: "num", label: "DBull cumulés", raw: gDBull },
      { kind: "num", label: "Bust cumulés", raw: gBust },
    ]);
  
    /* ---------- Bloc 2 — Rose (Moyennes) ---------- */
    const pinkItems = finalizeKpiItems([
      {
        kind: "num",
        label: "Moy.3D (période)",
        raw: totalSessions > 0 ? globalAvg3D : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Moy.1D (période)",
        raw: totalSessions > 0 ? globalAvg1D : null,
        format: (v) => v.toFixed(2),
      },
      {
        kind: "num",
        label: "Darts / session",
        raw: totalSessions > 0 ? avgDarts : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Hits S / session",
        raw: totalSessions > 0 ? avgHitsSPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Hits D / session",
        raw: totalSessions > 0 ? avgHitsDPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Hits T / session",
        raw: totalSessions > 0 ? avgHitsTPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Miss / session",
        raw: totalSessions > 0 ? avgMissPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Bust / session",
        raw: totalSessions > 0 ? avgBustPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Bull / session",
        raw: totalSessions > 0 ? avgBullPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "DBull / session",
        raw: totalSessions > 0 ? avgDBullPerSession : null,
        format: (v) => v.toFixed(1),
      },
    ]);
  
    /* ---------- Bloc 3 — Bleu (Records + Hit préféré) ---------- */
    const blueItems = finalizeKpiItems([
      {
        kind: "text",
        label: "Hit préféré (global)",
        text: favoriteHitDisplay
          ? `${favoriteHitDisplay}`
          : null,
      },
      { kind: "num", label: "Best Visit (session)", raw: bestVisit },
      {
        kind: "num",
        label: "Best Checkout (session)",
        raw: bestCheckout > 0 ? bestCheckout : null,
      },
      {
        kind: "num",
        label: "Miss min / session",
        raw: minMiss,
        allowZero: true,
      },
      {
        kind: "num",
        label: "Miss max / session",
        raw: maxMiss,
      },
      {
        kind: "num",
        label: "Bust min / session",
        raw: minBust,
        allowZero: true,
      },
      {
        kind: "num",
        label: "Bust max / session",
        raw: maxBust,
      },
    ]);
  
    /* ---------- Bloc 4 — Vert clair (pourcentages généraux) ---------- */
    const green1Items = finalizeKpiItems([
      {
        kind: "num",
        label: "%Hits global",
        raw: pctHitsGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%Miss",
        raw: pctMissGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%S",
        raw: pctSimpleGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%D",
        raw: pctDoubleGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%T",
        raw: pctTripleGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%Bull (Bull+DBull)",
        raw: pctBullGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%DBull (Bull+DBull)",
        raw: pctDBullGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
    ]);
  
    /* ---------- Bloc 5 — Vert clair (BV / CO + dérivés) ---------- */
    const green2Items = finalizeKpiItems([
      { kind: "num", label: "Best Visit", raw: bestVisit },
      {
        kind: "num",
        label: "Best Checkout",
        raw: bestCheckout > 0 ? bestCheckout : null,
      },
      {
        kind: "num",
        label: "Moy.3D (période)",
        raw: totalSessions > 0 ? globalAvg3D : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "%Hits global",
        raw: pctHitsGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%T (global)",
        raw: pctTripleGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
    ]);
  
    const hasAnyKpi =
      goldItems.length ||
      pinkItems.length ||
      blueItems.length ||
      green1Items.length ||
      green2Items.length;
  
    /* ---------- Animation du carrousel ---------- */
    const [ticker, setTicker] = React.useState(0);
    React.useEffect(() => {
      if (!hasAnyKpi) return;
      const id = window.setInterval(() => {
        setTicker((t) => t + 1);
      }, 4000);
      return () => window.clearInterval(id);
    }, [hasAnyKpi, filtered.length]);
  
    const currentGold =
      goldItems.length > 0
        ? goldItems[ticker % goldItems.length]
        : null;
    const currentPink =
      pinkItems.length > 0
        ? pinkItems[ticker % pinkItems.length]
        : null;
    const currentBlue =
      blueItems.length > 0
        ? blueItems[ticker % blueItems.length]
        : null;
    const currentGreen1 =
      green1Items.length > 0
        ? green1Items[ticker % green1Items.length]
        : null;
    const currentGreen2 =
      green2Items.length > 0
        ? green2Items[ticker % green2Items.length]
        : null;
  
    /* ---------- Styles KPI ---------- */
    const baseKpiBox: React.CSSProperties = {
      borderRadius: 22,
      padding: 10,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",      // ← centrage horizontal
      justifyContent: "center",  // ← centrage vertical
      textAlign: "center",       // ← centrage du texte
      gap: 4,
      background: "linear-gradient(180deg,#15171B,#101115)",
      minHeight: 78,
    };
  
    const makeKpiBox = (accent: string): React.CSSProperties => ({
      ...baseKpiBox,
      border: `1px solid ${accent}`,
      boxShadow: `0 0 0 1px ${accent}33, 0 0 14px ${accent}88, 0 0 28px ${accent}55`,
      background:
        "radial-gradient(circle at 0% 0%, " +
        accent +
        "26 0, transparent 55%), linear-gradient(180deg,#15171B,#101115)",
    });
  
    const kpiLabel: React.CSSProperties = {
      fontSize: 10,
      color: T.text70,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    };
  
    const kpiSub: React.CSSProperties = {
      fontSize: 11,
      color: T.text70,
    };
  
    const statRowBox: React.CSSProperties = {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      padding: "6px 0",
      borderTop: `1px solid rgba(255,255,255,.06)`,
    };
  
    const metricPill: React.CSSProperties = {
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 11,
      border: "1px solid rgba(255,255,255,.18)",
      background: "rgba(0,0,0,.45)",
      cursor: "pointer",
    };
  
    /* ---------- Pagination sessions ---------- */
    React.useEffect(() => {
      setPage(1);
    }, [range, sessions.length]);
  
    const pageSize = 10;
    const totalPages =
      totalSessions > 0
        ? Math.max(1, Math.ceil(totalSessions / pageSize))
        : 1;
  
    const reversedSessions = filtered.slice().reverse();
  
    const pagedSessions = reversedSessions.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

        /* ---------- Résumé période (profil joueur Training X01) ---------- */
        let summaryTitle = "Mots du Coach";
        const summaryLines: string[] = [];
    
        if (totalSessions === 0) {
          summaryLines.push("Aucune session sur la période sélectionnée.");
        } else {
          // 1) Scoring global (Moy.3D)
          if (globalAvg3D >= 70) {
            summaryLines.push(
              "Très gros scoring global, moyenne 3D élevée sur la période."
            );
          } else if (globalAvg3D >= 60) {
            summaryLines.push(
              "Scoring solide avec une moyenne 3D correcte et régulière."
            );
          } else if (globalAvg3D >= 50) {
            summaryLines.push(
              "Scoring en progression, objectif : stabiliser au-dessus de 60 de moyenne 3D."
            );
          } else {
            summaryLines.push(
              "Scoring encore irrégulier, l’objectif est de stabiliser les visites et les scores moyens."
            );
          }
    
          // 2) Profil S / D / T (agressivité)
          if (pctTripleGlobal !== null && pctTripleGlobal >= 20) {
            summaryLines.push(
              "Fort volume de triples, jeu très offensif sur les segments T."
            );
          } else if (pctTripleGlobal !== null && pctTripleGlobal >= 10) {
            summaryLines.push(
              "Les triples commencent à bien rentrer, volume intéressant sur les T."
            );
          } else {
            summaryLines.push(
              "Peu de triples sur la période, axe de travail possible sur les segments T."
            );
          }
    
          // 3) Sécurité : Miss
          if (pctMissGlobal !== null) {
            if (pctMissGlobal <= 20) {
              summaryLines.push(
                "Taux de miss maîtrisé, bonne sécurité générale au tir."
              );
            } else if (pctMissGlobal <= 35) {
              summaryLines.push(
                "Taux de miss moyen, encore perfectible pour gagner en régularité."
              );
            } else {
              summaryLines.push(
                "Taux de miss élevé, priorité à la régularité et au contrôle des lancers."
              );
            }
          }
    
          // 4) Busts : gestion des fins
          if (avgBustPerSession > 0) {
            if (avgBustPerSession <= 1) {
              summaryLines.push(
                "Les busts restent rares, gestion des fins de legs plutôt propre."
              );
            } else if (avgBustPerSession <= 3) {
              summaryLines.push(
                "Quelques busts par session, attention aux fins de legs et aux calculs de checkout."
              );
            } else {
              summaryLines.push(
                "Beaucoup de busts sur la période, le travail sur les fins de legs et les checkouts est prioritaire."
              );
            }
          }
    
          // 5) Zone centrale : Bull / DBull
          const totalBullHits = gBull + gDBull;
          if (totalBullHits > 0) {
            if (pctDBullGlobal !== null && pctDBullGlobal >= 40) {
              summaryLines.push(
                "Très bon ratio DBull dans la zone centrale, excellente précision au centre."
              );
            } else if (pctBullGlobal !== null) {
              summaryLines.push(
                "Zone Bull utilisée régulièrement, précision correcte dans l’axe central."
              );
            }
          }
        }    
  
    /* ============================================================
       RENDER
       ============================================================ */
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ============================================================
          FILTRES JOUR / SEMAINE / MOIS / ANNÉE / TOTAL
          ============================================================ */}
      {/* FILTRES J/S/M/A/ALL — TITRE CENTRÉ, BOUTONS SUR UNE LIGNE SÉPARÉE */}
<div style={{ ...card, padding: 14, textAlign: "center" }}>
  
  {/* Titre centré */}
  <div
  style={{
    ...goldNeon,
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  }}
>
  TRAINING X01
</div>

  {/* Ligne unique de boutons */}
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      flexWrap: "nowrap",        // ❗ force une seule ligne
      transform: "scale(0.92)",  // ❗ légèrement plus petit
      transformOrigin: "center",
    }}
  >
    {(["day", "week", "month", "year", "all"] as TimeRange[]).map(
      (r) => (
        <GoldPill
          key={r}
          active={range === r}
          onClick={() => setRange(r)}
          style={{
            padding: "4px 12px",
            fontSize: 11,
            minWidth: "unset",
            whiteSpace: "nowrap",
          }}
        >
          {r === "day" && "Jour"}
          {r === "week" && "Semaine"}
          {r === "month" && "Mois"}
          {r === "year" && "Année"}
          {r === "all" && "All"}
        </GoldPill>
      )
    )}
  </div>

</div>

{/* ZONE KPI — 5 BLOCS AVEC DÉFILEMENT AUTO (2 LIGNES) */}
{totalSessions > 0 && hasAnyKpi && (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    {/* ---------- LIGNE 1 : CUMUL (BLEU) + MOYENNES (ROSE) ---------- */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
      }}
    >
      {/* 🔵 CUMUL */}
      <div style={makeKpiBox("#47B5FF")}>
        <div style={{ ...kpiLabel, color: "#47B5FF" }}>CUMUL</div>
        {currentGold ? (
          <>
            <div style={kpiSub}>{currentGold.label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#47B5FF",
              }}
            >
              {currentGold.value}
            </div>
          </>
        ) : (
          <div style={kpiSub}>Aucune donnée</div>
        )}
      </div>

      {/* 🌸 MOYENNES */}
      <div style={makeKpiBox("#FF6FB5")}>
        <div style={{ ...kpiLabel, color: "#FF6FB5" }}>MOYENNES</div>
        {currentPink ? (
          <>
            <div style={kpiSub}>{currentPink.label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#FFB8DE",
              }}
            >
              {currentPink.value}
            </div>
          </>
        ) : (
          <div style={kpiSub}>Aucune donnée</div>
        )}
      </div>
    </div>

    {/* ---------- LIGNE 2 : RECORDS (OR) + POURCENTAGES (VERT) + BV/CO (VERT) ---------- */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 10,
      }}
    >
      {/* 🟡 RECORDS */}
      <div style={makeKpiBox(T.gold)}>
        <div style={{ ...kpiLabel, color: T.gold }}>RECORDS</div>
        {currentBlue ? (
          <>
            <div style={kpiSub}>{currentBlue.label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: T.gold,
              }}
            >
              {currentBlue.value}
            </div>
          </>
        ) : (
          <div style={kpiSub}>Aucune donnée</div>
        )}
      </div>

      {/* 🟩 POURCENTAGES */}
      <div style={makeKpiBox("#7CFF9A")}>
        <div style={{ ...kpiLabel, color: "#7CFF9A" }}>POURCENTAGES</div>
        {currentGreen1 ? (
          <>
            <div style={kpiSub}>{currentGreen1.label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#E5FFEF",
              }}
            >
              {currentGreen1.value}
            </div>
          </>
        ) : (
          <div style={kpiSub}>Aucune donnée</div>
        )}
      </div>

      {/* 🟩 BV / CO */}
      <div style={makeKpiBox("#7CFF9A")}>
        <div style={{ ...kpiLabel, color: "#7CFF9A" }}>% / BV / CO</div>
        {currentGreen2 ? (
          <>
            <div style={kpiSub}>{currentGreen2.label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#E5FFEF",
              }}
            >
              {currentGreen2.value}
            </div>
          </>
        ) : (
          <div style={kpiSub}>Aucune donnée</div>
        )}
      </div>
    </div>
  </div>
)}

{/* ============================================================
    RÉSUMÉ DE LA PÉRIODE — Sessions
   ============================================================ */}
<div
  style={{
    borderRadius: 20,
    padding: "12px 14px",
    marginBottom: 3,     // marge réduite vers Stats détaillées
    marginTop: 15,       // marge augmentée vers les KPI
    background: "linear-gradient(180deg,#18181A,#0F0F11)",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "0 6px 18px rgba(0,0,0,.55)",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 13,
      fontWeight: 700,
      color: T.gold,
    }}
  >
    <span>Session</span>

    <span
      style={{
        fontWeight: 900,
        fontSize: 15,
        color: T.gold,
        textShadow:
          "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.55)",
      }}
    >
      {totalSessions}
    </span>
  </div>
</div>

      {/* ============================================================
          STATS DÉTAILLÉES — style bronze/doré (NOUVELLE VERSION)
          ============================================================ */}
      <div
        style={{
          borderRadius: 26,
          padding: 16,
          background: "linear-gradient(180deg,#141416,#0E0F12)",
          border: "1px solid rgba(255,255,255,.14)",
          boxShadow: "0 12px 26px rgba(0,0,0,.65)",
        }}
      >
        <div
  style={{
    fontSize: 14,
    fontWeight: 900,
    textTransform: "uppercase",
    color: T.gold,
    textShadow:
      "0 0 8px rgba(246,194,86,.9), 0 0 16px rgba(246,194,86,.45)",
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: "center",
  }}
>
  Stats détaillées (période)
</div>

        {totalSessions === 0 ? (
          <div style={{ fontSize: 12, color: T.text70, textAlign: "center" }}>
            Aucune session de training enregistrée sur la période sélectionnée.
          </div>
        ) : (
          <>
            {/* Helpers locaux */}
            {(() => {
              const fmtRange = (min: number | null, max: number | null) => {
                if (min === null && max === null) return "—";
                if (min === null) return `— / ${max}`;
                if (max === null) return `${min} / —`;
                if (min === max) return `${min}`;
                return `${min} / ${max}`;
              };

              const fmtPercent = (v: number | null) =>
                v === null ? "—" : `${v.toFixed(1)}%`;

                            /* =======================
                 1) TABLEAU PRINCIPAL
                 ======================= */
                 const rows = [
                  {
                    label: "Darts",
                    range: fmtRange(minDarts, maxDarts),
                    total: totalDarts,
                    pct: "", // ✅ colonne % vide pour Darts
                  },
                  {
                    label: "Hits",
                    range: fmtRange(minHits, maxHits),
                    total: totalHits,
                    pct: fmtPercent(totalThrows > 0 ? hitsPercent : null),
                  },
                  {
                    label: "Miss",
                    range: fmtRange(minMiss, maxMiss),
                    total: gMiss,
                    pct: fmtPercent(pctMissGlobal),
                  },
                  {
                    label: "S",
                    range: fmtRange(minS, maxS),
                    total: gHitsS,
                    pct: fmtPercent(pctSimpleGlobal),
                  },
                  {
                    label: "D",
                    range: fmtRange(minD, maxD),
                    total: gHitsD,
                    pct: fmtPercent(pctDoubleGlobal),
                  },
                  {
                    label: "T",
                    range: fmtRange(minT, maxT),
                    total: gHitsT,
                    pct: fmtPercent(pctTripleGlobal),
                  },
                  {
                    label: "Bull",
                    range: fmtRange(minBull, maxBull),
                    total: gBull,
                    pct: fmtPercent(pctBullGlobal),
                  },
                  {
                    label: "DBull",
                    range: fmtRange(minDBull, maxDBull),
                    total: gDBull,
                    pct: fmtPercent(pctDBullGlobal),
                  },
                  {
                    label: "Bust",
                    range: fmtRange(minBust, maxBust),
                    total: gBust,
                    pct: fmtPercent(pctBustGlobal),
                  },
                ];
  
                return (
                  <>
                    {/* En-têtes des colonnes */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.1fr 1.4fr 1.1fr 0.9fr",
                        fontSize: 11,
                        paddingBottom: 4,
                        borderBottom: "1px solid rgba(246,194,86,.45)",
                        marginBottom: 4,
                      }}
                    >
                      {/* Colonne label — sans texte "Intitulé" */}
                      <div />
  
                      {/* Colonne Session avec saut de ligne */}
                      <div
                        style={{
                          textAlign: "center",
                          color: T.text70,
                          display: "flex",
                          flexDirection: "column",
                          lineHeight: 1.1,
                        }}
                      >
                        <span>Session</span>
                        <span style={{ fontSize: 10 }}>min / max</span>
                      </div>
  
                      {/* Colonne Total */}
                      <div
                        style={{
                          textAlign: "center",
                          color: T.text70,
                        }}
                      >
                        Total
                      </div>
  
                      {/* Colonne % */}
                      <div
                        style={{
                          textAlign: "right",
                          color: T.text70,
                        }}
                      >
                        %
                      </div>
                    </div>
  
                    {/* Lignes */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {rows.map((r) => (
                        <div
                          key={r.label}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.1fr 1.4fr 1.1fr 0.9fr",
                            fontSize: 11,
                            padding: "4px 0",
                            borderBottom:
                              "1px solid rgba(246,194,86,.18)",
                          }}
                        >
                          <div style={{ color: T.text70 }}>{r.label}</div>
                          <div
                            style={{
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            {r.range}
                          </div>
                          <div
                            style={{
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            {r.total}
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              fontWeight: 600,
                            }}
                          >
                            {r.pct}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
            })()}

            {/* =======================
    2) MOYENNES — ROSE
   ======================= */}
<div
  style={{
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid rgba(246,194,86,.45)",
  }}
>
  <div
    style={{
      fontSize: 12,
      fontWeight: 800,
      color: "#FF6FB5", // ROSE
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
      textAlign: "center",
    }}
  >
    Moyennes
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-around",
      textAlign: "center",
      gap: 8,
    }}
  >
    <div>
      <div style={{ fontSize: 11, color: T.text70, marginBottom: 2 }}>
        Moy.1D
      </div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#FFB8DE",
          textShadow:
            "0 0 10px rgba(255,135,200,.8), 0 0 20px rgba(255,135,200,.4)",
        }}
      >
        {globalAvg1D.toFixed(2)}
      </div>
    </div>

    <div>
      <div style={{ fontSize: 11, color: T.text70, marginBottom: 2 }}>
        Moy.3D
      </div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#FFB8DE",
          textShadow:
            "0 0 10px rgba(255,135,200,.8), 0 0 20px rgba(255,135,200,.4)",
        }}
      >
        {globalAvg3D.toFixed(1)}
      </div>
    </div>

    <div>
      <div style={{ fontSize: 11, color: T.text70, marginBottom: 2 }}>
        Best Moy./S
      </div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#FFB8DE",
          textShadow:
            "0 0 10px rgba(255,135,200,.8), 0 0 20px rgba(255,135,200,.4)",
        }}
      >
        {bestAvg3DSession.toFixed(1)}
      </div>
    </div>
  </div>
</div>


  {/* =======================
    3) RECORDS — VERT
   ======================= */}
<div
  style={{
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid rgba(246,194,86,.45)",
  }}
>
  <div
    style={{
      fontSize: 12,
      fontWeight: 800,
      color: "#7CFF9A", // VERT
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
      textAlign: "center",
    }}
  >
    Records
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-around",
      textAlign: "center",
      gap: 8,
      paddingBottom: 6,
    }}
  >
    <div>
      <div style={{ color: T.text70, marginBottom: 2 }}>Best Visit</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#B2FFD0",
          textShadow:
            "0 0 10px rgba(100,255,180,.7), 0 0 20px rgba(100,255,180,.4)",
        }}
      >
        {bestVisit}
      </div>
    </div>

    <div>
      <div style={{ color: T.text70, marginBottom: 2 }}>Best CO</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#B2FFD0",
          textShadow:
            "0 0 10px rgba(100,255,180,.7), 0 0 20px rgba(100,255,180,.4)",
        }}
      >
        {bestCheckout || 0}
      </div>
    </div>
  </div>
</div>

{/* =======================
    FAVORIS — BLEU
   ======================= */}
<div
  style={{
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid rgba(246,194,86,.45)",
  }}
>
  <div
    style={{
      fontSize: 12,
      fontWeight: 800,
      color: "#47B5FF", // BLEU
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
      textAlign: "center",
    }}
  >
    Favoris
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-around",
      textAlign: "center",
      gap: 8,
      marginBottom: 2,
    }}
  >
    <div>
      <div style={{ color: T.text70, marginBottom: 2 }}>S</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#A6D4FF",
          textShadow:
            "0 0 10px rgba(100,160,255,.8), 0 0 20px rgba(100,160,255,.45)",
        }}
      >
        {favoriteSimpleDisplay ?? "—"}
      </div>
    </div>

    <div>
      <div style={{ color: T.text70, marginBottom: 2 }}>D</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#A6D4FF",
          textShadow:
            "0 0 10px rgba(100,160,255,.8), 0 0 20px rgba(100,160,255,.45)",
        }}
      >
        {favoriteDoubleDisplay ?? "—"}
      </div>
    </div>

    <div>
      <div style={{ color: T.text70, marginBottom: 2 }}>T</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#A6D4FF",
          textShadow:
            "0 0 10px rgba(100,160,255,.8), 0 0 20px rgba(100,160,255,.45)",
        }}
      >
        {favoriteTripleDisplay ?? "—"}
      </div>
    </div>
  </div>
</div>

          </>
        )}
      </div>

      {/* ------ 4) Résumé texte de la période ------ */}
      <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(246,194,86,.35)",
            fontSize: 11,
            color: T.text70,
            lineHeight: 1.45,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 4,
              color: T.gold,
            }}
          >
            {summaryTitle}
          </div>

          {summaryLines.length ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: 16,
                listStyleType: "disc",
              }}
            >
              {summaryLines.map((line, idx) => (
                <li key={idx} style={{ marginBottom: 2 }}>
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <div>
              Aucune donnée exploitable sur la période sélectionnée.
            </div>
          )}
        </div>

      {/* ============================================================
    SPARKLINE + PANNEAU DÉROULANT
    ============================================================ */}
<div style={card}>
  {/* Titre */}
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 8,
      alignItems: "center",
      marginBottom: 8,
    }}
  >
    <div
      style={{
        fontSize: 13,
        fontWeight: 800,
        textTransform: "uppercase",
        color: T.gold,
        textShadow:
          "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.45)",
        letterSpacing: 0.8,
      }}
    >
      Progression
    </div>
  </div>

  {/* Layout Sparkline + liste */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "2fr minmax(120px,1.1fr)",
      gap: 10,
      alignItems: "stretch",
    }}
  >
    {/* Sparkline */}
    <div style={{ display: "flex", alignItems: "center" }}>
      {sparkSeries.length ? (
        <SparklinePro
          points={sparkSeries.map((p) => ({ x: p.x, y: p.y }))}
          height={64}
        />
      ) : (
        <div style={{ fontSize: 12, color: T.text70 }}>
          Aucune session sur la période.
        </div>
      )}
    </div>

    {/* Liste déroulante des points */}
    <div
      style={{
        fontSize: 11,
        color: T.text70,
        maxHeight: 90,
        overflowY: "auto",
        paddingLeft: 4,
        borderLeft: "1px solid rgba(255,255,255,.12)",
      }}
    >
      {sparkSeries
        .slice()
        .reverse()
        .map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "2px 0",
              gap: 6,
            }}
          >
            <span style={{ whiteSpace: "nowrap" }}>
              {formatShortDate(p.session.date)}
            </span>
            <span style={{ fontWeight: 700, color: T.gold }}>
              {p.y.toFixed(1)}
            </span>
          </div>
        ))}
    </div>
  </div>

  {/* Sélecteur de métrique */}
  <div
    style={{
      marginTop: 8,
      display: "flex",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
    }}
  >
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {(
        [
          ["darts", "Darts"],
          ["avg3D", "3D"],
          ["pctS", "%S"],
          ["pctD", "%D"],
          ["pctT", "%T"],
          ["BV", "BV"],
          ["CO", "CO"],
        ] as const
      ).map(([k, lbl]) => (
        <button
          key={k}
          onClick={() => setMetric(k)}
          style={{
            ...metricPill,
            borderColor: metric === k ? T.gold : "rgba(255,255,255,.18)",
            color: metric === k ? T.gold : T.text70,
          }}
        >
          {lbl}
        </button>
      ))}
    </div>
  </div>
</div>

     {/* ============================================================
    RADAR HITS
    ============================================================ */}
<div style={card}>
  <div
    style={{
      fontSize: 13,
      fontWeight: 800,
      textTransform: "uppercase",
      color: T.gold,
      textShadow:
        "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.45)",
      letterSpacing: 0.8,
      marginBottom: 6,
    }}
  >
    RADAR HITS (TEST)
  </div>

  {trainingDartsAll.length ? (
  <React.Suspense fallback={<LazyFallback label="Chargement du radar…" />}>
    <TrainingRadar darts={trainingDartsAll} />
  </React.Suspense>
) : (
  <div style={{ fontSize: 12, color: T.text70 }}>
    Aucune fléchette enregistrée sur la période.
  </div>
  )}
</div>

{/* ============================================================
    GRAPHIQUE EN BÂTONS : HITS PAR SEGMENT (2 LIGNES CUSTOM ORDER)
    ============================================================ */}
<div style={card}>
  <div
    style={{
      fontSize: 13,
      fontWeight: 700,
      color: T.gold,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      textShadow: "0 0 6px rgba(246,194,86,.6)",
    }}
  >
    Hits par segment
  </div>

  {trainingDartsAll.length ? (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "linear-gradient(180deg,#15171B,#0C0D10)",
        padding: "12px 6px",
        borderRadius: 12,
      }}
    >
      {/* ORDRE EXACT demandé */}
      {[
        ["MISS", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Ligne 1
        [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25], // Ligne 2
      ].map((rowSegs, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 4,
            height: 120,
          }}
        >
          {rowSegs.map((seg) => {
            // MISS
            if (seg === "MISS") {
              const count = chartMissCount;
              const hPct =
                maxStackHits > 0 ? (count / maxStackHits) * 100 : 0;
              return (
                <div
                  key="MISS"
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 3,
                    height: "100%", // ✅ important
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      borderRadius: 999,
                      background: "#FF4B4B",
                      boxShadow: count
                        ? "0 0 6px rgba(255,75,75,0.85)"
                        : "none",
                      height: count
                        ? `${Math.max(10, hPct)}%`
                        : 4,
                      opacity: count ? 1 : 0.18,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 8,
                      color: T.text70,
                    }}
                  >
                    M
                  </div>
                </div>
              );
            }

            // SEGMENTS 1–20 + 25
            const key = String(seg);
            const data = segSDTMap[key] || { S: 0, D: 0, T: 0 };
            const total = data.S + data.D + data.T;

            const hPct =
              maxStackHits > 0 ? (total / maxStackHits) * 100 : 0;

            const baseHeight = total ? Math.max(10, hPct) : 4;

            const totalForRatio = total > 0 ? total : 1;

            const hS =
              total > 0
                ? Math.max(2, (data.S / totalForRatio) * baseHeight)
                : 0;

            const hD =
              total > 0
                ? Math.max(2, (data.D / totalForRatio) * baseHeight)
                : 0;

            const hT =
              total > 0
                ? Math.max(2, (data.T / totalForRatio) * baseHeight)
                : 0;

            return (
              <div
                key={seg}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 3,
                  height: "100%", // ✅ important
                }}
              >
                <div
                  style={{
                    width: 12,
                    borderRadius: 999,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column-reverse",
                    opacity: total ? 1 : 0.18,
                    boxShadow: total
                      ? "0 0 6px rgba(255,255,255,0.15)"
                      : "none",
                    height: total ? `${baseHeight}%` : 4,
                  }}
                >
                  {data.S > 0 && (
                    <div
                      style={{
                        height: `${hS}%`,
                        background: T.gold, // SIMPLE doré
                      }}
                    />
                  )}
                  {data.D > 0 && (
                    <div
                      style={{
                        height: `${hD}%`,
                        background: "#007A88", // DOUBLE bleu pétrole
                      }}
                    />
                  )}
                  {data.T > 0 && (
                    <div
                      style={{
                        height: `${hT}%`,
                        background: "#A259FF", // TRIPLE violet
                      }}
                    />
                  )}
                </div>

                {/* Label segment */}
                <div
                  style={{
                    fontSize: 8,
                    color: T.text70,
                  }}
                >
                  {seg === 25 ? "25" : seg}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  ) : (
    <div style={{ fontSize: 12, color: T.text70 }}>
      Aucune fléchette enregistrée sur la période.
    </div>
  )}
</div>

              {/* ============================================================
          LISTE DES DERNIÈRES SESSIONS + PAGINATION
          ============================================================ */}
      <div style={card}>
      <div
  style={{
    ...goldNeon,
    fontSize: 13,
    marginBottom: 6,
  }}
>
  DERNIÈRES SESSIONS
</div>

        {filtered.length === 0 && (
          <div style={{ fontSize: 12, color: T.text70 }}>
            Aucune session de training enregistrée pour l’instant.
          </div>
        )}

        {/* Sessions affichées 10 par page */}
        {pagedSessions.map((s) => (
          <div
            key={s.id}
            style={{
              marginTop: 6,
              padding: 8,
              borderRadius: 12,
              background: "rgba(0,0,0,.45)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: T.text70,
                fontSize: 12,
              }}
            >
              <span>{formatShortDate(s.date)}</span>
              <span style={{ fontWeight: 700 }}>
                {s.avg3D.toFixed(1)} Moy.3D
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 6,
                color: T.text70,
                fontSize: 12,
              }}
            >
              <div>
                <span>{s.darts} darts</span>
                <span>
                  {" "}
                  · BV {s.bestVisit}
                  {s.bestCheckout ? ` · CO ${s.bestCheckout}` : ""}
                </span>
              </div>

              {/* Petit bouton Détails à droite */}
              <button
                onClick={() => setSelected(s)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  background:
                    "linear-gradient(135deg,#F6C256,#FBE29A)",
                  color: "#141416",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Détails
              </button>
            </div>
          </div>
        ))}

        {/* Pagination 10 par page */}
        {totalPages > 1 && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "none",
                background:
                  page === 1
                    ? "rgba(255,255,255,.05)"
                    : "rgba(255,255,255,.18)",
                color: "#fff",
                fontSize: 11,
                cursor: page === 1 ? "default" : "pointer",
              }}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const active = p === page;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "none",
                    background: active
                      ? T.gold
                      : "rgba(255,255,255,.12)",
                    color: active ? "#000" : "#fff",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={page === totalPages}
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "none",
                background:
                  page === totalPages
                    ? "rgba(255,255,255,.05)"
                    : "rgba(255,255,255,.18)",
                color: "#fff",
                fontSize: 11,
                cursor:
                  page === totalPages ? "default" : "pointer",
              }}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL DÉTAIL SESSION — avec radar + hits par segment
          ============================================================ */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...card,
              maxWidth: 340,
              width: "92%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header modal */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                Session du {formatShortDate(selected.date)}
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: T.text70,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Stats principales */}
            <div>
              <div style={statRowBox}>
                <span>Moy.3D</span>
                <span>{selected.avg3D.toFixed(1)}</span>
              </div>
              <div style={statRowBox}>
                <span>Moy.1D</span>
                <span>{selected.avg1D.toFixed(2)}</span>
              </div>
              <div style={statRowBox}>
                <span>Darts</span>
                <span>{selected.darts}</span>
              </div>
              <div style={statRowBox}>
                <span>Best visit</span>
                <span>{selected.bestVisit}</span>
              </div>
              <div style={statRowBox}>
                <span>Best checkout</span>
                <span>{selected.bestCheckout ?? "—"}</span>
              </div>
              <div style={statRowBox}>
                <span>S / D / T</span>
                <span>
                  {(selected.hitsS ?? 0)} / {(selected.hitsD ?? 0)} /{" "}
                  {(selected.hitsT ?? 0)}
                </span>
              </div>
              <div style={statRowBox}>
                <span>Miss / Bust</span>
                <span>
                  {(selected.miss ?? 0)} / {(selected.bust ?? 0)}
                </span>
              </div>
              <div style={statRowBox}>
                <span>Bull / DBull</span>
                <span>
                  {(selected.bull ?? 0)} / {(selected.dBull ?? 0)}
                </span>
              </div>
            </div>

            {/* Radar de la session */}
            <div
              style={{
                marginTop: 12,
                paddingTop: 8,
                borderTop: "1px solid rgba(255,255,255,.12)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: T.text70,
                  marginBottom: 4,
                }}
              >
                Radar — session
              </div>
              {Array.isArray(selected.dartsDetail) && selected.dartsDetail.length ? (
  <React.Suspense fallback={<LazyFallback label="Chargement du radar session…" />}>
    <TrainingRadar darts={selected.dartsDetail} />
  </React.Suspense>
) : (
  <div style={{ fontSize: 11, color: T.text70 }}>
    Pas de détail flèche par fléchette pour cette session.
  </div>
              )}
            </div>

            {/* Hits par segment — session */}
            <div
              style={{
                marginTop: 12,
                paddingTop: 8,
                borderTop: "1px solid rgba(255,255,255,.12)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: T.text70,
                  marginBottom: 4,
                }}
              >
                Hits par segment (session)
              </div>

              {Array.isArray(selected.dartsDetail) &&
              selected.dartsDetail.length ? (() => {
                const localMap: Record<
                  string,
                  { S: number; D: number; T: number }
                > = {};
                let localMiss = 0;

                for (const d of selected.dartsDetail!) {
                  const v = Number((d as any)?.v) || 0;
                  const mult = Number((d as any)?.mult) || 0;

                  if (v === 0 || mult === 0) {
                    localMiss++;
                    continue;
                  }

                  const key = v === 25 ? "25" : String(v);
                  if (!localMap[key]) {
                    localMap[key] = { S: 0, D: 0, T: 0 };
                  }
                  if (mult === 1) localMap[key].S++;
                  else if (mult === 2) localMap[key].D++;
                  else if (mult === 3) localMap[key].T++;
                }

                const SESSION_SEGMENTS: (number | "MISS")[] = [
                  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                  25,
                  "MISS",
                ];

                const maxLocal = SESSION_SEGMENTS.reduce((m, seg) => {
                  if (seg === "MISS") {
                    return localMiss > m ? localMiss : m;
                  }
                  const d = localMap[String(seg)];
                  const tot = d ? d.S + d.D + d.T : 0;
                  return tot > m ? tot : m;
                }, 0);

                if (maxLocal === 0) {
                  return (
                    <div
                      style={{ fontSize: 11, color: T.text70 }}
                    >
                      Aucun hit enregistré pour cette session.
                    </div>
                  );
                }

                return (
                  <div
                    style={{
                      height: 110,
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 3,
                      padding: "6px 2px",
                      borderRadius: 14,
                      background:
                        "linear-gradient(180deg,#15171B,#0C0D10)",
                    }}
                  >
                    {SESSION_SEGMENTS.map((seg) => {
                      if (seg === "MISS") {
                        const count = localMiss;
                        const hPct =
                          maxLocal > 0
                            ? (count / maxLocal) * 100
                            : 0;
                        return (
                          <div
                            key="MISS"
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 3,
                            }}
                          >
                            <div
                              style={{
                                width: 9,
                                borderRadius: 999,
                                background: "#FF4B4B",
                                boxShadow: count
                                  ? "0 0 6px rgba(255,75,75,0.85)"
                                  : "none",
                                height: count
                                  ? `${Math.max(10, hPct)}%`
                                  : 4,
                                opacity: count ? 1 : 0.25,
                              }}
                            />
                            <div
                              style={{
                                fontSize: 7,
                                color: T.text70,
                              }}
                            >
                              M
                            </div>
                          </div>
                        );
                      }

                      const key = String(seg);
                      const data =
                        localMap[key] || { S: 0, D: 0, T: 0 };
                      const total = data.S + data.D + data.T;
                      const hPct =
                        maxLocal > 0
                          ? (total / maxLocal) * 100
                          : 0;

                      const baseHeight = total
                        ? Math.max(12, hPct)
                        : 4;
                      const totalForRatio =
                        total > 0 ? total : 1;
                      const hS =
                        total > 0
                          ? Math.max(
                              3,
                              (data.S / totalForRatio) * baseHeight
                            )
                          : 0;
                      const hD =
                        total > 0
                          ? Math.max(
                              3,
                              (data.D / totalForRatio) * baseHeight
                            )
                          : 0;
                      const hT =
                        total > 0
                          ? Math.max(
                              3,
                              (data.T / totalForRatio) * baseHeight
                            )
                          : 0;

                      return (
                        <div
                          key={seg}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 3,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              borderRadius: 999,
                              overflow: "hidden",
                              display: "flex",
                              flexDirection: "column-reverse",
                              opacity: total ? 1 : 0.2,
                              boxShadow: total
                                ? "0 0 6px rgba(255,255,255,0.2)"
                                : "none",
                              height: total
                                ? `${baseHeight}%`
                                : 4,
                            }}
                          >
                            {data.S > 0 && (
                              <div
                                style={{
                                  height: `${hS}%`,
                                  background: T.gold, // S = doré
                                }}
                              />
                            )}
                            {data.D > 0 && (
                              <div
                                style={{
                                  height: `${hD}%`,
                                  background: "#007A88", // D = bleu pétrole
                                }}
                              />
                            )}
                            {data.T > 0 && (
                              <div
                                style={{
                                  height: `${hT}%`,
                                  background: "#A259FF", // T = violet
                                }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 7,
                              color: T.text70,
                            }}
                          >
                            {seg === 25 ? "25" : seg}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : (
                <div style={{ fontSize: 11, color: T.text70 }}>
                  Pas de détail flèche par flèche pour cette session.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ============================================
// Sous-composant : TrainingHitsBySegment
// - utilise TrainingX01Session (TrainingStore)
// - ajoute un segment spécial "MISS"
// ============================================

const TRAINING_SEGMENTS: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25,
];

type SegmentBarAgg = {
  key: string;   // "1".."20","25","MISS"
  label: string; // texte affiché sous la barre
  s: number;
  d: number;
  t: number;
};

/**
 * Construit les données pour "Hits par segment" à partir des sessions X01.
 * - Empile S/D/T pour chaque valeur 1..20,25
 * - Ajoute un segment spécial "MISS" alimenté par session.miss
 */
function buildTrainingBarsFromSessions(
  sessions: TrainingX01Session[],
): SegmentBarAgg[] {
  const map: Record<string, SegmentBarAgg> = {};

  // initialise 1..20,25
  for (const v of TRAINING_SEGMENTS) {
    const k = String(v);
    map[k] = {
      key: k,
      label: k,
      s: 0,
      d: 0,
      t: 0,
    };
  }

  // initialise le segment spécial "MISS"
  map["MISS"] = {
    key: "MISS",
    label: "Miss",
    s: 0,
    d: 0,
    t: 0,
  };

  for (const s of sessions) {
    // agrégats détaillés par valeur
    if (s.bySegmentS) {
      for (const [k, val] of Object.entries(s.bySegmentS)) {
        if (!map[k]) continue;
        map[k].s += val || 0;
      }
    }
    if (s.bySegmentD) {
      for (const [k, val] of Object.entries(s.bySegmentD)) {
        if (!map[k]) continue;
        map[k].d += val || 0;
      }
    }
    if (s.bySegmentT) {
      for (const [k, val] of Object.entries(s.bySegmentT)) {
        if (!map[k]) continue;
        map[k].t += val || 0;
      }
    }

    // 👉 Miss : on utilise le compteur global s.miss
    const missCount = s.miss ?? 0;
    if (missCount > 0) {
      // on le met dans "s" (Simple) pour une seule couleur
      map["MISS"].s += missCount;
    }
  }

  // On renvoie les segments dans l'ordre radar + Miss en dernier
  const ordered: SegmentBarAgg[] = [];

  for (const v of TRAINING_SEGMENTS) {
    const k = String(v);
    if (map[k]) ordered.push(map[k]);
  }

  // segment Miss à la fin
  ordered.push(map["MISS"]);

  return ordered;
}

type TrainingHitsBySegmentProps = {
  sessions: TrainingX01Session[];
};

function TrainingHitsBySegment({ sessions }: TrainingHitsBySegmentProps) {
  const bars = buildTrainingBarsFromSessions(sessions);

  if (!bars.length) {
    return (
      <div className="panel-card training-card">
        <div className="panel-card-header">
          <span>Hits par segment</span>
        </div>
        <div className="panel-card-body text-muted">
          Aucune session Training X01 pour ce joueur.
        </div>
      </div>
    );
  }

  return (
    <div className="panel-card training-card">
      <div className="panel-card-header">
        <span>Hits par segment</span>
      </div>

      <div className="training-bars">
        {bars.map((b) => {
          const total = b.s + b.d + b.t;
          const sHeight = total ? (b.s / total) * 100 : 0;
          const dHeight = total ? (b.d / total) * 100 : 0;
          const tHeight = total ? (b.t / total) * 100 : 0;

          return (
            <div key={b.key} className="training-bar">
              <div className="training-bar-stack">
                {/* Simple = doré */}
                <div
                  className="training-bar-seg training-bar-seg-s"
                  style={{ height: `${sHeight}%` }}
                />
                {/* Double = bleu pétrole */}
                <div
                  className="training-bar-seg training-bar-seg-d"
                  style={{ height: `${dHeight}%` }}
                />
                {/* Triple = violet */}
                <div
                  className="training-bar-seg training-bar-seg-t"
                  style={{ height: `${tHeight}%` }}
                />
              </div>
              <div className="training-bar-label">{b.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StatsHub({

go,
  tab, // "stats" | "training" | "history"
  memHistory,
  initialPlayerId,
  initialStatsSubTab,
  mode = "active", // "active" = joueur actif, "locals" = profils locaux + bots
  playerId,
  sportOverride,
}: Props) {
  // CSS shimmer
  useInjectStatsNameCss();

  // ============================================================
  // ✅ store snapshot (required by some sport-specific pages)
  // StatsHub est historiquement appelé sans prop `store`, mais certaines pages
  // (ex: Mölkky stats pages) attendent {profiles, activeProfileId, history}.
  // On hydrate donc ici un snapshot léger depuis IDB.
  // ============================================================
  const [store, setStore] = React.useState<any>(() => ({ profiles: [], activeProfileId: null, history: [] }));

  React.useEffect(() => {
    let alive = true;

    const refresh = async () => {
      try {
        const s: any = await loadStore<any>();
        if (!alive) return;
        if (s && typeof s === "object") {
          setStore({
            ...(s || {}),
            profiles: Array.isArray((s as any).profiles) ? (s as any).profiles : [],
            activeProfileId: (s as any).activeProfileId ?? null,
            history: Array.isArray((s as any).history) ? (s as any).history : [],
          });
        }
      } catch {
        // keep fallback
      }
    };

    refresh();
    const onUpd = () => refresh();
    window.addEventListener("dc-store-updated", onUpd as any);
    return () => {
      alive = false;
      window.removeEventListener("dc-store-updated", onUpd as any);
    };
  }, []);

  
  const { sport } = useSport();
  const effectiveSport = String(sportOverride || sport || "").toLowerCase();
  const isDiceSport = effectiveSport.includes("dice");
  const isMolkkySport = effectiveSport === "molkky";
  const isBabyFootSport = effectiveSport === "babyfoot";
  const isPingPongSport = effectiveSport === "pingpong";
const { enabled: devModeEnabled } = useDevMode();
  const [showRuntimeDebug, setShowRuntimeDebug] = React.useState(false);
  const STATS_DEBUG = devModeEnabled && showRuntimeDebug;

  React.useEffect(() => {
    if (!devModeEnabled) {
      setShowRuntimeDebug(false);
      return;
    }
    try {
      const v = localStorage.getItem("dc_stats_runtime_debug");
      if (v === "1") setShowRuntimeDebug(true);
    } catch {}
  }, [devModeEnabled]);



  // ✅ Bootstrap stats_index centralisé.
  // On ne rebuild qu'une seule fois si l'index n'existe pas encore,
  // au lieu de réinjecter de gros blobs dans le store principal.
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await getOrRebuildStatsIndex({ includeNonFinished: false });
      } catch (e) {
        if (!cancelled) console.warn("[stats_index bootstrap] failed", e);
      }
    };

    const ric = (window as any)?.requestIdleCallback as undefined | ((cb: () => void, opts?: any) => any);
    const id = ric ? ric(() => { void run(); }, { timeout: 1200 }) : window.setTimeout(() => { void run(); }, 250);

    return () => {
      cancelled = true;
      try {
        if (ric && (window as any)?.cancelIdleCallback) {
          (window as any).cancelIdleCallback(id);
        } else {
          clearTimeout(id);
        }
      } catch {}
    };
  }, []);

// ============================================================
// 🔎 DEBUG TEMPORAIRE — vérifier IndexedDB (History)
// Désactivé par défaut sur mobile pour éviter de charger/logguer trop.
// Activer via localStorage.setItem("dc_stats_debug_probe","1")
// ============================================================
React.useEffect(() => {
  let enabled = false;
  try {
    enabled = localStorage.getItem("dc_stats_debug_probe") === "1";
  } catch {}
  if (!enabled) return;

  try {
    const anyIDB: any = indexedDB as any;
    if (typeof anyIDB !== "undefined" && typeof anyIDB.databases === "function") {
      anyIDB.databases().then((dbs: any[]) => {
        console.log("[IDB] databases =", dbs);
      });
    }
  } catch (e) {
    console.warn("[IDB] databases() failed", e);
  }

  History.list()
    .then((rows: any[]) => {
      console.log("[DEBUG] History.list count =", rows?.length || 0);
      console.log("[DEBUG] History.sample =", rows?.[0]);
    })
    .catch((e: any) => {
      console.warn("[DEBUG] History.list error =", e);
    });
}, []);

// ==========================
// ✅ NEW — History normalisée (PHASE 2)
// ==========================
const [normalizedMatches, setNormalizedMatches] = React.useState<NormalizedMatch[]>(
  []
);

// ✅ Charge l'historique normalisé (source unique pour stats, à terme)
React.useEffect(() => {
  let mounted = true;

  const load = async () => {
    try {
      const nm = await loadNormalizedHistory();
      if (!mounted) return;
      setNormalizedMatches(takeRecent(Array.isArray(nm) ? nm : [], STATSHUB_HISTORY_LIGHT_CAP));
    } catch {
      if (!mounted) return;
      setNormalizedMatches([]);
    }
  };

  load();

  const onUpd = () => load();

  if (typeof window !== "undefined") {
    window.addEventListener("dc-history-updated", onUpd as any);
  }

  return () => {
    mounted = false;
    if (typeof window !== "undefined") {
      window.removeEventListener("dc-history-updated", onUpd as any);
    }
  };
}, []);

// -- 0) BOT helper --
function isBotPlayer(p: PlayerLite): boolean {
  const name = (p.name ?? "").toLowerCase();
  const id = (p.id ?? "").toLowerCase();
  return (
    id.startsWith("bot_") ||
    id.startsWith("bot:") ||
    name.includes("bot") ||
    name.includes("[bot]")
  );
}

// -- 0 bis) PROFIL ACTUEL (via hook, safe) --
const cp = useCurrentProfile();
const profile = cp?.profile ?? null;

// -- 1) Carrousel des modes --
const modeDefs = React.useMemo(
  () =>
    isDiceSport
      ? [{ key: "dashboard", label: "Dashboard global" }]
      : isMolkkySport
        ? [
            { key: "dashboard", label: "Dashboard global" },
            { key: "leaderboards", label: "Classements" },
            { key: "history", label: "Historique" },
          ]
        : (isBabyFootSport || isPingPongSport)
          ? [
              { key: "dashboard", label: "Dashboard global" },
              { key: "leaderboards", label: "Classements" },
            ]
          : [
              { key: "dashboard", label: "Dashboard global" },
              { key: "dartsets", label: "Mes fléchettes" },
              { key: "x01_multi", label: "X01 multi" },
              { key: "x01_compare", label: "Comparateur X01" },
              { key: "cricket", label: "Cricket" },
              { key: "shanghai", label: "Shanghai" },
              { key: "killer", label: "Killer" },
              { key: "golf", label: "Golf" },
              { key: "batard", label: "BÂTARD" },
              { key: "territories", label: "Territories" },
              { key: "leaderboards", label: "Classements" },
              { key: "history", label: "Historique" },
            ],
  [isDiceSport, isMolkkySport, isBabyFootSport, isPingPongSport]
);

const totalModes = modeDefs.length;

const initialModeIndex = React.useMemo(() => {
  if (!initialStatsSubTab) return 0;
  const idx = modeDefs.findIndex((m) => m.key === initialStatsSubTab);
  return idx >= 0 ? idx : 0;
}, [initialStatsSubTab, modeDefs]);

const [modeIndex, setModeIndex] = React.useState(initialModeIndex);
const currentMode = modeDefs[modeIndex]?.key ?? "dashboard";
const currentModeLabel = modeDefs[modeIndex]?.label ?? "Dashboard global";

const goPrevMode = React.useCallback(() => {
  if (totalModes <= 1) return;
  setModeIndex((i) => (i - 1 + totalModes) % totalModes);
}, [totalModes]);

const goNextMode = React.useCallback(() => {
  if (totalModes <= 1) return;
  setModeIndex((i) => (i + 1) % totalModes);
}, [totalModes]);

const canScrollModes = totalModes > 1;

// -- 2) Historiques (legacy + api + mem) --
const storeHistory = useStoreHistory();
const apiHistory = useHistoryAPI();

const [storeProfiles, setStoreProfiles] = React.useState<PlayerLite[]>([]);

React.useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      const store: any = await loadStore<any>();
      if (!mounted) return;

      const arr: PlayerLite[] = Array.isArray(store?.profiles)
        ? store.profiles.map((p: any) => ({
            id: String(p.id),
            name: p.name,
            avatarDataUrl: p.avatarDataUrl ?? null,
          }))
        : [];

      setStoreProfiles(arr);
    } catch {
      if (!mounted) return;
      setStoreProfiles([]);
    }
  })();

  return () => {
    mounted = false;
  };
}, []);

// Mini-store pour le comparateur X01 (StatsX01Compare)
const pseudoStoreForCompare = React.useMemo(
  () => ({ profiles: storeProfiles }),
  [storeProfiles]
);

// Fusion en éliminant doublons (mem + api + store)
const combinedHistory = React.useMemo(() => {
  const mem = toArr<SavedMatch>(memHistory);
  const all = [...mem, ...apiHistory, ...storeHistory];

  const byId = new Map<string, SavedMatch>();
  for (const r of all) {
    const id = String((r as any)?.id ?? "");
    if (!id) continue;

    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, r);
    } else {
      const tNew = (r as any)?.updatedAt ?? (r as any)?.createdAt ?? 0;
      const tOld =
        (existing as any)?.updatedAt ?? (existing as any)?.createdAt ?? 0;
      if (tNew >= tOld) byId.set(id, r);
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      ((b as any)?.updatedAt ?? (b as any)?.createdAt ?? 0) -
      ((a as any)?.updatedAt ?? (a as any)?.createdAt ?? 0)
  );
}, [memHistory, apiHistory, storeHistory]);

const scopedCombinedHistory = React.useMemo(() => {
  const arr = Array.isArray(combinedHistory) ? combinedHistory : [];
  return arr.filter((r: any) => recordMatchesEffectiveSport(r, effectiveSport));
}, [combinedHistory, effectiveSport]);

// ✅ IMPORTANT : records DOIT TOUJOURS EXISTER (sinon écran noir)
// Normalisation "records" pour les composants legacy qui attendent SavedMatch normalisé.
const records = React.useMemo(() => {
  try {
    const arr = Array.isArray(scopedCombinedHistory) ? scopedCombinedHistory : [];
    return arr.map((r) => normalizeRecordPlayers(r, storeProfiles));
  } catch {
    return [];
  }
}, [scopedCombinedHistory, storeProfiles]);

// ==========================
// ✅ DEBUG + SOURCE UNIQUE pour toutes les stats
// ==========================

// 1) Nettoie/force des ids string dans normalizedMatches + injecte noms/avatars depuis storeProfiles
const normalizedMatchesClean = React.useMemo(() => {
  const byId = new Map<string, PlayerLite>();
  for (const p of storeProfiles) byId.set(String((p as any)?.id), p as any);

  const nm = Array.isArray(normalizedMatches) ? normalizedMatches : [];
  return nm.map((m: any) => {
    const players = Array.isArray(m?.players) ? m.players : [];
    const fixedPlayers = players.map((pp: any) => {
      const pid = String(pp?.id ?? "");
      const sp = byId.get(pid);
      return {
        ...pp,
        // ✅ IMPORTANT: les agrégateurs unifiés attendent `playerId`
        // (le centre de stats utilise `selectedPlayer.id` comme identifiant)
        id: pid,
        playerId: String(pp?.playerId ?? pid),
        name: pp?.name ?? (sp as any)?.name ?? "",
        avatarDataUrl: pp?.avatarDataUrl ?? (sp as any)?.avatarDataUrl ?? null,
      };
    });

    return {
      ...m,
      id: String(m?.id ?? ""),
      kind: String(m?.kind ?? m?.mode ?? ""),
      status: String(m?.status ?? "finished"),
      players: fixedPlayers,
    };
  });
}, [normalizedMatches, storeProfiles]);

// 2) Fallback best-effort : si normalizedMatches est vide, on fabrique une version "normalized" depuis records
function recordToNormalizedFallback(r: any): any | null {
  if (!r) return null;

  const id = String(r.id ?? "");
  const kind = String(r.kind ?? r.mode ?? r.game ?? "");
  const status = String(r.status ?? (r.winnerId ? "finished" : "finished"));

  const players = Array.isArray(r.players)
    ? r.players.map((p: any) => ({
        id: String(p?.id ?? ""),
        playerId: String(p?.playerId ?? p?.id ?? ""),
        name: p?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? null,
      }))
    : [];

  const payload = (r.payload ?? r.payloadCompressed ?? r.data ?? null) as any;

  return {
    id,
    kind,
    status,
    players,
    payload,
    createdAt: r.createdAt ?? 0,
    updatedAt: r.updatedAt ?? 0,
  };
}


// ---- Dice rows (for DiceGame sport) ----
const diceRows = React.useMemo(() => {
  const arr = Array.isArray(records) ? records : [];
  return arr.filter((r: any) => {
    const k = String(r?.kind ?? r?.payload?.kind ?? r?.summary?.kind ?? "").toLowerCase();
    const sp = String(r?.sport ?? r?.payload?.sport ?? "").toLowerCase();
    return k.includes("dice") || sp.includes("dice");
  });
}, [records?.length]);

const normalizedMatchesScoped = React.useMemo(() => {
  const arr = Array.isArray(normalizedMatchesClean) ? normalizedMatchesClean : [];
  return arr.filter((m: any) => normalizedMatchMatchesEffectiveSport(m, effectiveSport));
}, [normalizedMatchesClean, effectiveSport]);

const nmFromRecordsFallback = React.useMemo(() => {
  const arr = Array.isArray(records) ? records : [];
  return arr.map(recordToNormalizedFallback).filter(Boolean);
}, [records?.length]);

// 3) ✅ SOURCE UNIQUE utilisée PARTOUT dans StatsHub
const nmEffective = React.useMemo(() => {
  return normalizedMatchesScoped.length ? normalizedMatchesScoped : nmFromRecordsFallback;
}, [normalizedMatchesScoped, nmFromRecordsFallback]);

// -- 3bis) Liste unique de tous les joueurs vus (SOURCE UNIQUE nmEffective)
// ✅ FIX CRITICAL : si l'historique normalisé ne remonte pas de players,
// on fallback sur storeProfiles, puis sur le profil actif (useCurrentProfile)
const allPlayers = React.useMemo(() => {
  const map = new Map<string, PlayerLite>();

  // 1) Essaye d'abord nmEffective
  const nm = Array.isArray(nmEffective) ? nmEffective : [];
  for (const m of nm) {
    const players = Array.isArray((m as any)?.players) ? (m as any).players : [];
    for (const p of players) {
      const pid = String((p as any)?.id ?? "");
      if (!pid) continue;
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: (p as any)?.name ?? "",
          avatarDataUrl: (p as any)?.avatarDataUrl ?? null,
        });
      }
    }
  }

  // 2) Fallback : profils locaux du store
  if (map.size === 0) {
    const sp = Array.isArray(storeProfiles) ? storeProfiles : [];
    for (const p of sp) {
      const pid = String((p as any)?.id ?? "");
      if (!pid) continue;
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: (p as any)?.name ?? "",
          avatarDataUrl: (p as any)?.avatarDataUrl ?? null,
        });
      }
    }
  }

  // 3) Fallback ultime : profil actif (si dispo)
  if (map.size === 0 && profile?.id) {
    map.set(String(profile.id), {
      id: String(profile.id),
      name: (profile as any)?.name ?? (profile as any)?.displayName ?? "Joueur",
      avatarDataUrl: (profile as any)?.avatarDataUrl ?? null,
    });
  }

  return Array.from(map.values());
}, [nmEffective, storeProfiles, profile?.id]);

// ---------- 4) Sélection joueur + option BOTS / mode actif vs locaux ----------

// Id du joueur actif transmis par StatsShell
const activePlayerIdRaw = (playerId ?? initialPlayerId ?? (profile as any)?.id ?? null) as
  | string
  | null;

const activeProfileName =
  ((profile as any)?.displayName ?? (profile as any)?.name ?? (profile as any)?.nickname ?? "") as string;

// Local-only resolution: if the active profile id is not present in history (typical when history uses legacy numeric ids),
// we fallback to the player id that matches by name / most frequent in history.
const activePlayerId = React.useMemo(() => {
  return resolveActivePlayerIdLocalOnly({
    activeId: activePlayerIdRaw,
    activeName: activeProfileName,
    allPlayers,
    records: normalizedMatchesClean,
  });
}, [activePlayerIdRaw, activeProfileName, allPlayers, normalizedMatchesClean]);

// Key id used for UI/cache (keeps the actual active profile id)
const activeKeyId = String((profile as any)?.id ?? activePlayerIdRaw ?? "");


  // ✅ DEBUG (à coller ICI, juste après activePlayerId)
React.useEffect(() => {
  // eslint-disable-next-line no-console
  console.log("[StatsHub] activePlayerId =", activePlayerId, "mode =", mode);
}, [activePlayerId, mode]);

// Liste de joueurs selon le mode : active / locals / all
const playersForMode = React.useMemo(() => {
  if (!allPlayers.length) return [];

  // ✅ FIX: si activePlayerId n’est pas trouvé dans l’historique,
  // on fallback sur allPlayers (sinon "Aucun joueur trouvé.")
  if (mode === "active") {
    if (activePlayerId) {
      const found = allPlayers.find((p) => p.id === String(activePlayerId));
      return found ? [found] : allPlayers; // ✅ fallback
    }
    return allPlayers; // ✅ pas d’id -> fallback
  }

  if (mode === "locals" && activePlayerId) {
    return allPlayers.filter((p) => p.id !== String(activePlayerId));
  }

  return allPlayers;
}, [allPlayers, mode, activePlayerId]);

// Toggle "Inclure les BOTS"
const [showBots, setShowBots] = React.useState(false);

// Liste finale visible dans le carrousel
const filteredPlayers = React.useMemo(() => {
  if (!playersForMode.length) return [];
  return playersForMode
    .slice()
    .sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "", "fr", { sensitivity: "base" })
    )
    .filter((p) => {
      if (mode === "active") return true;
      return showBots || !isBotPlayer(p);
    });
}, [playersForMode, showBots, mode]);

// Sélection courante
const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(
  activePlayerId ? String(activePlayerId) : null
);
const [trainingSubView, setTrainingSubView] = React.useState<"stats" | "leaderboards">("stats");

// Si le parent change initialPlayerId / playerId → on suit
  React.useEffect(() => {
    // Mode "profil actif" : on colle STRICTEMENT au profil actif (pas de fallback sur l'ancien choix).
    if (mode === "active") {
      setSelectedPlayerId(activePlayerId ? String(activePlayerId) : null);
      return;
    }

    // Autres modes : on conserve la sélection si elle existe encore dans la liste filtrée.
    const prev = selectedPlayerId;
    if (prev && filteredPlayers.some((p) => p.id === prev)) return;
    setSelectedPlayerId(activePlayerId ? String(activePlayerId) : null);
  }, [mode, activePlayerId, selectedPlayerId, filteredPlayers]);

// Si rien de sélectionné OU joueur filtré → 1er dispo
React.useEffect(() => {
  if (!filteredPlayers.length) {
    setSelectedPlayerId(null);
    return;
  }
  if (!selectedPlayerId) {
    setSelectedPlayerId(filteredPlayers[0].id);
    return;
  }
  const exists = filteredPlayers.some((p) => p.id === selectedPlayerId);
  if (!exists) setSelectedPlayerId(filteredPlayers[0].id);
}, [filteredPlayers, selectedPlayerId]);

const selectedPlayer = React.useMemo(
  () => filteredPlayers.find((p) => p.id === selectedPlayerId) ?? null,
  [filteredPlayers, selectedPlayerId]
);

// ✅ FAST: dashboard instantané depuis cache (localStorage)
// (le cache est optionnel : on affiche, mais on recalc derrière quoi qu’il arrive)
const effectiveProfileId = String(
  selectedPlayer?.id ??
    activePlayerId ??
    playerId ??
    initialPlayerId ??
    (profile as any)?.id ??
    ""
);

// Compat sécurité: plusieurs blocs historiques du StatsHub utilisent encore
// le nom `activeProfileId`. On aligne explicitement cet alias sur la source
// canonique pour éviter tout ReferenceError pendant le render.
const activeProfileId = effectiveProfileId || null;

const { cachedDashboard } = useFastDashboardCache(effectiveProfileId || null);

// ============================================================
// 🧪 RUNTIME DEBUG (visible sur téléphone)
// - Montre quel profileId StatsHub utilise réellement
// - Montre si le cache existe pour ce profileId
// - Montre si les matches normalisés portent id vs playerId vs profileId
// - Montre combien de matches matchent l'id sélectionné selon chaque mapping
// ============================================================
const dbg = React.useMemo(() => {
  if (!STATS_DEBUG) return null;

  const selectedId = String(effectiveProfileId || "");
  const keysAll = typeof window !== "undefined" ? STATS_CACHE_KEYS(selectedId) : [];
  const keysFound: string[] = [];
  try {
    for (const k of keysAll) {
      if (localStorage.getItem(k) != null) keysFound.push(k);
    }
  } catch {}

  const cache = selectedId ? readStatsCache(selectedId) : null;
  const updatedAt = (cache as any)?.updatedAt ?? (cache as any)?.meta?.updatedAt ?? null;

  const nm = Array.isArray(nmEffective) ? (nmEffective as any[]) : [];
  const sampleMatches = nm.slice(0, 30);
  const samplePlayers = sampleMatches
    .flatMap((m: any) => (Array.isArray(m?.players) ? m.players : []))
    .slice(0, 80);

  const fieldCounts = {
    id: samplePlayers.filter((p: any) => !!p?.id).length,
    playerId: samplePlayers.filter((p: any) => !!p?.playerId).length,
    profileId: samplePlayers.filter((p: any) => !!p?.profileId).length,
  };

  const matchCount = {
    by_id: nm.filter((m: any) => (m?.players ?? []).some((p: any) => String(p?.id ?? "") === selectedId)).length,
    by_playerId: nm.filter((m: any) => (m?.players ?? []).some((p: any) => String(p?.playerId ?? "") === selectedId)).length,
    by_profileId: nm.filter((m: any) => (m?.players ?? []).some((p: any) => String(p?.profileId ?? "") === selectedId)).length,
  };

  return {
    selectedPlayerId: String(selectedPlayerId ?? ""),
    activePlayerId: String(activePlayerId ?? ""),
    effectiveProfileId: selectedId,
    cacheOk: !!cache,
    cacheUpdatedAt: updatedAt,
    keysFound,
    nmCount: nm.length,
    samplePlayersCount: samplePlayers.length,
    fieldCounts,
    matchCount,
  };
}, [effectiveProfileId, selectedPlayerId, activePlayerId, nmEffective]);


// ============================================================
// ✅ PATCH: Dashboard "cache immédiat" + "recalc derrière"
// - On affiche cachedDashboard instantanément
// - Puis on calcule un dashboard live (nmEffective) en idle pour remplacer
// - Fix: évite dashboard bloqué à 0 / cache incomplet
// ============================================================
const [liveDashboard, setLiveDashboard] =
  React.useState<PlayerDashboardStats | null>(null);


  // ---- X01 hydration + dashboard bridge (dashboard uses same payload-level source as X01 Multi)
  const [x01HydratedRows, setX01HydratedRows] = React.useState<any[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const isX01Row = (r: any) =>
          String(r?.kind ?? r?.mode ?? r?.game ?? "").toLowerCase().includes("x01");

        const ids = (combinedHistory || [])
          .filter(isX01Row)
          .map((r: any) => r?.id)
          .filter(Boolean);

        const uniq: string[] = [];
        const seen = new Set<string>();
        for (const id of ids) {
          const s = String(id);
          if (!seen.has(s)) {
            seen.add(s);
            uniq.push(s);
          }
        }

        // Hydrate payloads via History.get (decodes payloadCompressed)
        const full = await Promise.all(uniq.slice(0, 600).map((id) => History.get(id).catch(() => null)));
        const rows = full.filter(Boolean) as any[];
        if (!cancelled) setX01HydratedRows(rows);
      } catch {
        if (!cancelled) setX01HydratedRows(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [combinedHistory]);

  const applyX01AggToDashboard = React.useCallback(
    (dash: any, pid: string, pname?: string) => {
      try {
        const hydrated = x01HydratedRows || [];
        const rows = hydrated.length
          ? hydrated
          : (combinedHistory || []).filter((r: any) =>
              String(r?.kind ?? r?.mode ?? r?.game ?? "").toLowerCase().includes("x01")
            );

        if (!rows.length) return dash;

        let agg: any = computeX01MultiAgg(rows as any[], pid);

        // If playerId mismatch, try resolve by player name from payload
        if ((agg?.sessions ?? 0) == 0 && pname) {
          const target = String(pname).toLowerCase().trim();
          let candidateId: string | null = null;
          for (const r of rows as any[]) {
            const session = r?.payload?.session || r?.payload || r;
            const players = session?.players || session?.session?.players || [];
            const found = (players || []).find(
              (pl: any) => String(pl?.name ?? pl?.public_name ?? "").toLowerCase().trim() === target
            );
            if (found?.id) {
              candidateId = String(found.id);
              break;
            }
          }
          if (candidateId) {
            const alt = computeX01MultiAgg(rows as any[], candidateId);
            if ((alt?.sessions ?? 0) > 0) agg = alt;
          }
        }

        const sessions = agg?.sessions ?? 0;
        if (sessions > 0) {
          dash.sessions = sessions;
          if (agg?.sumAvg3D) dash.avg3Overall = agg.sumAvg3D / sessions;
          dash.bestVisit = agg?.bestVisit ?? dash.bestVisit;
          dash.bestCheckout = agg?.bestCheckout ?? dash.bestCheckout;
          dash.totalDarts = agg?.darts ?? dash.totalDarts;
          dash.distribution = {
            S: agg?.hitsSingle ?? 0,
            D: agg?.hitsDouble ?? 0,
            T: agg?.hitsTriple ?? 0,
            Bull: agg?.hitsBull ?? 0,
            DBull: agg?.hitsDBull ?? 0,
            Miss: agg?.miss ?? 0,
          };
        }
      } catch {
        // no-op
      }
      return dash;
    },
    [x01HydratedRows, combinedHistory]
  );

React.useEffect(() => {
  let cancelled = false;

  const pid = String(selectedPlayer?.id ?? "");
  const pname = String(selectedPlayer?.name ?? "Joueur");

  // reset quand on change de joueur / source
  setLiveDashboard(null);

  if (!pid) return;

  const compute = () => {
    try {
      // ✅ Sport DiceGame: on garde EXACTEMENT la même UI StatsHub, mais on mappe les métriques.
      if (isDiceSport) {
        const dashDice = buildDiceDashboardForPlayer(pid, pname, diceRows);
        if (!cancelled) setLiveDashboard(dashDice as any);
        return;
      }

      // ✅ Sport Mölkky : même structure visuelle que DartsCounter, données adaptées.
      if (isMolkkySport) {
        const dashMolkky = buildMolkkyDashboardForPlayer(pid, pname, records as any);
        if (!cancelled) setLiveDashboard(dashMolkky as any);
        return;
      }

      const baseDash = buildDashboardFromNormalized(pid, pname, nmEffective);
      const dash = applyX01AggToDashboard(baseDash, pid, pname);
      if (!cancelled) setLiveDashboard(dash as any);
    } catch {
      if (!cancelled) setLiveDashboard(null);
    }
  };

  // On laisse respirer l'UI (cache affiché d'abord), puis calcul derrière
  // requestIdleCallback si dispo, sinon timeout léger
  const w = window as any;
  let idleId: any = null;
  let toId: any = null;

  if (w && typeof w.requestIdleCallback === "function") {
    idleId = w.requestIdleCallback(compute, { timeout: 1200 });
  } else {
    toId = window.setTimeout(compute, 60);
  }

  return () => {
    cancelled = true;
    if (w && typeof w.cancelIdleCallback === "function" && idleId != null) {
      w.cancelIdleCallback(idleId);
    }
    if (toId != null) window.clearTimeout(toId);
  };
}, [selectedPlayer?.id, selectedPlayer?.name, nmEffective.length, applyX01AggToDashboard, isMolkkySport, records]);

// ✅ Dashboard calculé "memo" (léger) — NE DOIT PAS être bloqué par le cache
const computedDashboard = React.useMemo(() => {
  if (!selectedPlayer) return null;
  try {
    if (isMolkkySport) {
      return buildMolkkyDashboardForPlayer(
        String(selectedPlayer.id),
        String(selectedPlayer.name || "Joueur"),
        records as any
      ) as any;
    }
    return applyX01AggToDashboard(buildDashboardFromNormalized(
      String(selectedPlayer.id),
      String(selectedPlayer.name || "Joueur"),
      nmEffective
    ));
  } catch {
    return null;
  }
}, [selectedPlayer?.id, selectedPlayer?.name, nmEffective.length, applyX01AggToDashboard, isMolkkySport, records]);

// ✅ Dashboard final à passer au composant (priorité: cache instant -> live recalcul -> memo)
const dashboardToShow = ((isDiceSport || isMolkkySport || isBabyFootSport || isPingPongSport)
  ? (liveDashboard ?? computedDashboard)
  : (cachedDashboard ?? liveDashboard ?? computedDashboard)) as
  | PlayerDashboardStats
  | null;

const currentPlayerIndex = React.useMemo(() => {
  if (!selectedPlayer) return -1;
  return filteredPlayers.findIndex((p) => p.id === selectedPlayer.id);
}, [filteredPlayers, selectedPlayer]);

// 👉 IMPORTANT : en mode "active", on coupe le slide !
const canScrollPlayers = mode === "locals" && filteredPlayers.length > 1;

const goPrevPlayer = React.useCallback(() => {
  if (!canScrollPlayers || !filteredPlayers.length) return;
  const idx = currentPlayerIndex >= 0 ? currentPlayerIndex : 0;
  const nextIndex = (idx - 1 + filteredPlayers.length) % filteredPlayers.length;
  setSelectedPlayerId(filteredPlayers[nextIndex].id);
}, [canScrollPlayers, filteredPlayers, currentPlayerIndex]);

const goNextPlayer = React.useCallback(() => {
  if (!canScrollPlayers || !filteredPlayers.length) return;
  const idx = currentPlayerIndex >= 0 ? currentPlayerIndex : 0;
  const nextIndex = (idx + 1) % filteredPlayers.length;
  setSelectedPlayerId(filteredPlayers[nextIndex].id);
}, [canScrollPlayers, filteredPlayers, currentPlayerIndex]);

// ==========================
// ✅ Logs (safe) — ICI (après selectedPlayerId + selectedPlayer) => pas de TDZ
// ==========================
React.useEffect(() => {
  // eslint-disable-next-line no-console
  console.log("[StatsHub] sources:", {
    normalizedMatches: normalizedMatches?.length ?? 0,
    normalizedMatchesClean: normalizedMatchesClean.length,
    records: records?.length ?? 0,
    nmEffective: nmEffective.length,
    selectedPlayerId: selectedPlayerId ?? null,
    selectedPlayerName: selectedPlayer?.name ?? null,
  });

  if (nmEffective.length) {
    // eslint-disable-next-line no-console
    console.log("[StatsHub] nmEffective[0] =", nmEffective[0]);
  }
}, [
  normalizedMatches?.length,
  normalizedMatchesClean.length,
  records?.length,
  nmEffective.length,
  selectedPlayerId,
  selectedPlayer?.name,
]);

// ---------- 5) Quick-stats & Cricket + X01 multi ----------
const quick = useQuickStats(selectedPlayer?.id ?? null);

// ============================================================
// ✅ BLOC 3 — KILLER (agrégat "résumé" pour le Dashboard)
// ============================================================
type KillerAgg = {
  matches: number;
  wins: number;
  winRatePct: number;
  kills: number;
  totalHits: number;
  favNumber: string | null;
  favHits: number;
};

const killerAgg = React.useMemo<KillerAgg | null>(() => {
  const pid = selectedPlayer?.id;
  if (!pid) return null;

  let matches = 0;
  let wins = 0;
  let kills = 0;
  let totalHits = 0;

  const hitsByNumber: Record<string, number> = {};

  const Nn = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
  for (const r of records || []) {
    const modeKey = classifyRecordMode(r);
    if (modeKey !== "killer") continue;

    const inMatch = recordHasPlayer(r as any, pid);
    if (!inMatch) continue;

    matches++;
    if ((r as any)?.winnerId === pid) wins++;

    const ss: any = (r as any)?.summary ?? (r as any)?.payload?.summary ?? {};
    const per: any[] =
      ss?.perPlayer ??
      ss?.players ??
      (r as any)?.payload?.summary?.perPlayer ??
      [];

    const pstat =
      per.find((x) => x?.playerId === pid || x?.id === pid) ??
      ss?.[pid] ??
      ss?.players?.[pid] ??
      ss?.perPlayer?.[pid] ??
      {};

    kills += Nn(pstat.kills ?? pstat.kill ?? pstat.kOs ?? 0);

    const th =
      Nn(pstat.totalHits ?? 0) ||
      Nn(pstat.hits ?? 0) ||
      Nn(pstat.total ?? 0) ||
      0;
    totalHits += th;

    const favMap =
      pstat.favNumberHits ??
      pstat.numberHits ??
      pstat.hitsByNumber ??
      null;

    if (favMap && typeof favMap === "object") {
      for (const [k, v] of Object.entries(favMap)) {
        const kk = String(k);
        hitsByNumber[kk] = (hitsByNumber[kk] || 0) + Nn(v, 0);
      }
    }
  }

  if (matches <= 0) return null;

  let favNumber: string | null = null;
  let favHits = 0;
  for (const [k, v] of Object.entries(hitsByNumber)) {
    if (v > favHits) {
      favHits = v;
      favNumber = k;
    }
  }

  const winRatePct = matches > 0 ? Math.round((wins / matches) * 1000) / 10 : 0;

  return {
    matches,
    wins,
    winRatePct,
    kills,
    totalHits,
    favNumber,
    favHits,
  };
}, [selectedPlayer?.id, records]);

// ============================================================
// ✅ SHANGHAI — période + stats agrégées (pour StatsShanghaiDashboard v2)
// ============================================================
const [shPeriod, setShPeriod] = React.useState<TimeRange>("all");

// mini-agrégateur robuste (fallback depuis summary/payload)
function buildShanghaiStatsFromRecords(
  rows: SavedMatch[],
  playerId: string | null,
  range: TimeRange
) {
  const list = Array.isArray(rows) ? rows : [];
  const pid = playerId ? String(playerId) : null;
  if (!pid) {
    return {
      matches: 0,
      wins: 0,
      ties: 0,
      winRate: 0,
      winRatePct: 0,
      bestScore: 0,
      worstScore: 0,
      avgScore: 0,
      totalScore: 0,
      hits: 0,
      miss: 0,
      pointsCibles: 0,
      dartsTotal: 0,
      accuracy: 0,
      sessions: 0,
      byTarget: {},
      rows: [],
      topTargets: [],
    };
  }

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const delta =
    range === "day"
      ? ONE_DAY
      : range === "week"
      ? 7 * ONE_DAY
      : range === "month"
      ? 30 * ONE_DAY
      : range === "year"
      ? 365 * ONE_DAY
      : Infinity;
  const minTs = delta === Infinity ? 0 : now - delta;

  let matches = 0;
  let wins = 0;
  let ties = 0;
  let totalScore = 0;
  let bestScore = 0;
  let worstScore = Infinity;
  let hits = 0;
  let miss = 0;
  let pointsCibles = 0;
  let dartsTotal = 0;

  const byTarget: Record<string, number> = {};
  const byTargetDetail: Record<string, { points: number; hitsS: number; hitsD: number; hitsT: number; miss: number; totalHits: number }> = {};

  const Nn = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
  const ensureTarget = (key: string) => {
    if (!byTargetDetail[key]) {
      byTargetDetail[key] = { points: 0, hitsS: 0, hitsD: 0, hitsT: 0, miss: 0, totalHits: 0 };
    }
    return byTargetDetail[key];
  };

  for (const r of list) {
    const t = Nn((r as any)?.updatedAt ?? (r as any)?.createdAt, 0);
    if (t < minTs) continue;

    const tag = `${String(r.kind ?? "").toLowerCase()}|${String(r.game ?? "").toLowerCase()}|${String(
      r.mode ?? ""
    ).toLowerCase()}|${String(r.variant ?? "").toLowerCase()}`;
    if (!tag.includes("shanghai")) continue;
    if (!recordHasPlayer(r as any, pid)) continue;

    const ss: any = (r as any)?.summary ?? (r as any)?.payload?.summary ?? {};
    const payloadRoot: any = (r as any)?.payload ?? {};
    const payloadNested: any = payloadRoot?.payload ?? {};
    const packedStats: any =
      ss?.statsShanghai ??
      payloadRoot?.statsShanghai ??
      payloadNested?.statsShanghai ??
      null;
    const unified: any =
      payloadRoot?.stats ??
      payloadNested?.stats ??
      null;

    const scoresArr: any[] = Array.isArray(ss?.scores) ? ss.scores : [];
    const scoreEntry = scoresArr.find((x: any) => String(x?.id ?? x?.playerId ?? "") === pid) ?? null;
    const unifiedPlayers: any[] = Array.isArray(unified?.players) ? unified.players : [];
    const unifiedPlayer = unifiedPlayers.find((x: any) => String(x?.id ?? x?.playerId ?? "") === pid) ?? null;

    const score =
      Nn(scoreEntry?.score) ||
      Nn(unifiedPlayer?.score) ||
      0;

    matches++;
    if (String((r as any)?.winnerId ?? "") === pid) wins++;
    if (ss?.isTie === true || payloadRoot?.summary?.isTie === true || payloadNested?.summary?.isTie === true) ties++;

    totalScore += score;
    bestScore = Math.max(bestScore, score);
    worstScore = Math.min(worstScore, score);

    const hitMap =
      packedStats?.hitsCompact?.[pid] ??
      packedStats?.hitsById?.[pid] ??
      null;

    if (hitMap && typeof hitMap === 'object') {
      for (const [k, raw] of Object.entries(hitMap)) {
        const hc: any = raw || {};
        const key = String(k);
        const stat = ensureTarget(key);
        const s = Nn(hc?.S);
        const d = Nn(hc?.D);
        const tr = Nn(hc?.T);
        const m = Nn(hc?.MISS);
        const pts = Nn(hc?.points);
        stat.hitsS += s;
        stat.hitsD += d;
        stat.hitsT += tr;
        stat.miss += m;
        stat.points += pts;
        stat.totalHits += s + d + tr;
        byTarget[key] = (byTarget[key] || 0) + pts;
        hits += s + d + tr;
        miss += m;
        pointsCibles += pts;
        dartsTotal += s + d + tr + m;
      }
    } else {
      const uThrown = Nn(unifiedPlayer?.darts?.thrown);
      const uHits = Nn(unifiedPlayer?.darts?.hits);
      const uMiss = Nn(unifiedPlayer?.darts?.misses, Math.max(0, uThrown - uHits));
      hits += uHits;
      miss += uMiss;
      dartsTotal += uThrown || uHits + uMiss;
      pointsCibles += score;
    }
  }

  const avgScore = matches > 0 ? totalScore / matches : 0;
  const winRatePct = matches > 0 ? Math.round((wins / matches) * 1000) / 10 : 0;
  const accuracy = dartsTotal > 0 ? Math.round((hits / dartsTotal) * 1000) / 10 : 0;
  const topTargets = Object.entries(byTargetDetail)
    .map(([k, v]) => ({
      n: Number(k),
      points: v.points,
      hitsS: v.hitsS,
      hitsD: v.hitsD,
      hitsT: v.hitsT,
      miss: v.miss,
      totalHits: v.totalHits,
    }))
    .filter((x) => Number.isFinite(x.n) && x.n > 0)
    .sort((a, b) => (b.points || 0) - (a.points || 0) || (b.totalHits || 0) - (a.totalHits || 0))
    .slice(0, 8);

  return {
    matches,
    wins,
    ties,
    winRate: winRatePct,
    winRatePct,
    bestScore,
    worstScore: matches > 0 && Number.isFinite(worstScore) ? worstScore : 0,
    avgScore,
    totalScore,
    hits,
    miss,
    pointsCibles,
    dartsTotal,
    accuracy,
    sessions: matches,
    byTarget,
    rows: [
      { key: 'darts', label: 'Darts', min: 0, max: 0, total: dartsTotal, pct: undefined },
      { key: 'hits', label: 'Hits', min: 0, max: 0, total: hits, pct: accuracy },
      { key: 'miss', label: 'Miss', min: 0, max: 0, total: miss, pct: dartsTotal > 0 ? Math.round((miss / dartsTotal) * 1000) / 10 : undefined },
      { key: 'points', label: 'Points cibles', min: 0, max: bestScore, total: pointsCibles, pct: undefined },
      { key: 'winrate', label: 'WinRate', min: 0, max: 100, total: winRatePct, pct: winRatePct },
    ],
    topTargets,
  };
}

const shanghaiStats = React.useMemo(() => {
  return buildShanghaiStatsFromRecords(records, selectedPlayer?.id ?? null, shPeriod);
}, [records, selectedPlayer?.id, shPeriod]);

const [cricketStats, setCricketStats] =
  React.useState<CricketProfileStats | null>(null);

const [x01MultiLegsSets, setX01MultiLegsSets] =
  React.useState<X01MultiLegsSets | null>(null);

const [batardStats, setBatardStats] =
  React.useState<BatardProfileStats | null>(null);

React.useEffect(() => {
  if (!selectedPlayer?.id) {
    setCricketStats(null);
    setX01MultiLegsSets(null);
    setBatardStats(null);
    return;
  }

  let cancelled = false;

  (async () => {
    try {
      const [cri, x01multi, bat] = await Promise.all([
        getCricketProfileStats(selectedPlayer.id),
        getX01MultiLegsSetsForProfile(selectedPlayer.id),
        getBatardProfileStats(selectedPlayer.id),
      ]);

      if (!cancelled) {
        setCricketStats(cri);
        setX01MultiLegsSets(x01multi);
        setBatardStats(bat);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[StatsHub] load extended profile stats failed", err);
      if (!cancelled) {
        setCricketStats(null);
        setX01MultiLegsSets(null);
        setBatardStats(null);
      }
    }
  })();

  return () => {
    cancelled = true;
  };
}, [selectedPlayer?.id]);

// Taille du nom en fonction de la longueur
const selectedName = selectedPlayer?.name ?? "";
const nameLen = selectedName.length;
let nameFontSize = 22;
if (nameLen > 12) nameFontSize = 20;
if (nameLen > 16) nameFontSize = 18;
if (nameLen > 22) nameFontSize = 16;
if (nameLen > 28) nameFontSize = 14;

const trainingModeOptions = [
  { id: "training_time_attack", name: "Time Attack" },
  { id: "training_ghost", name: "Ghost" },
  { id: "training_precision_gauntlet", name: "Precision" },
  { id: "training_doubleio", name: "Double In/Out" },
  { id: "training_super_bull", name: "Super Bull" },
  { id: "training_repeat_master", name: "Repeat Master" },
  { id: "training_challenges", name: "Challenges" },
  { id: "training_evolution", name: "Evolution" },
];

// ============================================================
//  ROUTAGE PRINCIPAL PAR "tab" (StatsShell)
// ============================================================
if (tab === "training") {
  const pill = (active: boolean): React.CSSProperties => ({
    borderRadius: 999,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: active ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.22)",
    fontWeight: 900,
    letterSpacing: 0.4,
  });

  return (
    <div style={{ padding: 16, paddingBottom: 80, display: "flex", flexDirection: "column", gap: 12 }}>
      <TrainingProfileCard />

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.18)",
          padding: 10,
        }}
      >
        <button style={pill(trainingSubView === "stats")} onClick={() => setTrainingSubView("stats")}>
          Stats
        </button>
        <button style={pill(trainingSubView === "leaderboards")} onClick={() => setTrainingSubView("leaderboards")}>
          Classements
        </button>
      </div>

      {trainingSubView === "leaderboards" ? (
        <StatsTrainingLeaderboards modeOptions={trainingModeOptions} defaultModeId={"training_time_attack"} />
      ) : (
        <>
          <TrainingX01StatsTab />
          <StatsTrainingModesLocal />
        </>
      )}
    </div>
  );
}

if (tab === "history") {
  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <div style={card}>
        {isMolkkySport ? (
          <MolkkyStatsHistoryPage store={store as any} go={go} />
        ) : (
          <HistoryPage go={go} />
        )}
      </div>
    </div>
  );
}

// ============================================================
//  VUE PAR DÉFAUT : "STATS"
// ============================================================
return (
  <div style={{ padding: 16, paddingBottom: 80 }}>
    <div style={statsPageWrap}>
      <div style={statsStack}>
        {/* HEADER : titre centré + carrousel modes */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 1.1,
              color: T.accent ?? T.gold,
              textShadow: `
                0 0 10px ${T.accent ?? T.gold},
                0 0 22px ${T.accentGlow ?? T.gold}
              `,
            }}
          >
            Centre de statistiques
          </div>

          {/* Carrousel modes */}
          <div
            style={{
              marginTop: 2,
              padding: 8,
              borderRadius: 18,
              border: `1px solid ${T.accent30}`,
              background:
                "linear-gradient(180deg,rgba(18,18,22,.98),rgba(9,9,12,.96))",
              boxShadow: `
                0 0 0 1px ${T.accent20},
                0 8px 20px rgba(0,0,0,.55)
              `,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              width: "100%",
            }}
          >
            <button
              type="button"
              onClick={goPrevMode}
              disabled={!canScrollModes}
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                border: `1px solid ${T.accent50}`,
                background: canScrollModes
                  ? `radial-gradient(circle at 30% 30%, ${T.accent40}, transparent 55%)`
                  : "rgba(0,0,0,.45)",
                color: T.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canScrollModes ? "pointer" : "default",
                fontSize: 13,
              }}
            >
              ◀
            </button>

            <div
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: 999,
                border: `1px solid ${T.accent}`,
                background: `radial-gradient(circle at 0% 0%, ${T.accent40}, transparent 65%)`,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: 0.9,
                color: T.accent,
                textShadow: `
                  0 0 8px ${T.accent},
                  0 0 16px ${T.accentGlow ?? T.accent}
                `,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentModeLabel}
            </div>

            <button
              type="button"
              onClick={goNextMode}
              disabled={!canScrollModes}
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                border: `1px solid ${T.accent50}`,
                background: canScrollModes
                  ? `radial-gradient(circle at 70% 30%, ${T.accent40}, transparent 55%)`
                  : "rgba(0,0,0,.45)",
                color: T.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canScrollModes ? "pointer" : "default",
                fontSize: 13,
              }}
            >
              ▶
            </button>
          </div>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* --------- CARROUSEL PROFIL --------- */}
          <div style={card}>
            {filteredPlayers.length ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  {/* Flèche gauche — MASQUÉE UNIQUEMENT POUR PROFIL ACTIF */}
                  {mode === "active" ? (
                    <div style={{ width: 26, height: 26 }} />
                  ) : (
                    <button
                      type="button"
                      onClick={goPrevPlayer}
                      disabled={!canScrollPlayers}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        border: `1px solid ${T.text30}`,
                        background: canScrollPlayers
                          ? `radial-gradient(circle at 30% 30%, ${T.text30}, transparent 55%)`
                          : "rgba(0,0,0,.45)",
                        color: T.text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: canScrollPlayers ? "pointer" : "default",
                        fontSize: 13,
                      }}
                    >
                      ◀
                    </button>
                  )}

                  {/* Avatar + StarRing + nom */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "center",
                      minWidth: 0,
                      overflow: "visible",
                    }}
                  >
                    {selectedPlayer &&
                      (() => {
                        const pid = selectedPlayer.id;
                        const q: any = quick as any;

                        // ✅ Source "HOME-like" : on préfère la moyenne déjà calculée
                        // par le dashboard global (même logique que la Home via statsBridge).
                        const dashAvg3 = Number((dashboardToShow as any)?.avg3Overall);

                        const pick = (...vals: any[]) => {
                          for (const v of vals) {
                            const n = Number(v);
                            if (Number.isFinite(n) && n >= 0) return n;
                          }
                          return 0;
                        };

                        const avg3d = pick(
                          dashAvg3,
                          q?.byId?.[pid]?.avg3d,
                          q?.byId?.[pid]?.avg3,
                          q?.[pid]?.avg3d,
                          q?.[pid]?.avg3,
                          q?.avg3d,
                          q?.avg3
                        );

                        // ✅ IMPORTANT : même rendu que sur HOME.
                        // Pas de fallback arbitraire : si avg3=0, on affiche 0 étoile.
                        const avg3dForRing = Number.isFinite(avg3d) ? Math.max(0, avg3d) : 0;

                        const AVATAR = 110;
                        const BORDER = 10;
                        const MEDALLION = AVATAR + BORDER;
                        const STAR = 12;

                        return (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 6,
                              overflow: "visible",
                            }}
                          >
                            <div
                              style={{
                                position: "relative",
                                width: MEDALLION,
                                height: MEDALLION,
                                borderRadius: "50%",
                                overflow: "visible",
                              }}
                            >
                              <div
                                aria-hidden
                                style={{
                                  position: "absolute",
                                  left: -(STAR / 2),
                                  top: -(STAR / 2),
                                  width: MEDALLION + STAR,
                                  height: MEDALLION + STAR,
                                  pointerEvents: "none",
                                  zIndex: 10,
                                  overflow: "visible",
                                }}
                              >
                                <ProfileStarRing
                                  anchorSize={MEDALLION}
                                  avg3d={avg3dForRing}
                                  gapPx={-1}
                                  starSize={STAR}
                                  stepDeg={10}
                                  rotationDeg={0}
                                  animateGlow={true}
                                />
                              </div>

                              <div
                                style={{
                                  position: "absolute",
                                  left: "50%",
                                  top: "50%",
                                  width: AVATAR,
                                  height: AVATAR,
                                  transform: "translate(-50%,-50%)",
                                  borderRadius: "50%",
                                  overflow: "hidden",
                                  boxShadow: `0 0 18px ${T.accent}`,
                                  zIndex: 2,
                                  background: "transparent",
                                }}
                              >
                                <ProfileAvatar
                                  size={AVATAR}
                                  dataUrl={selectedPlayer.avatarDataUrl ?? undefined}
                                  label={selectedName?.[0]?.toUpperCase() || "?"}
                                  showStars={false}
                                />
                              </div>
                            </div>

                            <span
                              className="dc-stats-name-wrapper"
                              style={
                                {
                                  "--dc-accent": T.accent,
                                  "--dc-accent-soft": T.accent20,
                                  maxWidth: "80vw",
                                  display: "block",
                                } as React.CSSProperties
                              }
                            >
                              <span
                                className="dc-stats-name-base"
                                style={{
                                  fontSize: nameFontSize,
                                  fontWeight: 900,
                                  fontFamily:
                                    '"Luckiest Guy","Impact","system-ui",sans-serif',
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "block",
                                  textAlign: "center",
                                }}
                              >
                                {selectedName}
                              </span>

                              <span
                                className="dc-stats-name-shimmer"
                                style={{
                                  fontSize: nameFontSize,
                                  fontWeight: 900,
                                  fontFamily:
                                    '"Luckiest Guy","Impact","system-ui",sans-serif',
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "block",
                                  textAlign: "center",
                                }}
                              >
                                {selectedName}
                              </span>
                            </span>
                          </div>
                        );
                      })()}
                  </div>

                  {/* Flèche droite — MASQUÉE UNIQUEMENT POUR PROFIL ACTIF */}
                  {mode === "active" ? (
                    <div style={{ width: 26, height: 26 }} />
                  ) : (
                    <button
                      type="button"
                      onClick={goNextPlayer}
                      disabled={!canScrollPlayers}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        border: `1px solid ${T.text30}`,
                        background: canScrollPlayers
                          ? `radial-gradient(circle at 70% 30%, ${T.text30}, transparent 55%)`
                          : "rgba(0,0,0,.45)",
                        color: T.text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: canScrollPlayers ? "pointer" : "default",
                        fontSize: 13,
                      }}
                    >
                      ▶
                    </button>
                  )}
                </div>

                {/* Option BOTS — UNIQUEMENT en mode "locals" */}
                {mode === "locals" && (
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        color: T.text70,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={showBots}
                        onChange={(e) => setShowBots(e.target.checked)}
                        style={{
                          width: 12,
                          height: 12,
                          accentColor: T.accent,
                        }}
                      />
                      <span>Inclure les BOTS</span>
                    </label>
                  </div>
                )}
              </>
            ) : (
              <span style={{ color: T.text70, fontSize: 13 }}>
                Aucun joueur trouvé.
              </span>
            )}
          </div>

          {/* ========= CONTENU PILOTÉ PAR LE CARROUSEL DE MODES ========= */}
<React.Suspense fallback={<LazyFallback label="Chargement…" />}>
            {/* ✅ MÖLKKY: on garde EXACTEMENT la structure StatsHub, seul le contenu change */}

            {currentMode === "dashboard" && (
    <>
      <div style={row}>
        {selectedPlayer ? (
          <StatsPlayerDashboard
            // ✅ IMPORTANT: on affiche le cache instantané, puis live recalcul, puis fallback memo
            data={selectedPlayer ? dashboardToShow : null}
            x01MultiLegsSets={x01MultiLegsSets}
            sport={effectiveSport}
          />
        ) : (
          <div style={{ color: T.text70, fontSize: 13 }}>
            Sélectionne un joueur pour afficher le dashboard.
          </div>
        )}
      </div>

                {selectedPlayer && !isMolkkySport && (
                  <div style={{ ...card, marginTop: 8 }}>
                    <StatsTrainingSummary profileId={selectedPlayer.id} />
                  </div>
                )}

                {selectedPlayer && !isMolkkySport && killerAgg && killerAgg.matches > 0 && (
                  <div style={{ ...card, marginTop: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ ...goldNeon, fontSize: 13, marginBottom: 0 }}>
                        KILLER — RÉSUMÉ
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const idx = modeDefs.findIndex((m) => m.key === "killer");
                          if (idx >= 0) setModeIndex(idx);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: `1px solid ${T.accent50}`,
                          background: `radial-gradient(circle at 30% 30%, ${T.accent30}, rgba(0,0,0,.55))`,
                          color: T.accent,
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: 0.5,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Voir détails ▶
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          borderRadius: 16,
                          padding: 10,
                          border: `1px solid rgba(255,255,255,.10)`,
                          background: "linear-gradient(180deg,#15171B,#0F1014)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: T.text70,
                            textTransform: "uppercase",
                          }}
                        >
                          Matchs
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: T.gold }}>
                          {killerAgg.matches}
                        </div>
                        <div style={{ fontSize: 11, color: T.text70 }}>
                          Wins {killerAgg.wins} · {killerAgg.winRatePct}%
                        </div>
                      </div>

                      <div
                        style={{
                          borderRadius: 16,
                          padding: 10,
                          border: `1px solid rgba(255,255,255,.10)`,
                          background: "linear-gradient(180deg,#15171B,#0F1014)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: T.text70,
                            textTransform: "uppercase",
                          }}
                        >
                          Kills
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#FF4B4B" }}>
                          {killerAgg.kills}
                        </div>
                        <div style={{ fontSize: 11, color: T.text70 }}>
                          Total hits {killerAgg.totalHits}
                        </div>
                      </div>

                      <div
                        style={{
                          gridColumn: "1 / -1",
                          borderRadius: 16,
                          padding: 10,
                          border: `1px solid rgba(255,255,255,.10)`,
                          background: "linear-gradient(180deg,#15171B,#0F1014)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: T.text70,
                            textTransform: "uppercase",
                          }}
                        >
                          Numéro favori
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: T.accent }}>
                          {killerAgg.favNumber
                            ? `${killerAgg.favNumber} (${killerAgg.favHits})`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedPlayer && !isMolkkySport && cricketStats && (
                  <div style={{ ...card, marginTop: 8 }}>
                    <React.Suspense fallback={<LazyFallback label="Chargement Cricket…" />}>
                      <StatsCricketDashboard stats={cricketStats} />
                    </React.Suspense>
                  </div>
                )}
              </>
            )}

            {currentMode === "dartsets" && (
              <div style={card}>
                {selectedPlayer ? (
                  <React.Suspense fallback={<LazyFallback label="Chargement des fléchettes…" />}>
                    <StatsDartSetsSection
                      activeProfileId={activeProfileId}
                      title="MES FLÉCHETTES"
                    />
                  </React.Suspense>
                ) : (
                  <div style={{ color: T.text70, fontSize: 13 }}>
                    Sélectionne un joueur pour afficher les fléchettes.
                  </div>
                )}
              </div>
            )}

            {currentMode === "x01_multi" && (
              <div style={card}>
                {selectedPlayer ? (
                  <React.Suspense fallback={<LazyFallback label="Chargement X01 multi…" />}>
                    <X01MultiStatsTabFull
                      records={records}
                      playerId={selectedPlayer.id}
                    />
                  </React.Suspense>
                ) : (
                  <div style={{ color: T.text70, fontSize: 13 }}>
                    Sélectionne un joueur pour afficher les stats X01 multi.
                  </div>
                )}
              </div>
            )}

            {currentMode === "x01_compare" && (
              <div style={card}>
                {selectedPlayer ? (
                  <StatsX01Compare
                    store={pseudoStoreForCompare as any}
                    profileId={selectedPlayer.id}
                    compact
                  />
                ) : (
                  <div style={{ color: T.text70, fontSize: 13 }}>
                    Sélectionne un joueur pour afficher le comparateur X01.
                  </div>
                )}
              </div>
            )}

            {currentMode === "cricket" && (
              <div style={card}>
                <React.Suspense fallback={<LazyFallback label="Chargement Cricket…" />}>
                  {/*
                    IMPORTANT: on affiche TOUJOURS le dashboard.
                    Il gère déjà l'état "vide" (stats null/undefined => 0 partout).
                  */}
                  <StatsCricketDashboard stats={cricketStats} />
                </React.Suspense>
              </div>
            )}

{currentMode === "shanghai" && (
  <div style={card}>
    <React.Suspense fallback={<LazyFallback label="Chargement Shanghai…" />}>
      <StatsShanghaiDashboard
        playerName={selectedPlayer?.name}
        period={shPeriod}
        setPeriod={setShPeriod}
        stats={shanghaiStats}
      />
    </React.Suspense>
  </div>
)}

            {currentMode === "killer" && (
              <div style={card}>
                <React.Suspense fallback={<LazyFallback label="Chargement Killer…" />}>
                  <StatsKiller
                    profiles={storeProfiles as any}
                    memHistory={records as any}
                    playerId={
                      mode === "active"
                        ? (activePlayerId ?? null)
                        : (selectedPlayerId ?? null)
                    }
                    title="KILLER"
                  />
                </React.Suspense>
              </div>
            )}

            
            {currentMode === "golf" && (
              <div style={card}>
                <div style={{ padding: 18 }}>
                  <div style={{ fontWeight: 1000, letterSpacing: 1, color: "#ffd56a", marginBottom: 10 }}>
                    GOLF — Stats
                  </div>

                  {(() => {
            const golfMatchesRaw = records.filter((r) => classifyRecordMode(r) === "golf");
            const golfMatches = Array.from(
              new Map(
                golfMatchesRaw.map((m: any) => {
                  const key = String(
                    m?.matchId ||
                      m?.id ||
                      m?.payload?.matchId ||
                      m?.payload?.state?.matchId ||
                      m?.summary?.matchId ||
                      `${m?.created_at || m?.createdAt || "golf"}`
                  );
                  return [key, m];
                })
              ).values()
            );
            const normId = (v: any) => String(v ?? "").replace(/^online:/, "");
            const currentPid = normId(effectiveProfileId ?? "");
            const isGolfFinished = (m: any) => {
              const statuses = [
                m?.status,
                m?.payload?.status,
                m?.payload?.state?.status,
                m?.summary?.status,
                m?.payload?.summary?.status,
              ]
                .map((v) => String(v ?? "").toLowerCase())
                .filter(Boolean);

              if (statuses.some((v) => ["finished", "done", "completed", "complete", "ended"].includes(v))) return true;
              if (Boolean(m?.summary?.finished ?? m?.payload?.summary?.finished ?? m?.payload?.state?.isFinished)) return true;
              return Boolean(m?.finished_at || m?.finishedAt || m?.payload?.finishedAt || m?.payload?.state?.finishedAt);
            };
            const finished = golfMatches.filter((m) => isGolfFinished(m));
            const inprog = golfMatches.filter((m) => !isGolfFinished(m));

            const box = { ...softCard, padding: 14 } as React.CSSProperties;
            const label = { opacity: 0.85, fontSize: 12 } as React.CSSProperties;
            const value = { fontSize: 20, fontWeight: 1000 } as React.CSSProperties;
            const sub = { marginTop: 2, fontSize: 11, opacity: 0.75 } as React.CSSProperties;

            const readNum = (v: any) => {
              if (typeof v === "number" && Number.isFinite(v)) return v;
              if (typeof v === "string") {
                const n = Number(String(v).replace(",", "."));
                return Number.isFinite(n) ? n : 0;
              }
              return 0;
            };

            const pick = (obj: any, keys: string[]) => {
              for (const k of keys) {
                if (obj && obj[k] != null) return readNum(obj[k]);
              }
              return 0;
            };

            const getByPid = (obj: any, pid: string) => {
              if (!obj || typeof obj !== "object" || !pid) return null;
              if (obj[pid] != null) return obj[pid];
              const foundKey = Object.keys(obj).find((k) => normId(k) === pid);
              return foundKey ? obj[foundKey] : null;
            };

            const findPlayerInArray = (arr: any, pid: string) => {
              const list = Array.isArray(arr) ? arr : [];
              return (
                list.find((pp: any) => {
                  const ids = [pp?.id, pp?.playerId, pp?.profileId, pp?.uid, pp?.userId, pp?.pid]
                    .filter((x: any) => x !== undefined && x !== null && String(x).length > 0)
                    .map(normId);
                  return ids.includes(pid);
                }) || null
              );
            };

            const getPlayerIndexInMatch = (m: any, pid: string) => {
              const arrays = [m?.players, m?.payload?.players, m?.summary?.players, m?.payload?.summary?.players];
              for (const arr of arrays) {
                if (!Array.isArray(arr)) continue;
                const idx = arr.findIndex((pp: any) => {
                  const ids = [pp?.id, pp?.playerId, pp?.profileId, pp?.uid, pp?.userId, pp?.pid]
                    .filter((x: any) => x !== undefined && x !== null && String(x).length > 0)
                    .map(normId);
                  return ids.includes(pid);
                });
                if (idx >= 0) return idx;
              }
              return -1;
            };

            const getByPidOrIndex = (obj: any, pid: string, idxHint: number) => {
              if (Array.isArray(obj)) {
                if (idxHint >= 0 && idxHint < obj.length) return obj[idxHint] || null;
                return findPlayerInArray(obj, pid);
              }
              return getByPid(obj, pid);
            };

            type GolfAgg = {
              s: number;
              d: number;
              t: number;
              miss: number;
              bull: number;
              dbull: number;
              turns: number;
              hit1: number;
              hit2: number;
              hit3: number;
              holesWon: number;
              holes2nd: number;
              holes3rd: number;
              holesPlayed: number;
              darts: number;
              total: number;
            };

            const zero: GolfAgg = {
              s: 0,
              d: 0,
              t: 0,
              miss: 0,
              bull: 0,
              dbull: 0,
              turns: 0,
              hit1: 0,
              hit2: 0,
              hit3: 0,
              holesWon: 0,
              holes2nd: 0,
              holes3rd: 0,
              holesPlayed: 0,
              darts: 0,
              total: 0,
            };

            const extractPlayerGolfStats = (m: any): GolfAgg => {
              const s = m?.summary ?? {};
              const p = m?.payload ?? {};
              const state = p?.state ?? {};
              const payloadSummary = p?.summary ?? {};

              const playerIdxInMatch = getPlayerIndexInMatch(m, currentPid);

              const byPlayer =
                getByPidOrIndex(state?.statsByPlayer, currentPid, playerIdxInMatch) ||
                getByPidOrIndex(s?.playerStats, currentPid, playerIdxInMatch) ||
                getByPidOrIndex(s?.perPlayer, currentPid, playerIdxInMatch) ||
                getByPidOrIndex(p?.playerStats, currentPid, playerIdxInMatch) ||
                getByPidOrIndex(p?.perPlayer, currentPid, playerIdxInMatch) ||
                getByPidOrIndex(p?.statsByPlayer, currentPid, playerIdxInMatch);

              const rankingPlayer =
                findPlayerInArray(s?.rankings, currentPid) ||
                findPlayerInArray(payloadSummary?.rankings, currentPid) ||
                findPlayerInArray(s?.players, currentPid) ||
                findPlayerInArray(payloadSummary?.players, currentPid) ||
                findPlayerInArray(p?.stats?.players, currentPid);

              const src = byPlayer || rankingPlayer || state?.stats || s?.stats || p?.stats || payloadSummary?.stats || state || s || p || {};

              const total =
                pick(src, ["total", "score", "strokes", "points"]) ||
                pick(rankingPlayer, ["total", "score", "strokes", "points"]) ||
                readNum(getByPid(state?.totalsByPlayer, currentPid)) ||
                readNum(getByPid(s?.totals, currentPid)) ||
                readNum(getByPid(payloadSummary?.totals, currentPid));

              const darts =
                pick(src, ["darts", "thrown", "throws"]) ||
                pick(rankingPlayer, ["darts", "thrown", "throws"]);

              const rank =
                readNum(rankingPlayer?.rank) ||
                readNum(rankingPlayer?.place) ||
                readNum(rankingPlayer?.position) ||
                readNum(src?.rank) ||
                readNum(src?.place) ||
                readNum(src?.position);

              const holesWonRaw = pick(src, ["holesWon", "holes1st", "firsts", "p1"]);
              const holes2ndRaw = pick(src, ["holes2nd", "second", "p2"]);
              const holes3rdRaw = pick(src, ["holes3rd", "third", "p3"]);
              const holesPlayedRaw = pick(src, ["holesPlayed", "holes", "trous"]);

              const holesPlayedFinal = holesPlayedRaw || (rankingPlayer ? 1 : 0);
              const holesWonFinal = holesWonRaw || (rank === 1 ? 1 : 0);
              const holes2ndFinal = holes2ndRaw || (rank === 2 ? 1 : 0);
              const holes3rdFinal = holes3rdRaw || (rank === 3 ? 1 : 0);

              return {
                s: pick(src, ["s", "simple", "singles", "par"]),
                d: pick(src, ["d", "double", "doubles", "bogey"]),
                t: pick(src, ["t", "triple", "triples", "doubleBogey"]),
                miss: pick(src, ["miss", "m", "misses"]),
                bull: pick(src, ["bull", "b"]),
                dbull: pick(src, ["dbull", "dBull", "doubleBull", "db"]),
                turns: pick(src, ["turns", "tours"]),
                hit1: pick(src, ["hit1", "hits1", "firstHits", "p1"]),
                hit2: pick(src, ["hit2", "hits2", "secondHits", "p2"]),
                hit3: pick(src, ["hit3", "hits3", "thirdHits", "p3"]),
                holesWon: holesWonFinal,
                holes2nd: holes2ndFinal,
                holes3rd: holes3rdFinal,
                holesPlayed: holesPlayedFinal,
                darts,
                total,
              };
            };

            const agg = finished.reduce((acc: GolfAgg, m: any) => {
              const st = extractPlayerGolfStats(m);
              (Object.keys(acc) as (keyof GolfAgg)[]).forEach((k) => {
                acc[k] += st[k] || 0;
              });
              return acc;
            }, { ...zero });

            const totalNums = finished
              .map((m: any) => extractPlayerGolfStats(m).total)
              .filter((n: number) => Number.isFinite(n) && n > 0);

            const bestTotal = totalNums.length ? Math.min(...totalNums) : null;
            const totalAvg = totalNums.length ? Math.round((totalNums.reduce((a, b) => a + b, 0) / totalNums.length) * 10) / 10 : null;

            const hitsTotal = agg.s + agg.d + agg.t + agg.bull + agg.dbull + agg.miss;
            const hitOnlyTotal = agg.s + agg.d + agg.t + agg.bull + agg.dbull;
            const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
            return (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div style={box}>
                    <div style={label}>Parties terminées</div>
                    <div style={value}>{finished.length}</div>
                  </div>
                  <div style={box}>
                    <div style={label}>Parties en cours</div>
                    <div style={value}>{inprog.length}</div>
                  </div>
                  <div style={box}>
                    <div style={label}>Meilleur total</div>
                    <div style={value}>{bestTotal ?? "—"}</div>
                  </div>
                  <div style={box}>
                    <div style={label}>Total moyen</div>
                    <div style={value}>{totalAvg ?? "—"}</div>
                  </div>

                  <div style={box}>
                    <div style={label}>Simple</div>
                    <div style={value}>{agg.s}</div>
                    <div style={sub}>Par</div>
                  </div>
                  <div style={box}>
                    <div style={label}>Double</div>
                    <div style={value}>{agg.d}</div>
                    <div style={sub}>Bogey</div>
                  </div>
                  <div style={box}>
                    <div style={label}>Triple</div>
                    <div style={value}>{agg.t}</div>
                    <div style={sub}>Double Bogey</div>
                  </div>
                  <div style={box}>
                    <div style={label}>Miss</div>
                    <div style={value}>{agg.miss}</div>
                    <div style={sub}>{hitsTotal ? `${pct(agg.miss, hitsTotal)}%` : "—"}</div>
                  </div>

                  <div style={box}>
                    <div style={label}>BULL</div>
                    <div style={value}>{agg.bull}</div>
                    <div style={sub}>Birdie</div>
                  </div>
                  <div style={box}>
                    <div style={label}>DBULL</div>
                    <div style={value}>{agg.dbull}</div>
                    <div style={sub}>Eagle</div>
                  </div>

                  <div style={box}>
                    <div style={label}>%1st</div>
                    <div style={value}>{agg.holesPlayed ? `${pct(agg.holesWon, agg.holesPlayed)}%` : "—"}</div>
                    <div style={sub}>Trous gagnés</div>
                  </div>
                  <div style={box}>
                    <div style={label}>%2nd</div>
                    <div style={value}>{agg.holesPlayed ? `${pct(agg.holes2nd, agg.holesPlayed)}%` : "—"}</div>
                    <div style={sub}>2e place</div>
                  </div>
                  <div style={box}>
                    <div style={label}>%3rd</div>
                    <div style={value}>{agg.holesPlayed ? `${pct(agg.holes3rd, agg.holesPlayed)}%` : "—"}</div>
                    <div style={sub}>3e place</div>
                  </div>
                  <div style={box}>
                    <div style={label}>Tours</div>
                    <div style={value}>{agg.turns}</div>
                    <div style={sub}>Volées</div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.18))",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>Répartition des hits</div>
                  {[
                    { k: "DBULL (Eagle)", v: agg.dbull },
                    { k: "BULL (Birdie)", v: agg.bull },
                    { k: "Triple (Double Bogey)", v: agg.t },
                    { k: "Double (Bogey)", v: agg.d },
                    { k: "Simple (Par)", v: agg.s },
                    { k: "Miss", v: agg.miss },
                  ].map((row) => {
                    const p = hitsTotal ? Math.round((row.v / hitsTotal) * 100) : 0;
                    return (
                      <div
                        key={row.k}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "140px 1fr 44px",
                          alignItems: "center",
                          gap: 10,
                          marginTop: 6,
                        }}
                      >
                        <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.k}</div>
                        <div
                          style={{
                            height: 10,
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.10)",
                            overflow: "hidden",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: hitsTotal ? `${p}%` : "0%",
                              background: "linear-gradient(90deg, rgba(120,255,230,0.55), rgba(255,180,80,0.55))",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 12, textAlign: "right", opacity: 0.85 }}>{hitsTotal ? `${p}%` : "—"}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
                </div>
              </div>
            )}


            {currentMode === "batard" && (
              <div style={card}>
                <div style={{ padding: 18 }}>
                  <div style={{ fontWeight: 1000, letterSpacing: 1, color: "#ffd56a", marginBottom: 10 }}>
                    BÂTARD — Stats
                  </div>

                  {!selectedPlayer ? (
                    <div style={{ color: T.text70, fontSize: 13 }}>
                      Sélectionne un joueur pour afficher les stats BÂTARD.
                    </div>
                  ) : !batardStats ? (
                    <div style={{ color: T.text70, fontSize: 13 }}>
                      Chargement des stats…
                    </div>
                  ) : (
                    (() => {
                      const s: any = batardStats;
                      const box = { ...softCard, padding: 14 } as React.CSSProperties;
                      const label = { opacity: 0.85, fontSize: 12 } as React.CSSProperties;
                      const value = { fontSize: 20, fontWeight: 1000 } as React.CSSProperties;

                      const games = N(s.games);
                      const wins = N(s.wins);
                      const winRate = N(s.winRate);
                      const darts = N(s.darts);
                      const avg3 = N(s.avg3);
                      const points = N((s as any).points);
                      const bestVisit = N(s.bestVisit);

                      const fails = N((s as any).fails);
                      const validHits = N((s as any).validHits);
                      const advances = N((s as any).advances);

                      const failsPerGame = games ? fails / games : 0;
                      const hitsPerDart = darts ? validHits / darts : 0;

                      return (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                            <div style={box}>
                              <div style={label}>Parties</div>
                              <div style={value}>{games}</div>
                            </div>
                            <div style={box}>
                              <div style={label}>Victoires</div>
                              <div style={value}>{wins}</div>
                            </div>

                            <div style={box}>
                              <div style={label}>WinRate</div>
                              <div style={value}>{games ? `${Math.round(winRate * 100)}%` : "—"}</div>
                            </div>
                            <div style={box}>
                              <div style={label}>Avg 3</div>
                              <div style={value}>{avg3 ? Math.round(avg3 * 10) / 10 : "—"}</div>
                            </div>

                            <div style={box}>
                              <div style={label}>Darts</div>
                              <div style={value}>{darts}</div>
                            </div>
                            <div style={box}>
                              <div style={label}>Points</div>
                              <div style={value}>{points}</div>
                            </div>

                            <div style={box}>
                              <div style={label}>Best Visit</div>
                              <div style={value}>{bestVisit || "—"}</div>
                            </div>
                            <div style={box}>
                              <div style={label}>Valid hits</div>
                              <div style={value}>{validHits}</div>
                              <div style={{ opacity: 0.75, fontSize: 11 }}>
                                {darts ? `${Math.round(hitsPerDart * 100)}% / dart` : "—"}
                              </div>
                            </div>

                            <div style={box}>
                              <div style={label}>Fails</div>
                              <div style={value}>{fails}</div>
                              <div style={{ opacity: 0.75, fontSize: 11 }}>
                                {games ? `${Math.round(failsPerGame * 10) / 10} / match` : "—"}
                              </div>
                            </div>
                            <div style={box}>
                              <div style={label}>Advances</div>
                              <div style={value}>{advances}</div>
                            </div>
                          </div>

                          <div style={{ marginTop: 10, color: T.text70, fontSize: 12, lineHeight: 1.35 }}>
                            Basé sur <b>BatardConfig</b> : progression via <b>valid hits</b> et pénalités via <b>failPolicy</b>.
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            )}

{currentMode === "territories" && (
              <div style={card}>
                <React.Suspense fallback={<LazyFallback label="Chargement Territories…" />}>
                  <StatsTerritoriesTab embedded />
                </React.Suspense>
              </div>
            )}

            {currentMode === "leaderboards" && (
              <div style={card}>
                <React.Suspense fallback={<LazyFallback label="Chargement Classements…" />}>
                  <StatsLeaderboardsTab
                    records={(isMolkkySport ? records.filter((r: any) => isMolkkyRecord(r)) : records) as any}
                    profiles={storeProfiles as any}
                    sportOverride={effectiveSport}
                  />
                </React.Suspense>
              </div>
            )}

            {currentMode === "history" && (
              <div style={card}>
                {isMolkkySport ? (
                  <MolkkyStatsHistoryPage store={store as any} go={go} />
                ) : (
                  <HistoryPage go={go} />
                )}
              </div>
            )}
          </React.Suspense>
        </div>
      </div>
    </div>
      {devModeEnabled && (
        <button
          type="button"
          onClick={() => {
            const next = !showRuntimeDebug;
            setShowRuntimeDebug(next);
            try { localStorage.setItem("dc_stats_runtime_debug", next ? "1" : "0"); } catch {}
          }}
          style={{
            position: "fixed",
            right: 14,
            bottom: 84,
            zIndex: 9999,
            padding: "10px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: showRuntimeDebug ? "rgba(255,215,0,0.22)" : "rgba(0,0,0,0.32)",
            color: "#fff",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
          aria-label={showRuntimeDebug ? "Masquer le debug" : "Afficher le debug"}
          title={showRuntimeDebug ? "Masquer le debug" : "Afficher le debug"}
        >
          🧪
        </button>
      )}

{STATS_DEBUG && dbg && (
  <div
    style={{
      position: "fixed",
      left: 10,
      right: 10,
      bottom: 10,
      zIndex: 9999,
      background: "rgba(0,0,0,0.88)",
      border: `1px solid rgba(255,255,255,0.22)`,
      borderRadius: 14,
      padding: 10,
      fontSize: 12,
      color: "#fff",
      boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
    }}
  >
    <div style={{ fontWeight: 900, marginBottom: 6 }}>🧪 StatsHub Runtime Debug</div>
    <div style={{ opacity: 0.9 }}>
      selectedPlayerId: <b>{dbg.selectedPlayerId || "EMPTY"}</b>
    </div>
    <div style={{ opacity: 0.9 }}>
      activePlayerId: <b>{dbg.activePlayerId || "EMPTY"}</b>
    </div>
    <div style={{ marginTop: 4 }}>
      effectiveProfileId: <b style={{ color: "#FFD36A" }}>{dbg.effectiveProfileId || "EMPTY"}</b>
    </div>
    <div style={{ marginTop: 4, opacity: 0.95 }}>
      cache:{" "}
      <b style={{ color: dbg.cacheOk ? "#7CFF7C" : "#FF6B6B" }}>{dbg.cacheOk ? "OK" : "NULL"}</b>
      {dbg.cacheUpdatedAt ? (
        <>
          {" "}
          • updatedAt <b>{new Date(dbg.cacheUpdatedAt).toLocaleString()}</b>
        </>
      ) : null}
    </div>
    <div style={{ marginTop: 4, opacity: 0.9 }}>
      nmEffective: <b>{dbg.nmCount}</b> matches • samplePlayers <b>{dbg.samplePlayersCount}</b>
    </div>
    <div style={{ marginTop: 4, opacity: 0.9 }}>
      player fields (sample): id=<b>{dbg.fieldCounts.id}</b> • playerId=<b>{dbg.fieldCounts.playerId}</b> • profileId=<b>{dbg.fieldCounts.profileId}</b>
    </div>
    <div style={{ marginTop: 4, opacity: 0.9 }}>
      matches for effectiveProfileId: by_id=<b>{dbg.matchCount.by_id}</b> • by_playerId=<b>{dbg.matchCount.by_playerId}</b> • by_profileId=<b>{dbg.matchCount.by_profileId}</b>
    </div>

    {dbg.keysFound?.length ? (
      <div style={{ marginTop: 6, opacity: 0.75, fontSize: 11, wordBreak: "break-word" }}>
        keys: {dbg.keysFound.join(", ")}
      </div>
    ) : null}

    <div style={{ marginTop: 8, opacity: 0.75, fontSize: 11 }}>
      Astuce: si by_id=0 mais by_playerId&gt;0 (ou by_profileId&gt;0), StatsHub mappe le mauvais champ → stats à 0.
    </div>
  </div>
)}

  </div>
);
}



export { StatsHub };
