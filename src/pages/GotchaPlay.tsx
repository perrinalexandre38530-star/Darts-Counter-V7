// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import tickerGotcha from "../assets/tickers/ticker_gotcha.webp";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { playNewModeDartSequence, playNewModeDartSfx, playNewModeSfx, unlockNewModeAudio } from "../lib/newModesArcadeSfx";
import { commitPremiumPartyProgress } from "../lib/premiumPartyProgress";
import { cloneGotchaState, createGotchaState, dartScore, gotchaDartLabel, normalizeGotchaConfig, pickGotchaBotDarts, playGotchaVisit, type GotchaState } from "../lib/gameEngines/gotchaEngine";
import { NewModeInput, isBotProfile, lastEvents, playerName, resolveModeProfiles, uiToGameDart } from "./newModes/newModePlayShared";
import { ActiveHero, AimAssistCard, BotTurn, FloatingAdvice, GameplayMission, KpiStrip, LogModal, PlayersModal, PremiumAwenaButton, PremiumEndPanel, PremiumMomentOverlay, QuickRow, RankingModal, StatsModal, SummaryStrip, TurnOutcomeCard, VisitRoadmap, bestBy, modePlayerColors, percent } from "./newModes/PremiumPartyModeUi";
import { resolvePremiumPartyMoment } from "./newModes/premiumPartyMoments";
import { premiumBotTacticalPlan, resolvePremiumBotBrain } from "../lib/premiumPartyBotAI";
import { adaptPremiumBotBrain } from "../lib/premiumPartyBotMemory";
import { adaptPremiumBotBrainFromScouting, commitPremiumPartyScouting } from "../lib/premiumPartyBotScouting";
import { adaptPremiumBotBrainFromRivalry, commitPremiumPartyRivalry } from "../lib/premiumPartyBotRivalry";
import { premiumPartyTurnOutcome } from "../lib/premiumPartyTurnOutcome";
import { gotchaAimAssist } from "../lib/premiumPartyGameplayAssist";
import "./newModes/PremiumPartyModeUi.css";

const ACCENT="#ff9b31", RED="#ff4d45", BLUE="#58c9ff", GREEN="#6ee7a8";

function GotchaToolIcon({ name }: { name: "players"|"mission"|"route"|"race"|"stats"|"ranking"|"log" }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const common = { width: 21, height: 21, viewBox: "0 0 24 24", "aria-hidden": true } as any;
  if (name === "players") return <svg {...common}><circle {...p} cx="9" cy="8" r="3"/><circle {...p} cx="17" cy="9" r="2.3"/><path {...p} d="M3.5 20a5.5 5.5 0 0 1 11 0M14 15.5a4.5 4.5 0 0 1 6.5 4"/></svg>;
  if (name === "mission") return <svg {...common}><path {...p} d="m13 2-7 11h5l-1 9 8-12h-5z"/></svg>;
  if (name === "route") return <svg {...common}><circle {...p} cx="6" cy="18" r="2"/><circle {...p} cx="18" cy="6" r="2"/><path {...p} d="M7.5 16.5c2.5-4 6-1 8.5-5.5"/></svg>;
  if (name === "race") return <svg {...common}><path {...p} d="M5 21V4M5 5h11l-2.5 4L16 13H5"/></svg>;
  if (name === "stats") return <svg {...common}><path {...p} d="M4 20V9M10 20V4M16 20v-7M22 20V7"/></svg>;
  if (name === "ranking") return <svg {...common}><path {...p} d="M8 5h8v3a4 4 0 0 1-8 0V5ZM6 5H4v2a4 4 0 0 0 4 4M18 5h2v2a4 4 0 0 1-4 4M12 12v3M9 20h6M10 15h4"/></svg>;
  return <svg {...common}><path {...p} d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"/></svg>;
}

function finishHint(remaining:number,outMode:string){
  if(remaining<=0)return"";
  if(outMode==="double"&&remaining<=40&&remaining%2===0)return`D${remaining/2} pour finir`;
  if(outMode==="master"&&remaining<=60&&remaining%3===0)return`T${remaining/3} peut finir`;
  if((outMode==="double"||outMode==="master")&&remaining===50)return"DBULL pour finir";
  if(outMode==="straight"&&remaining<=20)return`S${remaining} pour finir`;
  if(remaining<=60)return`${remaining} points restants`;
  return"Construis ton score sans dépasser la cible";
}

