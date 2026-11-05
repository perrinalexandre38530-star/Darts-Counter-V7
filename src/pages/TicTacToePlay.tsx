// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ScoreInputHub from "../components/ScoreInputHub";
import tickerMorpion from "../assets/tickers/ticker_tic_tac_toe.png";
import { useLang } from "../contexts/LangContext";
import { History } from "../lib/history";
import { createMatchCheckpointWriter } from "../lib/matchCheckpointWriter";
import { recoverMorpion } from "../lib/recoverTop10Morpion";
import { buildDartsTelemetry, canonicalVisitFromUiDarts } from "../lib/dartsTelemetry";
import { applyMorpionVolley, newMorpionGrid, MORPION_LINES } from "../lib/morpionEngine";
import type { Dart as UIDart } from "../lib/types";

const RULES = `MORPION · 4 TOUCHES\n\n8 numéros distincts sont tirés au sort pour les cases extérieures. La case centrale est toujours la Bull (25 ou 50).\n\nÀ tour de rôle, chaque joueur lance 3 fléchettes. Il faut 4 touches sur un numéro pour conquérir sa case (simple, double ou triple = 1 touche). Les touches sont conservées d'une volée à l'autre.\n\nUne fois conquise, une case appartient définitivement à son joueur. Le premier à aligner 3 cases (ligne, colonne ou diagonale) gagne la manche.`;
const MARKS = ["X", "O", "△", "◇"];
const PALETTE = ["#57e4fa", "#ff8caa", "#ffd166", "#ab98ff"];

function normalizePlayers(cfg: any) {
  if (Array.isArray(cfg?.players) && cfg.players.length > 0) {
    return cfg.players.slice(0, 4).map((p: any, i: number) => ({ id: String(p.id ?? `morpion-${i}`), name: String(p.name ?? p.nickname ?? `Joueur ${i + 1}`), isBot: !!p.isBot, botLevel: p.botLevel || cfg.botLevel || "normal" }));
  }
  return Array.from({ length: Math.max(2, Math.min(4, Number(cfg?.players) || 2)) }, (_, i) => ({ id: `morpion-${i}`, name: `Joueur ${i + 1}`, isBot: !!cfg?.botsEnabled && i > 0, botLevel: cfg?.botLevel || "normal" }));
}
function botDarts(grid: any, player: number, level: string): UIDart[] {
  const available = grid.targets.map((_: number, i: number) => i).filter((i: number) => grid.owners[i] === null);
  if (!available.length) return Array.from({ length: 3 }, () => ({ v: 0, mult: 1 }));
  // Avancer sur une case déjà commencée, puis bloquer une ligne gagnante si nécessaire.
  available.sort((a: number, b: number) => grid.marks[b][player] - grid.marks[a][player]);
  let index = available[0];
  for (const line of MORPION_LINES) {
    const mine = line.filter((i: number) => grid.owners[i] === player).length;
    const empty = line.filter((i: number) => grid.owners[i] === null);
    if (mine === 2 && empty.length === 1) { index = empty[0]; break; }
  }
  const accuracy = level === "hard" ? .76 : level === "easy" ? .40 : .58;
  return Array.from({ length: 3 }, () => Math.random() < accuracy ? { v: grid.targets[index], mult: 1 } : { v: Math.random() < .20 ? 0 : 1 + Math.floor(Math.random() * 20), mult: 1 });
}

