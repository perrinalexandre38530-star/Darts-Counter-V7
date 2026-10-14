// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import ticker51 from "../assets/tickers/ticker_51_by_5.webp";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { playNewModeDartSequence, playNewModeDartSfx, playNewModeSfx, unlockNewModeAudio } from "../lib/newModesArcadeSfx";
import { commitPremiumPartyProgress } from "../lib/premiumPartyProgress";
import {
  cloneFiftyOneByFiveState,
  createFiftyOneByFiveState,
  evaluateFiftyOneVisit,
  normalizeFiftyOneByFiveConfig,
  pickFiftyOneByFiveBotDarts,
  playFiftyOneByFiveVisit,
  type FiftyOneByFiveState,
} from "../lib/gameEngines/fiftyOneByFiveEngine";
import { NewModeInput, dartLabel, isBotProfile, lastEvents, playerName, resolveModeProfiles, uiToGameDart } from "./newModes/newModePlayShared";
import {
  ActiveHero, BotTurn, FloatingAdvice, KpiStrip, LogModal, PlayersModal, PremiumAwenaButton,
  PremiumEndPanel, PremiumMomentOverlay, QuickRow, RankingModal, StatsModal, SummaryStrip, bestBy, modePlayerColors, percent,
} from "./newModes/PremiumPartyModeUi";
import "./newModes/PremiumPartyModeUi.css";
import { FiftyOneByFiveGameplayVisual } from "./newModes/ModeGameplayVisuals";
import "./newModes/ModeGameplayVisuals.css";
import { fiftyOneGameplayMoment } from "./newModes/NewFourModeGameplayFeedback";

const ACCENT="#ffd34d", ACCENT2="#42e6c2", GREEN="#72efb1", RED="#ff6b67";

function coachText(state:FiftyOneByFiveState, activePlayer:any){
  if(!activePlayer)return "";
  const score=Number(state.scores?.[activePlayer.id]||0), remain=Math.max(0,Number(state.config.rules.target||51)-score);
  if(remain<=8)return `Fin proche : il te reste ${remain}. Construis une volée totale de ${remain*5} pour terminer exactement.`;
  const st=state.statsByPlayer?.[activePlayer.id]||{};
  if(Number(st.busts||0)>=2)return "Évite de forcer la sortie : une volée divisible par 5 mais trop haute provoque un bust.";
  if(Number(st.bestValidStreak||0)>=3)return `Bonne série : ${st.bestValidStreak} volées valides consécutives. Reste sur des totaux sûrs, divisibles par 5.`;
  return "Cherche d'abord un total sûr divisible par 5. Les 25, 50 et combinaisons en multiples de 5 sont tes meilleurs repères.";
}

