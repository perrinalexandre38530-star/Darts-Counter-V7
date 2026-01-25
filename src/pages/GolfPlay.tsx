import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerGolf from "../assets/tickers/ticker_golf.png";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import type { GolfConfigPayload } from "./GolfConfig";

type Turn = {
  holeIdx: number; // 0-based
  playerIdx: number;
  strokes: number;
};

const INFO_TEXT = `Règles GOLF (darts) — version jouable\n\n- Partie en 9 ou 18 trous.\n- Au trou N, la cible est le numéro N (1..9 ou 1..18).\n- Chaque joueur a 3 flèches.\n- Score du trou = 1 si tu touches la cible à la 1ère flèche, 2 à la 2e, 3 à la 3e.\n- Si tu ne touches pas la cible : pénalité (configurable).\n- Total = somme des trous. Score le plus bas = vainqueur.`;

function safeInt(n: any, fallback = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.floor(x);
}

export default function GolfPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: GolfConfigPayload =
    (props?.params?.config as GolfConfigPayload) ||
    (props?.config as GolfConfigPayload) ||
    {
      players: 2,
      holes: 9,
      teamsEnabled: false,
      botsEnabled: false,
      botLevel: "normal",
      missStrokes: 4,
    };

  const players = Math.max(2, Math.min(8, safeInt(cfg.players, 2)));
  const holes = cfg.holes === 18 ? 18 : 9;
  const missStrokes = cfg.missStrokes ?? 4;

  const [holeIdx, setHoleIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [holeScores, setHoleScores] = useState<number[][]>(() =>
    Array.from({ length: players }, () => Array.from({ length: holes }, () => 0))
  );
  const [history, setHistory] = useState<Turn[]>([]);

  const isFinished = holeIdx >= holes;

  const totals = useMemo(() => {
    return holeScores.map((row) => row.reduce((a, b) => a + (b || 0), 0));
  }, [holeScores]);

  const teams = useMemo(() => {
    if (!cfg.teamsEnabled) return null;
    const a: number[] = [];
    const b: number[] = [];
    for (let i = 0; i < players; i++) {
      (i % 2 === 0 ? a : b).push(i);
    }
    const sum = (idxs: number[]) => idxs.reduce((acc, i) => acc + (totals[i] || 0), 0);
    return {
      A: { players: a, total: sum(a) },
      B: { players: b, total: sum(b) },
    };
  }, [cfg.teamsEnabled, players, totals]);

  const winner = useMemo(() => {
    if (!isFinished) return null;
    if (teams) {
      const w = teams.A.total <= teams.B.total ? "A" : "B";
      const best = Math.min(teams.A.total, teams.B.total);
      return { kind: "team" as const, label: `TEAM ${w}`, total: best };
    }
    let best = Infinity;
    let w = 0;
    for (let i = 0; i < totals.length; i++) {
      if (totals[i] < best) {
        best = totals[i];
        w = i;
      }
    }
    return { kind: "player" as const, idx: w, total: best };
  }, [isFinished, teams, totals]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function record(strokes: number) {
    if (isFinished) return;
    const s = Math.max(1, Math.min(10, safeInt(strokes, missStrokes)));

    setHoleScores((prev) => {
      const out = prev.map((r) => [...r]);
      out[playerIdx][holeIdx] = s;
      return out;
    });

    setHistory((h) => [...h, { holeIdx, playerIdx, strokes: s }]);

    const nextP = (playerIdx + 1) % players;
    const nextH = nextP === 0 ? holeIdx + 1 : holeIdx;

    setPlayerIdx(nextP);
    setHoleIdx(nextH);
  }

  function undo() {
    setHistory((h) => {
      if (!h.length) return h;
      const last = h[h.length - 1];

      setHoleScores((prev) => {
        const out = prev.map((r) => [...r]);
        out[last.playerIdx][last.holeIdx] = 0;
        return out;
      });

      setHoleIdx(last.holeIdx);
      setPlayerIdx(last.playerIdx);

      return h.slice(0, -1);
    });
  }

  const targetNumber = holeIdx + 1;

  return (
    <div className="page">
      <PageHeader
        title="GOLF"
        tickerSrc={tickerGolf}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles GOLF" content={INFO_TEXT} />}
      />

      <div style={{ padding: 12 }}>
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.hole", "TROU")} {Math.min(holeIdx + 1, holes)}/{holes}
              </div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1000 }}>
                {t("golf.target", "Cible")} : {isFinished ? "—" : targetNumber}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.player", "JOUEUR")}
              </div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1000 }}>
                {isFinished ? "—" : `${playerIdx + 1}/${players}`}
              </div>
            </div>
          </div>

          {cfg.teamsEnabled && teams && (
            <div style={{ marginTop: 10, display: "flex", gap: 10, justifyContent: "space-between" }}>
              <div style={{ fontWeight: 950, opacity: 0.95 }}>
                TEAM A: {teams.A.total}
              </div>
              <div style={{ fontWeight: 950, opacity: 0.95 }}>
                TEAM B: {teams.B.total}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {totals.map((total, i) => {
            const active = !isFinished && i === playerIdx;
            return (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: active ? "1px solid rgba(120,255,200,0.35)" : "1px solid rgba(255,255,255,0.10)",
                  background: active ? "rgba(120,255,200,0.10)" : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>
                  {t("generic.player", "Joueur")} {i + 1}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{total}</div>
              </div>
            );
          })}
        </div>

        {!isFinished && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950, letterSpacing: 0.8 }}>
              {t("golf.enter", "Résultat du trou")} — {t("golf.tap", "choisis sur quelle flèche tu touches la cible")}
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => record(1)} style={btnStyle(true)}>
                {t("golf.hit", "Hit")} 1
              </button>
              <button onClick={() => record(2)} style={btnStyle(true)}>
                {t("golf.hit", "Hit")} 2
              </button>
              <button onClick={() => record(3)} style={btnStyle(true)}>
                {t("golf.hit", "Hit")} 3
              </button>
              <button onClick={() => record(missStrokes)} style={btnStyle(false)}>
                {t("golf.miss", "Miss")} ({missStrokes})
              </button>
            </div>

            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={undo} disabled={!history.length} style={undoStyle(!history.length)}>
                {t("generic.undo", "Annuler")}
              </button>
            </div>
          </div>
        )}

        {isFinished && winner && (
          <div
            style={{
              marginTop: 12,
              borderRadius: 18,
              padding: 14,
              border: "1px solid rgba(255,215,100,0.35)",
              background: "rgba(255,215,100,0.12)",
              fontWeight: 1000,
            }}
          >
            {t("generic.winner", "Gagnant")} :{" "}
            {winner.kind === "team" ? winner.label : `${t("generic.player", "Joueur")} ${winner.idx + 1}`} — {winner.total}
          </div>
        )}

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                {Array.from({ length: holes }, (_, i) => (
                  <th key={i} style={thStyle}> {i + 1} </th>
                ))}
                <th style={thStyle}>{t("generic.total", "Total")}</th>
              </tr>
            </thead>
            <tbody>
              {holeScores.map((row, p) => (
                <tr key={p}>
                  <td style={tdStyle(true)}>{p + 1}</td>
                  {row.map((v, i) => (
                    <td key={i} style={tdStyle(false)}>
                      {v || "—"}
                    </td>
                  ))}
                  <td style={tdStyle(true)}>{totals[p]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    borderRadius: 14,
    border: primary ? "1px solid rgba(120,255,200,0.22)" : "1px solid rgba(255,120,120,0.22)",
    background: primary ? "rgba(120,255,200,0.14)" : "rgba(255,120,120,0.14)",
    padding: "14px 14px",
    fontWeight: 1000,
    cursor: "pointer",
    color: "#fff",
  };
}

function undoStyle(disabled: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
    padding: "10px 12px",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    color: "#fff",
    opacity: disabled ? 0.55 : 1,
  };
}

const thStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  textAlign: "center",
  fontSize: 12,
  opacity: 0.85,
  fontWeight: 900,
  padding: "8px 6px",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.25)",
};

function tdStyle(bold: boolean): React.CSSProperties {
  return {
    textAlign: "center",
    fontWeight: bold ? 1000 : 900,
    padding: "10px 6px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
    minWidth: 38,
  };
}
