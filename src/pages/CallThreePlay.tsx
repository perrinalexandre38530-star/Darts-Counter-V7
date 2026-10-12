// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerCallThree from "../assets/tickers/ticker_call_three.webp";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  callThreeDartMatches,
  callThreeHitPoints,
  callThreeLabel,
  cloneCallThreeState,
  createCallThreeState,
  normalizeCallThreeConfig,
  pickCallThreeBotDarts,
  playCallThreeVisit,
  randomCallThreeCalls,
  setCallThreeCalls,
  type CallTarget,
  type CallThreeState,
} from "../lib/gameEngines/callThreeEngine";
import {
  DartStrip,
  LiveStatGrid,
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

const ACCENT="#ffb13b", ACCENT2="#ff6d3a", GREEN="#72efb1", RED="#ff6d6d", BLUE="#65caff";
function Rules({config}:any){return <div style={{display:"grid",gap:10,fontSize:12.5,lineHeight:1.5}}><div><b style={{color:ACCENT}}>APPEL</b><br/>Le caller choisit 3 cibles avant chaque volée.</div><div><b style={{color:ACCENT2}}>ORDRE</b><br/>{config.rules.orderedTargets?"Fléchette 1 → cible 1, fléchette 2 → cible 2, fléchette 3 → cible 3.":"Les 3 cibles peuvent être validées dans n’importe quel ordre."}</div><div><b style={{color:GREEN}}>POINTS</b><br/>Simple = 1 · Double = 2 · Triple = 3 · Bull = 2 · DBULL = 3.</div><div><b style={{color:BLUE}}>FIN</b><br/>Après {config.rules.rounds} rounds, le meilleur score remporte la manche. Égalité = round supplémentaire.</div></div>}

function CallPicker({calls,setCalls,selected,setSelected,bullAllowed,onRandom,onConfirm,accent=ACCENT}:any){
  const setTarget=(target:CallTarget)=>setCalls((prev:any[])=>prev.map((c,i)=>i===selected?target:c));
  return <div style={{...panelStyle(accent+"44"),padding:10}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}><div><div style={{color:accent,fontSize:10,fontWeight:1100}}>COMPOSE LES 3 APPELS</div><div style={{marginTop:3,color:SOFT,fontSize:9.5}}>Choisis une case, puis sa cible. Les appels sont figés dès validation.</div></div><button type="button" onClick={onRandom} style={{...actionStyle(BLUE),minHeight:34}}>🎲 ALÉATOIRE</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:9}}>{calls.map((c:any,i:number)=><button key={i} type="button" onClick={()=>setSelected(i)} style={{minHeight:68,borderRadius:13,border:`1px solid ${selected===i?accent:"rgba(255,255,255,.10)"}`,background:selected===i?`${accent}22`:"rgba(255,255,255,.035)",color:"#fff",boxShadow:selected===i?`0 0 18px ${accent}22`:"none"}}><span style={{display:"block",fontSize:8,color:selected===i?accent:SOFT,fontWeight:1000}}>CIBLE {i+1}</span><b style={{display:"block",marginTop:4,fontSize:24}}>{callThreeLabel(c)}</b></button>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:4,marginTop:9}}>{Array.from({length:20},(_,i)=>i+1).map(n=><button key={n} type="button" onClick={()=>setTarget({kind:"number",number:n})} style={{minHeight:31,borderRadius:8,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.035)",color:"#e9edf7",fontWeight:1000,fontSize:10}}>{n}</button>)}</div>
    <div style={{display:"flex",gap:7,marginTop:8}}>{bullAllowed?<button type="button" onClick={()=>setTarget({kind:"bull"})} style={{...actionStyle(ACCENT2),flex:1}}>BULL</button>:null}<button type="button" onClick={onConfirm} style={{...actionStyle(GREEN),flex:2,background:`${GREEN}22`}}>✓ VALIDER L'APPEL</button></div>
  </div>;
}

export default function CallThreePlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:false});
  const go=props?.go??props?.setTab,store=props?.store,onFinish=props?.onFinish,resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeCallThreeConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const [state,setState]=React.useState<CallThreeState>(()=>restored?.mode==="call_three"?cloneCallThreeState(restored):createCallThreeState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>([]),[multiplier,setMultiplier]=React.useState<1|2|3>(1),[undo,setUndo]=React.useState<CallThreeState[]>([]),[notice,setNotice]=React.useState("");
  const [callDraft,setCallDraft]=React.useState<CallTarget[]>(()=>state.currentCalls.map((c:any)=>({...c}))),[callSlot,setCallSlot]=React.useState(0);
  const botBusy=React.useRef(false),callerBusy=React.useRef(false),finishedRef=React.useRef(false),matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`call-three-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const activePlayer=state.players[state.activePlayerIndex],activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null,activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);
  const callerPlayer=state.players.find((p:any)=>String(p.id)===String(state.currentCallerId)),callerProfile=callerPlayer?profileById.get(String(callerPlayer.id))||callerPlayer:null,callerIsBot=!!callerProfile&&isBotProfile(callerProfile,botIds);

  React.useEffect(()=>{setCallDraft((state.currentCalls||[]).map((c:any)=>({...c})));setCallSlot(0);},[state.currentCallerId,state.roundIndex,state.activePlayerIndex,state.phase]);

  const buildRecord=React.useCallback((s:CallThreeState,status:"in_progress"|"finished")=>{const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));return{id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"call_three",mode:"call_three",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,game:{mode:"call_three",rounds:s.config.rules.rounds,seriesWins:s.config.seriesWins},summary:{mode:"call_three",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,round:s.roundIndex+1,overtime:s.overtime,config:s.config,perPlayer:Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,score:Number(s.scores[id]||0),wins:Number(s.legWins[id]||0)}]))},resume:{mode:"call_three",config:s.config,state:cloneCallThreeState(s),updatedAt:Date.now()},payload:{kind:"call_three",mode:"call_three",sport:"darts",config:s.config,stateSnapshot:cloneCallThreeState(s),visits:s.visits,visitHistory:s.visits,stats:{mode:"call_three",players:s.statsByPlayer,legWins:s.legWins}}};},[profiles]);
  const persist=React.useCallback((s:CallThreeState)=>{if(s.phase==="finished"){if(finishedRef.current)return;finishedRef.current=true;const rec=buildRecord(s,"finished");if(typeof onFinish==="function")onFinish(rec,{navigate:false});else void History.upsert(rec);}else void History.upsert(buildRecord(s,"in_progress")).catch(()=>{});},[buildRecord,onFinish]);
  const commit=(next:CallThreeState,previous=state)=>{setUndo(u=>[...u.slice(-39),cloneCallThreeState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);const ev=lastEvents(next.visits);let msg=ev.length?ev.join(" · "):"";if(next.phase==="finished"&&next.winnerId)msg=`🏆 ${next.players.find((p:any)=>p.id===next.winnerId)?.name||"Victoire"} remporte CALL THREE`;else if(next.legIndex>previous.legIndex&&next.lastLegWinnerId)msg=`📣 ${next.players.find((p:any)=>p.id===next.lastLegWinnerId)?.name||"Un joueur"} remporte la manche`;setNotice(msg);persist(next);};
  const confirmCall=(calls=callDraft,auto=false)=>{if(state.phase!=="calling")return;const next=setCallThreeCalls(state,calls);setUndo(u=>[...u.slice(-39),cloneCallThreeState(state)]);setState(next);setCurrentThrow([]);setMultiplier(1);setNotice(`${auto?"🤖":"📣"} ${callerPlayer?.name||"Caller"} appelle ${calls.map(callThreeLabel).join(" · ")}`);persist(next);};
  const validate=()=>{if(currentThrow.length<3||state.phase!=="playing"||activeIsBot)return;commit(playCallThreeVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneCallThreeState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière action annulée");finishedRef.current=false;persist(prev);return u.slice(0,-1);});

  React.useEffect(()=>{if(state.phase!=="calling"||!callerIsBot||callerBusy.current)return;callerBusy.current=true;const t=window.setTimeout(()=>{try{const calls=randomCallThreeCalls(config.rules.bullAllowed,Date.now()+state.roundIndex*31+state.activePlayerIndex*7);confirmCall(calls,true);}finally{callerBusy.current=false;}},560);return()=>window.clearTimeout(t);},[state.phase,state.currentCallerId,callerIsBot,state.roundIndex,state.activePlayerIndex]);
  React.useEffect(()=>{if(state.phase!=="playing"||!activeIsBot||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{commit(playCallThreeVisit(state,pickCallThreeBotDarts(state,config.botLevel)));}finally{botBusy.current=false;}},650);return()=>window.clearTimeout(t);},[state.phase,state.activePlayerIndex,activeIsBot,state.currentCalls]);
  function replay(){matchIdRef.current=`call-three-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setCurrentThrow([]);setState(createCallThreeState(players,config));}

  const legTarget=config.seriesWins*2-1,activeStats=state.statsByPlayer[activePlayer?.id]||{};
  const previewDarts=currentThrow.map(uiToGameDart);
  const callPreview=state.currentCalls.map(()=>({ok:false,pts:0,dartIndex:-1}));
  if(config.rules.orderedTargets){
    state.currentCalls.forEach((c:any,i:number)=>{const d=previewDarts[i];const ok=!!d&&callThreeDartMatches(d,c);callPreview[i]={ok,pts:ok?callThreeHitPoints(d):0,dartIndex:ok?i:-1};});
  }else{
    const used=new Set<number>();
    state.currentCalls.forEach((c:any,ci:number)=>{const di=previewDarts.findIndex((d:any,i:number)=>!used.has(i)&&callThreeDartMatches(d,c));if(di>=0){used.add(di);callPreview[ci]={ok:true,pts:callThreeHitPoints(previewDarts[di]),dartIndex:di};}});
  }
  const previewPts=callPreview.reduce((sum:number,x:any)=>sum+x.pts,0),previewHits=callPreview.filter((x:any)=>x.ok).length;
  const targetLabels=config.rules.orderedTargets?state.currentCalls.map((c:any,i:number)=>`#${i+1} → ${callThreeLabel(c)}`):["ORDRE LIBRE","ORDRE LIBRE","ORDRE LIBRE"];
  const roundLabel=state.overtime?`OVERTIME ${Math.max(1,state.roundIndex-config.rules.rounds+2)}`:`ROUND ${state.roundIndex+1}/${config.rules.rounds}`;

  return <div style={{minHeight:"calc(var(--vh, 1vh) * 100)",paddingBottom:18,background:"radial-gradient(circle at 50% 0%,rgba(255,177,59,.12),transparent 35%)"}}>
    <PageHeader tickerSrc={tickerCallThree} tickerAlt="CALL THREE" left={<BackDot onClick={()=>go?.("call_three_config")} color={ACCENT} glow={`${ACCENT}88`}/>} right={<InfoDot title="Règles CALL THREE" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config}/>}/>} />
    <div style={{padding:"7px 8px 18px",maxWidth:980,margin:"0 auto",display:"grid",gap:8}}>
      <div style={{...panelStyle(ACCENT+"50"),padding:9,display:"grid",gridTemplateColumns:"1fr auto",gap:9,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100,letterSpacing:1}}>MANCHE {state.legIndex+1} · {roundLabel} · BO{legTarget}</div><div style={{marginTop:3,color:"#fff",fontSize:14,fontWeight:1000}}>{state.phase==="finished"?"Match terminé":state.phase==="calling"?`${callerPlayer?.name||"Caller"} prépare l'appel`:`${activePlayer?.name||"—"} répond à l'appel`}</div></div><button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT,!undo.length)}>↶ UNDO</button></div>
      {notice?<div style={{borderRadius:12,padding:"7px 10px",background:notice.includes("🏆")?"rgba(114,239,177,.12)":"rgba(255,177,59,.10)",border:`1px solid ${notice.includes("🏆")?"rgba(114,239,177,.32)":"rgba(255,177,59,.24)"}`,color:notice.includes("🏆")?"#baffd8":"#ffe2b1",fontSize:10.5,fontWeight:900}}>{notice}</div>:null}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:7}}>{state.players.map((p:any,i:number)=>{const prof=profileById.get(String(p.id))||p,score=Number(state.scores[p.id]||0),st=state.statsByPlayer[p.id]||{};return <PlayerCard key={p.id} profile={prof} active={state.phase==="playing"&&state.activePlayerIndex===i} accent={ACCENT} value={score} subValue={`${st.hits||0} hits · ${st.perfectRounds||0} full call`} badge={String(p.id)===String(state.currentCallerId)?"CALLER":"PTS"} wins={state.legWins[p.id]||0}/>})}</div>

      {state.phase==="calling"?(!callerIsBot?<CallPicker calls={callDraft} setCalls={setCallDraft} selected={callSlot} setSelected={setCallSlot} bullAllowed={config.rules.bullAllowed} onRandom={()=>setCallDraft(randomCallThreeCalls(config.rules.bullAllowed,Date.now()))} onConfirm={()=>confirmCall(callDraft,false)}/>:<div style={{...panelStyle(ACCENT+"44"),padding:18,textAlign:"center"}}><div style={{fontSize:30}}>📣</div><div style={{marginTop:7,color:ACCENT,fontWeight:1100}}>{callerPlayer?.name} prépare les 3 appels…</div><div style={{marginTop:4,color:SOFT,fontSize:10}}>Le jeu reprendra automatiquement.</div></div>):state.phase!=="finished"?<>
        <div style={{...panelStyle("rgba(255,255,255,.10)"),padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100}}>APPEL DE {callerPlayer?.name?.toUpperCase()||"—"}</div><div style={{marginTop:4,color:SOFT,fontSize:9.5}}>{config.rules.orderedTargets?"Chaque fléchette a sa cible dédiée.":"Ordre libre : chaque cible ne compte qu'une fois."}</div></div><div style={{color:previewHits===3?GREEN:ACCENT,fontSize:20,fontWeight:1100}}>{currentThrow.length?`+${previewPts} pts`:"📣"}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:10}}>{state.currentCalls.map((c:any,idx:number)=>{const pv=callPreview[idx];return <div key={idx} style={{borderRadius:14,padding:"12px 8px",textAlign:"center",background:pv?.ok?`${GREEN}12`:"rgba(255,255,255,.04)",border:`1px solid ${pv?.ok?GREEN+"66":ACCENT+"45"}`,boxShadow:pv?.ok?`0 0 16px ${GREEN}18`:"none"}}><div style={{color:pv?.ok?GREEN:ACCENT,fontSize:9,fontWeight:1100}}>FLÉCHETTE {idx+1}</div><div style={{marginTop:4,color:"#fff",fontSize:26,fontWeight:1100,lineHeight:1}}>{callThreeLabel(c)}</div><div style={{marginTop:5,color:pv?.ok?GREEN:SOFT,fontSize:9,fontWeight:900}}>{previewDarts[idx]?(pv?.ok?`✓ +${pv.pts}`:"✕ raté"):"à jouer"}</div></div>})}</div>
          <div style={{marginTop:9}}><DartStrip darts={currentThrow} accent={previewHits===3?GREEN:ACCENT} targetLabels={targetLabels}/></div>
          <div style={{marginTop:10}}><LiveStatGrid accent={ACCENT} items={[{label:"points",value:Number(state.scores[activePlayer?.id]||0)},{label:"hits",value:activeStats.hits||0,color:GREEN},{label:"best volée",value:activeStats.bestVisit||0,color:ACCENT2},{label:"série",value:activeStats.bestStreak||0,color:BLUE}]}/></div>
        </div>
        {!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} minDartsToValidate={3} validateLabel="VALIDER LA VOLÉE" accent={ACCENT}/>:<div style={{...panelStyle(ACCENT+"33"),textAlign:"center",color:SOFT,fontSize:11,padding:14}}><b style={{color:ACCENT}}>{activePlayer?.name}</b> répond à l'appel…</div>}
        <VisitTimeline visits={state.visits} profiles={profiles} accent={ACCENT} title="HISTORIQUE CALL THREE" limit={4}/>
      </>:<ModeEndPanel title="CALL THREE" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onStats={()=>go?.("darts_mode_summary",{rec:buildRecord(state,"finished"),mode:"call_three",from:"game_end"})} onHistory={()=>go?.("statsHub",{tab:"history",mode:"call_three",focusMatchId:matchIdRef.current})} onConfig={()=>go?.("call_three_config")} onGames={()=>go?.("games",{gamesView:"all"})} extra={<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:6}}>{profiles.map((p:any)=>{const st=state.statsByPlayer[p.id]||{};const rate=st.darts?Math.round((Number(st.hits||0)/st.darts)*100):0;return <div key={p.id} style={{padding:8,borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",fontSize:9.5,color:SOFT}}><b style={{color:"#fff"}}>{playerName(p)}</b><br/>{st.points||0} pts · {rate}% hits · {st.perfectRounds||0} full call</div>})}</div>}/>} 
    </div>
  </div>;
}
