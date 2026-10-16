// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import tickerCallThree from "../assets/tickers/ticker_call_three.webp";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { playNewModeDartSequence, playNewModeDartSfx, playNewModeSfx, unlockNewModeAudio } from "../lib/newModesArcadeSfx";
import { commitPremiumPartyProgress } from "../lib/premiumPartyProgress";
import {
  callThreeDartMatches, callThreeHitPoints, callThreeLabel, cloneCallThreeState, createCallThreeState,
  normalizeCallThreeConfig, pickCallThreeBotDarts, playCallThreeVisit, randomCallThreeCalls, setCallThreeCalls,
  type CallTarget, type CallThreeState,
} from "../lib/gameEngines/callThreeEngine";
import { NewModeInput, actionStyle, dartLabel, isBotProfile, lastEvents, panelStyle, playerName, resolveModeProfiles, SOFT, uiToGameDart } from "./newModes/newModePlayShared";
import {
  ActiveHero, BotTurn, FloatingAdvice, KpiStrip, LogModal, PlayersModal, PremiumAwenaButton,
  GameplayMission, PremiumEndPanel, PremiumMomentOverlay, QuickRow, RankingModal, StatsModal, SummaryStrip, bestBy, modePlayerColors, percent,
} from "./newModes/PremiumPartyModeUi";
import "./newModes/PremiumPartyModeUi.css";
import { CallThreeGameplayVisual, ModeInputGuideBadge } from "./newModes/ModeGameplayVisuals";
import "./newModes/ModeGameplayVisuals.css";
import { callThreeGameplayMoment } from "./newModes/NewFourModeGameplayFeedback";

const ACCENT="#ffb13b", ACCENT2="#ff6d3a", GREEN="#72efb1", RED="#ff6d6d", BLUE="#65caff";

