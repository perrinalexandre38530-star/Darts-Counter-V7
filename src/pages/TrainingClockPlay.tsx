// ============================================
// src/pages/TrainingClockPlay.tsx
// Training — Tour de l'horloge (multi-joueurs)
// - Header "Training" + "Tour de l'horloge" (bouton doré avec "i")
// - Médaillon joueur avec halo doré (sans bande noire)
// - Timer INDÉPENDANT par joueur (cumulé par joueur)
// - Boutons MISS / BULL / Simple / Double / Triple stylés comme la maquette
// - Pastilles S1 / S20 / etc. style capsule jaune
// - Compteur "Fléchettes : X / Y" si une limite est définie
// ============================================

import React from "react";
import type { Profile } from "../lib/types";
import { playSound } from "../lib/sound";

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

type Mult = "S" | "D" | "T";

type DartInput =
  | { kind: "MISS" }
  | { kind: "HIT"; target: Target; mult: Mult };

type PlayerClockState = {
  profile: Profile;
  targetIndex: number; // 0..TARGETS.length
  dartsThrown: number;
  hits: number;
  timerSec: number;
  lastValidTargetIndex: number | null;
  isDone: boolean;
};

type TrainingClockPlayProps = {
  players: Profile[];        // joueurs sélectionnés
  config: ClockConfig;
  onExit: () => void;        // bouton "Annuler"
};

const NAV_HEIGHT = 64;
const CONTENT_MAX = 520;

// ---------- helpers UI ----------

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatTargetLabel(t: Target | null): string {
  if (t === null) return "-";
  if (t === "BULL") return "BULL";
  return String(t);
}

function formatObjectiveLabel(t: Target | null, mult: Mult | null): string {
  if (!t) return "-";
  if (t === "BULL") return "BULL";
  if (!mult || mult === "S") return `S${t}`;
  if (mult === "D") return `D${t}`;
  return `T${t}`;
}

// ---------- composant principal ----------

