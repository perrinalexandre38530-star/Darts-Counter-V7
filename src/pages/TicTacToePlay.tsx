// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ScoreInputHub from "../components/ScoreInputHub";
import tickerTicTacToe from "../assets/tickers/ticker_tic_tac_toe.png";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Dart as UIDart } from "../lib/types";
import { History } from "../lib/history";
import {
  buildDartsTelemetry,
  canonicalToUiDart,
  canonicalVisitFromUiDarts,
  exactDartsForScore,
} from "../lib/dartsTelemetry";

export type TicTacToePlayConfig = {
  players?: number | any[];
  botsEnabled?: boolean;
  botLevel?: "easy" | "normal" | "hard";
  rounds?: number;
  bestOf?: 1 | 3 | 5 | 7;
  startingPlayer?: number;
};

const INFO_TEXT = `TIC-TAC-TOE

• Chaque case correspond à une cible de 1 à 9.
• Une volée contient jusqu'à 3 fléchettes et est enregistrée intégralement.
• La première fléchette de la volée qui touche une case encore libre permet de la prendre.
• Les doubles et triples sont conservés dans l'historique, même si la case correspond seulement au numéro.
• Les MISS, mauvaises cibles et cases déjà occupées sont également enregistrés.
• 3 cases alignées gagnent la manche.`;

type Cell = number | null;
type RoundResult = { winner: number | null; draw: boolean } | null;

const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winnerOf(board: Cell[]): number | null {
  for (const [a, b, c] of LINES) {
    const v = board[a];
    if (v !== null && v === board[b] && v === board[c]) return v;
  }
  return null;
}

