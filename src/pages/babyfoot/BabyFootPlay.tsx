// =============================================================
// src/pages/babyfoot/BabyFootPlay.tsx
// Baby-Foot — Play (LOCAL ONLY) — V2
// - Score A/B + undo
// - Events + chrono
// - ✅ onFinish(payload) compatible pushBabyFootHistory() in App.tsx
//   -> players[] (profile ids) + winnerId (profile id)
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";

import {
  addGoal,
  computeDurationMs,
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

export default function BabyFootPlay({ go, onFinish }: Props) {
  const { theme } = useTheme();
  const [state, setState] = useState<BabyFootState>(() => loadBabyFootState());
  const [now, setNow] = useState(Date.now());

  const [pickTeam, setPickTeam] = useState<BabyFootTeamId | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const teamAIds = state.teamAProfileIds || [];
  const teamBIds = state.teamBProfileIds || [];
  const players = useMemo(() => {
    const ids = [...teamAIds, ...teamBIds].filter(Boolean);
    return ids.map((id) => ({ id }));
  }, [teamAIds.join("|"), teamBIds.join("|")]);

  const durationMs = useMemo(() => computeDurationMs(state), [state.startedAt, state.finishedAt, now, state.updatedAt]);

  const finishIfNeeded = (next: BabyFootState) => {
    if (!next.finished || !next.winner) return;

    // winnerId: use first selected profile of the winner team
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
      target: next.target,

      scoreA: next.scoreA,
      scoreB: next.scoreB,
      winnerTeam: next.winner,

      players,
      winnerId,

      events: next.events || [],
      durationMs: computeDurationMs(next),

      summary: {
        scoreA: next.scoreA,
        scoreB: next.scoreB,
        teamA: next.teamA,
        teamB: next.teamB,
        winnerTeam: next.winner,
        durationMs: computeDurationMs(next),
      },
    };

    onFinish?.(payload);
    go("babyfoot_stats_history");
  };

  const add = (team: BabyFootTeamId, scorerId?: string | null) => {
    const next = addGoal(team, scorerId);
    setState(next);
    saveBabyFootState(next);
    finishIfNeeded(next);
  };

  const onPlus = (team: BabyFootTeamId) => {
    const ids = team === "A" ? teamAIds : teamBIds;
    if (ids.length <= 1) {
      add(team, ids[0] ?? null);
      return;
    }
    setPickTeam(team);
  };

  const onPickScorer = (id: string) => {
    const team = pickTeam;
    if (!team) return;
    setPickTeam(null);
    add(team, id);
  };

  const onUndo = () => {
    const next = undoGoal();
    setState(next);
    saveBabyFootState(next);
  };

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("babyfoot_menu")} />
        <div style={topTitle}>BABY-FOOT — PLAY</div>
        <InfoDot title="Baby-foot" body="Score A/B • Undo • Chrono • Local only" />
      </div>

      <div style={header(theme)}>
        <div style={teamBox}>
          <div style={teamName}>{state.teamA}</div>
          <div style={avatarsRow}>
            {teamAIds.map((id) => (
              <div key={id} style={avatarWrap}>
                <ProfileAvatar profile={{ id }} size={38} />
              </div>
            ))}
          </div>
        </div>

        <div style={midBox}>
          <div style={timer(theme)}>{fmt(durationMs)}</div>
          <div style={target}>
            CIBLE <span style={{ opacity: 0.95 }}>{state.target}</span>
          </div>
        </div>

        <div style={teamBox}>
          <div style={{ ...teamName, textAlign: "right" }}>{state.teamB}</div>
          <div style={{ ...avatarsRow, justifyContent: "flex-end" }}>
            {teamBIds.map((id) => (
              <div key={id} style={avatarWrap}>
                <ProfileAvatar profile={{ id }} size={38} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={scoreRow}>
        <div style={scoreCard(theme)}>
          <div style={scoreNum}>{state.scoreA}</div>
          <button style={plusBtn(theme)} onClick={() => onPlus("A")} disabled={state.finished}>
            + BUT
          </button>
        </div>

        <div style={vs(theme)}>
          <div style={vsTxt}>VS</div>
        </div>

        <div style={scoreCard(theme)}>
          <div style={scoreNum}>{state.scoreB}</div>
          <button style={plusBtn(theme)} onClick={() => onPlus("B")} disabled={state.finished}>
            + BUT
          </button>
        </div>
      </div>

      <div style={actionsRow}>
        <button style={ghostBtn(theme)} onClick={onUndo}>
          ANNULER
        </button>
        <button
          style={ghostBtn(theme)}
          onClick={() => {
            // restart match keeping config
            const s = loadBabyFootState();
            const reset = {
              ...s,
              scoreA: 0,
              scoreB: 0,
              finished: false,
              winner: null,
              undo: [],
              events: [],
              startedAt: Date.now(),
              finishedAt: null,
              updatedAt: Date.now(),
            } as BabyFootState;
            saveBabyFootState(reset);
            setState(reset);
          }}
        >
          RESTART
        </button>
      </div>

      {pickTeam && (
        <div style={overlay}>
          <div style={modal(theme)}>
            <div style={modalTitle}>Qui a marqué ?</div>
            <div style={modalSub}>
              Équipe {pickTeam === "A" ? state.teamA : state.teamB} • Choisis le buteur
            </div>

            <div style={pickerRow}>
              {(pickTeam === "A" ? teamAIds : teamBIds).map((id) => (
                <button key={id} style={pickerBtn(theme)} onClick={() => onPickScorer(id)}>
                  <ProfileAvatar profile={{ id }} size={54} />
                </button>
              ))}
            </div>

            <button style={pickerCancel(theme)} onClick={() => setPickTeam(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const wrap = (theme: any) => ({
  minHeight: "100vh",
  padding: 14,
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

const topTitle: any = { textAlign: "center", fontWeight: 900, letterSpacing: 1, opacity: 0.95 };

const header = (theme: any) => ({
  display: "grid",
  gridTemplateColumns: "1fr 120px 1fr",
  gap: 10,
  padding: 12,
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const teamBox: any = { display: "grid", gap: 6 };

const teamName: any = { fontWeight: 950, letterSpacing: 0.6, opacity: 0.95 };

const avatarsRow: any = { display: "flex", gap: 8, flexWrap: "wrap" };

const avatarWrap: any = { width: 40, height: 40, display: "grid", placeItems: "center" };

const midBox: any = { display: "grid", justifyItems: "center", gap: 6 };

const timer = (theme: any) => ({
  fontWeight: 950,
  letterSpacing: 1,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.20)",
  minWidth: 90,
  textAlign: "center",
});

const target: any = { fontSize: 12, opacity: 0.8, letterSpacing: 1, fontWeight: 900 };

const scoreRow: any = {
  display: "grid",
  gridTemplateColumns: "1fr 84px 1fr",
  gap: 10,
  marginTop: 12,
};

const scoreCard = (theme: any) => ({
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  padding: 14,
  display: "grid",
  gap: 12,
  justifyItems: "center",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const scoreNum: any = { fontSize: 64, lineHeight: 1, fontWeight: 950, letterSpacing: 1 };

const plusBtn = (theme: any) => ({
  width: "100%",
  height: 46,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.14)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 950,
  letterSpacing: 1,
  cursor: "pointer",
});

const vs = (theme: any) => ({
  display: "grid",
  placeItems: "center",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.20)",
});

const vsTxt: any = { fontWeight: 950, letterSpacing: 2, opacity: 0.7 };

const actionsRow: any = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 };

const ghostBtn = (theme: any) => ({
  height: 48,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.16)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 950,
  letterSpacing: 1,
  cursor: "pointer",
});

const overlay: any = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "grid",
  placeItems: "center",
  padding: 14,
};

const modal = (theme: any) => ({
  width: "min(520px, 100%)",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(10,12,18,0.96)",
  boxShadow: "0 22px 70px rgba(0,0,0,0.6)",
  padding: 14,
  display: "grid",
  gap: 10,
});

const modalTitle: any = { fontWeight: 950, letterSpacing: 0.6, fontSize: 16 };
const modalSub: any = { opacity: 0.75, fontWeight: 700 };

const pickerRow: any = { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 };

const pickerBtn = (theme: any) => ({
  width: 72,
  height: 72,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
});

const pickerCancel = (theme: any) => ({
  marginTop: 8,
  height: 44,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.18)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 900,
  letterSpacing: 1,
  cursor: "pointer",
});
