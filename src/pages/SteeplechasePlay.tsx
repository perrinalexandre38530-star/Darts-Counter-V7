// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerSteeple from "../assets/tickers/ticker_steeplechase.webp";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  cloneSteeplechaseState,
  createSteeplechaseState,
  currentSteepleTarget,
  normalizeSteeplechaseConfig,
  pickSteeplechaseBotDarts,
  playSteeplechaseVisit,
  steepleDartHitsTarget,
  steepleSequence,
  type SteeplechaseState,
} from "../lib/gameEngines/steeplechaseEngine";
import {
  DartStrip,
  LiveStatGrid,
  Meter,
  ModeEndPanel,
  NewModeInput,
  PlayerCard,
  VisitTimeline,
  actionStyle,
  isBotProfile,
  lastEvents,
  panelStyle,
  playerName,
  resolveModeProfiles,
  SOFT,
  uiToGameDart,
} from "./newModes/newModePlayShared";

const ACCENT="#7dffbd", FENCE="#ffb13b", FINISH="#ff6464", BLUE="#65caff";
function Rules({config}:any){return <div style={{display:"grid",gap:10,fontSize:12.5,lineHeight:1.5}}><div><b style={{color:ACCENT}}>COURSE</b><br/>Pars du 20 et suis l'ordre physique des secteurs jusqu'au 5, puis termine au Bull.</div><div><b style={{color:FENCE}}>HAIES</b><br/>{config.rules.fencesEnabled?"T13, T17, T8 et T5 remplacent la zone normale.":"Haies désactivées."}</div><div><b style={{color:ACCENT}}>SIMPLES</b><br/>{config.rules.innerSingleOnly?"Le petit simple intérieur est requis. La cible interactive distingue réellement la zone.":"Tout simple valide le secteur."}</div><div><b style={{color:FINISH}}>ARRIVÉE</b><br/>{config.rules.finishBull==='double'?"DBULL obligatoire.":"Bull ou DBULL."}</div></div>}

