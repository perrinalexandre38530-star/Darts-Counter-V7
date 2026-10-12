// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerLooper from "../assets/tickers/ticker_looper.webp";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  assignLooperTarget,
  cloneLooperState,
  createLooperState,
  looperDartMatchesTarget,
  looperTargetFromDart,
  looperTargetLabel,
  normalizeLooperConfig,
  pickLooperBotDarts,
  playLooperVisit,
  type LooperState,
} from "../lib/gameEngines/looperEngine";
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

const ACCENT="#8ff7ff", ACCENT2="#da66ff", GREEN="#72efb1", DANGER="#ff6a77", GOLD="#ffd66a";
function Rules({config}:any){return <div style={{display:"grid",gap:10,fontSize:12.5,lineHeight:1.5}}><div><b style={{color:ACCENT}}>FOLLOW THE LEADER</b><br/>Touche la zone exacte imposée avant la fin de ta volée.</div><div><b style={{color:ACCENT2}}>SEGMENT EXACT</b><br/>Double, Triple, Bull, DBULL et les simples intérieur/extérieur sont distingués quand la saisie le permet.</div><div><b style={{color:GOLD}}>NOUVELLE CIBLE</b><br/>Après avoir touché la cible, la dernière zone marquée avec les fléchettes restantes devient la prochaine cible.</div><div><b style={{color:DANGER}}>VIES</b><br/>Échec = 1 vie perdue, sauf bouclier actif. Dernier joueur vivant = manche gagnée.</div></div>}

