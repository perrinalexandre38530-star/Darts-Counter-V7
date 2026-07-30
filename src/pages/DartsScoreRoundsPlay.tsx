// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ScoreInputHub from "../components/ScoreInputHub";
import type { Dart as UIDart } from "../lib/types";
import { History } from "../lib/history";
import {
  buildDartsTelemetry,
  canonicalToUiDart,
  canonicalVisitFromUiDarts,
  exactDartsForScore,
  scoreDarts,
} from "../lib/dartsTelemetry";

export type DartsScoreRoundsProps = {
  modeId: string;
  title: string;
  infoText?: string;
  tickerSrc?: string;
  config?: any;
  params?: any;
  go?: (tab: any, params?: any) => void;
  setTab?: (tab: any, params?: any) => void;
  configTab?: string;
  onFinish?: (record: any) => void;
};

function normalizePlayers(config: any, params: any) {
  const explicit = params?.players ?? config?.players;
  if (Array.isArray(explicit) && explicit.length) {
    return explicit.map((p: any, i: number) => ({
      id: String(p?.id ?? p?.profileId ?? `p${i + 1}`),
      name: String(p?.name ?? p?.displayName ?? `Joueur ${i + 1}`),
      avatarDataUrl: p?.avatarDataUrl ?? p?.avatarUrl ?? null,
      isBot: !!p?.isBot,
      botLevel: p?.botLevel ?? config?.botLevel ?? "normal",
    }));
  }
  const count = Math.max(1, Math.min(12, Number(explicit) || Number(config?.playersCount) || 2));
  const humans = Math.max(1, Math.min(count, Number(config?.humansCount) || count));
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Joueur ${i + 1}`,
    avatarDataUrl: null,
    isBot: !!config?.botsEnabled && i >= humans,
    botLevel: config?.botLevel ?? "normal",
  }));
}

function randomBotDarts(level: string): UIDart[] {
  const base = level === "hard" ? 92 : level === "easy" ? 34 : 63;
  const spread = level === "hard" ? 76 : level === "easy" ? 58 : 72;
  const target = Math.max(0, Math.min(180, Math.round(base + (Math.random() - 0.5) * spread)));
  return exactDartsForScore(target).map(canonicalToUiDart);
}

export default function DartsScoreRoundsPlay(props: DartsScoreRoundsProps) {
  const cfg = props?.params?.config ?? props?.config ?? {};
  const players = React.useMemo(() => normalizePlayers(cfg, props?.params), [cfg, props?.params]);
  const rounds = Math.max(1, Math.min(99, Number(cfg?.rounds) || 10));
  const targetScore = Math.max(0, Number(cfg?.targetScore ?? cfg?.objective) || 0);

  const [roundIdx, setRoundIdx] = React.useState(0);
  const [playerIdx, setPlayerIdx] = React.useState(0);
  const [scores, setScores] = React.useState<number[]>(() => players.map(() => 0));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [winnerId, setWinnerId] = React.useState<string | null>(null);
  const [finished, setFinished] = React.useState(false);
  const matchIdRef = React.useRef(`${props.modeId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const createdAtRef = React.useRef(Date.now());
  const visitsRef = React.useRef<any[]>([]);
  const botGuardRef = React.useRef("");

  const active = players[playerIdx];

  const buildRecord = React.useCallback((status: "in_progress" | "finished", nextScores = scores, winId = winnerId) => {
    const now = Date.now();
    const rec: any = {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: props.modeId,
      sport: "darts",
      status,
      createdAt: createdAtRef.current,
      updatedAt: now,
      players: players.map((p: any) => ({ id: p.id, name: p.name, avatarDataUrl: p.avatarDataUrl ?? null })),
      winnerId: winId,
      game: { mode: props.modeId, rounds, targetScore },
      summary: {
        finished: status === "finished",
        rounds,
        winnerId: winId,
        finalScores: Object.fromEntries(players.map((p: any, i: number) => [p.id, Number(nextScores[i] || 0)])),
      },
      payload: {
        mode: props.modeId,
        sport: "darts",
        config: cfg,
        scores: nextScores,
        roundIdx,
        playerIdx,
        visitHistory: visitsRef.current.slice(),
        events: visitsRef.current.slice(),
      },
    };
    const telemetry = buildDartsTelemetry(rec, rec.payload);
    if (telemetry) {
      rec.payload.telemetry = telemetry;
      rec.payload.dartTelemetry = telemetry;
      rec.summary.hitSummary = { ...telemetry.totals, byPlayer: telemetry.perPlayer };
      rec.summary.perPlayer = telemetry.perPlayer;
      rec.summary.telemetryExact = true;
      rec.summary.telemetryCoverage = "full";
    }
    return rec;
  }, [cfg, playerIdx, players, props.modeId, roundIdx, rounds, scores, targetScore, winnerId]);

  const persist = React.useCallback((status: "in_progress" | "finished", nextScores?: number[], winId?: string | null) => {
    const rec = buildRecord(status, nextScores ?? scores, winId === undefined ? winnerId : winId);
    void History.upsert(rec).catch((e: any) => console.warn(`[${props.modeId}] history persistence failed`, e));
    if (status === "finished") props.onFinish?.(rec);
  }, [buildRecord, props, scores, winnerId]);

  function commit(darts: UIDart[]) {
    if (finished || !active || !darts.length) return;
    const exact = darts.slice(0, 3);
    const visitScore = scoreDarts(exact);
    const playerId = String(active.id);
    const visitIndex = visitsRef.current.filter((v: any) => String(v?.playerId) === playerId).length;
    visitsRef.current.push(canonicalVisitFromUiDarts({
      playerId,
      darts: exact,
      visitIndex,
      roundIndex: roundIdx,
      source: props.modeId,
    }));

    const nextScores = scores.slice();
    nextScores[playerIdx] = Number(nextScores[playerIdx] || 0) + visitScore;
    const reachedTarget = targetScore > 0 && nextScores[playerIdx] >= targetScore;
    const nextPlayer = (playerIdx + 1) % players.length;
    const nextRound = nextPlayer === 0 ? roundIdx + 1 : roundIdx;
    const endedByRounds = nextRound >= rounds;

    let winId: string | null = reachedTarget ? playerId : null;
    if (!winId && endedByRounds) {
      const max = Math.max(...nextScores);
      winId = String(players[nextScores.indexOf(max)]?.id ?? "");
    }

    setScores(nextScores);
    setCurrentThrow([]);
    setMultiplier(1);
    if (winId) {
      setWinnerId(winId);
      setFinished(true);
      persist("finished", nextScores, winId);
      return;
    }
    setPlayerIdx(nextPlayer);
    setRoundIdx(nextRound);
    persist("in_progress", nextScores, null);
  }

  React.useEffect(() => {
    if (finished || !active?.isBot || currentThrow.length) return;
    const key = `${roundIdx}:${playerIdx}:${scores.join("|")}`;
    if (botGuardRef.current === key) return;
    botGuardRef.current = key;
    const timer = window.setTimeout(() => commit(randomBotDarts(String(active.botLevel || "normal"))), 480);
    return () => window.clearTimeout(timer);
  }, [active?.id, active?.isBot, active?.botLevel, currentThrow.length, finished, playerIdx, roundIdx, scores.join("|")]);

  function back() {
    const fn = props.setTab ?? props.go;
    if (fn) fn(props.configTab || "games", { config: cfg });
    else window.history.back();
  }

  const winner = players.find((p: any) => String(p.id) === String(winnerId));

  return (
    <div className="page">
      <PageHeader
        title={props.title}
        tickerSrc={props.tickerSrc}
        left={<BackDot onClick={back} />}
        right={<InfoDot title={`Règles ${props.title}`} content={props.infoText || "Chaque volée est enregistrée fléchette par fléchette."} />}
      />
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, opacity: 0.85 }}>
          <span>ROUND {Math.min(roundIdx + 1, rounds)}/{rounds}</span>
          <span>{finished ? "TERMINÉ" : active?.name || "—"}</span>
        </div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          {players.map((p: any, i: number) => (
            <div key={p.id} style={{ borderRadius: 15, padding: 12, border: i === playerIdx && !finished ? "1px solid rgba(120,255,200,.45)" : "1px solid rgba(255,255,255,.12)", background: i === playerIdx && !finished ? "rgba(120,255,200,.10)" : "rgba(255,255,255,.04)" }}>
              <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}{p.isBot ? " • BOT" : ""}</div>
              <div style={{ marginTop: 5, fontSize: 22, fontWeight: 1000 }}>{scores[i] || 0}</div>
            </div>
          ))}
        </div>

        {!finished && !active?.isBot ? (
          <div style={{ marginTop: 12 }}>
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
              onValidate={() => commit(currentThrow)}
              onDirectDart={(d: UIDart) => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, d])}
            />
          </div>
        ) : null}

        {finished ? (
          <div style={{ marginTop: 14, borderRadius: 16, padding: 14, border: "1px solid rgba(255,215,100,.35)", background: "rgba(255,215,100,.10)", fontWeight: 1000 }}>
            Vainqueur : {winner?.name || "—"}
          </div>
        ) : null}
      </div>
    </div>
  );
}
