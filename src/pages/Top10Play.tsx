// @ts-nocheck
import React from "react";
import PageHeader from "../components/PageHeader";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ScoreInputHub from "../components/ScoreInputHub";
import { useLang } from "../contexts/LangContext";
import tickerTop10Fr from "../assets/tickers/ticker_top_10.webp";
import tickerTop10En from "../assets/tickers/ticker_top_10_en.webp";
import { History } from "../lib/history";
import { createMatchCheckpointWriter } from "../lib/matchCheckpointWriter";
import { clearPartialVisit, loadPartialVisit, previousVisitFingerprint, savePartialVisit } from "../lib/partialVisitDraft";
import { recoverTop10 } from "../lib/recoverTop10Morpion";
import { buildDartsTelemetry, canonicalVisitFromUiDarts } from "../lib/dartsTelemetry";
import type { Dart } from "../lib/types";

const RULES = `TOP 10\n\nDix volées de trois fléchettes. Les points de toutes les fléchettes sont cumulés. Simple, double, triple, Bull25 et Bull50 comptent normalement. Le meilleur total remporte la partie. En solo, l'objectif est de battre son propre record.\n\nIndicateurs : meilleur score de volée, moyenne par volée, 100+ et 140+.`;
function value(d: Dart) { const n = Number(d?.v || 0), m = Number(d?.mult || 1); return n === 25 ? m === 2 ? 50 : 25 : n * m; }
function createPlayers(cfg: any) {
  let list = Array.isArray(cfg.players) ? cfg.players.slice(0, 4).map((p: any, i: number) => ({ id: String(p.id || `top10-${i}`), name: String(p.name || `Joueur ${i+1}`), isBot: !!p.isBot, botLevel: p.botLevel || cfg.botLevel || "normal" })) : Array.from({ length: Math.max(1, Math.min(4, Number(cfg.players) || 1)) }, (_, i) => ({ id: `top10-${i}`, name: `Joueur ${i+1}`, isBot: !!cfg.botsEnabled && i > 0, botLevel: cfg.botLevel || "normal" }));
  if (cfg.turnOrder === "random") for(let i=list.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  return list;
}
function dartLabel(d: Dart) {
  if (!d || Number(d.v) === 0) return "MISS";
  if (Number(d.v) === 25) return Number(d.mult) === 2 ? "BULL50" : "BULL25";
  return `${Number(d.mult) === 3 ? "T" : Number(d.mult) === 2 ? "D" : "S"}${Number(d.v)}`;
}
function botVisit(level: string): Dart[] {
  const miss = level === "hard" ? .07 : level === "easy" ? .25 : .14;
  const triple = level === "hard" ? .38 : level === "easy" ? .09 : .23;
  return Array.from({ length: 3 }, () => { if (Math.random() < miss) return { v: 0, mult: 1 }; if(Math.random()<.03) return {v:25,mult:Math.random()<.25?2:1}; const v = Math.random() < (level === "hard" ? .67 : .42) ? 20 : 1 + Math.floor(Math.random()*20); const r = Math.random(); return { v, mult: r < triple ? 3 : r < triple + .14 ? 2 : 1 }; });
}
export default function Top10Play(props: any) {
  const { lang } = useLang();
  const route = props?.params || {};
  const resuming = !!(route.resumeId || (route.rec && route.from?.startsWith("history")));
  const preview = !!route.preview;
  const cfgRef = React.useRef(route.config ?? route.rec?.resume?.config ?? route.rec?.payload?.config ?? props?.config ?? {});
  const cfg = cfgRef.current;
  const [players, setPlayers] = React.useState(() => createPlayers(cfg));
  const [hydration, setHydration] = React.useState(resuming ? "loading" : "ready");
  const rounds = 10;
  const [scores, setScores] = React.useState(() => players.map(() => [] as number[]));
  const [round, setRound] = React.useState(0);
  const [current, setCurrent] = React.useState(0);
  const [throwing, setThrowing] = React.useState<Dart[]>([]);
  const [mult, setMult] = React.useState<1 | 2 | 3>(1);
  const [finished, setFinished] = React.useState(false);
  const visits = React.useRef<any[]>([]);
  const id = React.useRef(`top10-${Date.now()}-${Math.random().toString(36).slice(2,7)}`);
  const createdAt = React.useRef(Date.now());
  const botGuard = React.useRef("");
  const commitGuard = React.useRef(false);
  const [botSummary, setBotSummary] = React.useState<{ name: string; darts: Dart[]; points: number } | null>(null);
  const [inputWarning, setInputWarning] = React.useState("");
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [leavePending, setLeavePending] = React.useState(false);
  const [restoredDraft, setRestoredDraft] = React.useState(false);
  const leavingRef = React.useRef(false);
  const writerRef = React.useRef<any>(null);
  if (!writerRef.current) {
    writerRef.current = createMatchCheckpointWriter((rec: any) => History.upsert(rec), {
      onStatus: setSaveStatus,
      onSaved: (rec: any) => { if (rec.status === "finished") { clearPartialVisit({ mode: "top_10", matchId: String(rec.matchId || rec.id) }); props?.onFinish?.(rec); } },
      onError: (error: any) => console.warn("[GAME] checkpoint non enregistré", error),
    });
  }
  // Fingerprint only already-validated visits; never promote draft darts to History.
  const draftIdentity = (matchId: string, playerId: string, roundIndex: number, playerIndex: number, visitsList: any[]) => ({
    mode: "top_10" as const, matchId, playerId, round: roundIndex, current: playerIndex,
    committedVisits: visitsList.length, previousVisit: previousVisitFingerprint(visitsList),
  });
  const persist = (rec: any) => writerRef.current.enqueue(rec);
  const retrySave = () => { writerRef.current.retry(); };
  const forceExit = () => {
    if (window.confirm("Le dernier état de la partie n’a pas été enregistré. Quitter malgré le risque de perdre des volées ?")) props?.setTab?.(resuming?"history":cfgRef.current.training?"training":"games");
  };
  async function requestBack(destination: string) {
    if (leavingRef.current) return;
    if (!preview && throwing.length > 0) {
      const active = players[current];
      const stored = !!active && savePartialVisit(
        draftIdentity(id.current, active.id, round, current, visits.current), throwing, mult);
      const message = stored
        ? `${throwing.length} fléchette(s) non validée(s) conservée(s) sur cet appareil. Quitter la partie ?`
        : `${throwing.length} fléchette(s) non validée(s). Stockage local indisponible : ces fléchettes risquent d’être perdues. Quitter ?`;
      if (!window.confirm(message)) return;
    }
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
      persist(record("in_progress", scores, round, current));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const requestedId = String(route.resumeId || route.rec?.id || route.rec?.matchId || "");
        const saved = await History.get(requestedId);
        if (cancelled) return;
        const restored = recoverTop10(saved, { preview });
        if (!restored || restored.id !== requestedId) throw new Error("Checkpoint TOP 10 absent, terminé ou incohérent");
        id.current = restored.id;
        createdAt.current = restored.createdAt;
        cfgRef.current = restored.config;
        visits.current = restored.visits;
        botGuard.current = "";
        commitGuard.current = false;
        setPlayers(restored.players);
        setScores(restored.scores);
        setRound(restored.round);
        setCurrent(restored.current);
        const pending = (!preview && !restored.finished && !restored.players[restored.current]?.isBot)
          ? loadPartialVisit(draftIdentity(restored.id, restored.players[restored.current].id,
              restored.round, restored.current, restored.visits)) : null;
        setThrowing(pending?.darts ?? []);
        setMult(pending?.multiplier ?? 1);
        setRestoredDraft(!!pending);
        setFinished(restored.finished);
        setBotSummary(null);
        setHydration("ready");
      } catch (error) {
        if (!cancelled) { console.warn("[TOP10] reprise refusée", error); setHydration("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const who = players[current];
  const ranking = players.map((p: any, i: number) => ({...p, total: scores[i].reduce((a:number,b:number)=>a+b,0), best: Math.max(0,...scores[i]), average: scores[i].length ? scores[i].reduce((a:number,b:number)=>a+b,0)/scores[i].length : 0, hundred: scores[i].filter((x:number)=>x>=100).length, oneForty: scores[i].filter((x:number)=>x>=140).length, scored: scores[i].length})).sort((a:any,b:any) => b.total-a.total);
  const winnerId = finished && ranking[0]?.total !== ranking[1]?.total ? ranking[0]?.id : finished && ranking.length === 1 ? ranking[0]?.id : null;
  function record(status: "in_progress" | "finished", nextScores: number[][], nextRound: number, nextCurrent: number) {
    const now = Date.now();
    const final = players.map((p:any,i:number) => ({...p, score: nextScores[i].reduce((a:number,b:number)=>a+b,0)}));
    const ordered = [...final].sort((a,b)=>b.score-a.score);
    const finishedWinner = status === "finished" && (ordered.length === 1 || ordered[0].score > ordered[1].score) ? ordered[0].id : null;
    const rec: any = { id: id.current, matchId: id.current, kind:"top_10", mode:"top_10", sport:"darts", status, createdAt:createdAt.current, updatedAt:now, finishedAt:status==="finished"?now:undefined, winnerId:finishedWinner, players:final, game:{mode:"top_10",rounds,training:!!cfgRef.current.training,resumeRoute:"top_10_play"}, summary:{mode:"top_10",finished:status==="finished",winnerId:finishedWinner, finalScores:Object.fromEntries(final.map((p:any)=>[p.id,p.score])), roundsPlayed:nextRound, perPlayer:Object.fromEntries(players.map((p:any,i:number)=>[p.id,{ total:final[i].score, bestVisit:Math.max(0,...nextScores[i]), avgVisit:nextScores[i].length?final[i].score/nextScores[i].length:0, visits100:nextScores[i].filter((x:number)=>x>=100).length, visits140:nextScores[i].filter((x:number)=>x>=140).length }]))}, resume: {route:"top_10_play",modeId:"top_10",config:{...cfgRef.current,players}}, payload:{mode:"top_10",sport:"darts",config:{...cfgRef.current,players},roundIdx:nextRound,currentPlayerIndex:nextCurrent,visitScores:nextScores,visits:visits.current.slice(),visitHistory:visits.current.slice(),events:visits.current.slice()} };
    const telemetry = buildDartsTelemetry(rec,rec.payload);
    if(telemetry){ rec.payload.telemetry=telemetry;rec.payload.dartTelemetry=telemetry;rec.summary.hitSummary={...telemetry.totals,byPlayer:telemetry.perPlayer};rec.summary.telemetryExact=true;rec.summary.telemetryCoverage="full";rec.summary.dartsByPlayer=telemetry.perPlayer; }
    return rec;
  }

  function commit(darts:Dart[]) {
    if (hydration !== "ready" || preview || finished || !who || botSummary || commitGuard.current || leavingRef.current || (writerRef.current.isBusy || writerRef.current.hasError)) return;
    if (darts.length !== 3) { setInputWarning("Saisis 3 fléchettes, y compris MISS pour un lancer manqué."); return; }
    commitGuard.current = true;
    setInputWarning("");
    // Garder les trois fléchettes en brouillon jusqu'à confirmation History V4.
    // En cas de crash Android avant l'upsert, elles restent rejouables depuis la dernière volée validée.
    if (!who.isBot) savePartialVisit(draftIdentity(id.current, who.id, round, current, visits.current), darts.slice(0, 3), mult);
    setRestoredDraft(false);
    const chosen=darts.slice(0,3), points=chosen.reduce((acc,d)=>acc+value(d),0);
    visits.current.push(canonicalVisitFromUiDarts({playerId:who.id,darts:chosen,visitIndex:scores[current].length,roundIndex:round,source:"top_10"}));
    const nextScores=scores.map((s:number[])=>[...s]);nextScores[current].push(points);
    const nextCurrent=(current+1)%players.length, nextRound=nextCurrent===0?round+1:round, done=nextRound>=rounds;
    setScores(nextScores);setRound(nextRound);setCurrent(nextCurrent);setThrowing([]);setMult(1);setFinished(done);
    if (who.isBot) setBotSummary({ name: who.name, darts: chosen, points });
    persist(record(done?"finished":"in_progress",nextScores,nextRound,nextCurrent));
  }
  React.useEffect(() => { commitGuard.current = false; }, [scores, round, current]);
  React.useEffect(() => {
    if (hydration !== "ready" || preview) return;
    // Ne jamais supprimer un brouillon de 3 fléchettes tant que son checkpoint
    // est encore en cours d'écriture, ou si cet enregistrement a échoué.
    if (!throwing.length && (writerRef.current.isBusy || writerRef.current.hasError)) return;
    if (finished || !who || who.isBot || leavingRef.current && !throwing.length) {
      clearPartialVisit({ mode: "top_10", matchId: id.current });
      return;
    }
    // Brouillon exclusivement local : ni score officiel ni statistique.
    savePartialVisit(draftIdentity(id.current, who.id, round, current, visits.current), throwing, mult);
  }, [hydration, preview, finished, round, current, who?.id, who?.isBot, throwing, mult, saveStatus]);
  React.useEffect(() => { if (throwing.length === 3) setInputWarning(""); }, [throwing.length]);
  React.useEffect(()=>{
    if(hydration !== "ready" || preview || finished||leavingRef.current||(writerRef.current.isBusy || writerRef.current.hasError)||botSummary||!who?.isBot||throwing.length) return;
    const key=`${round}:${current}:${visits.current.length}`;
    if(botGuard.current===key)return;
    botGuard.current=key;
    const timer=window.setTimeout(()=>commit(botVisit(who.botLevel)),800);
    return()=>{window.clearTimeout(timer);if(botGuard.current===key)botGuard.current="";};
  },[hydration,preview,finished,round,current,who?.isBot,throwing.length,botSummary,saveStatus]);
  async function restart(){if (hydration !== "ready" || preview || leavingRef.current) return; if (!(await writerRef.current.drain())) return;botGuard.current="";commitGuard.current=false;setBotSummary(null);setInputWarning("");clearPartialVisit({mode:"top_10",matchId:id.current});setRestoredDraft(false);id.current=`top10-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; createdAt.current=Date.now(); visits.current=[];const empty=players.map(()=>[]);setScores(empty);setRound(0);setCurrent(0);setThrowing([]);setFinished(false);persist(record("in_progress",empty,0,0));}
  if (hydration !== "ready") return <div className="page"><PageHeader title="TOP 10" tickerSrc={lang === "fr" ? tickerTop10Fr : tickerTop10En} left={<BackDot onClick={()=>props?.setTab?.("history")} />} />
    <div role="status" style={{padding:25,textAlign:"center"}}>{hydration === "loading" ? "Chargement de la partie enregistrée…" : "Reprise impossible : état enregistré absent, terminé ou incohérent. Aucune nouvelle partie n’a été créée."}
    <div style={{marginTop:16}}><button type="button" className="btn-secondary" onClick={()=>props?.setTab?.("history")}>Retour à l'historique</button></div></div></div>;
  return <div className="page"><PageHeader title="TOP 10" tickerSrc={lang === "fr" ? tickerTop10Fr : tickerTop10En} left={<BackDot onClick={()=>requestBack(resuming?"history":cfgRef.current.training?"training":"games")} />} right={<InfoDot title="Règles TOP 10" content={RULES}/>} />
    <div style={{maxWidth:720,margin:"auto",padding:"12px 12px 120px"}}>
      {restoredDraft && !preview && <div role="status" style={{fontSize:12,marginBottom:8,color:"#9fe7c7"}}>Volée non validée restaurée sur cet appareil : vérifie les fléchettes avant validation.</div>}
      {saveStatus !== "idle" && <div role={saveStatus === "error" ? "alert" : "status"} style={{fontSize:12,marginBottom:8,color:saveStatus === "error" ? "#ff9a9a" : "#a9d8ef"}}>{saveStatus === "saving" ? "Enregistrement de la partie…" : saveStatus === "error" ? "Enregistrement impossible : vérifie l'espace disponible avant de quitter." : "Partie enregistrée sur cet appareil."}</div>}
      {saveStatus === "error" && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}><button type="button" className="btn-primary" onClick={retrySave}>RÉESSAYER L’ENREGISTREMENT</button><button type="button" className="btn-secondary" onClick={forceExit}>QUITTER SANS ENREGISTRER</button><span style={{fontSize:12,opacity:.85}}>La partie ne progresse plus tant que le dernier état n’est pas enregistré.</span></div>}
      {leavePending && <div role="status" style={{marginBottom:8,fontSize:12,color:"#ffd18a"}}>Sortie en attente de confirmation du dernier enregistrement…</div>}
      <section style={{padding:13,border:"1px solid #ffffff28",borderRadius:17,background:"#11192d"}}><b>{finished ? "TOP 10 TERMINÉ" : `VOLÉE ${Math.min(round+1,10)} / 10`}</b><div style={{fontSize:18,fontWeight:900,marginTop:5}}>{finished?(winnerId ? `🏆 ${players.find((p:any)=>p.id===winnerId)?.name}`:"Égalité"):`Au tour de ${who?.name}`}</div><div style={{marginTop:8,fontSize:12,opacity:.75}}>Objectif : plus gros total en 30 fléchettes · 10 volées de 3</div></section>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:8,marginTop:10}}>{ranking.map((p:any)=> <div key={p.id} style={{border:`1px solid ${who?.id===p.id&&!finished?"#4dd8fa":"#ffffff20"}`,borderRadius:13,padding:11,background:"#131c34"}}><div style={{fontWeight:900,fontSize:12}}>{p.name}</div><strong style={{fontSize:32}}>{p.total}</strong> <small>pts</small><div style={{fontSize:11,opacity:.76}}>Meilleure {p.best} · Moy. {p.average.toFixed(1)}</div><div style={{fontSize:11,opacity:.76}}>100+ : {p.hundred} · 140+ : {p.oneForty}</div></div>)}</div>
      <section style={{marginTop:10,padding:12,borderRadius:16,background:"#101729",border:"1px solid #ffffff25"}}><b>TABLEAU DES VOLÉES</b><div style={{overflowX:"auto",marginTop:8}}><table style={{width:"100%",textAlign:"center",borderCollapse:"collapse"}}><thead><tr><th style={{textAlign:"left",padding:6}}>Volée</th>{players.map((p:any)=><th key={p.id} style={{padding:6}}>{p.name}</th>)}</tr></thead><tbody>{Array.from({length:rounds},(_,i)=><tr key={i} style={{background:i===round&&!finished?"#47bde01b":"transparent",borderTop:"1px solid #ffffff12"}}><td style={{textAlign:"left",padding:6}}>#{i+1}</td>{players.map((p:any,j:number)=><td key={p.id} style={{padding:6,fontWeight:800}}>{scores[j][i] ?? "—"}</td>)}</tr>)}</tbody></table></div></section>
      {preview && <div style={{textAlign:"center",marginTop:12,color:"#ffd18a"}}>APERÇU — LECTURE SEULE <button type="button" className="btn-secondary" onClick={()=>props?.setTab?.("history")}>Retour</button></div>}
      {!preview&&!finished&&!who?.isBot&&saveStatus !== "saving"&&saveStatus !== "error"&&!leavePending&&<section style={{marginTop:12,padding:9,borderRadius:14,background:"#12182a"}}><b>VOLÉE · {throwing.length}/3</b>{inputWarning && <div role="alert" style={{color:"#ffd18a",fontSize:12,marginTop:4}}>{inputWarning}</div>}<ScoreInputHub currentThrow={throwing} multiplier={mult} onSimple={()=>setMult(1)} onDouble={()=>setMult(2)} onTriple={()=>setMult(3)} onCancel={()=>{setRestoredDraft(false);setThrowing([]);setMult(1);}} onBackspace={()=>setThrowing((v)=>v.slice(0,-1))} onNumber={(n:number)=>setThrowing((v)=>v.length>=3?v:[...v,{v:n,mult}])} onBull={()=>setThrowing((v)=>v.length>=3?v:[...v,{v:25,mult:mult===2?2:1}])} onDirectDart={(d:Dart)=>setThrowing((v)=>v.length>=3?v:[...v,d])} onValidate={()=>commit(throwing)}/></section>}
      {botSummary && saveStatus !== "error" && <div role="dialog" aria-label="Volée du bot" style={{ position:"fixed", inset:0, zIndex:10010, display:"grid", placeItems:"center", padding:16, background:"#030713bc" }}>
        <div style={{width:"min(100%, 430px)", background:"#121b33", border:"1px solid #67dafa", boxShadow:"0 22px 80px #000b", borderRadius:18, padding:20, textAlign:"center"}}>
          <div style={{fontSize:13,opacity:.8,fontWeight:800}}>VOLÉE DU BOT</div>
          <h3 style={{margin:"5px 0 12px"}}>{botSummary.name}</h3>
          <div style={{fontSize:19,fontWeight:800}}>{botSummary.darts.map(dartLabel).join(" · ")}</div>
          <div style={{fontSize:46,fontWeight:1000,color:"#6feaff",margin:"12px 0"}}>{botSummary.points} <span style={{fontSize:15,color:"#fff"}}>pts</span></div>
          <button type="button" className="btn-primary" disabled={saveStatus === "saving"} style={{width:"100%",padding:13}} onClick={() => setBotSummary(null)}>{saveStatus === "saving" ? "ENREGISTREMENT…" : "CONTINUER"}</button>
        </div>
      </div>}
      {!preview&&finished&&saveStatus !== "error"&&!leavePending&&<button type="button" className="btn-primary" style={{width:"100%",marginTop:10}} onClick={restart}>RECOMMENCER</button>}
    </div>
  </div>;
}
