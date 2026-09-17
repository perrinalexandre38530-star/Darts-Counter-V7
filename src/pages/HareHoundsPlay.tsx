// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerHareHounds from "../assets/tickers/ticker_hare_hounds.png";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  cloneHareState, createHareState, hareCurrentSegment, hareSequence, normalizeHareConfig,
  pickHareBotDarts, playHareVisit, type HareState,
} from "../lib/gameEngines/hareHoundsEngine";
import {
  NewModeInput, PlayerCard, ModeEndPanel, actionStyle, isBotProfile, lastEvents,
  panelStyle, playerName, resolveModeProfiles, SOFT, uiToGameDart,
} from "./newModes/newModePlayShared";

const ACCENT="#f6b63b"; const HARE="#ffb43f"; const HOUND="#55b9ff"; const GREEN="#69e3a4";
function Rules({config}:any){return <div style={{display:"grid",gap:10,fontSize:12.5,lineHeight:1.5}}><div><b style={{color:HARE}}>LIÈVRE</b><br/>Il part du 20 et doit faire un tour complet de la cible avant d’être rattrapé.</div><div><b style={{color:HOUND}}>LIMIERS</b><br/>Ils partent du {config.rules.houndStart}. Chaque touche valide fait avancer d’un secteur dans l’ordre physique du dartboard.</div><div><b style={{color:GREEN}}>ZONE VALIDE</b><br/>{config.rules.targetZone==="double"?"Doubles uniquement.":config.rules.targetZone==="triple"?"Triples uniquement.":"Simple, Double ou Triple du secteur demandé."}</div><div><b style={{color:ACCENT}}>VICTOIRE</b><br/>Le Lièvre gagne s’il boucle 20 étapes. Un Limier gagne dès qu’il rejoint la position du Lièvre.</div></div>}