function computeX01StyleFinish(remaining:number,dartsLeft:number,outMode:"straight"|"double"|"master"):{text:string,darts:string[]}|null{
  if(!Number.isFinite(remaining)||remaining<=0||dartsLeft<=0||remaining>180)return null;
  type D={code:string;score:number;kind:"S"|"D"|"T"|"B"};
  const all:D[]=[],doubles:D[]=[],masters:D[]=[];
  for(let n=1;n<=20;n++){
    const si:D={code:`S${n}`,score:n,kind:"S"};
    const d:D={code:`D${n}`,score:n*2,kind:"D"};
    const t:D={code:`T${n}`,score:n*3,kind:"T"};
    all.push(si,d,t);doubles.push(d);masters.push(d,t);
  }
  const sb:D={code:"BULL",score:25,kind:"B"};
  const db:D={code:"DBULL",score:50,kind:"D"};
  all.push(sb,db);doubles.push(db);masters.push(db);
  const lastPool=outMode==="double"?doubles:outMode==="master"?masters:all;
  const triples=[20,19,18,17,16,15,14,13,12,11,10];
  const doublesPref=[20,16,18,10,12,8,6,4,2,1,5,9,14,7,3,11,13,15,17,19,25];
  const penalty=(d:D,last:boolean)=>{
    if(d.code==="BULL")return 40;
    if(d.code==="DBULL")return last?4:22;
    const n=Number(d.code.slice(1));
    if(d.kind==="T"){const i=triples.indexOf(n);return i>=0?i:30+(20-n)*.25;}
    if(d.kind==="D"){const i=doublesPref.indexOf(n);return(last?0:6)+(i>=0?i*.9:40);}
    return 18+(20-n)*.15;
  };
  const lineScore=(line:D[])=>line.length*1000+line.reduce((sum,d,i)=>sum+penalty(d,i===line.length-1),0);
  let best:{line:D[];rank:number}|null=null;
  const validLast=(d:D)=>outMode==="double"?d.kind==="D":outMode==="master"?(d.kind==="D"||d.kind==="T"):true;
  const keep=(line:D[])=>{const rank=lineScore(line);if(!best||rank<best.rank)best={line,rank};};
  const max=Math.min(3,Math.max(1,dartsLeft));
  for(let used=1;used<=max;used++){
    if(used===1){for(const a of lastPool)if(a.score===remaining&&validLast(a))keep([a]);}
    else if(used===2){for(const a of all)for(const b of lastPool)if(a.score+b.score===remaining&&validLast(b))keep([a,b]);}
    else{for(const a of all){if(a.score>=remaining)continue;for(const b of all){if(a.score+b.score>=remaining)continue;for(const c of lastPool)if(a.score+b.score+c.score===remaining&&validLast(c))keep([a,b,c]);}}}
    if(best&&best.line.length===1)break;
  }
  if(!best)return null;
  const darts=best.line.map(d=>d.code);
  return{text:darts.join(" → "),darts};
}
function coachText(state:GotchaState,active:any){
  if(!active)return"";const score=Number(state.scores[active.id]||0);const remaining=state.config.rules.targetScore-score;
  const gotchas=state.players.filter((p:any)=>p.id!==active.id&&Number(state.scores[p.id]||0)>score).map((p:any)=>({p,delta:Number(state.scores[p.id]||0)-score})).filter((x:any)=>x.delta>0&&x.delta<=180).sort((a:any,b:any)=>a.delta-b.delta);
  if(remaining<=60)return finishHint(remaining,state.config.rules.outMode);
  if(gotchas.length){const g=gotchas[0];return`GOTCHA possible sur ${g.p.name} avec +${g.delta}.`;}
  return`Il reste ${remaining}. Un score régulier vaut mieux qu’un BUST.`;
}


function GotchaRaceBoard({ state, activeId, colorById, currentThrow }: any) {
  const target = Number(state.config?.rules?.targetScore || 301);
  const activeScore = Number(state.scores?.[activeId] || 0);
  const visitScore = (currentThrow || []).map(uiToGameDart).reduce((sum:number,d:any)=>sum+dartScore(d),0);
  const projected = activeScore + visitScore;
  const bust = projected > target;
  const projectedVictims = bust ? [] : state.players.filter((p:any)=>p.id!==activeId && Number(state.scores[p.id]||0)===projected);
  const liveLabel = !currentThrow?.length ? `0 → ${target}` : bust ? `${activeScore} + ${visitScore} = ${projected} · BUST` : projectedVictims.length ? `${activeScore} + ${visitScore} = ${projected} · GOTCHA ×${projectedVictims.length}` : `${activeScore} + ${visitScore} = ${projected}`;
  return <section className={`gotcha-race${bust?" is-bust":""}${projectedVictims.length?" has-gotcha":""}`}>
    <header><div><span>🏁</span><div><small>COURSE VERS {target}</small><b>POSITION & FENÊTRES GOTCHA</b></div></div><em>{liveLabel}</em></header>
    <div className="gotcha-race__rows">{[...state.players].sort((a:any,b:any)=>Number(state.scores[b.id]||0)-Number(state.scores[a.id]||0)).map((p:any)=>{
      const score=Number(state.scores[p.id]||0), own=p.id===activeId, delta=score-activeScore, color=colorById.get(String(p.id))||ACCENT;
      const victim = projectedVictims.some((q:any)=>q.id===p.id);
      return <div key={p.id} className={`${own?"is-active ":""}${victim?"is-gotcha":""}`} style={{["--gotcha-color" as any]:color}}>
        <div><strong>{own?"🎯":"👤"} {p.name}</strong><span>{own ? (bust ? `BUST → ${state.config.rules.bustRule === "zero" ? "retour 0" : "volée annulée"}` : currentThrow?.length ? `projection ${projected}/${target}` : `${target-score} restants`) : victim ? `🎯 GOTCHA SI VALIDÉ · retour à 0` : delta>0&&delta<=180 ? `GOTCHA possible : +${delta}` : delta===0 ? "même score" : "hors fenêtre"}</span></div>
        <div className="gotcha-race__track"><i style={{width:`${Math.min(100,score/Math.max(1,target)*100)}%`}}/></div>
        <b>{score}</b>
      </div>;
    })}</div>
  </section>;
}

