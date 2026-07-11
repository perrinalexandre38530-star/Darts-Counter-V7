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
import tickerTourHorloge from "../assets/tickers/ticker_tour_horloge.png";

type ClockMode = "classic" | "doubles" | "triples" | "sdt";

type ClockConfig = {
  mode: ClockMode;
  showTimer: boolean;
  dartLimit: number | null; // nb de fléchettes max par joueur, null = illimité
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

type PlayerLite = { id: string | null; name: string };

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
    config: {
      mode: (["classic", "doubles", "triples", "sdt"] as ClockMode[]).includes(raw?.config?.mode) ? raw.config.mode : "classic",
      showTimer: raw?.config?.showTimer !== false,
      dartLimit: Number(raw?.config?.dartLimit) > 0 ? Number(raw.config.dartLimit) : null,
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

  // --- sélection de joueurs (solo + multi) ---
  const [selectedPlayerIds, setSelectedPlayerIds] = React.useState<string[]>(
    () => {
      const list = profiles || [];
      if (!list.length) return [];
      const found =
        activeProfileId && list.find((p) => p.id === activeProfileId);
      return [found?.id ?? list[0].id];
    }
  );

  const players: PlayerLite[] = React.useMemo(
    () =>
      (selectedPlayerIds || []).map((id) => {
        const p = profiles.find((pr) => pr.id === id);
        return {
          id,
          name: p?.nickname ?? p?.name ?? "Joueur",
        };
      }),
    [selectedPlayerIds, profiles]
  );

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

    const session: ClockSession = {
      id: generateId(),
      profileId: player?.id ?? null,
      profileName: player?.name ?? "Joueur solo",
      config,
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
      special: {
        mode: session.config.mode,
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
        players: [{ id: session.profileId, name: session.profileName }],
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
          gameMode: "clock",
          sport: "darts",
          config: session.config,
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
              selectedPlayerIds={selectedPlayerIds}
              setSelectedPlayerIds={setSelectedPlayerIds}
              config={config}
              setConfig={setConfig}
              players={players}
              isMulti={isMulti}
              history={history}
              labelMode={labelMode}
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

type SetupSectionProps = {
  profiles: Profile[];
  selectedPlayerIds: string[];
  setSelectedPlayerIds: (fn: (prev: string[]) => string[]) => void;
  config: ClockConfig;
  setConfig: React.Dispatch<React.SetStateAction<ClockConfig>>;
  players: PlayerLite[];
  isMulti: boolean;
  history: ClockSession[];
  labelMode: (mode: ClockMode) => string;
  onStart: () => void;
};

function SetupSection(props: SetupSectionProps) {
  const {
    profiles,
    selectedPlayerIds,
    setSelectedPlayerIds,
    config,
    setConfig,
    players,
    isMulti,
    history,
    labelMode,
    onStart,
  } = props;

  const modeMeta: Record<ClockMode, { title: string; short: string; icon: string; hint: string; tone: string }> = {
    classic: { title: "Classique", short: "1 → 20 + Bull", icon: "◎", hint: "Tous les multiplicateurs valident la cible.", tone: "#ffc63a" },
    doubles: { title: "Doubles", short: "D1 → D20 + DBull", icon: "×2", hint: "Seule la couronne double compte.", tone: "#42e58d" },
    triples: { title: "Triples", short: "T1 → T20", icon: "×3", hint: "Seule la couronne triple compte.", tone: "#c77dff" },
    sdt: { title: "S · D · T", short: "3 étapes / numéro", icon: "3×", hint: "Simple, Double puis Triple avant d’avancer.", tone: "#ff6fb5" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ✅ Styles locaux (1 seule fois) : halo + scrollbar hidden */}
      <style>{`
        @keyframes dcClockGlow {
          0% { transform: rotate(0deg); opacity: .65; }
          50% { opacity: .95; }
          100% { transform: rotate(360deg); opacity: .65; }
        }

        /* ✅ Cache scrollbar du carrousel joueurs (supprime la barre jaune qui clignote) */
        .dcPlayerCarousel {
          scrollbar-width: none;         /* Firefox */
          -ms-overflow-style: none;      /* IE/Edge legacy */
        }
        .dcPlayerCarousel::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;                 /* Chrome/Safari */
        }
      `}</style>

      <div
        style={{
          borderRadius: 20,
          padding: 12,
          background: "linear-gradient(180deg,rgba(31,31,38,.98),rgba(9,9,13,.98))",
          border: "1px solid rgba(255,198,58,.28)",
          boxShadow: "0 10px 24px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.4, color: "#ffc63a", fontWeight: 900 }}>CONFIGURATION GUIDÉE</div>
            <div style={{ fontSize: 16, fontWeight: 1000, marginTop: 2 }}>Prépare ta session</div>
          </div>
          <div style={{ borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 900, border: "1px solid rgba(255,198,58,.45)", color: "#ffc63a", background: "rgba(255,198,58,.08)" }}>
            {players.length || 0}/4 joueur{players.length > 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {["1 · JOUEURS", "2 · VARIANTE", "3 · OPTIONS"].map((label, index) => (
            <div key={label} style={{ borderRadius: 11, padding: "7px 5px", textAlign: "center", fontSize: 9, fontWeight: 900, color: index === 0 || players.length ? "#f6d680" : "rgba(255,255,255,.42)", border: `1px solid ${index === 0 || players.length ? "rgba(255,198,58,.32)" : "rgba(255,255,255,.08)"}`, background: index === 0 || players.length ? "rgba(255,198,58,.07)" : "rgba(255,255,255,.025)" }}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* JOUEURS */}
      <section
        className="card"
        style={{
          borderRadius: 18,
          padding: 14,
          marginTop: 2,
          background:
            "linear-gradient(180deg, rgba(25,25,30,.98), rgba(5,5,8,.98))",
          border: "1px solid rgba(255,255,255,.10)",
          boxShadow: "0 0 16px rgba(0,0,0,.7)",
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
          Joueurs
        </h2>

        <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 10 }}>
          Sélectionne 1 à 4 joueurs. Chaque joueur jouera une session à la suite.
        </div>

        {profiles.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Aucun profil pour l&apos;instant. Crée un profil dans l&apos;onglet
            &quot;Profils&quot; pour enregistrer tes stats.
          </div>
        ) : (
          <div
            className="dcPlayerCarousel"
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              overflowY: "hidden", // ✅ IMPORTANT : supprime la barre verticale
              paddingBottom: 6,
              paddingRight: 6,
              WebkitOverflowScrolling: "touch",
              alignItems: "flex-start",
            }}
          >
            {profiles.map((p) => {
              const selected = selectedPlayerIds.includes(p.id);
              const name = p.nickname ?? p.name ?? "Joueur";
              const initials = initialsFromName(name);

              return (
                <button
                  key={p.id}
                  type="button"
                  title={name}
                  onClick={() => {
                    setSelectedPlayerIds((prev) => {
                      const exists = prev.includes(p.id);
                      if (exists) {
                        if (prev.length === 1) return prev; // jamais 0
                        return prev.filter((id) => id !== p.id);
                      }
                      if (prev.length >= 4) return prev;
                      return [...prev, p.id];
                    });
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    flex: "0 0 auto",
                    width: 72, // ✅ tuile fixe -> carrousel 1 ligne
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      position: "relative",
                      margin: "0 auto",
                    }}
                  >
                    {/* ✅ AURA UNIQUEMENT (pas d’anneau jaune/noir) */}
                    {selected && (
                      <div
                        style={{
                          position: "absolute",
                          inset: -10,
                          borderRadius: "50%",
                          background:
                            "conic-gradient(from 180deg, rgba(255,198,58,0), rgba(255,198,58,.40), rgba(255,79,216,.22), rgba(255,198,58,0))",
                          filter: "blur(12px)",
                          animation: "dcClockGlow 1.6s linear infinite",
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {/* ✅ Médaillon SANS anneaux (bord constant) */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: "#111",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(255,255,255,.14)", // constant
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
                        filter: selected ? "none" : "grayscale(1)",
                        opacity: selected ? 1 : 0.35,
                      }}
                    >
                      {p.avatarDataUrl ? (
                        <img
                          src={p.avatarDataUrl}
                          alt={name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#f5f5f5",
                          }}
                        >
                          {initials}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      textAlign: "center",
                      opacity: selected ? 0.95 : 0.55,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {name}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Infos résumé joueurs */}
      <div
        style={{
          alignSelf: "flex-start",
          borderRadius: 999,
          border: "1px solid rgba(255,198,58,.45)",
          padding: "4px 10px",
          fontSize: 11,
          background:
            "linear-gradient(180deg, rgba(50,40,20,.95), rgba(20,14,6,.98))",
          boxShadow: "0 0 12px rgba(255,198,58,.4)",
        }}
      >
        {isMulti
          ? `${players.length} joueurs sélectionnés`
          : `Mode solo • ${players[0]?.name ?? "Joueur solo"}`}
      </div>

      {/* Choix du mode */}
      <section
        className="card"
        style={{
          borderRadius: 18,
          padding: 14,
          background:
            "linear-gradient(180deg, rgba(25,25,30,.98), rgba(5,5,8,.98))",
          border: "1px solid rgba(255,255,255,.10)",
          boxShadow: "0 0 16px rgba(0,0,0,.7)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: "#ffc63a", color: "#111", fontSize: 11, fontWeight: 1000 }}>2</span>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 900, margin: 0 }}>Variante de jeu</h2>
            <div style={{ fontSize: 10, opacity: .65, marginTop: 1 }}>Choisis la difficulté et le type de segment attendu.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          {(["classic", "doubles", "triples", "sdt"] as ClockMode[]).map((mode) => {
            const active = config.mode === mode;
            const meta = modeMeta[mode];
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setConfig((c) => ({ ...c, mode }))}
                style={{
                  minHeight: 112,
                  padding: 10,
                  textAlign: "left",
                  borderRadius: 16,
                  border: `1px solid ${active ? meta.tone : "rgba(255,255,255,.12)"}`,
                  background: active
                    ? `radial-gradient(circle at 0% 0%, ${meta.tone}33, transparent 60%), linear-gradient(180deg,#24242b,#0c0c11)`
                    : "linear-gradient(180deg,rgba(31,31,37,.96),rgba(10,10,14,.98))",
                  color: "#f7f7fa",
                  boxShadow: active ? `0 0 18px ${meta.tone}44, inset 0 1px 0 rgba(255,255,255,.08)` : "inset 0 1px 0 rgba(255,255,255,.04)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 22, lineHeight: 1, color: meta.tone, fontWeight: 1000, textShadow: `0 0 12px ${meta.tone}` }}>{meta.icon}</span>
                  <span style={{ width: 18, height: 18, borderRadius: 999, border: `1px solid ${active ? meta.tone : "rgba(255,255,255,.2)"}`, display: "grid", placeItems: "center", color: meta.tone, fontSize: 10 }}>{active ? "✓" : ""}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 1000, color: active ? meta.tone : "#fff" }}>{meta.title}</div>
                <div style={{ marginTop: 2, fontSize: 10, fontWeight: 800, opacity: .88 }}>{meta.short}</div>
                <div style={{ marginTop: 5, fontSize: 9.5, lineHeight: 1.25, opacity: .58 }}>{meta.hint}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Options timer / limite fléchettes */}
      <section
        className="card"
        style={{
          borderRadius: 18,
          padding: 14,
          background:
            "linear-gradient(180deg, rgba(25,25,30,.98), rgba(5,5,8,.98))",
          border: "1px solid rgba(255,255,255,.10)",
          boxShadow: "0 0 16px rgba(0,0,0,.7)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: "#ffc63a", color: "#111", fontSize: 11, fontWeight: 1000 }}>3</span>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 900, margin: 0 }}>Options de session</h2>
            <div style={{ fontSize: 10, opacity: .65, marginTop: 1 }}>Ajuste le chrono et la limite de fléchettes.</div>
          </div>
        </div>

        {/* Timer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 13 }}>Afficher le timer</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              Chrono visible pendant la session
            </div>
          </div>

          <button
            type="button"
            className={"chip " + (config.showTimer ? "chip-active" : "")}
            style={{
              fontSize: 12,
              minWidth: 64,
              background: config.showTimer
                ? "linear-gradient(180deg,#ffc63a,#ffaf00)"
                : "linear-gradient(180deg, rgba(40,40,46,.95), rgba(18,18,24,.98))",
              color: config.showTimer ? "#111" : "#f5f5f5",
              borderColor: config.showTimer
                ? "rgba(0,0,0,.45)"
                : "rgba(255,255,255,.22)",
              boxShadow: config.showTimer
                ? "0 0 10px rgba(255,198,58,.55)"
                : "none",
            }}
            onClick={() => setConfig((c) => ({ ...c, showTimer: !c.showTimer }))}
          >
            {config.showTimer ? "Oui" : "Non"}
          </button>
        </div>

        {/* Limite de fléchettes */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 13 }}>Limite de fléchettes</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              Par joueur : 0 = illimité, sinon fin auto quand la limite est atteinte
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 190 }}>
            {[0, 30, 60, 90, 120].map((limit) => {
              const active = (config.dartLimit ?? 0) === limit;
              return (
                <button
                  key={limit}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, dartLimit: limit > 0 ? limit : null }))}
                  style={{
                    minWidth: 42,
                    height: 30,
                    borderRadius: 10,
                    border: `1px solid ${active ? "#ffc63a" : "rgba(255,255,255,.14)"}`,
                    background: active ? "linear-gradient(180deg,#ffc63a,#ffad00)" : "linear-gradient(180deg,#303139,#17181e)",
                    color: active ? "#111" : "#f5f5f5",
                    fontSize: 10,
                    fontWeight: 900,
                    boxShadow: active ? "0 0 10px rgba(255,198,58,.45)" : "none",
                  }}
                >
                  {limit === 0 ? "∞" : limit}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div
        style={{
          borderRadius: 18,
          padding: 12,
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr",
          gap: 8,
          background: "linear-gradient(180deg,rgba(255,198,58,.11),rgba(20,14,6,.42))",
          border: "1px solid rgba(255,198,58,.32)",
          boxShadow: "0 0 18px rgba(255,198,58,.10)",
        }}
      >
        <div>
          <div style={{ fontSize: 8.5, opacity: .58, textTransform: "uppercase", letterSpacing: .7 }}>Joueur(s)</div>
          <div style={{ marginTop: 3, fontSize: 11, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{players.map((p) => p.name).join(", ") || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 8.5, opacity: .58, textTransform: "uppercase", letterSpacing: .7 }}>Variante</div>
          <div style={{ marginTop: 3, fontSize: 11, fontWeight: 900, color: modeMeta[config.mode].tone }}>{modeMeta[config.mode].title}</div>
        </div>
        <div>
          <div style={{ fontSize: 8.5, opacity: .58, textTransform: "uppercase", letterSpacing: .7 }}>Limite</div>
          <div style={{ marginTop: 3, fontSize: 11, fontWeight: 900 }}>{config.dartLimit ? `${config.dartLimit} darts` : "Illimitée"}</div>
        </div>
      </div>

      {/* Bouton démarrer */}
      <button
        type="button"
        className="btn-primary"
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 18,
          fontSize: 15,
          fontWeight: 1000,
          letterSpacing: .6,
          marginTop: 2,
          background: players.length
            ? "linear-gradient(180deg,#ffc63a,#ffaf00)"
            : "linear-gradient(180deg,#555,#333)",
          color: players.length ? "#111" : "#888",
          border: "1px solid rgba(0,0,0,.9)",
          boxShadow: players.length ? "0 0 16px rgba(255,198,58,.6)" : "none",
        }}
        onClick={onStart}
        disabled={!players.length}
      >
        ▶ DÉMARRER LA SESSION
      </button>

      {/* Historique en bas */}
      {history.length > 0 && (
        <section style={{ marginTop: 6 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            Dernières sessions
          </h2>
          <HistoryList history={history.slice(0, 5)} />
        </section>
      )}
    </div>
  );
}

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
                {isMulti
                  ? `Joueur ${currentPlayerIndex + 1}/${
                      players.length
                    }`
                  : "Mode solo"}
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
          Joueur :{" "}
          <strong>{lastSession.profileName}</strong>
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
            {players[currentPlayerIndex + 1]?.name ?? ""}
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