function CallPicker({calls,setCalls,selected,setSelected,bullAllowed,onRandom,onConfirm,accent=ACCENT}:any){
  const setTarget=(target:CallTarget)=>{setCalls((prev:any[])=>prev.map((c,i)=>i===selected?target:c));setSelected((i:number)=>Math.min(2,i+1));};
  return <div style={{...panelStyle(accent+"44"),padding:10,height:"100%",overflow:"auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}><div><div style={{color:accent,fontSize:10,fontWeight:1100}}>COMPOSE LES 3 APPELS</div><div style={{marginTop:3,color:SOFT,fontSize:9.5}}>Choisis un slot puis sa cible. L'appel devient officiel à la validation.</div></div><button type="button" onClick={onRandom} style={{...actionStyle(BLUE),minHeight:34}}>🎲 ALÉATOIRE</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:9}}>{calls.map((c:any,i:number)=><button key={i} type="button" onClick={()=>setSelected(i)} style={{minHeight:68,borderRadius:13,border:`1px solid ${selected===i?accent:"rgba(255,255,255,.10)"}`,background:selected===i?`${accent}22`:"rgba(255,255,255,.035)",color:"#fff",boxShadow:selected===i?`0 0 18px ${accent}22`:"none"}}><span style={{display:"block",fontSize:8,color:selected===i?accent:SOFT,fontWeight:1000}}>CIBLE {i+1}</span><b style={{display:"block",marginTop:4,fontSize:24}}>{callThreeLabel(c)}</b></button>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:4,marginTop:9}}>{Array.from({length:20},(_,i)=>i+1).map(n=><button key={n} type="button" onClick={()=>setTarget({kind:"number",number:n})} style={{minHeight:31,borderRadius:8,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.035)",color:"#e9edf7",fontWeight:1000,fontSize:10}}>{n}</button>)}</div>
    <div style={{display:"flex",gap:7,marginTop:8}}>{bullAllowed?<button type="button" onClick={()=>setTarget({kind:"bull"})} style={{...actionStyle(ACCENT2),flex:1}}>BULL</button>:null}<button type="button" onClick={onConfirm} style={{...actionStyle(GREEN),flex:2,background:`${GREEN}22`}}>✓ VALIDER L'APPEL</button></div>
  </div>;
}

function coachText(state:CallThreeState,activePlayer:any,callerPlayer:any){
  if(state.phase==="calling")return `${callerPlayer?.name||"Caller"} choisit 3 cibles. Mélange secteurs confortables et pièges pour tester le joueur.`;
  if(!activePlayer)return "";
  const calls=(state.currentCalls||[]).map(callThreeLabel).join(" · ");
  const st=state.statsByPlayer?.[activePlayer.id]||{};
  if(Number(st.currentStreak||0)>=3)return `Tu es en série : ${st.currentStreak} touches de suite. Garde le rythme sur ${calls}.`;
  if(state.config.rules.orderedTargets)return `Ordre strict : mémorise ${calls}. Chaque fléchette correspond à son appel.`;
  return `Ordre libre : sécurise d'abord la cible la plus naturelle parmi ${calls}, puis adapte les deux suivantes.`;
}

export default function CallThreePlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:true});
  const awena=useAwenaOptional();
  const go=props?.go??props?.setTab,store=props?.store,onFinish=props?.onFinish,resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeCallThreeConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);
  const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const recoveredThrow=resumeRecord?.resume?.currentThrow??resumeRecord?.payload?.currentThrow;
  const [state,setState]=React.useState<CallThreeState>(()=>restored?.mode==="call_three"?cloneCallThreeState(restored):createCallThreeState(players,config));
  const recoveredCallDraft=resumeRecord?.resume?.callDraft??resumeRecord?.payload?.callDraft;
  const recoveredCallSlot=Number(resumeRecord?.resume?.callSlot??resumeRecord?.payload?.callSlot??0);
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>(()=>Array.isArray(recoveredThrow)?recoveredThrow.slice(0,3):[]);
  const [multiplier,setMultiplier]=React.useState<1|2|3>(()=>{const v=resumeRecord?.resume?.multiplier??resumeRecord?.payload?.multiplier;return v===2||v===3?v:1;});
  const [undo,setUndo]=React.useState<CallThreeState[]>([]),[notice,setNotice]=React.useState(""),[moment,setMoment]=React.useState<any>(null);
  const [progression,setProgression]=React.useState<any>(()=>resumeRecord?.summary?.progression||resumeRecord?.payload?.summary?.progression||null);
  const [callDraft,setCallDraft]=React.useState<CallTarget[]>(()=>Array.isArray(recoveredCallDraft)&&recoveredCallDraft.length===3?recoveredCallDraft.map((c:any)=>({...c})):(state.currentCalls||[]).map((c:any)=>({...c})));
  const [callSlot,setCallSlot]=React.useState(Math.max(0,Math.min(2,recoveredCallSlot||0)));
  const [playersOpen,setPlayersOpen]=React.useState(false),[statsOpen,setStatsOpen]=React.useState(false),[logOpen,setLogOpen]=React.useState(false),[rankingOpen,setRankingOpen]=React.useState(false);
  const callDraftHydratedRef=React.useRef(state.phase==="calling"&&Array.isArray(recoveredCallDraft)&&recoveredCallDraft.length===3);
  const botBusy=React.useRef(false),callerBusy=React.useRef(false),finishedRef=React.useRef(false),introPlayedRef=React.useRef(false),initialCheckpointRef=React.useRef(false);
  const matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`call-three-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const colorById=React.useMemo(()=>modePlayerColors(state.players,ACCENT),[state.players]);
  const activePlayer=state.players[state.activePlayerIndex],activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null,activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);
  const callerPlayer=state.players.find((p:any)=>String(p.id)===String(state.currentCallerId)),callerProfile=callerPlayer?profileById.get(String(callerPlayer.id))||callerPlayer:null,callerIsBot=!!callerProfile&&isBotProfile(callerProfile,botIds);
  const displayPlayer=state.phase==="calling"?callerPlayer:activePlayer,displayProfile=state.phase==="calling"?callerProfile:activeProfile,displayColor=displayPlayer?colorById.get(String(displayPlayer.id))||ACCENT:ACCENT;
  const sfxEnabled=(config as any).sfxEnabled!==false,awenaEnabled=(config as any).awenaEnabled!==false,coachEnabled=(config as any).coachEnabled!==false,firstVisitGuideEnabled=(config as any).firstVisitGuide!==false;
  const nameById=React.useCallback((id:any)=>state.players.find((p:any)=>String(p.id)===String(id))?.name||"Joueur",[state.players]);

  React.useEffect(()=>{if(state.phase!=="calling")return;if(callDraftHydratedRef.current){callDraftHydratedRef.current=false;return;}setCallDraft((state.currentCalls||[]).map((c:any)=>({...c})));setCallSlot(0);},[state.currentCallerId,state.roundIndex,state.activePlayerIndex,state.phase]);

  const buildRecord=React.useCallback((s:CallThreeState,status:"in_progress"|"finished",draft:UIDart[]=currentThrow,draftMultiplier:1|2|3=multiplier,calls:CallTarget[]=callDraft,slot=callSlot)=>{
    const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));
    const perPlayer=Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,score:Number(s.scores[id]||0),wins:Number(s.legWins[id]||0),accuracy:percent(st.hits,st.darts)}]));
    const ranking=[...s.players].map((p:any,i:number)=>({id:p.id,name:p.name,wins:Number(s.legWins[p.id]||0),score:Number(s.scores[p.id]||0),hits:Number(s.statsByPlayer[p.id]?.hits||0),perfect:Number(s.statsByPlayer[p.id]?.perfectRounds||0),order:i})).sort((a,b)=>b.wins-a.wins||b.score-a.score||b.perfect-a.perfect||b.hits-a.hits||a.order-b.order);
    return {id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"call_three",mode:"call_three",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,
      game:{mode:"call_three",rounds:s.config.rules.rounds,seriesWins:s.config.seriesWins},summary:{mode:"call_three",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,round:s.roundIndex+1,config:s.config,perPlayer,ranking,durationMs:Math.max(0,Number((status==="finished"?(s.finishedAt||Date.now()):Date.now()))-Number(s.startedAt||Date.now())),totalDarts:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0)},
      resume:{mode:"call_three",config:s.config,state:cloneCallThreeState(s),currentThrow:draft.slice(0,3),multiplier:draftMultiplier,callDraft:(calls||[]).map((c:any)=>({...c})),callSlot:slot,updatedAt:Date.now()},payload:{kind:"call_three",mode:"call_three",sport:"darts",config:s.config,stateSnapshot:cloneCallThreeState(s),currentThrow:draft.slice(0,3),multiplier:draftMultiplier,callDraft:(calls||[]).map((c:any)=>({...c})),callSlot:slot,visits:s.visits,visitHistory:s.visits,stats:{mode:"call_three",players:s.statsByPlayer,legWins:s.legWins}}};
  },[profiles,currentThrow,multiplier,callDraft,callSlot]);
  const saveInProgress=React.useCallback(async(s:CallThreeState,draft:UIDart[]=currentThrow,m:1|2|3=multiplier,calls:CallTarget[]=callDraft,slot=callSlot)=>{try{await History.upsert(buildRecord(s,"in_progress",draft,m,calls,slot));}catch(e){console.warn("[CALL THREE] checkpoint failed",e);}},[buildRecord,currentThrow,multiplier,callDraft,callSlot]);
  const persist=React.useCallback((s:CallThreeState)=>{
    if(s.phase==="finished"){
      if(finishedRef.current)return;
      finishedRef.current=true;
      const progress=commitPremiumPartyProgress({
        mode:"call_three",
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
      const rec:any=buildRecord(s,"finished",[],1,[],0);
      rec.summary={...(rec.summary||{}),progression:progress};
      rec.payload={...(rec.payload||{}),summary:{...(rec.payload?.summary||{}),progression:progress}};
      if(typeof onFinish==="function")onFinish(rec,{navigate:false});
      else void History.upsert(rec).catch(()=>{});
    }else void saveInProgress(s,[],1,callDraft,callSlot);
  },[buildRecord,onFinish,saveInProgress,profileById,botIds,callDraft,callSlot]);

  React.useEffect(()=>{if(initialCheckpointRef.current)return;initialCheckpointRef.current=true;if(state.phase!=="finished")void saveInProgress(state,currentThrow,multiplier,callDraft,callSlot);},[saveInProgress,state,currentThrow,multiplier,callDraft,callSlot]);
  React.useEffect(()=>{if(state.phase==="finished")return;const t=window.setTimeout(()=>void saveInProgress(state,currentThrow,multiplier,callDraft,callSlot),180);return()=>window.clearTimeout(t);},[currentThrow,multiplier,callDraft,callSlot,state.phase,state.activePlayerIndex,state.currentCallerId,saveInProgress]);
  React.useEffect(()=>{if(restored?.mode==="call_three"||resumeRecord)return;const start=()=>{if(!sfxEnabled||introPlayedRef.current)return;introPlayedRef.current=true;void unlockNewModeAudio();playNewModeSfx("intro",true)};try{if((navigator as any)?.userActivation?.hasBeenActive){start();return;}}catch{}window.addEventListener("pointerdown",start,{once:true,capture:true} as any);return()=>window.removeEventListener("pointerdown",start,true);},[sfxEnabled]);
  React.useEffect(()=>{awena?.setRuntime?.({route:"call_three_play",sport:"darts",mode:"call_three",phase:state.phase==="finished"?"summary":state.phase,inGame:state.phase!=="finished",screenLabel:"CALL THREE · Partie",playerName:displayPlayer?.name,extra:{round:Number(state.roundIndex||0)+1,rounds:state.config.rules.rounds,caller:callerPlayer?.name,calls:(state.currentCalls||[]).map(callThreeLabel),score:state.scores?.[activePlayer?.id],awenaRememberedMode:"call_three",awenaKnowledgeTopic:"screen:call_three_play"}});},[awena,state.phase,state.roundIndex,state.currentCalls,state.scores,displayPlayer?.id,callerPlayer?.id,activePlayer?.id]);

  const commit=React.useCallback((next:CallThreeState,previous=state,forcedNotice?:string)=>{const feedback=callThreeGameplayMoment(previous,next);if(feedback)setMoment(feedback);setUndo(u=>[...u.slice(-39),cloneCallThreeState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);let msg=forcedNotice||"";if(!msg&&next.phase==="finished"&&next.winnerId){msg=`🏆 ${nameById(next.winnerId)} remporte CALL THREE !`;playNewModeSfx("victory",sfxEnabled);}else if(!msg&&next.legIndex>previous.legIndex&&next.lastLegWinnerId)msg=`📣 ${nameById(next.lastLegWinnerId)} remporte la manche ${previous.legIndex+1}`;else if(!msg)msg=lastEvents(next.visits).join(" · ");setNotice(msg);persist(next);},[state,nameById,persist,sfxEnabled]);
  const confirmCall=React.useCallback((calls=callDraft,auto=false)=>{if(state.phase!=="calling")return;const next=setCallThreeCalls(state,calls);setMoment({key:`call-${Date.now()}`,playerId:String(callerPlayer?.id||""),icon:"📣",kicker:callerPlayer?.name||"CALLER",title:"APPEL CONFIRMÉ",detail:calls.map(callThreeLabel).join(" · "),tone:"info",durationMs:1600});setUndo(u=>[...u.slice(-39),cloneCallThreeState(state)]);setState(next);setCurrentThrow([]);setMultiplier(1);const msg=`${auto?"🤖":"📣"} ${callerPlayer?.name||"Caller"} appelle ${calls.map(callThreeLabel).join(" · ")}`;setNotice(msg);void saveInProgress(next,[],1,calls,0);},[state,callDraft,callerPlayer?.name,saveInProgress]);
  const validate=()=>{if(currentThrow.length<3||state.phase!=="playing"||activeIsBot)return;commit(playCallThreeVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>{setMoment(null);setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneCallThreeState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière action annulée");finishedRef.current=false;void saveInProgress(prev,[],1,prev.currentCalls||[],0);return u.slice(0,-1);});};
  const setThrowWithSfx=React.useCallback((update:any)=>setCurrentThrow((prev:UIDart[])=>{const next=(typeof update==="function"?update(prev):update)||prev;const out=Array.isArray(next)?next.slice(0,3):prev;if(out.length>prev.length)out.slice(prev.length).forEach((d:any,i:number)=>window.setTimeout(()=>playNewModeDartSfx(d,sfxEnabled),i*120));return out;}),[sfxEnabled]);
  React.useEffect(()=>{if(state.phase!=="calling"||!callerIsBot||callerBusy.current)return;callerBusy.current=true;const t=window.setTimeout(()=>{try{const calls=randomCallThreeCalls(config.rules.bullAllowed,Date.now()+state.roundIndex*31+state.activePlayerIndex*7);confirmCall(calls,true);}finally{callerBusy.current=false;}},560);return()=>window.clearTimeout(t);},[state.phase,state.currentCallerId,callerIsBot,state.roundIndex,state.activePlayerIndex,confirmCall]);
  React.useEffect(()=>{if(state.phase!=="playing"||!activeIsBot||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{const darts=pickCallThreeBotDarts(state,config.botLevel);const span=playNewModeDartSequence(darts,sfxEnabled);window.setTimeout(()=>{try{commit(playCallThreeVisit(state,darts));}finally{botBusy.current=false;}},span+100);}catch{botBusy.current=false;}},620);return()=>window.clearTimeout(t);},[state.phase,state.activePlayerIndex,activeIsBot,state.currentCalls]);
  function replay(){setMoment(null);matchIdRef.current=`call-three-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setProgression(null);setCurrentThrow([]);setMultiplier(1);const next=createCallThreeState(players,config);setState(next);setCallDraft((next.currentCalls||[]).map((c:any)=>({...c})));setCallSlot(0);initialCheckpointRef.current=true;void saveInProgress(next,[],1,next.currentCalls||[],0);if(sfxEnabled)playNewModeSfx("intro",true);}

  const legTarget=config.seriesWins*2-1,activeStats=state.statsByPlayer[activePlayer?.id]||{},roundLabel=state.overtime?`OVERTIME ${Math.max(1,state.roundIndex-config.rules.rounds+2)}`:`ROUND ${state.roundIndex+1}/${config.rules.rounds}`;
  const previewDarts=currentThrow.map(uiToGameDart),callPreview=state.currentCalls.map(()=>({ok:false,pts:0,dartIndex:-1}));
  if(config.rules.orderedTargets){state.currentCalls.forEach((c:any,i:number)=>{const d=previewDarts[i];const ok=!!d&&callThreeDartMatches(d,c);callPreview[i]={ok,pts:ok?callThreeHitPoints(d):0,dartIndex:ok?i:-1};});}else{const used=new Set<number>();state.currentCalls.forEach((c:any,ci:number)=>{const di=previewDarts.findIndex((d:any,i:number)=>!used.has(i)&&callThreeDartMatches(d,c));if(di>=0){used.add(di);callPreview[ci]={ok:true,pts:callThreeHitPoints(previewDarts[di]),dartIndex:di};}});}
  const previewPts=callPreview.reduce((sum:number,x:any)=>sum+x.pts,0),previewHits=callPreview.filter((x:any)=>x.ok).length;
  const callInputGuide=React.useMemo(()=>{
    if(state.phase!=="playing")return{segments:[],bull:false,targets:[],label:"PRÉPARE LES APPELS",value:"CALL"};
    const indices=config.rules.orderedTargets?[Math.min(2,currentThrow.length)].filter(i=>i<state.currentCalls.length):state.currentCalls.map((_:any,i:number)=>i).filter((i:number)=>!callPreview[i]?.ok);
    const calls=indices.map((i:number)=>state.currentCalls[i]).filter(Boolean);
    const segments=calls.filter((c:any)=>c.kind==="number").map((c:any)=>Number(c.number));
    const bull=calls.some((c:any)=>c.kind==="bull");
    const targets=calls.map((c:any)=>c.kind==="bull"?{ring:"bull_any"}:{segment:Number(c.number),ring:"number"});
    const labels=calls.map(callThreeLabel);
    return{segments,bull,targets,label:`VISE ${labels.join(" · ")||"—"}`,value:labels[0]||"—"};
  },[state.phase,state.currentCalls,currentThrow.length,config.rules.orderedTargets,callPreview]);
  const firstVisitGuide=firstVisitGuideEnabled&&state.turnIndex===0&&(state.visits?.length||0)===0&&currentThrow.length===0,coach=firstVisitGuide?(state.phase==="calling"?"1 · Le caller compose 3 cibles. 2 · Chaque carte APPEL correspond à une fléchette. 3 · Confirme l’appel puis passe au joueur qui répond.":"1 · Lis les 3 cartes APPEL. 2 · Joue F1, F2, F3 dans l’ordre indiqué. 3 · Le bloc passe chaque appel en OK ou RATÉ et calcule les points automatiquement."):coachEnabled?coachText(state,activePlayer,callerPlayer):"";
  const remainingCallLabels=state.currentCalls.filter((_:any,i:number)=>!callPreview[i]?.ok).map(callThreeLabel),missionCallThree=state.phase==="calling"?{icon:"📣",title:`${callerPlayer?.name||"Caller"} compose les 3 appels`,text:`Sélectionne les 3 cartes cibles puis confirme l’appel. ${config.rules.orderedTargets?"Le joueur devra les jouer dans cet ordre.":"Le joueur pourra les jouer dans n’importe quel ordre."}`,chips:(callDraft||[]).map(callThreeLabel),tone:"normal"}:currentThrow.length>=3?{icon:previewHits===3?"🔥":previewHits===0?"✕":"📣",title:previewHits===3?`Full Call · ${previewPts} points`:previewHits===0?"Aucun appel réussi":`${previewHits}/3 appels réussis`,text:`La volée est complète : ${previewPts} point${previewPts>1?"s":""} seront ajoutés au score.`,chips:[`+${previewPts} PTS`,`${previewHits}/3 OK`,config.rules.orderedTargets?"ORDRE STRICT":"ORDRE LIBRE"],tone:previewHits===3?"success":previewHits===0?"danger":"normal"}:config.rules.orderedTargets?{icon:"🎯",title:`Fléchette ${currentThrow.length+1} → ${callInputGuide.value}`,text:"Chaque fléchette correspond à l’appel de même position. S=1 point · D=2 · T=3.",chips:[`F${currentThrow.length+1}`,`VISE ${callInputGuide.value}`,`${previewHits}/3 OK`],tone:"normal"}:{icon:"🎯",title:"Choisis une des cibles restantes",text:`Ordre libre : sécurise n’importe quel appel encore ouvert.`,chips:[...(remainingCallLabels.length?remainingCallLabels:["TOUT EST TOUCHÉ"]),`${previewHits}/3 OK`],tone:previewHits===3?"success":"normal"};
  const lastCallIndex=currentThrow.length-1,lastCallDart=lastCallIndex>=0?previewDarts[lastCallIndex]:null,lastMatchedCallIndex=lastCallDart?(config.rules.orderedTargets?(callPreview[lastCallIndex]?.ok?lastCallIndex:-1):callPreview.findIndex((x:any)=>Number(x?.dartIndex)===lastCallIndex)):-1,lastCallPoints=lastMatchedCallIndex>=0?Number(callPreview[lastMatchedCallIndex]?.pts||0):0;
  const lastCallImpact=lastCallDart?{icon:lastMatchedCallIndex>=0?"✓":"✕",value:`F${lastCallIndex+1} · ${dartLabel(lastCallDart)}`,detail:lastMatchedCallIndex>=0?`APPEL ${lastMatchedCallIndex+1} RÉUSSI · +${lastCallPoints} pt${lastCallPoints>1?"s":""}`:`HORS APPEL · 0 point`,tone:lastMatchedCallIndex>=0?"success":"danger"}:null;
  const nextCallCue=state.phase==="calling"?{icon:"📣",value:`CHOISIS APPEL ${callSlot+1}`,detail:`Actuel : ${callThreeLabel(callDraft[callSlot])}`,tone:"normal"}:currentThrow.length>=3?(previewHits===3?{icon:"🔥",value:`VALIDER FULL CALL · +${previewPts}`,detail:"Les 3 appels sont réussis",tone:"success"}:{icon:"✓",value:`VALIDER ${previewHits}/3 · +${previewPts}`,detail:"La volée est complète",tone:previewHits===0?"danger":"normal"}):config.rules.orderedTargets?{icon:"🎯",value:`VISE ${callThreeLabel(state.currentCalls[currentThrow.length])}`,detail:`Fléchette ${currentThrow.length+1} sur appel ${currentThrow.length+1}`,tone:"normal"}:remainingCallLabels.length?{icon:"🎯",value:`VISE ${remainingCallLabels.slice(0,3).join(" OU ")}`,detail:"Ordre libre · choisis une cible encore ouverte",tone:"normal"}:{icon:"🔥",value:"TOUS LES APPELS SONT OUVERTS",detail:"Termine la volée puis valide",tone:"success"};

  const rankingRows=React.useMemo(()=>[...state.players].map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;return{id:String(p.id),name:p.name,profile:profileById.get(String(p.id))||p,color,wins:Number(state.legWins[p.id]||0),score:Number(state.scores[p.id]||0),perfect:Number(st.perfectRounds||0),hits:Number(st.hits||0),subtitle:`${state.scores[p.id]||0} pts · ${percent(st.hits,st.darts)}% hits · ${st.perfectRounds||0} full`,value:Number(state.legWins[p.id]||0),suffix:" M",order:i};}).sort((a,b)=>b.wins-a.wins||b.score-a.score||b.perfect-a.perfect||b.hits-a.hits||a.order-b.order),[state.players,state.legWins,state.scores,state.statsByPlayer,profileById,colorById]);
  const playersRows=state.players.map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;return{id:p.id,name:p.name,profile:profileById.get(String(p.id))||p,color,active:String(p.id)===String(displayPlayer?.id),status:String(p.id)===String(state.currentCallerId)?"CALLER":i===state.activePlayerIndex?"RÉPOND":"EN ATTENTE",metrics:[{label:"PTS",value:state.scores[p.id]||0},{label:"HITS",value:st.hits||0},{label:"FULL",value:st.perfectRounds||0},{label:"M",value:state.legWins[p.id]||0}]};});
  const displayStats=state.statsByPlayer[displayPlayer?.id]||{};
  const statsItems=[{label:"POINTS",value:Number(state.scores[displayPlayer?.id]||0)},{label:"HITS",value:displayStats.hits||0,color:GREEN},{label:"PRÉCISION",value:`${percent(displayStats.hits,displayStats.darts)}%`},{label:"FULL CALLS",value:displayStats.perfectRounds||0,color:ACCENT2},{label:"BEST VOLÉE",value:displayStats.bestVisit||0},{label:"BEST SÉRIE",value:displayStats.bestStreak||0,color:BLUE},{label:"DOUBLES",value:displayStats.doubleHits||0},{label:"TRIPLES",value:displayStats.tripleHits||0},{label:"BULLS",value:displayStats.bullHits||0},{label:"APPELS CRÉÉS",value:displayStats.callsMade||0},{label:"MISS",value:displayStats.misses||0,color:RED},{label:"DARTS",value:displayStats.darts||0}];
  const awards=React.useMemo(()=>{const rows=rankingRows.map((r:any)=>({...r,st:state.statsByPlayer[r.id]||{}}));const scorer=bestBy(rows,r=>Number(state.scores[r.id]||0));const accurate=bestBy(rows,r=>percent(r.st.hits,r.st.darts));const full=bestBy(rows,r=>Number(r.st.perfectRounds||0));return[{icon:"📣",label:"SCORE",name:scorer?.name||"—",value:`${state.scores[scorer?.id]||0} pts`,color:scorer?.color},{icon:"🎯",label:"PRÉCISION",name:accurate?.name||"—",value:`${percent(accurate?.st?.hits,accurate?.st?.darts)}%`,color:accurate?.color},{icon:"🔥",label:"FULL CALL",name:full?.name||"—",value:`${full?.st?.perfectRounds||0}`,color:full?.color}];},[rankingRows,state.statsByPlayer,state.scores]);
  const totalDarts=Object.values(state.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0),durationMs=Math.max(0,Number((state.finishedAt||Date.now()))-Number(state.startedAt||Date.now()));
  const callsText=(state.currentCalls||[]).map(callThreeLabel).join(" · ");

  if(state.phase==="finished")return <div className="party-mode" style={{["--mode-accent" as any]:ACCENT}} data-mss-native-play-layout="1"><PageHeader tickerSrc={tickerCallThree} tickerAlt="CALL THREE" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("call_three_config")} color={ACCENT} glow={`${ACCENT}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="call_three_play" mode="call_three" screenLabel="CALL THREE · Partie" accent={ACCENT}/></div>:null}/><div style={{flex:"1 1 auto",minHeight:0,overflow:"auto"}}><PremiumEndPanel title="CALL THREE" accent={ACCENT} winnerId={state.winnerId} rankingRows={rankingRows} durationMs={durationMs} totalDarts={totalDarts} awards={awards} progression={progression ? {...progression, winnerCareer: progression.byPlayer?.[String(state.winnerId || "")] || null} : null} onReplay={replay} onStats={()=>go?.("statsHub",{mode:"active",initialStatsSubTab:"call_three",playerId:state.winnerId||state.players[0]?.id,focusMatchId:matchIdRef.current})} onHistory={()=>go?.("statsHub",{tab:"history",mode:"active",initialStatsSubTab:"history",focusMatchId:matchIdRef.current})} onConfig={()=>go?.("call_three_config")} onGames={()=>go?.("games",{gamesView:"all"})}/></div></div>;

  return <div className="party-mode" style={{["--mode-accent" as any]:displayColor}} data-mss-native-play-layout="1">
    <PageHeader tickerSrc={tickerCallThree} tickerAlt="CALL THREE" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("call_three_config")} color={displayColor} glow={`${displayColor}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="call_three_play" mode="call_three" screenLabel="CALL THREE · Partie" accent={displayColor}/></div>:null}/>
    {moment?<PremiumMomentOverlay moment={moment} accent={displayColor} profile={profileById.get(String(moment.playerId||""))} playerName={nameById(moment.playerId)}/>:null}
    {coach?<FloatingAdvice text={coach} accent={displayColor} kicker={firstVisitGuide?"PREMIER TOUR · MODE D’EMPLOI":state.phase==="calling"?"CONSEIL CALLER":"CONSEIL CIBLE"}/>:null}
    <main className="party-mode__body"><div className="party-mode__stage"><div className="party-mode__left">
      <SummaryStrip players={state.players} activeId={displayPlayer?.id} profileById={profileById} colorById={colorById} winsById={state.legWins} primaryById={(id:string)=>state.scores[id]||0} secondaryById={(id:string)=>`${state.statsByPlayer[id]?.hits||0} hits · ${state.statsByPlayer[id]?.perfectRounds||0} full`}/>
      <ActiveHero profile={displayProfile} name={displayPlayer?.name} accent={displayColor} eyebrow={`MANCHE ${state.legIndex+1} · ${roundLabel} · BO${legTarget}`} primary={state.phase==="calling"?"CALL":Number(state.scores[activePlayer?.id]||0)} primarySuffix={state.phase==="playing"?" PTS":""} secondary={state.phase==="calling"?"Compose les 3 cibles de la prochaine volée":`APPEL : ${callsText}`} tertiary={state.phase==="calling"?`${config.rules.orderedTargets?"ordre strict":"ordre libre"} · ${config.rules.bullAllowed?"Bull autorisé":"sans Bull"}`:currentThrow.length?`${previewHits}/3 réussies · +${previewPts} pts prévus`:`${percent(activeStats.hits,activeStats.darts)}% hits · best volée ${activeStats.bestVisit||0}`} notice={notice} noticeTone={notice.includes("🏆")?"win":previewHits===0&&currentThrow.length?"danger":"normal"} aside={<div style={{textAlign:"center"}}><div style={{fontSize:30}}>{state.phase==="calling"?"📣":previewHits===3?"🔥":"🎯"}</div><div style={{fontSize:8,color:displayColor,marginTop:4}}>{state.phase==="calling"?"CALLER":`${previewHits}/3`}</div></div>}/>
      {(state.phase==="calling"?!callerIsBot:!activeIsBot)?<GameplayMission accent={displayColor} icon={missionCallThree.icon} title={missionCallThree.title} text={missionCallThree.text} chips={missionCallThree.chips} tone={missionCallThree.tone} lastDart={state.phase==="playing"?lastCallImpact:null} nextDart={nextCallCue}/>:null}
      <CallThreeGameplayVisual accent={displayColor} phase={state.phase} calls={(state.currentCalls||[]).map(callThreeLabel)} draftCalls={(callDraft||[]).map(callThreeLabel)} selectedSlot={callSlot} currentThrow={currentThrow} preview={callPreview} ordered={config.rules.orderedTargets} callerName={callerPlayer?.name} activeName={activePlayer?.name}/>
      <KpiStrip accent={displayColor} onClick={()=>setStatsOpen(true)} items={state.phase==="calling"?[["APPELS",displayStats.callsMade||0],["PTS",state.scores[displayPlayer?.id]||0],["FULL",displayStats.perfectRounds||0],["M",state.legWins[displayPlayer?.id]||0]]:[["PTS",state.scores[activePlayer?.id]||0],["HITS",activeStats.hits||0],["PRÉC.",`${percent(activeStats.hits,activeStats.darts)}%`],["M",state.legWins[activePlayer?.id]||0]]}/>
      <QuickRow players={state.players} activeId={displayPlayer?.id} profileById={profileById} colorById={colorById} ticker={tickerCallThree} onPlayers={()=>setPlayersOpen(true)} onStats={()=>setStatsOpen(true)} onLog={()=>setLogOpen(true)} onRanking={()=>setRankingOpen(true)} onUndo={()=>{if(currentThrow.length){setCurrentThrow((v:UIDart[])=>v.slice(0,-1));setNotice("Dernière fléchette retirée");}else doUndo();}} undoDisabled={!currentThrow.length&&!undo.length} undoTitle={currentThrow.length?"Retirer la dernière fléchette":"Annuler la dernière action validée"}/>
    </div><div className="party-mode__input">{state.phase==="calling"?(!callerIsBot?<CallPicker calls={callDraft} setCalls={setCallDraft} selected={callSlot} setSelected={setCallSlot} bullAllowed={config.rules.bullAllowed} onRandom={()=>setCallDraft(randomCallThreeCalls(config.rules.bullAllowed,Date.now()))} onConfirm={()=>confirmCall(callDraft,false)} accent={displayColor}/>:<BotTurn profile={callerProfile} name={callerPlayer?.name} accent={displayColor} text="compose les trois appels…" icon="📣"/>):!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={()=>{setCurrentThrow([]);setMultiplier(1)}} preferredMethod={config.scoreInputMethod} minDartsToValidate={3} guideSegmentNumbers={callInputGuide.segments} guideBull={callInputGuide.bull} guideLabel={callInputGuide.label} dartboardGuideTargets={callInputGuide.targets} centerSlot={<ModeInputGuideBadge accent={displayColor} label={config.rules.orderedTargets?"PROCHAIN APPEL":"CIBLES"} value={config.rules.orderedTargets?callInputGuide.value:`${Math.max(0,3-previewHits)} RESTE`} sub="S=1 · D=2 · T=3"/>} validateLabel={currentThrow.length<3?`VOLÉE ${currentThrow.length}/3 · ${previewHits} OK`:previewHits===3?`FULL CALL · +${previewPts}`:`VALIDER ${previewHits}/3 · +${previewPts}`} accent={displayColor} fitMinScale={0.16}/>:<BotTurn profile={activeProfile} name={activePlayer?.name} accent={displayColor} text={`répond à ${callsText}…`} icon="🎯"/>}</div></div></main>
    {playersOpen?<PlayersModal rows={playersRows} onClose={()=>setPlayersOpen(false)}/>:null}{statsOpen?<StatsModal items={statsItems} accent={displayColor} subtitle={displayPlayer?.name} onClose={()=>setStatsOpen(false)}/>:null}{logOpen?<LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={dartLabel} title="JOURNAL CALL THREE" onClose={()=>setLogOpen(false)}/>:null}{rankingOpen?<RankingModal rows={rankingRows} title="CLASSEMENT CALL THREE" onClose={()=>setRankingOpen(false)}/>:null}
  </div>;
}
