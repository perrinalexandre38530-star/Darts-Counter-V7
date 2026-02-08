// =============================================================
// src/pages/babyfoot/BabyFootPlay.tsx
// Baby-Foot — Play (LOCAL ONLY) — V3
// ✅ Phases: play -> overtime -> penalties -> finished
// ✅ Options: chrono, overtime, golden goals, sets (BO), handicap
// ✅ Penalties: 5 tirs chacun + sudden death (store gère la décision)
// ✅ Payload compatible pushBabyFootHistory() dans App.tsx
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
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

export default function BabyFootPlay({ go, onFinish, params }: Props) {
  const { theme } = useTheme();
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

    const winnerTeam: BabyFootTeamId = (state.winner as any) || (state.scoreA >= state.scoreB ? "A" : "B");
    const winnerId = winnerTeam === "A" ? (teamAIds[0] || null) : (teamBIds[0] || null);

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
        durationMs: computeDurationMs(state),
      },
      payload: {
        ...state,
      },
    };

    try {
      onFinish?.(payload);
    } catch {}
    
    // ✅ V5.3 Tournoi bridge (SAFE): si on vient d'un match de tournoi,
    // on stocke le résultat pour import/soumission depuis TournamentMatchPlay.
    try {
      const tid = (params as any)?.tournamentId ?? (params as any)?.tournament_id;
      const mid = (params as any)?.tournamentMatchId ?? (params as any)?.matchId;
      if (tid && mid && typeof localStorage !== "undefined") {
        const k = tourResultKey(tid, mid);
        localStorage.setItem(
          k,
          JSON.stringify({
            tournamentId: tid,
            matchId: mid,
            scoreA: state.scoreA,
            scoreB: state.scoreB,
            winnerTeam,
            winnerId,
            finishedAt: payload.finishedAt ?? Date.now(),
          })
        );
      }
    } catch {}