export default function FiftyOneByFivePlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:true});
  const awena=useAwenaOptional();
  const go=props?.go??props?.setTab,store=props?.store,onFinish=props?.onFinish,resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeFiftyOneByFiveConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);
  const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const recoveredThrow=resumeRecord?.resume?.currentThrow??resumeRecord?.payload?.currentThrow;
  const [state,setState]=React.useState<FiftyOneByFiveState>(()=>restored?.mode==="fifty_one_by_five"?cloneFiftyOneByFiveState(restored):createFiftyOneByFiveState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>(()=>Array.isArray(recoveredThrow)?recoveredThrow.slice(0,3):[]);
  const [multiplier,setMultiplier]=React.useState<1|2|3>(()=>{const v=resumeRecord?.resume?.multiplier??resumeRecord?.payload?.multiplier;return v===2||v===3?v:1;});
  const [undo,setUndo]=React.useState<FiftyOneByFiveState[]>([]),[notice,setNotice]=React.useState(""),[moment,setMoment]=React.useState<any>(null);
  const [progression,setProgression]=React.useState<any>(()=>resumeRecord?.summary?.progression||resumeRecord?.payload?.summary?.progression||null);
  const [playersOpen,setPlayersOpen]=React.useState(false),[statsOpen,setStatsOpen]=React.useState(false),[logOpen,setLogOpen]=React.useState(false),[rankingOpen,setRankingOpen]=React.useState(false);
  const botBusy=React.useRef(false),finishedRef=React.useRef(false),introPlayedRef=React.useRef(false),initialCheckpointRef=React.useRef(false);
  const matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`51by5-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const colorById=React.useMemo(()=>modePlayerColors(state.players,ACCENT),[state.players]);
  const activePlayer=state.players[state.activePlayerIndex],activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null;
  const activeColor=activePlayer?colorById.get(String(activePlayer.id))||ACCENT:ACCENT;
  const activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);
  const sfxEnabled=(config as any).sfxEnabled!==false,awenaEnabled=(config as any).awenaEnabled!==false,coachEnabled=(config as any).coachEnabled!==false,firstVisitGuideEnabled=(config as any).firstVisitGuide!==false;
  const nameById=React.useCallback((id:any)=>state.players.find((p:any)=>String(p.id)===String(id))?.name||"Joueur",[state.players]);

  const buildRecord=React.useCallback((s:FiftyOneByFiveState,status:"in_progress"|"finished",draft:UIDart[]=currentThrow,draftMultiplier:1|2|3=multiplier)=>{
    const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));
    const perPlayer=Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,score:Number(s.scores[id]||0),wins:Number(s.legWins[id]||0),accuracy:percent(st.validVisits,st.visits)}]));
    const ranking=[...s.players].map((p:any,i:number)=>({id:p.id,name:p.name,wins:Number(s.legWins[p.id]||0),score:Number(s.scores[p.id]||0),valid:Number(s.statsByPlayer[p.id]?.validVisits||0),best:Number(s.statsByPlayer[p.id]?.bestQuotient||0),order:i})).sort((a,b)=>b.wins-a.wins||b.score-a.score||b.valid-a.valid||b.best-a.best||a.order-b.order);
    return {id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"fifty_one_by_five",mode:"fifty_one_by_five",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,
      game:{mode:"fifty_one_by_five",target:s.config.rules.target,seriesWins:s.config.seriesWins},summary:{mode:"fifty_one_by_five",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,config:s.config,perPlayer,ranking,durationMs:Math.max(0,Number((status==="finished"?(s.finishedAt||Date.now()):Date.now()))-Number(s.startedAt||Date.now())),totalDarts:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0)},
      resume:{mode:"fifty_one_by_five",config:s.config,state:cloneFiftyOneByFiveState(s),currentThrow:draft.slice(0,3),multiplier:draftMultiplier,updatedAt:Date.now()},payload:{kind:"fifty_one_by_five",mode:"fifty_one_by_five",sport:"darts",config:s.config,stateSnapshot:cloneFiftyOneByFiveState(s),currentThrow:draft.slice(0,3),multiplier:draftMultiplier,visits:s.visits,visitHistory:s.visits,stats:{mode:"fifty_one_by_five",players:s.statsByPlayer,legWins:s.legWins}}};
  },[profiles,currentThrow,multiplier]);
  const saveInProgress=React.useCallback(async(s:FiftyOneByFiveState,draft:UIDart[]=currentThrow,m:1|2|3=multiplier)=>{try{await History.upsert(buildRecord(s,"in_progress",draft,m));}catch(e){console.warn("[51 BY 5] checkpoint failed",e);}},[buildRecord,currentThrow,multiplier]);
  const persist=React.useCallback((s:FiftyOneByFiveState)=>{
    if(s.phase==="finished"){
      if(finishedRef.current)return;
      finishedRef.current=true;
      const progress=commitPremiumPartyProgress({
        mode:"fifty_one_by_five",
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
  React.useEffect(()=>{if(restored?.mode==="fifty_one_by_five"||resumeRecord)return;const start=()=>{if(!sfxEnabled||introPlayedRef.current)return;introPlayedRef.current=true;void unlockNewModeAudio();playNewModeSfx("intro",true)};try{if((navigator as any)?.userActivation?.hasBeenActive){start();return;}}catch{}window.addEventListener("pointerdown",start,{once:true,capture:true} as any);return()=>window.removeEventListener("pointerdown",start,true);},[sfxEnabled]);
  React.useEffect(()=>{awena?.setRuntime?.({route:"fifty_one_by_five_play",sport:"darts",mode:"fifty_one_by_five",phase:state.phase==="finished"?"summary":"play",inGame:state.phase!=="finished",screenLabel:"51 BY 5 · Partie",playerName:activePlayer?.name,extra:{score:state.scores?.[activePlayer?.id],target:state.config.rules.target,leg:Number(state.legIndex||0)+1,visit:Number(state.turnIndex||0)+1,awenaRememberedMode:"fifty_one_by_five",awenaKnowledgeTopic:"screen:fifty_one_by_five_play"}});},[awena,state.phase,state.legIndex,state.turnIndex,state.scores,activePlayer?.id]);

  const commit=React.useCallback((next:FiftyOneByFiveState,previous=state,forcedNotice?:string)=>{const feedback=fiftyOneGameplayMoment(previous,next);if(feedback)setMoment(feedback);setUndo(u=>[...u.slice(-39),cloneFiftyOneByFiveState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);let msg=forcedNotice||"";if(!msg&&next.phase==="finished"&&next.winnerId){msg=`🏆 ${nameById(next.winnerId)} remporte 51 BY 5 !`;playNewModeSfx("victory",sfxEnabled);}else if(!msg&&next.legIndex>previous.legIndex&&next.lastLegWinnerId)msg=`🎯 ${nameById(next.lastLegWinnerId)} remporte la manche ${previous.legIndex+1}`;else if(!msg)msg=lastEvents(next.visits).join(" · ");setNotice(msg);persist(next);},[state,nameById,persist,sfxEnabled]);
  const validate=()=>{if(!currentThrow.length||state.phase==="finished"||activeIsBot)return;commit(playFiftyOneByFiveVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>{setMoment(null);setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneFiftyOneByFiveState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière volée annulée");finishedRef.current=false;void saveInProgress(prev,[],1);return u.slice(0,-1);});};
  const setThrowWithSfx=React.useCallback((update:any)=>setCurrentThrow((prev:UIDart[])=>{const next=(typeof update==="function"?update(prev):update)||prev;const out=Array.isArray(next)?next.slice(0,3):prev;if(out.length>prev.length)out.slice(prev.length).forEach((d:any,i:number)=>window.setTimeout(()=>playNewModeDartSfx(d,sfxEnabled),i*120));return out;}),[sfxEnabled]);
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{const darts=pickFiftyOneByFiveBotDarts(state,config.botLevel);const span=playNewModeDartSequence(darts,sfxEnabled);window.setTimeout(()=>{try{commit(playFiftyOneByFiveVisit(state,darts));}finally{botBusy.current=false;}},span+100);}catch{botBusy.current=false;}},620);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);
  function replay(){setMoment(null);matchIdRef.current=`51by5-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setProgression(null);setCurrentThrow([]);setMultiplier(1);const next=createFiftyOneByFiveState(players,config);setState(next);initialCheckpointRef.current=true;void saveInProgress(next,[],1);if(sfxEnabled)playNewModeSfx("intro",true);}

  const legTarget=config.seriesWins*2-1,activeScore=Number(state.scores[activePlayer?.id]||0),remaining=Math.max(0,config.rules.target-activeScore),activeStats=state.statsByPlayer[activePlayer?.id]||{};
  const previewDarts=currentThrow.map(uiToGameDart),preview=evaluateFiftyOneVisit(previewDarts,config),projected=activeScore+preview.dividedScore,previewBust=preview.valid&&projected>config.rules.target;
  const firstVisitGuide=firstVisitGuideEnabled&&!activeIsBot&&state.turnIndex===0&&(state.visits?.length||0)===0&&currentThrow.length===0;
  const coach=firstVisitGuide?"1 · Saisis tes 3 fléchettes. 2 · Regarde TOTAL BRUT ÷ 5 dans le bloc central. 3 · Si VOLÉE VALIDE, valide pour ajouter le quotient à ton score.":coachEnabled&&!activeIsBot?coachText(state,activePlayer):"";
  const rankingRows=React.useMemo(()=>[...state.players].map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;return{id:String(p.id),name:p.name,profile:profileById.get(String(p.id))||p,color,wins:Number(state.legWins[p.id]||0),score:Number(state.scores[p.id]||0),valid:Number(st.validVisits||0),best:Number(st.bestQuotient||0),subtitle:`${state.scores[p.id]||0}/${config.rules.target} · ${percent(st.validVisits,st.visits)}% valides`,value:Number(state.legWins[p.id]||0),suffix:" M",order:i};}).sort((a,b)=>b.wins-a.wins||b.score-a.score||b.valid-a.valid||b.best-a.best||a.order-b.order),[state.players,state.legWins,state.scores,state.statsByPlayer,config.rules.target,profileById,colorById]);
  const playersRows=state.players.map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;return{id:p.id,name:p.name,profile:profileById.get(String(p.id))||p,color,active:i===state.activePlayerIndex,status:`RESTE ${Math.max(0,config.rules.target-Number(state.scores[p.id]||0))}`,progress:Number(state.scores[p.id]||0),progressMax:config.rules.target,metrics:[{label:"SCORE",value:state.scores[p.id]||0},{label:"VALIDES",value:st.validVisits||0},{label:"BEST ÷5",value:st.bestQuotient||0},{label:"M",value:state.legWins[p.id]||0}]};});
  const statsItems=[{label:"SCORE",value:activeScore},{label:"RESTE",value:remaining},{label:"VOLÉES VALIDES",value:activeStats.validVisits||0,color:GREEN},{label:"PRÉCISION",value:`${percent(activeStats.validVisits,activeStats.visits)}%`},{label:"BEST BRUT",value:activeStats.highestRaw||0},{label:"BEST ÷5",value:activeStats.bestQuotient||0,color:ACCENT2},{label:"BEST SÉRIE",value:activeStats.bestValidStreak||0},{label:"BUSTS",value:activeStats.busts||0,color:RED},{label:"INVALIDES",value:activeStats.invalidVisits||0},{label:"BULLS",value:activeStats.bulls||0},{label:"MISS",value:activeStats.misses||0},{label:"DARTS",value:activeStats.darts||0}];
  const awards=React.useMemo(()=>{const rows=rankingRows.map((r:any)=>({...r,st:state.statsByPlayer[r.id]||{}}));const accurate=bestBy(rows,r=>percent(r.st.validVisits,r.st.visits));const raw=bestBy(rows,r=>Number(r.st.highestRaw||0));const quotient=bestBy(rows,r=>Number(r.st.bestQuotient||0));return[{icon:"🎯",label:"RÉGULARITÉ",name:accurate?.name||"—",value:`${percent(accurate?.st?.validVisits,accurate?.st?.visits)}%`,color:accurate?.color},{icon:"🔥",label:"BEST BRUT",name:raw?.name||"—",value:`${raw?.st?.highestRaw||0}`,color:raw?.color},{icon:"➗",label:"BEST ÷5",name:quotient?.name||"—",value:`+${quotient?.st?.bestQuotient||0}`,color:quotient?.color}];},[rankingRows,state.statsByPlayer]);
  const totalDarts=Object.values(state.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0),durationMs=Math.max(0,Number((state.finishedAt||Date.now()))-Number(state.startedAt||Date.now()));
  const previewText=currentThrow.length?(previewBust?`BUST · ${projected} dépasserait ${config.rules.target}`:preview.valid?`${preview.rawTotal} ÷ 5 = +${preview.dividedScore} · projection ${projected}`:config.rules.requireThreeScoringDarts&&currentThrow.length<3?"Complète les 3 fléchettes pour valider":"Total non divisible par 5"):`Objectif exact ${config.rules.target} · reste ${remaining}`;

  if(state.phase==="finished")return <div className="party-mode" style={{["--mode-accent" as any]:ACCENT}} data-mss-native-play-layout="1"><PageHeader tickerSrc={ticker51} tickerAlt="51 BY 5" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("fifty_one_by_five_config")} color={ACCENT} glow={`${ACCENT}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="fifty_one_by_five_play" mode="fifty_one_by_five" screenLabel="51 BY 5 · Partie" accent={ACCENT}/></div>:null}/><div style={{flex:"1 1 auto",minHeight:0,overflow:"auto"}}><PremiumEndPanel title="51 BY 5" accent={ACCENT} winnerId={state.winnerId} rankingRows={rankingRows} durationMs={durationMs} totalDarts={totalDarts} awards={awards} progression={progression ? {...progression, winnerCareer: progression.byPlayer?.[String(state.winnerId || "")] || null} : null} onReplay={replay} onStats={()=>go?.("statsHub",{mode:"active",initialStatsSubTab:"fifty_one_by_five",playerId:state.winnerId||state.players[0]?.id,focusMatchId:matchIdRef.current})} onHistory={()=>go?.("statsHub",{tab:"history",mode:"active",initialStatsSubTab:"history",focusMatchId:matchIdRef.current})} onConfig={()=>go?.("fifty_one_by_five_config")} onGames={()=>go?.("games",{gamesView:"all"})}/></div></div>;

  return <div className="party-mode" style={{["--mode-accent" as any]:activeColor}} data-mss-native-play-layout="1">
    <PageHeader tickerSrc={ticker51} tickerAlt="51 BY 5" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("fifty_one_by_five_config")} color={activeColor} glow={`${activeColor}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="fifty_one_by_five_play" mode="fifty_one_by_five" screenLabel="51 BY 5 · Partie" accent={activeColor}/></div>:null}/>
    {moment?<PremiumMomentOverlay moment={moment} accent={activeColor} profile={profileById.get(String(moment.playerId||""))} playerName={nameById(moment.playerId)}/>:null}
    {coach?<FloatingAdvice text={coach} accent={activeColor} kicker={firstVisitGuide?"PREMIER TOUR · MODE D’EMPLOI":"CONSEIL ÷5"}/>:null}
    <main className="party-mode__body"><div className="party-mode__stage"><div className="party-mode__left">
      <SummaryStrip players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} winsById={state.legWins} primaryById={(id:string)=>state.scores[id]||0} secondaryById={(id:string)=>`reste ${Math.max(0,config.rules.target-Number(state.scores[id]||0))} · ${percent(state.statsByPlayer[id]?.validVisits,state.statsByPlayer[id]?.visits)}% valides`}/>
      <ActiveHero profile={activeProfile} name={activePlayer?.name} accent={activeColor} eyebrow={`MANCHE ${state.legIndex+1} · BO${legTarget} · VOLÉE ${state.turnIndex+1}`} primary={activeScore} primarySuffix={`/${config.rules.target}`} secondary={previewText} tertiary={`${activeStats.validVisits||0} valides · best ÷5 ${activeStats.bestQuotient||0} · ${activeStats.busts||0} bust`} progress={activeScore} progressMax={config.rules.target} notice={notice} noticeTone={notice.includes("🏆")?"win":notice.includes("BUST")?"danger":"normal"} aside={<div style={{textAlign:"center"}}><div style={{fontSize:30,fontWeight:1100,color:previewBust?RED:preview.valid?GREEN:activeColor}}>{currentThrow.length?(previewBust?"BUST":preview.valid?`+${preview.dividedScore}`:"÷5"):remaining}</div><div style={{fontSize:7,color:"#8993a3",marginTop:4}}>{currentThrow.length?`${preview.rawTotal} BRUT`:"RESTANT"}</div></div>}/>
      <FiftyOneByFiveGameplayVisual accent={activeColor} currentThrow={currentThrow} rawTotal={preview.rawTotal} dividedScore={preview.dividedScore} valid={preview.valid} bust={previewBust} activeScore={activeScore} projected={projected} target={config.rules.target} requireThreeScoringDarts={config.rules.requireThreeScoringDarts}/>
      <KpiStrip accent={activeColor} onClick={()=>setStatsOpen(true)} items={[["VALIDES",activeStats.validVisits||0],["PRÉC.",`${percent(activeStats.validVisits,activeStats.visits)}%`],["BEST ÷5",activeStats.bestQuotient||0],["M",state.legWins[activePlayer?.id]||0]]}/>
      <QuickRow players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} ticker={ticker51} onPlayers={()=>setPlayersOpen(true)} onStats={()=>setStatsOpen(true)} onLog={()=>setLogOpen(true)} onRanking={()=>setRankingOpen(true)} onUndo={()=>{if(currentThrow.length){setCurrentThrow((v:UIDart[])=>v.slice(0,-1));setNotice("Dernière fléchette retirée");}else doUndo();}} undoDisabled={!currentThrow.length&&!undo.length} undoTitle={currentThrow.length?"Retirer la dernière fléchette":"Annuler la dernière action validée"}/>
    </div><div className="party-mode__input">{!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={()=>{setCurrentThrow([]);setMultiplier(1)}} preferredMethod={config.scoreInputMethod} minDartsToValidate={config.rules.requireThreeScoringDarts?3:1} validateLabel={currentThrow.length<Math.max(1,config.rules.requireThreeScoringDarts?3:1)?`VOLÉE ${currentThrow.length}/${Math.max(1,config.rules.requireThreeScoringDarts?3:1)}`:previewBust?"VALIDER · BUST":preview.valid?`VALIDER +${preview.dividedScore}`:"VALIDER 0"} accent={activeColor} fitMinScale={0.16}/>:<BotTurn profile={activeProfile} name={activePlayer?.name} accent={activeColor} text="calcule une volée divisible par 5…" icon="➗"/>}</div></div></main>
    {playersOpen?<PlayersModal rows={playersRows} onClose={()=>setPlayersOpen(false)}/>:null}{statsOpen?<StatsModal items={statsItems} accent={activeColor} subtitle={activePlayer?.name} onClose={()=>setStatsOpen(false)}/>:null}{logOpen?<LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={dartLabel} title="JOURNAL 51 BY 5" onClose={()=>setLogOpen(false)}/>:null}{rankingOpen?<RankingModal rows={rankingRows} title="CLASSEMENT 51 BY 5" onClose={()=>setRankingOpen(false)}/>:null}
  </div>;
}
