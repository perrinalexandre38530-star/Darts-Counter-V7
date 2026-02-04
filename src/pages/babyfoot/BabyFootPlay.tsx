// =============================================================
// src/pages/babyfoot/BabyFootPlay.tsx
// Baby-Foot — Play (LOCAL ONLY) — V3
// - Goals + Undo
// - Chrono (règlementaire) + prolongation + tirs au but
// - Sets (BO3/BO5) + handicap + golden goal
// - ✅ onFinish(payload) compatible pushBabyFootHistory() in App.tsx
//   -> players[] (profile ids) + winnerId (profile id)
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

import {
  addGoal,
  addPenalty,
  computeDurationMs,
  finishByTime,
  loadBabyFootState,
  saveBabyFootState,
  undo as undoGoal,
  type BabyFootTeamId,
  type BabyFootState,
} from "../../lib/babyfootStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function BabyFootPlay({ go, onFinish }: Props) {
  const { theme } = useTheme();

  const [state, setState] = useState<BabyFootState>(() => loadBabyFootState());
  const [now, setNow] = useState<number>(Date.now());

  // scorer picker (goals / penalties)
  const [pick, setPick] = useState<{ kind: "goal" | "penalty"; team: BabyFootTeamId } | null>(null);

  // tick clock + auto finish by time
  useEffect(() => {
    const t = setInterval(() => {
      const ts = Date.now();
      setNow(ts);

      const current = loadBabyFootState();
      if (current.finished) return;

      const next = finishByTime(ts);
      if (next.updatedAt !== current.updatedAt || next.phase !== current.phase || next.finished !== current.finished) {
        setState(next);
        saveBabyFootState(next);
      }
    }, 250);

    return () => clearInterval(t);
  }, []);

  // keep state fresh on focus
  useEffect(() => {
    const onFocus = () => setState(loadBabyFootState());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const teamAIds = state.teamAProfileIds || [];
  const teamBIds = state.teamBProfileIds || [];
  const players = useMemo(() => {
    const ids = [...teamAIds, ...teamBIds].filter(Boolean);
    return ids.map((id) => ({ id }));
  }, [teamAIds.join("|"), teamBIds.join("|")]);

  const durationMs = useMemo(() => computeDurationMs(state), [state.startedAt, state.finishedAt, now, state.updatedAt]);

  const chronoOn = !!state.matchDurationSec;
  const isOT = state.phase === "overtime";
  const isPens = state.phase === "penalties";

  function finishIfNeeded(next: BabyFootState) {
    if (!next.finished || !next.winner) return;

    const winnerTeamIds = next.winner === "A" ? next.teamAProfileIds : next.teamBProfileIds;
    const winnerId = (winnerTeamIds && winnerTeamIds[0]) || null;

    const payload: any = {
      id: next.matchId,
      matchId: next.matchId,
      createdAt: next.createdAt,
      updatedAt: next.updatedAt,
      kind: "babyfoot",
      sport: "babyfoot",

      teamA: next.teamA,
      teamB: next.teamB,
      mode: next.mode,

      // scoring
      target: next.target,
      setsBestOf: next.setsBestOf,
      setTarget: next.setTarget,
      setsWonA: next.setsWonA,
      setsWonB: next.setsWonB,
      setResults: next.setResults || [],

      handicapA: next.handicapA,
      handicapB: next.handicapB,
      goldenGoal: next.goldenGoal,

      // timer
      matchDurationSec: next.matchDurationSec,
      overtimeSec: next.overtimeSec,

      scoreA: next.scoreA,
      scoreB: next.scoreB,
      winnerTeam: next.winner,

      players,
      winnerId,

      phase: next.phase,
      penA: next.penA,
      penB: next.penB,

      events: next.events || [],
      durationMs: computeDurationMs(next),

      summary: {
        scoreA: next.scoreA,
        scoreB: next.scoreB,
        teamA: next.teamA,
        teamB: next.teamB,
        winnerTeam: next.winner,
        durationMs: computeDurationMs(next),
        setsBestOf: next.setsBestOf,
        setsWonA: next.setsWonA,
        setsWonB: next.setsWonB,
        penA: next.penA,
        penB: next.penB,
      },
    };

    onFinish?.(payload);
    go("babyfoot_stats_history");
  }

  function apply(next: BabyFootState) {
    setState(next);
    saveBabyFootState(next);
    finishIfNeeded(next);
  }

  function chooseScorer(team: BabyFootTeamId, kind: "goal" | "penalty") {
    const ids = team === "A" ? teamAIds : teamBIds;
    if (ids.length <= 1) {
      if (kind === "goal") apply(addGoal(team, ids[0] ?? null));
      else apply(addPenalty(team, ids[0] ?? null));
      return;
    }
    setPick({ team, kind });
  }

  function onPickScorer(id: string) {
    const ctx = pick;
    if (!ctx) return;
    setPick(null);
    if (ctx.kind === "goal") apply(addGoal(ctx.team, id));
    else apply(addPenalty(ctx.team, id));
  }

  function onUndo() {
    const next = undoGoal();
    setState(next);
    saveBabyFootState(next);
  }

  const setsEnabled = state.setsBestOf === 3 || state.setsBestOf === 5;
  const setsNeed = setsEnabled ? Math.floor(state.setsBestOf / 2) + 1 : 0;

  // remaining time (regulation)
  const remainingSec = useMemo(() => {
    if (!chronoOn || !state.startedAt || state.finished) return null;
    const dur = clamp(state.matchDurationSec || 0, 0, 3600);
    const elapsed = Math.floor((now - state.startedAt) / 1000);
    return Math.max(0, dur - elapsed);
  }, [chronoOn, state.matchDurationSec, state.startedAt, state.finished, now]);

  // remaining time OT
  const otRemainingSec = useMemo(() => {
    if (!isOT || !state.overtimeStartedAt || state.finished) return null;
    const dur = clamp(state.overtimeSec || 0, 0, 600);
    const elapsed = Math.floor((now - state.overtimeStartedAt) / 1000);
    return Math.max(0, dur - elapsed);
  }, [isOT, state.overtimeSec, state.overtimeStartedAt, state.finished, now]);

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("babyfoot_menu")} />
        <div style={topTitle}>BABY-FOOT — PLAY</div>
        <InfoDot
          title="Baby-foot"
          body="Goals • Undo • Chrono • OT • Penalties • Sets"
          glow={theme.primary + "88"}
        />
      </div>

      {/* header match */}
      <div style={header(theme)}>
        <div style={rowTeam}>
          <div style={teamName}>{state.teamA}</div>
          <div style={score(theme)}>{state.scoreA}</div>
          <button onClick={() => chooseScorer("A", isPens ? "penalty" : "goal")} style={btnPlus(theme, "A", isPens)}>
            {isPens ? "+ PEN" : "+ BUT"}
          </button>
        </div>

        <div style={midBox}>
          <div style={midTitle(theme)}>
            {state.goldenGoal ? "GOLDEN GOAL" : setsEnabled ? `SETS BO${state.setsBestOf}` : `TARGET ${state.target}`}
          </div>

          {setsEnabled && (
            <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
              <div style={setsPill(theme, state.setsWonA)}>{state.setsWonA}</div>
              <div style={{ fontWeight: 1000, opacity: 0.8 }}>SETS</div>
              <div style={setsPill(theme, state.setsWonB)}>{state.setsWonB}</div>
            </div>
          )}

          {chronoOn && (
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <div style={{ fontWeight: 1000, letterSpacing: 0.7, color: theme.primary }}>
                {isOT ? "OVERTIME" : "CHRONO"}
              </div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 1000 }}>
                {isOT ? `${String(otRemainingSec ?? 0).padStart(2, "0")}` : fmt(durationMs)}
              </div>
              {!isOT && remainingSec !== null && (
                <div style={{ marginTop: 2, fontSize: 12, color: theme.textSoft, fontWeight: 900 }}>
                  Temps restant : {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
                </div>
              )}
              {isOT && otRemainingSec !== null && (
                <div style={{ marginTop: 2, fontSize: 12, color: theme.textSoft, fontWeight: 900 }}>
                  OT restant : {Math.floor(otRemainingSec / 60)}:{String(otRemainingSec % 60).padStart(2, "0")}
                </div>
              )}
            </div>
          )}

          {isPens && (
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <div style={{ fontWeight: 1000, letterSpacing: 0.7, color: theme.primary }}>TIRS AU BUT</div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 1000 }}>
                {state.penA} — {state.penB}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: theme.textSoft, fontWeight: 900 }}>
                Manche : {state.penRound}
              </div>
            </div>
          )}
        </div>

        <div style={rowTeam}>
          <div style={teamName}>{state.teamB}</div>
          <div style={score(theme)}>{state.scoreB}</div>
          <button onClick={() => chooseScorer("B", isPens ? "penalty" : "goal")} style={btnPlus(theme, "B", isPens)}>
            {isPens ? "+ PEN" : "+ BUT"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={onUndo} style={btnSecondary(theme)}>
          ANNULER
        </button>
        <button
          onClick={() => {
            // manual finish: winner by score or go penalties if tie
            const current = loadBabyFootState();
            if (current.finished) return;
            const ts = Date.now();
            const next = finishByTime(ts); // this will handle OT/penalties if chrono enabled
            setState(next);
            saveBabyFootState(next);
          }}
          style={btnSecondary(theme)}
        >
          CHECK
        </button>
      </div>

      {/* picker scorer (team has 2 profiles) */}
      {pick && (
        <div
          onClick={() => setPick(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: theme.card,
              padding: 16,
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              color: theme.text,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 1000, fontSize: 16 }}>
                {pick.kind === "goal" ? "But marqué par…" : "Tir au but par…"} (TEAM {pick.team})
              </div>
              <button onClick={() => setPick(null)} style={btnTiny(theme)}>
                X
              </button>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(pick.team === "A" ? teamAIds : teamBIds).map((id) => (
                <button key={id} onClick={() => onPickScorer(id)} style={btnPick(theme)}>
                  {id.slice(0, 8)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function wrap(theme: any) {
  return { minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text };
}

const topRow: any = { display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10, marginBottom: 12 };
const topTitle: any = { textAlign: "center", fontWeight: 950, letterSpacing: 1, opacity: 0.95 };

function header(theme: any) {
  return {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
    background: theme.card,
    padding: 14,
    boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
    display: "grid",
    gridTemplateColumns: "1fr 1.4fr 1fr",
    gap: 10,
    alignItems: "stretch",
  };
}

const rowTeam: any = { display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8 };
const teamName: any = { fontWeight: 1000, letterSpacing: 0.6, opacity: 0.95 };
function score(theme: any) {
  return { fontSize: 34, fontWeight: 1000, color: theme.primary, textShadow: `0 0 12px ${theme.primary}55` };
}
function btnPlus(theme: any, team: "A" | "B", isPens: boolean) {
  const tint = team === "A" ? "rgba(0,200,255,0.18)" : "rgba(255,120,190,0.16)";
  return {
    padding: "12px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: tint,
    color: theme.text,
    fontWeight: 1000,
    cursor: "pointer",
  };
}
const midBox: any = { display: "flex", flexDirection: "column", justifyContent: "center", padding: "4px 6px" };
function midTitle(theme: any) {
  return { textAlign: "center", fontWeight: 1000, letterSpacing: 0.9, color: theme.textSoft };
}
function setsPill(theme: any, v: number) {
  return {
    minWidth: 44,
    textAlign: "center" as const,
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${theme.primary}55`,
    background: `${theme.primary}12`,
    color: theme.primary,
    fontWeight: 1000,
  };
}
function btnSecondary(theme: any) {
  return {
    flex: 1,
    padding: "12px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: theme.text,
    fontWeight: 1000,
    cursor: "pointer",
  };
}
function btnTiny(theme: any) {
  return {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: theme.text,
    fontWeight: 900,
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
  };
}
function btnPick(theme: any) {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
    background: "rgba(0,0,0,0.20)",
    color: theme.text,
    fontWeight: 1000,
    cursor: "pointer",
  };
}
