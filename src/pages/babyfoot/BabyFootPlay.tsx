// =============================================================
// src/pages/babyfoot/BabyFootPlay.tsx
// Baby-Foot — Play (LOCAL ONLY)
// Objectif: UI "DartsCounter-like" (PageHeader ticker + cards glass + dock actions)
// ✅ Phases: play -> overtime -> penalties -> finished
// ✅ Options: chrono, overtime, golden goals, sets (BO), handicap
// ✅ Payload compatible pushBabyFootHistory() dans App.tsx
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useStore } from "../../contexts/StoreContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import ProfileAvatar from "../../components/ProfileAvatar";

import {
  addGoal,
  addPenaltyShot,
  computeDurationMs,
  finishByTime,
  loadBabyFootState,
  startIfNeeded,
  undo as undoGoal,
  type BabyFootTeamId,
  type BabyFootState,
} from "../../lib/babyfootStore";

// ✅ Tickers images (Vite)
const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function pickTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id).trim().toLowerCase();
  const candidates = Array.from(
    new Set([
      norm,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])
  ).filter(Boolean);

  for (const c of candidates) {
    const suffixA = `/ticker_${c}.png`;
    const suffixB = `/ticker-${c}.png`;
    for (const k of Object.keys(TICKERS)) {
      if (k.endsWith(suffixA) || k.endsWith(suffixB)) return TICKERS[k];
    }
  }
  return null;
}

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

