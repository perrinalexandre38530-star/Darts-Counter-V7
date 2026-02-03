// =============================================================
// src/pages/babyfoot/BabyFootPlay.tsx
// Baby-Foot — Play (LOCAL ONLY) — v2
// - Score A/B + undo
// - Chrono basé sur startedAt/finishedAt
// - Appelle onFinish() avec players[] + winnerId (profil) pour pushBabyFootHistory()
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { addGoal, loadBabyFootState, saveBabyFootState, undo as undoGoal, type BabyFootTeamId } from "../../lib/babyfootStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

function msToClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function BabyFootPlay({ go, onFinish }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadBabyFootState());
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    saveBabyFootState(st);
  }, [st]);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const durationMs = React.useMemo(() => {
    const start = st.startedAt ?? st.createdAt ?? Date.now();
    const end = st.finished ? (st.finishedAt ?? Date.now()) : Date.now();
    return end - start;
  }, [st.startedAt, st.createdAt, st.finished, st.finishedAt, tick]);

  const finish = React.useCallback(() => {
    if (!onFinish) return;
    const now = Date.now();

    const players = (st.players || []).map((p) => ({
      id: p.id,
      name: p.name ?? "",
      avatarDataUrl: p.avatarDataUrl ?? null,
      team: p.team,
    }));

    const winnerTeam: BabyFootTeamId | null = st.winner;
    const winnerPlayer = winnerTeam ? (st.players || []).find((p) => p.team === winnerTeam) : null;

    onFinish({
      id: st.matchId,
      kind: "babyfoot",
      sport: "babyfoot",
      createdAt: st.createdAt || now,
      updatedAt: now,

      mode: st.mode,
      target: st.target,

      teams: {
        A: { id: "A", name: st.teamA },
        B: { id: "B", name: st.teamB },
      },
      scores: { A: st.scoreA, B: st.scoreB },

      players,
      winnerId: winnerPlayer?.id ?? null,

      durationMs,

      events: st.events || [],

      summary: {
        title: `${st.teamA} ${st.scoreA}–${st.scoreB} ${st.teamB}`,
        subtitle: winnerTeam ? `Victoire : ${winnerTeam === "A" ? st.teamA : st.teamB}` : "Match nul",
      },
    });
  }, [onFinish, st, durationMs]);

  React.useEffect(() => {
    if (st.finished) {
      // Auto push history dès que le match est terminé
      finish();
    }
  }, [st.finished, finish]);

  const inc = (team: BabyFootTeamId, delta: 1 | -1) => setSt((prev) => addGoal(prev, team, delta));
  const undo = () => setSt((prev) => undoGoal(prev));

  return (
    <div style={wrap(theme)}>
      <div style={head}>
        <button style={back(theme)} onClick={() => go("babyfoot_menu")}>
          ✕
        </button>
        <div style={title}>BABY-FOOT</div>
        <div style={clock(theme)}>{msToClock(durationMs)}</div>
      </div>

      <div style={kpi(theme)}>
        <div style={teamBlock(theme)}>
          <div style={teamName}>{st.teamA}</div>
          <div style={teamScore}>{st.scoreA}</div>
          <div style={btnRow}>
            <button style={btn(theme)} onClick={() => inc("A", +1)}>
              +1
            </button>
            <button style={btn(theme)} onClick={() => inc("A", -1)}>
              -1
            </button>
          </div>
        </div>

        <div style={mid(theme)}>
          <div style={vs}>VS</div>
          <div style={target(theme)}>Cible : {st.target}</div>
          <div style={{ height: 10 }} />
          <button style={btn(theme)} onClick={undo} disabled={!st.undo?.length}>
            Annuler
          </button>
          <div style={{ height: 8 }} />
          {!st.finished ? (
            <button style={ghost(theme)} onClick={finish}>
              Terminer & sauvegarder
            </button>
          ) : null}
        </div>

        <div style={teamBlock(theme)}>
          <div style={teamName}>{st.teamB}</div>
          <div style={teamScore}>{st.scoreB}</div>
          <div style={btnRow}>
            <button style={btn(theme)} onClick={() => inc("B", +1)}>
              +1
            </button>
            <button style={btn(theme)} onClick={() => inc("B", -1)}>
              -1
            </button>
          </div>
        </div>
      </div>

      {st.finished ? (
        <div style={done(theme)}>
          Match terminé{st.winner ? ` — Victoire : ${st.winner === "A" ? st.teamA : st.teamB}` : " — Match nul"}
        </div>
      ) : (
        <div style={hint(theme)}>Appuie sur +1 / -1 pour mettre à jour le score. Annuler = undo.</div>
      )}
    </div>
  );
}

