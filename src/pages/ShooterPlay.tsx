import React, { useEffect, useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerShooter from "../assets/tickers/ticker_shooter.png";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";

type BotLevel = "easy" | "normal" | "hard";
type Config = {
  players: number;
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number; // nombre de tours max
  objective: number; // nb de cibles à valider (0 => séquence complète)
};

const INFO_TEXT =
  "Shooter : défi précision. Chaque joueur doit valider une séquence de cibles. À son tour, il saisit la cible touchée (ex: 20, 19, 25=BULL, 50=DBULL). Si ça correspond à la cible active, il avance et marque 1 point. Sinon aucun point. Victoire : premier à valider l'objectif (ou toute la séquence).";

const SEQUENCE_DEFAULT = [20, 19, 18, 17, 16, 15, 25, 50]; // 25=BULL, 50=DBULL

function clampHit(n: number) {
  if (!Number.isFinite(n)) return 0;
  const v = Math.floor(n);
  if (v === 25 || v === 50) return v;
  return Math.max(0, Math.min(20, v));
}

function botHitForTarget(target: number, level: BotLevel) {
  // proba simple de toucher la cible
  const p = level === "easy" ? 0.35 : level === "hard" ? 0.75 : 0.55;
  if (Math.random() < p) return target;
  // sinon random plausible
  const pool = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25, 50];
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function ShooterPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: Config =
    (props?.params?.config as Config) ||
    (props?.config as Config) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      rounds: 10,
      objective: 0,
    };

  const sequence = SEQUENCE_DEFAULT;
  const objectiveCount = cfg.objective && cfg.objective > 0 ? Math.min(cfg.objective, sequence.length) : sequence.length;

  const [roundIdx, setRoundIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);

  // progression par joueur (index dans sequence) + score (= nb validées)
  const [progress, setProgress] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));
  const [scores, setScores] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));

  const [hit, setHit] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);

  const isFinished = gameOver || roundIdx >= cfg.rounds || winnerIdx !== null;

  const currentTarget = useMemo(() => {
    const p = progress[playerIdx] ?? 0;
    return sequence[Math.min(p, sequence.length - 1)];
  }, [progress, playerIdx, sequence]);

  const winner = useMemo(() => {
    if (!isFinished) return null;
    if (winnerIdx !== null) return { idx: winnerIdx, score: scores[winnerIdx] ?? 0 };
    // fin par limite rounds => meilleur score
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

  function resetGame() {
    setRoundIdx(0);
    setPlayerIdx(0);
    setProgress(Array.from({ length: cfg.players }, () => 0));
    setScores(Array.from({ length: cfg.players }, () => 0));
    setHit(0);
    setGameOver(false);
    setWinnerIdx(null);
  }

  function validateHit(hitValue: number) {
    if (isFinished) return;

    const h = clampHit(hitValue);
    const target = currentTarget;

    const ok = h === target;

    if (ok) {
      setProgress((prev) => {
        const out = [...prev];
        out[playerIdx] = Math.min(out[playerIdx] + 1, sequence.length);
        return out;
      });
      setScores((prev) => {
        const out = [...prev];
        out[playerIdx] = out[playerIdx] + 1;
        return out;
      });
    }

    setHit(0);

    // win check (après state update: on calcule localement)
    const nextProg = (progress[playerIdx] ?? 0) + (ok ? 1 : 0);
    if (nextProg >= objectiveCount) {
      setWinnerIdx(playerIdx);
      setGameOver(true);
      return;
    }

    // next player / round
    const nextP = (playerIdx + 1) % cfg.players;
    const nextR = nextP === 0 ? roundIdx + 1 : roundIdx;
    setPlayerIdx(nextP);
    setRoundIdx(nextR);
  }

  // Bots : on considère joueur 1..N-1 comme bots si botsEnabled
  const isBotTurn = cfg.botsEnabled && playerIdx !== 0;

  useEffect(() => {
    if (!isBotTurn) return;
    if (isFinished) return;
    const target = currentTarget;
    const h = botHitForTarget(target, cfg.botLevel);
    const timer = setTimeout(() => validateHit(h), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, isFinished, playerIdx, currentTarget]);

  return (
    <div className="page">
      <PageHeader
        title="SHOOTER"
        tickerSrc={tickerShooter}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles SHOOTER" content={INFO_TEXT} />}
      />

      <div style={{ padding: 16 }}>
        {isFinished && winner ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              {t("game.winner", "Vainqueur")} : {t("player", "Joueur")} {winner.idx + 1} — {winner.score}{" "}
              {t("points", "pts")}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={resetGame}>
                {t("game.replay", "Rejouer")}
              </button>
              <button className="btn" onClick={goBack}>
                {t("game.menu", "Menu")}
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ opacity: 0.9, marginBottom: 10 }}>
          {t("round", "Tour")} {Math.min(roundIdx + 1, cfg.rounds)} / {cfg.rounds} — {t("turn", "Tour")} :{" "}
          {t("player", "Joueur")} {playerIdx + 1}
        </div>

        <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)" }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            {t("target", "Cible")} : <span style={{ fontSize: 18 }}>{currentTarget === 25 ? "BULL (25)" : currentTarget === 50 ? "DBULL (50)" : currentTarget}</span>
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {t("objective", "Objectif")} : {objectiveCount} {t("targets", "cibles")} — {t("score", "Score")} :{" "}
            {scores.map((s, i) => `${i + 1}:${s}`).join("  ")}
          </div>
        </div>

        {!isFinished ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={hit}
              onChange={(e) => setHit(Number(e.target.value))}
              type="number"
              min={0}
              max={50}
              disabled={isBotTurn}
              style={{
                width: 160,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.15)",
                background: "rgba(0,0,0,.25)",
                color: "white",
                opacity: isBotTurn ? 0.5 : 1,
              }}
              placeholder="ex: 20 / 25 / 50"
            />
            <button className="btn" onClick={() => validateHit(hit)} disabled={isBotTurn}>
              {t("validate", "Valider")}
            </button>
            {isBotTurn ? <div style={{ opacity: 0.75 }}>{t("botPlaying", "Bot en cours...")}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
