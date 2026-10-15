// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import tickerSteeple from "../assets/tickers/ticker_steeplechase.webp";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { playNewModeDartSequence, playNewModeDartSfx, playNewModeSfx, unlockNewModeAudio } from "../lib/newModesArcadeSfx";
import { commitPremiumPartyProgress } from "../lib/premiumPartyProgress";
import {
  cloneSteeplechaseState, createSteeplechaseState, currentSteepleTarget, normalizeSteeplechaseConfig,
  pickSteeplechaseBotDarts, playSteeplechaseVisit, steepleDartHitsTarget, steepleSequence, type SteeplechaseState,
} from "../lib/gameEngines/steeplechaseEngine";
import { NewModeInput, dartLabel, isBotProfile, lastEvents, playerName, resolveModeProfiles, uiToGameDart } from "./newModes/newModePlayShared";
import {
  ActiveHero, BotTurn, FloatingAdvice, KpiStrip, LogModal, PlayersModal, PremiumAwenaButton,
  GameplayMission, PremiumEndPanel, PremiumMomentOverlay, QuickRow, RankingModal, StatsModal, SummaryStrip, bestBy, modePlayerColors, percent,
} from "./newModes/PremiumPartyModeUi";
import "./newModes/PremiumPartyModeUi.css";
import { SteeplechaseGameplayVisual, ModeInputGuideBadge } from "./newModes/ModeGameplayVisuals";
import "./newModes/ModeGameplayVisuals.css";
import { steeplechaseGameplayMoment } from "./newModes/NewFourModeGameplayFeedback";

const ACCENT="#7dffbd", FENCE="#ffb13b", FINISH="#ff6464", BLUE="#65caff";

function coachText(state:SteeplechaseState,activePlayer:any){
  if(!activePlayer)return "";
  const target=currentSteepleTarget(state,activePlayer.id),step=Number(state.stepByPlayer?.[activePlayer.id]||0),seq=steepleSequence(state.config.rules.direction);
  if(target.kind==="bull")return state.config.rules.finishBull==="double"?"Dernière haie franchie : ferme la course au DBULL.":"Ligne d'arrivée : Bull ou DBULL termine la course.";
  if(target.fence)return `Haie ${target.label} : seul le triple compte. Priorité à la précision, pas à la vitesse.`;
  if(seq.length-step<=3)return `Sprint final : ${target.label}, puis encore ${Math.max(0,seq.length-step-1)} secteur(s) avant le Bull.`;
  return `Reste sur le parcours : ${target.label} est la prochaine étape. Une touche valide te fait avancer immédiatement.`;
}

