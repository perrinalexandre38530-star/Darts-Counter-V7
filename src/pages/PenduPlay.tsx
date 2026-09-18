// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerPendu from "../assets/tickers/ticker_pendu.png";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  clonePenduState, createPenduState, normalizePenduConfig, penduChallengeLabel, pickPenduBotDarts,
  playPenduVisit, randomPenduChallenge, setPenduChallenge, type PenduChallenge, type PenduState,
} from "../lib/gameEngines/penduEngine";
import {
  NewModeInput, PlayerCard, ModeEndPanel, actionStyle, isBotProfile, lastEvents,
  panelStyle, playerName, resolveModeProfiles, SOFT, uiToGameDart,
} from "./newModes/newModePlayShared";

const ACCENT="#ffb33f", RED="#ff6b57", GOLD="#ffd66a", GREEN="#72efb1";
function Rules({config}:any){return <div style={{display:"grid",gap:10,fontSize:12.5,lineHeight:1.5}}><div><b style={{color:ACCENT}}>DÉFI</b><br/>Le bourreau tente d'abord le défi affiché. S'il le réussit, tous les autres joueurs encore en jeu doivent le reproduire.</div><div><b style={{color:RED}}>ERREUR</b><br/>Chaque échec ajoute une partie au pendu. À {config.rules.partsToLose} erreurs, le joueur est éliminé.</div><div><b style={{color:GOLD}}>VALIDATION</b><br/>{config.rules.executionMode==="flex"?"Mode souple : une zone supérieure ou un score supérieur peut valider le défi.":"Mode strict : il faut réaliser exactement le défi demandé."}</div><div><b style={{color:GREEN}}>VICTOIRE</b><br/>Le dernier joueur vivant gagne la manche. Il faut {config.seriesWins} victoire{config.seriesWins>1?"s":""} pour gagner le match.</div></div>}