// navigate to history if caller didn't
    // (App.tsx typically redirects already; we keep safe)
  }, [state.finished]);

  function requestGoal(team: BabyFootTeamId) {
    if (state.finished) return;

    const ids = team === "A" ? teamAIds : teamBIds;
    if (ids.length > 1) {
      setPickTeam(team);
      return;
    }
    const next = addGoal(team, ids[0] ?? null);
    setState(next);
  }

  function requestPenalty(team: BabyFootTeamId, scored: boolean) {
    if (state.finished) return;

    const ids = team === "A" ? teamAIds : teamBIds;
    if (ids.length > 1) {
      setPickPenaltyTeam(team);
      setPenScored(scored);
      return;
    }
    const next = addPenaltyShot(team, scored, ids[0] ?? null);
    setState(next);
  }

  function doUndo() {
    const next = undoGoal();
    setState(next);
  }

  const phaseLabel =
    state.phase === "play" ? "MATCH" : state.phase === "overtime" ? "PROLONGATION" : state.phase === "penalties" ? "TIRS AU BUT" : "TERMINÉ";

  const subTimer =
    state.phase === "play"
      ? regularRemain != null
        ? `⏱ ${fmt(regularRemain)}`
        : `⏱ ${fmt(regularElapsed)}`
      : state.phase === "overtime"
      ? otRemain != null
        ? `⏱ ${fmt(otRemain)}`
        : `⏱ ${fmt(otElapsed)}`
      : `⏱ ${fmt(durationMs)}`;

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("babyfoot_menu")} />
        <div style={topTitle}>
          <div style={{ fontWeight: 950, letterSpacing: 1 }}>{phaseLabel}</div>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>{subTimer}</div>
        </div>
        <InfoDot
          title="Baby-foot"
          body="V3: chrono + overtime + penalties + sets + golden goals."
          glow={(theme?.colors?.primary ?? "#7cffc4") + "88"}
        />
      </div>

      {/* Arcade scoreboard */}
      <div style={board(theme)}>
        <div style={teamRow}>
          <div style={teamName(theme)}>{state.teamA}</div>
          <div style={scoreBig(theme, "A")}>{state.scoreA}</div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {teamAIds.slice(0, 2).map((id) => (
              <div key={id} style={{ marginLeft: 8 }}>
                <ProfileAvatar profile={{ id }} size={38} />
              </div>
            ))}
          </div>
        </div>

        <div style={midRow}>
          <div style={chip(theme, "muted")}>{state.mode.toUpperCase()}</div>

          {state.setsEnabled ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={chip(theme, "primary")}>
                SETS {state.setsA}–{state.setsB} (BO{state.setsBestOf})
              </div>
              <div style={chip(theme, "muted")}>SET #{state.setIndex} • cible {state.setTarget}</div>
              <div style={chip(theme, "muted")}>à {neededSets} sets</div>
            </div>
          ) : (
            <div style={chip(theme, "primary")}>CIBLE {state.target}</div>
          )}

          {state.handicapA || state.handicapB ? (
            <div style={chip(theme, "muted")}>Handicap A+{state.handicapA || 0} / B+{state.handicapB || 0}</div>
          ) : (
            <div />
          )}
        </div>

        <div style={teamRow}>
          <div style={teamName(theme)}>{state.teamB}</div>
          <div style={scoreBig(theme, "B")}>{state.scoreB}</div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {teamBIds.slice(0, 2).map((id) => (
              <div key={id} style={{ marginLeft: 8 }}>
                <ProfileAvatar profile={{ id }} size={38} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      {state.phase !== "penalties" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <button style={btnGoal(theme, "A")} onClick={() => requestGoal("A")} disabled={state.finished}>
            + BUT {state.teamA}
          </button>
          <button style={btnGoal(theme, "B")} onClick={() => requestGoal("B")} disabled={state.finished}>
            + BUT {state.teamB}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 12, ...card(theme) }}>
          <div style={{ fontWeight: 950, letterSpacing: 1, marginBottom: 10 }}>TIRS AU BUT</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={penBox(theme)}>
              <div style={{ fontWeight: 900, opacity: 0.85 }}>{state.teamA}</div>
              <div style={{ fontSize: 28, fontWeight: 1000, letterSpacing: 1 }}>
                {state.penalties?.goalsA ?? 0}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
                tirs: {state.penalties?.shotsA ?? 0}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  style={btnPen(theme, true, state.penalties?.turn === "A")}
                  onClick={() => requestPenalty("A", true)}
                >
                  BUT
                </button>
                <button
                  style={btnPen(theme, false, state.penalties?.turn === "A")}
                  onClick={() => requestPenalty("A", false)}
                >
                  RATÉ
                </button>
              </div>
            </div>

            <div style={penBox(theme)}>
              <div style={{ fontWeight: 900, opacity: 0.85 }}>{state.teamB}</div>
              <div style={{ fontSize: 28, fontWeight: 1000, letterSpacing: 1 }}>
                {state.penalties?.goalsB ?? 0}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
                tirs: {state.penalties?.shotsB ?? 0}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  style={btnPen(theme, true, state.penalties?.turn === "B")}
                  onClick={() => requestPenalty("B", true)}
                >
                  BUT
                </button>
                <button
                  style={btnPen(theme, false, state.penalties?.turn === "B")}
                  onClick={() => requestPenalty("B", false)}
                >
                  RATÉ
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
            Tour : <span style={{ color: theme?.colors?.primary ?? "#7cffc4" }}>{state.penalties?.turn ?? "A"}</span>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <button style={btn(theme)} onClick={doUndo}>
          ANNULER
        </button>
        <button
          style={btn(theme)}
          onClick={() => go("babyfoot_stats_history", { focusMatchId: state.matchId })}
        >
          STATS / HISTORIQUE
        </button>
      </div>

      {/* scorer picker for goals */}
      {pickTeam && (
        <PickScorerModal
          theme={theme}
          title="Buteur"
          team={pickTeam}
          ids={pickTeam === "A" ? teamAIds : teamBIds}
          onClose={() => setPickTeam(null)}
          onPick={(id) => {
            const next = addGoal(pickTeam, id);
            setState(next);
            setPickTeam(null);
          }}
        />
      )}

      {/* scorer picker for penalties */}
      {pickPenaltyTeam && (
        <PickScorerModal
          theme={theme}
          title={penScored ? "Tireur (BUT)" : "Tireur (RATÉ)"}
          team={pickPenaltyTeam}
          ids={pickPenaltyTeam === "A" ? teamAIds : teamBIds}
          onClose={() => setPickPenaltyTeam(null)}
          onPick={(id) => {
            const next = addPenaltyShot(pickPenaltyTeam, penScored, id);
            setState(next);
            setPickPenaltyTeam(null);
          }}
        />
      )}
    </div>
  );
}

