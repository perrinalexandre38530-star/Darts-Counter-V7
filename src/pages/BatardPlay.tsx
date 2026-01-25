import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";

type BotLevel = "easy" | "normal" | "hard";
export type BatardPlayConfig = {
  players: number;
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective: number;
};

const INFO_TEXT = `BÂTARD (mode fun) — version jouable\n\nRègles (implémentation actuelle):\n- Les joueurs marquent un score (0..180) à chaque volée.\n- Le score s'additionne.\n- Objectif: premier joueur qui atteint (ou dépasse) l'objectif gagne immédiatement.\n- Si objectif = 0, on joue uniquement en nombre de rounds (gagnant = plus gros total).`;

export default function BatardPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: BatardPlayConfig =
    (props?.params?.config as BatardPlayConfig) ||
    (props?.config as BatardPlayConfig) ||
    {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      rounds: 10,
      objective: 200,
    };

  const [roundIdx, setRoundIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [scores, setScores] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));
  const [visit, setVisit] = useState(0);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);

  const isFinished = useMemo(() => {
    if (winnerIdx !== null) return true;
    return roundIdx >= cfg.rounds;
  }, [winnerIdx, roundIdx, cfg.rounds]);

  const computedWinner = useMemo(() => {
    if (!isFinished) return null;
    if (winnerIdx !== null) return { idx: winnerIdx, score: scores[winnerIdx] };
    // fallback: best total at end of rounds
    let best = -Infinity;
    let w = 0;
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > best) {
        best = scores[i];
        w = i;
      }
    }
    return { idx: w, score: best };
  }, [isFinished, winnerIdx, scores]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function clamp(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(180, Math.floor(n)));
  }

  function validate() {
    if (isFinished) return;
    const v = clamp(visit);

    const nextScores = [...scores];
    nextScores[playerIdx] = nextScores[playerIdx] + v;
    setScores(nextScores);

    // win condition if objective
    if (cfg.objective > 0 && nextScores[playerIdx] >= cfg.objective) {
      setWinnerIdx(playerIdx);
      return;
    }

    setVisit(0);

    const nextP = (playerIdx + 1) % cfg.players;
    const nextR = nextP === 0 ? roundIdx + 1 : roundIdx;

    setPlayerIdx(nextP);
    setRoundIdx(nextR);
  }

  return (
    <div className="page">
      <PageHeader
        title="BÂTARD"
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles BÂTARD" content={INFO_TEXT} />}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.round", "ROUND")} {Math.min(roundIdx + 1, cfg.rounds)}/{cfg.rounds}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>Bâtard</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                {cfg.objective > 0 ? `${t("config.objective", "Objectif")} : ${cfg.objective}` : t("generic.noObjective", "Sans objectif")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.player", "JOUEUR")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>
                {isFinished ? "—" : `${playerIdx + 1}/${cfg.players}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

        {isFinished && computedWinner && (
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
            {t("generic.winner", "Gagnant")} : {t("generic.player", "Joueur")} {computedWinner.idx + 1} — {computedWinner.score}
          </div>
        )}
      </div>
    </div>
  );
}
