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
import { getCountryFlag } from "../lib/countryNames";
import { getCountryFlagSrc } from "../lib/geoAssets";
import { getDartSetsForProfile, getPublicDartSetsForSelector, getFavoriteDartSetForProfile, getDartSetById, getDartSetMainImageSrc, getDartSetThumbImageSrc, bumpDartSetUsage } from "../lib/dartSetsStore";
import tickerTourHorloge from "../assets/tickers/ticker_tour_horloge.png";

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
            maxWidth: 520,
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

  const modeMeta: Record<ClockMode, { title: string; short: string; icon: string; hint: string; tone: string }> = {
    classic: { title: "Classique", short: "1 → 20 + Bull", icon: "◎", hint: "Tous les segments comptent.", tone: primary },
    doubles: { title: "Doubles", short: "D1 → D20 + DBull", icon: "×2", hint: "Seulement la couronne double.", tone: success },
    triples: { title: "Triples", short: "T1 → T20", icon: "×3", hint: "Seulement la couronne triple.", tone: "#c77dff" },
    sdt: { title: "S · D · T", short: "Simple → Double → Triple", icon: "3×", hint: "3 étapes par numéro.", tone: accent2 },
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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.1, color: primary, fontWeight: 1000, textTransform: "uppercase" }}>Tour de l'horloge</div>
            <div style={{ marginTop: 2, fontSize: 16, fontWeight: 1000, color: text }}>Configuration type X01</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="Guidée" active={configViewMode === "guided"} onClick={() => setConfigViewMode("guided")} />
            <PillButton label="Complète" active={configViewMode === "complete"} onClick={() => setConfigViewMode("complete")} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <div style={{ borderRadius: 999, padding: "6px 10px", border: `1px solid ${hexToRgba(primary, 0.32)}`, background: hexToRgba(primary, 0.12), color: primary, fontSize: 11, fontWeight: 950 }}>{participantMode === "teams" ? "Mode équipes" : "Mode joueurs"}</div>
          <div style={{ borderRadius: 999, padding: "6px 10px", border: `1px solid ${borderSoft}`, background: "rgba(255,255,255,0.04)", color: text, fontSize: 11, fontWeight: 900, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedNames}</div>
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
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: .9, fontWeight: 950, color: primary }}>{participantMode === "teams" ? "2. Équipes" : "2. Joueurs"}</div>
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
          <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: primary, color: bg, fontSize: 11, fontWeight: 1000 }}>3</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 950, color: text }}>Variante de jeu</div>
            <div style={{ fontSize: 11, color: textSoft }}>Style plus arcade avec un rendu plus visuel.</div>
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
                  background: active ? `radial-gradient(circle at 15% 0%, ${hexToRgba(meta.tone, 0.18)}, rgba(13,17,28,.98))` : "linear-gradient(180deg, rgba(17,22,36,.96), rgba(8,10,18,.98))",
                  color: text,
                  padding: 10,
                  minHeight: 142,
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: active ? `0 0 22px ${hexToRgba(meta.tone, 0.24)}` : "inset 0 0 18px rgba(255,255,255,.02)",
                  display: "grid",
                  gridTemplateRows: "auto 1fr",
                  gap: 10,
                }}
              >
                <div style={{ borderRadius: 16, padding: "10px 12px", border: `1px solid ${active ? hexToRgba(meta.tone, 0.55) : "rgba(255,255,255,.1)"}`, background: `linear-gradient(135deg, ${hexToRgba(meta.tone, 0.36)}, rgba(12,18,28,.92))`, boxShadow: `inset 0 0 24px ${hexToRgba(meta.tone, 0.16)}, 0 0 12px rgba(0,0,0,.2)`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "grid", gap: 2 }}>
                    <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1.2, textTransform: "uppercase", color: active ? "#fff" : textSoft }}>Tour de l'horloge</div>
                    <div style={{ fontSize: 20, lineHeight: 1, fontWeight: 1000, color: "#fff", textShadow: `0 0 12px ${hexToRgba(meta.tone, 0.45)}` }}>{meta.title}</div>
                  </div>
                  <div style={{ fontSize: 32, lineHeight: 1, color: meta.tone, fontWeight: 1000, textShadow: `0 0 10px ${hexToRgba(meta.tone, 0.45)}` }}>{meta.icon}</div>
                </div>
                <div style={{ padding: "0 4px 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 1000, color: active ? meta.tone : text }}>{meta.short}</div>
                    <span style={{ width: 22, height: 22, borderRadius: 999, border: `1px solid ${active ? meta.tone : "rgba(255,255,255,.2)"}`, display: "grid", placeItems: "center", color: meta.tone, fontSize: 11, background: active ? hexToRgba(meta.tone, 0.1) : "transparent" }}>{active ? "✓" : ""}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 800, color: text }}>{meta.hint}</div>
                  <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                    <div style={{ width: active ? "100%" : "45%", height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${meta.tone}, ${hexToRgba(meta.tone, 0.4)})`, opacity: active ? 1 : .6 }} />
                  </div>
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
          <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: primary, color: bg, fontSize: 11, fontWeight: 1000 }}>4</span>
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
          <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: primary, color: bg, fontSize: 11, fontWeight: 1000 }}>5</span>
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
      {(configViewMode === "guided" && guidedStep === 0) || configViewMode === "complete" ? <TypeBlock /> : null}
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
    lastObjectiveLabel,
    lastObjectiveTimeMs,
    onAbort,
    onThrow,
  } = props;

  // couleurs de l'objectif
  let objBg =
    "linear-gradient(180deg,#ffc63a,#ffaf00)";
  let objShadow = "0 0 12px rgba(255,198,58,.7)";
  let objColor = "#111";

  // Simple = doré, Double = vert, Triple = violet
  if (objectiveKind === "double") {
    objBg = "linear-gradient(180deg,#29c76f,#1e8b4a)";
    objShadow = "0 0 12px rgba(41,199,111,.7)";
    objColor = "#03140a";
  } else if (objectiveKind === "triple") {
    objBg = "linear-gradient(180deg,#b16adf,#8e44ad)";
    objShadow = "0 0 12px rgba(177,106,223,.7)";
    objColor = "#110713";
  }

  const targetFullLabel = labelTarget(currentTarget, config.mode, stageSDT);

  const lastObjectiveDisplay =
    lastObjectiveLabel != null && lastObjectiveTimeMs != null
      ? `${lastObjectiveLabel} à ${formatTime(lastObjectiveTimeMs)}`
      : "—";
  const progressPct = Math.max(0, Math.min(100, (targetsCompleted / TARGETS.length) * 100));
  const currentTargetPosition = Math.min(TARGETS.length - 1, targetsCompleted);
  const nearbyTargets = TARGETS.map((target, index) => ({ target, index }))
    .filter(({ index }) => Math.abs(index - currentTargetPosition) <= 2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Bandeau infos joueur / objectif / stats */}
      <section
        className="card"
        style={{
          borderRadius: 16,
          padding: 12,
          background:
            "linear-gradient(180deg,#191920,#08080c)",
          border: "1px solid rgba(255,255,255,.12)",
          boxShadow: "0 0 18px rgba(0,0,0,.7)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          {/* Avatar type X01 avec aura */}
          <div
            style={{
              borderRadius: "50%",
              padding: 3,
              background:
                "radial-gradient(circle, rgba(255,198,58,.9) 0, rgba(255,198,58,.25) 55%, transparent 70%)",
              boxShadow: "0 0 20px rgba(255,198,58,.65)",
              width: 64,
              height: 64,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                background: "#222",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid rgba(0,0,0,.8)",
              }}
            >
              {currentProfile?.avatarDataUrl ? (
                <img
                  src={currentProfile.avatarDataUrl}
                  alt={currentPlayer?.name ?? ""}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#f5f5f5",
                  }}
                >
                  {initialsFromName(currentPlayer?.name)}
                </span>
              )}
            </div>
          </div>

          {/* Infos à droite */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {/* Ligne temps + mode */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.8,
                }}
              >
                <div>{isMulti ? `Joueur ${currentPlayerIndex + 1}/${players.length}` : "Mode solo"}</div>
                {currentPlayer?.teamName ? <div style={{ color: "#ffc63a", fontWeight: 900, marginTop: 2 }}>Équipe : {currentPlayer.teamName}</div> : null}
                {currentDartSetName ? <div style={{ color: "#70d8ff", fontWeight: 900, marginTop: 2 }}>Set : {currentDartSetName}</div> : null}
              </div>
              {config.showTimer && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#ffc63a",
                  }}
                >
                  Temps : {formatTime(elapsedNow)}
                </div>
              )}
            </div>

            {/* Objectif + cible */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12 }}>
                Objectif
                <div
                  style={{
                    marginTop: 3,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: objBg,
                    boxShadow: objShadow,
                    color: objColor,
                    fontWeight: 800,
                    fontSize: 14,
                    minWidth: 64,
                    textAlign: "center",
                  }}
                >
                  {objectiveLabel}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.8,
                  textAlign: "right",
                }}
              >
                Cible actuelle : {targetFullLabel}
              </div>
            </div>

            {/* Stats détaillées + dernier objectif */}
            <div
              style={{
                marginTop: 4,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                fontSize: 11,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  Fléchettes :{" "}
                  <strong>{dartsThrown}</strong>
                </span>
                <span>
                  Hits : <strong>{hits}</strong>
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  Précision :{" "}
                  <strong>{precision}%</strong>
                </span>
                <span>
                  Série / Best :{" "}
                  <strong>
                    {currentStreak} / {bestStreak}
                  </strong>
                </span>
              </div>
              <div
                style={{
                  marginTop: 2,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Dernier objectif validé :</span>
                <span
                  style={{
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  {lastObjectiveDisplay}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          borderRadius: 22,
          padding: 14,
          overflow: "hidden",
          position: "relative",
          background: `radial-gradient(circle at 50% 12%, ${objectiveKind === "double" ? "rgba(41,199,111,.24)" : objectiveKind === "triple" ? "rgba(177,106,223,.24)" : "rgba(255,198,58,.24)"}, transparent 56%), linear-gradient(180deg,#1d1d24,#08080c)`,
          border: `1px solid ${objectiveKind === "double" ? "rgba(41,199,111,.46)" : objectiveKind === "triple" ? "rgba(177,106,223,.46)" : "rgba(255,198,58,.46)"}`,
          boxShadow: `0 0 26px ${objectiveKind === "double" ? "rgba(41,199,111,.16)" : objectiveKind === "triple" ? "rgba(177,106,223,.16)" : "rgba(255,198,58,.16)"}`,
        }}
      >
        <div style={{ textAlign: "center", fontSize: 9, letterSpacing: 1.6, fontWeight: 1000, opacity: .58 }}>OBJECTIF EN COURS</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <div
            style={{
              width: 118,
              height: 118,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              position: "relative",
              background: `conic-gradient(${objectiveKind === "double" ? "#29c76f" : objectiveKind === "triple" ? "#b16adf" : "#ffc63a"} ${progressPct}%, rgba(255,255,255,.08) 0)`,
              boxShadow: objShadow,
            }}
          >
            <div style={{ position: "absolute", inset: 7, borderRadius: "50%", background: "radial-gradient(circle at 50% 35%,#2a2b33,#0a0a0e 72%)", border: "1px solid rgba(255,255,255,.12)" }} />
            <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <div style={{ fontSize: objectiveLabel.length > 4 ? 30 : 42, lineHeight: 1, fontWeight: 1000, color: objectiveKind === "double" ? "#53ee9a" : objectiveKind === "triple" ? "#d49cff" : "#ffd86b", textShadow: objShadow }}>{objectiveLabel}</div>
              <div style={{ marginTop: 5, fontSize: 9, fontWeight: 900, opacity: .62 }}>{targetsCompleted}/{TARGETS.length} CIBLES</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 12 }}>
          {nearbyTargets.map(({ target, index }) => {
            const active = index === currentTargetPosition;
            const done = index < currentTargetPosition;
            return (
              <div key={String(target)} style={{ minWidth: active ? 54 : 34, height: active ? 32 : 27, borderRadius: 999, display: "grid", placeItems: "center", fontSize: active ? 12 : 10, fontWeight: 1000, border: `1px solid ${active ? "rgba(255,198,58,.72)" : done ? "rgba(81,232,147,.42)" : "rgba(255,255,255,.12)"}`, background: active ? "rgba(255,198,58,.14)" : done ? "rgba(81,232,147,.08)" : "rgba(255,255,255,.035)", color: active ? "#ffd86b" : done ? "#51e893" : "rgba(255,255,255,.55)" }}>
                {done ? "✓" : target === "BULL" ? "BULL" : target}
              </div>
            );
          })}
        </div>
        <div style={{ height: 6, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)", marginTop: 12 }}>
          <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 999, background: objectiveKind === "double" ? "linear-gradient(90deg,#14733d,#42e58d)" : objectiveKind === "triple" ? "linear-gradient(90deg,#63307c,#c77dff)" : "linear-gradient(90deg,#9b6900,#ffc63a)", boxShadow: objShadow, transition: "width .25s ease" }} />
        </div>
      </section>

      {/* Ligne d'historique de hits (sous le header, au-dessus du keypad) */}
      <section
        className="card"
        style={{
          borderRadius: 14,
          padding: 8,
          background:
            "linear-gradient(180deg,#17171d,#09090c)",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            opacity: 0.8,
            marginBottom: 4,
          }}
        >
          Derniers lancers
        </div>
        {lastThrows.length === 0 ? (
          <div
            style={{
              fontSize: 11,
              opacity: 0.6,
            }}
          >
            En attente des premiers lancers…
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 2,
            }}
          >
            {lastThrows.map((t, idx) => {
              const kind = getThrowKind(t);
              let bg =
                "linear-gradient(180deg,#444751,#2c2e35)";
              let color = "#f5f5f5";

              // Simple = doré, Double = vert, Triple = violet
              if (kind === "simple") {
                bg =
                  "linear-gradient(180deg,#ffc63a,#ffaf00)";
                color = "#111";
              } else if (kind === "double") {
                bg =
                  "linear-gradient(180deg,#29c76f,#1e8b4a)";
                color = "#03140a";
              } else if (kind === "triple") {
                bg =
                  "linear-gradient(180deg,#b16adf,#8e44ad)";
                color = "#110713";
              } else if (kind === "bull") {
                bg =
                  "linear-gradient(180deg,#29c76f,#1e8b4a)";
                color = "#03140a";
              }

              return (
                <div
                  key={idx}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: bg,
                    color,
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Mini keypad Tour de l'horloge */}
      <ClockPad
        selectedValue={selectedValue}
        setSelectedValue={setSelectedValue}
        selectedMult={selectedMult}
        setSelectedMult={setSelectedMult}
        isMiss={isMiss}
        setIsMiss={setIsMiss}
      />

      {/* Actions bas */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          className="btn-ghost"
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: 14,
            fontSize: 13,
          }}
          onClick={onAbort}
        >
          Annuler
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
            background:
              "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#111",
            border: "1px solid rgba(0,0,0,.9)",
            boxShadow: "0 0 16px rgba(255,198,58,.6)",
          }}
          onClick={onThrow}
        >
          VALIDER · {formatThrowLabel(isMiss, selectedValue, selectedMult)}
        </button>
      </div>
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
