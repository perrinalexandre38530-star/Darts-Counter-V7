// @ts-nocheck
import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerKnockout from "../assets/tickers/ticker_knockout.png";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import ScoreInputHub from "../components/ScoreInputHub";
import type { Dart as UIDart } from "../lib/types";
import { History } from "../lib/history";
import { buildDartsTelemetry, canonicalVisitFromUiDarts, scoreDarts } from "../lib/dartsTelemetry";

type BotLevel = "easy" | "normal" | "hard";
type Config = {
  players: number;
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number; // nombre de manches max
  objective: number; // non utilisé (compat)
};

const INFO_TEXT =
  "Knockout : à la fin de chaque manche, le score de manche le plus faible est éliminé (égalité = élimination de tous les derniers). Dernier joueur en vie = vainqueur.";

function clampVisit(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(180, Math.floor(n)));
}

function nextActiveIdx(active: boolean[], startIdx: number, roundVisits: number[]) {
  const n = active.length;
  for (let k = 1; k <= n; k++) {
    const i = (startIdx + k) % n;
    if (active[i] && roundVisits[i] < 0) return i;
  }
  return -1;
}

export default function KnockoutPlay(props: any) {
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

  const [roundIdx, setRoundIdx] = useState(0);
  const [active, setActive] = useState<boolean[]>(() => Array.from({ length: cfg.players }, () => true));
  const [playerIdx, setPlayerIdx] = useState(0);

  // total (affichage)
  const [totals, setTotals] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));
  // scores de la manche en cours (=-1 => pas encore joué)
  const [roundVisits, setRoundVisits] = useState<number[]>(() => Array.from({ length: cfg.players }, () => -1));

  const [currentThrow, setCurrentThrow] = useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const visitHistoryRef = React.useRef<any[]>([]);
  const matchIdRef = React.useRef(`knockout-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
  const createdAtRef = React.useRef(Date.now());
  const savedRef = React.useRef(false);
  const [gameOver, setGameOver] = useState(false);

  const aliveCount = useMemo(() => active.filter(Boolean).length, [active]);

  const isFinished = gameOver || aliveCount <= 1 || roundIdx >= cfg.rounds;

  const winner = useMemo(() => {
    if (!isFinished) return null;
    // Si un seul alive => winner = celui-là
    const aliveIdx = active.findIndex((a) => a);
    if (aliveCount === 1 && aliveIdx >= 0) return { idx: aliveIdx };

    // Sinon (fin par limite de manches), winner = meilleur total parmi alive
    let best = -Infinity;
    let w = -1;
    for (let i = 0; i < totals.length; i++) {
      if (!active[i]) continue;
      if (totals[i] > best) {
        best = totals[i];
        w = i;
      }
    }
    return w >= 0 ? { idx: w } : null;
  }, [isFinished, active, aliveCount, totals]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function resetGame() {
    setRoundIdx(0);
    setActive(Array.from({ length: cfg.players }, () => true));
    setPlayerIdx(0);
    setTotals(Array.from({ length: cfg.players }, () => 0));
    setRoundVisits(Array.from({ length: cfg.players }, () => -1));
    setCurrentThrow([]);
    setMultiplier(1);
    visitHistoryRef.current = [];
    savedRef.current = false;
    setGameOver(false);
  }

  function finishIfNeeded(nextActive: boolean[], nextRoundIdx: number) {
    const alive = nextActive.filter(Boolean).length;
    if (alive <= 1 || nextRoundIdx >= cfg.rounds) {
      setGameOver(true);
      return true;
    }
    return false;
  }

  function endRoundAndEliminate(currentActive: boolean[], currentRoundVisits: number[]) {
    // min sur joueurs actifs
    let min = Infinity;
    for (let i = 0; i < currentRoundVisits.length; i++) {
      if (!currentActive[i]) continue;
      min = Math.min(min, currentRoundVisits[i]);
    }
    const eliminated: number[] = [];
    for (let i = 0; i < currentRoundVisits.length; i++) {
      if (!currentActive[i]) continue;
      if (currentRoundVisits[i] === min) eliminated.push(i);
    }

    const nextActive = [...currentActive];
    eliminated.forEach((i) => (nextActive[i] = false));

    const nextRoundIdx = roundIdx + 1;

    setActive(nextActive);
    setRoundIdx(nextRoundIdx);
    setRoundVisits(Array.from({ length: cfg.players }, () => -1));
    setCurrentThrow([]);
    setMultiplier(1);

    // next player = premier alive
    const first = nextActive.findIndex((a) => a);
    setPlayerIdx(first >= 0 ? first : 0);

    finishIfNeeded(nextActive, nextRoundIdx);
  }

  function validate() {
    if (isFinished || !currentThrow.length) return;

    const exactDarts = currentThrow.slice(0, 3);
    const v = clampVisit(scoreDarts(exactDarts));
    const pid = `p${playerIdx + 1}`;
    const visitIndex = visitHistoryRef.current.filter((row: any) => String(row?.playerId) === pid).length;
    visitHistoryRef.current.push(canonicalVisitFromUiDarts({
      playerId: pid,
      darts: exactDarts,
      visitIndex,
      roundIndex: roundIdx,
      source: "knockout",
    }));

    // marque la visite du joueur dans la manche
    setRoundVisits((prev) => {
      const out = [...prev];
      out[playerIdx] = v;
      return out;
    });

    // ajoute au total
    setTotals((prev) => {
      const out = [...prev];
      out[playerIdx] = out[playerIdx] + v;
      return out;
    });

    setCurrentThrow([]);
    setMultiplier(1);

    const nextVisits = [...roundVisits];
    nextVisits[playerIdx] = v;

    // prochain joueur actif non joué sur cette manche
    const np = nextActiveIdx(active, playerIdx, nextVisits);
    if (np >= 0) {
      setPlayerIdx(np);
      return;
    }

    // manche finie => élimination
    endRoundAndEliminate(active, nextVisits);
  }

  React.useEffect(() => {
    if (!isFinished || !winner || savedRef.current) return;
    savedRef.current = true;
    const players = Array.from({ length: cfg.players }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
    const rec: any = {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: "knockout",
      sport: "darts",
      status: "finished",
      createdAt: createdAtRef.current,
      updatedAt: Date.now(),
      players,
      winnerId: players[winner.idx]?.id ?? null,
      game: { mode: "knockout", rounds: cfg.rounds },
      summary: { finished: true, roundsPlayed: roundIdx + 1, finalScores: Object.fromEntries(players.map((p, i) => [p.id, totals[i] || 0])) },
      payload: { mode: "knockout", sport: "darts", config: cfg, totals, active, visitHistory: visitHistoryRef.current.slice(), events: visitHistoryRef.current.slice() },
    };
    const telemetry = buildDartsTelemetry(rec, rec.payload);
    if (telemetry) {
      rec.payload.telemetry = telemetry;
      rec.summary.hitSummary = { ...telemetry.totals, byPlayer: telemetry.perPlayer };
      rec.summary.perPlayer = telemetry.perPlayer;
      rec.summary.telemetryExact = true;
      rec.summary.telemetryCoverage = "full";
    }
    void History.upsert(rec).catch((e: any) => console.warn("[Knockout] history failed", e));
  }, [isFinished, winner, cfg, totals, active, roundIdx]);

  return (
    <div className="page">
      <PageHeader
        title="KNOCKOUT"
        tickerSrc={tickerKnockout}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles KNOCKOUT" content={INFO_TEXT} />}
      />

      <div style={{ padding: 16 }}>
        {isFinished && winner ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              {t("game.winner", "Vainqueur")} : {t("player", "Joueur")} {winner.idx + 1}
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
          {t("round", "Manche")} {Math.min(roundIdx + 1, cfg.rounds)} / {cfg.rounds} —{" "}
          {t("turn", "Tour")} : {t("player", "Joueur")} {playerIdx + 1}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 16 }}>
          {totals.map((s, i) => (
            <div
              key={i}
              style={{
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                opacity: active[i] ? 1 : 0.35,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 4 }}>
                {t("player", "Joueur")} {i + 1} {active[i] ? "" : `(${t("eliminated", "éliminé")})`}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {t("total", "Total")} : <b>{s}</b>
              </div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {t("visit", "Manche")} : <b>{roundVisits[i] >= 0 ? roundVisits[i] : "-"}</b>
              </div>
            </div>
          ))}
        </div>

        {!isFinished ? (
          <div>
            <ScoreInputHub
              currentThrow={currentThrow}
              multiplier={multiplier}
              onSimple={() => setMultiplier(1)}
              onDouble={() => setMultiplier(2)}
              onTriple={() => setMultiplier(3)}
              onCancel={() => { setCurrentThrow([]); setMultiplier(1); }}
              onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
              onNumber={(n: number) => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, { v: n, mult: multiplier }])}
              onBull={() => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, { v: 25, mult: multiplier === 3 ? 1 : multiplier } as UIDart])}
              onValidate={validate}
              onDirectDart={(d: UIDart) => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, d])}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