export default function SteeplechasePlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:true});
  const awena=useAwenaOptional();
  const go=props?.go??props?.setTab,store=props?.store,onFinish=props?.onFinish,resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeSteeplechaseConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);
  const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const recoveredThrow=resumeRecord?.resume?.currentThrow??resumeRecord?.payload?.currentThrow;
  const [state,setState]=React.useState<SteeplechaseState>(()=>restored?.mode==="steeplechase"?cloneSteeplechaseState(restored):createSteeplechaseState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>(()=>Array.isArray(recoveredThrow)?recoveredThrow.slice(0,3):[]);
  const [multiplier,setMultiplier]=React.useState<1|2|3>(()=>{const v=resumeRecord?.resume?.multiplier??resumeRecord?.payload?.multiplier;return v===2||v===3?v:1;});
  const [undo,setUndo]=React.useState<SteeplechaseState[]>([]),[notice,setNotice]=React.useState(""),[moment,setMoment]=React.useState<any>(null);
  const [progression,setProgression]=React.useState<any>(()=>resumeRecord?.summary?.progression||resumeRecord?.payload?.summary?.progression||null);
  const [playersOpen,setPlayersOpen]=React.useState(false),[statsOpen,setStatsOpen]=React.useState(false),[logOpen,setLogOpen]=React.useState(false),[rankingOpen,setRankingOpen]=React.useState(false);
  const botBusy=React.useRef(false),finishedRef=React.useRef(false),introPlayedRef=React.useRef(false),initialCheckpointRef=React.useRef(false);
  const matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`steeple-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const colorById=React.useMemo(()=>modePlayerColors(state.players,ACCENT),[state.players]);
  const activePlayer=state.players[state.activePlayerIndex],activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null;
  const activeColor=activePlayer?colorById.get(String(activePlayer.id))||ACCENT:ACCENT,activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);
  const sfxEnabled=(config as any).sfxEnabled!==false,awenaEnabled=(config as any).awenaEnabled!==false,coachEnabled=(config as any).coachEnabled!==false,firstVisitGuideEnabled=(config as any).firstVisitGuide!==false;
  const nameById=React.useCallback((id:any)=>state.players.find((p:any)=>String(p.id)===String(id))?.name||"Joueur",[state.players]);

  const buildRecord=React.useCallback((s:SteeplechaseState,status:"in_progress"|"finished",draft:UIDart[]=currentThrow,draftMultiplier:1|2|3=multiplier)=>{
    const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));
    const perPlayer=Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,step:Number(s.stepByPlayer[id]||0),wins:Number(s.legWins[id]||0),accuracy:percent(st.hits,st.darts)}]));
    const ranking=[...s.players].map((p:any,i:number)=>({id:p.id,name:p.name,wins:Number(s.legWins[p.id]||0),step:Number(s.stepByPlayer[p.id]||0),hits:Number(s.statsByPlayer[p.id]?.hits||0),fences:Number(s.statsByPlayer[p.id]?.fencesCleared||0),order:i})).sort((a,b)=>b.wins-a.wins||b.step-a.step||b.fences-a.fences||b.hits-a.hits||a.order-b.order);
    return {id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"steeplechase",mode:"steeplechase",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,
      game:{mode:"steeplechase",seriesWins:s.config.seriesWins},summary:{mode:"steeplechase",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,config:s.config,perPlayer,ranking,durationMs:Math.max(0,Number((status==="finished"?(s.finishedAt||Date.now()):Date.now()))-Number(s.startedAt||Date.now())),totalDarts:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0)},
      resume:{mode:"steeplechase",config:s.config,state:cloneSteeplechaseState(s),currentThrow:draft.slice(0,3),multiplier:draftMultiplier,updatedAt:Date.now()},payload:{kind:"steeplechase",mode:"steeplechase",sport:"darts",config:s.config,stateSnapshot:cloneSteeplechaseState(s),currentThrow:draft.slice(0,3),multiplier:draftMultiplier,visits:s.visits,visitHistory:s.visits,stats:{mode:"steeplechase",players:s.statsByPlayer,legWins:s.legWins}}};
  },[profiles,currentThrow,multiplier]);
  const saveInProgress=React.useCallback(async(s:SteeplechaseState,draft:UIDart[]=currentThrow,m:1|2|3=multiplier)=>{try{await History.upsert(buildRecord(s,"in_progress",draft,m));}catch(e){console.warn("[STEEPLECHASE] checkpoint failed",e);}},[buildRecord,currentThrow,multiplier]);
  const persist=React.useCallback((s:SteeplechaseState)=>{
    if(s.phase==="finished"){
      if(finishedRef.current)return;
      finishedRef.current=true;
      const progress=commitPremiumPartyProgress({
        mode:"steeplechase",
        matchId:matchIdRef.current,
        winnerId:s.winnerId,
        participants:(s.players||[]).map((p:any)=>({
          id:String(p.id),
          name:p.name,
          stats:s.statsByPlayer?.[p.id]||{},
          isBot:isBotProfile(profileById.get(String(p.id))||p,botIds),
        })),
      });
      setProgression(progress);
      const rec:any=buildRecord(s,"finished",[],1);
      rec.summary={...(rec.summary||{}),progression:progress};
      rec.payload={...(rec.payload||{}),summary:{...(rec.payload?.summary||{}),progression:progress}};
      if(typeof onFinish==="function")onFinish(rec,{navigate:false});
      else void History.upsert(rec).catch(()=>{});
    }else void saveInProgress(s,[],1);
  },[buildRecord,onFinish,saveInProgress,profileById,botIds]);

  React.useEffect(()=>{if(initialCheckpointRef.current)return;initialCheckpointRef.current=true;if(state.phase!=="finished")void saveInProgress(state,currentThrow,multiplier);},[saveInProgress,state,currentThrow,multiplier]);
  React.useEffect(()=>{if(state.phase==="finished")return;const t=window.setTimeout(()=>void saveInProgress(state,currentThrow,multiplier),180);return()=>window.clearTimeout(t);},[currentThrow,multiplier,state.phase,state.activePlayerIndex,saveInProgress]);
  React.useEffect(()=>{if(restored?.mode==="steeplechase"||resumeRecord)return;const start=()=>{if(!sfxEnabled||introPlayedRef.current)return;introPlayedRef.current=true;void unlockNewModeAudio();playNewModeSfx("intro",true)};try{if((navigator as any)?.userActivation?.hasBeenActive){start();return;}}catch{}window.addEventListener("pointerdown",start,{once:true,capture:true} as any);return()=>window.removeEventListener("pointerdown",start,true);},[sfxEnabled]);
  React.useEffect(()=>{const t=activePlayer?currentSteepleTarget(state,activePlayer.id):null;awena?.setRuntime?.({route:"steeplechase_play",sport:"darts",mode:"steeplechase",phase:state.phase==="finished"?"summary":"play",inGame:state.phase!=="finished",screenLabel:"STEEPLECHASE · Partie",playerName:activePlayer?.name,extra:{target:t?.label,step:state.stepByPlayer?.[activePlayer?.id],direction:state.config.rules.direction,fencesEnabled:state.config.rules.fencesEnabled,leg:Number(state.legIndex||0)+1,visit:Number(state.turnIndex||0)+1,awenaRememberedMode:"steeplechase",awenaKnowledgeTopic:"screen:steeplechase_play"}});},[awena,state.phase,state.legIndex,state.turnIndex,state.stepByPlayer,activePlayer?.id]);

  const commit=React.useCallback((next:SteeplechaseState,previous=state,forcedNotice?:string)=>{const feedback=steeplechaseGameplayMoment(previous,next);if(feedback)setMoment(feedback);setUndo(u=>[...u.slice(-39),cloneSteeplechaseState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);let msg=forcedNotice||"";if(!msg&&next.phase==="finished"&&next.winnerId){msg=`🏆 ${nameById(next.winnerId)} remporte STEEPLECHASE !`;playNewModeSfx("victory",sfxEnabled);}else if(!msg&&next.legIndex>previous.legIndex&&next.lastLegWinnerId)msg=`🏁 ${nameById(next.lastLegWinnerId)} gagne la course`;else if(!msg)msg=lastEvents(next.visits).join(" · ");setNotice(msg);persist(next);},[state,nameById,persist,sfxEnabled]);
  const validate=()=>{if((currentThrow.length<3&&!previewFinished)||state.phase==="finished"||activeIsBot)return;commit(playSteeplechaseVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>{setMoment(null);setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneSteeplechaseState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière volée annulée");finishedRef.current=false;void saveInProgress(prev,[],1);return u.slice(0,-1);});};
  const setThrowWithSfx=React.useCallback((update:any)=>setCurrentThrow((prev:UIDart[])=>{const next=(typeof update==="function"?update(prev):update)||prev;const out=Array.isArray(next)?next.slice(0,3):prev;if(out.length>prev.length)out.slice(prev.length).forEach((d:any,i:number)=>window.setTimeout(()=>playNewModeDartSfx(d,sfxEnabled),i*120));return out;}),[sfxEnabled]);
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{const darts=pickSteeplechaseBotDarts(state,config.botLevel);const span=playNewModeDartSequence(darts,sfxEnabled);window.setTimeout(()=>{try{commit(playSteeplechaseVisit(state,darts));}finally{botBusy.current=false;}},span+100);}catch{botBusy.current=false;}},620);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);
  function replay(){setMoment(null);matchIdRef.current=`steeple-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setProgression(null);setCurrentThrow([]);setMultiplier(1);const next=createSteeplechaseState(players,config);setState(next);initialCheckpointRef.current=true;void saveInProgress(next,[],1);if(sfxEnabled)playNewModeSfx("intro",true);}

  const legTarget=config.seriesWins*2-1,seq=steepleSequence(config.rules.direction),activeTarget=activePlayer?currentSteepleTarget(state,activePlayer.id):{label:"—"},activeStats=state.statsByPlayer[activePlayer?.id]||{};
  const previewDarts=currentThrow.map(uiToGameDart);let previewStep=Number(state.stepByPlayer[activePlayer?.id]||0),previewHits=0;
  for(const d of previewDarts){const fake={...state,stepByPlayer:{...state.stepByPlayer,[activePlayer?.id]:previewStep}} as any;const target=currentSteepleTarget(fake,activePlayer?.id);if(steepleDartHitsTarget(d,target,config)){previewStep++;previewHits++;}}
  const previewFake={...state,stepByPlayer:{...state.stepByPlayer,[activePlayer?.id]:previewStep}} as any,previewTarget=currentSteepleTarget(previewFake,activePlayer?.id),previewFinished=previewStep>=seq.length+1;
  const ringDecorator=(d:UIDart)=>{if((d as any)?.label)return d;if(config.rules.innerSingleOnly&&Number(d?.v)>=1&&Number(d?.v)<=20&&Number(d?.mult)===1)return{...d,label:"inner_single"};return d;};
  const steepleInputGuide=React.useMemo(()=>{
    const t:any=previewTarget||activeTarget||{};
    if(t.kind==="bull"){
      const dbl=config.rules.finishBull==="double";
      return{segments:[],bull:true,mult:null,targets:[{ring:dbl?"dbull":"bull_any"}],label:`VISE ${dbl?"DBULL":"BULL"}`};
    }
    const n=Number(t.number||0);
    if(!n)return{segments:[],bull:false,mult:null,targets:[],label:`VISE ${t.label||"—"}`};
    if(t.fence)return{segments:[n],bull:false,mult:3,targets:[{segment:n,ring:"triple"}],label:`HAIE · VISE T${n}`};
    return{segments:[n],bull:false,mult:1,targets:[{segment:n,ring:config.rules.innerSingleOnly?"inner_single":"single"}],label:`VISE ${t.label||`S${n}`}`};
  },[previewTarget,activeTarget,config.rules.finishBull,config.rules.innerSingleOnly]);
  const targetColor=activeTarget.kind==='bull'?FINISH:activeTarget.fence?FENCE:activeColor,activeStep=Number(state.stepByPlayer[activePlayer?.id]||0),firstVisitGuide=firstVisitGuideEnabled&&!activeIsBot&&state.turnIndex===0&&(state.visits?.length||0)===0&&currentThrow.length===0,coach=firstVisitGuide?`1 · Regarde l’obstacle actif : ${activeTarget.label}. 2 · Touche-le pour avancer immédiatement sur la piste. 3 · Les haies exigent un Triple et le Bull termine la course.`:coachEnabled&&!activeIsBot?coachText(state,activePlayer):"";
  const missionSteeple=previewFinished?{icon:"🏁",title:"Ligne d’arrivée atteinte",text:"La course peut être validée immédiatement : inutile de lancer les fléchettes restantes.",chips:[`+${previewHits} ÉTAPE${previewHits>1?"S":""}`,"ARRIVÉE","VALIDER"],tone:"success"}:previewTarget?.kind==="bull"?{icon:"🎯",title:`Arrivée · vise ${config.rules.finishBull==="double"?"DBULL":"BULL"}`,text:config.rules.finishBull==="double"?"Seul le DBULL ferme la course.":"Bull25 ou DBULL termine la course.",chips:[`${3-currentThrow.length} FLÉCHETTE${3-currentThrow.length>1?"S":""}`,config.rules.finishBull==="double"?"DBULL OBLIGATOIRE":"BULL / DBULL"],tone:"normal"}:previewTarget?.fence?{icon:"🚧",title:`Haie · ${previewTarget.label}`,text:"Une haie ne se franchit qu’en touchant le TRIPLE du secteur indiqué.",chips:[`VISE ${previewTarget.label}`,"TRIPLE OBLIGATOIRE",`${previewHits} ÉTAPE${previewHits>1?"S":""} GAGNÉE${previewHits>1?"S":""}`],tone:"normal"}:{icon:"🏃",title:`Prochaine étape · ${previewTarget?.label||activeTarget.label}`,text:previewHits?`Tu as déjà gagné ${previewHits} étape${previewHits>1?"s":""} dans cette volée. Continue sur la prochaine cible.`:"Touche le secteur demandé pour avancer immédiatement d’une étape.",chips:[`VISE ${previewTarget?.label||activeTarget.label}`,`${3-currentThrow.length} FLÉCHETTE${3-currentThrow.length>1?"S":""}`,`${activeStep}/${seq.length+1}`],tone:previewHits?"success":"normal"};
  const rankingRows=React.useMemo(()=>[...state.players].map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;const step=Number(state.stepByPlayer[p.id]||0);return{id:String(p.id),name:p.name,profile:profileById.get(String(p.id))||p,color,wins:Number(state.legWins[p.id]||0),step,hits:Number(st.hits||0),fences:Number(st.fencesCleared||0),subtitle:`étape ${step}/${seq.length+1} · ${st.fencesCleared||0} haies · ${percent(st.hits,st.darts)}%`,value:Number(state.legWins[p.id]||0),suffix:" M",order:i};}).sort((a,b)=>b.wins-a.wins||b.step-a.step||b.fences-a.fences||b.hits-a.hits||a.order-b.order),[state.players,state.legWins,state.stepByPlayer,state.statsByPlayer,seq.length,profileById,colorById]);
  const playersRows=state.players.map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;const step=Number(state.stepByPlayer[p.id]||0),t=currentSteepleTarget(state,p.id);return{id:p.id,name:p.name,profile:profileById.get(String(p.id))||p,color,active:i===state.activePlayerIndex,status:`PROCHAINE ${t.label}`,progress:step,progressMax:seq.length+1,metrics:[{label:"ÉTAPE",value:`${step}/${seq.length+1}`},{label:"HAIES",value:st.fencesCleared||0},{label:"HITS",value:st.hits||0},{label:"M",value:state.legWins[p.id]||0}]};});
  const statsItems=[{label:"ÉTAPES",value:activeStats.steps||0},{label:"POSITION",value:`${activeStep}/${seq.length+1}`},{label:"HAIES",value:activeStats.fencesCleared||0,color:FENCE},{label:"HAIES TENTÉES",value:activeStats.fenceAttempts||0},{label:"PRÉCISION",value:`${percent(activeStats.hits,activeStats.darts)}%`},{label:"BEST VOLÉE",value:activeStats.bestVisitSteps||0,color:BLUE},{label:"BEST SÉRIE",value:activeStats.bestStreak||0},{label:"BULL FINISH",value:activeStats.bullFinishes||0,color:FINISH},{label:"HITS",value:activeStats.hits||0},{label:"MISS",value:activeStats.misses||0},{label:"ROUND",value:state.legIndex+1},{label:"DARTS",value:activeStats.darts||0}];
  const awards=React.useMemo(()=>{const rows=rankingRows.map((r:any)=>({...r,st:state.statsByPlayer[r.id]||{}}));const racer=bestBy(rows,r=>Number(r.st.steps||0));const hurdler=bestBy(rows,r=>Number(r.st.fencesCleared||0));const accurate=bestBy(rows,r=>percent(r.st.hits,r.st.darts));return[{icon:"🏁",label:"DISTANCE",name:racer?.name||"—",value:`${racer?.st?.steps||0} étapes`,color:racer?.color},{icon:"🚧",label:"HAIES",name:hurdler?.name||"—",value:`${hurdler?.st?.fencesCleared||0}`,color:hurdler?.color},{icon:"🎯",label:"PRÉCISION",name:accurate?.name||"—",value:`${percent(accurate?.st?.hits,accurate?.st?.darts)}%`,color:accurate?.color}];},[rankingRows,state.statsByPlayer]);
  const totalDarts=Object.values(state.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0),durationMs=Math.max(0,Number((state.finishedAt||Date.now()))-Number(state.startedAt||Date.now()));
  const routeText=currentThrow.length?`${previewHits} étape${previewHits>1?"s":""} gagnée${previewHits>1?"s":""} · prochaine ${previewTarget.label}`:`${activeTarget.kind==='bull'?"ARRIVÉE":activeTarget.fence?"HAIE":"SECTEUR"} · ${activeTarget.label}`;

  if(state.phase==="finished")return <div className="party-mode" style={{["--mode-accent" as any]:ACCENT}} data-mss-native-play-layout="1"><PageHeader tickerSrc={tickerSteeple} tickerAlt="STEEPLECHASE" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("steeplechase_config")} color={ACCENT} glow={`${ACCENT}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="steeplechase_play" mode="steeplechase" screenLabel="STEEPLECHASE · Partie" accent={ACCENT}/></div>:null}/><div style={{flex:"1 1 auto",minHeight:0,overflow:"auto"}}><PremiumEndPanel title="STEEPLECHASE" accent={ACCENT} winnerId={state.winnerId} rankingRows={rankingRows} durationMs={durationMs} totalDarts={totalDarts} awards={awards} progression={progression ? {...progression, winnerCareer: progression.byPlayer?.[String(state.winnerId || "")] || null} : null} onReplay={replay} onStats={()=>go?.("statsHub",{mode:"active",initialStatsSubTab:"steeplechase",playerId:state.winnerId||state.players[0]?.id,focusMatchId:matchIdRef.current})} onHistory={()=>go?.("statsHub",{tab:"history",mode:"active",initialStatsSubTab:"history",focusMatchId:matchIdRef.current})} onConfig={()=>go?.("steeplechase_config")} onGames={()=>go?.("games",{gamesView:"all"})}/></div></div>;

  return <div className="party-mode" style={{["--mode-accent" as any]:activeColor}} data-mss-native-play-layout="1">
    <PageHeader tickerSrc={tickerSteeple} tickerAlt="STEEPLECHASE" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("steeplechase_config")} color={activeColor} glow={`${activeColor}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="steeplechase_play" mode="steeplechase" screenLabel="STEEPLECHASE · Partie" accent={activeColor}/></div>:null}/>
    {moment?<PremiumMomentOverlay moment={moment} accent={targetColor} profile={profileById.get(String(moment.playerId||""))} playerName={nameById(moment.playerId)}/>:null}
    {coach?<FloatingAdvice text={coach} accent={targetColor} kicker={firstVisitGuide?"PREMIER TOUR · MODE D’EMPLOI":activeTarget.fence?"CONSEIL HAIE":activeTarget.kind==='bull'?"SPRINT FINAL":"CONSEIL COURSE"}/>:null}
    <main className="party-mode__body"><div className="party-mode__stage"><div className="party-mode__left">
      <SummaryStrip players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} winsById={state.legWins} primaryById={(id:string)=>currentSteepleTarget(state,id).label} secondaryById={(id:string)=>`étape ${state.stepByPlayer[id]||0}/${seq.length+1} · ${state.statsByPlayer[id]?.fencesCleared||0} haies`}/>
      <ActiveHero profile={activeProfile} name={activePlayer?.name} accent={targetColor} eyebrow={`MANCHE ${state.legIndex+1} · BO${legTarget} · VOLÉE ${state.turnIndex+1}`} primary={activeTarget.label} secondary={routeText} tertiary={`${activeStep}/${seq.length+1} étapes · ${activeStats.fencesCleared||0} haies · ${percent(activeStats.hits,activeStats.darts)}% précision`} progress={activeStep} progressMax={seq.length+1} notice={notice} noticeTone={notice.includes("🏆")?"win":"normal"} aside={<div style={{textAlign:"center",fontSize:38}}>{activeTarget.kind==='bull'?"🎯":activeTarget.fence?"🚧":"🏁"}<div style={{fontSize:8,color:targetColor,marginTop:4}}>{previewHits?`+${previewHits} étape${previewHits>1?"s":""}`:activeTarget.label}</div></div>}/>
      {!activeIsBot?<GameplayMission accent={targetColor} icon={missionSteeple.icon} title={missionSteeple.title} text={missionSteeple.text} chips={missionSteeple.chips} tone={missionSteeple.tone}/>:null}
      <SteeplechaseGameplayVisual accent={targetColor} sequence={seq} activeStep={activeStep} previewStep={previewStep} activeTarget={activeTarget} previewTarget={previewTarget} fences={config.rules.fencesEnabled?config.rules.fences:[]} players={state.players.map((p:any)=>({id:p.id,name:p.name,step:Number(state.stepByPlayer[p.id]||0),color:colorById.get(String(p.id))||ACCENT}))}/>
      <KpiStrip accent={targetColor} onClick={()=>setStatsOpen(true)} items={[["ÉTAPES",activeStats.steps||0],["HAIES",activeStats.fencesCleared||0],["PRÉC.",`${percent(activeStats.hits,activeStats.darts)}%`],["M",state.legWins[activePlayer?.id]||0]]}/>
      <QuickRow players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} ticker={tickerSteeple} onPlayers={()=>setPlayersOpen(true)} onStats={()=>setStatsOpen(true)} onLog={()=>setLogOpen(true)} onRanking={()=>setRankingOpen(true)} onUndo={()=>{if(currentThrow.length){setCurrentThrow((v:UIDart[])=>v.slice(0,-1));setNotice("Dernière fléchette retirée");}else doUndo();}} undoDisabled={!currentThrow.length&&!undo.length} undoTitle={currentThrow.length?"Retirer la dernière fléchette":"Annuler la dernière action validée"}/>
    </div><div className="party-mode__input">{!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={()=>{setCurrentThrow([]);setMultiplier(1)}} preferredMethod={config.scoreInputMethod} minDartsToValidate={previewFinished?1:3} dartDecorator={ringDecorator} guideSegmentNumbers={steepleInputGuide.segments} guideBull={steepleInputGuide.bull} guideMultiplier={steepleInputGuide.mult} guideLabel={steepleInputGuide.label} dartboardGuideTargets={steepleInputGuide.targets} centerSlot={<ModeInputGuideBadge accent={targetColor} label={previewTarget?.fence?"HAIE":previewTarget?.kind==="bull"?"ARRIVÉE":"PROCHAINE"} value={previewTarget?.label||activeTarget.label} sub={previewTarget?.fence?"TRIPLE OBLIGATOIRE":previewTarget?.kind==="bull"?"FERME LA COURSE":"AVANCE DÈS LA TOUCHE"}/>} validateLabel={previewFinished?"ARRIVÉE !":currentThrow.length<3?`VOLÉE ${currentThrow.length}/3 · +${previewHits}`:previewHits?`AVANCER +${previewHits}`:"VALIDER 0"} accent={targetColor} fitMinScale={0.16}/>:<BotTurn profile={activeProfile} name={activePlayer?.name} accent={targetColor} text={`court vers ${activeTarget.label}…`} icon={activeTarget.fence?"🚧":"🏁"}/>}</div></div></main>
    {playersOpen?<PlayersModal rows={playersRows} onClose={()=>setPlayersOpen(false)}/>:null}{statsOpen?<StatsModal items={statsItems} accent={targetColor} subtitle={activePlayer?.name} onClose={()=>setStatsOpen(false)}/>:null}{logOpen?<LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={dartLabel} title="JOURNAL STEEPLECHASE" onClose={()=>setLogOpen(false)}/>:null}{rankingOpen?<RankingModal rows={rankingRows} title="CLASSEMENT STEEPLECHASE" onClose={()=>setRankingOpen(false)}/>:null}
  </div>;
}
