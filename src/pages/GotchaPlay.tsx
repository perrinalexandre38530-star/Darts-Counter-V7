// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerGotcha from "../assets/tickers/ticker_gotcha.png";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  cloneGotchaState, createGotchaState, normalizeGotchaConfig, pickGotchaBotDarts,
  playGotchaVisit, type GotchaState,
} from "../lib/gameEngines/gotchaEngine";
import {
  NewModeInput, PlayerCard, ModeEndPanel, actionStyle, isBotProfile, lastEvents,
  panelStyle, playerName, resolveModeProfiles, SOFT, uiToGameDart,
} from "./newModes/newModePlayShared";

const ACCENT="#ff9b31"; const RED="#ff4d45"; const BLUE="#58c9ff"; const GREEN="#6ee7a8";
function Rules({config}:any){return <div style={{display:"grid",gap:10,fontSize:12.5,lineHeight:1.5}}><div><b style={{color:ACCENT}}>OBJECTIF</b><br/>Pars de 0 et atteins exactement {config.rules.targetScore}.</div><div><b style={{color:RED}}>GOTCHA !</b><br/>Si ton score final de volée est exactement égal au score d’un ou plusieurs adversaires, ils repartent à 0.</div><div><b style={{color:BLUE}}>SORTIE</b><br/>{config.rules.outMode==="double"?"Le dernier dart doit être un Double / DBULL.":config.rules.outMode==="master"?"Le dernier dart doit être un Double, Triple ou DBULL.":"Straight out : n’importe quelle zone termine la manche."}</div><div><b style={{color:GREEN}}>BUST</b><br/>{config.rules.bustRule==="zero"?"Dépassement ou sortie invalide : retour à 0.":"Dépassement ou sortie invalide : retour au score du début de la volée."}</div></div>}

