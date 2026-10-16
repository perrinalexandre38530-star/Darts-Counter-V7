// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";
import type { CommonConfig } from "../lib/simpleRounds/types";
import { History } from "../lib/history";
import ScoreInputHub from "../components/ScoreInputHub";
import type { Dart as UIDart } from "../lib/types";
import { buildDartsTelemetry, canonicalToUiDart, canonicalVisitFromUiDarts, exactDartsForScore, scoreDarts } from "../lib/dartsTelemetry";

const clamp = (n: number) => Math.max(0, Math.min(180, Math.round(Number.isFinite(n) ? n : 0)));
const bullValue = (d?: UIDart | null) => Number(d?.v) === 25 ? (Number(d?.mult) === 2 ? 50 : 25) : 0;
const bullLabel = (d?: UIDart | null) => !d ? "—" : Number(d.v) === 25 ? (Number(d.mult) === 2 ? "DBULL" : "BULL") : "MISS";
const pct = (n: number, d: number) => d > 0 ? (n / d) * 100 : 0;

function SuperBullTarget({ darts, pulse }: { darts: UIDart[]; pulse?: boolean }) {
  const markerPos = [
    { left: "46%", top: "43%" },
    { left: "57%", top: "52%" },
    { left: "42%", top: "58%" },
  ];
  return <div className={`superbull-target ${pulse ? "dbull-pulse" : ""}`} aria-label="Cible SUPER BULL">
    <div className="superbull-ring superbull-outer"><span>MISS</span></div>
    <div className="superbull-ring superbull-bull"><span>BULL<br/><b>25</b></span></div>
    <div className="superbull-ring superbull-dbull"><span>DBULL<br/><b>50</b></span></div>
    {darts.map((d, i) => {
      const kind = bullValue(d) === 50 ? "dbull" : bullValue(d) === 25 ? "bull" : "miss";
      const pos = kind === "dbull" ? { left: `${49 + i * 2}%`, top: `${48 + (i % 2) * 4}%` } : kind === "bull" ? markerPos[i] : { left: `${25 + i * 25}%`, top: `${17 + (i % 2) * 65}%` };
      return <i key={i} className={`superbull-marker ${kind}`} style={pos} title={`Fléchette ${i + 1} · ${bullLabel(d)}`}><b>{i + 1}</b></i>;
    })}
  </div>;
}

function SuperBullFinal({ playerRows, scores, dartsByP, bullsByP, dbullsByP, bestVisitByP, bestStreakByP, perfectVisitsByP, visitScoresByP, winnerIdx, onReplay, onNew }: any) {
  const ranking = playerRows.map((p: any, i: number) => {
    const darts = dartsByP[i] || 0;
    const hits = (bullsByP[i] || 0) + (dbullsByP[i] || 0);
    return { i, p, score: scores[i] || 0, darts, bulls: bullsByP[i] || 0, dbulls: dbullsByP[i] || 0, hitPct: pct(hits, darts), dbullPct: pct(dbullsByP[i] || 0, darts), ppd: darts ? (scores[i] || 0) / darts : 0, avg3: darts ? ((scores[i] || 0) / darts) * 3 : 0, bestVisit: bestVisitByP[i] || 0, bestStreak: bestStreakByP[i] || 0, perfect: perfectVisitsByP[i] || 0, visits: visitScoresByP[i] || [] };
  }).sort((a: any, b: any) => b.score - a.score || b.dbulls - a.dbulls || b.hitPct - a.hitPct);
  const maxScore = Math.max(1, ...ranking.map((r: any) => r.score));
  const champ = ranking[0];
  return <div className="superbull-final">
    <div className="superbull-final-hero"><small>SUPER BULL · RÉSULTAT FINAL</small><div className="superbull-trophy">◎</div><h2>{String(champ?.p?.name || "JOUEUR").toUpperCase()}</h2><strong>{champ?.score || 0} PTS</strong><span>{champ?.dbulls || 0} DBULL · {champ?.bulls || 0} BULL · {champ?.hitPct.toFixed(1) || "0.0"}% centre</span></div>
    <div className="superbull-ranking">
      {ranking.map((r: any, rank: number) => <article key={r.p.id || r.i} className={rank === 0 ? "winner" : ""}>
        <header><span className="rank">#{rank + 1}</span><div><b>{r.p.name}</b><small>{r.darts} fléchettes · {r.visits.length} volées</small></div><strong>{r.score}</strong></header>
        <div className="superbull-scorebar"><i style={{ width: `${Math.max(4, r.score / maxScore * 100)}%` }}/></div>
        <div className="superbull-final-kpis"><span><small>BULL</small><b>{r.bulls}</b></span><span><small>DBULL</small><b>{r.dbulls}</b></span><span><small>PRÉCISION</small><b>{r.hitPct.toFixed(1)}%</b></span><span><small>DBULL %</small><b>{r.dbullPct.toFixed(1)}%</b></span><span><small>PTS/DART</small><b>{r.ppd.toFixed(1)}</b></span><span><small>AVG / 3</small><b>{r.avg3.toFixed(1)}</b></span><span><small>BEST VOLÉE</small><b>{r.bestVisit}</b></span><span><small>SÉRIE</small><b>{r.bestStreak}</b></span><span><small>3/3 CENTRE</small><b>{r.perfect}</b></span></div>
        <div className="superbull-visit-chart">{r.visits.map((v: number, vi: number) => <i key={vi} title={`Volée ${vi + 1}: ${v} pts`}><u style={{ height: `${Math.max(5, v / 150 * 100)}%` }}/><small>{v}</small></i>)}</div>
      </article>)}
    </div>
    <div className="superbull-final-actions"><button className="btn-secondary" onClick={onNew}>CONFIGURATION</button><button className="btn-primary" onClick={onReplay}>REJOUER</button></div>
  </div>;
}

