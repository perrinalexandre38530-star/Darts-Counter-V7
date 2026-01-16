// =============================================================
// src/pages/babyfoot/BabyFootPlay.tsx
// Baby-Foot — Play (LOCAL ONLY)
// - Score simple A/B + undo
// - Appelle onFinish() à la fin du match pour pousser l'historique
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { addGoal, loadBabyFootState, saveBabyFootState, undo as undoGoal } from "../../lib/babyfootStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

export default function BabyFootPlay({ go, onFinish }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadBabyFootState());

  React.useEffect(() => {
    saveBabyFootState(st);
  }, [st]);

  const finish = React.useCallback(() => {
    if (!onFinish) return;
    const now = Date.now();
    const winnerTeam = st.winner;
    const winnerId = winnerTeam ? winnerTeam : null;
    onFinish({
      id: st.matchId,
      kind: "babyfoot",
      sport: "babyfoot",
      createdAt: st.createdAt || now,
      updatedAt: now,
      teams: {
        A: { id: "A", name: st.teamA },
        B: { id: "B", name: st.teamB },
      },
      scores: { A: st.scoreA, B: st.scoreB },
      target: st.target,
      winnerTeamId: winnerId,
      summary: {
        title: `${st.teamA} ${st.scoreA}–${st.scoreB} ${st.teamB}`,
      },
    });
  }, [onFinish, st]);

  React.useEffect(() => {
    if (st.finished) {
      // Auto push history dès que le match est terminé
      finish();
    }
  }, [st.finished, finish]);

  return (
    <div style={wrap(theme)}>
      <div style={head}>
        <button style={back(theme)} onClick={() => go("home")}>
          ✕
        </button>
        <div style={title}>BABY-FOOT</div>
        <button style={ghost(theme)} onClick={() => setSt(loadBabyFootState())}>
          ↻
        </button>
      </div>

      <div style={kpi(theme)}>
        <div style={teamBlock(theme)}>
          <div style={teamName}>{st.teamA}</div>
          <div style={teamScore}>{st.scoreA}</div>
          <div style={btnRow}>
            <button style={btn(theme)} onClick={() => setSt(addGoal(st, "A", +1))}>+1</button>
            <button style={btn(theme)} onClick={() => setSt(addGoal(st, "A", -1))}>-1</button>
          </div>
        </div>

        <div style={mid(theme)}>
          <div style={vs}>VS</div>
          <div style={target(theme)}>Cible : {st.target}</div>
          <div style={{ height: 10 }} />
          <button style={btn(theme)} onClick={() => setSt(undoGoal(st))}>
            Annuler
          </button>
        </div>

        <div style={teamBlock(theme)}>
          <div style={teamName}>{st.teamB}</div>
          <div style={teamScore}>{st.scoreB}</div>
          <div style={btnRow}>
            <button style={btn(theme)} onClick={() => setSt(addGoal(st, "B", +1))}>+1</button>
            <button style={btn(theme)} onClick={() => setSt(addGoal(st, "B", -1))}>-1</button>
          </div>
        </div>
      </div>

      {st.finished ? (
        <div style={done(theme)}>
          Match terminé{st.winner ? ` — Victoire : ${st.winner === "A" ? st.teamA : st.teamB}` : ""}
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
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}

const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const title: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 1, flex: 1, textAlign: "center" };

function back(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    width: 40,
    height: 40,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

function ghost(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    width: 40,
    height: 40,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    cursor: "pointer",
    opacity: 0.9,
  };
}

function kpi(theme: any): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 12,
    alignItems: "stretch",
  };
}

function teamBlock(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  };
}

const teamName: React.CSSProperties = { fontWeight: 950, letterSpacing: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const teamScore: React.CSSProperties = { fontWeight: 1000 as any, fontSize: 42, letterSpacing: 1, textAlign: "center" };
const btnRow: React.CSSProperties = { display: "flex", gap: 10 };

function btn(theme: any): React.CSSProperties {
  return {
    flex: 1,
    borderRadius: 14,
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 950,
    cursor: "pointer",
  };
}

function mid(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  };
}

const vs: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 1, opacity: 0.9 };

function target(theme: any): React.CSSProperties {
  return {
    marginTop: 8,
    fontWeight: 900,
    opacity: 0.85,
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
  };
}

function done(theme: any): React.CSSProperties {
  return {
    marginTop: 4,
    textAlign: "center",
    fontWeight: 950,
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,255,180,0.10)",
  };
}

function hint(theme: any): React.CSSProperties {
  return {
    marginTop: 4,
    textAlign: "center",
    opacity: 0.75,
    fontWeight: 800,
    fontSize: 12,
  };
}