export default function HareHoundsPlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:false});
  const go=props?.go??props?.setTab; const store=props?.store; const onFinish=props?.onFinish;
  const resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeHareConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);
  const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const [state,setState]=React.useState<HareState>(()=>restored?.mode==="hare_hounds"?cloneHareState(restored):createHareState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>([]); const [multiplier,setMultiplier]=React.useState<1|2|3>(1); const [undo,setUndo]=React.useState<HareState[]>([]); const [notice,setNotice]=React.useState("");
  const botBusy=React.useRef(false); const finishedRef=React.useRef(false); const matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`hare-hounds-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const activePlayer=state.players[state.activePlayerIndex]; const activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null; const activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);
  const hareProfile=profileById.get(String(state.harePlayerId))||state.players.find(p=>p.id===state.harePlayerId);

  const buildRecord=React.useCallback((s:HareState,status:"in_progress"|"finished")=>{const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));return{id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"hare_hounds",mode:"hare_hounds",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,game:{mode:"hare_hounds",houndStart:s.config.rules.houndStart,seriesWins:s.config.seriesWins},summary:{mode:"hare_hounds",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,harePlayerId:s.harePlayerId,config:s.config,perPlayer:Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,currentSegment:hareCurrentSegment(s,id),wins:Number(s.legWins[id]||0)}]))},resume:{mode:"hare_hounds",config:s.config,state:cloneHareState(s),updatedAt:Date.now()},payload:{kind:"hare_hounds",mode:"hare_hounds",sport:"darts",config:s.config,stateSnapshot:cloneHareState(s),visits:s.visits,visitHistory:s.visits,stats:{mode:"hare_hounds",players:s.statsByPlayer,legWins:s.legWins}}};},[profiles]);
  const persist=React.useCallback((s:HareState)=>{if(s.phase==="finished"){if(finishedRef.current)return;finishedRef.current=true;const rec=buildRecord(s,"finished");if(typeof onFinish==="function")onFinish(rec,{navigate:false});else void History.upsert(rec);}else void History.upsert(buildRecord(s,"in_progress")).catch(()=>{});},[buildRecord,onFinish]);
  const commit=(next:HareState,previous=state)=>{setUndo(u=>[...u.slice(-39),cloneHareState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);const ev=lastEvents(next.visits);setNotice(ev.length?ev.join(" · "):"");persist(next);};
  const validate=()=>{if(!currentThrow.length||state.phase==="finished"||activeIsBot)return;commit(playHareVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneHareState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière volée annulée");finishedRef.current=false;persist(prev);return u.slice(0,-1);});
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{commit(playHareVisit(state,pickHareBotDarts(state,config.botLevel)));}finally{botBusy.current=false;}},650);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);
  function replay(){matchIdRef.current=`hare-hounds-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setCurrentThrow([]);setState(createHareState(players,config));}
  const seq=hareSequence(config.rules.direction); const activeSeg=activePlayer?hareCurrentSegment(state,activePlayer.id):20; const hareSeg=state.harePlayerId?hareCurrentSegment(state,state.harePlayerId):20; const legTarget=config.seriesWins*2-1;
  const zoneLabel=config.rules.targetZone==="double"?"DOUBLE":config.rules.targetZone==="triple"?"TRIPLE":"S / D / T";
  return <div style={{minHeight:"calc(var(--vh, 1vh) * 100)",paddingBottom:18,background:"radial-gradient(circle at 50% 0%,rgba(246,182,59,.10),transparent 35%)"}}>
    <PageHeader tickerSrc={tickerHareHounds} tickerAlt="HARE & HOUNDS" left={<BackDot onClick={()=>go?.("hare_hounds_config")} color={ACCENT} glow={`${ACCENT}88`}/>} right={<InfoDot title="Règles HARE & HOUNDS" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config}/>}/>} />
    <div style={{padding:"7px 8px 18px",maxWidth:980,margin:"0 auto",display:"grid",gap:8}}>
      <div style={{...panelStyle(ACCENT+"50"),padding:9,display:"grid",gridTemplateColumns:"1fr auto",gap:9,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100,letterSpacing:1}}>MANCHE {state.legIndex+1} · BO{legTarget}</div><div style={{marginTop:3,color:"#fff",fontSize:14,fontWeight:1000}}>{state.phase==="finished"?"Match terminé":`${activePlayer?.name||"—"} · ${activePlayer?.id===state.harePlayerId?"LIÈVRE":"LIMIER"}`}</div></div><button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT,!undo.length)}>↶ UNDO</button></div>
      {notice?<div style={{borderRadius:12,padding:"7px 10px",background:"rgba(246,182,59,.10)",border:"1px solid rgba(246,182,59,.24)",color:"#ffe0a2",fontSize:10.5,fontWeight:900}}>{notice}</div>:null}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:7}}>{state.players.map((p:any,i:number)=>{const prof=profileById.get(String(p.id))||p;const isHare=p.id===state.harePlayerId;const progress=Number(state.progressByPlayer[p.id]||0);return <PlayerCard key={p.id} profile={prof} active={state.phase!=="finished"&&state.activePlayerIndex===i} accent={isHare?HARE:HOUND} value={hareCurrentSegment(state,p.id)} subValue={`${isHare?"🐇 LIÈVRE":"🐕 LIMIER"} · ${progress} étape${progress>1?"s":""}`} badge={isHare?"LIÈVRE":"LIMIER"} wins={state.legWins[p.id]||0}/>})}</div>
      {state.phase!=="finished"?<>
        <div style={{...panelStyle("rgba(255,255,255,.10)"),padding:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center"}}><div><div style={{color:activePlayer?.id===state.harePlayerId?HARE:HOUND,fontSize:10,fontWeight:1100}}>CIBLE À TOUCHER · {zoneLabel}</div><div style={{marginTop:3,color:"#fff",fontSize:32,fontWeight:1100,lineHeight:1}}>{activeSeg}</div><div style={{marginTop:5,color:SOFT,fontSize:9.5}}>{config.rules.direction==="clockwise"?"Sens horaire":"Sens anti-horaire"} · Lièvre actuellement sur {hareSeg}.</div></div><div style={{width:88,height:88,borderRadius:999,border:`3px solid ${activePlayer?.id===state.harePlayerId?HARE:HOUND}`,display:"grid",placeItems:"center",background:"radial-gradient(circle,rgba(255,255,255,.08),rgba(0,0,0,.6))",fontSize:38}}>{activePlayer?.id===state.harePlayerId?"🐇":"🐕"}</div></div>
          <div style={{marginTop:9,display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:3}}>{seq.map((n:number,idx:number)=>{const hareHere=n===hareSeg;const activeHere=n===activeSeg;return <div key={`${n}-${idx}`} style={{height:24,borderRadius:7,display:"grid",placeItems:"center",fontSize:8.5,fontWeight:1000,color:activeHere?"#071018":"#d8deea",background:activeHere?(activePlayer?.id===state.harePlayerId?HARE:HOUND):hareHere?`${HARE}33`:"rgba(255,255,255,.05)",border:`1px solid ${hareHere?HARE+"66":"rgba(255,255,255,.07)"}`}}>{n}</div>})}</div>
        </div>
        {!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER LA VOLÉE" accent={activePlayer?.id===state.harePlayerId?HARE:HOUND}/>:<div style={{...panelStyle(ACCENT+"33"),textAlign:"center",color:SOFT,fontSize:11,padding:14}}><b style={{color:activePlayer?.id===state.harePlayerId?HARE:HOUND}}>{activePlayer?.name}</b> poursuit sa route…</div>}
      </>:<ModeEndPanel title="HARE & HOUNDS" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onConfig={()=>go?.("hare_hounds_config")} onGames={()=>go?.("games",{gamesView:"all"})} extra={<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:6}}>{profiles.map((p:any)=>{const st=state.statsByPlayer[p.id]||{};return <div key={p.id} style={{padding:8,borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",fontSize:9.5,color:SOFT}}><b style={{color:"#fff"}}>{playerName(p)}</b><br/>{st.steps||0} étapes · {st.catches||0} capture · {st.escapes||0} fuite</div>})}</div>}/>} 
    </div>
  </div>;
}