export default function GotchaPlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:false});
  const go=props?.go??props?.setTab; const store=props?.store; const onFinish=props?.onFinish;
  const resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeGotchaConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);
  const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const [state,setState]=React.useState<GotchaState>(()=>restored?.mode==="gotcha"?cloneGotchaState(restored):createGotchaState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>([]); const [multiplier,setMultiplier]=React.useState<1|2|3>(1); const [undo,setUndo]=React.useState<GotchaState[]>([]); const [notice,setNotice]=React.useState("");
  const botBusy=React.useRef(false); const finishedRef=React.useRef(false); const matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`gotcha-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const activePlayer=state.players[state.activePlayerIndex]; const activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null; const activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);

  const buildRecord=React.useCallback((s:GotchaState,status:"in_progress"|"finished")=>{const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));return{id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"gotcha",mode:"gotcha",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,game:{mode:"gotcha",targetScore:s.config.rules.targetScore,seriesWins:s.config.seriesWins},summary:{mode:"gotcha",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,targetScore:s.config.rules.targetScore,config:s.config,finalScores:s.scores,perPlayer:Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,score:Number(s.scores[id]||0),wins:Number(s.legWins[id]||0)}]))},resume:{mode:"gotcha",config:s.config,state:cloneGotchaState(s),updatedAt:Date.now()},payload:{kind:"gotcha",mode:"gotcha",sport:"darts",config:s.config,stateSnapshot:cloneGotchaState(s),visits:s.visits,visitHistory:s.visits,stats:{mode:"gotcha",players:s.statsByPlayer,legWins:s.legWins}}};},[profiles]);
  const persist=React.useCallback((s:GotchaState)=>{if(s.phase==="finished"){if(finishedRef.current)return;finishedRef.current=true;const rec=buildRecord(s,"finished");if(typeof onFinish==="function")onFinish(rec,{navigate:false});else void History.upsert(rec);}else void History.upsert(buildRecord(s,"in_progress")).catch(()=>{});},[buildRecord,onFinish]);
  const commit=(next:GotchaState,previous=state)=>{setUndo(u=>[...u.slice(-39),cloneGotchaState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);const ev=lastEvents(next.visits);setNotice(ev.length?ev.join(" · "):"");persist(next);};
  const validate=()=>{if(!currentThrow.length||state.phase==="finished"||activeIsBot)return;commit(playGotchaVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneGotchaState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière volée annulée");finishedRef.current=false;persist(prev);return u.slice(0,-1);});
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{commit(playGotchaVisit(state,pickGotchaBotDarts(state,config.botLevel)));}finally{botBusy.current=false;}},650);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);
  function replay(){matchIdRef.current=`gotcha-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setCurrentThrow([]);setState(createGotchaState(players,config));}
  const remaining=activePlayer?Math.max(0,config.rules.targetScore-Number(state.scores[activePlayer.id]||0)):0; const legTarget=config.seriesWins*2-1;
  return <div style={{minHeight:"calc(var(--vh, 1vh) * 100)",paddingBottom:18,background:"radial-gradient(circle at 50% 0%,rgba(255,99,55,.10),transparent 35%)"}}>
    <PageHeader tickerSrc={tickerGotcha} tickerAlt="GOTCHA" left={<BackDot onClick={()=>go?.("gotcha_config")} color={ACCENT} glow={`${ACCENT}88`}/>} right={<InfoDot title="Règles GOTCHA" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config}/>}/>} />
    <div style={{padding:"7px 8px 18px",maxWidth:980,margin:"0 auto",display:"grid",gap:8}}>
      <div style={{...panelStyle(ACCENT+"50"),padding:9,display:"grid",gridTemplateColumns:"1fr auto",gap:9,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100,letterSpacing:1}}>MANCHE {state.legIndex+1} · BO{legTarget}{config.rules.maxRounds?` · ROUND ${Math.min(state.roundIndex+1,config.rules.maxRounds)}/${config.rules.maxRounds}`:""}</div><div style={{marginTop:3,color:"#fff",fontSize:14,fontWeight:1000}}>{state.phase==="finished"?"Match terminé":`${activePlayer?.name||"—"} joue`}</div></div><button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT,!undo.length)}>↶ UNDO</button></div>
      {notice?<div style={{borderRadius:12,padding:"7px 10px",background:notice.includes("GOTCHA")?"rgba(255,77,69,.15)":"rgba(255,155,49,.10)",border:`1px solid ${notice.includes("GOTCHA")?"rgba(255,77,69,.36)":"rgba(255,155,49,.24)"}`,color:notice.includes("GOTCHA")?"#ff9e98":"#ffd39d",fontSize:10.5,fontWeight:900}}>{notice}</div>:null}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:7}}>{state.players.map((p:any,i:number)=>{const prof=profileById.get(String(p.id))||p;const score=Number(state.scores[p.id]||0);const st=state.statsByPlayer[p.id]||{};return <PlayerCard key={p.id} profile={prof} active={state.phase!=="finished"&&state.activePlayerIndex===i} accent={ACCENT} value={score} subValue={`${config.rules.targetScore-score} restant · ${st.gotchas||0} GOTCHA`} badge={st.gotchas?`🎯 ${st.gotchas}`:null} wins={state.legWins[p.id]||0}/>})}</div>
      {state.phase!=="finished"?<>
        <div style={{...panelStyle("rgba(255,255,255,.10)"),padding:10}}><div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100}}>COURSE VERS {config.rules.targetScore}</div><div style={{marginTop:3,color:"#fff",fontSize:24,fontWeight:1100}}>{remaining} <span style={{fontSize:11,color:SOFT}}>RESTANT</span></div><div style={{marginTop:4,color:SOFT,fontSize:9.5}}>{config.rules.outMode==="straight"?"Straight out":config.rules.outMode==="double"?"Double Out":"Master Out"} · GOTCHA actif · {config.rules.bustRule==="zero"?"bust → 0":"bust → début de volée"}</div></div><div style={{width:82,height:82,borderRadius:999,border:`3px solid ${RED}`,boxShadow:`0 0 20px ${RED}55`,display:"grid",placeItems:"center",background:"radial-gradient(circle,#541616,#16090b)",color:"#fff",fontWeight:1100,fontSize:17}}>🎯<br/><span style={{fontSize:11}}>{config.rules.targetScore}</span></div></div><div style={{height:8,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.08)",marginTop:8}}><div style={{height:"100%",width:`${Math.min(100,(Number(state.scores[activePlayer?.id]||0)/config.rules.targetScore)*100)}%`,background:`linear-gradient(90deg,${BLUE},${ACCENT},${RED})`}}/></div></div>
        {!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER LA VOLÉE" accent={ACCENT}/>:<div style={{...panelStyle(ACCENT+"33"),textAlign:"center",color:SOFT,fontSize:11,padding:14}}><b style={{color:ACCENT}}>{activePlayer?.name}</b> vise sa cible…</div>}
      </>:<ModeEndPanel title="GOTCHA" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onConfig={()=>go?.("gotcha_config")} onGames={()=>go?.("games",{gamesView:"all"})} extra={<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:6}}>{profiles.map((p:any)=>{const st=state.statsByPlayer[p.id]||{};return <div key={p.id} style={{padding:8,borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",fontSize:9.5,color:SOFT}}><b style={{color:"#fff"}}>{playerName(p)}</b><br/>{st.gotchas||0} GOTCHA · {st.busts||0} busts · best {st.bestVisit||0}</div>})}</div>}/>} 
    </div>
  </div>;
}
