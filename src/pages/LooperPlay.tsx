// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import tickerLooper from "../assets/tickers/ticker_looper.webp";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { playNewModeDartSequence, playNewModeDartSfx, playNewModeSfx, unlockNewModeAudio } from "../lib/newModesArcadeSfx";
import { commitPremiumPartyProgress } from "../lib/premiumPartyProgress";
import {
  assignLooperTarget, cloneLooperState, createLooperState, looperDartMatchesTarget, looperTargetFromDart,
  looperTargetLabel, normalizeLooperConfig, pickLooperBotDarts, playLooperVisit, type LooperState,
} from "../lib/gameEngines/looperEngine";
import { NewModeInput, dartLabel, isBotProfile, lastEvents, playerName, resolveModeProfiles, uiToGameDart } from "./newModes/newModePlayShared";
import {
  ActiveHero, BotTurn, FloatingAdvice, KpiStrip, LogModal, PlayersModal, PremiumAwenaButton,
  GameplayMission, PremiumEndPanel, PremiumMomentOverlay, QuickRow, RankingModal, StatsModal, SummaryStrip, bestBy, modePlayerColors, percent,
} from "./newModes/PremiumPartyModeUi";
import "./newModes/PremiumPartyModeUi.css";
import { LooperGameplayVisual, ModeInputGuideBadge } from "./newModes/ModeGameplayVisuals";
import "./newModes/ModeGameplayVisuals.css";
import { looperGameplayMoment } from "./newModes/NewFourModeGameplayFeedback";

const ACCENT="#8ff7ff", ACCENT2="#da66ff", GREEN="#72efb1", DANGER="#ff6a77", GOLD="#ffd66a";

function coachText(state:LooperState,activePlayer:any){
  if(!activePlayer)return "";
  if(state.phase==="assignment")return "La première zone fixe toute la boucle : choisis une cible que tu sais reconnaître et exploiter.";
  const lives=Number(state.lives?.[activePlayer.id]||0),shields=Number(state.shields?.[activePlayer.id]||0),target=looperTargetLabel(state.currentTarget);
  if(lives<=1&&!shields)return `Dernière vie : sécurise ${target} avant de chercher une cible suivante difficile.`;
  if(shields>0)return `Tu as ${shields} bouclier${shields>1?"s":""}. Touche ${target}, puis utilise tes fléchettes restantes pour imposer une cible exigeante.`;
  return `Priorité : toucher ${target}. Après la touche, la dernière zone marquée devient la cible du joueur suivant.`;
}

