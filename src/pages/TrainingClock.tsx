// ============================================
// src/pages/TrainingClock.tsx
// Training — Tour de l'horloge (v5, multi-joueurs)
// - Choix de 1+ joueurs via médaillons d'avatars
// - Chaque joueur joue sa session à la suite
// - Historique local par session (localStorage)
// ============================================

import React from "react";
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

type ClockSession = {
  id: string;
  profileId: string | null;
  profileName: string;
  config: ClockConfig;
  startedAt: string;
  endedAt: string;
  dartsThrown: number;
  hits: number;
  completed: boolean;
  elapsedMs: number;
  bestStreak: number;
};

const STORAGE_KEY = "dc-training-clock-v1";

type PlayerLite = { id: string | null; name: string };

type Props = {
  profiles?: Profile[];
  activeProfileId?: string | null;
  go?: (tab: any, params?: any) => void; // ✅ NEW
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

// ============================================
// Component principal
// ============================================

const TrainingClock: React.FC<Props> = (props) => {
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


  // Charger historique local au mount
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ClockSession[];
      setHistory(parsed);
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
      const next = [session, ...history].slice(0, 50);
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
    setCurrentStreak(0);
    setBestStreak(0);
    setStartTime(null);
    setEndTime(null);
    setSelectedValue(1);
    setSelectedMult(1);
    setIsMiss(false);
    setLastThrows([]);
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

  function finishSessionForCurrentPlayer(completed: boolean) {
    const player = currentPlayer;
    const now = Date.now();
    setEndTime(now);

    const elapsed =
      startTime != null ? Math.max(0, now - startTime) : 0;

    const session: ClockSession = {
      id: generateId(),
      profileId: player?.id ?? null,
      profileName: player?.name ?? "Joueur solo",
      config,
      startedAt:
        startTime != null
          ? new Date(startTime).toISOString()
          : new Date().toISOString(),
      endedAt: new Date(now).toISOString(),
      dartsThrown,
      hits,
      completed,
      elapsedMs: elapsed,
      bestStreak,
    };

    setLastSession(session);
    saveSessionToHistory(session);
    setStep("summary");
    playSound(completed ? "win" : "lose");
  }

  function handleThrow() {
    if (step !== "play") return;

    // limite de fléchettes (par joueur)
    if (config.dartLimit != null && dartsThrown >= config.dartLimit) {
      return;
    }

    const newDarts = dartsThrown + 1;
    setDartsThrown(newDarts);

    // enregistrer lancers pour la petite ligne d'historique
    const label = formatThrowLabel(isMiss, selectedValue, selectedMult);
    setLastThrows((prev) => {
      const next = [label, ...prev];
      return next.slice(0, 14);
    });

    if (isMiss || !selectedValue) {
      setCurrentStreak(0);
      playSound("miss");
    } else {
      const res = isHit(
        currentTarget,
        config.mode,
        selectedValue,
        selectedMult,
        stageSDT
      );

      if (res.hit) {
        const newHits = hits + 1;
        setHits(newHits);

        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }

        playSound("hit");

        if (res.nextStage !== undefined) {
          setStageSDT(res.nextStage);
        }

        if (res.advanceTarget) {
          // mémoriser le dernier objectif validé + temps
          if (startTime != null) {
            const elapsedAtObjective = Math.max(
              0,
              (endTime ?? Date.now()) - startTime
            );
            setLastObjectiveTimeMs(elapsedAtObjective);
            setLastObjectiveLabel(
              labelObjective(currentTarget, config, stageSDT)
            );
          }

          const nextIndex = currentTargetIndex + 1;
          if (nextIndex >= TARGETS.length) {
            setCurrentTargetIndex(nextIndex - 1);
            finishSessionForCurrentPlayer(true);
            return;
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

    // si limite atteinte -> fin de session pour ce joueur
    if (
      config.dartLimit != null &&
      newDarts >= config.dartLimit &&
      step === "play"
    ) {
      finishSessionForCurrentPlayer(false);
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
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          Mode de jeu
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(["classic", "doubles", "triples", "sdt"] as ClockMode[]).map(
            (mode) => {
              const active = config.mode === mode;

              const baseBg =
                "linear-gradient(180deg, rgba(32,32,38,.95), rgba(10,10,14,.98))";
              const activeBg =
                "linear-gradient(180deg, rgba(50,40,20,.95), rgba(20,14,6,.98))";

              return (
                <button
                  key={mode}
                  type="button"
                  className="chip w-full justify-between"
                  style={{
                    justifyContent: "space-between",
                    fontSize: 13,
                    background: active ? activeBg : baseBg,
                    color: "#f5f5f5",
                    borderColor: active ? "#ffc63a" : "rgba(255,255,255,.18)",
                    boxShadow: active ? "0 0 14px rgba(255,198,58,.45)" : "none",
                  }}
                  onClick={() => setConfig((c) => ({ ...c, mode }))}
                >
                  <span>{labelMode(mode)}</span>
                </button>
              );
            }
          )}
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
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          Options
        </h2>

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

          <select
            className="chip"
            style={{
              fontSize: 12,
              minWidth: 132,
              background:
                "linear-gradient(180deg, rgba(40,40,46,.95), rgba(18,18,24,.98))",
              borderColor: "rgba(255,255,255,.22)",
            }}
            value={config.dartLimit ?? 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              setConfig((c) => ({ ...c, dartLimit: v > 0 ? v : null }));
            }}
          >
            <option value={0}>Illimité</option>
            <option value={30}>30 fléchettes</option>
            <option value={60}>60 fléchettes</option>
            <option value={90}>90 fléchettes</option>
          </select>
        </div>
      </section>

      {/* Bouton démarrer */}
      <button
        type="button"
        className="btn-primary"
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 16,
          fontSize: 15,
          fontWeight: 700,
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
        Commencer la session
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
          Valider la fléchette
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
          Hits : <strong>{lastSession.hits}</strong>
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
              🎯 {s.hits} / {s.dartsThrown}
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
