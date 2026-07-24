// ============================================
// src/pages/TrainingClock.tsx
// Training — Tour de l'horloge (v5, multi-joueurs)
// - Choix de 1+ joueurs via médaillons d'avatars
// - Chaque joueur joue sa session à la suite
// - Historique local par session (localStorage)
// ============================================

import React from "react";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { playSound } from "../lib/sound";
import type { Profile } from "../lib/types";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import TeamPagedSelector from "../components/TeamPagedSelector";
import { loadTeamsBySport, type TeamEntity } from "../lib/petanqueTeamsStore";
import { useTheme } from "../contexts/ThemeContext";
import ProfileAvatar from "../components/ProfileAvatar";
import Keypad from "../components/Keypad";
import { getCountryFlag } from "../lib/countryNames";
import { getCountryFlagSrc } from "../lib/geoAssets";
import { getDartSetsForProfile, getPublicDartSetsForSelector, getFavoriteDartSetForProfile, getDartSetById, getDartSetMainImageSrc, getDartSetThumbImageSrc, bumpDartSetUsage } from "../lib/dartSetsStore";
import tickerTourHorloge from "../assets/tickers/ticker_tour_horloge.png";
import tickerClockClassic from "../assets/tickers/clock_variants/classic.png";
import tickerClockDoubles from "../assets/tickers/clock_variants/doubles.png";
import tickerClockTriples from "../assets/tickers/clock_variants/triples.png";
import tickerClockSDT from "../assets/tickers/clock_variants/sdt.png";
import targetBg from "../assets/target_bg.png";

type ClockMode = "classic" | "doubles" | "triples" | "sdt";
type ParticipantMode = "players" | "teams";

type ClockConfig = {
  mode: ClockMode;
  showTimer: boolean;
  dartLimit: number | null; // nb de fléchettes max par joueur, null = illimité
  participantMode?: ParticipantMode;
  teamIds?: string[];
  teamNames?: string[];
  playerDartSets?: Record<string, string | null>;
};

type Target = number | "BULL";

const TARGETS: Target[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  "BULL",
];

type StageSDT = 0 | 1 | 2; // 0 = Simple, 1 = Double, 2 = Triple

type ClockBreakdown = {
  simple: number;
  double: number;
  triple: number;
  bull: number;
  dbull: number;
  miss: number;
};

type ClockSession = {
  id: string;
  profileId: string | null;
  profileName: string;
  teamId?: string | null;
  teamName?: string | null;
  dartSetId?: string | null;
  dartSetName?: string | null;
  config: ClockConfig;
  startedAt: string;
  endedAt: string;
  dartsThrown: number;
  attempts: number;
  hits: number;
  validHits: number;
  targetsHit: number;
  targetsCompleted: number;
  targetReached: string;
  completed: boolean;
  elapsedMs: number;
  totalTimeSec: number;
  bestStreak: number;
  accuracyPct: number;
  breakdown: ClockBreakdown;
  throwLabels: string[];
};

const STORAGE_KEY = "dc_training_clock_stats_v1";
const LEGACY_STORAGE_KEY = "dc-training-clock-v1";

type PlayerLite = { id: string | null; name: string; teamId?: string | null; teamName?: string | null };

type Props = {
  profiles?: Profile[];
  activeProfileId?: string | null;
  go?: (tab: any, params?: any) => void;
  onFinish?: (match: any) => void;
};

// --------- helpers temps / format ---------
function formatTime(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}`;
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function initialsFromName(name: string | undefined | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// petit format pour l'historique des lancers
function formatThrowLabel(
  isMiss: boolean,
  value: Target | null,
  mult: 1 | 2 | 3
): string {
  if (isMiss || !value) return "Miss";
  if (value === "BULL") {
    if (mult === 2) return "DBull";
    if (mult === 3) return "TBull";
    return "Bull";
  }
  const prefix = mult === 1 ? "S" : mult === 2 ? "D" : "T";
  return `${prefix}${value}`;
}

type ThrowKind = "miss" | "simple" | "double" | "triple" | "bull";

// pour colorer les pastilles d'historique
function getThrowKind(label: string): ThrowKind {
  if (label === "Miss") return "miss";
  if (label.startsWith("D") || label.startsWith("DBull")) return "double";
  if (label.startsWith("T") || label.startsWith("TBull")) return "triple";
  if (label === "Bull") return "bull";
  return "simple";
}

// pour la couleur de l'objectif
type ObjectiveKind = "simple" | "double" | "triple";

function getObjectiveKind(
  config: ClockConfig,
  stage: StageSDT
): ObjectiveKind {
  if (config.mode === "sdt") {
    if (stage === 0) return "simple";
    if (stage === 1) return "double";
    return "triple";
  }
  if (config.mode === "doubles") return "double";
  if (config.mode === "triples") return "triple";
  return "simple";
}

function labelObjective(
  target: Target,
  config: ClockConfig,
  stage: StageSDT
): string {
  const base = target === "BULL" ? "Bull" : target.toString();
  if (config.mode === "sdt") {
    const prefix = stage === 0 ? "S" : stage === 1 ? "D" : "T";
    return `${prefix}${base}`;
  }
  if (config.mode === "doubles") return `D${base}`;
  if (config.mode === "triples") return `T${base}`;
  return base;
}

function emptyBreakdown(): ClockBreakdown {
  return { simple: 0, double: 0, triple: 0, bull: 0, dbull: 0, miss: 0 };
}

function breakdownFromLabels(labels: string[]): ClockBreakdown {
  return (labels || []).reduce((acc, raw) => {
    const label = String(raw || "").trim();
    if (!label || label.toLowerCase() === "miss") acc.miss += 1;
    else if (label === "DBull") acc.dbull += 1;
    else if (label === "Bull") acc.bull += 1;
    else if (label.startsWith("T")) acc.triple += 1;
    else if (label.startsWith("D")) acc.double += 1;
    else acc.simple += 1;
    return acc;
  }, emptyBreakdown());
}

function normalizeClockSession(raw: any): ClockSession {
  const dartsThrown = Number(raw?.dartsThrown ?? raw?.attempts ?? raw?.throws ?? 0) || 0;
  const validHits = Number(raw?.validHits ?? raw?.hits ?? 0) || 0;
  const targetsCompleted = Number(raw?.targetsCompleted ?? raw?.targetsHit ?? Math.min(21, validHits)) || 0;
  const elapsedMs = Number(raw?.elapsedMs ?? (Number(raw?.totalTimeSec ?? raw?.timeSec ?? 0) * 1000)) || 0;
  const throwLabels = Array.isArray(raw?.throwLabels) ? raw.throwLabels.map((x: any) => String(x)) : [];
  const fallbackBreakdown = breakdownFromLabels(throwLabels);
  const breakdown = raw?.breakdown && typeof raw.breakdown === "object"
    ? {
        simple: Number(raw.breakdown.simple ?? raw.breakdown.s ?? 0) || 0,
        double: Number(raw.breakdown.double ?? raw.breakdown.d ?? 0) || 0,
        triple: Number(raw.breakdown.triple ?? raw.breakdown.t ?? 0) || 0,
        bull: Number(raw.breakdown.bull ?? 0) || 0,
        dbull: Number(raw.breakdown.dbull ?? raw.breakdown.doubleBull ?? 0) || 0,
        miss: Number(raw.breakdown.miss ?? 0) || 0,
      }
    : fallbackBreakdown;
  return {
    id: String(raw?.id || generateId()),
    profileId: raw?.profileId == null ? null : String(raw.profileId),
    profileName: String(raw?.profileName || raw?.playerName || "Joueur"),
    teamId: raw?.teamId == null ? null : String(raw.teamId),
    teamName: raw?.teamName == null ? null : String(raw.teamName),
    dartSetId: raw?.dartSetId == null ? null : String(raw.dartSetId),
    dartSetName: raw?.dartSetName == null ? null : String(raw.dartSetName),
    config: {
      mode: (["classic", "doubles", "triples", "sdt"] as ClockMode[]).includes(raw?.config?.mode) ? raw.config.mode : "classic",
      showTimer: raw?.config?.showTimer !== false,
      dartLimit: Number(raw?.config?.dartLimit) > 0 ? Number(raw.config.dartLimit) : null,
      participantMode: raw?.config?.participantMode === "teams" ? "teams" : "players",
      teamIds: Array.isArray(raw?.config?.teamIds) ? raw.config.teamIds.map((x: any) => String(x)) : undefined,
      teamNames: Array.isArray(raw?.config?.teamNames) ? raw.config.teamNames.map((x: any) => String(x)) : undefined,
      playerDartSets: raw?.config?.playerDartSets && typeof raw.config.playerDartSets === "object" ? Object.fromEntries(Object.entries(raw.config.playerDartSets).map(([k,v]) => [String(k), v == null ? null : String(v)])) : undefined,
    },
    startedAt: String(raw?.startedAt || raw?.createdAt || new Date().toISOString()),
    endedAt: String(raw?.endedAt || raw?.updatedAt || raw?.startedAt || new Date().toISOString()),
    dartsThrown,
    attempts: dartsThrown,
    hits: validHits,
    validHits,
    targetsHit: targetsCompleted,
    targetsCompleted,
    targetReached: String(raw?.targetReached || (targetsCompleted >= 21 ? "Bull" : Math.max(0, targetsCompleted))),
    completed: Boolean(raw?.completed),
    elapsedMs,
    totalTimeSec: Math.round((elapsedMs / 1000) * 10) / 10,
    bestStreak: Number(raw?.bestStreak ?? raw?.streak ?? 0) || 0,
    accuracyPct: dartsThrown > 0 ? Math.round((validHits / dartsThrown) * 1000) / 10 : 0,
    breakdown,
    throwLabels,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgba(246,194,86,${alpha})`;
  const n = Number.parseInt(clean, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function getClockDartSetThumb(set: any): string | null {
  return getDartSetMainImageSrc(set) || getDartSetThumbImageSrc(set) || null;
}

function isClockSetPublic(set: any): boolean {
  return String(set?.scope || "").toLowerCase() === "public";
}

function isClockSetFavoriteForProfile(set: any, profileId: string): boolean {
  const pid = String(profileId || "");
  if (!pid || !set) return false;
  const favs = Array.isArray(set?.favoriteProfileIds) ? set.favoriteProfileIds.map((x: any) => String(x)) : [];
  if (favs.includes(pid)) return true;
  if (!isClockSetPublic(set) && String(set?.profileId || "") === pid && set?.isFavorite) return true;
  return false;
}

function getClockSelectableDartSets(profileId: string): any[] {
  const pid = String(profileId || "");
  if (!pid) return [];
  const combined = [...(getPublicDartSetsForSelector() || []), ...(getDartSetsForProfile(pid) || [])];
  const map = new Map<string, any>();
  for (const set of combined) {
    const id = String(set?.id || "");
    if (!id || map.has(id)) continue;
    map.set(id, set);
  }
  return [...map.values()].sort((a: any, b: any) => {
    const aFav = isClockSetFavoriteForProfile(a, pid) ? 1 : 0;
    const bFav = isClockSetFavoriteForProfile(b, pid) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    const aPrivate = isClockSetPublic(a) ? 0 : 1;
    const bPrivate = isClockSetPublic(b) ? 0 : 1;
    if (aPrivate !== bPrivate) return bPrivate - aPrivate;
    const aUsage = Number(a?.usageCount || 0);
    const bUsage = Number(b?.usageCount || 0);
    if (aUsage !== bUsage) return bUsage - aUsage;
    return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base", numeric: true });
  });
}

function guessClockDefaultDartSetId(profileId: string): string | null {
  const pid = String(profileId || "");
  if (!pid) return null;
  const fav = getFavoriteDartSetForProfile(pid);
  if (fav?.id) return String(fav.id);
  const pool = getClockSelectableDartSets(pid);
  return pool[0]?.id ? String(pool[0].id) : null;
}

function getClockProfileCountryRaw(profile: any): string {
  const candidates = [
    profile?.countryCode, profile?.country_code, profile?.country, profile?.countryName, profile?.nation, profile?.nationality,
    profile?.privateInfo?.countryCode, profile?.privateInfo?.country_code, profile?.privateInfo?.country, profile?.privateInfo?.countryName,
    profile?.private_info?.countryCode, profile?.private_info?.country_code, profile?.private_info?.country, profile?.private_info?.countryName,
    profile?.preferences?.countryCode, profile?.preferences?.country_code, profile?.preferences?.country,
    profile?.profile?.countryCode, profile?.profile?.country_code, profile?.profile?.country,
  ];
  for (const value of candidates) {
    const raw = String(value || "").trim();
    if (raw) return raw;
  }
  return "";
}

function getClockProfileCountryCode(profile: any): string {
  const raw = String(getClockProfileCountryRaw(profile) || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper === "UK" ? "GB" : upper;
  const chars = Array.from(raw);
  if (chars.length === 2) {
    const a = chars[0].codePointAt(0) || 0;
    const b = chars[1].codePointAt(0) || 0;
    if (a >= 0x1f1e6 && a <= 0x1f1ff && b >= 0x1f1e6 && b <= 0x1f1ff) {
      return String.fromCharCode(65 + a - 0x1f1e6, 65 + b - 0x1f1e6);
    }
  }
  try {
    const emoji = getCountryFlag(raw);
    const emojiChars = Array.from(emoji);
    if (emojiChars.length === 2) {
      const a = emojiChars[0].codePointAt(0) || 0;
      const b = emojiChars[1].codePointAt(0) || 0;
      if (a >= 0x1f1e6 && a <= 0x1f1ff && b >= 0x1f1e6 && b <= 0x1f1ff) {
        return String.fromCharCode(65 + a - 0x1f1e6, 65 + b - 0x1f1e6);
      }
    }
  } catch {}
  return "";
}

function ClockCountryFlagBadge({ profile, accent, size = 30, style = {} }: { profile: any; accent: string; size?: number; style?: React.CSSProperties }) {
  const raw = getClockProfileCountryRaw(profile);
  const code = getClockProfileCountryCode(profile);
  const src = code ? (getCountryFlagSrc(code) || "") : "";
  let fallback = "";
  try { fallback = raw ? getCountryFlag(raw) : ""; } catch {}
  if (!src && !fallback) return null;
  return (
    <span
      title={raw || undefined}
      aria-label="Pays du joueur"
      style={{
        position: "absolute",
        right: 8,
        bottom: 8,
        zIndex: 7,
        width: size,
        height: size,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "rgba(3,8,18,.96)",
        border: `1px solid ${accent}`,
        boxShadow: `0 0 10px ${accent}66, 0 8px 18px rgba(0,0,0,.42)`,
        overflow: "hidden",
        color: "#fff",
        fontSize: Math.max(10, Math.round(size * 0.42)),
        fontWeight: 950,
        lineHeight: 1,
        ...style,
      }}
    >
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ lineHeight: 1 }}>{fallback}</span>}
    </span>
  );
}

// ============================================
// Component principal
// ============================================