export default function LooperPlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:false});
  const go=props?.go??props?.setTab,store=props?.store,onFinish=props?.onFinish,resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeLooperConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const [state,setState]=React.useState<LooperState>(()=>restored?.mode==="looper"?cloneLooperState(restored):createLooperState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>([]),[multiplier,setMultiplier]=React.useState<1|2|3>(1),[undo,setUndo]=React.useState<LooperState[]>([]),[notice,setNotice]=React.useState("");
  const [singleRing,setSingleRing]=React.useState<"inner_single"|"outer_single">("inner_single");
  const botBusy=React.useRef(false),finishedRef=React.useRef(false),matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`looper-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const activePlayer=state.players[state.activePlayerIndex],activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null,activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);

  const buildRecord=React.useCallback((s:LooperState,status:"in_progress"|"finished")=>{const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));return{id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"looper",mode:"looper",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,game:{mode:"looper",lives:s.config.rules.lives,seriesWins:s.config.seriesWins},summary:{mode:"looper",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,currentTarget:s.currentTarget,config:s.config,perPlayer:Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,lives:Number(s.lives[id]||0),shields:Number(s.shields[id]||0),wins:Number(s.legWins[id]||0)}]))},resume:{mode:"looper",config:s.config,state:cloneLooperState(s),updatedAt:Date.now()},payload:{kind:"looper",mode:"looper",sport:"darts",config:s.config,stateSnapshot:cloneLooperState(s),visits:s.visits,visitHistory:s.visits,stats:{mode:"looper",players:s.statsByPlayer,legWins:s.legWins}}};},[profiles]);
  const persist=React.useCallback((s:LooperState)=>{if(s.phase==="finished"){if(finishedRef.current)return;finishedRef.current=true;const rec=buildRecord(s,"finished");if(typeof onFinish==="function")onFinish(rec,{navigate:false});else void History.upsert(rec);}else void History.upsert(buildRecord(s,"in_progress")).catch(()=>{});},[buildRecord,onFinish]);
  const commit=(next:LooperState,previous=state)=>{setUndo(u=>[...u.slice(-39),cloneLooperState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);const ev=lastEvents(next.visits);let msg=ev.length?ev.join(" · "):"";if(next.phase==="finished"&&next.winnerId)msg=`🏆 ${next.players.find((p:any)=>p.id===next.winnerId)?.name||"Victoire"} remporte LOOPER`;else if(next.legIndex>previous.legIndex&&next.lastLegWinnerId)msg=`♾ ${next.players.find((p:any)=>p.id===next.lastLegWinnerId)?.name||"Un joueur"} reste seul en vie`;setNotice(msg);persist(next);};
  const validate=()=>{if(!currentThrow.length||state.phase==="finished"||activeIsBot)return;if(state.phase==="assignment"){commit(assignLooperTarget(state,uiToGameDart(currentThrow[0])));return;}commit(playLooperVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneLooperState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière action annulée");finishedRef.current=false;persist(prev);return u.slice(0,-1);});
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{if(state.phase==="assignment")commit(assignLooperTarget(state,pickLooperBotDarts(state,config.botLevel)[0]));else commit(playLooperVisit(state,pickLooperBotDarts(state,config.botLevel)));}finally{botBusy.current=false;}},650);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);
  function replay(){matchIdRef.current=`looper-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setCurrentThrow([]);setState(createLooperState(players,config));}

  const legTarget=config.seriesWins*2-1,targetLabel=looperTargetLabel(state.currentTarget),activeStats=state.statsByPlayer[activePlayer?.id]||{};
  const previewDarts=currentThrow.map(uiToGameDart);
  const previewHitIndex=state.phase==="playing"?previewDarts.findIndex((d:any)=>looperDartMatchesTarget(d,state.currentTarget,config.rules.exactSegment)):-1;
  const afterHit=previewHitIndex>=0?previewDarts.slice(previewHitIndex+1).filter((d:any)=>d?.bed&&d.bed!=="MISS"):[];
  const previewNext=previewHitIndex>=0&&afterHit.length?looperTargetFromDart(afterHit[afterHit.length-1],state.currentTarget):state.currentTarget;
  const ringDecorator=(d:UIDart)=>{if((d as any)?.label)return d;if(Number(d?.v)>=1&&Number(d?.v)<=20&&Number(d?.mult)===1)return{...d,label:singleRing};return d;};
  const exactHint=config.scoreInputMethod==="keypad"?`Keypad : ${singleRing==="inner_single"?"PETIT SIMPLE":"GRAND SIMPLE"} sélectionné.`:"La cible interactive reconnaît automatiquement les anneaux.";

  return <div style={{minHeight:"calc(var(--vh, 1vh) * 100)",paddingBottom:18,background:"radial-gradient(circle at 50% 0%,rgba(143,247,255,.10),transparent 35%)"}}>
    <PageHeader tickerSrc={tickerLooper} tickerAlt="LOOPER" left={<BackDot onClick={()=>go?.("looper_config")} color={ACCENT} glow={`${ACCENT}88`}/>} right={<InfoDot title="Règles LOOPER" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config}/>}/>} />
    <div style={{padding:"7px 8px 18px",maxWidth:980,margin:"0 auto",display:"grid",gap:8}}>
      <div style={{...panelStyle(ACCENT+"50"),padding:9,display:"grid",gridTemplateColumns:"1fr auto",gap:9,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100,letterSpacing:1}}>MANCHE {state.legIndex+1} · BO{legTarget}</div><div style={{marginTop:3,color:"#fff",fontSize:14,fontWeight:1000}}>{state.phase==="assignment"?`${activePlayer?.name||"—"} fixe la cible de départ`:state.phase==="finished"?"Match terminé":`${activePlayer?.name||"—"} doit boucler ${targetLabel}`}</div></div><button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT,!undo.length)}>↶ UNDO</button></div>
      {notice?<div style={{borderRadius:12,padding:"7px 10px",background:notice.includes("🏆")?"rgba(114,239,177,.12)":"rgba(143,247,255,.10)",border:`1px solid ${notice.includes("🏆")?"rgba(114,239,177,.32)":"rgba(143,247,255,.24)"}`,color:notice.includes("🏆")?"#baffd8":"#bffbff",fontSize:10.5,fontWeight:900}}>{notice}</div>:null}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:7}}>{state.players.map((p:any,i:number)=>{const prof=profileById.get(String(p.id))||p,lives=Number(state.lives[p.id]||0),shields=Number(state.shields[p.id]||0);return <div key={p.id} style={{display:"grid",gap:5}}><PlayerCard profile={prof} active={state.phase!=="finished"&&state.activePlayerIndex===i} accent={lives>1?ACCENT:DANGER} value={lives} subValue={`${"♥".repeat(lives)}${"♡".repeat(Math.max(0,config.rules.lives-lives))} · bouclier ${shields}`} badge={lives>0?(shields?`🛡 ${shields}`:"EN JEU"):"OUT"} wins={state.legWins[p.id]||0} muted={lives<=0}/><Meter value={lives} max={config.rules.lives} accent={lives>1?ACCENT:DANGER} height={5}/></div>})}</div>

      {state.phase!=="finished"?<>
        <div style={{...panelStyle("rgba(255,255,255,.10)"),padding:10}}>
          <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:12,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100}}>{state.phase==="assignment"?"CIBLE DE DÉPART":"ZONE EXACTE À TOUCHER"}</div><div style={{marginTop:3,color:"#fff",fontSize:30,fontWeight:1100,lineHeight:1}}>{state.phase==="assignment"?"1 FLÉCHETTE":targetLabel}</div><div style={{marginTop:5,color:SOFT,fontSize:9.5}}>{state.phase==="assignment"?"La zone touchée devient la première boucle de la manche.":previewHitIndex>=0?`Touchée avec la fléchette ${previewHitIndex+1} · prochaine cible prévue : ${looperTargetLabel(previewNext)}`:`Tu as jusqu'à 3 fléchettes pour toucher ${targetLabel}.`}</div></div><div style={{width:92,height:92,borderRadius:999,border:`3px solid ${previewHitIndex>=0?GREEN:ACCENT}`,display:"grid",placeItems:"center",background:"radial-gradient(circle,rgba(255,255,255,.08),rgba(0,0,0,.6))",boxShadow:`0 0 22px ${previewHitIndex>=0?GREEN:ACCENT}22`}}><div style={{textAlign:"center"}}><div style={{fontSize:30,fontWeight:1100,color:previewHitIndex>=0?GREEN:ACCENT}}>{previewHitIndex>=0?"✓":"∞"}</div><div style={{fontSize:8.5,color:SOFT}}>{state.phase==="playing"?targetLabel:"SET"}</div></div></div></div>
          {config.scoreInputMethod==="keypad"?<div style={{marginTop:10,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><span style={{color:SOFT,fontSize:9,fontWeight:900}}>ZONE SIMPLE :</span><button type="button" onClick={()=>setSingleRing("inner_single")} style={{...actionStyle(ACCENT),minHeight:32,background:singleRing==="inner_single"?`${ACCENT}34`:`${ACCENT}12`}}>PETIT SIMPLE</button><button type="button" onClick={()=>setSingleRing("outer_single")} style={{...actionStyle(ACCENT2),minHeight:32,background:singleRing==="outer_single"?`${ACCENT2}34`:`${ACCENT2}12`}}>GRAND SIMPLE</button><span style={{color:"#747d90",fontSize:8.5}}>{exactHint}</span></div>:null}
          <div style={{marginTop:10}}><DartStrip darts={currentThrow} accent={previewHitIndex>=0?GREEN:ACCENT}/></div>
          <div style={{marginTop:10}}><LiveStatGrid accent={ACCENT} items={[{label:"touches",value:activeStats.hits||0,color:GREEN},{label:"série",value:activeStats.currentHitStreak||0},{label:"boucliers",value:Number(state.shields[activePlayer?.id]||0),color:ACCENT2},{label:"vies perdues",value:activeStats.lifeLosses||0,color:DANGER}]}/></div>
        </div>
        {!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} maxDarts={state.phase==="assignment"?1:3} minDartsToValidate={state.phase==="assignment"?1:3} dartDecorator={ringDecorator} validateLabel={state.phase==="assignment"?"FIXER LA CIBLE":"VALIDER LA VOLÉE"} accent={ACCENT}/>:<div style={{...panelStyle(ACCENT+"33"),textAlign:"center",color:SOFT,fontSize:11,padding:14}}><b style={{color:ACCENT}}>{activePlayer?.name}</b> prépare sa boucle…</div>}
        <VisitTimeline visits={state.visits} profiles={profiles} accent={ACCENT} title="HISTORIQUE LOOPER" limit={4}/>
      </>:<ModeEndPanel title="LOOPER" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onStats={()=>go?.("darts_mode_summary",{rec:buildRecord(state,"finished"),mode:"looper",from:"game_end"})} onHistory={()=>go?.("statsHub",{tab:"history",mode:"looper",focusMatchId:matchIdRef.current})} onConfig={()=>go?.("looper_config")} onGames={()=>go?.("games",{gamesView:"all"})} extra={<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:6}}>{profiles.map((p:any)=>{const st=state.statsByPlayer[p.id]||{};return <div key={p.id} style={{padding:8,borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",fontSize:9.5,color:SOFT}}><b style={{color:"#fff"}}>{playerName(p)}</b><br/>{st.hits||0} touches · best série {st.bestHitStreak||0} · {st.lifeLosses||0} vies perdues</div>})}</div>}/>} 
    </div>
  </div>;
}