const TrainingClockPlay: React.FC<TrainingClockPlayProps> = ({
  players,
  config,
  onExit,
}) => {
  const [playerStates, setPlayerStates] = React.useState<PlayerClockState[]>(
    () =>
      players.map((p) => ({
        profile: p,
        targetIndex: 0,
        dartsThrown: 0,
        hits: 0,
        timerSec: 0,
        lastValidTargetIndex: null,
        isDone: false,
      }))
  );

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [dartsInTurn, setDartsInTurn] = React.useState(0);

  const [selectedNumber, setSelectedNumber] =
    React.useState<Target | null>(null);
  const [selectedMult, setSelectedMult] = React.useState<Mult>("S");
  const [specialKind, setSpecialKind] = React.useState<"MISS" | "BULL" | null>(
    null
  );

  const [lastThrows, setLastThrows] = React.useState<
    { playerId: string; label: string }[]
  >([]);

  const activePlayer = playerStates[activeIndex];
  const currentTarget: Target | null =
    TARGETS[activePlayer?.targetIndex] ?? null;

  const currentObjectiveLabel = formatObjectiveLabel(
    currentTarget,
    config.mode === "classic" ? selectedMult : selectedMult
  );

  const lastValidatedTarget =
    activePlayer.lastValidTargetIndex != null
      ? TARGETS[activePlayer.lastValidTargetIndex]
      : null;

  const everyoneDone = playerStates.every((p) => p.isDone);

  // ----- timer indépendant par joueur -----

  React.useEffect(() => {
    if (!config.showTimer) return;
    if (!activePlayer || activePlayer.isDone) return;

    const id = window.setInterval(() => {
      setPlayerStates((prev) =>
        prev.map((p, idx) =>
          idx === activeIndex && !p.isDone
            ? { ...p, timerSec: p.timerSec + 1 }
            : p
        )
      );
    }, 1000);

    return () => window.clearInterval(id);
  }, [activeIndex, config.showTimer, activePlayer?.isDone]);

  // ----- changement de joueur toutes les 3 fléchettes -----

  const goToNextPlayer = React.useCallback(() => {
    setDartsInTurn(0);

    setActiveIndex((prevIndex) => {
      const n = playerStates.length;
      if (n <= 1) return prevIndex;

      // chercher le prochain joueur NON terminé
      for (let offset = 1; offset <= n; offset++) {
        const candidate = (prevIndex + offset) % n;
        if (!playerStates[candidate].isDone) {
          return candidate;
        }
      }
      return prevIndex;
    });
  }, [playerStates.length, playerStates]);

  // ----- logique d'application d'une fléchette -----

  function applyDartToPlayer(
    state: PlayerClockState,
    dart: DartInput
  ): PlayerClockState {
    const dartLimit = config.dartLimit;

    const nextState: PlayerClockState = {
      ...state,
      dartsThrown: state.dartsThrown + 1,
    };

    const neededTarget = TARGETS[state.targetIndex];

    let isHit = false;

    if (dart.kind === "MISS") {
      isHit = false;
    } else {
      const { target, mult } = dart;

      if (target === neededTarget) {
        switch (config.mode) {
          case "classic":
            isHit = true; // peu importe le multiplicateur
            break;
          case "doubles":
            isHit = mult === "D";
            break;
          case "triples":
            isHit = mult === "T";
            break;
          case "sdt":
            isHit = mult !== "S"; // double ou triple
            break;
          default:
            isHit = false;
        }
      }
    }

    if (isHit) {
      nextState.hits = state.hits + 1;
      nextState.lastValidTargetIndex = state.targetIndex;
      if (state.targetIndex < TARGETS.length - 1) {
        nextState.targetIndex = state.targetIndex + 1;
      } else {
        // BULL validée → joueur terminé
        nextState.isDone = true;
      }
    }

    // limite de fléchettes
    if (dartLimit != null && nextState.dartsThrown >= dartLimit) {
      nextState.isDone = true;
    }

    return nextState;
  }

  function handleValidate() {
    if (!activePlayer || everyoneDone) return;

    let dart: DartInput | null = null;

    if (specialKind === "MISS") {
      dart = { kind: "MISS" };
    } else if (specialKind === "BULL") {
      dart = { kind: "HIT", target: "BULL", mult: "S" };
    } else if (selectedNumber != null) {
      dart = { kind: "HIT", target: selectedNumber, mult: selectedMult };
    }

    if (!dart) return;

    playSound("btn");

    setPlayerStates((prev) =>
      prev.map((p, idx) =>
        idx === activeIndex ? applyDartToPlayer(p, dart!) : p
      )
    );

    const label =
      dart.kind === "MISS"
        ? "MISS"
        : `${dart.kind === "HIT" ? dart.mult : ""}${formatTargetLabel(
            dart.kind === "HIT" ? dart.target : null
          )}`;

    setLastThrows((prev) => {
      const next = [
        {
          playerId: activePlayer.profile.id,
          label,
        },
        ...prev,
      ];
      return next.slice(0, 6); // garder les 6 derniers
    });

    setDartsInTurn((prev) => {
      const next = prev + 1;
      if (next >= 3 || playerStates[activeIndex].isDone) {
        // tour terminé
        goToNextPlayer();
        return 0;
      }
      return next;
    });

    // reset sélection
    setSelectedNumber(null);
    setSpecialKind(null);
  }

  function handleSelectNumber(n: number) {
    setSpecialKind(null);
    setSelectedNumber(n);
  }

  function handleSelectBull() {
    setSpecialKind("BULL");
    setSelectedNumber("BULL");
  }

  function handleSelectMiss() {
    setSpecialKind("MISS");
    setSelectedNumber(null);
  }

  function handleSelectMult(mult: Mult) {
    setSelectedMult(mult);
  }

  const dartsLimit = config.dartLimit;
  const showDartCounter = dartsLimit != null;

  const objectiveText = currentTarget
    ? `Objectif : ${formatObjectiveLabel(
        currentTarget,
        config.mode === "classic" ? "S" : config.mode === "doubles"
          ? "D"
          : config.mode === "triples"
          ? "T"
          : selectedMult
      )}`
    : "Objectif : -";

  // ---------------- RENDER ----------------

  return (
    <div className="training-clock-root">
      {/* HEADER */}
      <div
        className="training-clock-header"
        style={{ height: NAV_HEIGHT }}
      >
        <button
          className="tc-pill-small"
          type="button"
          onClick={onExit}
        >
          Training
        </button>

        <button className="tc-pill-main" type="button">
          <span className="tc-pill-main-label">Tour de l&apos;horloge</span>
          <span className="tc-pill-main-info">i</span>
        </button>
      </div>

      <div className="training-clock-content-wrapper">
        <div className="training-clock-content" style={{ maxWidth: CONTENT_MAX }}>
          {/* Bloc joueur + stats haut */}
          <div className="tc-top-row">
            <div className="tc-player-info">
              <div className="tc-avatar-halo">
                {/* adapte si ton Profile a un champ différent pour l'avatar */}
                {/* @ts-ignore */}
                <img
                  src={(activePlayer.profile as any).avatarUrl || (activePlayer.profile as any).avatar || ""}
                  alt={activePlayer.profile.name}
                  className="tc-avatar-img"
                />
              </div>
              <div className="tc-player-text">
                <div className="tc-player-name">{activePlayer.profile.name}</div>
                <div className="tc-mode-chip">Mode solo</div>
              </div>
            </div>

            <div className="tc-session-info">
              <div className="tc-session-line">
                <span className="tc-session-label">Temps</span>
                <span className="tc-session-value">
                  {config.showTimer ? formatTime(activePlayer.timerSec) : "--:--"}
                </span>
              </div>
              <div className="tc-session-line">
                <span className="tc-session-label">Objectif</span>
                <span className="tc-session-value tc-objective-pill">
                  {objectiveText}
                </span>
              </div>
              {showDartCounter && (
                <div className="tc-session-line">
                  <span className="tc-session-label">Fléchettes</span>
                  <span className="tc-session-value">
                    {activePlayer.dartsThrown} / {dartsLimit}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Derniers lancers (centrés sous le header) */}
          <div className="tc-last-throws">
            {lastThrows.length === 0 ? (
              <span className="tc-last-empty">Derniers lancers</span>
            ) : (
              lastThrows.map((t, idx) => (
                <span key={idx} className="tc-last-pill">
                  {t.label}
                </span>
              ))
            )}
          </div>

          {/* Keypad + MISS / BULL */}
          <div className="tc-keypad-card">
            <div className="tc-keypad-top-row">
              <button
                type="button"
                className={
                  "tc-miss-btn" + (specialKind === "MISS" ? " is-active" : "")
                }
                onClick={handleSelectMiss}
              >
                MISS
              </button>
              <button
                type="button"
                className={
                  "tc-bull-btn" + (specialKind === "BULL" ? " is-active" : "")
                }
                onClick={handleSelectBull}
              >
                BULL
              </button>
            </div>

            <div className="tc-keypad-grid">
              {TARGETS.slice(0, 20).map((n) => (
                <button
                  key={n as number}
                  type="button"
                  className={
                    "tc-keypad-number" +
                    (selectedNumber === n && specialKind === null
                      ? " is-active"
                      : "")
                  }
                  onClick={() => handleSelectNumber(n as number)}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Multiplicateurs */}
            <div className="training-multipliers">
              <button
                type="button"
                className={
                  "mult-btn mult-simple" +
                  (selectedMult === "S" && specialKind !== "BULL"
                    ? " is-active"
                    : "")
                }
                onClick={() => handleSelectMult("S")}
              >
                SIMPLE
              </button>
              <button
                type="button"
                className={
                  "mult-btn mult-double" +
                  (selectedMult === "D" && specialKind !== "BULL"
                    ? " is-active"
                    : "")
                }
                onClick={() => handleSelectMult("D")}
              >
                DOUBLE
              </button>
              <button
                type="button"
                className={
                  "mult-btn mult-triple" +
                  (selectedMult === "T" && specialKind !== "BULL"
                    ? " is-active"
                    : "")
                }
                onClick={() => handleSelectMult("T")}
              >
                TRIPLE
              </button>
            </div>

            {/* Boutons bas */}
            <div className="tc-bottom-buttons">
              <button type="button" className="tc-btn-cancel" onClick={onExit}>
                Annuler
              </button>
              <button
                type="button"
                className="tc-btn-validate"
                onClick={handleValidate}
                disabled={everyoneDone}
              >
                Valider la fléchette
              </button>
            </div>
          </div>

          {everyoneDone && (
            <div className="tc-session-ended">
              Session terminée pour tous les joueurs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingClockPlay;