export default function LooperPlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:true});
  const awena=useAwenaOptional();
  const go=props?.go??props?.setTab,store=props?.store,onFinish=props?.onFinish,resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeLooperConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);
  const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const recoveredThrow=resumeRecord?.resume?.currentThrow??resumeRecord?.payload?.currentThrow;
  const recoveredSingleRing=resumeRecord?.resume?.singleRing??resumeRecord?.payload?.singleRing;
  const [state,setState]=React.useState<LooperState>(()=>restored?.mode==="looper"?cloneLooperState(restored):createLooperState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>(()=>Array.isArray(recoveredThrow)?recoveredThrow.slice(0,3):[]);
  const [multiplier,setMultiplier]=React.useState<1|2|3>(()=>{const v=resumeRecord?.resume?.multiplier??resumeRecord?.payload?.multiplier;return v===2||v===3?v:1;});
  const [singleRing,setSingleRing]=React.useState<"inner_single"|"outer_single">(recoveredSingleRing==="outer_single"?"outer_single":"inner_single");
  const [undo,setUndo]=React.useState<LooperState[]>([]),[notice,setNotice]=React.useState(""),[moment,setMoment]=React.useState<any>(null);
  const [progression,setProgression]=React.useState<any>(()=>resumeRecord?.summary?.progression||resumeRecord?.payload?.summary?.progression||null);
  const [playersOpen,setPlayersOpen]=React.useState(false),[statsOpen,setStatsOpen]=React.useState(false),[logOpen,setLogOpen]=React.useState(false),[rankingOpen,setRankingOpen]=React.useState(false);
  const botBusy=React.useRef(false),finishedRef=React.useRef(false),introPlayedRef=React.useRef(false),initialCheckpointRef=React.useRef(false);
  const matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`looper-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const colorById=React.useMemo(()=>modePlayerColors(state.players,ACCENT),[state.players]);
  const activePlayer=state.players[state.activePlayerIndex],activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null;
  const activeColor=activePlayer?colorById.get(String(activePlayer.id))||ACCENT:ACCENT,activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);
  const sfxEnabled=(config as any).sfxEnabled!==false,awenaEnabled=(config as any).awenaEnabled!==false,coachEnabled=(config as any).coachEnabled!==false,firstVisitGuideEnabled=(config as any).firstVisitGuide!==false;
  const nameById=React.useCallback((id:any)=>state.players.find((p:any)=>String(p.id)===String(id))?.name||"Joueur",[state.players]);

  const buildRecord=React.useCallback((s:LooperState,status:"in_progress"|"finished",draft:UIDart[]=currentThrow,draftMultiplier:1|2|3=multiplier,ring=singleRing)=>{
    const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));
    const perPlayer=Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,lives:Number(s.lives[id]||0),shields:Number(s.shields[id]||0),wins:Number(s.legWins[id]||0),accuracy:percent(st.hits,st.darts)}]));
    const ranking=[...s.players].map((p:any,i:number)=>({id:p.id,name:p.name,wins:Number(s.legWins[p.id]||0),lives:Number(s.lives[p.id]||0),hits:Number(s.statsByPlayer[p.id]?.hits||0),streak:Number(s.statsByPlayer[p.id]?.bestHitStreak||0),order:i})).sort((a,b)=>b.wins-a.wins||b.lives-a.lives||b.hits-a.hits||b.streak-a.streak||a.order-b.order);
    return {id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"looper",mode:"looper",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,
      game:{mode:"looper",lives:s.config.rules.lives,seriesWins:s.config.seriesWins},summary:{mode:"looper",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,currentTarget:s.currentTarget,config:s.config,perPlayer,ranking,durationMs:Math.max(0,Number((status==="finished"?(s.finishedAt||Date.now()):Date.now()))-Number(s.startedAt||Date.now())),totalDarts:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0)},
      resume:{mode:"looper",config:s.config,state:cloneLooperState(s),currentThrow:draft.slice(0,3),multiplier:draftMultiplier,singleRing:ring,updatedAt:Date.now()},payload:{kind:"looper",mode:"looper",sport:"darts",config:s.config,stateSnapshot:cloneLooperState(s),currentThrow:draft.slice(0,3),multiplier:draftMultiplier,singleRing:ring,visits:s.visits,visitHistory:s.visits,stats:{mode:"looper",players:s.statsByPlayer,legWins:s.legWins}}};
  },[profiles,currentThrow,multiplier,singleRing]);
  const saveInProgress=React.useCallback(async(s:LooperState,draft:UIDart[]=currentThrow,m:1|2|3=multiplier,ring=singleRing)=>{try{await History.upsert(buildRecord(s,"in_progress",draft,m,ring));}catch(e){console.warn("[LOOPER] checkpoint failed",e);}},[buildRecord,currentThrow,multiplier,singleRing]);
  const persist=React.useCallback((s:LooperState)=>{
    if(s.phase==="finished"){
      if(finishedRef.current)return;
      finishedRef.current=true;
      const progress=commitPremiumPartyProgress({
        mode:"looper",
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
      const rec:any=buildRecord(s,"finished",[],1,singleRing);
      rec.summary={...(rec.summary||{}),progression:progress};
      rec.payload={...(rec.payload||{}),summary:{...(rec.payload?.summary||{}),progression:progress}};
      if(typeof onFinish==="function")onFinish(rec,{navigate:false});
      else void History.upsert(rec).catch(()=>{});
    }else void saveInProgress(s,[],1,singleRing);
  },[buildRecord,onFinish,saveInProgress,profileById,botIds,singleRing]);

  React.useEffect(()=>{if(initialCheckpointRef.current)return;initialCheckpointRef.current=true;if(state.phase!=="finished")void saveInProgress(state,currentThrow,multiplier,singleRing);},[saveInProgress,state,currentThrow,multiplier,singleRing]);
  React.useEffect(()=>{if(state.phase==="finished")return;const t=window.setTimeout(()=>void saveInProgress(state,currentThrow,multiplier,singleRing),180);return()=>window.clearTimeout(t);},[currentThrow,multiplier,singleRing,state.phase,state.activePlayerIndex,saveInProgress]);
  React.useEffect(()=>{if(restored?.mode==="looper"||resumeRecord)return;const start=()=>{if(!sfxEnabled||introPlayedRef.current)return;introPlayedRef.current=true;void unlockNewModeAudio();playNewModeSfx("intro",true)};try{if((navigator as any)?.userActivation?.hasBeenActive){start();return;}}catch{}window.addEventListener("pointerdown",start,{once:true,capture:true} as any);return()=>window.removeEventListener("pointerdown",start,true);},[sfxEnabled]);
  React.useEffect(()=>{awena?.setRuntime?.({route:"looper_play",sport:"darts",mode:"looper",phase:state.phase==="finished"?"summary":"play",inGame:state.phase!=="finished",screenLabel:"LOOPER · Partie",playerName:activePlayer?.name,extra:{target:looperTargetLabel(state.currentTarget),lives:state.lives?.[activePlayer?.id],shields:state.shields?.[activePlayer?.id],leg:Number(state.legIndex||0)+1,visit:Number(state.turnIndex||0)+1,awenaRememberedMode:"looper",awenaKnowledgeTopic:"screen:looper_play"}});},[awena,state.phase,state.legIndex,state.turnIndex,state.currentTarget,state.lives,state.shields,activePlayer?.id]);

  const commit=React.useCallback((next:LooperState,previous=state,forcedNotice?:string)=>{const feedback=looperGameplayMoment(previous,next);if(feedback)setMoment(feedback);setUndo(u=>[...u.slice(-39),cloneLooperState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);let msg=forcedNotice||"";if(!msg&&next.phase==="finished"&&next.winnerId){msg=`🏆 ${nameById(next.winnerId)} remporte LOOPER !`;playNewModeSfx("victory",sfxEnabled);}else if(!msg&&next.legIndex>previous.legIndex&&next.lastLegWinnerId)msg=`♾ ${nameById(next.lastLegWinnerId)} reste seul en vie`;else if(!msg)msg=lastEvents(next.visits).join(" · ");setNotice(msg);persist(next);},[state,nameById,persist,sfxEnabled]);
  const validate=()=>{if(!currentThrow.length||state.phase==="finished"||activeIsBot)return;if(state.phase==="assignment"){if(!looperAssignmentValid){setNotice("Une MISS ne peut pas devenir la cible de départ. Annule et rejoue une zone de la cible.");return;}commit(assignLooperTarget(state,uiToGameDart(currentThrow[0])));return;}commit(playLooperVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>{setMoment(null);setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneLooperState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière action annulée");finishedRef.current=false;void saveInProgress(prev,[],1,singleRing);return u.slice(0,-1);});};
  const setThrowWithSfx=React.useCallback((update:any)=>setCurrentThrow((prev:UIDart[])=>{const next=(typeof update==="function"?update(prev):update)||prev;const cap=state.phase==="assignment"?1:3;const out=Array.isArray(next)?next.slice(0,cap):prev;if(out.length>prev.length)out.slice(prev.length).forEach((d:any,i:number)=>window.setTimeout(()=>playNewModeDartSfx(d,sfxEnabled),i*120));return out;}),[state.phase,sfxEnabled]);
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{const darts=pickLooperBotDarts(state,config.botLevel);const span=playNewModeDartSequence(darts,sfxEnabled);window.setTimeout(()=>{try{if(state.phase==="assignment")commit(assignLooperTarget(state,darts[0]));else commit(playLooperVisit(state,darts));}finally{botBusy.current=false;}},span+100);}catch{botBusy.current=false;}},620);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);
  function replay(){setMoment(null);matchIdRef.current=`looper-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setProgression(null);setCurrentThrow([]);setMultiplier(1);const next=createLooperState(players,config);setState(next);initialCheckpointRef.current=true;void saveInProgress(next,[],1,singleRing);if(sfxEnabled)playNewModeSfx("intro",true);}

  const legTarget=config.seriesWins*2-1,targetLabel=looperTargetLabel(state.currentTarget),activeStats=state.statsByPlayer[activePlayer?.id]||{};
  const previewDarts=currentThrow.map(uiToGameDart),looperAssignmentValid=state.phase!=="assignment"||!!(previewDarts[0]?.bed&&previewDarts[0].bed!=="MISS"),previewHitIndex=state.phase==="playing"?previewDarts.findIndex((d:any)=>looperDartMatchesTarget(d,state.currentTarget,config.rules.exactSegment)):-1;
  const afterHit=previewHitIndex>=0?previewDarts.slice(previewHitIndex+1).filter((d:any)=>d?.bed&&d.bed!=="MISS"):[],previewNext=previewHitIndex>=0&&afterHit.length?looperTargetFromDart(afterHit[afterHit.length-1],state.currentTarget):state.currentTarget;
  const ringDecorator=(d:UIDart)=>{if((d as any)?.label)return d;if(Number(d?.v)>=1&&Number(d?.v)<=20&&Number(d?.mult)===1)return{...d,label:singleRing};return d;};
  const lives=Number(state.lives?.[activePlayer?.id]||0),shields=Number(state.shields?.[activePlayer?.id]||0),firstVisitGuide=firstVisitGuideEnabled&&!activeIsBot&&state.turnIndex===0&&(state.visits?.length||0)===0&&currentThrow.length===0,coach=firstVisitGuide?(state.phase==="assignment"?"1 · Lance une fléchette pour fixer la première zone. 2 · Cette zone devient la cible exacte de la boucle. 3 · Les joueurs suivants devront la toucher avant de pouvoir poser la suivante.":`1 · Vise exactement ${targetLabel}. 2 · Dès que tu la touches, les fléchettes restantes servent à poser la prochaine cible. 3 · Si tu rates les 3, tu perds une vie.`):coachEnabled&&!activeIsBot?coachText(state,activePlayer):"";
  const rankingRows=React.useMemo(()=>[...state.players].map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;return{id:String(p.id),name:p.name,profile:profileById.get(String(p.id))||p,color,wins:Number(state.legWins[p.id]||0),lives:Number(state.lives[p.id]||0),hits:Number(st.hits||0),streak:Number(st.bestHitStreak||0),subtitle:`${state.lives[p.id]||0} vie(s) · ${st.hits||0} touches · best ${st.bestHitStreak||0}`,value:Number(state.legWins[p.id]||0),suffix:" M",order:i};}).sort((a,b)=>b.wins-a.wins||b.lives-a.lives||b.hits-a.hits||b.streak-a.streak||a.order-b.order),[state.players,state.legWins,state.lives,state.statsByPlayer,profileById,colorById]);
  const playersRows=state.players.map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;return{id:p.id,name:p.name,profile:profileById.get(String(p.id))||p,color,active:i===state.activePlayerIndex,status:Number(state.lives[p.id]||0)>0?`CIBLE ${targetLabel}`:"ÉLIMINÉ",progress:Number(state.lives[p.id]||0),progressMax:config.rules.lives,metrics:[{label:"VIES",value:state.lives[p.id]||0},{label:"HITS",value:st.hits||0},{label:"SHIELD",value:state.shields[p.id]||0},{label:"M",value:state.legWins[p.id]||0}]};});
  const statsItems=[{label:"VIES",value:lives,color:lives<=1?DANGER:activeColor},{label:"BOUCLIERS",value:shields,color:GOLD},{label:"TOUCHES",value:activeStats.hits||0,color:GREEN},{label:"PRÉCISION",value:`${percent(activeStats.hits,activeStats.darts)}%`},{label:"BOUCLES SAUVÉES",value:activeStats.loopsSurvived||0},{label:"CIBLES POSÉES",value:activeStats.targetsSet||0,color:ACCENT2},{label:"BEST SÉRIE",value:activeStats.bestHitStreak||0},{label:"VIES PERDUES",value:activeStats.lifeLosses||0,color:DANGER},{label:"SHIELDS GAGNÉS",value:activeStats.shieldsEarned||0},{label:"SHIELDS UTILISÉS",value:activeStats.shieldsUsed||0},{label:"BULL TARGETS",value:activeStats.bullTargets||0},{label:"DARTS",value:activeStats.darts||0}];
  const awards=React.useMemo(()=>{const rows=rankingRows.map((r:any)=>({...r,st:state.statsByPlayer[r.id]||{}}));const accurate=bestBy(rows,r=>percent(r.st.hits,r.st.darts));const streak=bestBy(rows,r=>Number(r.st.bestHitStreak||0));const setter=bestBy(rows,r=>Number(r.st.targetsSet||0));return[{icon:"🎯",label:"PRÉCISION",name:accurate?.name||"—",value:`${percent(accurate?.st?.hits,accurate?.st?.darts)}%`,color:accurate?.color},{icon:"∞",label:"BEST SÉRIE",name:streak?.name||"—",value:`${streak?.st?.bestHitStreak||0}`,color:streak?.color},{icon:"🧠",label:"POSEUR",name:setter?.name||"—",value:`${setter?.st?.targetsSet||0} cibles`,color:setter?.color}];},[rankingRows,state.statsByPlayer]);
  const totalDarts=Object.values(state.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0),durationMs=Math.max(0,Number((state.finishedAt||Date.now()))-Number(state.startedAt||Date.now()));
  const targetText=state.phase==="assignment"?(currentThrow.length&&!looperAssignmentValid?"MISS impossible comme cible de départ · annule et rejoue":"1 fléchette fixe la cible de départ"):previewHitIndex>=0?`Touchée à la fléchette ${previewHitIndex+1} · prochaine : ${looperTargetLabel(previewNext)}`:`Tu as 3 fléchettes pour toucher ${targetLabel}`;
  const missionLooper=state.phase==="assignment"?(!currentThrow.length?{icon:"∞",title:"Pose une vraie zone de départ",text:"Ta première fléchette définit la cible exacte de la boucle. Une MISS ne peut pas être utilisée comme cible.",chips:["1 FLÉCHETTE","ZONE EXACTE","PAS DE MISS"],tone:"normal"}:looperAssignmentValid?{icon:"✓",title:`Cible prête · ${looperTargetLabel(looperTargetFromDart(previewDarts[0],state.currentTarget))}`,text:"Valide : cette zone devient la première cible à reproduire.",chips:[dartLabel(currentThrow[0]),"FIXER LA CIBLE"],tone:"success"}:{icon:"✕",title:"MISS impossible comme cible",text:"Annule cette saisie puis joue une zone réelle de la cible pour lancer la boucle.",chips:["ANNULER","REJOUER UNE ZONE"],tone:"danger"}):previewHitIndex>=0?{icon:"✓",title:`${targetLabel} touchée`,text:afterHit.length?`La dernière fléchette marquée après la touche imposera ${looperTargetLabel(previewNext)} au joueur suivant.`:"Tu es sauvé. Sans autre zone marquée, la cible restera identique pour le joueur suivant.",chips:[`TOUCHÉ F${previewHitIndex+1}`,`PROCHAINE ${looperTargetLabel(previewNext)}`,`${lives} VIE${lives>1?"S":""}`],tone:"success"}:currentThrow.length>=3?{icon:shields>0?"🛡":"♥",title:shields>0?"Le bouclier va te sauver":"Une vie va être perdue",text:`Aucune des 3 fléchettes n’a touché ${targetLabel}.`,chips:[`CIBLE ${targetLabel}`,shields>0?"BOUCLIER -1":"VIE -1"],tone:"danger"}:{icon:"🎯",title:`Touche exactement ${targetLabel}`,text:`Il te reste ${3-currentThrow.length} fléchette${3-currentThrow.length>1?"s":""}. Dès la touche, les fléchettes restantes servent à poser la prochaine cible.`,chips:[`CIBLE ${targetLabel}`,`${3-currentThrow.length} ESSAI${3-currentThrow.length>1?"S":""}`,`${lives} VIE${lives>1?"S":""}`],tone:"normal"};
  const looperInputGuide=React.useMemo(()=>{
    if(state.phase==="assignment")return{segments:[],bull:false,mult:null,targets:[],label:"POSE UNE CIBLE"};
    const t:any=state.currentTarget||{};
    if(t.bed==="IB")return{segments:[],bull:true,mult:null,targets:[{ring:"dbull"}],label:"VISE DBULL"};
    if(t.bed==="OB")return{segments:[],bull:true,mult:null,targets:[{ring:"bull"}],label:"VISE BULL"};
    const n=Number(t.number||0),exact=config.rules.exactSegment!==false;
    if(!n)return{segments:[],bull:false,mult:null,targets:[],label:`VISE ${targetLabel}`};
    if(!exact)return{segments:[n],bull:false,mult:null,targets:[{segment:n,ring:"number"}],label:`VISE ${n}`};
    const ring=t.bed==="D"?"double":t.bed==="T"?"triple":(t.ring==="inner_single"?"inner_single":t.ring==="outer_single"?"outer_single":"single");
    return{segments:[n],bull:false,mult:t.bed==="D"?2:t.bed==="T"?3:1,targets:[{segment:n,ring}],label:`VISE ${targetLabel}`};
  },[state.phase,state.currentTarget,config.rules.exactSegment,targetLabel]);

  if(state.phase==="finished")return <div className="party-mode" style={{["--mode-accent" as any]:ACCENT}} data-mss-native-play-layout="1"><PageHeader tickerSrc={tickerLooper} tickerAlt="LOOPER" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("looper_config")} color={ACCENT} glow={`${ACCENT}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="looper_play" mode="looper" screenLabel="LOOPER · Partie" accent={ACCENT}/></div>:null}/><div style={{flex:"1 1 auto",minHeight:0,overflow:"auto"}}><PremiumEndPanel title="LOOPER" accent={ACCENT} winnerId={state.winnerId} rankingRows={rankingRows} durationMs={durationMs} totalDarts={totalDarts} awards={awards} progression={progression ? {...progression, winnerCareer: progression.byPlayer?.[String(state.winnerId || "")] || null} : null} onReplay={replay} onStats={()=>go?.("statsHub",{mode:"active",initialStatsSubTab:"looper",playerId:state.winnerId||state.players[0]?.id,focusMatchId:matchIdRef.current})} onHistory={()=>go?.("statsHub",{tab:"history",mode:"active",initialStatsSubTab:"history",focusMatchId:matchIdRef.current})} onConfig={()=>go?.("looper_config")} onGames={()=>go?.("games",{gamesView:"all"})}/></div></div>;

  return <div className="party-mode" style={{["--mode-accent" as any]:activeColor}} data-mss-native-play-layout="1">
    <PageHeader tickerSrc={tickerLooper} tickerAlt="LOOPER" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("looper_config")} color={activeColor} glow={`${activeColor}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="looper_play" mode="looper" screenLabel="LOOPER · Partie" accent={activeColor}/></div>:null}/>
    {moment?<PremiumMomentOverlay moment={moment} accent={activeColor} profile={profileById.get(String(moment.playerId||""))} playerName={nameById(moment.playerId)}/>:null}
    {coach?<FloatingAdvice text={coach} accent={activeColor} kicker={firstVisitGuide?"PREMIER TOUR · MODE D’EMPLOI":"CONSEIL TACTIQUE"}/>:null}
    <main className="party-mode__body"><div className="party-mode__stage"><div className="party-mode__left">
      <SummaryStrip players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} winsById={state.legWins} primaryById={(id:string)=>state.lives[id]||0} secondaryById={(id:string)=>`${state.shields[id]||0} bouclier · ${state.statsByPlayer[id]?.hits||0} hits`}/>
      <ActiveHero profile={activeProfile} name={activePlayer?.name} accent={activeColor} eyebrow={`MANCHE ${state.legIndex+1} · BO${legTarget} · ${state.phase==="assignment"?"SETUP":"VOLÉE "+(state.turnIndex+1)}`} primary={state.phase==="assignment"?"SET":targetLabel} secondary={targetText} tertiary={`${lives} vie${lives>1?"s":""} · ${shields} bouclier${shields>1?"s":""} · ${percent(activeStats.hits,activeStats.darts)}% précision`} progress={lives} progressMax={config.rules.lives} notice={notice} noticeTone={notice.includes("🏆")?"win":lives<=1?"danger":"normal"} aside={<div style={{textAlign:"center"}}><div style={{fontSize:32,fontWeight:1100,color:previewHitIndex>=0?GREEN:activeColor}}>{previewHitIndex>=0?"✓":"∞"}</div><div style={{fontSize:9,color:activeColor,marginTop:4}}>{state.phase==="assignment"?"DÉPART":targetLabel}</div></div>}/>
      {!activeIsBot?<GameplayMission accent={activeColor} icon={missionLooper.icon} title={missionLooper.title} text={missionLooper.text} chips={missionLooper.chips} tone={missionLooper.tone}/>:null}
      <LooperGameplayVisual accent={activeColor} currentThrow={currentThrow} phase={state.phase} targetLabel={targetLabel} hitIndex={previewHitIndex} nextTargetLabel={looperTargetLabel(previewNext)} lives={lives} shields={shields}/>
      <KpiStrip accent={activeColor} onClick={()=>setStatsOpen(true)} items={[["VIES",lives],["HITS",activeStats.hits||0],["PRÉC.",`${percent(activeStats.hits,activeStats.darts)}%`],["M",state.legWins[activePlayer?.id]||0]]}/>
      <QuickRow players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} ticker={tickerLooper} onPlayers={()=>setPlayersOpen(true)} onStats={()=>setStatsOpen(true)} onLog={()=>setLogOpen(true)} onRanking={()=>setRankingOpen(true)} onUndo={()=>{if(currentThrow.length){setCurrentThrow((v:UIDart[])=>v.slice(0,-1));setNotice("Dernière fléchette retirée");}else doUndo();}} undoDisabled={!currentThrow.length&&!undo.length} undoTitle={currentThrow.length?"Retirer la dernière fléchette":"Annuler la dernière action validée"}/>
    </div><div className="party-mode__input">{!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={()=>{setCurrentThrow([]);setMultiplier(1)}} preferredMethod={config.scoreInputMethod} dartDecorator={ringDecorator} minDartsToValidate={state.phase==="assignment"?(looperAssignmentValid?1:2):3} guideSegmentNumbers={looperInputGuide.segments} guideBull={looperInputGuide.bull} guideMultiplier={looperInputGuide.mult} guideLabel={looperInputGuide.label} dartboardGuideTargets={looperInputGuide.targets} centerSlot={<ModeInputGuideBadge accent={activeColor} label={state.phase==="assignment"?"POSE":"CIBLE"} value={state.phase==="assignment"?"1 FLÉCHETTE":targetLabel} sub={state.phase==="assignment"?"ELLE DEVIENT LA CIBLE":"ZONE EXACTE"}/>} validateLabel={state.phase==="assignment"?(currentThrow[0]?(looperAssignmentValid?`FIXER ${dartLabel(currentThrow[0])}`:"MISS · ANNULER"):"FIXER LA CIBLE"):currentThrow.length<3?(previewHitIndex>=0?`TOUCHÉ · ENCORE ${3-currentThrow.length}`:`VOLÉE ${currentThrow.length}/3`):previewHitIndex>=0?`VALIDER → ${looperTargetLabel(previewNext)}`:(shields>0?"UTILISER BOUCLIER":"PERDRE 1 VIE")} accent={activeColor} maxDarts={state.phase==="assignment"?1:3} fitMinScale={0.16} keypadSecondaryAction={config.scoreInputMethod==="keypad"?{icon:singleRing==="inner_single"?"S-IN":"S-OUT",title:singleRing==="inner_single"?"Petit simple intérieur":"Grand simple extérieur",active:true,tone:"teal",onClick:()=>setSingleRing(v=>v==="inner_single"?"outer_single":"inner_single")}:null}/>:<BotTurn profile={activeProfile} name={activePlayer?.name} accent={activeColor} text={state.phase==="assignment"?"fixe la première cible…":`cherche ${targetLabel}…`} icon="∞"/>}</div></div></main>
    {playersOpen?<PlayersModal rows={playersRows} onClose={()=>setPlayersOpen(false)}/>:null}{statsOpen?<StatsModal items={statsItems} accent={activeColor} subtitle={activePlayer?.name} onClose={()=>setStatsOpen(false)}/>:null}{logOpen?<LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={dartLabel} title="JOURNAL LOOPER" onClose={()=>setLogOpen(false)}/>:null}{rankingOpen?<RankingModal rows={rankingRows} title="CLASSEMENT LOOPER" onClose={()=>setRankingOpen(false)}/>:null}
  </div>;
}
