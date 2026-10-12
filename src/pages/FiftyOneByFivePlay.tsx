// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ticker51 from "../assets/tickers/ticker_51_by_5.webp";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  cloneFiftyOneByFiveState,
  createFiftyOneByFiveState,
  evaluateFiftyOneVisit,
  normalizeFiftyOneByFiveConfig,
  pickFiftyOneByFiveBotDarts,
  playFiftyOneByFiveVisit,
  type FiftyOneByFiveState,
} from "../lib/gameEngines/fiftyOneByFiveEngine";
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

const ACCENT="#ffd34d", ACCENT2="#42e6c2", GREEN="#72efb1", RED="#ff6b67";
function Rules({config}:any){return <div style={{display:"grid",gap:10,fontSize:12.5,lineHeight:1.5}}><div><b style={{color:ACCENT}}>OBJECTIF</b><br/>Atteins exactement <b>{config.rules.target}</b>.</div><div><b style={{color:ACCENT2}}>DIVISION</b><br/>Additionne les 3 fléchettes. Si le total est divisible par 5, le quotient est ajouté au score.</div><div><b style={{color:ACCENT}}>VOLÉE CLASSIQUE</b><br/>{config.rules.requireThreeScoringDarts?"Les 3 fléchettes doivent toutes marquer.":"Les MISS sont tolérés si le total final reste valide."}</div><div><b style={{color:RED}}>BUST</b><br/>{config.rules.bustRule==='zero'?"Dépassement = retour à 0.":"Dépassement = score conservé."}</div></div>}