function PickScorerModal({ theme, title, ids, onPick, onClose }: any) {
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
          <div style={{ fontWeight: 1000, fontSize: 16 }}>{title}</div>
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
            FERMER
          </button>
      {state.finished && ((params as any)?.tournamentId || (params as any)?.tournamentMatchId) ? (
        <button
          style={{ ...btn(theme), marginTop: 10, border: "1px solid rgba(255,255,255,0.22)" }}
          onClick={() => {
            const tid = (params as any)?.tournamentId ?? (params as any)?.tournament_id;
            const mid = (params as any)?.tournamentMatchId ?? (params as any)?.matchId;
            if (tid && mid) go("tournament_match_play", { tournamentId: tid, matchId: mid, forceMode: "babyfoot" });
          }}
        >
          RETOUR TOURNOI (IMPORT RÉSULTAT)
        </button>
      ) : null}

        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ids.map((id: string) => (
            <button
              key={id}
              onClick={() => onPick(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.22)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 950,
              }}
            >
              <ProfileAvatar profile={{ id }} size={36} />
              <div>Joueur</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const wrap = (theme: any) => ({
  minHeight: "100vh",
  padding: 14,
  paddingBottom: 90,
  background: theme?.colors?.bg ?? "#05060a",
  color: theme?.colors?.text ?? "#fff",
});

const topRow: any = {
  display: "grid",
  gridTemplateColumns: "48px 1fr 48px",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const topTitle: any = { textAlign: "center" };

const card = (theme: any) => ({
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 12,
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const board = (theme: any) => ({
  ...card(theme),
  padding: 14,
});

const teamRow: any = {
  display: "grid",
  gridTemplateColumns: "1fr 92px 120px",
  alignItems: "center",
  gap: 10,
};

const midRow: any = {
  marginTop: 10,
  marginBottom: 10,
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: 10,
  alignItems: "center",
};

const teamName = (theme: any) => ({
  fontWeight: 1000,
  letterSpacing: 0.8,
  opacity: 0.92,
});

const scoreBig = (theme: any, team: "A" | "B") => ({
  textAlign: "center",
  fontSize: 44,
  fontWeight: 1000,
  letterSpacing: 1,
  color: team === "A" ? (theme?.colors?.primary ?? "#7cffc4") : (theme?.colors?.pink ?? "#ff66cc"),
  textShadow: "0 0 18px rgba(0,0,0,0.35)",
});

const chip = (theme: any, kind: "primary" | "muted") => ({
  display: "inline-flex",
  alignItems: "center",
  height: 30,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: kind === "primary" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.22)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 950,
  letterSpacing: 0.7,
  fontSize: 12,
  whiteSpace: "nowrap",
});

const btn = (theme: any) => ({
  height: 52,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.10)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 950,
  letterSpacing: 1,
  cursor: "pointer",
  boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
});

const btnGoal = (theme: any, team: "A" | "B") => ({
  height: 64,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.18)",
  background: team === "A" ? "rgba(124,255,196,0.14)" : "rgba(255,102,204,0.14)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 1000,
  letterSpacing: 1,
  cursor: "pointer",
  boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
});

const penBox = (theme: any) => ({
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.18)",
  padding: 12,
});

const btnPen = (theme: any, scored: boolean, active: boolean) => ({
  flex: 1,
  height: 44,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.18)",
  background: active ? (scored ? "rgba(124,255,196,0.18)" : "rgba(255,185,185,0.18)") : "rgba(255,255,255,0.06)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 1000,
  cursor: active ? "pointer" : "not-allowed",
  opacity: active ? 1 : 0.45,
});