const TrainingClock: React.FC<Props> = (props) => {
  useFullscreenPlay();
  const onFinish = props.onFinish;
  // Récupération des profils depuis les props OU depuis le store global exposé par App
  const globalStore = (window as any).__appStore || {};
  const profiles: Profile[] = props.profiles ?? globalStore.profiles ?? [];
  const activeProfileId: string | null =
    props.activeProfileId ?? globalStore.activeProfileId ?? null;

  // ✅ Navigation robuste (go() app > fallback history)
  const appGo =
    props.go ??
    (globalStore && typeof globalStore.go === "function" ? globalStore.go : null) ??
    ((window as any).__appGo && typeof (window as any).__appGo === "function"
      ? (window as any).__appGo
      : null);

  const handleBack = React.useCallback(() => {
    try {
      if (typeof appGo === "function") {
        // on revient au menu "Games/Training" (le plus logique)
        appGo("games");
        return;
      }
    } catch (e) {
      // ignore
    }

    // fallback
    if (window.history.length > 1) window.history.back();
    else window.location.hash = "#/"; // dernier filet de sécurité
  }, [appGo]);  

  // --- sélection de joueurs / équipes ---
  const [participantMode, setParticipantMode] = React.useState<ParticipantMode>("players");
  const [selectedPlayerIds, setSelectedPlayerIds] = React.useState<string[]>(
    () => {
      const list = profiles || [];
      if (!list.length) return [];
      const found = activeProfileId && list.find((p) => p.id === activeProfileId);
      return [found?.id ?? list[0].id];
    }
  );
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>([]);
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>({});

  const teamsCatalog = React.useMemo<TeamEntity[]>(() => {
    try {
      return loadTeamsBySport("darts").filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0);
    } catch {
      return [];
    }
  }, [profiles]);

  const selectedTeams = React.useMemo(() => {
    return (selectedTeamIds || [])
      .map((id) => teamsCatalog.find((team) => String(team.id) === String(id)))
      .filter(Boolean) as TeamEntity[];
  }, [selectedTeamIds, teamsCatalog]);

  const players: PlayerLite[] = React.useMemo(() => {
    if (participantMode === "teams") {
      const fromTeams: PlayerLite[] = [];
      for (const team of selectedTeams) {
        const memberIds = Array.isArray(team?.playerIds) ? team.playerIds.map((x) => String(x)) : [];
        for (const memberId of memberIds) {
          const p = profiles.find((pr) => String(pr.id) === memberId);
          if (!p) continue;
          fromTeams.push({
            id: memberId,
            name: p?.nickname ?? p?.name ?? "Joueur",
            teamId: String(team.id),
            teamName: team.name || "Équipe",
          });
        }
      }
      return fromTeams;
    }
    return (selectedPlayerIds || []).map((id) => {
      const p = profiles.find((pr) => String(pr.id) === String(id));
      return {
        id,
        name: p?.nickname ?? p?.name ?? "Joueur",
      };
    });
  }, [participantMode, selectedPlayerIds, selectedTeams, profiles]);

  React.useEffect(() => {
    const participantIds = players.map((p) => String(p.id || "")).filter(Boolean);
    setPlayerDartSets((prev) => {
      const next: Record<string, string | null> = {};
      let changed = false;
      for (const pid of participantIds) {
        if (Object.prototype.hasOwnProperty.call(prev, pid)) next[pid] = prev[pid] ?? null;
        else {
          next[pid] = guessClockDefaultDartSetId(pid);
          changed = true;
        }
      }
      const prevKeys = Object.keys(prev || {});
      if (!changed && prevKeys.length === participantIds.length) {
        for (const pid of participantIds) {
          if ((prev[pid] ?? null) !== (next[pid] ?? null)) { changed = true; break; }
        }
      }
      return changed || prevKeys.length !== participantIds.length ? next : prev;
    });
  }, [players]);

  const [step, setStep] = React.useState<"setup" | "play" | "summary">(
    "setup"
  );
  const [currentPlayerIndex, setCurrentPlayerIndex] = React.useState(0);
  const currentPlayer: PlayerLite | null =
    players[currentPlayerIndex] ?? players[0] ?? {
      id: null,
      name: "Joueur solo",
    };
  const isMulti = players.length > 1;
  const currentPlayerDartSetId = currentPlayer?.id ? (playerDartSets[String(currentPlayer.id)] ?? null) : null;
  const currentPlayerDartSet = currentPlayerDartSetId ? getDartSetById(currentPlayerDartSetId) : null;

  const [config, setConfig] = React.useState<ClockConfig>({
    mode: "classic",
    showTimer: true,
    dartLimit: null,
  });

  const [currentTargetIndex, setCurrentTargetIndex] = React.useState(0);
  const [stageSDT, setStageSDT] = React.useState<StageSDT>(0);
  const [dartsThrown, setDartsThrown] = React.useState(0);
  const [hits, setHits] = React.useState(0);
  const [targetsCompleted, setTargetsCompleted] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);
  const [currentStreak, setCurrentStreak] = React.useState(0);
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const [endTime, setEndTime] = React.useState<number | null>(null);

  // timer "live" pour que le temps défile en continu
  const [nowTick, setNowTick] = React.useState<number>(Date.now());

  // sélection actuelle sur le mini keypad
  const [selectedValue, setSelectedValue] = React.useState<Target | null>(1);
  const [selectedMult, setSelectedMult] = React.useState<1 | 2 | 3>(1);
  const [isMiss, setIsMiss] = React.useState(false);

  // historique court des derniers lancers (affiché en bas)
  const [lastThrows, setLastThrows] = React.useState<string[]>([]);
  const [throwLog, setThrowLog] = React.useState<string[]>([]);

  // dernier objectif validé + temps au moment du hit
  const [lastObjectiveLabel, setLastObjectiveLabel] =
    React.useState<string | null>(null);
  const [lastObjectiveTimeMs, setLastObjectiveTimeMs] =
    React.useState<number | null>(null);

  // résumé de la session terminée (joueur courant)
  const [lastSession, setLastSession] = React.useState<ClockSession | null>(
    null
  );
  const [history, setHistory] = React.useState<ClockSession[]>([]);

  const [showInfo, setShowInfo] = React.useState(false);

  // ✅ Toujours afficher la page en haut au chargement
  React.useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);


  // Charger et migrer l'historique local vers la clé commune utilisée par Home/Stats.
  React.useEffect(() => {
    try {
      const canonicalRaw = window.localStorage.getItem(STORAGE_KEY);
      const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      const raw = canonicalRaw || legacyRaw;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed.map(normalizeClockSession).slice(0, 100);
      setHistory(normalized);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (e) {
      console.warn("Impossible de charger l'historique Tour de l'horloge", e);
    }
  }, []);

  // Timer qui fait défiler le temps pendant la session
  React.useEffect(() => {
    if (!config.showTimer || step !== "play" || startTime == null || endTime != null) {
      return;
    }
    const id = window.setInterval(() => {
      setNowTick(Date.now());
    }, 500);
    return () => {
      window.clearInterval(id);
    };
  }, [config.showTimer, step, startTime, endTime]);

  // sauver historique local
  function saveSessionToHistory(session: ClockSession) {
    try {
      const next = [session, ...history].slice(0, 100);
      setHistory(next);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn(
        "Impossible de sauvegarder l'historique Tour de l'horloge",
        e
      );
    }
  }

  const currentTarget = TARGETS[currentTargetIndex];

  // ------------ logique de hit / avance cible --------------

  function isHit(
    target: Target,
    mode: ClockMode,
    value: Target | null,
    mult: 1 | 2 | 3,
    stage: StageSDT
  ): { hit: boolean; nextStage?: StageSDT; advanceTarget?: boolean } {
    if (!value) return { hit: false };

    // Gestion spéciale BULL
    if (target === "BULL") {
      if (value !== "BULL") return { hit: false };

      if (mode === "classic") {
        return { hit: true, advanceTarget: true };
      }
      if (mode === "doubles") {
        return { hit: mult === 2, advanceTarget: mult === 2 };
      }
      if (mode === "triples") {
        return { hit: false }; // pas de triple bull
      }
      if (mode === "sdt") {
        if (stage === 0 && mult === 1) {
          return { hit: true, nextStage: 1, advanceTarget: false };
        }
        if (stage === 1 && mult === 2) {
          return { hit: true, nextStage: 0, advanceTarget: true };
        }
        return { hit: false };
      }
      return { hit: false };
    }

    // Cible numérique 1-20
    if (typeof target === "number") {
      if (value !== target) return { hit: false };

      if (mode === "classic") {
        return { hit: true, advanceTarget: true };
      }
      if (mode === "doubles") {
        return { hit: mult === 2, advanceTarget: mult === 2 };
      }
      if (mode === "triples") {
        return { hit: mult === 3, advanceTarget: mult === 3 };
      }
      if (mode === "sdt") {
        if (stage === 0 && mult === 1) {
          return { hit: true, nextStage: 1, advanceTarget: false };
        }
        if (stage === 1 && mult === 2) {
          return { hit: true, nextStage: 2, advanceTarget: false };
        }
        if (stage === 2 && mult === 3) {
          return { hit: true, nextStage: 0, advanceTarget: true };
        }
        return { hit: false };
      }
    }

    return { hit: false };
  }

  function resetGameState() {
    setCurrentTargetIndex(0);
    setStageSDT(0);
    setDartsThrown(0);
    setHits(0);
    setTargetsCompleted(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setStartTime(null);
    setEndTime(null);
    setSelectedValue(1);
    setSelectedMult(1);
    setIsMiss(false);
    setLastThrows([]);
    setThrowLog([]);
    setLastObjectiveLabel(null);
    setLastObjectiveTimeMs(null);
  }

  function handleStartForPlayer(playerIndex: number) {
    if (!players.length) return;
    const bounded = Math.max(0, Math.min(playerIndex, players.length - 1));
    setCurrentPlayerIndex(bounded);
    resetGameState();
    setLastSession(null);
    setStep("play");
    const now = Date.now();
    setStartTime(now);
    setEndTime(null);
    playSound("start");
  }

  function handleStart() {
    handleStartForPlayer(0);
  }

  function handleAbort() {
    setStep("setup");
  }

  function finishSessionForCurrentPlayer(
    completed: boolean,
    values?: {
      dartsThrown?: number;
      hits?: number;
      targetsCompleted?: number;
      bestStreak?: number;
      throwLabels?: string[];
    }
  ) {
    const player = currentPlayer;
    const now = Date.now();
    setEndTime(now);

    const finalDarts = Number(values?.dartsThrown ?? dartsThrown) || 0;
    const finalHits = Number(values?.hits ?? hits) || 0;
    const finalTargets = Math.max(0, Math.min(TARGETS.length, Number(values?.targetsCompleted ?? targetsCompleted) || 0));
    const finalBestStreak = Number(values?.bestStreak ?? bestStreak) || 0;
    const finalThrowLabels = Array.isArray(values?.throwLabels) ? values!.throwLabels! : throwLog;
    const elapsed = startTime != null ? Math.max(0, now - startTime) : 0;
    const targetReachedValue = completed
      ? "Bull"
      : finalTargets > 0
      ? String(TARGETS[Math.min(TARGETS.length - 1, finalTargets - 1)] === "BULL" ? "Bull" : TARGETS[Math.min(TARGETS.length - 1, finalTargets - 1)])
      : "—";
    const accuracyPct = finalDarts > 0 ? Math.round((finalHits / finalDarts) * 1000) / 10 : 0;
    const breakdown = breakdownFromLabels(finalThrowLabels);

    const sessionDartSetId = player?.id ? (playerDartSets[String(player.id)] ?? null) : null;
    const sessionDartSet = sessionDartSetId ? getDartSetById(sessionDartSetId) : null;
    const sessionConfig: ClockConfig = {
      ...config,
      participantMode,
      teamIds: participantMode === "teams" ? selectedTeams.map((team) => String(team.id)) : undefined,
      teamNames: participantMode === "teams" ? selectedTeams.map((team) => String(team.name || "Équipe")) : undefined,
      playerDartSets: Object.fromEntries(Object.entries(playerDartSets || {}).filter(([pid]) => players.some((p) => String(p.id || "") === String(pid)))),
    };

    const session: ClockSession = {
      id: generateId(),
      profileId: player?.id ?? null,
      profileName: player?.name ?? "Joueur solo",
      teamId: player?.teamId ?? null,
      teamName: player?.teamName ?? null,
      dartSetId: sessionDartSetId,
      dartSetName: sessionDartSet?.name ? String(sessionDartSet.name) : null,
      config: sessionConfig,
      startedAt: startTime != null ? new Date(startTime).toISOString() : new Date().toISOString(),
      endedAt: new Date(now).toISOString(),
      dartsThrown: finalDarts,
      attempts: finalDarts,
      hits: finalHits,
      validHits: finalHits,
      targetsHit: finalTargets,
      targetsCompleted: finalTargets,
      targetReached: targetReachedValue,
      completed,
      elapsedMs: elapsed,
      totalTimeSec: Math.round((elapsed / 1000) * 10) / 10,
      bestStreak: finalBestStreak,
      accuracyPct,
      breakdown,
      throwLabels: finalThrowLabels,
    };

    setLastSession(session);
    saveSessionToHistory(session);
    if (session.dartSetId) {
      try { bumpDartSetUsage(session.dartSetId); } catch {}
    }

    const playerStats = {
      id: session.profileId,
      profileId: session.profileId,
      playerId: session.profileId,
      name: session.profileName,
      win: session.completed,
      completed: session.completed,
      score: session.targetsCompleted,
      points: session.targetsCompleted,
      dartsThrown: session.dartsThrown,
      attempts: session.attempts,
      hits: session.validHits,
      validHits: session.validHits,
      misses: Math.max(0, session.dartsThrown - session.validHits),
      targetsHit: session.targetsHit,
      targetsCompleted: session.targetsCompleted,
      targetReached: session.targetReached,
      elapsedMs: session.elapsedMs,
      totalTimeSec: session.totalTimeSec,
      bestStreak: session.bestStreak,
      accuracyPct: session.accuracyPct,
      breakdown: session.breakdown,
      darts: {
        thrown: session.dartsThrown,
        hits: session.validHits,
        misses: Math.max(0, session.dartsThrown - session.validHits),
      },
      teamId: session.teamId ?? null,
      teamName: session.teamName ?? null,
      dartSetId: session.dartSetId ?? null,
      dartSetName: session.dartSetName ?? null,
      special: {
        mode: session.config.mode,
        participantMode: session.config.participantMode || "players",
        dartSetId: session.dartSetId ?? null,
        dartSetName: session.dartSetName ?? null,
        targetsCompleted: session.targetsCompleted,
        targetReached: session.targetReached,
        elapsedMs: session.elapsedMs,
        bestStreak: session.bestStreak,
        accuracyPct: session.accuracyPct,
        breakdown: session.breakdown,
      },
    };

    try {
      onFinish?.({
        id: `clock-${session.id}`,
        kind: "clock",
        mode: "tour_de_l_horloge",
        createdAt: session.startedAt,
        updatedAt: session.endedAt,
        players: [{ id: session.profileId, name: session.profileName, teamId: session.teamId ?? null, teamName: session.teamName ?? null, dartSetId: session.dartSetId ?? null, dartSetName: session.dartSetName ?? null }],
        winnerId: session.completed ? session.profileId : null,
        summary: {
          kind: "clock",
          mode: "tour_de_l_horloge",
          winnerId: session.completed ? session.profileId : null,
          players: [playerStats],
          perPlayer: [playerStats],
          session,
        },
        payload: {
          kind: "clock",
          mode: "tour_de_l_horloge",
          gameMode: participantMode === "teams" ? "teams" : "clock",
          sport: "darts",
          config: session.config,
          teams: participantMode === "teams" ? selectedTeams.map((team) => ({ id: team.id, name: team.name, playerIds: Array.isArray(team.playerIds) ? team.playerIds.map(String) : [] })) : undefined,
          players: [playerStats],
          stats: { kind: "clock", mode: "tour_de_l_horloge", players: [playerStats] },
          summary: { players: [playerStats], perPlayer: [playerStats], session },
          session,
        },
      });
    } catch (e) {
      console.warn("Impossible d'ajouter la session Tour de l'horloge à l'historique global", e);
    }

    setStep("summary");
    playSound(completed ? "win" : "lose");
  }

  function handleThrow() {
    if (step !== "play") return;
    if (config.dartLimit != null && dartsThrown >= config.dartLimit) return;

    const newDarts = dartsThrown + 1;
    const label = formatThrowLabel(isMiss, selectedValue, selectedMult);
    const nextThrowLog = [...throwLog, label];
    setDartsThrown(newDarts);
    setThrowLog(nextThrowLog);
    setLastThrows((prev) => [label, ...prev].slice(0, 14));

    let nextHits = hits;
    let nextTargets = targetsCompleted;
    let nextBestStreak = bestStreak;
    let didComplete = false;

    if (isMiss || !selectedValue) {
      setCurrentStreak(0);
      playSound("miss");
    } else {
      const res = isHit(currentTarget, config.mode, selectedValue, selectedMult, stageSDT);

      if (res.hit) {
        nextHits = hits + 1;
        setHits(nextHits);

        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        nextBestStreak = Math.max(bestStreak, newStreak);
        setBestStreak(nextBestStreak);
        playSound("hit");

        if (res.nextStage !== undefined) setStageSDT(res.nextStage);

        if (res.advanceTarget) {
          nextTargets = Math.min(TARGETS.length, targetsCompleted + 1);
          setTargetsCompleted(nextTargets);

          if (startTime != null) {
            setLastObjectiveTimeMs(Math.max(0, (endTime ?? Date.now()) - startTime));
            setLastObjectiveLabel(labelObjective(currentTarget, config, stageSDT));
          }

          const nextIndex = currentTargetIndex + 1;
          if (nextIndex >= TARGETS.length) {
            setCurrentTargetIndex(TARGETS.length - 1);
            didComplete = true;
          } else {
            setCurrentTargetIndex(nextIndex);
            setStageSDT(0);
          }
        }
      } else {
        setCurrentStreak(0);
        playSound("miss");
      }
    }

    if (didComplete) {
      finishSessionForCurrentPlayer(true, {
        dartsThrown: newDarts,
        hits: nextHits,
        targetsCompleted: nextTargets,
        bestStreak: nextBestStreak,
        throwLabels: nextThrowLog,
      });
      return;
    }

    if (config.dartLimit != null && newDarts >= config.dartLimit) {
      finishSessionForCurrentPlayer(false, {
        dartsThrown: newDarts,
        hits: nextHits,
        targetsCompleted: nextTargets,
        bestStreak: nextBestStreak,
        throwLabels: nextThrowLog,
      });
    }
  }

  const elapsedNow =
    startTime != null
      ? (endTime ?? nowTick) - startTime
      : 0;

  // ---------------- UI helpers ----------------

  function labelMode(mode: ClockMode): string {
    switch (mode) {
      case "classic":
        return "Classique (1→20 + Bull)";
      case "doubles":
        return "Doubles only";
      case "triples":
        return "Triples only";
      case "sdt":
        return "S → D → T par numéro";
      default:
        return mode;
    }
  }

  function labelTarget(target: Target, mode: ClockMode, stage: StageSDT) {
    if (mode !== "sdt") {
      return target === "BULL" ? "Bull" : target.toString();
    }
    const stageLabel =
      stage === 0 ? "Simple" : stage === 1 ? "Double" : "Triple";
    const base = target === "BULL" ? "Bull" : target.toString();
    return `${base} (${stageLabel})`;
  }

  const currentObjectiveKind = getObjectiveKind(config, stageSDT);
  const objectiveLabel = labelObjective(
    currentTarget,
    config,
    stageSDT
  );

  const currentProfile = React.useMemo(
    () =>
      profiles.find(
        (p) => p.id === (currentPlayer?.id || activeProfileId)
      ),
    [profiles, currentPlayer, activeProfileId]
  );

  const precision =
    dartsThrown > 0 ? Math.round((hits / dartsThrown) * 100) : 0;

  // ============================================
  // Rendu
  // ============================================
  return (
    <>
      {/* ================= HALO ANIMÉ TOUR DE L'HORLOGE ================= */}
      <style>{`
        @keyframes dcClockGlow {
          0% {
            transform: rotate(0deg);
            opacity: .75;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: rotate(360deg);
            opacity: .75;
          }
        }
      `}</style>

      <div
        className="page training-clock-page"
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: step === "play" ? 760 : 520,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
                              {/* ================= Header : ticker + dots ================= */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              paddingTop: "env(safe-area-inset-top)",
              marginBottom: 10,
            }}
          >
            <div style={{ position: "relative", marginLeft: -16, marginRight: -16 }}>
              <img
                src={tickerTourHorloge}
                alt="Tour de l'Horloge"
                style={{
                  width: "100%",
                  height: 92,
                  objectFit: "cover",
                  display: "block",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,.10)",
                  boxShadow: "0 10px 24px rgba(0,0,0,.55)",
                }}
              />

              {/* Dots overlay (visibles) */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                  pointerEvents: "none",
                }}
              >
                <div style={{ pointerEvents: "auto" }}>
                  <BackDot onClick={handleBack} />
                </div>
                <div style={{ pointerEvents: "auto" }}>
                  <InfoDot onClick={() => setShowInfo(true)} />
                </div>
              </div>
            </div>
          </div>