function tourResultKey(tournamentId: any, matchId: any) {
  return `bf_tour_result_${String(tournamentId || "")}_${String(matchId || "")}`;
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function lastPhaseAt(s: BabyFootState, phase: string) {
  const ev = [...(s.events || [])].reverse().find((e: any) => e?.t === "phase" && e?.phase === phase);
  return ev?.at ?? null;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function teamChip(label: string, active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    border: active ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : "rgba(255,255,255,0.82)",
    fontWeight: 950,
    letterSpacing: 0.4,
    whiteSpace: "nowrap",
  };
}

export default function BabyFootPlay({ go, onFinish, params }: Props) {
  const { theme } = useTheme();
  const { store } = useStore() as any;

  const [state, setState] = useState<BabyFootState>(() => startIfNeeded());
  const [now, setNow] = useState(Date.now());

  const [pickTeam, setPickTeam] = useState<BabyFootTeamId | null>(null);
  const [pickPenaltyTeam, setPickPenaltyTeam] = useState<BabyFootTeamId | null>(null);
  const [penScored, setPenScored] = useState<boolean>(true);

  // live tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // refresh from LS when window focus (safe)
  useEffect(() => {
    const on = () => setState(loadBabyFootState());
    window.addEventListener("focus", on);
    return () => window.removeEventListener("focus", on);
  }, []);

  const profiles = (store?.profiles || []) as any[];

  const getProfile = (id: string) => profiles.find((p) => p?.id === id) || null;

  const teamAIds = state.teamAProfileIds || [];
  const teamBIds = state.teamBProfileIds || [];

  const players = useMemo(() => {
    const mk = (id: string) => ({ id });
    return [...teamAIds.map(mk), ...teamBIds.map(mk)];
  }, [teamAIds.join("|"), teamBIds.join("|")]);

  const durationMs = computeDurationMs(state);

  const regularStart = state.startedAt ?? state.createdAt;
  const regularLimitMs = state.matchDurationSec ? state.matchDurationSec * 1000 : null;
  const regularElapsed = Math.max(0, now - regularStart);
  const regularRemain = regularLimitMs != null ? Math.max(0, regularLimitMs - regularElapsed) : null;

  const otStart = lastPhaseAt(state, "overtime") ?? regularStart;
  const otLimitMs = state.overtimeSec != null ? Math.max(0, state.overtimeSec) * 1000 : null;
  const otElapsed = Math.max(0, now - otStart);
  const otRemain = otLimitMs != null ? Math.max(0, otLimitMs - otElapsed) : null;

  const neededSets = Math.floor((state.setsBestOf || 3) / 2) + 1;

  // Auto-advance by time
  useEffect(() => {
    if (state.finished) return;

    // Regular time end -> store decides: winner, overtime, or penalties
    if (state.phase === "play" && regularLimitMs != null && regularRemain === 0) {
      const next = finishByTime();
      setState(next);
      return;
    }

    // Overtime end -> store decides: penalties (if draw) or winner (if not draw)
    if (state.phase === "overtime" && otLimitMs != null && otRemain === 0) {
      const next = finishByTime();
      setState(next);
      return;
    }
  }, [state.phase, state.finished, regularRemain, otRemain, regularLimitMs, otLimitMs]);

  // When finished: emit payload once
  useEffect(() => {
    if (!state.finished) return;

    const winnerTeam: BabyFootTeamId | null = (state.winner as any) ?? (state.scoreA === state.scoreB ? null : (state.scoreA > state.scoreB ? "A" : "B"));
    const winnerId = winnerTeam === "A" ? (teamAIds[0] || null) : winnerTeam === "B" ? (teamBIds[0] || null) : null;

    const payload = {
      kind: "babyfoot",
      sport: "babyfoot",
      matchId: state.matchId,
      id: state.matchId,
      createdAt: state.createdAt,
      finishedAt: state.finishedAt ?? Date.now(),
      winnerId,
      winnerTeam,
      players: players.map((p) => ({ id: p.id })),
      summary: {
        teamA: state.teamA,
        teamB: state.teamB,
        scoreA: state.scoreA,
        scoreB: state.scoreB,
        setsEnabled: state.setsEnabled,
        setsA: state.setsA,
        setsB: state.setsB,
        penalties: state.penalties ? { ...state.penalties } : null,
        durationMs,
        mode: state.mode,
        target: state.target,
        setTarget: state.setTarget,
        setsBestOf: state.setsBestOf,
        handicapA: state.handicapA ?? 0,
        handicapB: state.handicapB ?? 0,
      },
      events: state.events || [],
      result: winnerTeam ? "win" : "draw",
    };

    // Tournament integration (best effort): persist result marker to avoid replay in bracket
    const tournamentId = (params as any)?.tournamentId;
    if (tournamentId) {
      try {
        localStorage.setItem(
          tourResultKey(tournamentId, state.matchId),
          JSON.stringify({
            at: Date.now(),
            winnerTeam,
            scoreA: state.scoreA,
            scoreB: state.scoreB,
            setsA: state.setsA,
            setsB: state.setsB,
          })
        );
      } catch {
        // ignore
      }
    }

    onFinish?.(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.finished]);

  const headerTicker = useMemo(() => {
    // mode ticker first (1v1 / 2v2 / 2v1)
    return (
      pickTicker(`babyfoot_${state.mode}`) ||
      pickTicker("babyfoot_match") ||
      pickTicker("babyfoot_games")
    );
  }, [state.mode]);

  const phaseLabel = (() => {
    if (state.finished) return "FIN";
    if (state.phase === "penalties") return "PENALTIES";
    if (state.phase === "overtime") return "OVERTIME";
    return "MATCH";
  })();

  const clockLabel = (() => {
    if (state.finished) return `Durée: ${fmt(durationMs)}`;
    if (!regularLimitMs) return `Temps: ${fmt(regularElapsed)}`;
    if (state.phase === "play") return `Reste: ${fmt(regularRemain ?? 0)}`;
    if (state.phase === "overtime") return `OT: ${fmt(otRemain ?? 0)}`;
    return `Temps: ${fmt(regularElapsed)}`;
  })();

  const scoreLine = state.setsEnabled
    ? `${state.setsA || 0}–${state.setsB || 0} sets • ${state.scoreA}–${state.scoreB}`
    : `${state.scoreA}–${state.scoreB}`;

  const isPickScorerNeeded = (team: BabyFootTeamId) => {
    const ids = team === "A" ? teamAIds : teamBIds;
    return ids.length > 1;
  };

  const addForTeam = (team: BabyFootTeamId) => {
    if (state.finished) return;
    if (state.phase === "penalties") return;

    if (isPickScorerNeeded(team)) {
      setPickTeam(team);
      return;
    }
    const scorerId = (team === "A" ? teamAIds[0] : teamBIds[0]) || null;
    const next = addGoal(team, scorerId);
    setState(next);
  };

  const canUndo = !state.finished && Array.isArray(state.events) && state.events.length > 0;

  const card: React.CSSProperties = {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  };

  const bigScore: React.CSSProperties = {
    fontSize: 54,
    fontWeight: 1100,
    letterSpacing: 0.6,
    lineHeight: 1,
    color: theme?.colors?.primary ?? "#7cffc4",
    textShadow: "0 8px 26px rgba(0,0,0,0.45)",
    whiteSpace: "nowrap",
  };

  const teamBlock = (team: BabyFootTeamId) => {
    const ids = team === "A" ? teamAIds : teamBIds;
    const name = team === "A" ? state.teamA : state.teamB;
    const score = team === "A" ? state.scoreA : state.scoreB;

    const avatarIds = ids.slice(0, 2);
    const more = Math.max(0, ids.length - avatarIds.length);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{ display: "flex" }}>
              {avatarIds.map((pid, i) => {
                const p = getProfile(pid);
                return (
                  <div key={pid} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                    <ProfileAvatar profile={p || { id: pid, name: pid }} size={34} />
                  </div>
                );
              })}
              {more > 0 ? (
                <div
                  style={{
                    marginLeft: -10,
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.85)",
                    fontWeight: 950,
                    fontSize: 12,
                  }}
                >
                  +{more}
                </div>
              ) : null}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 1000, letterSpacing: 0.5, overflow: "hidden", textOverflow: "ellipsis" }}>
                {name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                {ids.length} joueur{ids.length > 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontSize: 34, fontWeight: 1100, lineHeight: 1, whiteSpace: "nowrap" }}>{score}</div>

          {(state.handicapA || state.handicapB) ? (
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
              {team === "A" ? `(+${state.handicapA || 0})` : `(+${state.handicapB || 0})`}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            type="button"
            onClick={() => addForTeam(team)}
            disabled={state.finished || state.phase === "penalties"}
            style={{
              borderRadius: 16,
              padding: "12px 10px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))",
              color: "#fff",
              fontWeight: 1100,
              letterSpacing: 0.8,
              cursor: "pointer",
            }}
          >
            + BUT
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canUndo) return;
              const next = undoGoal();
              setState(next);
            }}
            disabled={!canUndo}
            style={{
              borderRadius: 16,
              padding: "12px 10px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
              color: !canUndo ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.9)",
              fontWeight: 1000,
              letterSpacing: 0.6,
              cursor: canUndo ? "pointer" : "default",
            }}
          >
            −
          </button>
        </div>
      </div>
    );
  };

  const penaltiesCard = () => {
    const pen = state.penalties || ({} as any);
    const shotsA = Array.isArray(pen.shotsA) ? pen.shotsA : [];
    const shotsB = Array.isArray(pen.shotsB) ? pen.shotsB : [];
    const scoreA = Number(pen.scoreA ?? 0);
    const scoreB = Number(pen.scoreB ?? 0);

    const addPenaltyForTeam = (team: BabyFootTeamId, scored: boolean) => {
      if (state.finished) return;
      const next = addPenaltyShot(team, scored);
      setState(next);
    };

    return (
      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 1100, letterSpacing: 0.8 }}>PENALTIES</div>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
            {scoreA}–{scoreB}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={teamChip(state.teamA, true)}>{state.teamA}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {shotsA.map((s: any, i: number) => (
                <span
                  key={i}
                  style={{
                    borderRadius: 10,
                    padding: "6px 8px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(0,0,0,0.22)",
                    fontWeight: 1000,
                    fontSize: 12,
                  }}
                >
                  {s ? "✅" : "❌"}
                </span>
              ))}
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => addPenaltyForTeam("A", true)}
                style={{
                  borderRadius: 16,
                  padding: "12px 10px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "linear-gradient(180deg, rgba(120,255,200,0.25), rgba(120,255,200,0.10))",
                  color: "#eafff5",
                  fontWeight: 1100,
                  letterSpacing: 0.8,
                  cursor: "pointer",
                }}
              >
                MARQUÉ
              </button>
              <button
                type="button"
                onClick={() => addPenaltyForTeam("A", false)}
                style={{
                  borderRadius: 16,
                  padding: "12px 10px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: 1000,
                  letterSpacing: 0.6,
                  cursor: "pointer",
                }}
              >
                RATÉ
              </button>
            </div>
          </div>

          <div>
            <div style={teamChip(state.teamB, true)}>{state.teamB}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {shotsB.map((s: any, i: number) => (
                <span
                  key={i}
                  style={{
                    borderRadius: 10,
                    padding: "6px 8px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(0,0,0,0.22)",
                    fontWeight: 1000,
                    fontSize: 12,
                  }}
                >
                  {s ? "✅" : "❌"}
                </span>
              ))}
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => addPenaltyForTeam("B", true)}
                style={{
                  borderRadius: 16,
                  padding: "12px 10px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "linear-gradient(180deg, rgba(120,255,200,0.25), rgba(120,255,200,0.10))",
                  color: "#eafff5",
                  fontWeight: 1100,
                  letterSpacing: 0.8,
                  cursor: "pointer",
                }}
              >
                MARQUÉ
              </button>
              <button
                type="button"
                onClick={() => addPenaltyForTeam("B", false)}
                style={{
                  borderRadius: 16,
                  padding: "12px 10px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: 1000,
                  letterSpacing: 0.6,
                  cursor: "pointer",
                }}
              >
                RATÉ
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.78, fontWeight: 800 }}>
          Sudden death automatique si égalité après 5 tirs.
        </div>
      </div>
    );
  };

  const infoTitle = "Baby-Foot";
  const infoBody =
    "But: +1 pour l'équipe.\n" +
    "Undo: annule le dernier évènement.\n\n" +
    "Phases:\n" +
    "• MATCH → (OT si égalité et prolongation) → (PENALTIES si égalité) → FIN\n\n" +
    "Sets: si activé, le score affiché est le score du set en cours.";

  return (
    <div className="page" style={{ background: theme.bg, color: theme.text }}>
      <PageHeader
        tickerSrc={headerTicker || undefined}
        tickerAlt="Baby-Foot — Play"
        tickerHeight={92}
        left={<BackDot onClick={() => go("babyfoot_menu")} />}
        right={<InfoDot title={infoTitle} content={infoBody} glow={(theme?.colors?.primary ?? "#7cffc4") + "88"} />}
      />

      <div style={{ padding: 12, paddingBottom: 140 }}>
        {/* HEADER META */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={teamChip(phaseLabel, true)}>{phaseLabel}</span>
              {state.setsEnabled ? (
                <span style={teamChip(`BO${state.setsBestOf || 3} • win ${neededSets}`, false)}>
                  BO{state.setsBestOf || 3} • win {neededSets}
                </span>
              ) : (
                <span style={teamChip(`Target ${state.target}`, false)}>Target {state.target}</span>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 1000, letterSpacing: 0.8 }}>CHRONO</div>
              <div style={{ fontWeight: 1100 }}>{clockLabel}</div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
            <div style={bigScore}>{scoreLine}</div>
          </div>
        </div>

        {/* SCOREBOARD */}
        <div style={{ ...card, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {teamBlock("A")}
            {teamBlock("B")}
          </div>

          {state.setsEnabled ? (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
                Sets: {state.setsA || 0}–{state.setsB || 0} • Set target: {state.setTarget || state.target}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
                Match: {(state.matchScoreA ?? 0)}–{(state.matchScoreB ?? 0)}
              </div>
            </div>
          ) : null}
        </div>

        {/* PENALTIES UI */}
        {state.phase === "penalties" ? penaltiesCard() : null}

        {/* FINISHED SUMMARY */}
        {state.finished ? (
          <div style={{ ...card, marginTop: 12 }}>
            <div style={{ fontWeight: 1100, letterSpacing: 0.8 }}>MATCH TERMINÉ</div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 950, opacity: 0.92 }}>
              {state.winner ? (
                <>Gagnant: {state.winner === "A" ? state.teamA : state.teamB}</>
              ) : (
                <>"Match nul"</>
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.78, fontWeight: 850 }}>
              Durée: {fmt(durationMs)}
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => go("babyfoot_stats_center")}
                style={{
                  borderRadius: 16,
                  padding: "12px 10px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))",
                  color: "#fff",
                  fontWeight: 1100,
                  letterSpacing: 0.8,
                  cursor: "pointer",
                }}
              >
                STATS
              </button>
              <button
                type="button"
                onClick={() => go("babyfoot_menu")}
                style={{
                  borderRadius: 16,
                  padding: "12px 10px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: 1000,
                  letterSpacing: 0.6,
                  cursor: "pointer",
                }}
              >
                MENU
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Dock bottom: actions globales */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "10px 12px calc(12px + env(safe-area-inset-bottom))",
          backdropFilter: "blur(10px)",
          background:
            "linear-gradient(180deg, rgba(10,10,18,0.00) 0%, rgba(10,10,18,0.72) 20%, rgba(10,10,18,0.92) 100%)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          zIndex: 50,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              if (!canUndo) return;
              const next = undoGoal();
              setState(next);
            }}
            disabled={!canUndo}
            style={{
              borderRadius: 16,
              padding: "12px 10px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
              color: !canUndo ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.9)",
              fontWeight: 1000,
              letterSpacing: 0.6,
              cursor: canUndo ? "pointer" : "default",
            }}
          >
            UNDO
          </button>

          <button
            type="button"
            onClick={() => {
              // Best effort manual finish: utilise finishByTime (le store décide OT/PEN/FIN selon scores)
              if (state.finished) return;
              const next = finishByTime();
              setState(next);
            }}
            disabled={state.finished}
            style={{
              borderRadius: 16,
              padding: "12px 10px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))",
              color: state.finished ? "rgba(255,255,255,0.45)" : "#fff",
              fontWeight: 1100,
              letterSpacing: 0.8,
              cursor: state.finished ? "default" : "pointer",
            }}
          >
            FIN
          </button>

          <button
            type="button"
            onClick={() => go("babyfoot_config")}
            style={{
              borderRadius: 16,
              padding: "12px 10px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 1000,
              letterSpacing: 0.6,
              cursor: "pointer",
            }}
          >
            CONFIG
          </button>
        </div>
      </div>

      {/* Modal sélection buteur */}
      {pickTeam ? (
        <Modal
          title={pickTeam === "A" ? `Buteur — ${state.teamA}` : `Buteur — ${state.teamB}`}
          onClose={() => setPickTeam(null)}
        >
          <div style={{ display: "grid", gap: 10 }}>
            {(pickTeam === "A" ? teamAIds : teamBIds).map((pid: string) => {
              const p = getProfile(pid);
              const label = p?.name || pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => {
                    const next = addGoal(pickTeam, pid);
                    setState(next);
                    setPickTeam(null);
                  }}
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                  }}
                >
                  <ProfileAvatar profile={p || { id: pid, name: pid }} size={40} />
                  <div style={{ fontWeight: 1000, letterSpacing: 0.4, textAlign: "left" }}>{label}</div>
                </button>
              );
            })}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
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
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(10,12,18,0.96)",
          padding: 16,
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 1100, fontSize: 16, letterSpacing: 0.6 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.18)",
              color: "#fff",
              fontWeight: 900,
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}