export default function PenduPlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:false});
  const go=props?.go??props?.setTab, store=props?.store, onFinish=props?.onFinish;
  const resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizePenduConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);
  const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const [state,setState]=React.useState<PenduState>(()=>restored?.mode==="pendu"?clonePenduState(restored):createPenduState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>([]), [multiplier,setMultiplier]=React.useState<1|2|3>(1), [undo,setUndo]=React.useState<PenduState[]>([]), [notice,setNotice]=React.useState("");
  const botBusy=React.useRef(false), finishedRef=React.useRef(false), matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`pendu-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const activePlayer=state.players[state.activePlayerIndex], activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null, activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);

  const buildRecord=React.useCallback((s:PenduState,status:"in_progress"|"finished")=>{const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));return{id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"pendu",mode:"pendu",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,game:{mode:"pendu",partsToLose:s.config.rules.partsToLose,seriesWins:s.config.seriesWins},summary:{mode:"pendu",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,config:s.config,perPlayer:Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,errors:Number(s.errors[id]||0),eliminated:!!s.eliminated[id],wins:Number(s.legWins[id]||0)}]))},resume:{mode:"pendu",config:s.config,state:clonePenduState(s),updatedAt:Date.now()},payload:{kind:"pendu",mode:"pendu",sport:"darts",config:s.config,stateSnapshot:clonePenduState(s),visits:s.visits,visitHistory:s.visits,stats:{mode:"pendu",players:s.statsByPlayer,legWins:s.legWins}}};},[profiles]);
  const persist=React.useCallback((s:PenduState)=>{if(s.phase==="finished"){if(finishedRef.current)return;finishedRef.current=true;const rec=buildRecord(s,"finished");if(typeof onFinish==="function")onFinish(rec,{navigate:false});else void History.upsert(rec);}else void History.upsert(buildRecord(s,"in_progress")).catch(()=>{});},[buildRecord,onFinish]);
  const commit=(next:PenduState,previous=state)=>{setUndo(u=>[...u.slice(-39),clonePenduState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);const ev=lastEvents(next.visits);setNotice(ev.length?ev.join(" · "):"");persist(next);};
  const validate=()=>{if(!currentThrow.length||state.phase==="finished"||activeIsBot)return;commit(playPenduVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(clonePenduState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière action annulée");finishedRef.current=false;persist(prev);return u.slice(0,-1);});
  const applyChallenge=(c:PenduChallenge)=>{const next=setPenduChallenge(state,c);setState(next);persist(next);};
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{commit(playPenduVisit(state,pickPenduBotDarts(state,config.botLevel)));}finally{botBusy.current=false;}},680);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);
  function replay(){matchIdRef.current=`pendu-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setCurrentThrow([]);setState(createPenduState(players,config));}
  const challenge=state.challenge, editable=state.phase==="caller"&&!activeIsBot&&!currentThrow.length&&config.rules.challengeMode!=="random", legTarget=config.seriesWins*2-1;
  const challengeHelp=challenge.kind==="score"?(config.rules.executionMode==="flex"?"Atteins ce score ou plus":"Réalise exactement ce score"):(config.rules.executionMode==="flex"?"Même numéro, zone égale ou supérieure":"Touche exactement cette zone");
  return <div style={{minHeight:"calc(var(--vh, 1vh) * 100)",paddingBottom:18,background:"radial-gradient(circle at 50% 0%,rgba(255,179,63,.10),transparent 34%)"}}>
    <PageHeader tickerSrc={tickerPendu} tickerAlt="PENDU" left={<BackDot onClick={()=>go?.("pendu_config")} color={ACCENT} glow={`${ACCENT}88`}/>} right={<InfoDot title="Règles PENDU" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config}/>}/>} />
    <div style={{padding:"7px 8px 18px",maxWidth:980,margin:"0 auto",display:"grid",gap:8}}>
      <div style={{...panelStyle(ACCENT+"50"),padding:9,display:"grid",gridTemplateColumns:"1fr auto",gap:9,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100,letterSpacing:1}}>MANCHE {state.legIndex+1} · BO{legTarget}</div><div style={{marginTop:3,color:"#fff",fontSize:14,fontWeight:1000}}>{state.phase==="finished"?"Match terminé":state.phase==="caller"?`${activePlayer?.name||"—"} est le bourreau`:`${activePlayer?.name||"—"} reproduit le défi`}</div></div><button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT,!undo.length)}>↶ UNDO</button></div>
      {notice?<div style={{borderRadius:12,padding:"7px 10px",background:notice.includes("PENDU")?"rgba(255,80,90,.14)":"rgba(255,179,63,.10)",border:"1px solid rgba(255,179,63,.24)",color:notice.includes("PENDU")?"#ff9d9d":"#ffd891",fontSize:10.5,fontWeight:900}}>{notice}</div>:null}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:7}}>{state.players.map((p:any,i:number)=>{const prof=profileById.get(String(p.id))||p,err=Number(state.errors[p.id]||0),dead=!!state.eliminated[p.id];return <PlayerCard key={p.id} profile={prof} active={state.phase!=="finished"&&state.activePlayerIndex===i} accent={ACCENT} value={`${err}/${config.rules.partsToLose}`} subValue={dead?"PENDU — éliminé":`${"●".repeat(err)}${"○".repeat(Math.max(0,config.rules.partsToLose-err))}`} badge={dead?"☠ PENDU":state.callerPlayerIndex===i?"BOURREAU":null} wins={state.legWins[p.id]||0} muted={dead}/>})}</div>
      {state.phase!=="finished"?<>
        <div style={{...panelStyle("rgba(255,255,255,.10)"),padding:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100}}>{state.phase==="caller"?"DÉFI DU BOURREAU":"DÉFI À REPRODUIRE"}</div><div style={{marginTop:3,color:"#fff",fontSize:29,fontWeight:1100}}>{penduChallengeLabel(challenge,config.rules.executionMode)}</div><div style={{marginTop:4,color:SOFT,fontSize:9.5}}>{challengeHelp}</div></div><div style={{fontSize:40,filter:"drop-shadow(0 0 12px rgba(255,179,63,.25))"}}>🪢</div></div>
          {editable?<div style={{marginTop:10,paddingTop:9,borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",gap:6,flexWrap:"wrap"}}>{config.rules.targetFamily==="mixed"?<button type="button" style={actionStyle(ACCENT)} onClick={()=>applyChallenge(challenge.kind==="score"?{kind:"segment",number:20,bed:"S"}:{kind:"score",target:50})}>{challenge.kind==="score"?"SEGMENT":"SCORE"}</button>:null}{challenge.kind==="segment"?<><button type="button" style={actionStyle(ACCENT)} onClick={()=>applyChallenge({...challenge,number:((challenge.number+18)%20)+1})}>−</button>{(["S","D","T"] as const).map(b=><button key={b} type="button" style={{...actionStyle(ACCENT),background:challenge.bed===b?`${ACCENT}36`:`${ACCENT}18`}} onClick={()=>applyChallenge({...challenge,bed:b})}>{b==="S"?"SIMPLE":b==="D"?"DOUBLE":"TRIPLE"}</button>)}<button type="button" style={actionStyle(ACCENT)} onClick={()=>applyChallenge({...challenge,number:(challenge.number%20)+1})}>+</button></>:<><button type="button" style={actionStyle(ACCENT)} onClick={()=>applyChallenge({...challenge,target:Math.max(10,challenge.target-10)})}>−10</button><button type="button" style={actionStyle(ACCENT)} onClick={()=>applyChallenge({...challenge,target:Math.min(170,challenge.target+10)})}>+10</button></>}<button type="button" style={{...actionStyle(GOLD),marginLeft:"auto"}} onClick={()=>applyChallenge(randomPenduChallenge(config))}>🎲 ALÉATOIRE</button></div>:null}
        </div>
        {!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel={state.phase==="caller"?"TENTER LE DÉFI":"REPRODUIRE"} accent={ACCENT}/>:<div style={{...panelStyle(ACCENT+"33"),textAlign:"center",color:SOFT,fontSize:11,padding:14}}><b style={{color:ACCENT}}>{activePlayer?.name}</b> prépare son défi…</div>}
      </>:<ModeEndPanel title="PENDU" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onStats={()=>go?.("darts_mode_summary",{rec:buildRecord(state,"finished"),mode:"pendu",from:"game_end"})} onHistory={()=>go?.("statsHub",{tab:"history",mode:"pendu",focusMatchId:matchIdRef.current})} onConfig={()=>go?.("pendu_config")} onGames={()=>go?.("games",{gamesView:"all"})} extra={<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:6}}>{profiles.map((p:any)=>{const st=state.statsByPlayer[p.id]||{};return <div key={p.id} style={{padding:8,borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",fontSize:9.5,color:SOFT}}><b style={{color:"#fff"}}>{playerName(p)}</b><br/>{st.challengesPassed||0} réussis · {st.errorsTaken||0} erreurs</div>})}</div>}/>} 
    </div>
  </div>;
}