export default function FiftyOneByFivePlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:false});
  const go=props?.go??props?.setTab,store=props?.store,onFinish=props?.onFinish,resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeFiftyOneByFiveConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);
  const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const [state,setState]=React.useState<FiftyOneByFiveState>(()=>restored?.mode==="fifty_one_by_five"?cloneFiftyOneByFiveState(restored):createFiftyOneByFiveState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>([]),[multiplier,setMultiplier]=React.useState<1|2|3>(1),[undo,setUndo]=React.useState<FiftyOneByFiveState[]>([]),[notice,setNotice]=React.useState("");
  const botBusy=React.useRef(false),finishedRef=React.useRef(false),matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`51by5-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const activePlayer=state.players[state.activePlayerIndex],activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null,activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);

  const buildRecord=React.useCallback((s:FiftyOneByFiveState,status:"in_progress"|"finished")=>{const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));return{id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"fifty_one_by_five",mode:"fifty_one_by_five",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,game:{mode:"fifty_one_by_five",target:s.config.rules.target,seriesWins:s.config.seriesWins},summary:{mode:"fifty_one_by_five",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,config:s.config,perPlayer:Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,score:Number(s.scores[id]||0),wins:Number(s.legWins[id]||0)}]))},resume:{mode:"fifty_one_by_five",config:s.config,state:cloneFiftyOneByFiveState(s),updatedAt:Date.now()},payload:{kind:"fifty_one_by_five",mode:"fifty_one_by_five",sport:"darts",config:s.config,stateSnapshot:cloneFiftyOneByFiveState(s),visits:s.visits,visitHistory:s.visits,stats:{mode:"fifty_one_by_five",players:s.statsByPlayer,legWins:s.legWins}}};},[profiles]);
  const persist=React.useCallback((s:FiftyOneByFiveState)=>{if(s.phase==="finished"){if(finishedRef.current)return;finishedRef.current=true;const rec=buildRecord(s,"finished");if(typeof onFinish==="function")onFinish(rec,{navigate:false});else void History.upsert(rec);}else void History.upsert(buildRecord(s,"in_progress")).catch(()=>{});},[buildRecord,onFinish]);
  const commit=(next:FiftyOneByFiveState,previous=state)=>{setUndo(u=>[...u.slice(-39),cloneFiftyOneByFiveState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);const ev=lastEvents(next.visits);let msg=ev.length?ev.join(" · "):"";if(next.phase==="finished"&&next.winnerId)msg=`🏆 ${next.players.find((p:any)=>p.id===next.winnerId)?.name||"Victoire"} remporte 51 BY 5`;else if(next.legIndex>previous.legIndex&&next.lastLegWinnerId)msg=`🎯 ${next.players.find((p:any)=>p.id===next.lastLegWinnerId)?.name||"Un joueur"} remporte la manche`;setNotice(msg);persist(next);};
  const validate=()=>{if(!currentThrow.length||state.phase==="finished"||activeIsBot)return;commit(playFiftyOneByFiveVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneFiftyOneByFiveState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière volée annulée");finishedRef.current=false;persist(prev);return u.slice(0,-1);});
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{commit(playFiftyOneByFiveVisit(state,pickFiftyOneByFiveBotDarts(state,config.botLevel)));}finally{botBusy.current=false;}},650);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);
  function replay(){matchIdRef.current=`51by5-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setCurrentThrow([]);setState(createFiftyOneByFiveState(players,config));}

  const legTarget=config.seriesWins*2-1;
  const activeScore=Number(state.scores[activePlayer?.id]||0),remaining=Math.max(0,config.rules.target-activeScore);
  const previewDarts=currentThrow.map(uiToGameDart),preview=evaluateFiftyOneVisit(previewDarts,config),projected=activeScore+preview.dividedScore,previewBust=preview.valid&&projected>config.rules.target;
  const activeStats=state.statsByPlayer[activePlayer?.id]||{};
  const previewColor=previewBust?RED:preview.valid?GREEN:currentThrow.length?ACCENT:"#778093";

  return <div style={{minHeight:"calc(var(--vh, 1vh) * 100)",paddingBottom:18,background:"radial-gradient(circle at 50% 0%,rgba(255,211,77,.11),transparent 35%)"}}>
    <PageHeader tickerSrc={ticker51} tickerAlt="51 BY 5" left={<BackDot onClick={()=>go?.("fifty_one_by_five_config")} color={ACCENT} glow={`${ACCENT}88`}/>} right={<InfoDot title="Règles 51 BY 5" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config}/>}/>} />
    <div style={{padding:"7px 8px 18px",maxWidth:980,margin:"0 auto",display:"grid",gap:8}}>
      <div style={{...panelStyle(ACCENT+"50"),padding:9,display:"grid",gridTemplateColumns:"1fr auto",gap:9,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100,letterSpacing:1}}>MANCHE {state.legIndex+1} · BO{legTarget}</div><div style={{marginTop:3,color:"#fff",fontSize:14,fontWeight:1000}}>{state.phase==="finished"?"Match terminé":`${activePlayer?.name||"—"} · ${activeScore}/${config.rules.target}`}</div></div><button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT,!undo.length)}>↶ UNDO</button></div>
      {notice?<div style={{borderRadius:12,padding:"7px 10px",background:notice.includes("🏆")?"rgba(114,239,177,.12)":"rgba(255,211,77,.10)",border:`1px solid ${notice.includes("🏆")?"rgba(114,239,177,.32)":"rgba(255,211,77,.24)"}`,color:notice.includes("🏆")?"#baffd8":"#ffe89f",fontSize:10.5,fontWeight:900}}>{notice}</div>:null}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:7}}>{state.players.map((p:any,i:number)=>{const prof=profileById.get(String(p.id))||p;const score=Number(state.scores[p.id]||0);return <div key={p.id} style={{display:"grid",gap:5}}><PlayerCard profile={prof} active={state.phase!=="finished"&&state.activePlayerIndex===i} accent={ACCENT} value={score} subValue={`Reste ${Math.max(0,config.rules.target-score)} · valide ${state.statsByPlayer[p.id]?.validVisits||0}`} badge={`${Math.round((score/config.rules.target)*100)}%`} wins={state.legWins[p.id]||0}/><Meter value={score} max={config.rules.target} accent={ACCENT2} height={5}/></div>})}</div>

      {state.phase!=="finished"?<>
        <div style={{...panelStyle("rgba(255,255,255,.10)"),padding:10}}>
          <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:12,alignItems:"center"}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:1100}}>CALCUL DE LA VOLÉE</div><div style={{marginTop:3,color:"#fff",fontSize:26,fontWeight:1100}}>{currentThrow.length?`${preview.rawTotal} ÷ 5 = ${preview.valid?preview.dividedScore:"—"}`:`Reste ${remaining}`}</div><div style={{marginTop:5,color:SOFT,fontSize:9.5}}>{currentThrow.length?(previewBust?`BUST : ${projected} dépasserait ${config.rules.target}`:preview.valid?`Projection : ${activeScore} + ${preview.dividedScore} = ${projected}`:config.rules.requireThreeScoringDarts&&currentThrow.length<3?"Complète les 3 fléchettes pour valider la division":"Le total doit être divisible par 5"):"Chaque volée valide transforme son total réel en points de jeu."}</div></div><div style={{width:92,height:92,borderRadius:999,border:`3px solid ${previewColor}`,display:"grid",placeItems:"center",background:"radial-gradient(circle,rgba(255,255,255,.08),rgba(0,0,0,.6))",boxShadow:`0 0 22px ${previewColor}22`}}><div style={{textAlign:"center"}}><div style={{fontSize:26,fontWeight:1100,color:previewColor}}>{previewBust?"BUST":preview.valid?`+${preview.dividedScore}`:"÷5"}</div><div style={{fontSize:8.5,color:SOFT}}>{currentThrow.length}/3</div></div></div></div>
          <div style={{marginTop:10}}><DartStrip darts={currentThrow} accent={previewColor}/></div>
          <div style={{marginTop:10}}><LiveStatGrid accent={ACCENT} items={[{label:"valides",value:activeStats.validVisits||0,color:GREEN},{label:"série",value:activeStats.validStreak||0},{label:"best ÷5",value:activeStats.bestQuotient||0},{label:"busts",value:activeStats.busts||0,color:RED}]}/></div>
        </div>
        {!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} minDartsToValidate={config.rules.requireThreeScoringDarts?3:1} validateLabel="VALIDER LA VOLÉE" accent={ACCENT}/>:<div style={{...panelStyle(ACCENT+"33"),textAlign:"center",color:SOFT,fontSize:11,padding:14}}><b style={{color:ACCENT}}>{activePlayer?.name}</b> calcule sa meilleure division…</div>}
        <VisitTimeline visits={state.visits} profiles={profiles} accent={ACCENT} title="HISTORIQUE 51 BY 5" limit={4}/>
      </>:<ModeEndPanel title="51 BY 5" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onStats={()=>go?.("darts_mode_summary",{rec:buildRecord(state,"finished"),mode:"fifty_one_by_five",from:"game_end"})} onHistory={()=>go?.("statsHub",{tab:"history",mode:"fifty_one_by_five",focusMatchId:matchIdRef.current})} onConfig={()=>go?.("fifty_one_by_five_config")} onGames={()=>go?.("games",{gamesView:"all"})} extra={<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:6}}>{profiles.map((p:any)=>{const st=state.statsByPlayer[p.id]||{};const rate=st.visits?Math.round((Number(st.validVisits||0)/st.visits)*100):0;return <div key={p.id} style={{padding:8,borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",fontSize:9.5,color:SOFT}}><b style={{color:"#fff"}}>{playerName(p)}</b><br/>{rate}% valides · best brut {st.highestRaw||0} · best ÷5 {st.bestQuotient||0}</div>})}</div>}/>} 
    </div>
  </div>;
}
