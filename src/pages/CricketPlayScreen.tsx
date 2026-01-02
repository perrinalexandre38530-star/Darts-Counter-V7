// ============================================
// src/pages/CricketPlayScreen.tsx
// Cricket — PLAY (UI + sons + logique)
// - Utilise cricketEngine hits + fin maxRounds
// - Sons: double/triple/bull/dbull/miss(bust) (fallback safe)
// ============================================

import React from "react";
import {
  applyCricketHit,
  undoLastCricketHit,
  CRICKET_TARGETS,
  type CricketTarget,
  type Multiplier,
  type RawTarget,
  type CricketState,
} from "../lib/cricketEngine";
import { playSound as playSoundRaw } from "../lib/sound";
import {
  DartIconColorizable,
  CricketMarkIcon,
} from "../components/MaskIcon";

const T = {
  bg: "#050712",
  card: "#121420",
  text: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.7)",
  gold: "#F6C256",
  borderSoft: "rgba(255,255,255,0.08)",
};

const ACCENTS = ["#fbbf24", "#f472b6", "#22c55e", "#38bdf8"];
const CRICKET_UI_TARGETS: CricketTarget[] = [15, 16, 17, 18, 19, 20, 25];

const TARGET_COLORS: Record<number, string> = {
  15: "#F6C256",
  16: "#fbbf24",
  17: "#fb923c",
  18: "#f97316",
  19: "#fb7185",
  20: "#ef4444",
  25: "#b91c1c",
};

function getTargetColor(target: CricketTarget): string {
  return TARGET_COLORS[target] ?? "#fef3c7";
}

function safePlaySound(key: string) {
  try {
    (playSoundRaw as any)?.(key);
  } catch {
    // no crash
  }
}

type HitMode = "S" | "D" | "T";

type Props = {
  state: CricketState;
  setState: (s: CricketState) => void;

  onQuit: () => void;
  onFinish: () => void; // appelé quand on veut ouvrir le résumé (parent gère)
};