function isDark(theme: any) {
  return theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
}

function wrap(theme: any): React.CSSProperties {
  return {
    height: "100dvh",
    overflow: "hidden",
    padding: 14,
    color: theme?.colors?.text ?? "#fff",
    background: isDark(theme)
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
  };
}

const head: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 };
const title: React.CSSProperties = { fontWeight: 1000, letterSpacing: 1.2, fontSize: 14, opacity: 0.95 };

function back(theme: any): React.CSSProperties {
  return {
    border: "none",
    borderRadius: 12,
    width: 44,
    height: 44,
    background: isDark(theme) ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    fontSize: 18,
  };
}

function clock(theme: any): React.CSSProperties {
  return {
    minWidth: 70,
    textAlign: "right",
    fontWeight: 1000,
    letterSpacing: 1.2,
    opacity: 0.9,
    padding: "10px 12px",
    borderRadius: 12,
    background: isDark(theme) ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    border: isDark(theme) ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
  };
}

function kpi(theme: any): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr 0.8fr 1fr",
    gap: 12,
    alignItems: "stretch",
  };
}

function teamBlock(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    background: isDark(theme) ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.75)",
    border: isDark(theme) ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
    boxShadow: isDark(theme) ? "0 10px 30px rgba(0,0,0,0.35)" : "0 10px 30px rgba(0,0,0,0.10)",
  };
}

const teamName: React.CSSProperties = { fontWeight: 900, opacity: 0.9, fontSize: 13 };
const teamScore: React.CSSProperties = { fontWeight: 1100, fontSize: 52, lineHeight: "58px", marginTop: 8 };

const btnRow: React.CSSProperties = { display: "flex", gap: 10, marginTop: 10 };

function btn(theme: any): React.CSSProperties {
  return {
    flex: 1,
    border: "none",
    borderRadius: 14,
    padding: "12px 10px",
    background: theme?.colors?.primary ?? "#7dffca",
    color: "#06110c",
    fontWeight: 1000,
    letterSpacing: 0.6,
  };
}

function ghost(theme: any): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    padding: "10px 10px",
    border: isDark(theme) ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.12)",
    background: "transparent",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
  };
}

function mid(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    background: isDark(theme) ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
    border: isDark(theme) ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  };
}

const vs: React.CSSProperties = { fontWeight: 1000, opacity: 0.75, letterSpacing: 2.2 };
function target(theme: any): React.CSSProperties {
  return { fontWeight: 900, opacity: 0.9, marginTop: 6 };
}

function done(theme: any): React.CSSProperties {
  return {
    marginTop: 14,
    borderRadius: 16,
    padding: 12,
    textAlign: "center",
    fontWeight: 1000,
    background: isDark(theme) ? "rgba(125,255,202,0.12)" : "rgba(0,0,0,0.06)",
    border: isDark(theme) ? "1px solid rgba(125,255,202,0.22)" : "1px solid rgba(0,0,0,0.08)",
  };
}

function hint(theme: any): React.CSSProperties {
  return { marginTop: 12, opacity: 0.82, fontWeight: 700, textAlign: "center" };
}
