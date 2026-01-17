// =============================================================
// src/pages/pingpong/PingPongPlay.tsx
// Ping-Pong — Play (LOCAL ONLY)
// - Sets + points A/B + undo
// - Auto appelle onFinish() quand sets gagnants atteints
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  addPoint,
  loadPingPongState,
  savePingPongState,
  undo as undoPoint,
  tournanteEliminate,
} from "../../lib/pingpongStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

export default function PingPongPlay({ go, onFinish }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadPingPongState());

  React.useEffect(() => {
    savePingPongState(st);
  }, [st]);

  const finish = React.useCallback(() => {
    if (!onFinish) return;
    const now = Date.now();
    if (st.mode === "tournante") {
      const w = st.tournanteWinner || (Array.isArray(st.tournantePlayers) && st.tournantePlayers.length === 1 ? st.tournantePlayers[0] : null);
      onFinish({
        id: st.matchId,
        kind: "pingpong",
        sport: "pingpong",
        createdAt: st.createdAt || now,
        updatedAt: now,
        mode: "tournante",
        players: { active: st.tournantePlayers || [], eliminated: st.tournanteEliminated || [] },
        winnerName: w,
        summary: {
          title: w ? `Tournante — Vainqueur : ${w}` : "Tournante — terminée",
        },
      });
      return;
    }

    const winnerSideId = st.winner;
    const title =
      st.mode === "simple"
        ? `${st.sideA} ${st.pointsA}–${st.pointsB} ${st.sideB}`
        : `${st.sideA} ${st.setsA}–${st.setsB} ${st.sideB}`;

    onFinish({
      id: st.matchId,
      kind: "pingpong",
      sport: "pingpong",
      createdAt: st.createdAt || now,
      updatedAt: now,
      mode: st.mode,
      sides: {
        A: { id: "A", name: st.sideA },
        B: { id: "B", name: st.sideB },
      },
      config: { pointsPerSet: st.pointsPerSet, setsToWin: st.setsToWin, winByTwo: st.winByTwo },
      state: {
        setIndex: st.setIndex,
        points: { A: st.pointsA, B: st.pointsB },
        sets: { A: st.setsA, B: st.setsB },
      },
      winnerSideId,
      summary: {
        title,
        detail:
          st.mode === "simple"
            ? `Points: ${st.pointsA}–${st.pointsB}`
            : `Points set ${st.setIndex}: ${st.pointsA}–${st.pointsB}`,
      },
    });
  }, [onFinish, st]);

  React.useEffect(() => {
    if (st.finished) finish();
  }, [st.finished, finish]);

  return (
    <div style={wrap(theme)}>
      <div style={head}>
        <button style={back(theme)} onClick={() => go("home")}>
          ✕
        </button>
        <div style={title}>PING-PONG</div>
        <button style={ghost(theme)} onClick={() => setSt(loadPingPongState())}>
          ↻
        </button>
      </div>

      {st.mode === "tournante" ? (
        <div style={kpi(theme)}>
          <div style={{ gridColumn: "1 / -1", ...sideBlock(theme) }}>
            <div style={{ fontWeight: 1000, letterSpacing: 1, textAlign: "center" }}>TOURNANTE</div>
            <div style={{ fontWeight: 900, opacity: 0.85, textAlign: "center", fontSize: 12 }}>
              Joueurs restants : {(st.tournantePlayers || []).length}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {(st.tournantePlayers || []).map((p) => (
                <button
                  key={p}
                  style={btn(theme)}
                  onClick={() => {
                    if (st.tournantePlayers.length <= 1) return;
                    setSt(tournanteEliminate(st, p));
                  }}
                >
                  Éliminer : {p}
                </button>
              ))}
            </div>

            {(st.tournanteEliminated || []).length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 800, opacity: 0.85 }}>
                Éliminés : {(st.tournanteEliminated || []).join(", ")}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={kpi(theme)}>
          <div style={sideBlock(theme)}>
            <div style={sideName}>{st.sideA}</div>
            {st.mode === "sets" && (
              <div style={setsLine}>
                <span style={setsLabel}>Sets</span>
                <span style={setsVal}>{st.setsA}</span>
              </div>
            )}
            <div style={pointsVal}>{st.pointsA}</div>
            <div style={btnRow}>
              <button style={btn(theme)} onClick={() => setSt(addPoint(st, "A", +1))}>
                +1
              </button>
              <button style={btn(theme)} onClick={() => setSt(addPoint(st, "A", -1))}>
                -1
              </button>
            </div>
          </div>

          <div style={mid(theme)}>
            <div style={vs}>{st.mode === "simple" ? "MATCH" : `SET ${st.setIndex}`}</div>
            <div style={meta(theme)}>
              {st.mode === "simple"
                ? `${st.pointsPerSet} pts${st.winByTwo ? " · écart 2" : ""}`
                : `${st.setsToWin} sets gagnants · ${st.pointsPerSet} pts${st.winByTwo ? " · écart 2" : ""}`}
            </div>
            <div style={{ height: 10 }} />
            <button style={btn(theme)} onClick={() => setSt(undoPoint(st))}>
              Annuler
            </button>
          </div>

          <div style={sideBlock(theme)}>
            <div style={sideName}>{st.sideB}</div>
            {st.mode === "sets" && (
              <div style={setsLine}>
                <span style={setsLabel}>Sets</span>
                <span style={setsVal}>{st.setsB}</span>
              </div>
            )}
            <div style={pointsVal}>{st.pointsB}</div>
            <div style={btnRow}>
              <button style={btn(theme)} onClick={() => setSt(addPoint(st, "B", +1))}>
                +1
              </button>
              <button style={btn(theme)} onClick={() => setSt(addPoint(st, "B", -1))}>
                -1
              </button>
            </div>
          </div>
        </div>
      )}

      {st.finished ? (
        <div style={done(theme)}>
          {st.mode === "tournante"
            ? `Tournante terminée${st.tournanteWinner ? ` — Vainqueur : ${st.tournanteWinner}` : ""}`
            : `Match terminé — Victoire : ${st.winner === "A" ? st.sideA : st.sideB}`}
        </div>
      ) : (
        <div style={hint(theme)}>
          {st.mode === "tournante"
            ? "Tape sur un joueur pour l'éliminer. Le dernier restant gagne."
            : `Points +1/-1. ${st.mode === "simple" ? "Le match" : "Un set"} est gagné quand ${st.pointsPerSet} points sont atteints${st.winByTwo ? " avec 2 points d'écart" : ""}.`}
        </div>
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

function sideBlock(theme: any): React.CSSProperties {
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

const sideName: React.CSSProperties = {
  fontWeight: 950,
  letterSpacing: 0.3,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const setsLine: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  opacity: 0.9,
};

const setsLabel: React.CSSProperties = { fontWeight: 900, fontSize: 12, letterSpacing: 0.3, opacity: 0.85 };
const setsVal: React.CSSProperties = { fontWeight: 1000 as any, fontSize: 20, letterSpacing: 0.5 };

const pointsVal: React.CSSProperties = { fontWeight: 1000 as any, fontSize: 42, letterSpacing: 1, textAlign: "center" };
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
    minWidth: 140,
  };
}

const vs: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 1, opacity: 0.9 };

function meta(theme: any): React.CSSProperties {
  return {
    marginTop: 8,
    fontWeight: 900,
    opacity: 0.85,
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    textAlign: "center",
    fontSize: 12,
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
    lineHeight: 1.35,
  };
}