function dartLabel(d: UIDart) {
  if (!d || Number(d.v) === 0) return "MISS";
  if (Number(d.v) === 25) return Number(d.mult) === 2 ? "BULL50" : "BULL25";
  return `${Number(d.mult) === 3 ? "T" : Number(d.mult) === 2 ? "D" : "S"}${Number(d.v)}`;
}
export default function TicTacToePlay(props: any) {
  const { t } = useLang();
  const route = props?.params || {};
  const resuming = !!(route.resumeId || (route.rec && route.from?.startsWith("history")));
  const preview = !!route.preview;
  const cfgRef = React.useRef(route.config ?? route.rec?.resume?.config ?? route.rec?.payload?.config ?? props?.config ?? {});
  const cfg = cfgRef.current;
  const [players, setPlayers] = React.useState(() => normalizePlayers(cfg));
  const [hydration, setHydration] = React.useState(resuming ? "loading" : "ready");
  const maxRounds = Math.max(1, Math.min(25, Number(cfg?.bestOf ?? cfg?.rounds) || 3));
  const requiredWins = Math.floor(maxRounds / 2) + 1;
  const [grid, setGrid] = React.useState(() => newMorpionGrid(players.length));
  const [wins, setWins] = React.useState(() => players.map(() => 0));
  const [round, setRound] = React.useState(0);
  const [current, setCurrent] = React.useState(Math.max(0, Math.min(players.length - 1, Number(cfg?.startingPlayer) || 0)));
  const [result, setResult] = React.useState<{ winner: number | null; draw: boolean } | null>(null);
  const [finished, setFinished] = React.useState(false);
  const [champion, setChampion] = React.useState<string | null>(null);
  const [throwing, setThrowing] = React.useState<UIDart[]>([]);
  const [mult, setMult] = React.useState<1 | 2 | 3>(1);
  const visits = React.useRef<any[]>([]);
  const id = React.useRef(`morpion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const started = React.useRef(Date.now());
  const botGuard = React.useRef("");
  const commitGuard = React.useRef(false);
  const [botSummary, setBotSummary] = React.useState<{ name: string; darts: UIDart[] } | null>(null);
  const [inputWarning, setInputWarning] = React.useState("");
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [leavePending, setLeavePending] = React.useState(false);
  const leavingRef = React.useRef(false);
  const writerRef = React.useRef<any>(null);
  if (!writerRef.current) {
    writerRef.current = createMatchCheckpointWriter((rec: any) => History.upsert(rec), {
      onStatus: setSaveStatus,
      onSaved: (rec: any) => { if (rec.status === "finished") props?.onFinish?.(rec); },
      onError: (error: any) => console.warn("[GAME] checkpoint non enregistré", error),
    });
  }
  const persist = (rec: any) => writerRef.current.enqueue(rec);
  const retrySave = () => { writerRef.current.retry(); };
  const forceExit = () => {
    if (window.confirm("Le dernier état de la partie n’a pas été enregistré. Quitter malgré le risque de perdre des volées ?")) props?.setTab?.(resuming?"history":"games");
  };
  async function requestBack(destination: string) {
    if (leavingRef.current) return;
    if (!preview && throwing.length > 0 && !window.confirm(`${throwing.length} fléchette(s) de la volée actuelle ne sont pas encore validées et seront perdues. Quitter la partie ?`)) return;
    leavingRef.current = true;
    if (!writerRef.current.isBusy && !writerRef.current.hasError) {
      props?.setTab?.(destination);
      return;
    }
    setLeavePending(true);
    const safe = await writerRef.current.drain();
    if (safe) props?.setTab?.(destination);
    else { leavingRef.current = false; setLeavePending(false); }
  }
  React.useEffect(() => {
    if (!resuming) {
      persist(makeRecord("in_progress", grid, wins, round, current, result, null));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const requestedId = String(route.resumeId || route.rec?.id || route.rec?.matchId || "");
        const saved = await History.get(requestedId);
        if (cancelled) return;
        const restored = recoverMorpion(saved, { preview });
        if (!restored || restored.id !== requestedId) throw new Error("Checkpoint MORPION absent, terminé ou incohérent");
        id.current = restored.id;
        started.current = restored.createdAt;
        cfgRef.current = restored.config;
        visits.current = restored.visits;
        botGuard.current = "";
        commitGuard.current = false;
        setPlayers(restored.players);
        setGrid(restored.grid);
        setWins(restored.wins);
        setRound(restored.round);
        setCurrent(restored.current);
        setResult(restored.result);
        setFinished(restored.finished);
        setChampion(restored.winnerId);
        setThrowing([]);
        setBotSummary(null);
        setHydration("ready");
      } catch (error) {
        if (!cancelled) { console.warn("[Morpion] reprise refusée", error); setHydration("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const currentPlayer = players[current];

  const makeRecord = (status: "in_progress" | "finished", state: any, winsNext: number[], roundNext: number, currentNext: number, roundResult: any, winnerId: string | null) => {
    const now = Date.now();
    const rec: any = {
      id: id.current, matchId: id.current, kind: "tic_tac_toe", mode: "tic_tac_toe", sport: "darts", status,
      createdAt: started.current, updatedAt: now, finishedAt: status === "finished" ? now : undefined, winnerId,
      players: players.map((p: any, i: number) => ({ ...p, score: winsNext[i] || 0 })),
      game: { mode: "tic_tac_toe", resumeRoute: "tic_tac_toe_play", maxRounds, requiredWins, marksToClaim: 4, bullCenter: true, randomTargets: true },
      summary: { mode: "tic_tac_toe", finished: status === "finished", winnerId, roundsPlayed: roundNext + (roundResult ? 1 : 0), finalScores: Object.fromEntries(players.map((p: any, i: number) => [p.id, winsNext[i] || 0])) },
      resume: { route: "tic_tac_toe_play", modeId: "tic_tac_toe", config: { ...cfgRef.current, players } },
      payload: { sport: "darts", mode: "tic_tac_toe", config: { ...cfgRef.current, players }, grid: state, board: state.owners, matchWins: winsNext, roundIdx: roundNext, currentPlayerIndex: currentNext, roundResult, visits: visits.current.slice(), visitHistory: visits.current.slice(), events: visits.current.slice() },
    };
    const telemetry = buildDartsTelemetry(rec, rec.payload);
    if (telemetry) { rec.payload.telemetry = telemetry; rec.payload.dartTelemetry = telemetry; rec.summary.hitSummary = { ...telemetry.totals, byPlayer: telemetry.perPlayer }; rec.summary.perPlayer = telemetry.perPlayer; rec.summary.telemetryExact = true; rec.summary.telemetryCoverage = "full"; }
    return rec;
  };

  function commit(darts: UIDart[]) {
    if (hydration !== "ready" || preview || finished || result || botSummary || commitGuard.current || leavingRef.current || saveStatus === "error") return;
    if (darts.length !== 3) { setInputWarning("Saisis 3 fléchettes, y compris MISS pour un lancer manqué."); return; }
    commitGuard.current = true;
    setInputWarning("");
    const chosen = darts.slice(0, 3);
    const player = players[current];
    if (!player) { commitGuard.current = false; return; }
    visits.current.push(canonicalVisitFromUiDarts({ playerId: player.id, darts: chosen, visitIndex: visits.current.filter((v: any) => String(v.playerId) === player.id).length, roundIndex: round, source: "tic_tac_toe" }));
    const played = applyMorpionVolley(grid, current, chosen, 4);
    const nextWins = [...wins];
    let nextResult = null;
    let nextFinished = false;
    let nextChampion = null;
    if (played.winner !== null || played.draw) {
      if (played.winner !== null) nextWins[played.winner] += 1;
      nextResult = { winner: played.winner, draw: played.draw };
      nextFinished = nextWins.some((x) => x >= requiredWins) || round + 1 >= maxRounds;
      if (nextFinished) {
        const best = Math.max(...nextWins);
        const leaders = nextWins.map((score, i) => score === best ? i : -1).filter((i) => i >= 0);
        nextChampion = leaders.length === 1 ? players[leaders[0]].id : null;
      }
    }
    const next = nextResult ? current : (current + 1) % players.length;
    setGrid(played.grid); setWins(nextWins); setResult(nextResult); setCurrent(next); setThrowing([]); setMult(1); setFinished(nextFinished); setChampion(nextChampion);
    if (player.isBot) setBotSummary({ name: player.name, darts: chosen });
    persist(makeRecord(nextFinished ? "finished" : "in_progress", played.grid, nextWins, round, next, nextResult, nextChampion));
  }
  function nextRound() {
    if (hydration !== "ready" || preview || !result || finished || botSummary || leavingRef.current || saveStatus === "error") return;
    commitGuard.current = false; setInputWarning("");
    const g = newMorpionGrid(players.length); const n = round + 1; const p = n % players.length;
    setGrid(g); setRound(n); setResult(null); setCurrent(p); setThrowing([]);
    persist(makeRecord("in_progress", g, wins, n, p, null, null));
  }
  async function restart() {
    if (hydration !== "ready" || preview || leavingRef.current) return;
    if (!(await writerRef.current.drain())) return;
    if (!finished && !window.confirm("Démarrer une nouvelle partie ? La partie actuelle restera disponible dans l’Historique.")) return;
    botGuard.current = ""; commitGuard.current = false; setBotSummary(null); setInputWarning("");
    id.current = `morpion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; started.current = Date.now(); visits.current = [];
    const g = newMorpionGrid(players.length); const empty = players.map(() => 0);
    setGrid(g); setWins(empty); setRound(0); setCurrent(0); setResult(null); setFinished(false); setChampion(null); setThrowing([]);
    persist(makeRecord("in_progress", g, empty, 0, 0, null, null));
  }
  React.useEffect(() => { commitGuard.current = false; }, [grid, current, round]);
  React.useEffect(() => { if (throwing.length === 3) setInputWarning(""); }, [throwing.length]);
  React.useEffect(() => {
    if (hydration !== "ready" || preview || finished || result || leavingRef.current || saveStatus === "error" || botSummary || !currentPlayer?.isBot || throwing.length) return;
    const key = `${round}:${current}:${visits.current.length}`;
    if (botGuard.current === key) return;
    botGuard.current = key;
    const timer = window.setTimeout(() => commit(botDarts(grid, current, currentPlayer.botLevel)), 650);
    return () => { window.clearTimeout(timer); if (botGuard.current === key) botGuard.current = ""; };
  }, [hydration, preview, grid, current, result, finished, currentPlayer?.isBot, throwing.length, botSummary, saveStatus]);
  const isHumanTurn = hydration === "ready" && !preview && !currentPlayer?.isBot && !finished && !result && saveStatus !== "error" && !leavePending;
  const championName = players.find((p: any) => p.id === champion)?.name;
  if (hydration !== "ready") return <div className="page"><PageHeader title="MORPION" tickerSrc={tickerMorpion} left={<BackDot onClick={() => props?.setTab?.("history")} />} />
    <div role="status" style={{padding:25,textAlign:"center"}}>{hydration === "loading" ? "Chargement de la partie enregistrée…" : "Reprise impossible : état enregistré absent, terminé ou incohérent. Aucune nouvelle partie n’a été créée."}
    <div style={{marginTop:16}}><button type="button" className="btn-secondary" onClick={()=>props?.setTab?.("history")}>Retour à l'historique</button></div></div></div>;
  return <div className="page">
    <PageHeader title="MORPION" tickerSrc={tickerMorpion} left={<BackDot onClick={() => requestBack(resuming?"history":"games")} />} right={<InfoDot title="Règles du Morpion" content={RULES} />} />
    <div style={{ padding: 12, paddingBottom: 110, maxWidth: 720, margin: "0 auto" }}>
      {saveStatus !== "idle" && <div role={saveStatus === "error" ? "alert" : "status"} style={{fontSize:12,marginBottom:8,color:saveStatus === "error" ? "#ff9a9a" : "#a9d8ef"}}>{saveStatus === "saving" ? "Enregistrement de la partie…" : saveStatus === "error" ? "Enregistrement impossible : vérifie l'espace disponible avant de quitter." : "Partie enregistrée sur cet appareil."}</div>}
      {saveStatus === "error" && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}><button type="button" className="btn-primary" onClick={retrySave}>RÉESSAYER L’ENREGISTREMENT</button><button type="button" className="btn-secondary" onClick={forceExit}>QUITTER SANS ENREGISTRER</button><span style={{fontSize:12,opacity:.85}}>La partie ne progresse plus tant que le dernier état n’est pas enregistré.</span></div>}
      {leavePending && <div role="status" style={{marginBottom:8,fontSize:12,color:"#ffd18a"}}>Sortie en attente de confirmation du dernier enregistrement…</div>}
      <div style={{ border: "1px solid #ffffff24", borderRadius: 16, padding: 12, background: "#111528d9", marginBottom: 10 }}>
        <b>MANCHE {round + 1}/{maxRounds}</b> · {finished ? championName ? `Victoire : ${championName}` : "Match nul" : result ? result.winner !== null ? `${players[result.winner].name} remporte la manche` : "Manche nulle" : `Au tour de ${currentPlayer?.name}`}
        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>{players.map((p: any, i: number) => <span key={p.id} style={{ color: PALETTE[i], fontWeight: 900 }}>{MARKS[i]} {p.name} · {wins[i]} manche(s)</span>)}</div>
        <div style={{ opacity: .75, fontSize: 12, marginTop: 7 }}>4 touches par case · Bull centrale · S / D / T = 1 touche</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {grid.targets.map((target, idx) => <div key={idx} style={{ minHeight: 112, background: grid.owners[idx] !== null ? `${PALETTE[grid.owners[idx]]}26` : "#141a2c", border: `2px solid ${grid.owners[idx] !== null ? PALETTE[grid.owners[idx]] : idx === 4 ? "#ffc857" : "#ffffff28"}`, borderRadius: 13, padding: 7, textAlign: "center" }}>
          <div style={{ fontWeight: 1000, fontSize: 22, color: idx === 4 ? "#ffd36a" : "#fff" }}>{idx === 4 ? "BULL" : target}</div>
          {grid.owners[idx] === null ? <div style={{ display: "grid", gap: 3, marginTop: 5 }}>{players.map((p: any, i: number) => <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 900, color: PALETTE[i] }}>{MARKS[i]}</span><div style={{ flex: 1, display: "flex", gap: 2 }}>{Array.from({ length: 4 }, (_, j) => <i key={j} style={{ display: "block", height: 7, flex: 1, borderRadius: 3, background: j < grid.marks[idx][i] ? PALETTE[i] : "#ffffff1f" }} />)}</div></div>)}</div> : <div style={{ fontSize: 39, fontWeight: 1000, color: PALETTE[grid.owners[idx]] }}>{MARKS[grid.owners[idx]]}</div>}
        </div>)}
      </div>
      {isHumanTurn && <div style={{ marginTop: 12, padding: 9, borderRadius: 13, background: "#111528" }}><div style={{ fontSize: 12, fontWeight: 900, paddingBottom: 6 }}>VOLÉE · {throwing.length}/3 fléchettes</div>{inputWarning && <div role="alert" style={{color:"#ffd18a",fontSize:12,marginBottom:5}}>{inputWarning}</div>}<ScoreInputHub currentThrow={throwing} multiplier={mult} onSimple={() => setMult(1)} onDouble={() => setMult(2)} onTriple={() => setMult(3)} onCancel={() => { setThrowing([]); setMult(1); }} onBackspace={() => setThrowing((v) => v.slice(0, -1))} onNumber={(n: number) => setThrowing((v) => v.length >= 3 ? v : [...v, { v: n, mult }])} onBull={() => setThrowing((v) => v.length >= 3 ? v : [...v, { v: 25, mult: mult === 2 ? 2 : 1 }])} onValidate={() => commit(throwing)} onDirectDart={(d: UIDart) => setThrowing((v) => v.length >= 3 ? v : [...v, d])} /></div>}
      {preview && <div style={{textAlign:"center",marginTop:12,color:"#ffd18a"}}>APERÇU — LECTURE SEULE <button type="button" className="btn-secondary" onClick={()=>props?.setTab?.("history")}>Retour</button></div>}
      {!preview && <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="btn-secondary" disabled={saveStatus === "error" || leavePending} onClick={restart} style={{ flex: 1 }}>Nouvelle partie</button><button className="btn-primary" disabled={!result || finished || !!botSummary || saveStatus === "error" || leavePending} onClick={nextRound} style={{ flex: 1 }}>Manche suivante</button></div>}
      {botSummary && <div role="dialog" aria-label="Volée du bot" style={{ position:"fixed", inset:0, zIndex:10010, display:"grid", placeItems:"center", padding:16, background:"#030713bc" }}>
        <div style={{width:"min(100%, 430px)",background:"#121b33",border:"1px solid #67dafa",boxShadow:"0 22px 80px #000b",borderRadius:18,padding:20,textAlign:"center"}}>
          <div style={{fontSize:13,opacity:.8,fontWeight:800}}>VOLÉE DU BOT</div>
          <h3 style={{margin:"5px 0 12px"}}>{botSummary.name}</h3>
          <div style={{fontSize:19,fontWeight:900}}>{botSummary.darts.map(dartLabel).join(" · ")}</div>
          <div style={{margin:"12px 0",fontSize:13,opacity:.85}}>La progression des cases est affichée sur la grille.</div>
          <button type="button" className="btn-primary" style={{width:"100%",padding:13}} onClick={() => setBotSummary(null)}>CONTINUER</button>
        </div>
      </div>}
    </div>
  </div>;
}