export default function GotchaPlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll: true});
  const awena=useAwenaOptional();const go=props?.go??props?.setTab;const store=props?.store;const onFinish=props?.onFinish;const resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeGotchaConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;const recoveredThrow=resumeRecord?.resume?.currentThrow??resumeRecord?.payload?.currentThrow;
  const [state,setState]=React.useState<GotchaState>(()=>restored?.mode==="gotcha"?cloneGotchaState(restored):createGotchaState(players,config));const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>(()=>Array.isArray(recoveredThrow)?recoveredThrow.slice(0,3):[]);const [multiplier,setMultiplier]=React.useState<1|2|3>(()=>{const v=resumeRecord?.resume?.multiplier??resumeRecord?.payload?.multiplier;return v===2||v===3?v:1;});const [undo,setUndo]=React.useState<GotchaState[]>([]);const [notice,setNotice]=React.useState("");const [moment,setMoment]=React.useState<any>(null); const [progression,setProgression]=React.useState<any>(()=>resumeRecord?.summary?.progression||resumeRecord?.payload?.summary?.progression||null);
  const [playersOpen,setPlayersOpen]=React.useState(false),[statsOpen,setStatsOpen]=React.useState(false),[logOpen,setLogOpen]=React.useState(false),[rankingOpen,setRankingOpen]=React.useState(false),[infoPanel,setInfoPanel]=React.useState<"mission"|"route"|"race"|"outcome"|null>(null);
  const botBusy=React.useRef(false),finishedRef=React.useRef(false),introPlayedRef=React.useRef(false),initialCheckpointRef=React.useRef(false),historyHydratedRef=React.useRef(false);const matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`gotcha-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);const colorById=React.useMemo(()=>modePlayerColors(state.players,ACCENT),[state.players]);const activePlayer=state.players[state.activePlayerIndex];const activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null;const activeColor=activePlayer?colorById.get(String(activePlayer.id))||ACCENT:ACCENT;const activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);
  const baseBotBrain = React.useMemo(() => resolvePremiumBotBrain(activeProfile, config.botLevel), [activeProfile?.id, activeProfile?.style, activeProfile?.botLevel, config.botLevel]);
  const careerBotAdaptation = React.useMemo(() => adaptPremiumBotBrainFromScouting("gotcha", state, activePlayer, baseBotBrain, botIds), [state, activePlayer?.id, baseBotBrain.key, baseBotBrain.confidence, botIds]);
  const activeBotScouting = careerBotAdaptation.model;
  const rivalryBotAdaptation = React.useMemo(() => adaptPremiumBotBrainFromRivalry("gotcha", state, activePlayer, careerBotAdaptation.brain, botIds), [state, activePlayer?.id, careerBotAdaptation.brain.key, careerBotAdaptation.brain.confidence, botIds]);
  const activeBotRivalry = rivalryBotAdaptation.model;
  const activeBotAdaptation = React.useMemo(() => adaptPremiumBotBrain("gotcha", state, activePlayer, rivalryBotAdaptation.brain, botIds), [state, activePlayer?.id, rivalryBotAdaptation.brain.key, rivalryBotAdaptation.brain.confidence, botIds]);
  const activeBotBrain = activeBotAdaptation.brain;
  const activeBotMemory = activeBotAdaptation.model;
  const activeBotPlan = React.useMemo(() => premiumBotTacticalPlan("gotcha", state, activePlayer, activeBotBrain), [state, activePlayer?.id, activeBotBrain.key, activeBotBrain.confidence, activeBotMemory?.patternKey, activeBotScouting?.patternKey, activeBotRivalry?.state]);
  const sfxEnabled=(config as any).sfxEnabled!==false,awenaEnabled=(config as any).awenaEnabled!==false,coachEnabled=(config as any).coachEnabled!==false;const nameById=React.useCallback((id:any)=>state.players.find((p:any)=>String(p.id)===String(id))?.name||"Joueur",[state.players]);

  const buildRecord=React.useCallback((s:GotchaState,status:"in_progress"|"finished",draft:UIDart[]=currentThrow,m:1|2|3=multiplier)=>{const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));const perPlayer=Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,score:Number(s.scores[id]||0),wins:Number(s.legWins[id]||0),accuracy:percent(Number(st.darts||0)-Number(st.misses||0),st.darts)}]));const ranking=[...s.players].map((p:any,i:number)=>({id:p.id,name:p.name,wins:Number(s.legWins[p.id]||0),score:Number(s.scores[p.id]||0),gotchas:Number(s.statsByPlayer[p.id]?.gotchas||0),victims:Number(s.statsByPlayer[p.id]?.victims||0),busts:Number(s.statsByPlayer[p.id]?.busts||0),order:i})).sort((a,b)=>b.wins-a.wins||b.score-a.score||b.gotchas-a.gotchas||b.victims-a.victims||a.busts-b.busts||a.order-b.order);return{id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"gotcha",mode:"gotcha",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,game:{mode:"gotcha",targetScore:s.config.rules.targetScore,seriesWins:s.config.seriesWins},summary:{mode:"gotcha",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,targetScore:s.config.rules.targetScore,config:s.config,finalScores:s.scores,perPlayer,ranking,durationMs:Math.max(0,Number((status==="finished"?(s.finishedAt||Date.now()):Date.now()))-Number(s.startedAt||Date.now())),totalDarts:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0),totalGotchas:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.gotchas||0),0),totalBusts:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.busts||0),0)},resume:{mode:"gotcha",config:s.config,state:cloneGotchaState(s),currentThrow:draft.slice(0,3),multiplier:m,updatedAt:Date.now()},payload:{kind:"gotcha",mode:"gotcha",sport:"darts",config:s.config,stateSnapshot:cloneGotchaState(s),currentThrow:draft.slice(0,3),multiplier:m,visits:s.visits,visitHistory:s.visits,stats:{mode:"gotcha",players:s.statsByPlayer,legWins:s.legWins}}};},[profiles,currentThrow,multiplier]);
  const saveInProgress=React.useCallback(async(s:GotchaState,draft:UIDart[]=currentThrow,m:1|2|3=multiplier)=>{try{await History.upsert(buildRecord(s,"in_progress",draft,m));}catch(e){console.warn("[GOTCHA] checkpoint failed",e);}},[buildRecord,currentThrow,multiplier]);
  const persist = React.useCallback((s: GotchaState) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      commitPremiumPartyRivalry({
        mode: "gotcha",
        matchId: matchIdRef.current,
        winnerId: s.winnerId,
        state: s,
        participants: (s.players || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          isBot: isBotProfile(profileById.get(String(p.id)) || p, botIds),
        })),
        botIds,
      });
      commitPremiumPartyScouting({
        mode: "gotcha",
        matchId: matchIdRef.current,
        winnerId: s.winnerId,
        state: s,
        participants: (s.players || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          isBot: isBotProfile(profileById.get(String(p.id)) || p, botIds),
        })),
        botIds,
      });
      const progress = commitPremiumPartyProgress({
        mode: "gotcha",
        matchId: matchIdRef.current,
        winnerId: s.winnerId,
        participants: (s.players || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          stats: s.statsByPlayer?.[p.id] || {},
          isBot: isBotProfile(profileById.get(String(p.id)) || p, botIds),
        })),
      });
      setProgression(progress);
      const rec: any = buildRecord(s, "finished", [], 1);
      rec.summary = { ...(rec.summary || {}), progression: progress };
      rec.payload = { ...(rec.payload || {}), summary: { ...(rec.payload?.summary || {}), progression: progress } };
      if (typeof onFinish === "function") onFinish(rec, { navigate: false });
      else void History.upsert(rec).catch(() => {});
    } else void saveInProgress(s, [], 1);
  }, [buildRecord, onFinish, saveInProgress, profileById, botIds]);
  React.useEffect(()=>{if(initialCheckpointRef.current)return;initialCheckpointRef.current=true;if(state.phase!=="finished")void saveInProgress(state,currentThrow,multiplier);},[saveInProgress,state,currentThrow,multiplier]);React.useEffect(()=>{if(state.phase==="finished")return;const t=window.setTimeout(()=>void saveInProgress(state,currentThrow,multiplier),190);return()=>window.clearTimeout(t);},[state,currentThrow,multiplier,saveInProgress]);
  React.useEffect(()=>{if(historyHydratedRef.current)return;const resumeId=String(props?.params?.resumeId||resumeRecord?.id||resumeRecord?.matchId||"").trim();if(!resumeId)return;let cancelled=false;void History.get(resumeId).then((full:any)=>{if(cancelled||!full)return;const r=full?.resume?.state||full?.payload?.stateSnapshot||full?.payload?.state;if(!r||r.mode!=="gotcha")return;historyHydratedRef.current=true;matchIdRef.current=String(full.id||full.matchId||resumeId);setState(cloneGotchaState(r));const d=full?.resume?.currentThrow??full?.payload?.currentThrow;setCurrentThrow(Array.isArray(d)?d.slice(0,3):[]);const m=full?.resume?.multiplier??full?.payload?.multiplier;setMultiplier(m===2||m===3?m:1);setUndo([]);setNotice("Partie GOTCHA reprise depuis l’historique");initialCheckpointRef.current=true;}).catch(()=>{});return()=>{cancelled=true};},[props?.params?.resumeId,resumeRecord]);
  React.useEffect(()=>{const flush=()=>{if(state.phase!=="finished")void saveInProgress(state,currentThrow,multiplier)};const vis=()=>{if(document.visibilityState==="hidden")flush()};window.addEventListener("pagehide",flush);document.addEventListener("visibilitychange",vis);return()=>{window.removeEventListener("pagehide",flush);document.removeEventListener("visibilitychange",vis)};},[state,currentThrow,multiplier,saveInProgress]);
  React.useEffect(()=>{if(restored?.mode==="gotcha"||resumeRecord)return;const start=()=>{if(!sfxEnabled||introPlayedRef.current)return;introPlayedRef.current=true;void unlockNewModeAudio();playNewModeSfx("intro",true)};try{if((navigator as any)?.userActivation?.hasBeenActive){start();return;}}catch{}window.addEventListener("pointerdown",start,{once:true,capture:true} as any);return()=>window.removeEventListener("pointerdown",start,true);},[sfxEnabled]);
  React.useEffect(()=>{awena?.setRuntime?.({route:"gotcha_play",sport:"darts",mode:"gotcha",phase:state.phase==="finished"?"summary":"play",inGame:state.phase!=="finished",screenLabel:"GOTCHA · Partie",playerName:activePlayer?.name,extra:{score:state.scores?.[activePlayer?.id],targetScore:state.config.rules.targetScore,remaining:state.config.rules.targetScore-Number(state.scores?.[activePlayer?.id]||0),outMode:state.config.rules.outMode,bustRule:state.config.rules.bustRule,leg:Number(state.legIndex||0)+1,round:Number(state.roundIndex||0)+1,awenaRememberedMode:"gotcha",awenaKnowledgeTopic:"screen:gotcha_play"}});},[awena,state.phase,state.legIndex,state.roundIndex,state.turnIndex,state.scores,activePlayer?.id]);

  const commit=React.useCallback((next:GotchaState,previous=state)=>{setUndo(u=>[...u.slice(-39),cloneGotchaState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);let msg="";if(next.phase==="finished"&&next.winnerId){msg=`🏆 ${nameById(next.winnerId)} atteint ${config.rules.targetScore} et remporte GOTCHA !`;playNewModeSfx("victory",sfxEnabled);}else if(next.legIndex>previous.legIndex&&next.lastLegWinnerId)msg=`🎯 ${nameById(next.lastLegWinnerId)} remporte la manche ${previous.legIndex+1}`;else msg=lastEvents(next.visits).join(" · ");const momentNext=resolvePremiumPartyMoment("gotcha",next,previous,nameById);if(momentNext)setMoment(momentNext);setNotice(msg);persist(next);},[state,nameById,config.rules.targetScore,persist,sfxEnabled]);
  const validate=()=>{if(!currentThrow.length||state.phase==="finished"||activeIsBot)return;commit(playGotchaVisit(state,currentThrow.map(uiToGameDart)));};const doUndo=()=>setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneGotchaState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière volée annulée");setMoment(null);finishedRef.current=false;void saveInProgress(prev,[],1);return u.slice(0,-1)});const handleCancel=()=>{if(currentThrow.length){setCurrentThrow([]);setMultiplier(1);setNotice("Saisie annulée")}else doUndo();};
  const setThrowWithSfx=React.useCallback((update:any)=>setCurrentThrow((prev:UIDart[])=>{const next=(typeof update==="function"?update(prev):update)||prev;const out=Array.isArray(next)?next.slice(0,3):prev;if(out.length>prev.length)out.slice(prev.length).forEach((d:any,i:number)=>window.setTimeout(()=>playNewModeDartSfx(d,sfxEnabled),i*120));return out;}),[sfxEnabled]);
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{const darts=pickGotchaBotDarts(state,config.botLevel,activeBotBrain);const span=playNewModeDartSequence(darts,sfxEnabled);window.setTimeout(()=>{try{commit(playGotchaVisit(state,darts));}finally{botBusy.current=false;}},span+100);}catch{botBusy.current=false;}},620);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);
  function replay(){matchIdRef.current=`gotcha-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setMoment(null);setCurrentThrow([]);setMultiplier(1);const next=createGotchaState(players,config);setState(next);initialCheckpointRef.current=true;void saveInProgress(next,[],1);if(sfxEnabled)playNewModeSfx("intro",true);}

  const currentScore=activePlayer?Number(state.scores[activePlayer.id]||0):0;const remaining=Math.max(0,config.rules.targetScore-currentScore);const legTarget=config.seriesWins*2-1;const previewDarts=currentThrow.map(uiToGameDart);const provisional=previewDarts.reduce((sum,d)=>sum+dartScore(d),0);const projected=currentScore+provisional;const projectedVictims=activePlayer?state.players.filter((p:any)=>p.id!==activePlayer.id&&Number(state.scores[p.id]||0)>0&&Number(state.scores[p.id]||0)===projected):[];const previewBust=projected>config.rules.targetScore;const activeStats=activePlayer?state.statsByPlayer[activePlayer.id]||{}:{};const coach=coachEnabled&&!activeIsBot?coachText(state,activePlayer):"";
  const aimPlan=React.useMemo(()=>gotchaAimAssist(state,String(activePlayer?.id||""),previewDarts),[state,activePlayer?.id,currentThrow]);
  const finishRemaining=Math.max(0,config.rules.targetScore-projected);
  const finishDartsLeft=Math.max(0,3-currentThrow.length);
  const x01Finish=React.useMemo(()=>previewBust?null:computeX01StyleFinish(finishRemaining,finishDartsLeft,config.rules.outMode),[previewBust,finishRemaining,finishDartsLeft,config.rules.outMode]);
  const finishStripText=previewBust?"BUST SI TU VALIDES":projectedVictims.length?`GOTCHA ×${projectedVictims.length} · ${projectedVictims.map((p:any)=>p.name).join(", ")}`:projected===config.rules.targetScore?"FINISH ATTEINT · VALIDE LA VOLÉE":x01Finish?`Route : ${x01Finish.text}`:aimPlan.targets?.length?`Route : ${aimPlan.targets.join(" → ")}`:finishHint(finishRemaining,config.rules.outMode);
  const turnOutcome=React.useMemo(()=>premiumPartyTurnOutcome("gotcha",state),[state]);
  const rankingRows=React.useMemo(()=>[...state.players].map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;return{id:String(p.id),name:p.name,profile:profileById.get(String(p.id))||p,color,wins:Number(state.legWins[p.id]||0),score:Number(state.scores[p.id]||0),gotchas:Number(st.gotchas||0),victims:Number(st.victims||0),busts:Number(st.busts||0),subtitle:`${state.scores[p.id]||0}/${config.rules.targetScore} · ${st.gotchas||0} GOTCHA · ${st.busts||0} bust`,value:Number(state.legWins[p.id]||0),suffix:" M",order:i};}).sort((a,b)=>b.wins-a.wins||b.score-a.score||b.gotchas-a.gotchas||b.victims-a.victims||a.busts-b.busts||a.order-b.order),[state.players,state.legWins,state.scores,state.statsByPlayer,profileById,colorById]);
  const playersRows=state.players.map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;return{id:p.id,name:p.name,profile:profileById.get(String(p.id))||p,color,active:i===state.activePlayerIndex,status:`RESTE ${Math.max(0,config.rules.targetScore-Number(state.scores[p.id]||0))}`,progress:Number(state.scores[p.id]||0),progressMax:config.rules.targetScore,metrics:[{label:"SCORE",value:state.scores[p.id]||0},{label:"GOTCHA",value:st.gotchas||0},{label:"BUST",value:st.busts||0},{label:"M",value:state.legWins[p.id]||0}]};});
  const statsItems=[{label:"SCORE",value:`${currentScore}/${config.rules.targetScore}`},{label:"POINTS MARQUÉS",value:activeStats.points||0},{label:"GOTCHA",value:activeStats.gotchas||0,color:RED},{label:"VICTIMES",value:activeStats.victims||0,color:RED},{label:"BUST",value:activeStats.busts||0},{label:"BEST VISIT",value:activeStats.bestVisit||0},{label:"PLUS HAUT SCORE",value:activeStats.highestScore||0},{label:"FINISH",value:activeStats.exactFinishes||0},{label:"S / D / T",value:`${activeStats.singles||0}/${activeStats.doubles||0}/${activeStats.triples||0}`},{label:"BULL / DBULL",value:`${activeStats.bulls||0}/${activeStats.dbulls||0}`},{label:"PRÉCISION",value:`${percent(Number(activeStats.darts||0)-Number(activeStats.misses||0),activeStats.darts)}%`},{label:"DARTS",value:activeStats.darts||0}];
  const awards=React.useMemo(()=>{const rows=rankingRows.map((r:any)=>({...r,st:state.statsByPlayer[r.id]||{}}));const hunter=bestBy(rows,r=>Number(r.st.victims||0));const scorer=bestBy(rows,r=>Number(r.st.bestVisit||0));const safe=bestBy(rows,r=>-Number(r.st.busts||0)+Number(r.st.visits||0)*.001);const finisher=bestBy(rows,r=>Number(r.st.exactFinishes||0)*100+Number(r.st.gotchas||0));return[{icon:"💥",label:"CHASSEUR",name:hunter?.name||"—",value:`${hunter?.st?.victims||0} victimes`,color:hunter?.color},{icon:"🎯",label:"BEST VISIT",name:scorer?.name||"—",value:`${scorer?.st?.bestVisit||0} pts`,color:scorer?.color},{icon:"🛡️",label:"ANTI-BUST",name:safe?.name||"—",value:`${safe?.st?.busts||0} bust`,color:safe?.color},{icon:"🏁",label:"FINISHER",name:finisher?.name||"—",value:`${finisher?.st?.exactFinishes||0} finishes`,color:finisher?.color}];},[rankingRows,state.statsByPlayer]);
  const totalDarts=Object.values(state.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0),durationMs=Math.max(0,Number((state.finishedAt||Date.now()))-Number(state.startedAt||Date.now()));
  if(state.phase==="finished")return <div className="party-mode" style={{["--mode-accent" as any]:ACCENT}} data-mss-native-play-layout="1"><PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || ACCENT) : activeColor} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} /><PageHeader tickerSrc={tickerGotcha} tickerAlt="GOTCHA" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("gotcha_config")} color={ACCENT} glow={`${ACCENT}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="gotcha_play" mode="gotcha" screenLabel="GOTCHA · Partie" accent={ACCENT}/></div>:null}/><div style={{flex:"1 1 auto",minHeight:0,overflow:"auto"}}><PremiumEndPanel title="GOTCHA" accent={ACCENT} winnerId={state.winnerId} rankingRows={rankingRows} durationMs={durationMs} totalDarts={totalDarts} awards={awards} progression={progression ? {...progression, winnerCareer: progression.byPlayer?.[String(state.winnerId || "")] || null} : null} onReplay={replay} onStats={() => go?.("statsHub", { mode: "active", initialStatsSubTab: "gotcha", playerId:state.winnerId||state.players[0]?.id,focusMatchId:matchIdRef.current})} onHistory={() => go?.("statsHub", { tab: "history", mode: "active", initialStatsSubTab: "history", focusMatchId:matchIdRef.current})} onConfig={()=>go?.("gotcha_config")} onGames={()=>go?.("games",{gamesView:"all"})}/></div></div>;

  return <div className="party-mode gotcha-play" style={{["--mode-accent" as any]:ACCENT,["--gotcha-active" as any]:(previewBust?RED:activeColor)}} data-mss-native-play-layout="1"><PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || ACCENT) : activeColor} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} /><PageHeader tickerSrc={tickerGotcha} tickerAlt="GOTCHA" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("gotcha_config")} color={ACCENT} glow={`${ACCENT}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="gotcha_play" mode="gotcha" screenLabel="GOTCHA · Partie" accent={ACCENT}/></div>:null}/>{coach?<FloatingAdvice text={coach} accent={activeColor} kicker="CONSEIL TACTIQUE"/>:null}<main className="party-mode__body"><div className="party-mode__stage"><div className="party-mode__left">
    <ActiveHero profile={activeProfile} name={activePlayer?.name} accent={previewBust?RED:activeColor} eyebrow={`MANCHE ${state.legIndex+1} · BO${legTarget}${config.rules.maxRounds?` · ROUND ${Math.min(state.roundIndex+1,config.rules.maxRounds)}/${config.rules.maxRounds}`:""}`} primary="" secondary={`MANCHES ${Number(state.legWins?.[activePlayer?.id]||0)} / ${config.seriesWins}`} progress={currentScore} progressMax={config.rules.targetScore} aside={<div className="gotcha-hero-score"><b>{currentScore}</b><small>/{config.rules.targetScore}</small></div>}/>
    <div className="gotcha-kpis" aria-label="Statistiques GOTCHA du joueur actif">
      <button type="button" onClick={()=>setStatsOpen(true)} className="is-gotcha"><small>GOTCHA</small><b>{activeStats.gotchas||0}</b></button>
      <button type="button" onClick={()=>setStatsOpen(true)} className="is-victims"><small>VICTIMES</small><b>{activeStats.victims||0}</b></button>
      <button type="button" onClick={()=>setStatsOpen(true)} className="is-best"><small>BEST</small><b>{activeStats.bestVisit||0}</b></button>
      <button type="button" onClick={()=>setStatsOpen(true)} className="is-bust"><small>BUST</small><b>{activeStats.busts||0}</b></button>
    </div>
    <button type="button" className={`gotcha-finish-strip${previewBust?" is-danger":projectedVictims.length?" is-success":""}`} onClick={()=>setInfoPanel("route")} aria-label="Ouvrir les suggestions de finish GOTCHA">
      <span className="gotcha-finish-strip__icon"><GotchaToolIcon name="route"/></span>
      <span className="gotcha-finish-strip__copy"><small>{previewBust?"BUST":projectedVictims.length?"GOTCHA POSSIBLE":x01Finish?"FINISH X01":"AIDE FINISH"}</small><b>{finishStripText}</b></span>
      <span className="gotcha-finish-strip__meta"><b>{Math.max(0,remaining)}</b><small>RESTE</small><em>{Math.max(0,3-currentThrow.length)} 🎯</em></span>
    </button>
    <nav className="gotcha-tools" aria-label="Informations GOTCHA">
      <button type="button" title="Joueurs" aria-label="Ouvrir les joueurs" style={{["--gotcha-tool" as any]:"#b778ff"}} onClick={()=>setPlayersOpen(true)}><span><GotchaToolIcon name="players"/></span><b>JOUEURS</b></button>
      <button type="button" title="Mission" aria-label="Ouvrir la mission" style={{["--gotcha-tool" as any]:"#ff9b31"}} onClick={()=>setInfoPanel("mission")}><span><GotchaToolIcon name="mission"/></span><b>MISSION</b></button>
      <button type="button" title="Route" aria-label="Ouvrir la route et les finishs" style={{["--gotcha-tool" as any]:"#4dcfff"}} onClick={()=>setInfoPanel("route")}><span><GotchaToolIcon name="route"/></span><b>ROUTE</b></button>
      <button type="button" title="Course" aria-label="Ouvrir la course GOTCHA" style={{["--gotcha-tool" as any]:"#ff5d9b"}} onClick={()=>setInfoPanel("race")}><span><GotchaToolIcon name="race"/></span><b>COURSE</b></button>
      <button type="button" title="Statistiques" aria-label="Ouvrir les statistiques" style={{["--gotcha-tool" as any]:"#59e2ad"}} onClick={()=>setStatsOpen(true)}><span><GotchaToolIcon name="stats"/></span><b>STATS</b></button>
      <button type="button" title="Classement" aria-label="Ouvrir le classement" style={{["--gotcha-tool" as any]:"#ffc13a"}} onClick={()=>setRankingOpen(true)}><span><GotchaToolIcon name="ranking"/></span><b>CLASSEMENT</b></button>
      <button type="button" title="Journal" aria-label="Ouvrir le journal" style={{["--gotcha-tool" as any]:"#d9e6f5"}} onClick={()=>setLogOpen(true)}><span><GotchaToolIcon name="log"/></span><b>JOURNAL</b></button>
    </nav>
  </div><div className="party-mode__input">{!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={handleCancel} preferredMethod={config.scoreInputMethod} validateLabel={previewBust?"VALIDER LE BUST":"VALIDER"} accent={previewBust?RED:activeColor} compact={false} fitMinScale={0.72}/>:<BotTurn intent={activeBotPlan.intent} objectiveDetail={activeBotPlan.detail} reaction={activeBotPlan.reaction} persona={activeBotPlan.persona} personaIcon={activeBotPlan.personaIcon} confidence={activeBotPlan.confidence} adaptation={activeBotMemory ? `${activeBotMemory.icon} ${activeBotMemory.label}` : undefined} adaptationDetail={activeBotMemory?.detail} learningConfidence={activeBotMemory?.confidence} learningTarget={activeBotMemory?.targetName} rivalry={activeBotRivalry ? `${activeBotRivalry.icon} ${activeBotRivalry.label}` : undefined} rivalryDetail={activeBotRivalry?.detail} rivalryRecord={activeBotRivalry?.record} rivalryMatches={activeBotRivalry?.matches} rivalryConfidence={activeBotRivalry?.confidence} rivalryTension={activeBotRivalry?.tension} rivalryTarget={activeBotRivalry?.targetName} rivalryQuote={activeBotRivalry?.quote} scouting={activeBotScouting ? `${activeBotScouting.icon} ${activeBotScouting.label}` : undefined} scoutingDetail={activeBotScouting?.detail} scoutingMatches={activeBotScouting?.matches} scoutingConfidence={activeBotScouting?.confidence} scoutingTarget={activeBotScouting?.targetName} phaseLabel={`MANCHE ${state.legIndex+1}`} profile={activeProfile} name={activePlayer?.name} accent={activeColor} text="cherche le finish ou le GOTCHA…" icon="🎯"/>}</div></div></main>
  {infoPanel?<div className="party-mode__modal gotcha-info-modal" onClick={()=>setInfoPanel(null)}><section className="party-mode__modal-card" onClick={(e)=>e.stopPropagation()}><header><div><b>{infoPanel==="mission"?"MISSION GOTCHA":infoPanel==="route"?"ROUTE / FINISH":infoPanel==="race"?"COURSE GOTCHA":"DERNIÈRE VOLÉE"}</b><span>Informations détaillées — l’écran de jeu reste volontairement épuré.</span></div><button onClick={()=>setInfoPanel(null)}>×</button></header><div className="gotcha-info-modal__body">{infoPanel==="mission"?<GameplayMission accent={previewBust ? RED : activeColor} icon={previewBust ? "💥" : projectedVictims.length ? "🎯" : "⚡"} title={previewBust ? "BUST SI TU VALIDES" : projectedVictims.length ? `GOTCHA SUR ${projectedVictims.map((p:any)=>p.name).join(", ")}` : `ATTEINS ${config.rules.targetScore} SANS DÉPASSER`} text={currentThrow.length ? `Projection : ${currentScore} + ${provisional} = ${projected}.` : `Il te reste ${remaining} point(s). Si ton score final égale celui d’un adversaire, il repart à zéro.`} chips={[config.rules.outMode === "straight" ? "STRAIGHT OUT" : config.rules.outMode === "double" ? "DOUBLE OUT" : "MASTER OUT", `BUST: ${config.rules.bustRule === "zero" ? "RETOUR À 0" : "VOLÉE ANNULÉE"}`, projectedVictims.length ? `GOTCHA ×${projectedVictims.length}` : null, x01Finish ? `FINISH ${x01Finish.text}` : aimPlan.targets?.length ? `ROUTE ${aimPlan.targets.join(" → ")}` : null]} tone={previewBust ? "danger" : projectedVictims.length ? "success" : "normal"}/>:infoPanel==="route"?<VisitRoadmap plan={aimPlan} currentLabels={currentThrow.map((d:any)=>gotchaDartLabel(uiToGameDart(d)))} maxDarts={3} accent={previewBust ? RED : activeColor} title={x01Finish?`FINISH · ${x01Finish.text}`:"ROUTE GOTCHA / FINISH"} subtitle="Suggestion recalculée après chaque fléchette, avec la logique de finish X01 quand un checkout est possible."/>:infoPanel==="race"?<GotchaRaceBoard state={state} activeId={activePlayer?.id} colorById={colorById} currentThrow={currentThrow}/>:<TurnOutcomeCard outcome={turnOutcome} accent={activeColor} nextPlayer={activePlayer?.name || ""}/>}</div></section></div>:null}
  {playersOpen?<PlayersModal rows={playersRows} onClose={()=>setPlayersOpen(false)}/>:null}{statsOpen?<StatsModal items={statsItems} accent={activeColor} subtitle={activePlayer?.name} onClose={()=>setStatsOpen(false)}/>:null}{logOpen?<LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={gotchaDartLabel} title="JOURNAL GOTCHA" onClose={()=>setLogOpen(false)}/>:null}{rankingOpen?<RankingModal rows={rankingRows} title="CLASSEMENT GOTCHA" onClose={()=>setRankingOpen(false)}/>:null}</div>;
}