export default function SimpleRoundsPlay(props: any) {
  const { t } = useLang();
  useTheme();
  const variantId: string = props?.variantId ?? "count_up";
  const spec = SIMPLE_ROUND_VARIANTS[variantId];
  const isSuperBull = variantId === "super_bull";
  const cfg: CommonConfig = (props?.params?.config as CommonConfig) || (props?.config as CommonConfig) || { players: 2, botsEnabled: false, botLevel: "normal", rounds: 10, objective: 0, humansCount: 1 };

  const playerRows = useMemo(() => {
    const explicit = props?.params?.players ?? props?.players ?? (Array.isArray((cfg as any)?.players) ? (cfg as any).players : null);
    if (Array.isArray(explicit) && explicit.length) return explicit.map((p: any, i: number) => ({ id: String(p?.id ?? p?.profileId ?? `p${i + 1}`), name: String(p?.name ?? p?.displayName ?? `${t("generic.player", "Joueur")} ${i + 1}`), avatarDataUrl: p?.avatarDataUrl ?? p?.avatarUrl ?? null, isBot: !!p?.isBot }));
    const count = Math.max(1, Number((cfg as any)?.players) || 1);
    return Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `${t("generic.player", "Joueur")} ${i + 1}`, avatarDataUrl: null, isBot: false }));
  }, [props?.params?.players, props?.players, (cfg as any)?.players, t]);
  const playerCount = playerRows.length;

  const [roundIdx, setRoundIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [scores, setScores] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [currentThrow, setCurrentThrow] = useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const visitHistoryRef = useRef<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [dartsByP, setDartsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [pointsByP, setPointsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [bestVisitByP, setBestVisitByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [visitsByP, setVisitsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [bullsByP, setBullsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [dbullsByP, setDbullsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [streakByP, setStreakByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [bestStreakByP, setBestStreakByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [perfectVisitsByP, setPerfectVisitsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [visitScoresByP, setVisitScoresByP] = useState<number[][]>(() => Array.from({ length: playerCount }, () => []));
  const [dbullFlash, setDbullFlash] = useState(false);
  const botActRef = useRef<{ key: string } | null>(null);
  const savedRef = useRef(false);
  const isFinished = gameOver || roundIdx >= cfg.rounds;

  const winner = useMemo(() => {
    if (!isFinished) return null;
    if (winnerIdx != null) return { idx: winnerIdx, score: scores[winnerIdx] };
    const max = Math.max(...scores);
    const tied = scores.map((s, i) => ({ s, i })).filter(x => x.s === max);
    if (isSuperBull && tied.length > 1) tied.sort((a, b) => (dbullsByP[b.i] || 0) - (dbullsByP[a.i] || 0) || pct((bullsByP[b.i] || 0) + (dbullsByP[b.i] || 0), dartsByP[b.i] || 0) - pct((bullsByP[a.i] || 0) + (dbullsByP[a.i] || 0), dartsByP[a.i] || 0));
    const idx = tied[0]?.i ?? spec?.computeWinnerOnEnd(scores) ?? 0;
    return { idx, score: scores[idx] };
  }, [isFinished, winnerIdx, scores, spec, isSuperBull, dbullsByP, bullsByP, dartsByP]);

  const configTab = useMemo(() => ({ count_up: "count_up_config", halve_it: "halve_it_config", bobs_27: "bobs27_config", bobs27: "bobs27_config", enculette: "enculette_config", super_bull: "super_bull_config", happy_mille: "happy_mille_config", game_170: "game_170_config" } as Record<string, string>)[String(variantId || "")] || "games", [variantId]);
  const botMask = useMemo(() => {
    if (!cfg?.botsEnabled) return Array.from({ length: playerCount }, () => false);
    const humans = Math.min(Math.max(1, Number(cfg?.humansCount ?? 1)), Math.max(1, playerCount));
    return Array.from({ length: playerCount }, (_, i) => i >= humans);
  }, [cfg?.botsEnabled, playerCount, (cfg as any)?.humansCount]);

  function goBack() { if (props?.setTab) return props.setTab(configTab && configTab !== "games" ? configTab : "games", configTab !== "games" ? { config: cfg } : undefined); window.history.back(); }
  function advanceTurn(nextScores: number[], forcedWinner: number | null) {
    setScores(nextScores);
    if (forcedWinner != null) { setWinnerIdx(forcedWinner); setGameOver(true); return; }
    let nextPlayer = playerIdx + 1, nextRound = roundIdx;
    if (nextPlayer >= playerCount) { nextPlayer = 0; nextRound = roundIdx + 1; }
    setPlayerIdx(nextPlayer); setRoundIdx(nextRound); if (nextRound >= cfg.rounds) setGameOver(true);
  }

  function applyVisitFor(pIdx: number, rawDarts: UIDart[]) {
    if (!spec) return;
    const enteredDarts = (Array.isArray(rawDarts) ? rawDarts : []).slice(0, 3);
    const exactDarts = isSuperBull ? enteredDarts.map((d: UIDart) => Number(d?.v) === 25 && (Number(d?.mult) === 1 || Number(d?.mult) === 2) ? { v: 25, mult: Number(d.mult) === 2 ? 2 : 1 } as UIDart : { v: 0, mult: 1 } as UIDart) : enteredDarts;
    const v = isSuperBull ? exactDarts.reduce((sum, d) => sum + bullValue(d), 0) : clamp(scoreDarts(exactDarts));
    const pid = String(playerRows[pIdx]?.id ?? `p${pIdx + 1}`);
    const visitIndex = visitHistoryRef.current.filter((row: any) => String(row?.playerId) === pid).length;
    visitHistoryRef.current.push(canonicalVisitFromUiDarts({ playerId: pid, darts: exactDarts, visitIndex, roundIndex: roundIdx, source: `simple_rounds:${variantId}` }));
    const res = spec.applyVisit({ visit: v, currentScore: scores[pIdx] ?? 0, objective: cfg.objective, roundIndex: roundIdx });
    const nextScores = [...scores]; nextScores[pIdx] = (nextScores[pIdx] ?? 0) + (res.delta ?? 0);
    setVisitsByP(a => { const n=[...a]; n[pIdx]=(n[pIdx]||0)+1; return n; });
    setDartsByP(a => { const n=[...a]; n[pIdx]=(n[pIdx]||0)+exactDarts.length; return n; });
    setPointsByP(a => { const n=[...a]; n[pIdx]=(n[pIdx]||0)+(res.delta||0); return n; });
    setBestVisitByP(a => { const n=[...a]; n[pIdx]=Math.max(n[pIdx]||0,v); return n; });
    if (isSuperBull) {
      const bulls = exactDarts.filter(d => bullValue(d) === 25).length, dbulls = exactDarts.filter(d => bullValue(d) === 50).length, hits = bulls + dbulls;
      setBullsByP(a => { const n=[...a]; n[pIdx]=(n[pIdx]||0)+bulls; return n; });
      setDbullsByP(a => { const n=[...a]; n[pIdx]=(n[pIdx]||0)+dbulls; return n; });
      setVisitScoresByP(a => { const n=a.map(x=>[...x]); n[pIdx].push(v); return n; });
      setPerfectVisitsByP(a => { const n=[...a]; if(hits===3)n[pIdx]=(n[pIdx]||0)+1; return n; });
      setStreakByP(a => { const n=[...a]; let streak=n[pIdx]||0, best=bestStreakByP[pIdx]||0; exactDarts.forEach(d=>{ if(bullValue(d)>0){streak++;best=Math.max(best,streak);}else streak=0; }); n[pIdx]=streak; setBestStreakByP(b=>{const z=[...b];z[pIdx]=Math.max(z[pIdx]||0,best);return z;}); return n; });
      if (dbulls > 0) { setDbullFlash(true); window.setTimeout(() => setDbullFlash(false), 650); }
    }
    advanceTurn(nextScores, res.forceWin ? pIdx : null);
  }

  function validate() { if (!currentThrow.length || (isSuperBull && currentThrow.length !== 3)) return; applyVisitFor(playerIdx, currentThrow); setCurrentThrow([]); setMultiplier(1); }
  function resetMatch() {
    savedRef.current=false; botActRef.current=null; setRoundIdx(0); setPlayerIdx(0); setScores(Array(playerCount).fill(0)); setCurrentThrow([]); setMultiplier(1); visitHistoryRef.current=[]; setGameOver(false); setWinnerIdx(null);
    setVisitsByP(Array(playerCount).fill(0)); setDartsByP(Array(playerCount).fill(0)); setPointsByP(Array(playerCount).fill(0)); setBestVisitByP(Array(playerCount).fill(0)); setBullsByP(Array(playerCount).fill(0)); setDbullsByP(Array(playerCount).fill(0)); setStreakByP(Array(playerCount).fill(0)); setBestStreakByP(Array(playerCount).fill(0)); setPerfectVisitsByP(Array(playerCount).fill(0)); setVisitScoresByP(Array.from({length:playerCount},()=>[]));
  }

  function botPickVisit(): number {
    const lvl=String(cfg?.botLevel||"normal"), r=Math.random();
    if(isSuperBull){const pBull=lvl==="hard"?.38:lvl==="easy"?.12:.24,pDBull=lvl==="hard"?.18:lvl==="easy"?.03:.09;let total=0;for(let d=0;d<3;d++){const x=Math.random();if(x<pDBull)total+=50;else if(x<pDBull+pBull)total+=25;}return clamp(total);}
    if(variantId==="game_170"){const p170=lvl==="hard"?.22:lvl==="easy"?.04:.11;if(r<p170)return 170;const base=lvl==="hard"?85:lvl==="easy"?35:60,span=lvl==="hard"?70:lvl==="easy"?55:65;return clamp(base+(Math.random()-.5)*span);}
    const base=lvl==="hard"?95:lvl==="easy"?35:70,span=lvl==="hard"?85:lvl==="easy"?70:80,spike=lvl==="hard"?.12:lvl==="easy"?.02:.06;if(Math.random()<spike)return clamp((lvl==="hard"?140:120)+Math.random()*40);if(Math.random()<(lvl==="hard"?.02:lvl==="easy"?.10:.06))return 0;return clamp(base+(Math.random()-.5)*span);
  }
  function botPickDarts(): UIDart[] { if(isSuperBull){const lvl=String(cfg?.botLevel||"normal"),pBull=lvl==="hard"?.38:lvl==="easy"?.12:.24,pDBull=lvl==="hard"?.18:lvl==="easy"?.03:.09;return Array.from({length:3},()=>{const x=Math.random();return x<pDBull?{v:25,mult:2 as const}:x<pDBull+pBull?{v:25,mult:1 as const}:{v:0,mult:1 as const};});} return exactDartsForScore(botPickVisit()).map(canonicalToUiDart); }

  useEffect(()=>{if(isFinished||!cfg?.botsEnabled||!botMask[playerIdx])return;const key=`${roundIdx}:${playerIdx}:${scores.join(",")}`;if(botActRef.current?.key===key)return;botActRef.current={key};const timer=window.setTimeout(()=>applyVisitFor(playerIdx,botPickDarts()),520);return()=>window.clearTimeout(timer);},[cfg?.botsEnabled,botMask,playerIdx,roundIdx,isFinished,scores.join("|")]);

  useEffect(()=>{
    if(!isFinished||savedRef.current||!winner)return;savedRef.current=true;const now=Date.now();const id=typeof crypto!=="undefined"&&typeof (crypto as any).randomUUID==="function"?(crypto as any).randomUUID():`sr_${variantId}_${now}_${Math.random().toString(16).slice(2)}`;
    const players=playerRows.map((p:any,i:number)=>({id:String(p.id),name:botMask[i]&&!String(p.name).includes("BOT")?`${p.name} (BOT)`:p.name,avatarDataUrl:p.avatarDataUrl??null}));const avg3ByPlayer:any={},dartsMap:any={},bestVisitMap:any={},bestCheckoutMap:any={},superBullByPlayer:any={};
    for(let i=0;i<playerCount;i++){const pid=String(players[i]?.id??`p${i+1}`),visits=visitsByP[i]||0,darts=dartsByP[i]||visits*3,pts=pointsByP[i]||0;avg3ByPlayer[pid]=Math.round((visits>0?pts/visits:0)*100)/100;dartsMap[pid]=darts;bestVisitMap[pid]=bestVisitByP[i]||0;bestCheckoutMap[pid]=0;if(isSuperBull)superBullByPlayer[pid]={bulls:bullsByP[i]||0,dbulls:dbullsByP[i]||0,centerHits:(bullsByP[i]||0)+(dbullsByP[i]||0),accuracyPct:pct((bullsByP[i]||0)+(dbullsByP[i]||0),darts),dbullPct:pct(dbullsByP[i]||0,darts),bestStreak:bestStreakByP[i]||0,perfectVisits:perfectVisitsByP[i]||0,visitScores:visitScoresByP[i]||[]};}
    const rec:any={id,matchId:id,kind:String(variantId||"simple_rounds"),status:"finished",createdAt:now,updatedAt:now,players,winnerId:String(players[winner.idx]?.id??`p${winner.idx+1}`),game:{mode:String(variantId||"simple_rounds"),rounds:cfg.rounds,objective:cfg.objective,botsEnabled:!!cfg.botsEnabled,botLevel:cfg.botLevel},summary:{legs:1,avg3ByPlayer,darts:dartsMap,bestVisitByPlayer:bestVisitMap,bestCheckoutByPlayer:bestCheckoutMap,...(isSuperBull?{superBullByPlayer}: {})},payload:{variantId,mode:variantId,sport:"darts",config:cfg,scores,visitHistory:visitHistoryRef.current.slice(),events:visitHistoryRef.current.slice(),...(isSuperBull?{superBull:superBullByPlayer}: {})}};
    const telemetry=buildDartsTelemetry(rec,rec.payload);if(telemetry){rec.payload.telemetry=telemetry;rec.payload.dartTelemetry=telemetry;rec.summary.hitSummary={...telemetry.totals,byPlayer:telemetry.perPlayer};rec.summary.telemetryExact=true;rec.summary.telemetryCoverage="full";}Promise.resolve(History.upsert(rec)).catch(e=>console.warn("History.upsert(simpleRounds) failed:",e));
  },[isFinished,winner,variantId,cfg,botMask,visitsByP,dartsByP,pointsByP,bestVisitByP,scores,playerRows,playerCount,isSuperBull,bullsByP,dbullsByP,bestStreakByP,perfectVisitsByP,visitScoresByP]);

  if(!spec)return <div className="page" style={{padding:16,color:"#fff"}}>Variante inconnue: {String(variantId)}</div>;
  const currentHits=(bullsByP[playerIdx]||0)+(dbullsByP[playerIdx]||0),currentDarts=dartsByP[playerIdx]||0,currentAccuracy=pct(currentHits,currentDarts),currentPpd=currentDarts?(scores[playerIdx]||0)/currentDarts:0,currentCombo=streakByP[playerIdx]||0;
  const comboLabel=currentCombo>=6?"LASER":currentCombo>=4?"ON FIRE":currentCombo>=2?"HOT":"CENTRE";

  return <div className={`page darts-play-auto-columns simple-rounds-play-screen ${isSuperBull?"superbull-play-v2":""}`}>
    <style>{superBullCss}</style>
    <div className="msc-mode-play-header"><PageHeader title={spec.title} tickerSrc={spec.tickerSrc} left={<BackDot onClick={goBack}/>} right={<InfoDot title={spec.infoTitle} content={spec.infoText}/>} /></div>
    <div className="msc-mode-play-content" style={{padding:14}}>
      {isSuperBull&&isFinished&&winner ? <SuperBullFinal playerRows={playerRows} scores={scores} dartsByP={dartsByP} bullsByP={bullsByP} dbullsByP={dbullsByP} bestVisitByP={bestVisitByP} bestStreakByP={bestStreakByP} perfectVisitsByP={perfectVisitsByP} visitScoresByP={visitScoresByP} winnerIdx={winner.idx} onReplay={resetMatch} onNew={goBack}/> : <>
        <div className="msc-mode-play-primary">
          <div className="superbull-roundline"><b>{t("generic.round","Round")} {Math.min(roundIdx+1,cfg.rounds)}/{cfg.rounds}</b>{!isFinished&&<span>{playerRows[playerIdx]?.name}{botMask[playerIdx]?" · BOT":""}</span>}</div>
          <div className={isSuperBull?"superbull-scoregrid":""} style={!isSuperBull?{display:"grid",gridTemplateColumns:`repeat(${playerCount}, minmax(0,1fr))`,gap:10}:undefined}>{scores.map((s,i)=>{const active=!isFinished&&i===playerIdx,hits=(bullsByP[i]||0)+(dbullsByP[i]||0),acc=pct(hits,dartsByP[i]||0);return <div key={i} className={isSuperBull?`superbull-player-card ${active?"active":""}`:""} style={!isSuperBull?{borderRadius:16,padding:12,border:active?"1px solid rgba(120,255,200,0.35)":"1px solid rgba(255,255,255,0.10)",background:active?"rgba(120,255,200,0.10)":"rgba(255,255,255,0.04)"}:undefined}><small>{playerRows[i]?.name||`${t("generic.player","Joueur")} ${i+1}`}{botMask[i]?" · BOT":""}</small><strong>{s}</strong>{isSuperBull&&<div><span>B {bullsByP[i]||0}</span><span>DB {dbullsByP[i]||0}</span><span>{acc.toFixed(0)}%</span></div>}</div>})}</div>
        </div>
        {!isFinished&&!botMask[playerIdx]&&<div className="msc-mode-play-secondary" style={{marginTop:12}}>{isSuperBull?<div className="superbull-console">
          <section className="superbull-visual"><div className="superbull-status"><span><small>JOUEUR ACTIF</small><b>{playerRows[playerIdx]?.name}</b></span><em className={`combo combo-${comboLabel.toLowerCase().replace(" ","-")}`}>{comboLabel} · {currentCombo}</em></div><SuperBullTarget darts={currentThrow} pulse={dbullFlash}/><div className="superbull-live-kpis"><span><small>PRÉCISION</small><b>{currentAccuracy.toFixed(1)}%</b></span><span><small>PTS/DART</small><b>{currentPpd.toFixed(1)}</b></span><span><small>BEST SÉRIE</small><b>{bestStreakByP[playerIdx]||0}</b></span><span><small>3/3</small><b>{perfectVisitsByP[playerIdx]||0}</b></span></div></section>
          <section className="superbull-input"><div className="superbull-darts">{Array.from({length:3},(_,i)=>{const d=currentThrow[i],value=bullValue(d);return <div key={i} className={value===50?"dbull":value===25?"bull":d?"miss":"empty"}><small>FLÉCHETTE {i+1}</small><b>{bullLabel(d)}</b><span>{value} pt</span></div>})}</div><div className="superbull-pad"><button onClick={()=>setCurrentThrow(p=>p.length>=3?p:[...p,{v:0,mult:1}])}>MISS<small>0</small></button><button className="bull" onClick={()=>setCurrentThrow(p=>p.length>=3?p:[...p,{v:25,mult:1}])}>BULL<small>25</small></button><button className="dbull" onClick={()=>setCurrentThrow(p=>p.length>=3?p:[...p,{v:25,mult:2}])}>DBULL<small>50</small></button></div><div className="superbull-actions"><button className="btn-secondary" onClick={()=>setCurrentThrow([])}>ANNULER</button><button className="btn-secondary" onClick={()=>setCurrentThrow(p=>p.slice(0,-1))}>EFFACER</button><button className="btn-primary" disabled={currentThrow.length!==3} onClick={validate}>VALIDER · {currentThrow.reduce((s,d)=>s+bullValue(d),0)} PTS</button></div><p>3 fléchettes obligatoires · aucun multiplicateur de score : BULL 25 / DBULL 50 / MISS 0</p></section>
        </div>:<><div style={{fontSize:12,opacity:.8,fontWeight:950,letterSpacing:.8}}>{t("generic.visit","VOLÉE")} — {t("generic.input","entre un score 0..180")}</div><div style={{marginTop:10}}><ScoreInputHub currentThrow={currentThrow} multiplier={multiplier} onSimple={()=>setMultiplier(1)} onDouble={()=>setMultiplier(2)} onTriple={()=>setMultiplier(3)} onCancel={()=>{setCurrentThrow([]);setMultiplier(1)}} onBackspace={()=>setCurrentThrow(p=>p.slice(0,-1))} onNumber={(n:number)=>setCurrentThrow(p=>p.length>=3?p:[...p,{v:n,mult:multiplier}])} onBull={()=>setCurrentThrow(p=>p.length>=3?p:[...p,{v:25,mult:multiplier===3?1:multiplier} as UIDart])} onValidate={validate} onDirectDart={(d:UIDart)=>setCurrentThrow(p=>p.length>=3?p:[...p,d])}/></div></>}</div>}
      </>}
    </div>
  </div>;
}

const superBullCss = `
.superbull-play-v2{--sb-cyan:#27dcff;--sb-gold:#ffc94a;--sb-red:#ff4658}.superbull-roundline{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.superbull-roundline span{color:var(--sb-cyan);font-weight:1000}.superbull-scoregrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px}.superbull-player-card{padding:10px;border:1px solid #253748;border-radius:14px;background:linear-gradient(180deg,#0b1722,#071019);min-width:0}.superbull-player-card.active{border-color:rgba(39,220,255,.62);box-shadow:0 0 18px rgba(39,220,255,.12),inset 0 0 0 1px rgba(39,220,255,.08)}.superbull-player-card small{display:block;color:#8999aa;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.superbull-player-card>strong{display:block;margin:3px 0;font-size:26px;color:#fff}.superbull-player-card>div{display:flex;gap:7px;color:#8fa0b2;font-size:9px;font-weight:900}.superbull-console{display:grid;grid-template-columns:minmax(260px,.9fr) minmax(300px,1.1fr);gap:12px}.superbull-visual,.superbull-input{padding:12px;border:1px solid #253748;border-radius:18px;background:linear-gradient(180deg,#0a141e,#050b11)}.superbull-status{display:flex;align-items:center;justify-content:space-between;gap:8px}.superbull-status span{display:flex;flex-direction:column}.superbull-status small{font-size:7px;color:#718296;font-weight:1000;letter-spacing:.8px}.superbull-status b{font-size:14px;color:#fff}.superbull-status em{font-style:normal;font-size:8px;font-weight:1000;border:1px solid #34485d;border-radius:999px;padding:5px 8px;color:#9eacba}.superbull-status .combo-hot{color:#ffd35a;border-color:#6f5a25}.superbull-status .combo-on-fire{color:#ff8e4d;border-color:#713a22;box-shadow:0 0 10px #ff7d3428}.superbull-status .combo-laser{color:#ff6170;border-color:#7d2d37;box-shadow:0 0 14px #ff334433}.superbull-target{position:relative;width:min(280px,78vw);aspect-ratio:1;margin:12px auto;border-radius:50%;background:radial-gradient(circle at 50% 50%,#ff3344 0 9%,#0b5639 9.5% 23%,#161d25 23.5% 72%,#06090d 72.5%);border:5px solid #1d2935;box-shadow:inset 0 0 0 2px #485868,0 10px 30px #0008}.superbull-target:before,.superbull-target:after{content:"";position:absolute;left:50%;top:7%;bottom:7%;width:1px;background:#ffffff15}.superbull-target:after{top:50%;left:7%;right:7%;width:auto;height:1px}.superbull-ring{position:absolute;border-radius:50%;display:grid;place-items:center;text-align:center;pointer-events:none}.superbull-ring span{font-size:8px;font-weight:1000;line-height:1.05;text-shadow:0 1px 3px #000}.superbull-ring b{font-size:12px}.superbull-outer{inset:24%;border:1px dashed #ffffff17}.superbull-outer span{position:absolute;top:-30px;color:#667687}.superbull-bull{inset:27%;border:1px solid #38e79255;color:#d8fff0}.superbull-dbull{inset:41%;border:1px solid #ff899355;color:#fff}.superbull-marker{position:absolute;z-index:4;width:25px;height:25px;margin:-12px 0 0 -12px;border-radius:50%;display:grid;place-items:center;font-style:normal;border:2px solid #fff;box-shadow:0 3px 8px #000c}.superbull-marker b{font-size:9px}.superbull-marker.miss{background:#56616d}.superbull-marker.bull{background:#14b875}.superbull-marker.dbull{background:#ff4254}.dbull-pulse .superbull-dbull{animation:sbPulse .55s ease-out}.superbull-live-kpis,.superbull-final-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.superbull-live-kpis span,.superbull-final-kpis span{padding:7px;border:1px solid #233343;border-radius:10px;background:#071019;display:flex;flex-direction:column;text-align:center}.superbull-live-kpis small,.superbull-final-kpis small{font-size:6px;color:#76879a;font-weight:1000;letter-spacing:.45px}.superbull-live-kpis b,.superbull-final-kpis b{margin-top:2px;color:#fff;font-size:13px}.superbull-darts{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.superbull-darts>div{min-height:72px;border:1px solid #263849;border-radius:12px;background:#08121b;display:flex;flex-direction:column;align-items:center;justify-content:center}.superbull-darts small{font-size:6px;color:#718398;font-weight:1000}.superbull-darts b{margin-top:3px;font-size:13px}.superbull-darts span{font-size:7px;color:#8797a8}.superbull-darts .bull{border-color:#267455;background:#082319}.superbull-darts .bull b{color:#53efa5}.superbull-darts .dbull{border-color:#813441;background:#250c12}.superbull-darts .dbull b{color:#ff6a78}.superbull-darts .miss b{color:#9ba6b2}.superbull-darts .empty{opacity:.55}.superbull-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.superbull-pad button{min-height:70px;border-radius:14px;border:1px solid #34485c;background:#101a25;color:#fff;font-weight:1000;font-size:13px}.superbull-pad button small{display:block;margin-top:3px;color:#8798aa;font-size:8px}.superbull-pad .bull{border-color:#287859;background:linear-gradient(180deg,#0b3928,#071c14);color:#5af0aa}.superbull-pad .dbull{border-color:#8b3542;background:linear-gradient(180deg,#41131a,#220b0f);color:#ff6a78;box-shadow:0 0 14px #ff354323}.superbull-actions{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:8px;margin-top:9px}.superbull-actions button{min-height:42px}.superbull-input p{text-align:center;font-size:8px;color:#718195;margin:8px 0 0}.superbull-final{max-width:980px;margin:0 auto}.superbull-final-hero{text-align:center;padding:14px;border:1px solid #6e5729;border-radius:18px;background:radial-gradient(circle at 50% 0,#5a3c1526,#081018 70%)}.superbull-final-hero small{color:#b39e78;font-size:7px;font-weight:1000;letter-spacing:1px}.superbull-trophy{width:54px;height:54px;margin:7px auto;border-radius:50%;display:grid;place-items:center;font-size:30px;color:#ffd35a;border:1px solid #84682e;background:#241a09;box-shadow:0 0 24px #ffc53027}.superbull-final-hero h2{margin:4px 0 0;font-size:18px}.superbull-final-hero>strong{display:block;color:#ffd35a;font-size:28px}.superbull-final-hero>span{font-size:8px;color:#9eacba}.superbull-ranking{display:grid;gap:8px;margin-top:10px}.superbull-ranking article{padding:10px;border:1px solid #29394a;border-radius:14px;background:#071019}.superbull-ranking article.winner{border-color:#6e5729}.superbull-ranking header{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:8px}.superbull-ranking .rank{font-size:16px;color:#75869a;font-weight:1000}.superbull-ranking header div{display:flex;flex-direction:column}.superbull-ranking header b{font-size:12px}.superbull-ranking header small{font-size:7px;color:#75869a}.superbull-ranking header>strong{font-size:22px;color:#fff}.superbull-scorebar{height:5px;margin:7px 0;border-radius:999px;background:#111d28;overflow:hidden}.superbull-scorebar i{display:block;height:100%;background:linear-gradient(90deg,#20c8e7,#ffcb45)}.superbull-final-kpis{grid-template-columns:repeat(9,minmax(0,1fr))}.superbull-visit-chart{height:68px;display:flex;align-items:flex-end;gap:4px;margin-top:7px}.superbull-visit-chart i{position:relative;flex:1;height:100%;min-width:12px;background:#0d1721;border-radius:5px;overflow:hidden;display:flex;align-items:flex-end}.superbull-visit-chart u{display:block;width:100%;background:linear-gradient(180deg,#2ee0ff,#1e7181);text-decoration:none}.superbull-visit-chart small{position:absolute;left:0;right:0;bottom:2px;text-align:center;color:#fff;font-size:6px;font-weight:1000;text-shadow:0 1px 3px #000}.superbull-final-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}.superbull-final-actions button{min-height:46px}@keyframes sbPulse{0%{box-shadow:0 0 0 0 #ff445f88}100%{box-shadow:0 0 0 32px #ff445f00}}@media(prefers-reduced-motion:reduce){.dbull-pulse .superbull-dbull{animation:none}}@media(max-width:760px){.superbull-console{grid-template-columns:1fr}.superbull-target{width:min(250px,70vw)}.superbull-final-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:480px){.superbull-live-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.superbull-pad button{min-height:60px}.superbull-actions{grid-template-columns:1fr 1fr}.superbull-actions .btn-primary{grid-column:1/-1}}
`;