{/* ================== STEP SETUP ================== */}
          {step === "setup" && (
            <SetupSection
              profiles={profiles}
              participantMode={participantMode}
              setParticipantMode={setParticipantMode}
              selectedPlayerIds={selectedPlayerIds}
              setSelectedPlayerIds={setSelectedPlayerIds}
              teamsCatalog={teamsCatalog}
              selectedTeamIds={selectedTeamIds}
              setSelectedTeamIds={setSelectedTeamIds}
              config={config}
              setConfig={setConfig}
              playerDartSets={playerDartSets}
              setPlayerDartSets={setPlayerDartSets}
              players={players}
              history={history}
              onStart={handleStart}
            />
          )}

          {/* ================== STEP PLAY ================== */}
          {step === "play" && (
            <PlaySection
              isMulti={isMulti}
              currentPlayerIndex={currentPlayerIndex}
              players={players}
              currentPlayer={currentPlayer}
              currentProfile={currentProfile}
              config={config}
              currentTarget={currentTarget}
              stageSDT={stageSDT}
              dartsThrown={dartsThrown}
              hits={hits}
              targetsCompleted={targetsCompleted}
              bestStreak={bestStreak}
              currentStreak={currentStreak}
              elapsedNow={elapsedNow}
              objectiveKind={currentObjectiveKind}
              objectiveLabel={objectiveLabel}
              precision={precision}
              currentDartSetName={currentPlayerDartSet?.name || null}
              labelTarget={labelTarget}
              selectedValue={selectedValue}
              setSelectedValue={setSelectedValue}
              selectedMult={selectedMult}
              setSelectedMult={setSelectedMult}
              isMiss={isMiss}
              setIsMiss={setIsMiss}
              lastThrows={lastThrows}
              throwLog={throwLog}
              lastObjectiveLabel={lastObjectiveLabel}
              lastObjectiveTimeMs={lastObjectiveTimeMs}
              onAbort={handleAbort}
              onThrow={handleThrow}
            />
          )}

          {/* ================== STEP SUMMARY ================== */}
          {step === "summary" && lastSession && (
            <SummarySection
              lastSession={lastSession}
              history={history}
              labelMode={labelMode}
              onBackToSetup={() => setStep("setup")}
              onReplayCurrent={() =>
                handleStartForPlayer(currentPlayerIndex)
              }
              isMulti={isMulti}
              currentPlayerIndex={currentPlayerIndex}
              players={players}
              onNextPlayer={() =>
                handleStartForPlayer(currentPlayerIndex + 1)
              }
            />
          )}
        </div>
      </div>

      {/* Overlay d'info règles */}
      {showInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowInfo(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 18,
              padding: 16,
              background:
                "linear-gradient(180deg,#1b1c22,#07070b)",
              border: "1px solid rgba(255,255,255,.18)",
              boxShadow: "0 0 26px rgba(0,0,0,.9)",
              fontSize: 13,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Règles — Tour de l&apos;horloge
              </div>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                style={{
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  border: "1px solid rgba(255,255,255,.3)",
                  background:
                    "linear-gradient(180deg,#333640,#1b1c22)",
                  color: "#f5f5f5",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                lineHeight: 1.4,
                opacity: 0.9,
              }}
            >
              <li>
                Tu tires sur chaque numéro de <strong>1 à 20</strong>, puis{" "}
                <strong>Bull</strong>.
              </li>
              <li>
                En mode <strong>Classique</strong>, <em>n&apos;importe
                quel</em> segment compte.
              </li>
              <li>
                En mode <strong>Doubles</strong> ou{" "}
                <strong>Triples</strong>, seul le segment
                correspondant valide la cible.
              </li>
              <li>
                En mode <strong>S → D → T</strong>, tu dois toucher
                Simple, puis Double, puis Triple pour chaque numéro.
              </li>
              <li>
                La session peut être limitée en nombre de fléchettes
                ou illimitée.
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default TrainingClock;

// ============================================
// SECTION SETUP
// ============================================

type PlayerDartSetMap = Record<string, string | null>;

type ClockDartSetPickerProps = {
  profileId: string | null | undefined;
  dartSetId: string | null | undefined;
  onChange: (id: string | null) => void;
  primary: string;
  textSoft: string;
  compact?: boolean;
};

function ClockDartSetPicker({ profileId, dartSetId, onChange, primary, textSoft, compact = false }: ClockDartSetPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [refreshVersion, setRefreshVersion] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setRefreshVersion((v) => v + 1);
    window.addEventListener("dc-dartsets-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("dc-dartsets-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const pid = String(profileId || "");
  const sets = React.useMemo(() => getClockSelectableDartSets(pid), [pid, refreshVersion]);
  const selectedSet = React.useMemo(() => {
    if (!dartSetId) return null;
    return getDartSetById(String(dartSetId)) || sets.find((set: any) => String(set?.id || "") === String(dartSetId)) || null;
  }, [dartSetId, sets, refreshVersion]);

  if (!pid) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          position: compact ? "absolute" : "relative",
          left: compact ? 8 : undefined,
          bottom: compact ? 6 : undefined,
          zIndex: compact ? 6 : undefined,
          minHeight: compact ? undefined : 40,
          width: compact ? 30 : undefined,
          height: compact ? 30 : undefined,
          minWidth: compact ? 30 : undefined,
          borderRadius: 999,
          border: `1px solid ${selectedSet ? primary : "rgba(255,255,255,.12)"}`,
          background: selectedSet ? `radial-gradient(circle at 0% 0%, ${hexToRgba(primary, 0.26)}, rgba(12,15,26,.96))` : "rgba(10,11,22,.92)",
          padding: compact ? 0 : (selectedSet ? "5px 8px 5px 6px" : "0 12px"),
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: compact ? 0 : 8,
          color: "#fff",
          fontWeight: 900,
          fontSize: 11,
          cursor: "pointer",
          boxShadow: selectedSet ? `0 0 12px ${hexToRgba(primary, 0.34)}` : "0 0 10px rgba(0,0,0,.55)",
          maxWidth: compact ? 30 : 156,
          overflow: "hidden",
        }}
      >
        {selectedSet ? (
          <span style={{ width: compact ? 24 : 28, height: compact ? 24 : 28, borderRadius: 999, overflow: "hidden", background: "rgba(0,0,0,.4)", border: `1px solid ${primary}`, display: "grid", placeItems: "center", flex: "0 0 auto", boxShadow: `0 0 10px ${hexToRgba(primary, 0.5)}` }}>
            {getClockDartSetThumb(selectedSet) ? (
              <img src={getClockDartSetThumb(selectedSet) as string} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 14 }}>🎯</span>
            )}
          </span>
        ) : compact ? (
          <span style={{ fontSize: 14, color: primary }}>🎯</span>
        ) : (
          <span style={{ fontSize: 14 }}>🎯</span>
        )}
        {compact ? null : <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedSet ? selectedSet.name || "SET" : "Choisir set"}</span>}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.72)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(94vw, 460px)", maxHeight: "82vh", overflow: "hidden", borderRadius: 24, border: `1px solid ${hexToRgba(primary, 0.66)}`, background: "linear-gradient(180deg, rgba(12,17,30,.98), rgba(5,8,16,.99))", boxShadow: `0 0 36px ${hexToRgba(primary, 0.22)}, 0 24px 80px rgba(0,0,0,.75)`, color: "#fff" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 14px 10px" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 1000, color: primary, letterSpacing: .8, textTransform: "uppercase" }}>Choisir un set</div>
                <div style={{ fontSize: 11, color: textSoft, marginTop: 2 }}>{sets.length} set(s) disponible(s)</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>×</button>
            </div>
            <div className="dc-scroll-thin" style={{ padding: 14, paddingTop: 4, maxHeight: "calc(82vh - 64px)", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                <button type="button" onClick={() => { onChange(null); setOpen(false); }} style={{ borderRadius: 16, border: !selectedSet ? `2px solid ${primary}` : "1px solid rgba(255,255,255,.10)", background: !selectedSet ? `radial-gradient(circle at 0% 0%, ${hexToRgba(primary, 0.26)}, rgba(12,15,26,.98))` : "rgba(255,255,255,.04)", color: "#fff", minHeight: 108, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
                  <span style={{ fontSize: 24 }}>⛔</span>
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Aucun set</span>
                </button>
                {sets.map((set: any) => {
                  const thumb = getClockDartSetThumb(set);
                  const selected = String(set?.id || "") === String(dartSetId || "");
                  return (
                    <button key={String(set.id)} type="button" onClick={() => { onChange(String(set.id)); setOpen(false); }} style={{ borderRadius: 16, border: selected ? `2px solid ${primary}` : "1px solid rgba(255,255,255,.10)", background: selected ? `radial-gradient(circle at 0% 0%, ${hexToRgba(primary, 0.24)}, rgba(12,15,26,.98))` : "rgba(255,255,255,.04)", color: "#fff", minHeight: 108, padding: 8, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: selected ? `0 0 16px ${hexToRgba(primary, 0.32)}` : "none" }}>
                      <span style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 14, overflow: "hidden", background: set?.bgColor || "rgba(255,255,255,.06)", display: "grid", placeItems: "center", position: "relative" }}>
                        {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>🎯</span>}
                        {isClockSetFavoriteForProfile(set, pid) ? <span style={{ position: "absolute", left: 6, top: 5, color: "#f5c35b", fontSize: 17, textShadow: "0 0 8px rgba(245,195,91,.9)" }}>★</span> : null}
                      </span>
                      <span style={{ width: "100%", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{set?.name || "SET"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

type SetupSectionProps = {
  profiles: Profile[];
  participantMode: ParticipantMode;
  setParticipantMode: React.Dispatch<React.SetStateAction<ParticipantMode>>;
  selectedPlayerIds: string[];
  setSelectedPlayerIds: React.Dispatch<React.SetStateAction<string[]>>;
  teamsCatalog: TeamEntity[];
  selectedTeamIds: string[];
  setSelectedTeamIds: React.Dispatch<React.SetStateAction<string[]>>;
  config: ClockConfig;
  setConfig: React.Dispatch<React.SetStateAction<ClockConfig>>;
  playerDartSets: PlayerDartSetMap;
  setPlayerDartSets: React.Dispatch<React.SetStateAction<PlayerDartSetMap>>;
  players: PlayerLite[];
  history: ClockSession[];
  onStart: () => void;
};

function SetupSection(props: SetupSectionProps) {
  const {
    profiles,
    participantMode,
    setParticipantMode,
    selectedPlayerIds,
    setSelectedPlayerIds,
    teamsCatalog,
    selectedTeamIds,
    setSelectedTeamIds,
    config,
    setConfig,
    playerDartSets,
    setPlayerDartSets,
    players,
    history,
    onStart,
  } = props;

  const { theme } = useTheme() as any;
  const primary = (theme?.primary || "#F6C256") as string;
  const accent = (theme?.accent1 || primary) as string;
  const accent2 = (theme?.accent2 || primary) as string;
  const text = (theme?.text || "#fff") as string;
  const textSoft = (theme?.textSoft || "rgba(255,255,255,0.7)") as string;
  const panel = (theme?.card || "#121420") as string;
  const bg = (theme?.bg || "#050712") as string;
  const borderSoft = (theme?.borderSoft || "rgba(255,255,255,0.08)") as string;
  const success = (theme?.success || "#4CD964") as string;

  const cardBg = `linear-gradient(180deg, ${hexToRgba(panel, 0.95)}, ${hexToRgba(bg, 0.98)})`;
  const softPanel = hexToRgba(primary, 0.1);
  const [configViewMode, setConfigViewMode] = React.useState<"guided" | "complete">(() => {
    try {
      return String(window.localStorage.getItem("dc_training_clock_config_view_mode") || "guided") === "complete" ? "complete" : "guided";
    } catch {
      return "guided";
    }
  });
  const [guidedStep, setGuidedStep] = React.useState(0);

  React.useEffect(() => {
    try {
      window.localStorage.setItem("dc_training_clock_config_view_mode", configViewMode);
    } catch {}
  }, [configViewMode]);

  const togglePlayer = React.useCallback((id: any) => {
    const pid = String(id || "");
    if (!pid) return;
    setSelectedPlayerIds((prev) => {
      const exists = prev.includes(pid);
      if (exists) return prev.filter((x) => x !== pid);
      if (prev.length >= 4) return prev;
      return [...prev, pid];
    });
  }, [setSelectedPlayerIds]);

  const toggleTeam = React.useCallback((id: any) => {
    const tid = String(id || "");
    if (!tid) return;
    setSelectedTeamIds((prev) => {
      const exists = prev.includes(tid);
      if (exists) return prev.filter((x) => x !== tid);
      if (prev.length >= 4) return prev;
      return [...prev, tid];
    });
  }, [setSelectedTeamIds]);

  const selectedProfiles = React.useMemo(() => (selectedPlayerIds || []).map((id) => profiles.find((p) => String(p.id) === String(id))).filter(Boolean) as Profile[], [selectedPlayerIds, profiles]);
  const selectedTeams = React.useMemo(() => (selectedTeamIds || []).map((id) => teamsCatalog.find((team) => String(team.id) === String(id))).filter(Boolean) as TeamEntity[], [selectedTeamIds, teamsCatalog]);

  const modeMeta: Record<ClockMode, { title: string; icon: string; tone: string; ticker: string; rule: React.ReactNode }> = {
    classic: {
      title: "Classique",
      icon: "◎",
      tone: primary,
      ticker: tickerClockClassic,
      rule: (
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ color: primary }}>Classique</strong>
          <span>Le joueur doit toucher successivement les cibles de 1 à 20, puis le Bull.</span>
          <span>Un simple, un double ou un triple valide le numéro visé.</span>
        </div>
      ),
    },
    doubles: {
      title: "Doubles",
      icon: "×2",
      tone: success,
      ticker: tickerClockDoubles,
      rule: (
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ color: success }}>Doubles</strong>
          <span>Le joueur doit toucher D1, puis D2, jusqu’à D20, avant de terminer par le Double Bull.</span>
          <span>Seule la couronne double valide la cible.</span>
        </div>
      ),
    },
    triples: {
      title: "Triples",
      icon: "×3",
      tone: "#c77dff",
      ticker: tickerClockTriples,
      rule: (
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ color: "#c77dff" }}>Triples</strong>
          <span>Le joueur doit toucher T1, puis T2, jusqu’à T20.</span>
          <span>Seule la couronne triple valide la cible.</span>
        </div>
      ),
    },
    sdt: {
      title: "S-D-T",
      icon: "3×",
      tone: accent2,
      ticker: tickerClockSDT,
      rule: (
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ color: accent2 }}>S-D-T</strong>
          <span>Pour chaque numéro, le joueur doit réussir successivement un Simple, un Double puis un Triple.</span>
          <span>Une fois les trois étapes validées, il passe au numéro suivant.</span>
        </div>
      ),
    },
  };

  const guidedSteps = ["Type", participantMode === "teams" ? "Équipes" : "Joueurs", "Variante", "Options", "Résumé"];
  const guidedMaxStep = guidedSteps.length - 1;

  React.useEffect(() => {
    setGuidedStep((prev) => Math.max(0, Math.min(prev, guidedMaxStep)));
  }, [guidedMaxStep]);

  const canStart = players.length > 0;
  const canProceedSelection = participantMode === "teams" ? selectedTeams.length > 0 && players.length > 0 : selectedProfiles.length > 0;

  const selectedNames = participantMode === "teams"
    ? (selectedTeams.map((team) => team.name || "Équipe").join(", ") || "Aucune équipe")
    : (selectedProfiles.map((p) => p.nickname || p.name || "Joueur").join(", ") || "Aucun joueur");

  function setDartSetForProfile(profileId: string | null | undefined, dartSetId: string | null) {
    const pid = String(profileId || "");
    if (!pid) return;
    setPlayerDartSets((prev) => ({ ...prev, [pid]: dartSetId }));
  }

  function PillButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button type="button" onClick={onClick} style={{ minHeight: 38, padding: "0 16px", borderRadius: 999, border: `1px solid ${active ? primary : borderSoft}`, background: active ? hexToRgba(primary, 0.14) : "rgba(255,255,255,0.035)", color: active ? primary : text, fontSize: 12, fontWeight: 950, letterSpacing: 0.4, cursor: "pointer", boxShadow: active ? `0 0 14px ${hexToRgba(primary, 0.22)}` : "none" }}>{label}</button>
    );
  }

  function CompactIntro() {
    return (
      <section style={{ background: cardBg, borderRadius: 20, padding: 14, border: `1px solid ${hexToRgba(primary, 0.3)}`, boxShadow: "0 16px 40px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: text, textTransform: "uppercase", letterSpacing: 0.8 }}>Configuration</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="Guidée" active={configViewMode === "guided"} onClick={() => setConfigViewMode("guided")} />
            <PillButton label="Complète" active={configViewMode === "complete"} onClick={() => setConfigViewMode("complete")} />
          </div>
        </div>

        {configViewMode === "guided" ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: text, fontWeight: 950 }}>Étape {guidedStep + 1}/{guidedSteps.length} • {guidedSteps[guidedStep]}</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${guidedSteps.length}, minmax(0, 1fr))`, gap: 8, marginTop: 8 }}>
              {guidedSteps.map((label, idx) => (
                <div key={label} style={{ borderRadius: 14, padding: "8px 5px", textAlign: "center", fontSize: 10, fontWeight: 900, color: idx === guidedStep ? primary : idx < guidedStep ? text : textSoft, border: `1px solid ${idx === guidedStep ? hexToRgba(primary, 0.46) : borderSoft}`, background: idx === guidedStep ? hexToRgba(primary, 0.12) : idx < guidedStep ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)" }}>
                  {idx + 1} • {label}
                </div>
              ))}
            </div>
            <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,0.06)", marginTop: 10, overflow: "hidden" }}>
              <div style={{ width: `${((guidedStep + 1) / guidedSteps.length) * 100}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${primary}, ${accent})` }} />
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  function PlayerSummaryMedallion({ player, summary = false }: { player: PlayerLite; summary?: boolean }) {
    const profile = profiles.find((p) => String(p.id) === String(player.id));
    const selectedSetId = player.id ? (playerDartSets[String(player.id)] ?? null) : null;
    const selectedSet = selectedSetId ? getDartSetById(String(selectedSetId)) : null;
    return (
      <div
        key={`${summary ? "summary" : "card"}-${player.teamId || "solo"}-${String(player.id || player.name)}`}
        style={{
          borderRadius: 20,
          padding: summary ? "12px 10px 10px" : "10px 8px 8px",
          background: `linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025))`,
          border: `1px solid ${hexToRgba(primary, summary ? 0.3 : 0.18)}`,
          boxShadow: summary ? `0 0 18px ${hexToRgba(primary, 0.14)}` : "inset 0 0 16px rgba(255,255,255,.03)",
          display: "grid",
          justifyItems: "center",
          gap: 6,
          minWidth: 0,
        }}
      >
        <div style={{ position: "relative", width: summary ? 104 : 96, height: summary ? 104 : 96, display: "grid", placeItems: "center", overflow: "visible" }}>
          <div style={{ filter: `drop-shadow(0 0 12px ${hexToRgba(primary, 0.28)})` }}>
            <ProfileAvatar profile={profile || ({ id: player.id, name: player.name } as any)} size={summary ? 82 : 76} showStars={true} />
          </div>
          <ClockDartSetPicker compact profileId={player.id} dartSetId={selectedSetId} onChange={(id) => setDartSetForProfile(player.id, id)} primary={primary} textSoft={textSoft} />
          <ClockCountryFlagBadge profile={profile} accent={primary} size={summary ? 30 : 28} style={{ right: summary ? 7 : 8, bottom: summary ? 8 : 8 }} />
        </div>
        <div style={{ color: text, fontSize: summary ? 13 : 12, fontWeight: 950, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</div>
        <div style={{ color: textSoft, fontSize: 10.5, fontWeight: 800, textAlign: "center", minHeight: 14 }}>{selectedSet?.name || "Aucun set"}</div>
        {player.teamName ? <div style={{ color: primary, fontSize: 10, fontWeight: 900, textAlign: "center" }}>{player.teamName}</div> : null}
      </div>
    );
  }

  function ParticipantSetRows() {
    if (!players.length) return null;
    return (
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <div style={{ fontSize: 11, color: primary, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8 }}>Sets de fléchettes</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          {players.map((player) => <PlayerSummaryMedallion key={`row-${player.teamId || "solo"}-${String(player.id || player.name)}`} player={player} />)}
        </div>
      </div>
    );
  }

  function TypeBlock() {
    return (
      <section style={{ background: cardBg, borderRadius: 18, padding: 14, border: `1px solid ${borderSoft}`, boxShadow: "0 16px 40px rgba(0,0,0,0.55)" }}>
        <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: .9, fontWeight: 950, color: primary, margin: "0 0 10px" }}>1. Type de partie</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <button type="button" onClick={() => setParticipantMode("players")} style={{ borderRadius: 18, border: `1px solid ${participantMode === "players" ? hexToRgba(primary, 0.42) : borderSoft}`, background: participantMode === "players" ? hexToRgba(primary, 0.14) : "rgba(255,255,255,0.03)", color: text, padding: 14, textAlign: "left", cursor: "pointer" }}>
            <div style={{ color: primary, fontWeight: 1000, fontSize: 16 }}>Joueurs</div>
            <div style={{ color: textSoft, fontSize: 11, marginTop: 4 }}>1 à 4 profils.</div>
          </button>
          <button type="button" onClick={() => setParticipantMode("teams")} style={{ borderRadius: 18, border: `1px solid ${participantMode === "teams" ? hexToRgba(primary, 0.42) : borderSoft}`, background: participantMode === "teams" ? hexToRgba(primary, 0.14) : "rgba(255,255,255,0.03)", color: text, padding: 14, textAlign: "left", cursor: "pointer" }}>
            <div style={{ color: primary, fontWeight: 1000, fontSize: 16 }}>Équipes</div>
            <div style={{ color: textSoft, fontSize: 11, marginTop: 4 }}>Teams Darts enregistrées.</div>
          </button>
        </div>
      </section>
    );
  }

  function ParticipantsBlock() {
    return (
      <section style={{ background: cardBg, borderRadius: 18, padding: 14, border: `1px solid ${borderSoft}`, boxShadow: "0 16px 40px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: .9, fontWeight: 950, color: primary }}>{configViewMode === "complete" ? "Participants" : "2. Participants"}</div>
            <div style={{ fontSize: 11, color: textSoft, marginTop: 3 }}>{participantMode === "teams" ? "Même sélecteur Teams que dans X01." : "Même sélecteur Joueurs que dans X01."}</div>
          </div>
          {configViewMode === "complete" ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PillButton label="Joueurs" active={participantMode === "players"} onClick={() => setParticipantMode("players")} />
              <PillButton label="Équipes" active={participantMode === "teams"} onClick={() => setParticipantMode("teams")} />
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 6 }}>
          {participantMode === "players" ? (
            <PlayerPagedSelector
              usageMode="x01"
              profiles={profiles}
              selectedIds={selectedPlayerIds}
              onToggle={togglePlayer}
              accent={primary}
              pageSize={9}
              modalTitle="Choisir des joueurs"
              showSelectedSummary={true}
              renderAvatarOverlay={(p: any) => (
                <ClockDartSetPicker
                  compact
                  profileId={p.id}
                  dartSetId={(playerDartSets || {})[String(p.id)] ?? null}
                  onChange={(id) => setDartSetForProfile(p.id, id)}
                  primary={primary}
                  textSoft={textSoft}
                />
              )}
            />
          ) : teamsCatalog.length > 0 ? (
            <>
              <div style={{ borderRadius: 14, border: `1px solid ${borderSoft}`, background: "rgba(255,255,255,0.03)", padding: "10px 12px", fontSize: 11, color: text, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 10 }}>
                {selectedNames}
              </div>
              <TeamPagedSelector teams={teamsCatalog} selectedIds={selectedTeamIds} onToggle={toggleTeam} accent={primary} pageSize={9} modalTitle="Choisir des équipes" chooseLabel="Choisir équipes" listLabel="Liste équipes" />
              <ParticipantSetRows />
            </>
          ) : (
            <div style={{ fontSize: 12, color: textSoft }}>Aucune team Darts avec joueurs trouvée.</div>
          )}
        </div>
      </section>
    );
  }

  function VariantsBlock() {
    return (
      <section style={{ background: cardBg, borderRadius: 18, padding: 14, border: `1px solid ${borderSoft}`, boxShadow: "0 16px 40px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          {configViewMode === "guided" ? <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: primary, color: bg, fontSize: 11, fontWeight: 1000 }}>3</span> : null}
          <div>
            <div style={{ fontSize: 14, fontWeight: 950, color: text }}>Variante de jeu</div>
            <div style={{ fontSize: 11, color: textSoft }}>Tickers arcade dédiés pour chaque variante.</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
          {(["classic", "doubles", "triples", "sdt"] as ClockMode[]).map((mode) => {
            const meta = modeMeta[mode];
            const active = config.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setConfig((c) => ({ ...c, mode }))}
                style={{
                  borderRadius: 22,
                  border: `1px solid ${active ? hexToRgba(meta.tone, 0.65) : borderSoft}`,
                  background: active ? `radial-gradient(circle at 15% 0%, ${hexToRgba(meta.tone, 0.12)}, rgba(13,17,28,.98))` : "linear-gradient(180deg, rgba(17,22,36,.96), rgba(8,10,18,.98))",
                  color: text,
                  padding: 10,
                  minHeight: 250,
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: active ? `0 0 22px ${hexToRgba(meta.tone, 0.24)}` : "inset 0 0 18px rgba(255,255,255,.02)",
                  display: "grid",
                  gridTemplateRows: "auto auto",
                  gap: 10,
                }}
              >
                <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: `1px solid ${active ? hexToRgba(meta.tone, 0.6) : "rgba(255,255,255,.12)"}`, background: "rgba(255,255,255,.03)", boxShadow: active ? `0 0 18px ${hexToRgba(meta.tone, 0.16)}` : "none" }}>
                  <img src={meta.ticker} alt={meta.title} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
                  <span style={{ position: "absolute", top: 10, right: 10, width: 24, height: 24, borderRadius: 999, border: `1px solid ${active ? meta.tone : "rgba(255,255,255,.28)"}`, display: "grid", placeItems: "center", color: active ? meta.tone : "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 1000, background: "rgba(5,8,16,.75)", boxShadow: active ? `0 0 10px ${hexToRgba(meta.tone, 0.35)}` : "none" }}>{active ? "✓" : ""}</span>
                </div>
                <div style={{ minHeight: 34, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 2px 2px" }}>
                  <div style={{ minWidth: 0, fontSize: 18, fontWeight: 1000, color: active ? meta.tone : text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.title}</div>
                  <InfoDot
                    size={28}
                    color={meta.tone}
                    glow={hexToRgba(meta.tone, 0.7)}
                    title={`Règle ${meta.title}`}
                    content={meta.rule}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  function OptionsBlock() {
    return (
      <section style={{ background: cardBg, borderRadius: 18, padding: 14, border: `1px solid ${borderSoft}`, boxShadow: "0 16px 40px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          {configViewMode === "guided" ? <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: primary, color: bg, fontSize: 11, fontWeight: 1000 }}>4</span> : null}
          <div>
            <div style={{ fontSize: 14, fontWeight: 950, color: text }}>Options de session</div>
            <div style={{ fontSize: 11, color: textSoft }}>Timer et limite de fléchettes.</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 950, color: text }}>Afficher le timer</div>
              <div style={{ fontSize: 11, color: textSoft }}>Chrono visible pendant la session.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PillButton label="Oui" active={config.showTimer} onClick={() => setConfig((c) => ({ ...c, showTimer: true }))} />
              <PillButton label="Non" active={!config.showTimer} onClick={() => setConfig((c) => ({ ...c, showTimer: false }))} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 950, color: text }}>Limite de fléchettes</div>
            <div style={{ fontSize: 11, color: textSoft, marginTop: 3 }}>0 = illimité.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {[0, 30, 60, 90, 120].map((limit) => (
                <button key={limit} type="button" onClick={() => setConfig((c) => ({ ...c, dartLimit: limit > 0 ? limit : null }))} style={{ minWidth: 54, height: 42, borderRadius: 999, border: `1px solid ${((config.dartLimit ?? 0) === limit) ? hexToRgba(primary, 0.5) : borderSoft}`, background: ((config.dartLimit ?? 0) === limit) ? hexToRgba(primary, 0.14) : "rgba(255,255,255,0.04)", color: ((config.dartLimit ?? 0) === limit) ? primary : text, fontWeight: 950, cursor: "pointer" }}>{limit === 0 ? "∞" : limit}</button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function SummaryBlock() {
    return (
      <section style={{ background: cardBg, borderRadius: 18, padding: 14, border: `1px solid ${hexToRgba(primary, 0.28)}`, boxShadow: "0 16px 40px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          {configViewMode === "guided" ? <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: primary, color: bg, fontSize: 11, fontWeight: 1000 }}>5</span> : null}
          <div>
            <div style={{ fontSize: 14, fontWeight: 950, color: text }}>Résumé de configuration</div>
            <div style={{ fontSize: 11, color: textSoft }}>La partie ne peut être lancée qu’à cette étape.</div>
          </div>
        </div>

        <div style={{ borderRadius: 16, padding: 12, background: `linear-gradient(180deg, ${hexToRgba(primary, 0.12)}, rgba(20,14,6,.22))`, border: `1px solid ${hexToRgba(primary, 0.28)}`, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <div><div style={{ fontSize: 9, opacity: .6, textTransform: "uppercase", letterSpacing: .7 }}>Participants</div><div style={{ marginTop: 4, fontSize: 11, fontWeight: 900, color: text }}>{participantMode === "teams" ? `${selectedTeams.length} équipe(s)` : `${selectedProfiles.length} joueur(s)`}</div></div>
          <div><div style={{ fontSize: 9, opacity: .6, textTransform: "uppercase", letterSpacing: .7 }}>Variante</div><div style={{ marginTop: 4, fontSize: 11, fontWeight: 900, color: modeMeta[config.mode].tone }}>{modeMeta[config.mode].title}</div></div>
          <div><div style={{ fontSize: 9, opacity: .6, textTransform: "uppercase", letterSpacing: .7 }}>Limite</div><div style={{ marginTop: 4, fontSize: 11, fontWeight: 900, color: text }}>{config.dartLimit ? `${config.dartLimit} darts` : "Illimitée"}</div></div>
        </div>

        {players.length > 0 ? (
          <div style={{ borderRadius: 16, border: `1px solid ${hexToRgba(primary, 0.18)}`, background: "rgba(255,255,255,0.035)", padding: 12, marginTop: 12 }}>
            <div style={{ color: primary, fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Participants prêts</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 10 }}>
              {players.map((player) => <PlayerSummaryMedallion key={`summary-${player.teamId || "solo"}-${String(player.id || player.name)}`} player={player} summary />)}
            </div>
          </div>
        ) : null}

        <button type="button" onClick={onStart} disabled={!canStart} style={{ width: "100%", marginTop: 14, padding: "14px 0", borderRadius: 18, fontSize: 15, fontWeight: 1000, letterSpacing: .6, background: canStart ? `linear-gradient(180deg, ${primary}, ${accent})` : "linear-gradient(180deg,#555,#333)", color: canStart ? "#111" : "#888", border: "1px solid rgba(0,0,0,.85)", boxShadow: canStart ? `0 0 18px ${hexToRgba(primary, 0.5)}` : "none", cursor: canStart ? "pointer" : "default" }}>▶ DÉMARRER LA SESSION</button>
      </section>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <CompactIntro />
      {configViewMode === "guided" && guidedStep === 0 ? <TypeBlock /> : null}
      {(configViewMode === "guided" && guidedStep === 1) || configViewMode === "complete" ? <ParticipantsBlock /> : null}
      {(configViewMode === "guided" && guidedStep === 2) || configViewMode === "complete" ? <VariantsBlock /> : null}
      {(configViewMode === "guided" && guidedStep === 3) || configViewMode === "complete" ? <OptionsBlock /> : null}
      {(configViewMode === "guided" && guidedStep === 4) || configViewMode === "complete" ? <SummaryBlock /> : null}

      {configViewMode === "guided" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setGuidedStep((step) => Math.max(0, step - 1))} disabled={guidedStep <= 0} style={{ flex: "1 1 0", height: 44, borderRadius: 999, border: `1px solid ${borderSoft}`, background: guidedStep <= 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)", color: guidedStep <= 0 ? "#565b76" : text, fontWeight: 950, cursor: guidedStep <= 0 ? "default" : "pointer" }}>← Précédent</button>
          {guidedStep < guidedMaxStep ? (
            <button type="button" onClick={() => setGuidedStep((step) => Math.min(guidedMaxStep, step + 1))} disabled={(guidedStep === 1 && !canProceedSelection)} style={{ flex: "1 1 0", height: 44, borderRadius: 999, border: `1px solid ${hexToRgba(primary, 0.5)}`, background: (guidedStep === 1 && !canProceedSelection) ? "rgba(255,255,255,0.03)" : hexToRgba(primary, 0.12), color: (guidedStep === 1 && !canProceedSelection) ? "#565b76" : primary, fontWeight: 950, cursor: (guidedStep === 1 && !canProceedSelection) ? "default" : "pointer" }}>Suivant →</button>
          ) : (
            <button type="button" onClick={onStart} disabled={!canStart} style={{ flex: "1 1 0", height: 44, borderRadius: 999, border: `1px solid ${hexToRgba(primary, 0.5)}`, background: canStart ? hexToRgba(primary, 0.12) : "rgba(255,255,255,0.03)", color: canStart ? primary : "#565b76", fontWeight: 950, cursor: canStart ? "pointer" : "default" }}>Démarrer</button>
          )}
        </div>
      ) : null}

      {history.length > 0 ? (
        <section style={{ marginTop: 2 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Dernières sessions</h2>
          <HistoryList history={history.slice(0, 5)} />
        </section>
      ) : null}
    </div>
  );
}

// ============================================
// SECTION PLAY
// ============================================
// SECTION PLAY
// ============================================
// SECTION PLAY
// ============================================


type PlaySectionProps = {
  isMulti: boolean;
  currentPlayerIndex: number;
  players: PlayerLite[];
  currentPlayer: PlayerLite | null;
  currentProfile?: Profile;
  config: ClockConfig;
  currentTarget: Target;
  stageSDT: StageSDT;
  dartsThrown: number;
  hits: number;
  targetsCompleted: number;
  bestStreak: number;
  currentStreak: number;
  elapsedNow: number;
  objectiveKind: ObjectiveKind;
  objectiveLabel: string;
  precision: number;
  currentDartSetName?: string | null;
  labelTarget: (t: Target, m: ClockMode, s: StageSDT) => string;
  selectedValue: Target | null;
  setSelectedValue: (v: Target | null) => void;
  selectedMult: 1 | 2 | 3;
  setSelectedMult: (m: 1 | 2 | 3) => void;
  isMiss: boolean;
  setIsMiss: (v: boolean) => void;
  lastThrows: string[];
  throwLog: string[];
  lastObjectiveLabel: string | null;
  lastObjectiveTimeMs: number | null;
  onAbort: () => void;
  onThrow: () => void;
};

function PlaySection(props: PlaySectionProps) {
  const {
    isMulti,
    currentPlayerIndex,
    players,
    currentPlayer,
    currentProfile,
    config,
    currentTarget,
    stageSDT,
    dartsThrown,
    hits,
    targetsCompleted,
    bestStreak,
    currentStreak,
    elapsedNow,
    objectiveKind,
    objectiveLabel,
    precision,
    currentDartSetName,
    labelTarget,
    selectedValue,
    setSelectedValue,
    selectedMult,
    setSelectedMult,
    isMiss,
    setIsMiss,
    lastThrows,
    throwLog,
    lastObjectiveLabel,
    lastObjectiveTimeMs,
    onAbort: _onAbort,
    onThrow,
  } = props;

  const { theme } = useTheme() as any;
  const themePrimary = (theme?.primary || "#ffc63a") as string;
  const themeAccent = (theme?.accent1 || themePrimary) as string;
  const themeAccent2 = (theme?.accent2 || "#b16adf") as string;
  const themeCard = (theme?.card || "#121420") as string;
  const themeText = (theme?.text || "#ffffff") as string;
  const themeTextSoft = (theme?.textSoft || "rgba(255,255,255,.68)") as string;
  const themeSuccess = (theme?.success || "#29c76f") as string;
  const themeDanger = "#ff5f73";
  const themeBlue = "#48b3ff";
  const themeOrange = "#ff9957";
  const themeTeal = "#2fe0ff";

  const objectiveColor = objectiveKind === "double" ? themeSuccess : objectiveKind === "triple" ? themeAccent2 : themePrimary;
  const objectiveGlow = objectiveKind === "double" ? hexToRgba(themeSuccess, 0.48) : objectiveKind === "triple" ? hexToRgba(themeAccent2, 0.48) : hexToRgba(themePrimary, 0.48);

  const [padMultiplier, setPadMultiplier] = React.useState<1 | 2 | 3>(1);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [statsTab, setStatsTab] = React.useState<"resume" | "performance" | "progression" | "graphs">("resume");

  const hasPending = isMiss || selectedValue != null;
  const pendingThrow = React.useMemo(() => {
    if (!hasPending) return [];
    if (isMiss) return [{ v: 0, mult: 1 as const }];
    if (selectedValue === "BULL") return [{ v: 25, mult: selectedMult === 2 ? (2 as const) : (1 as const) }];
    return [{ v: Number(selectedValue || 0), mult: selectedMult }];
  }, [hasPending, isMiss, selectedValue, selectedMult]);

  const clearPending = React.useCallback(() => {
    setSelectedValue(null);
    setIsMiss(false);
    setSelectedMult(1);
    setPadMultiplier(1);
  }, [setIsMiss, setSelectedMult, setSelectedValue]);

  const chooseNumber = React.useCallback((n: number) => {
    if (n === 0) {
      setIsMiss(true);
      setSelectedValue(null);
      setSelectedMult(1);
      return;
    }
    setIsMiss(false);
    setSelectedValue(n as Target);
    setSelectedMult(padMultiplier);
    setPadMultiplier(1);
  }, [padMultiplier, setIsMiss, setSelectedMult, setSelectedValue]);

  const chooseBull = React.useCallback(() => {
    setIsMiss(false);
    setSelectedValue("BULL");
    setSelectedMult(padMultiplier === 2 ? 2 : 1);
    setPadMultiplier(1);
  }, [padMultiplier, setIsMiss, setSelectedMult, setSelectedValue]);

  const validatePending = React.useCallback(() => {
    if (!hasPending) return;
    onThrow();
    clearPending();
  }, [clearPending, hasPending, onThrow]);

  const targetFullLabel = labelTarget(currentTarget, config.mode, stageSDT);
  const progressPct = Math.max(0, Math.min(100, (targetsCompleted / TARGETS.length) * 100));
  const lastObjectiveDisplay = lastObjectiveLabel != null && lastObjectiveTimeMs != null ? `${lastObjectiveLabel} · ${formatTime(lastObjectiveTimeMs)}` : "—";
  const dartsLimitLabel = config.dartLimit != null ? `${dartsThrown}/${config.dartLimit}` : String(dartsThrown);
  const activeProfile = currentProfile || ({ id: String(currentPlayer?.id || "clock-player"), name: currentPlayer?.name || "Joueur" } as Profile);


  const parsedThrows = React.useMemo(() => {
    return (throwLog || []).map((raw) => {
      const label = String(raw || "").trim();
      if (!label || /^miss$/i.test(label)) return { raw: label || "Miss", hit: false, kind: "miss", score: 0, segment: 0, mult: 0 };
      if (label === "Bull") return { raw: label, hit: true, kind: "bull", score: 25, segment: 25, mult: 1 };
      if (label === "DBull") return { raw: label, hit: true, kind: "dbull", score: 50, segment: 25, mult: 2 };
      const m = label.match(/^([SDT])(\d{1,2}|Bull)$/i);
      if (!m) return { raw: label, hit: false, kind: "miss", score: 0, segment: 0, mult: 0 };
      const prefix = m[1].toUpperCase();
      const segment = m[2].toLowerCase() === "bull" ? 25 : Number(m[2]);
      const mult = prefix === "D" ? 2 : prefix === "T" ? 3 : 1;
      const kind = prefix === "D" ? "double" : prefix === "T" ? "triple" : "simple";
      return { raw: label, hit: true, kind, score: segment === 25 ? (mult === 2 ? 50 : 25) : segment * mult, segment, mult };
    });
  }, [throwLog]);

  const stats = React.useMemo(() => {
    const total = parsedThrows.length;
    const misses = parsedThrows.filter((t) => !t.hit).length;
    const singles = parsedThrows.filter((t) => t.kind === "simple").length;
    const doubles = parsedThrows.filter((t) => t.kind === "double").length;
    const triples = parsedThrows.filter((t) => t.kind === "triple").length;
    const bulls = parsedThrows.filter((t) => t.kind === "bull").length;
    const dbulls = parsedThrows.filter((t) => t.kind === "dbull").length;
    const boardHits = total - misses;
    const points = parsedThrows.reduce((sum, t) => sum + t.score, 0);
    const avgPerDart = total ? Math.round((points / total) * 10) / 10 : 0;
    const avgPerHit = hits ? Math.round((points / Math.max(1, hits)) * 10) / 10 : 0;
    const completedPct = Math.round((targetsCompleted / TARGETS.length) * 1000) / 10;
    const boardHitPct = total ? Math.round((boardHits / total) * 1000) / 10 : 0;
    const rounds: { round: number; hits: number; points: number; darts: number }[] = [];
    for (let i = 0; i < parsedThrows.length; i += 3) {
      const slice = parsedThrows.slice(i, i + 3);
      rounds.push({
        round: rounds.length + 1,
        hits: slice.filter((x) => x.hit).length,
        points: slice.reduce((s, x) => s + x.score, 0),
        darts: slice.length,
      });
    }
    const cumulative: { x: number; precision: number; score: number }[] = [];
    let cumScore = 0;
    let cumBoardHits = 0;
    parsedThrows.forEach((t, idx) => {
      cumScore += t.score;
      if (t.hit) cumBoardHits += 1;
      cumulative.push({ x: idx + 1, precision: Math.round((cumBoardHits / (idx + 1)) * 100), score: cumScore });
    });
    const freq = new Map<string, number>();
    parsedThrows.filter((t) => t.hit).forEach((t) => freq.set(t.raw, (freq.get(t.raw) || 0) + 1));
    const best = [...freq.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0];
    return {
      total,
      misses,
      singles,
      doubles,
      triples,
      bulls,
      dbulls,
      boardHits,
      points,
      avgPerDart,
      avgPerHit,
      completedPct,
      boardHitPct,
      rounds,
      cumulative,
      remaining: Math.max(0, TARGETS.length - targetsCompleted),
      bestSegment: best ? best[0] : "—",
      bestSegmentHits: best ? best[1] : 0,
      avgRoundPoints: rounds.length ? Math.round((rounds.reduce((s, r) => s + r.points, 0) / rounds.length) * 10) / 10 : 0,
    };
  }, [parsedThrows, hits, targetsCompleted]);

  const throwComposition = React.useMemo(() => [
    { label: "Simples", value: stats.singles, color: "#2cc7ff" },
    { label: "Doubles", value: stats.doubles, color: "#31e091" },
    { label: "Triples", value: stats.triples, color: "#c56cff" },
    { label: "Bulls", value: stats.bulls + stats.dbulls, color: "#ffd34e" },
    { label: "Misses", value: stats.misses, color: "#ff6a83" },
  ].filter((item) => item.value > 0), [stats]);

  const objectiveComposition = React.useMemo(() => [
    { label: "Validées", value: targetsCompleted, color: "#31e091" },
    { label: "Restantes", value: Math.max(0, TARGETS.length - targetsCompleted), color: "#2fe0ff" },
  ], [targetsCompleted]);

  const precisionLine = React.useMemo(() => {
    if (!stats.cumulative.length) return "14,102 194,102";
    return stats.cumulative.map((point, idx) => {
      const x = stats.cumulative.length === 1 ? 104 : 14 + idx * (180 / Math.max(1, stats.cumulative.length - 1));
      const y = 102 - (point.precision / 100) * 84;
      return `${x},${y}`;
    }).join(" ");
  }, [stats.cumulative]);

  const roundBars = React.useMemo(() => {
    const maxPts = Math.max(1, ...stats.rounds.map((r) => r.points), 1);
    return stats.rounds.map((r, idx) => ({ x: 18 + idx * 34, h: (r.points / maxPts) * 84, color: idx % 3 === 0 ? "#2fe0ff" : idx % 3 === 1 ? "#ffd34e" : "#c56cff" }));
  }, [stats.rounds]);

  const panelStyle: React.CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${hexToRgba(themePrimary, 0.22)}`,
    background: `linear-gradient(180deg, ${hexToRgba(themeCard, 0.98)}, rgba(5,8,16,.94))`,
    boxShadow: `0 10px 22px rgba(0,0,0,.28), 0 0 0 1px ${hexToRgba(themeAccent, 0.04)} inset`,
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  const overlayCard: React.CSSProperties = {
    borderRadius: 22,
    border: `1px solid ${hexToRgba(themePrimary, 0.16)}`,
    background: `linear-gradient(180deg, rgba(10,18,34,.94), rgba(4,8,16,.98))`,
    boxShadow: `inset 0 0 0 1px rgba(255,255,255,.02), 0 12px 28px rgba(0,0,0,.28)`,
    overflow: "hidden",
    minWidth: 0,
  };

  const iconButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: 0,
    height: 54,
    borderRadius: 18,
    border: `1px solid ${active ? hexToRgba(themeTeal, 0.62) : "rgba(255,255,255,.08)"}`,
    background: active ? `linear-gradient(180deg, ${hexToRgba(themeTeal, 0.16)}, ${hexToRgba(themeBlue, 0.08)})` : "rgba(255,255,255,.03)",
    display: "grid",
    placeItems: "center",
    boxShadow: active ? `0 0 18px ${hexToRgba(themeTeal, 0.15)}` : "none",
  });

  const miniKpi = (label: string, value: string | number, tone: string, hint?: string) => (
    <div style={{ ...overlayCard, padding: 12 }}>
      <div style={{ height: 3, margin: "-12px -12px 10px", background: `linear-gradient(90deg, ${tone}, transparent)` }} />
      <div style={{ color: themeTextSoft, fontSize: 8.5, fontWeight: 900, letterSpacing: .35, textTransform: "uppercase", lineHeight: 1.15 }}>{label}</div>
      <div style={{ color: tone, fontSize: 15, fontWeight: 1000, lineHeight: 1.05, marginTop: 8 }}>{String(value)}</div>
      {hint ? <div style={{ color: themeTextSoft, fontSize: 9.5, marginTop: 5, lineHeight: 1.15 }}>{hint}</div> : null}
    </div>
  );

  function TabGlyph({ kind, active }: { kind: "resume" | "performance" | "progression" | "graphs"; active: boolean }) {
    const stroke = active ? themeTeal : "#b3c3d1";
    const p = { fill: "none", stroke, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
    if (kind === "resume") return <svg width="22" height="22" viewBox="0 0 24 24"><path {...p} d="M4 20V7" /><path {...p} d="M10 20V4" /><path {...p} d="M16 20v-6" /><path {...p} d="M22 20V9" /></svg>;
    if (kind === "performance") return <svg width="22" height="22" viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="7" /><circle {...p} cx="12" cy="12" r="3.2" /><path {...p} d="M12 5V3" /><path {...p} d="M19 12h2" /><path {...p} d="M12 21v-2" /><path {...p} d="M3 12h2" /></svg>;
    if (kind === "progression") return <svg width="22" height="22" viewBox="0 0 24 24"><path {...p} d="M4 19h16" /><path {...p} d="M6 17 10 12l3 2 5-7" /><circle {...p} cx="6" cy="17" r="1.4" /><circle {...p} cx="10" cy="12" r="1.4" /><circle {...p} cx="13" cy="14" r="1.4" /><circle {...p} cx="18" cy="7" r="1.4" /></svg>;
    return <svg width="22" height="22" viewBox="0 0 24 24"><path {...p} d="M4 19V5" /><path {...p} d="M4 19h16" /><path {...p} d="M8 15l3-3 3 2 4-6" /><circle {...p} cx="8" cy="15" r="1.1" /><circle {...p} cx="11" cy="12" r="1.1" /><circle {...p} cx="14" cy="14" r="1.1" /><circle {...p} cx="18" cy="8" r="1.1" /></svg>;
  }

  function Pie3DChart({
    data,
    centerValue,
    centerLabel,
    size = 230,
    depth = 22,
  }: {
    data: { label: string; value: number; color: string }[];
    centerValue: string;
    centerLabel: string;
    size?: number;
    depth?: number;
  }) {
    const items = data.filter((d) => d.value > 0);
    const total = items.reduce((s, d) => s + d.value, 0);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const activeSafe = Math.min(Math.max(0, activeIndex), Math.max(0, items.length - 1));
    const activeItem = items[activeSafe] || null;
    const uid = React.useId().replace(/:/g, "");

    const shade = React.useCallback((hex: string, factor: number) => {
      const raw = String(hex || "#2fe0ff").replace("#", "");
      const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.padEnd(6, "0").slice(0, 6);
      const n = Number.parseInt(full, 16);
      const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * factor)));
      const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * factor)));
      const b = Math.max(0, Math.min(255, Math.round((n & 255) * factor)));
      return `rgb(${r},${g},${b})`;
    }, []);

    const cx = 132;
    const cy = 88;
    const rx = 101;
    const ry = 57;
    const svgH = 178;

    const pointAt = (deg: number, offX = 0, offY = 0) => {
      const rad = (deg * Math.PI) / 180;
      return { x: cx + offX + rx * Math.cos(rad), y: cy + offY + ry * Math.sin(rad) };
    };

    const slicePath = (startDeg: number, endDeg: number, offX: number, offY: number) => {
      const span = Math.max(0, endDeg - startDeg);
      const p1 = pointAt(startDeg, offX, offY);
      if (span >= 359.99) {
        const pm = pointAt(startDeg + 180, offX, offY);
        return `M ${cx + offX} ${cy + offY} L ${p1.x} ${p1.y} A ${rx} ${ry} 0 0 1 ${pm.x} ${pm.y} A ${rx} ${ry} 0 0 1 ${p1.x} ${p1.y} Z`;
      }
      const p2 = pointAt(endDeg, offX, offY);
      const large = span > 180 ? 1 : 0;
      return `M ${cx + offX} ${cy + offY} L ${p1.x} ${p1.y} A ${rx} ${ry} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
    };

    let cursor = -90;
    const slices = items.map((item, idx) => {
      const span = total ? (item.value / total) * 360 : 0;
      const startDeg = cursor;
      const endDeg = cursor + span;
      const midDeg = startDeg + span / 2;
      cursor = endDeg;
      const rad = (midDeg * Math.PI) / 180;
      const selected = idx === activeSafe;
      const explode = selected ? 17 : 4;
      const offX = Math.cos(rad) * explode;
      const offY = Math.sin(rad) * explode * 0.58;
      const labelPoint = {
        x: cx + offX + rx * 0.62 * Math.cos(rad),
        y: cy + offY + ry * 0.62 * Math.sin(rad),
      };
      return { item, idx, startDeg, endDeg, midDeg, offX, offY, selected, labelPoint, pct: total ? Math.round((item.value / total) * 100) : 0 };
    });

    if (!items.length) {
      return (
        <div style={{ display: "grid", placeItems: "center", minHeight: 190 }}>
          <div style={{ width: 170, height: 112, borderRadius: "50%", transform: "perspective(500px) rotateX(58deg)", background: `linear-gradient(135deg, ${hexToRgba(themeBlue, 0.42)}, ${hexToRgba(themeTeal, 0.18)})`, border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 18px 0 rgba(15,42,58,.62), 0 28px 26px rgba(0,0,0,.34)", display: "grid", placeItems: "center" }}>
            <span style={{ transform: "rotateX(-58deg)", color: themeTextSoft, fontSize: 12 }}>Aucune donnée</span>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 8, alignItems: "center", minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <svg viewBox={`0 0 264 ${svgH}`} width="100%" height={size * 0.72} style={{ overflow: "visible", display: "block" }} aria-label="Camembert 3D interactif">
            <defs>
              <filter id={`pieShadow-${uid}`} x="-40%" y="-50%" width="180%" height="220%">
                <feDropShadow dx="0" dy="12" stdDeviation="8" floodColor="#000" floodOpacity=".46" />
              </filter>
              {slices.map((slice) => (
                <linearGradient key={slice.idx} id={`pieGrad-${uid}-${slice.idx}`} x1="0" y1="0" x2="0.85" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity=".24" />
                  <stop offset="18%" stopColor={slice.item.color} stopOpacity="1" />
                  <stop offset="72%" stopColor={slice.item.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={shade(slice.item.color, .72)} stopOpacity="1" />
                </linearGradient>
              ))}
            </defs>

            <ellipse cx={cx} cy={cy + depth + 22} rx={rx * 0.88} ry={19} fill="rgba(0,0,0,.32)" filter={`url(#pieShadow-${uid})`} />

            {Array.from({ length: depth }).map((_, layer) => {
              const y = depth - layer;
              return (
                <g key={`depth-${layer}`} opacity={0.9}>
                  {slices.map((slice) => (
                    <path
                      key={`${slice.idx}-${layer}`}
                      d={slicePath(slice.startDeg, slice.endDeg, slice.offX, slice.offY + y)}
                      fill={shade(slice.item.color, 0.48 + (layer / Math.max(1, depth)) * 0.12)}
                      stroke={shade(slice.item.color, .40)}
                      strokeWidth=".55"
                    />
                  ))}
                </g>
              );
            })}

            {slices.map((slice) => (
              <g key={`top-${slice.idx}`} onClick={() => setActiveIndex(slice.idx)} style={{ cursor: "pointer" }}>
                <path
                  d={slicePath(slice.startDeg, slice.endDeg, slice.offX, slice.offY)}
                  fill={`url(#pieGrad-${uid}-${slice.idx})`}
                  stroke={slice.selected ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.46)"}
                  strokeWidth={slice.selected ? 2.2 : 1.15}
                  filter={slice.selected ? `url(#pieShadow-${uid})` : undefined}
                  style={{ transition: "filter .18s ease" }}
                />
                {slice.pct >= 8 ? (
                  <text x={slice.labelPoint.x} y={slice.labelPoint.y + 4} textAnchor="middle" fill="#fff" fontSize={slice.selected ? 14 : 12} fontWeight="900" style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.38)", strokeWidth: 2 }}>
                    {slice.pct}%
                  </text>
                ) : null}
              </g>
            ))}
          </svg>

          <div style={{ marginTop: -8, textAlign: "center" }}>
            <div style={{ color: activeItem?.color || themeTeal, fontSize: 15, fontWeight: 1000 }}>{activeItem?.label || centerLabel}</div>
            <div style={{ color: themeText, fontSize: 22, fontWeight: 1000, lineHeight: 1.05, marginTop: 2 }}>{activeItem ? activeItem.value : centerValue}</div>
            <div style={{ color: themeTextSoft, fontSize: 10.5, marginTop: 3 }}>{activeItem ? `${Math.round((activeItem.value / total) * 100)}% du total` : centerLabel}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, minWidth: 0 }}>
          {items.map((item, idx) => {
            const pct = total ? Math.round((item.value / total) * 100) : 0;
            const active = idx === activeSafe;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveIndex(idx)}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "12px minmax(0,1fr) auto",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 12,
                  border: `1px solid ${active ? hexToRgba(item.color, .62) : "rgba(255,255,255,.06)"}`,
                  background: active ? `linear-gradient(90deg, ${hexToRgba(item.color, .16)}, rgba(255,255,255,.025))` : "rgba(255,255,255,.025)",
                  padding: "8px 9px",
                  color: themeText,
                  textAlign: "left",
                  minWidth: 0,
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 4, background: item.color, boxShadow: `0 0 9px ${hexToRgba(item.color, .45)}` }} />
                <span style={{ fontSize: 11.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                <strong style={{ color: item.color, fontSize: 11.5 }}>{item.value} · {pct}%</strong>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "resume" as const, label: "Résumé" },
    { key: "performance" as const, label: "Performance" },
    { key: "progression" as const, label: "Progression" },
    { key: "graphs" as const, label: "Graphiques" },
  ];
  const activeTabLabel = tabs.find((tab) => tab.key === statsTab)?.label || "Résumé";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      <section style={{ ...panelStyle, padding: 0, overflow: "hidden", borderColor: `${objectiveColor}78`, boxShadow: `0 0 24px ${hexToRgba(objectiveColor, 0.18)}` }}>
        <div style={{ position: "relative", minHeight: 122, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(126px,142px)", gap: 4, alignItems: "stretch", padding: "8px 10px" }}>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${hexToRgba(themePrimary, 0.04)}, rgba(0,0,0,.18) 50%, ${hexToRgba(themeAccent2, 0.04)})` }} />
          <div style={{ position: "absolute", left: -20, top: -5, bottom: -5, width: "26%", minWidth: 88, overflow: "hidden", opacity: .14, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: -18, top: 17, transform: "scale(1.24)", transformOrigin: "left top", filter: "saturate(.86)" }}><ProfileAvatar profile={activeProfile as any} size={84} /></div>
          </div>

          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0, textAlign: "center", padding: "2px 8px 2px 4px" }}>
            <div style={{ color: objectiveColor, fontSize: 13, fontWeight: 1000, letterSpacing: .7, lineHeight: 1.05, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{currentPlayer?.name || "Joueur"}</div>
            <div style={{ marginTop: 2, color: themeTextSoft, fontSize: 8.5, fontWeight: 900, letterSpacing: .45, textTransform: "uppercase", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isMulti ? `Joueur ${currentPlayerIndex + 1}/${players.length}` : "Mode solo"}{currentPlayer?.teamName ? ` · ${currentPlayer.teamName}` : ""}</div>
            <div style={{ marginTop: 5, color: objectiveColor, fontSize: objectiveLabel.length > 5 ? 38 : 52, fontWeight: 1000, lineHeight: .96, textShadow: `0 0 18px ${objectiveGlow}` }}>{objectiveLabel}</div>
            <div style={{ marginTop: 5, color: themeTextSoft, fontSize: 8.5, fontWeight: 900, letterSpacing: .55, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{currentDartSetName ? `Set : ${currentDartSetName}` : "Tour de l'horloge"}</div>
          </div>

          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "stretch", justifyContent: "center", minWidth: 0, overflow: "hidden", borderRadius: 18, background: themeCard, isolation: "isolate", border: `1px solid ${hexToRgba(objectiveColor, 0.28)}` }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${targetBg})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.18, mixBlendMode: "screen" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(4,8,16,.24), rgba(4,8,16,.82))` }} />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "6px 4px" }}>
              <div style={{ color: themeTextSoft, fontSize: 9, fontWeight: 950, letterSpacing: .8 }}>CIBLE</div>
              <div style={{ color: objectiveColor, fontSize: currentTarget === "BULL" ? 22 : 42, lineHeight: 1, fontWeight: 1100, textShadow: `0 0 18px ${objectiveGlow}`, marginTop: 3 }}>{targetFullLabel}</div>
              <div style={{ color: themeTextSoft, fontSize: 8.5, fontWeight: 900, marginTop: 6 }}>{targetsCompleted}/{TARGETS.length} CIBLES</div>
              {config.showTimer ? <div style={{ color: themePrimary, fontSize: 10, fontWeight: 1000, marginTop: 6 }}>{formatTime(elapsedNow)}</div> : null}
            </div>
          </div>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,.055)", overflow: "hidden" }}><div style={{ height: "100%", width: `${progressPct}%`, background: `linear-gradient(90deg, ${hexToRgba(objectiveColor, 0.6)}, ${objectiveColor})`, boxShadow: `0 0 12px ${objectiveGlow}`, transition: "width .2s ease" }} /></div>
      </section>

      <section role="button" tabIndex={0} onClick={() => setStatsOpen(true)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStatsOpen(true); } }} style={{ ...panelStyle, padding: 7, cursor: "pointer" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
          {[
            ["Darts", dartsLimitLabel, themePrimary],
            ["Hits", hits, themeSuccess],
            ["Précision", `${precision}%`, objectiveColor],
            ["Série / Best", `${currentStreak}/${bestStreak}`, themeAccent2],
          ].map(([label, value, color]) => (
            <div key={String(label)} style={{ minWidth: 0, borderRadius: 11, padding: "6px 3px", textAlign: "center", border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.22)" }}>
              <div style={{ color: themeTextSoft, fontSize: 7.5, fontWeight: 1000, letterSpacing: .45, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
              <div style={{ color: String(color), fontSize: 15, lineHeight: 1.05, fontWeight: 1100, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{String(value)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 5, minHeight: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 5px", color: themeTextSoft, fontSize: 9.5 }}>
          <span style={{ whiteSpace: "nowrap" }}>Dernier objectif validé</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <strong style={{ color: themeText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{lastObjectiveDisplay}</strong>
            <span style={{ color: themePrimary, fontSize: 16, lineHeight: 1 }}>›</span>
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle, padding: "7px 9px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 30 }}>
          <div style={{ flex: "0 0 auto", color: themeTextSoft, fontSize: 9, fontWeight: 950, letterSpacing: .45 }}>DERNIERS</div>
          {lastThrows.length === 0 ? <div style={{ color: "rgba(255,255,255,.40)", fontSize: 10 }}>En attente…</div> : <div className="dc-scroll-thin" style={{ display: "flex", gap: 5, overflowX: "auto", minWidth: 0, paddingBottom: 1 }}>{lastThrows.slice(0, 10).map((t, idx) => {
            const kind = getThrowKind(t);
            const tone = kind === "double" || kind === "bull" ? themeSuccess : kind === "triple" ? themeAccent2 : kind === "simple" ? themePrimary : themeDanger;
            return <span key={`${t}-${idx}`} style={{ flex: "0 0 auto", minWidth: 30, height: 24, padding: "0 7px", borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${hexToRgba(tone, 0.40)}`, background: hexToRgba(tone, 0.14), color: tone, fontSize: 9.5, fontWeight: 1000 }}>{t}</span>;
          })}</div>}
        </div>
      </section>

      <section style={{ ...panelStyle, padding: 7 }}>
        <Keypad
          currentThrow={pendingThrow as any}
          multiplier={padMultiplier}
          onSimple={() => setPadMultiplier(1)}
          onDouble={() => setPadMultiplier(2)}
          onTriple={() => setPadMultiplier(3)}
          onBackspace={clearPending}
          onCancel={clearPending}
          onNumber={chooseNumber}
          onBull={chooseBull}
          onValidate={hasPending ? validatePending : clearPending}
          hidePreview
          validateAttention={hasPending}
          safeBottomPad
        />
      </section>

      {statsOpen ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.72)", backdropFilter: "blur(8px)", padding: "16px 10px calc(20px + var(--safe-bottom))" }} onClick={() => setStatsOpen(false)}>
          <div className="dc-scroll-thin" style={{ width: "min(100%, 620px)", maxHeight: "100%", overflowY: "auto", margin: "0 auto", borderRadius: 28, border: `1px solid ${hexToRgba(themeTeal, 0.34)}`, background: `radial-gradient(circle at top right, ${hexToRgba(themeAccent2, 0.10)}, transparent 24%), radial-gradient(circle at top left, ${hexToRgba(themeTeal, 0.10)}, transparent 30%), linear-gradient(180deg, rgba(8,14,26,.98), rgba(3,6,14,.99))`, boxShadow: `0 24px 64px rgba(0,0,0,.55), 0 0 36px ${hexToRgba(themeTeal, 0.10)}`, padding: 18, color: themeText, position: "relative", overflowX: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(115deg, transparent 0%, ${hexToRgba(themeBlue, 0.03)} 35%, transparent 65%)` }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, position: "relative" }}>
              <div>
                <div style={{ color: themeTeal, fontSize: 23, fontWeight: 1000, lineHeight: 1 }}>Statistiques détaillées</div>
                <div style={{ color: themeTextSoft, fontSize: 10.5, marginTop: 4, lineHeight: 1.2 }}> <span style={{ color: themeBlue, fontWeight: 900 }}>{activeTabLabel}</span></div>
              </div>
              <button type="button" onClick={() => setStatsOpen(false)} style={{ width: 44, height: 44, borderRadius: 999, border: `1px solid ${hexToRgba(themeTeal, 0.35)}`, background: "rgba(255,255,255,.04)", color: themeTeal, fontSize: 28, fontWeight: 900, boxShadow: `0 0 20px ${hexToRgba(themeTeal, 0.08)}` }}>×</button>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "space-between" }}>
              {tabs.map((tab) => {
                const active = statsTab === tab.key;
                return <button key={tab.key} type="button" title={tab.label} aria-label={tab.label} onClick={() => setStatsTab(tab.key)} style={iconButtonStyle(active)}><TabGlyph kind={tab.key} active={active} /></button>;
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginTop: 16 }}>
              {miniKpi("Terminées", targetsCompleted, "#31e091", `${stats.completedPct}%`)}
              {miniKpi("Restantes", stats.remaining, "#2fe0ff", "avant Bull")}
              {miniKpi("Temps total", formatTime(elapsedNow), "#4aa9ff", "chrono")}
              {miniKpi("Temps / cible", targetsCompleted > 0 ? formatTime(Math.round(elapsedNow / Math.max(1, targetsCompleted))) : "00:00", "#7de7ff", "moyenne")}
            </div>

            {statsTab === "resume" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                <div style={{ ...overlayCard, padding: 16 }}>
                  <div style={{ color: themeTeal, fontSize: 14.5, fontWeight: 1000, marginBottom: 10, lineHeight: 1.08 }}>Performance globale</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 10, columnGap: 10 }}>
                    {[
                      ["Total darts", stats.total, themeText],
                      ["Objectifs validés", hits, "#31e091"],
                      ["Précision", `${precision}%`, "#2fe0ff"],
                      ["Board hits", `${stats.boardHits} · ${stats.boardHitPct}%`, "#4aa9ff"],
                      ["Points", stats.points, "#ff9a57"],
                      ["Moy. / dart", stats.avgPerDart, "#ffd34e"],
                      ["Série", currentStreak, "#c56cff"],
                      ["Best série", bestStreak, "#31e091"],
                      ["Dernier obj.", lastObjectiveDisplay, themeText],
                    ].map(([label, value, tone]) => <React.Fragment key={String(label)}><span style={{ color: themeTextSoft, fontSize: 12 }}>{String(label)}</span><strong style={{ color: String(tone), textAlign: "right", fontSize: 12.5, lineHeight: 1.2 }}>{String(value)}</strong></React.Fragment>)}
                  </div>
                </div>
                <div style={{ ...overlayCard, padding: 16 }}>
                  <div style={{ color: themeTeal, fontSize: 14.5, fontWeight: 1000, marginBottom: 10, lineHeight: 1.08 }}>Répartition des lancers</div>
                  <Pie3DChart data={throwComposition} centerValue={`${stats.total || 0}`} centerLabel="lancers" />
                </div>
              </div>
            ) : null}

            {statsTab === "performance" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                  {miniKpi("Moyenne / dart", stats.avgPerDart, "#2fe0ff")}
                  {miniKpi("Moyenne / hit", stats.avgPerHit, "#31e091")}
                  {miniKpi("Taux d'achèvement", `${stats.completedPct}%`, "#7de7ff")}
                  {miniKpi("Points / round", stats.avgRoundPoints, "#ff9a57")}
                  {miniKpi("Bulls / DBulls", `${stats.bulls}/${stats.dbulls}`, "#ffd34e")}
                  {miniKpi("Triples / Doubles", `${stats.triples}/${stats.doubles}`, "#c56cff")}
                </div>
                <div style={{ ...overlayCard, padding: 16 }}>
                  <div style={{ color: themeTeal, fontSize: 14.5, fontWeight: 1000, marginBottom: 10, lineHeight: 1.08 }}>Comparatif des familles</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {[
                      { label: "Simples", value: stats.singles, color: "#2cc7ff" },
                      { label: "Doubles", value: stats.doubles, color: "#31e091" },
                      { label: "Triples", value: stats.triples, color: "#7de7ff" },
                      { label: "Bulls", value: stats.bulls + stats.dbulls, color: "#ffd34e" },
                      { label: "Misses", value: stats.misses, color: "#ff6a83" },
                    ].map((row) => {
                      const pct = stats.total ? Math.round((row.value / stats.total) * 100) : 0;
                      return <div key={row.label}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}><span style={{ color: themeText, fontSize: 12.5 }}>{row.label}</span><strong style={{ color: row.color, fontSize: 12.5 }}>{row.value} · {pct}%</strong></div><div style={{ height: 11, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${hexToRgba(row.color, 0.65)}, ${row.color})`, boxShadow: `0 0 10px ${hexToRgba(row.color, 0.24)}` }} /></div></div>;
                    })}
                  </div>
                </div>
                <div style={{ ...overlayCard, padding: 16, gridColumn: "1 / -1" }}>
                  <div style={{ color: themeTeal, fontSize: 14.5, fontWeight: 1000, marginBottom: 10, lineHeight: 1.08 }}>Camembert d'objectifs</div>
                  <Pie3DChart data={objectiveComposition} centerValue={`${targetsCompleted}`} centerLabel={`sur ${TARGETS.length}`} />
                </div>
              </div>
            ) : null}

            {statsTab === "progression" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                <div style={{ ...overlayCard, padding: 16 }}>
                  <div style={{ color: themeTeal, fontSize: 14.5, fontWeight: 1000, marginBottom: 10, lineHeight: 1.08 }}>Historique des cibles</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[...Array(Math.max(1, targetsCompleted))].map((_, idx) => <div key={idx} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto", gap: 8, alignItems: "center", borderRadius: 14, padding: "10px 12px", background: idx % 2 ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.015)", border: "1px solid rgba(255,255,255,.05)" }}><span style={{ color: themeTextSoft, fontWeight: 900 }}>#{idx + 1}</span><span style={{ color: themeText }}>{idx + 1 === TARGETS.length ? "Bull" : idx + 1}</span><strong style={{ color: themeSuccess }}>HIT</strong><span style={{ color: themeBlue, fontWeight: 900 }}>{formatTime(Math.round((elapsedNow / Math.max(1, targetsCompleted)) * (idx + 1)))}</span></div>)}
                  </div>
                </div>
                <div style={{ ...overlayCard, padding: 16 }}>
                  <div style={{ color: themeTeal, fontSize: 14.5, fontWeight: 1000, marginBottom: 10, lineHeight: 1.08 }}>Meilleur segment</div>
                  <div style={{ display: "grid", gridTemplateColumns: "82px 1fr", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 82, height: 82, borderRadius: "50%", border: `2px solid ${hexToRgba(themeBlue, 0.45)}`, backgroundImage: `url(${targetBg})`, backgroundSize: "cover", backgroundPosition: "center", boxShadow: `0 0 18px ${hexToRgba(themeBlue, 0.18)}` }} />
                    <div>
                      <div style={{ color: themeBlue, fontSize: 28, fontWeight: 1100, lineHeight: 1 }}>{stats.bestSegment}</div>
                      <div style={{ color: themeText, fontSize: 14, fontWeight: 900, marginTop: 6 }}>{stats.bestSegmentHits} hit{stats.bestSegmentHits > 1 ? "s" : ""}</div>
                      <div style={{ color: themeTextSoft, marginTop: 4, fontSize: 12, lineHeight: 1.25 }}>Segment le plus fréquent.</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: themeTeal, fontSize: 14, fontWeight: 900, marginBottom: 8 }}>Progression globale</div>
                    <div style={{ height: 12, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}><div style={{ width: `${stats.completedPct}%`, height: "100%", background: `linear-gradient(90deg, #31e091, #2fe0ff, #c56cff)` }} /></div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
                      {miniKpi("Objectifs", targetsCompleted, "#31e091")}
                      {miniKpi("Board hits", stats.boardHits, "#4aa9ff")}
                      {miniKpi("Précision brute", `${stats.boardHitPct}%`, "#7de7ff")}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {statsTab === "graphs" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                <div style={{ ...overlayCard, padding: 16 }}>
                  <div style={{ color: themeTeal, fontSize: 14.5, fontWeight: 1000, marginBottom: 9 }}>Courbe de précision</div>
                  <svg viewBox="0 0 210 116" width="100%" height="164">
                    <defs>
                      <linearGradient id="clockPrecisionLineRefined" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2fe0ff" />
                        <stop offset="55%" stopColor="#ffd34e" />
                        <stop offset="100%" stopColor="#c56cff" />
                      </linearGradient>
                    </defs>
                    <line x1="14" y1="102" x2="194" y2="102" stroke="rgba(255,255,255,.16)" />
                    <line x1="14" y1="18" x2="14" y2="102" stroke="rgba(255,255,255,.16)" />
                    <polyline fill="none" stroke="url(#clockPrecisionLineRefined)" strokeWidth="3.5" points={precisionLine} />
                    {stats.cumulative.map((point, idx) => {
                      const x = stats.cumulative.length === 1 ? 104 : 14 + idx * (180 / Math.max(1, stats.cumulative.length - 1));
                      const y = 102 - (point.precision / 100) * 84;
                      return <circle key={point.x} cx={x} cy={y} r="4.2" fill={idx % 2 ? "#ffd34e" : "#2fe0ff"} stroke="#07101d" strokeWidth="2" />;
                    })}
                  </svg>
                </div>
                <div style={{ ...overlayCard, padding: 16 }}>
                  <div style={{ color: themeTeal, fontSize: 14.5, fontWeight: 1000, marginBottom: 9 }}>Barres par round</div>
                  <svg viewBox="0 0 220 116" width="100%" height="164">
                    <line x1="14" y1="102" x2="206" y2="102" stroke="rgba(255,255,255,.16)" />
                    {roundBars.length ? roundBars.map((bar, idx) => <rect key={idx} x={bar.x} y={102 - bar.h} width="22" height={bar.h} rx="8" fill={bar.color} opacity="0.95" />) : <text x="20" y="58" fill="rgba(255,255,255,.55)" fontSize="11">Aucun round disponible</text>}
                  </svg>
                </div>
                <div style={{ ...overlayCard, padding: 16 }}>
                  <div style={{ color: themeTeal, fontSize: 14.5, fontWeight: 1000, marginBottom: 10 }}>Repères</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                    {miniKpi("Darts", stats.total, "#2fe0ff")}
                    {miniKpi("Points", stats.points, "#ff9957")}
                    {miniKpi("Board hits", stats.boardHits, "#4aa9ff")}
                    {miniKpi("Misses", stats.misses, "#ff6a83")}
                  </div>
                </div>
                <div style={{ ...overlayCard, padding: 16 }}>
                  <div style={{ color: themeTeal, fontSize: 14.5, fontWeight: 1000, marginBottom: 10 }}>Comparaison rapide</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {[
                      { label: "Hits / ratés", a: hits, b: stats.misses, colorA: "#31e091", colorB: "#ff6a83" },
                      { label: "Simples / triples", a: stats.singles, b: stats.triples, colorA: "#2fe0ff", colorB: "#c56cff" },
                      { label: "Bulls / doubles", a: stats.bulls + stats.dbulls, b: stats.doubles, colorA: "#ffd34e", colorB: "#4aa9ff" },
                    ].map((row) => {
                      const max = Math.max(1, row.a, row.b);
                      return <div key={row.label}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}><span style={{ color: themeText, fontSize: 12.5 }}>{row.label}</span><strong style={{ color: themeTextSoft, fontSize: 12.5 }}>{row.a} / {row.b}</strong></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div style={{ height: 11, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}><div style={{ width: `${(row.a / max) * 100}%`, height: "100%", background: row.colorA }} /></div><div style={{ height: 11, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}><div style={{ width: `${(row.b / max) * 100}%`, height: "100%", background: row.colorB }} /></div></div></div>;
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============================================
// SECTION SUMMARY
// ============================================

type SummarySectionProps = {
  lastSession: ClockSession;
  history: ClockSession[];
  labelMode: (mode: ClockMode) => string;
  onBackToSetup: () => void;
  onReplayCurrent: () => void;
  isMulti: boolean;
  currentPlayerIndex: number;
  players: PlayerLite[];
  onNextPlayer: () => void;
};

function SummarySection(props: SummarySectionProps) {
  const {
    lastSession,
    history,
    labelMode,
    onBackToSetup,
    onReplayCurrent,
    isMulti,
    currentPlayerIndex,
    players,
    onNextPlayer,
  } = props;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section
        className="card"
        style={{
          borderRadius: 18,
          padding: 14,
          background:
            "linear-gradient(180deg, rgba(25,25,30,.98), rgba(5,5,8,.98))",
          border: "1px solid rgba(255,255,255,.10)",
          boxShadow: "0 0 16px rgba(0,0,0,.7)",
          fontSize: 13,
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Résumé de la session
        </h2>
        <div style={{ marginBottom: 2 }}>
          Joueur : <strong>{lastSession.profileName}</strong>
          {lastSession.teamName ? <span style={{ color: "#ffc63a" }}> • {lastSession.teamName}</span> : null}
          {lastSession.dartSetName ? <span style={{ color: "#70d8ff" }}> • {lastSession.dartSetName}</span> : null}
        </div>
        <div style={{ marginBottom: 2 }}>
          Mode :{" "}
          <strong>{labelMode(lastSession.config.mode)}</strong>
        </div>
        <div style={{ marginBottom: 2 }}>
          Terminé ?{" "}
          <strong>
            {lastSession.completed ? "Oui 🎯" : "Non"}
          </strong>
        </div>
        <div style={{ marginBottom: 2 }}>
          Fléchettes :{" "}
          <strong>{lastSession.dartsThrown}</strong>
          {lastSession.config.dartLimit != null &&
            ` / ${lastSession.config.dartLimit}`}
        </div>
        <div style={{ marginBottom: 2 }}>
          Cibles validées : <strong>{lastSession.targetsCompleted} / {TARGETS.length}</strong>
        </div>
        <div style={{ marginBottom: 2 }}>
          Fléchettes valides : <strong>{lastSession.validHits}</strong> · Précision : <strong>{lastSession.accuracyPct}%</strong>
        </div>
        <div style={{ marginBottom: 2 }}>
          Meilleure série :{" "}
          <strong>{lastSession.bestStreak}</strong>
        </div>
        {lastSession.config.showTimer && (
          <div style={{ marginTop: 2 }}>
            Temps :{" "}
            <strong>{formatTime(lastSession.elapsedMs)}</strong>
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Historique (local)
          </h2>
          <HistoryList history={history.slice(0, 10)} />
        </section>
      )}

      {/* Boutons bas : suivant / rejouer / retour */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {isMulti && currentPlayerIndex < players.length - 1 && (
          <button
            type="button"
            className="btn-primary"
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
            }}
            onClick={onNextPlayer}
          >
            Joueur suivant :{" "}
            {players[currentPlayerIndex + 1]?.teamName ? `${players[currentPlayerIndex + 1]?.name} • ${players[currentPlayerIndex + 1]?.teamName}` : (players[currentPlayerIndex + 1]?.name ?? "") }
          </button>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-ghost"
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 14,
              fontSize: 13,
            }}
            onClick={onBackToSetup}
          >
            Retour au paramétrage
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
            }}
            onClick={onReplayCurrent}
          >
            Rejouer ce joueur
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Mini keypad spécifique Tour de l'horloge
// Look harmonisé avec le Keypad X01
// ============================================

type ClockPadProps = {
  selectedValue: Target | null;
  setSelectedValue: (v: Target | null) => void;
  selectedMult: 1 | 2 | 3;
  setSelectedMult: (m: 1 | 2 | 3) => void;
  isMiss: boolean;
  setIsMiss: (v: boolean) => void;
};

type KeyVariant =
  | "default"
  | "gold"
  | "teal"
  | "purple"
  | "green"
  | "grey"
  | "red";

const ClockPad: React.FC<ClockPadProps> = ({
  selectedValue,
  setSelectedValue,
  selectedMult,
  setSelectedMult,
  isMiss,
  setIsMiss,
}) => {
  const handleSelectValue = (v: Target | null) => {
    setIsMiss(false);
    setSelectedValue(v);
  };

  const handleSelectMiss = () => {
    setIsMiss(true);
    setSelectedValue(null);
  };

  const Key = ({
    variant,
    active,
    children,
    onClick,
    grow,
  }: {
    variant: KeyVariant;
    active?: boolean;
    children: React.ReactNode;
    onClick: () => void;
    grow?: boolean;
  }) => {
    // Styles de base par variante (inspirés du keypad X01)
    let bg = "linear-gradient(180deg,#3b3f49,#262830)";
    let border = "1px solid rgba(0,0,0,.85)";
    let color = "#f5f5f5";
    let boxShadow = "inset 0 1px 0 rgba(255,255,255,.12)";

    if (variant === "gold") {
      bg = "linear-gradient(180deg,#ffc63a,#ffaf00)";
      border = "1px solid rgba(0,0,0,.85)";
      color = "#111";
      boxShadow = "0 0 12px rgba(255,198,58,.65)";
    }

    if (variant === "teal") {
      bg = "linear-gradient(180deg,#26d0a8,#1ca086)";
      border = "1px solid rgba(0,0,0,.85)";
      color = "#061312";
      boxShadow = "0 0 10px rgba(38,208,168,.55)";
    }

    if (variant === "purple") {
      bg = "linear-gradient(180deg,#b16adf,#8e44ad)";
      border = "1px solid rgba(0,0,0,.85)";
      color = "#110713";
      boxShadow = "0 0 10px rgba(177,106,223,.55)";
    }

    if (variant === "green") {
      bg = "linear-gradient(180deg,#29c76f,#1e8b4a)";
      border = "1px solid rgba(0,0,0,.85)";
      color = "#03140a";
      boxShadow = "0 0 10px rgba(41,199,111,.55)";
    }

    if (variant === "grey") {
      bg = "linear-gradient(180deg,#565a61,#3a3d43)";
      border = "1px solid rgba(0,0,0,.85)";
      color = "#f5f5f5";
      boxShadow = "inset 0 1px 0 rgba(255,255,255,.14)";
    }

    if (variant === "red") {
      bg = "linear-gradient(180deg,#ff4b5c,#a82030)";
      border = "1px solid rgba(0,0,0,.85)";
      color = "#fff";
      boxShadow = "0 0 10px rgba(255,75,92,.6)";
    }

    // Effet "actif" : aura dorée style X01
    if (active && variant === "default") {
      bg = "linear-gradient(180deg,#ffc63a,#ffaf00)";
      border = "1px solid rgba(0,0,0,.9)";
      color = "#111";
      boxShadow =
        "0 0 14px rgba(255,198,58,.9), 0 0 0 1px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.3)";
    }

    if (active && variant !== "default") {
      boxShadow =
        boxShadow +
        ", 0 0 10px rgba(255,255,255,.28)";
    }

    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: grow ? 1 : undefined,
          minWidth: grow ? undefined : 32,
          height: 34,
          borderRadius: 12,
          border,
          background: bg,
          boxShadow,
          color,
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 6px",
        }}
      >
        {children}
      </button>
    );
  };

  return (
    <section
      className="card"
      style={{
        borderRadius: 18,
        padding: 10,
        background:
          "linear-gradient(180deg,#181820,#08080c)",
        border: "1px solid rgba(255,255,255,.12)",
        boxShadow: "0 0 20px rgba(0,0,0,.8)",
      }}
    >
      <div
        style={{
          borderRadius: 18,
          padding: 10,
          background:
            "linear-gradient(180deg,#22232b,#101117)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Ligne Miss / Bull */}
        <div style={{ display: "flex", gap: 6 }}>
          <Key
            variant="red"
            active={isMiss}
            onClick={handleSelectMiss}
            grow
          >
            Miss
          </Key>
          <Key
            variant="green"
            active={selectedValue === "BULL" && !isMiss}
            onClick={() => handleSelectValue("BULL")}
            grow
          >
            Bull
          </Key>
        </div>

        {/* Grille 1–20 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 4,
          }}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
            const active = selectedValue === n && !isMiss;
            return (
              <Key
                key={n}
                variant="default"
                active={active}
                onClick={() => handleSelectValue(n as Target)}
              >
                {n}
              </Key>
            );
          })}
        </div>

        {/* Simple / Double / Triple */}
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <Key
            variant="gold"
            active={!isMiss && selectedMult === 1}
            onClick={() => {
              setIsMiss(false);
              setSelectedMult(1);
            }}
            grow
          >
            Simple
          </Key>

          <Key
            variant="green"
            active={!isMiss && selectedMult === 2}
            onClick={() => {
              setIsMiss(false);
              setSelectedMult(2);
            }}
            grow
          >
            Double
          </Key>

          <Key
            variant="purple"
            active={!isMiss && selectedMult === 3}
            onClick={() => {
              setIsMiss(false);
              setSelectedMult(3);
            }}
            grow
          >
            Triple
          </Key>
        </div>
      </div>
    </section>
  );
};

// ============================================
// Liste historique (localStorage)
// ============================================

type HistoryListProps = {
  history: ClockSession[];
};

const HistoryList: React.FC<HistoryListProps> = ({ history }) => {
  if (!history.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {history.map((s) => (
        <div
          key={s.id}
          className="card"
          style={{
            borderRadius: 12,
            padding: "6px 8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            background:
              "linear-gradient(180deg, rgba(20,20,24,.95), rgba(8,8,10,.98))",
            border: "1px solid rgba(255,255,255,.08)",
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>
              {s.profileName} — {labelShortMode(s.config.mode)}
            </div>
            <div style={{ opacity: 0.7 }}>
              {new Date(s.startedAt).toLocaleString()} •{" "}
              {s.completed ? "Terminé" : "Interrompu"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>
              🎯 {s.targetsCompleted}/{TARGETS.length} · {s.accuracyPct}%
            </div>
            {s.config.showTimer && (
              <div style={{ opacity: 0.7 }}>
                {formatTime(s.elapsedMs)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

function labelShortMode(mode: ClockMode): string {
  switch (mode) {
    case "classic":
      return "Classique";
    case "doubles":
      return "Doubles";
    case "triples":
      return "Triples";
    case "sdt":
      return "S-D-T";
    default:
      return mode;
  }
}