export default function SteeplechasePlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:false});
  const go=props?.go??props?.setTab,store=props?.store,onFinish=props?.onFinish,resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeSteeplechaseConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const [state,setState]=React.useState<SteeplechaseState>(()=>restored?.mode==="steeplechase"?cloneSteeplechaseState(restored):createSteeplechaseState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>([]),[multiplier,setMultiplier]=React.useState<1|2|3>(1),[undo,setUndo]=React.useState<SteeplechaseState[]>([]),[notice,setNotice]=React.useState("");
  const botBusy=React.useRef(false),finishedRef=React.useRef(false),matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`steeple-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const activePlayer=state.players[state.activePlayerIndex],activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null,activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);

  const buildRecord=React.useCallback((s:SteeplechaseState,status:"in_progress"|"finished")=>{const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));return{id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"steeplechase",mode:"steeplechase",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,game:{mode:"steeplechase",seriesWins:s.config.seriesWins},summary:{mode:"steeplechase",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,config:s.config,perPlayer:Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,step:Number(s.stepByPlayer[id]||0),wins:Number(s.legWins[id]||0)}]))},resume:{mode:"steeplechase",config:s.config,state:cloneSteeplechaseState(s),updatedAt:Date.now()},payload:{kind:"steeplechase",mode:"steeplechase",sport:"darts",config:s.config,stateSnapshot:cloneSteeplechaseState(s),visits:s.visits,visitHistory:s.visits,stats:{mode:"steeplechase",players:s.statsByPlayer,legWins:s.legWins}}};},[profiles]);
  const persist=React.useCallback((s:SteeplechaseState)=>{if(s.phase==="finished"){if(finishedRef.current)return;finishedRef.current=true;const rec=buildRecord(s,"finished");if(typeof onFinish==="function")onFinish(rec,{navigate:false});else void History.upsert(rec);}else void History.upsert(buildRecord(s,"in_progress")).catch(()=>{});},[buildRecord,onFinish]);
  const commit=(next:SteeplechaseState,previous=state)=>{setUndo(u=>[...u.slice(-39),cloneSteeplechaseState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);const ev=lastEvents(next.visits);let msg=ev.length?ev.join(" · "):"";if(next.phase==="finished"&&next.winnerId)msg=`🏆 ${next.players.find((p:any)=>p.id===next.winnerId)?.name||"Victoire"} remporte STEEPLECHASE`;else if(next.legIndex>previous.legIndex&&next.lastLegWinnerId)msg=`🏁 ${next.players.find((p:any)=>p.id===next.lastLegWinnerId)?.name||"Un joueur"} gagne la course`;setNotice(msg);persist(next);};
  const validate=()=>{if(currentThrow.length<3||state.phase==="finished"||activeIsBot)return;commit(playSteeplechaseVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneSteeplechaseState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière volée annulée");finishedRef.current=false;persist(prev);return u.slice(0,-1);});
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{commit(playSteeplechaseVisit(state,pickSteeplechaseBotDarts(state,config.botLevel)));}finally{botBusy.current=false;}},650);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);
  function replay(){matchIdRef.current=`steeple-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setCurrentThrow([]);setState(createSteeplechaseState(players,config));}

  const legTarget=config.seriesWins*2-1,seq=steepleSequence(config.rules.direction),activeTarget=activePlayer?currentSteepleTarget(state,activePlayer.id):{label:"—"},activeStats=state.statsByPlayer[activePlayer?.id]||{};
  const previewDarts=currentThrow.map(uiToGameDart);
  let previewStep=Number(state.stepByPlayer[activePlayer?.id]||0),previewHits=0;const previewLabels:string[]=[];
  for(const d of previewDarts){const fake={...state,stepByPlayer:{...state.stepByPlayer,[activePlayer?.id]:previewStep}} as any;const target=currentSteepleTarget(fake,activePlayer?.id);const ok=steepleDartHitsTarget(d,target,config);previewLabels.push(`${target.label} ${ok?"✓":"✕"}`);if(ok){previewStep++;previewHits++;}}
  const previewFake={...state,stepByPlayer:{...state.stepByPlayer,[activePlayer?.id]:previewStep}} as any,previewTarget=currentSteepleTarget(previewFake,activePlayer?.id);
  const ringDecorator=(d:UIDart)=>{if((d as any)?.label)return d;if(config.rules.innerSingleOnly&&Number(d?.v)>=1&&Number(d?.v)<=20&&Number(d?.mult)===1)return{...d,label:"inner_single"};return d;};
  const targetColor=activeTarget.kind==='bull'?FINISH:activeTarget.fence?FENCE:ACCENT;

  return <div style={{minHeight:"calc(var(--vh, 1vh) * 100)",paddingBottom:18,background:"radial-gradient(circle at 50% 0%,rgba(125,255,189,.10),transparent 35%)"}}>
    <PageHeader tickerSrc={tickerSteeple} tickerAlt="STEEPLECHASE" left={<BackDot onClick={()=>go?.("steeplechase_config")} color={ACCENT} glow={`${ACCENT}88`}/>} right={<InfoDot title="Règles STEEPLECHASE" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config}/>}/>} />
    <div style={{padding:"7px 8px 18px",maxWidth:980,margin:"0 auto",display:"grid",gap:8}}>
      <div style={{...panelStyle(ACCENT+"50"),padding:9,display:"grid",gridTemplateColumns:"1fr auto",gap:9,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100,letterSpacing:1}}>MANCHE {state.legIndex+1} · BO{legTarget}</div><div style={{marginTop:3,color:"#fff",fontSize:14,fontWeight:1000}}>{state.phase==="finished"?"Match terminé":`${activePlayer?.name||"—"} court vers ${activeTarget.label}`}</div></div><button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT,!undo.length)}>↶ UNDO</button></div>
      {notice?<div style={{borderRadius:12,padding:"7px 10px",background:notice.includes("🏆")?"rgba(114,239,177,.12)":"rgba(125,255,189,.10)",border:`1px solid ${notice.includes("🏆")?"rgba(114,239,177,.32)":"rgba(125,255,189,.24)"}`,color:notice.includes("🏆")?"#baffd8":"#c6ffe0",fontSize:10.5,fontWeight:900}}>{notice}</div>:null}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:7}}>{state.players.map((p:any,i:number)=>{const prof=profileById.get(String(p.id))||p,step=Number(state.stepByPlayer[p.id]||0),t=currentSteepleTarget(state,p.id);return <div key={p.id} style={{display:"grid",gap:5}}><PlayerCard profile={prof} active={state.phase!=="finished"&&state.activePlayerIndex===i} accent={ACCENT} value={t.label} subValue={`Étape ${step}/${seq.length+1} · ${state.statsByPlayer[p.id]?.fencesCleared||0} haies`} badge={`${Math.round((step/(seq.length+1))*100)}%`} wins={state.legWins[p.id]||0}/><Meter value={step} max={seq.length+1} accent={ACCENT} height={5}/></div>})}</div>

      {state.phase!=="finished"?<>
        <div style={{...panelStyle("rgba(255,255,255,.10)"),padding:10}}>
          <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:12,alignItems:"center"}}><div><div style={{color:targetColor,fontSize:10,fontWeight:1100}}>{activeTarget.kind==='bull'?"LIGNE D'ARRIVÉE":activeTarget.fence?"HAIE À FRANCHIR":"SECTEUR DE COURSE"}</div><div style={{marginTop:3,color:"#fff",fontSize:30,fontWeight:1100,lineHeight:1}}>{activeTarget.label}</div><div style={{marginTop:5,color:SOFT,fontSize:9.5}}>{currentThrow.length?`${previewHits} étape${previewHits>1?"s":""} gagnée${previewHits>1?"s":""} · prochaine cible ${previewTarget.label}`:`Course ${config.rules.direction==='clockwise'?"horaire":"anti-horaire"} · ${config.rules.fencesEnabled?"4 haies actives":"sans haies"}.`}</div></div><div style={{width:92,height:92,borderRadius:999,border:`3px solid ${targetColor}`,display:"grid",placeItems:"center",background:"radial-gradient(circle,rgba(255,255,255,.08),rgba(0,0,0,.6))",boxShadow:`0 0 22px ${targetColor}22`,fontSize:36}}>{activeTarget.kind==='bull'?"🎯":activeTarget.fence?"🚧":"🏁"}</div></div>
          <div style={{marginTop:9,display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:3}}>{seq.map((n:number,idx:number)=>{const isFence=config.rules.fencesEnabled&&config.rules.fences.includes(n),step=Number(state.stepByPlayer[activePlayer?.id]||0),passed=idx<step,isCurrent=idx===step&&activeTarget.kind==='number';return <div key={`${n}-${idx}`} style={{height:25,borderRadius:7,display:"grid",placeItems:"center",fontSize:8.5,fontWeight:1000,color:isCurrent?"#071018":passed?"#071018":"#d8deea",background:isCurrent?(isFence?FENCE:ACCENT):passed?`${ACCENT}aa`:isFence?`${FENCE}18`:"rgba(255,255,255,.05)",border:`1px solid ${isFence?FENCE+'55':passed?ACCENT+'55':'rgba(255,255,255,.07)'}`}}>{isFence?`T${n}`:n}</div>})}</div>
          <div style={{marginTop:9}}><DartStrip darts={currentThrow} accent={previewHits?ACCENT:targetColor} targetLabels={previewLabels}/></div>
          <div style={{marginTop:10}}><LiveStatGrid accent={ACCENT} items={[{label:"étapes",value:activeStats.steps||0},{label:"haies",value:activeStats.fencesCleared||0,color:FENCE},{label:"best volée",value:activeStats.bestVisitSteps||0,color:BLUE},{label:"série",value:activeStats.bestStreak||0,color:ACCENT}]}/></div>
          {config.rules.innerSingleOnly&&config.scoreInputMethod==="keypad"?<div style={{marginTop:8,color:"#7f8998",fontSize:8.5}}>KEYPAD : les simples saisis sont interprétés comme <b style={{color:ACCENT}}>petit simple intérieur</b>. Utilise la cible interactive pour distinguer physiquement petit/grand simple.</div>:null}
        </div>
        {!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} minDartsToValidate={3} dartDecorator={ringDecorator} validateLabel="VALIDER LA VOLÉE" accent={targetColor}/>:<div style={{...panelStyle(ACCENT+"33"),textAlign:"center",color:SOFT,fontSize:11,padding:14}}><b style={{color:ACCENT}}>{activePlayer?.name}</b> s'élance sur la piste…</div>}
        <VisitTimeline visits={state.visits} profiles={profiles} accent={ACCENT} title="HISTORIQUE STEEPLECHASE" limit={4}/>
      </>:<ModeEndPanel title="STEEPLECHASE" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onStats={()=>go?.("darts_mode_summary",{rec:buildRecord(state,"finished"),mode:"steeplechase",from:"game_end"})} onHistory={()=>go?.("statsHub",{tab:"history",mode:"steeplechase",focusMatchId:matchIdRef.current})} onConfig={()=>go?.("steeplechase_config")} onGames={()=>go?.("games",{gamesView:"all"})} extra={<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:6}}>{profiles.map((p:any)=>{const st=state.statsByPlayer[p.id]||{};const rate=st.darts?Math.round((Number(st.hits||0)/st.darts)*100):0;return <div key={p.id} style={{padding:8,borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",fontSize:9.5,color:SOFT}}><b style={{color:"#fff"}}>{playerName(p)}</b><br/>{st.steps||0} étapes · {st.fencesCleared||0} haies · {rate}% réussite</div>})}</div>}/>} 
    </div>
  </div>;
}