export default function CricketPlayScreen({ state, setState, onQuit, onFinish }: Props) {
  const [hitMode, setHitMode] = React.useState<HitMode>("S");

  const currentPlayer =
    state && state.players[state.currentPlayerIndex]
      ? state.players[state.currentPlayerIndex]
      : null;

  const isFinished = !!state?.winnerId;

  const activeAccent = ACCENTS[state.currentPlayerIndex] ?? T.gold;

  const totalDartsPerTurn = 3;
  const thrown = Math.max(0, totalDartsPerTurn - (state.remainingDarts ?? 0));

  function playHitSound(target: RawTarget, mult: Multiplier) {
    // 0..14 = MISS -> user wants "bust" sound (reuse)
    const valid = CRICKET_TARGETS.includes(target as any);
    if (!valid) {
      safePlaySound("bust");
      return;
    }
    if (target === 25 && mult === 2) {
      safePlaySound("dbull");
      return;
    }
    if (target === 25 && mult === 1) {
      safePlaySound("bull");
      return;
    }
    if (mult === 3) {
      safePlaySound("triple");
      return;
    }
    if (mult === 2) {
      safePlaySound("double");
      return;
    }
    safePlaySound("ok");
  }

  function registerHit(target: RawTarget) {
    if (!state || !currentPlayer) return;
    if (state.winnerId) return;

    let mult: Multiplier = 1;
    if (hitMode === "D") mult = 2;
    if (hitMode === "T") mult = 3;

    const next = applyCricketHit(state, target, mult);
    setState(next);

    playHitSound(target, mult);

    // après saisie, on revient en simple si D/T
    if (hitMode === "D" || hitMode === "T") setHitMode("S");

    // fin auto: ouvrir le résumé
    if (next.winnerId) {
      // petit timeout pour laisser le son partir
      setTimeout(() => onFinish(), 120);
    }
  }

  function handleKeyPress(value: number) {
    registerHit(value as any);
  }

  function handleBull() {
    registerHit(25 as any);
  }

  function handleUndo() {
    const next = undoLastCricketHit(state);
    setState(next);
    safePlaySound("undo");
  }

  function marksFor(player: any, target: CricketTarget): number {
    return player?.marks?.[target] ?? 0;
  }

  function renderMarkCell(marks: number, color: string) {
    // 0..3 => icône marks; >3 => 3 marks + "+"
    const m = Math.max(0, marks);
    const display = m <= 3 ? m : 3;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
        <CricketMarkIcon marks={display} color={color} size={22} />
        {m > 3 ? (
          <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.8)" }}>
            +{m - 3}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
        color: T.text,
        padding: "14px 10px 110px",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          borderRadius: 16,
          background: "rgba(0,0,0,0.35)",
          border: `1px solid ${T.borderSoft}`,
          padding: "10px 12px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: T.textSoft, textTransform: "uppercase", letterSpacing: 1 }}>
            Tour {state.roundNumber}/{state.maxRounds} • {state.withPoints ? "Points" : "Sans points"}
          </div>
          <div style={{ marginTop: 2, fontSize: 16, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentPlayer?.name ?? "—"}{" "}
            <span style={{ color: activeAccent, textShadow: `0 0 18px ${activeAccent}55` }}>●</span>
          </div>
        </div>

        {/* 3 fléchettes */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {Array.from({ length: totalDartsPerTurn }).map((_, i) => {
            const active = i < thrown;
            return (
              <div
                key={i}
                style={{
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: active ? 1 : 0.35,
                }}
              >
                <DartIconColorizable color={activeAccent} active={active} size={28} />
              </div>
            );
          })}
        </div>
      </div>

      {/* TABLE */}
      <div
        style={{
          borderRadius: 18,
          background: T.card,
          border: `1px solid ${T.borderSoft}`,
          padding: 10,
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: `64px repeat(${state.players.length}, 1fr)`, gap: 8 }}>
          {/* header left */}
          <div style={{ color: T.textSoft, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", padding: "8px 0" }}>
            Target
          </div>

          {/* players headers */}
          {state.players.map((p, idx) => {
            const accent = ACCENTS[idx] ?? T.gold;
            const active = idx === state.currentPlayerIndex;
            return (
              <div
                key={p.id}
                style={{
                  textAlign: "center",
                  padding: "8px 0",
                  borderRadius: 12,
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  border: active ? `1px solid ${accent}55` : `1px solid transparent`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </div>
                {state.withPoints && (
                  <div style={{ marginTop: 2, fontSize: 12, fontWeight: 900, color: accent }}>
                    {p.score ?? 0}
                  </div>
                )}
              </div>
            );
          })}

          {/* rows 15..20 + bull */}
          {CRICKET_UI_TARGETS.map((tgt) => {
            const color = getTargetColor(tgt);
            return (
              <React.Fragment key={tgt}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 44,
                    borderRadius: 14,
                    background: "rgba(0,0,0,0.35)",
                    border: `1px solid ${T.borderSoft}`,
                    fontWeight: 1000,
                    color,
                    textShadow: `0 0 16px ${color}22`,
                  }}
                >
                  {tgt === 25 ? "BULL" : tgt}
                </div>

                {state.players.map((p, idx) => {
                  const accent = ACCENTS[idx] ?? T.gold;
                  const m = marksFor(p, tgt);
                  return (
                    <div
                      key={p.id + "_" + tgt}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 44,
                        borderRadius: 14,
                        border: `1px solid ${T.borderSoft}`,
                        background: "rgba(0,0,0,0.20)",
                      }}
                    >
                      {renderMarkCell(m, accent)}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* HIT MODE */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {(["S", "D", "T"] as const).map((m) => {
          const active = hitMode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setHitMode(m)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 14,
                border: active ? `1px solid ${T.gold}` : `1px solid ${T.borderSoft}`,
                background: active ? "rgba(246,194,86,0.14)" : "rgba(0,0,0,0.30)",
                color: active ? T.gold : T.textSoft,
                fontWeight: 1000,
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
              {m}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleUndo}
          style={{
            padding: "10px 12px",
            borderRadius: 14,
            border: `1px solid ${T.borderSoft}`,
            background: "rgba(0,0,0,0.30)",
            color: T.textSoft,
            fontWeight: 1000,
            cursor: "pointer",
          }}
        >
          UNDO
        </button>
      </div>

      {/* KEYPAD */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 80,
          padding: "10px 12px",
          background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.78) 100%)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${T.borderSoft}`,
            background: "rgba(10,15,28,0.88)",
            padding: 10,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
            }}
          >
            {/* 0..20 */}
            {Array.from({ length: 21 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleKeyPress(i)}
                disabled={isFinished}
                style={{
                  padding: "10px 0",
                  borderRadius: 14,
                  border: `1px solid ${T.borderSoft}`,
                  background: "rgba(0,0,0,0.35)",
                  color: i >= 15 ? "#fff" : "rgba(255,255,255,0.65)",
                  fontWeight: 1000,
                  cursor: isFinished ? "not-allowed" : "pointer",
                }}
              >
                {i}
              </button>
            ))}

            <button
              type="button"
              onClick={handleBull}
              disabled={isFinished}
              style={{
                gridColumn: "span 5",
                padding: "12px 0",
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(135deg,#ef4444,#b91c1c)",
                color: "#fff",
                fontWeight: 1100,
                letterSpacing: 1.2,
                cursor: isFinished ? "not-allowed" : "pointer",
              }}
            >
              BULL
            </button>

            <button
              type="button"
              onClick={onQuit}
              style={{
                gridColumn: "span 5",
                padding: "10px 0",
                borderRadius: 16,
                border: `1px solid ${T.borderSoft}`,
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.85)",
                fontWeight: 1000,
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
              QUITTER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