function normalizePlayers(cfg: any) {
  const explicit = Array.isArray(cfg?.players) ? cfg.players : null;
  if (explicit?.length) {
    return explicit.slice(0, 4).map((p: any, i: number) => ({
      id: String(p?.id ?? p?.profileId ?? `p${i + 1}`),
      name: String(p?.name ?? p?.nickname ?? `Joueur ${i + 1}`),
      avatarDataUrl: p?.avatarDataUrl ?? p?.avatarUrl ?? null,
      isBot: !!p?.isBot,
      botLevel: p?.botLevel ?? cfg?.botLevel ?? "normal",
    }));
  }
  const count = Math.max(2, Math.min(4, Number(cfg?.players) || 2));
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Joueur ${i + 1}`,
    avatarDataUrl: null,
    isBot: !!cfg?.botsEnabled && i > 0,
    botLevel: cfg?.botLevel ?? "normal",
  }));
}

function botVolley(board: Cell[], level: string): UIDart[] {
  const free = board.map((v, i) => (v === null ? i + 1 : null)).filter(Boolean) as number[];
  if (!free.length) return [{ v: 0, mult: 1 }];
  const accuracy = level === "hard" ? 0.9 : level === "easy" ? 0.48 : 0.7;
  const wanted = free[Math.floor(Math.random() * free.length)];
  const hit = Math.random() < accuracy;
  const target = hit ? wanted : Math.max(0, Math.min(20, wanted + (Math.random() < .5 ? -1 : 1)));
  const score = target <= 0 ? 0 : target * (Math.random() < .14 ? 2 : 1);
  return exactDartsForScore(score).map(canonicalToUiDart).slice(0, 3);
}

export default function TicTacToePlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: TicTacToePlayConfig = props?.params?.config ?? props?.config ?? {};
  const players = React.useMemo(() => normalizePlayers(cfg), [cfg]);
  const maxRounds = Math.max(1, Math.min(25, Number(cfg?.bestOf ?? cfg?.rounds) || 5));
  const needToWin = Math.floor(maxRounds / 2) + 1;
  const startingPlayer = Math.max(0, Math.min(players.length - 1, Number(cfg?.startingPlayer) || 0));

  const [matchWins, setMatchWins] = React.useState<number[]>(() => players.map(() => 0));
  const [roundIdx, setRoundIdx] = React.useState(0);
  const [board, setBoard] = React.useState<Cell[]>(() => Array(9).fill(null));
  const [current, setCurrent] = React.useState(startingPlayer);
  const [roundResult, setRoundResult] = React.useState<RoundResult>(null);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [finished, setFinished] = React.useState(false);
  const [winnerId, setWinnerId] = React.useState<string | null>(null);

  const visitsRef = React.useRef<any[]>([]);
  const matchIdRef = React.useRef(`tic-tac-toe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const createdAtRef = React.useRef(Date.now());
  const botGuardRef = React.useRef("");

  const buildRecord = React.useCallback((args: {
    status: "in_progress" | "finished";
    board: Cell[];
    matchWins: number[];
    roundIdx: number;
    current: number;
    roundResult: RoundResult;
    winnerId?: string | null;
  }) => {
    const now = Date.now();
    const rec: any = {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: "tic_tac_toe",
      mode: "tic_tac_toe",
      sport: "darts",
      status: args.status,
      createdAt: createdAtRef.current,
      updatedAt: now,
      finishedAt: args.status === "finished" ? now : undefined,
      winnerId: args.winnerId ?? null,
      players: players.map((p: any, i: number) => ({ ...p, score: Number(args.matchWins[i] || 0) })),
      game: { mode: "tic_tac_toe", maxRounds, needToWin },
      summary: {
        mode: "tic_tac_toe",
        finished: args.status === "finished",
        winnerId: args.winnerId ?? null,
        roundsPlayed: args.roundIdx + (args.roundResult ? 1 : 0),
        finalScores: Object.fromEntries(players.map((p: any, i: number) => [p.id, Number(args.matchWins[i] || 0)])),
      },
      payload: {
        mode: "tic_tac_toe",
        sport: "darts",
        config: cfg,
        board: args.board,
        matchWins: args.matchWins,
        roundIdx: args.roundIdx,
        currentPlayerIndex: args.current,
        roundResult: args.roundResult,
        visitHistory: visitsRef.current.slice(),
        visits: visitsRef.current.slice(),
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
  }, [cfg, maxRounds, needToWin, players]);

  const persist = React.useCallback((record: any) => {
    void History.upsert(record).catch((e: any) => console.warn("[TicTacToe] history persistence failed", e));
    if (record?.status === "finished") props?.onFinish?.(record);
  }, [props]);

  React.useEffect(() => {
    persist(buildRecord({ status: "in_progress", board, matchWins, roundIdx, current, roundResult, winnerId: null }));
    // Initial durable record: the launched game exists before the first dart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(darts: UIDart[]) {
    if (finished || roundResult || !darts.length) return;
    const exact = darts.slice(0, 3);
    const active = players[current];
    if (!active) return;
    const playerVisitIndex = visitsRef.current.filter((v: any) => String(v?.playerId) === String(active.id)).length;
    visitsRef.current.push(canonicalVisitFromUiDarts({
      playerId: String(active.id),
      darts: exact,
      visitIndex: playerVisitIndex,
      roundIndex: roundIdx,
      source: "tic_tac_toe",
    }));

    const nextBoard = board.slice();
    const claim = exact.find((d: any) => {
      const n = Number(d?.v || 0);
      return n >= 1 && n <= 9 && nextBoard[n - 1] === null;
    });
    if (claim) nextBoard[Number(claim.v) - 1] = current;

    const wonBy = winnerOf(nextBoard);
    const draw = wonBy === null && nextBoard.every((v) => v !== null);
    const nextWins = matchWins.slice();
    let nextRoundResult: RoundResult = null;
    let nextWinnerId: string | null = null;
    let nextFinished = false;

    if (wonBy !== null) {
      nextWins[wonBy] = Number(nextWins[wonBy] || 0) + 1;
      nextRoundResult = { winner: wonBy, draw: false };
      if (nextWins[wonBy] >= needToWin || roundIdx + 1 >= maxRounds) {
        nextFinished = true;
        nextWinnerId = String(players[wonBy]?.id || "");
      }
    } else if (draw) {
      nextRoundResult = { winner: null, draw: true };
      if (roundIdx + 1 >= maxRounds) {
        const best = Math.max(...nextWins);
        const leaders = nextWins.map((v, i) => v === best ? i : -1).filter((i) => i >= 0);
        nextFinished = true;
        nextWinnerId = leaders.length === 1 ? String(players[leaders[0]]?.id || "") : null;
      }
    }

    const nextCurrent = nextRoundResult ? current : (current + 1) % players.length;
    setBoard(nextBoard);
    setMatchWins(nextWins);
    setRoundResult(nextRoundResult);
    setCurrent(nextCurrent);
    setCurrentThrow([]);
    setMultiplier(1);
    setFinished(nextFinished);
    setWinnerId(nextWinnerId);

    const rec = buildRecord({
      status: nextFinished ? "finished" : "in_progress",
      board: nextBoard,
      matchWins: nextWins,
      roundIdx,
      current: nextCurrent,
      roundResult: nextRoundResult,
      winnerId: nextWinnerId,
    });
    persist(rec);
  }

  function startNextRound() {
    if (finished || !roundResult) return;
    const nextRound = roundIdx + 1;
    const nextStarter = (startingPlayer + nextRound) % players.length;
    const nextBoard = Array(9).fill(null);
    setRoundIdx(nextRound);
    setBoard(nextBoard);
    setCurrent(nextStarter);
    setRoundResult(null);
    setCurrentThrow([]);
    setMultiplier(1);
    persist(buildRecord({ status: "in_progress", board: nextBoard, matchWins, roundIdx: nextRound, current: nextStarter, roundResult: null, winnerId: null }));
  }

  function resetGame() {
    matchIdRef.current = `tic-tac-toe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createdAtRef.current = Date.now();
    visitsRef.current = [];
    const zero = players.map(() => 0);
    const empty = Array(9).fill(null);
    setMatchWins(zero);
    setRoundIdx(0);
    setBoard(empty);
    setCurrent(startingPlayer);
    setRoundResult(null);
    setCurrentThrow([]);
    setMultiplier(1);
    setFinished(false);
    setWinnerId(null);
    persist(buildRecord({ status: "in_progress", board: empty, matchWins: zero, roundIdx: 0, current: startingPlayer, roundResult: null, winnerId: null }));
  }

  React.useEffect(() => {
    const active = players[current];
    if (finished || roundResult || !active?.isBot || currentThrow.length) return;
    const key = `${roundIdx}:${current}:${board.join("|")}:${visitsRef.current.length}`;
    if (botGuardRef.current === key) return;
    botGuardRef.current = key;
    const timer = window.setTimeout(() => commit(botVolley(board, String(active.botLevel || "normal"))), 550);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, current, currentThrow.length, finished, players, roundIdx, roundResult]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  const winner = players.find((p: any) => String(p.id) === String(winnerId));
  const active = players[current];
  const marks = ["X", "O", "△", "◇"];
  const statusText = finished
    ? winner ? `${t("generic.winner", "Gagnant")} : ${winner.name}` : t("generic.draw", "Égalité")
    : roundResult?.winner != null
      ? `${players[roundResult.winner]?.name} gagne la manche`
      : roundResult?.draw
        ? t("generic.draw", "Manche nulle")
        : `${t("generic.turn", "Tour")} : ${active?.name || "—"}`;

  return (
    <div className="page">
      <PageHeader title="TIC-TAC-TOE" tickerSrc={tickerTicTacToe} left={<BackDot onClick={goBack} />} right={<InfoDot title="Règles TIC-TAC-TOE" content={INFO_TEXT} />} />
      <div style={{ padding: 12 }}>
        <div style={{ borderRadius: 18, padding: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div><div style={{ fontSize: 11, opacity: .7, fontWeight: 900 }}>MANCHE {Math.min(roundIdx + 1, maxRounds)} / {maxRounds}</div><div style={{ marginTop: 5, fontSize: 17, fontWeight: 1000 }}>{statusText}</div></div>
            <div style={{ display: "flex", gap: 8 }}>{players.map((p: any, i: number) => <div key={p.id} style={{ textAlign: "center" }}><div style={{ fontSize: 9, opacity: .65, maxWidth: 66, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div><b style={{ fontSize: 20 }}>{matchWins[i] || 0}</b></div>)}</div>
          </div>
        </div>

        <div style={{ marginTop: 12, borderRadius: 18, padding: 12, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.03)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {board.map((cell, idx) => <div key={idx} style={{ height: 78, borderRadius: 15, border: cell === null ? "1px solid rgba(255,255,255,.14)" : "1px solid rgba(80,220,255,.42)", background: cell === null ? "rgba(0,0,0,.18)" : "rgba(80,220,255,.10)", display: "grid", placeItems: "center", position: "relative" }}><span style={{ position: "absolute", top: 7, left: 9, fontSize: 11, opacity: .65 }}>{idx + 1}</span><b style={{ fontSize: 32 }}>{cell === null ? "" : marks[cell] || String(cell + 1)}</b></div>)}
          </div>

          {!finished && !roundResult && !active?.isBot ? <div style={{ marginTop: 12 }}>
            <ScoreInputHub
              currentThrow={currentThrow}
              multiplier={multiplier}
              onSimple={() => setMultiplier(1)}
              onDouble={() => setMultiplier(2)}
              onTriple={() => setMultiplier(3)}
              onCancel={() => { setCurrentThrow([]); setMultiplier(1); }}
              onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
              onNumber={(n: number) => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, { v: n, mult: multiplier }])}
              onBull={() => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, { v: 25, mult: multiplier === 2 ? 2 : 1 }])}
              onValidate={() => commit(currentThrow)}
              onDirectDart={(d: UIDart) => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, d])}
            />
          </div> : null}

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={resetGame}>{t("generic.reset", "Réinitialiser")}</button>
            <button className="btn-primary" style={{ flex: 1, opacity: roundResult && !finished ? 1 : .5 }} disabled={!roundResult || finished} onClick={startNextRound}>{t("generic.next", "Manche suivante")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
