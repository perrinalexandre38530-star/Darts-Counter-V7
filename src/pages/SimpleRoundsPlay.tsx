import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";
import type { CommonConfig } from "../lib/simpleRounds/types";

const clamp = (n: number) => {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  return Math.max(0, Math.min(180, v));
};

export default function SimpleRoundsPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const variantId: string = props?.variantId ?? "count_up";
  const spec = SIMPLE_ROUND_VARIANTS[variantId];

  const cfg: CommonConfig =
    (props?.params?.config as CommonConfig) ||
    (props?.config as CommonConfig) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      rounds: 10,
      objective: 0,
    };

  const [roundIdx, setRoundIdx] = useState(0); // 0..cfg.rounds
  const [playerIdx, setPlayerIdx] = useState(0);
  const [scores, setScores] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));
  const [visit, setVisit] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);

  const isFinished = gameOver || roundIdx >= cfg.rounds;

  const winner = useMemo(() => {
    if (!isFinished) return null;
    if (winnerIdx != null) return { idx: winnerIdx, score: scores[winnerIdx] };
    const idx = spec?.computeWinnerOnEnd(scores) ?? 0;
    return { idx, score: scores[idx] };
  }, [isFinished, winnerIdx, scores, spec]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function advanceTurn(nextScores: number[], forcedWinner: number | null) {
    setScores(nextScores);

    if (forcedWinner != null) {
      setWinnerIdx(forcedWinner);
      setGameOver(true);
      return;
    }

    // next player
    let nextPlayer = playerIdx + 1;
    let nextRound = roundIdx;

    if (nextPlayer >= cfg.players) {
      nextPlayer = 0;
      nextRound = roundIdx + 1;
    }

    setPlayerIdx(nextPlayer);
    setRoundIdx(nextRound);

    if (nextRound >= cfg.rounds) {
      setGameOver(true);
    }
  }

  function validate() {
    if (!spec) return;
    const v = clamp(visit);

    const res = spec.applyVisit({
      visit: v,
      currentScore: scores[playerIdx] ?? 0,
      objective: cfg.objective,
      roundIndex: roundIdx,
    });

    const nextScores = [...scores];
    nextScores[playerIdx] = (nextScores[playerIdx] ?? 0) + (res.delta ?? 0);

    const forceWin = !!res.forceWin;
    advanceTurn(nextScores, forceWin ? playerIdx : null);
    setVisit(0);
  }

  if (!spec) {
    return (
      <div className="page" style={{ padding: 16, color: "#fff" }}>
        Variante inconnue: {String(variantId)}
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={spec.title}
        tickerSrc={spec.tickerSrc}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title={spec.infoTitle} content={spec.infoText} />}
      />

      <div style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 1000 }}>
            {t("generic.round", "Round")} {Math.min(roundIdx + 1, cfg.rounds)}/{cfg.rounds}
          </div>
          {!isFinished && (
            <div style={{ fontWeight: 900, opacity: 0.9 }}>
              {t("generic.turn", "Tour")} : {t("generic.player", "Joueur")} {playerIdx + 1}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cfg.players}, minmax(0,1fr))`, gap: 10 }}>
          {scores.map((s, i) => {
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
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{s}</div>
              </div>
            );
          })}
        </div>

        {!isFinished && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950, letterSpacing: 0.8 }}>
              {t("generic.visit", "VOLÉE")} — {t("generic.input", "entre un score 0..180")}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <input
                value={String(visit)}
                onChange={(e) => setVisit(clamp(Number(e.target.value)))}
                inputMode="numeric"
                style={{
                  flex: 1,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#fff",
                  padding: "12px 12px",
                  fontWeight: 900,
                  outline: "none",
                }}
              />

              <button
                onClick={validate}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(120,255,200,0.22)",
                  background: "rgba(120,255,200,0.14)",
                  padding: "12px 14px",
                  fontWeight: 1000,
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                {t("generic.validate", "Valider")}
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
            {t("generic.winner", "Gagnant")} : {t("generic.player", "Joueur")} {winner.idx + 1} — {winner.score}
          </div>
        )}
      </div>
    </div>
  );
}
