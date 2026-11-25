import {useLangOptional} from '../contexts/LangContext';
import {chainUi,localizedChainTitle,localizedChainFormat,localizedChainRule} from '../i18n/challengeChainTranslations';
import {BottomNavIcon} from '../components/BottomNav';
import {playNewModeSfx} from '../lib/newModesArcadeSfx';
import {CHAIN_ID,chainVariant,chainFormat,chainLimit,chainConfigKey,chainKey,chainLabel,chainImpactKeys,type ChainStat} from '../lib/challengeChains';
import Keypad from '../components/Keypad';
import {MSS_HIT,mssHitColor} from '../lib/mssVisualCharter';
import cricketDartSvg from '../ui_assets/cricket-dart.svg';
import type {Dart} from '../lib/types';
import {getChallengeOnlineUserId,isChallengeProfileLinkedToUser,submitChainLeaderboardSession} from '../lib/challengeLeaderboard';
import React from 'react';
import BackDot from '../components/BackDot';
import {useTheme} from '../contexts/ThemeContext';
import {useStore} from '../contexts/StoreContext';
import {useAwenaOptional} from '../awena/AwenaProvider';
import {useFullscreenPlay} from '../hooks/useFullscreenPlay';
import {History} from '../lib/history';
import {chainCareerSession,summarizeChainCareer,type ChainCareerSession} from '../lib/challengeChainCareer';
import {recordTrainingDetailedSession,getTrainingDetailedSessions} from '../training/stats/trainingStatsHub';
import TrainingChallengeVoiceGuide from '../training/ui/TrainingChallengeVoiceGuide';
import '../training/ui/trainingChallengeVoiceGuide.css';
import {getChallengeTrainingPreset} from '../training/catalog/challengeTrainingCatalog';
import {saveTrainingArcadeDraft,clearTrainingArcadeDraft} from '../training/profile/trainingArcadeDraft';
import {getArcadeChallenge} from '../lib/challengeArcadeCatalog';
import {arcadeObjectives,arcadeBountyNumbers,arcadeRuleDetails,arcadeRuleDescription,arcadeTerritories,arcadeHitValue,compareArcadeRanks,currentArcadePlayer,evaluateArcadeProgress,formatArcadeHit,type ArcadeHit,type ArcadeObjective,type ArcadePlayConfig,type ArcadeZone,type ArcadeVariant} from '../lib/challengeArcadeEngine';
import './ChallengeArcadePlay.css';

type Player={id:string;name:string;avatar?:string;onlineUserId?:string;isBot?:boolean;botLevel?:string};
const numbers=Array.from({length:20},(_,i)=>i+1);
const avatar=(p:any)=>p?.avatarDataUrl||p?.photoDataUrl||p?.avatarUrl||p?.photoUrl||'';
const onlineId=(p:any)=>String(p?.onlineUserId||p?.privateInfo?.onlineUserId||p?.userId||'').trim();
const normalizedLog=(raw:any):ArcadeHit[]=>Array.isArray(raw)?raw.filter((e:any)=>e&&e.pid&&['G','P','D','T','BULL','DBULL','MISS'].includes(e.zone)).map((e:any)=>({pid:String(e.pid),zone:e.zone as ArcadeZone,segment:e.segment===null?null:Number(e.segment)||null,choice:e.choice,intendedSegment:e.intendedSegment,intendedZone:e.intendedZone})):[];
const useStablePlayers=(ids:string[],profiles:any[]):Player[]=>ids.length?ids.map(id=>{
 const profile:any=profiles.find(item=>String(item?.id)===id);
 return {id,name:String(profile?.name||profile?.nickname||'Joueur'),avatar:avatar(profile),onlineUserId:onlineId(profile),isBot:Boolean(profile?.isBot||String(id).startsWith("bot_")),botLevel:profile?.botLevel};
}):[{id:'preview',name:'Joueur'}];

/** Même charte et mêmes joueurs que ChallengePlay, avec règles de jeu réellement séparées.
 * Les événements sont rejoués par le moteur pur après chaque saisie et chaque ANNULER.
 */
export default function ChallengeArcadePlay({go,params,onCompetitionFinish}:{go:(tab:any,params?:any)=>void;params?:any;onCompetitionFinish?:(result:{winnerId:string|null;standings:Array<{id:string;name:string;score:number;tieBreak:number;accuracy:number;bestStreak:number}>;record:any})=>void|Promise<void>}){
 useFullscreenPlay({enabled:true,lockBodyScroll:false});
 const theme=useTheme(),awena=useAwenaOptional();
 const chainLang=useLangOptional()?.lang||'fr';
 const ct=(source:string)=>chainUi(chainLang,source);
 const {store}=useStore();
 const record:any=params?.rec||null;
 const restored:any=record?.decoded||record?.payload||record?.resume?.livePayload||{};
 const oldState:any=params?.snapshot||record?.resume?.state||restored?.state||{};
 const game:any=params?.config||record?.resume?.config||restored?.config||{};
 const fromTrainingLab=Boolean(params?.fromTrainingLab===true || game.trainingOrigin==='training_lab');
 const trainingOwnerId=fromTrainingLab?String(game.trainingOwnerId||game.playerIds?.[0]||''):'';
 const trainingPresetId=fromTrainingLab?String(game.trainingCatalogPresetId||''):'';
 const id=String(game.catalogChallengeId||'perfect-line');
 const definition=getArcadeChallenge(id);
 const isChain=id===CHAIN_ID;
 const players=React.useMemo(()=>{
  const saved=Array.isArray(record?.players)?record.players:[];
  const roster=Array.isArray(store?.profiles)?store.profiles:[];
  const ids=Array.isArray(game.playerIds)&&game.playerIds.length?game.playerIds.map(String):saved.map((p:any)=>String(p.id));
  const competition=Array.isArray(params?.competitionParticipants)?params.competitionParticipants:[];
  return useStablePlayers(ids,params?.historyStatsOnly?[...saved,...roster]:[...roster,...competition,...saved]);
 },[game.playerIds,store?.profiles,record,params?.competitionParticipants]);
 const [assignments,setAssignments]=React.useState<Record<string,ArcadeObjective[]>>(()=>oldState.assignments||game.catalogAssignments||{});
 const [ready,setReady]=React.useState(id!=='architects-duel'||Boolean(oldState.assignments||game.catalogAssignments));
 const [ghost,setGhost]=React.useState<number[]>(()=>Array.isArray(oldState.ghost)?oldState.ghost:Array.isArray(game.catalogGhost)?game.catalogGhost:[]);
 const [zone,setZone]=React.useState<ArcadeZone>('D');
 const [risk,setRisk]=React.useState<ArcadeVariant>(game.catalogVariant==='doubles'?'doubles':game.catalogVariant==='triples'?'triples':'classic');
 const [intendedSegment,setIntendedSegment]=React.useState(20);
 const [hits,setHits]=React.useState<ArcadeHit[]>(()=>normalizedLog(oldState.hits||oldState.log||restored.entries));
 const [chainEnded,setChainEnded]=React.useState(Boolean(oldState.chainEnded||game.chainEnded||(isChain&&params?.historyStatsOnly&&record?.status==='finished')));
 const [chainDraft,setChainDraft]=React.useState<ArcadeHit[]>([]);
 const [chainMult,setChainMult]=React.useState<1|2|3>(1);
 const [chainPanel,setChainPanel]=React.useState<'rules'|'stats'|'players'|'career'|null>(null);
 const [careerSessions,setCareerSessions]=React.useState<ChainCareerSession[]>([]);
 const [careerLoading,setCareerLoading]=React.useState(false);
 const [careerError,setCareerError]=React.useState('');
 const [careerPlayer,setCareerPlayer]=React.useState('');
 const [chainFamily,setChainFamily]=React.useState<string>('ALL');
 const [onlineStatus,setOnlineStatus]=React.useState('');
 const [resetOpen,setResetOpen]=React.useState(false);
 const [persistError,setPersistError]=React.useState('');
 const [detailOpen,setDetailOpen]=React.useState(false);
 const [sessionId,setSessionId]=React.useState(()=>String(record?.matchId||record?.id||`challenge-arcade-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
 const [createdAt,setCreatedAt]=React.useState(()=>Number(record?.createdAt||Date.now()));
 const rules:ArcadePlayConfig={catalogChallengeId:id,catalogLine:Number(game.catalogLine)||20,
  catalogVariant:game.catalogVariant==='doubles'?'doubles':game.catalogVariant==='triples'?'triples':'classic',
  catalogRounds:Number(game.catalogRounds)||5,catalogTarget:Number(game.catalogTarget)||100,
  catalogStep:Number(game.catalogStep)||3,catalogMin:Number(game.catalogMin)||60,catalogMax:Number(game.catalogMax)||80,
  catalogLives:Number(game.catalogLives)||3,catalogSeed:Number(game.catalogSeed)||1,
  catalogAssignments:assignments,catalogGhost:ghost,chainVariant:game.chainVariant,chainFormat:game.chainFormat,chainGoal:game.chainGoal,chainDarts:game.chainDarts,chainEnded};
 const modeDetails=arcadeRuleDetails(rules);
 const ids=players.map(p=>p.id);
 const activeId=currentArcadePlayer(hits,ids,rules);
 const currentPlayerHits=hits.filter(h=>h.pid===activeId);
 const visitChoice=currentPlayerHits.length%3!==0?(currentPlayerHits[currentPlayerHits.length-(currentPlayerHits.length%3)]?.choice||risk):risk;
 const riskLocked=currentPlayerHits.length%3!==0;
 const progress=players.map(player=>({player,...evaluateArcadeProgress(hits.filter(h=>h.pid===player.id),rules,hits,player.id)}));
 const active=progress.find(row=>row.player.id===activeId)||progress[0]!;
 const sequence=arcadeObjectives(rules,active.player.id);
 const finished=progress.every(row=>row.complete);
 const standings=[...progress].sort((a,b)=>compareArcadeRanks(a,b,rules));
 const board=id==='territory-war'?arcadeTerritories(hits):null;
 const isTeam=id==='perfect-relay';
 const isHistoryView=Boolean(params?.historyStatsOnly);
 const back=()=>isHistoryView?go(String(params?.returnTab||'history'),params?.returnParams):fromTrainingLab?go('training_mode',{modeId:'training_lab',challengeCatalog:true}):go('challenge_config');
 const finishLeader=standings[0];
 const lastHits=hits.slice(-9).reverse();
 const liveChain=isChain?evaluateArcadeProgress([...hits.filter(h=>h.pid===active.player.id),...chainDraft],rules):null;
 const chainDraftLimit=3-currentPlayerHits.length%3;
 const chainCanValidate=chainDraft.length>0&&(chainDraft.length===chainDraftLimit||Boolean(liveChain?.complete));
 const liveStats=liveChain?.chains?.stats;
 const chainDart=(h:ArcadeHit):Dart=>({v:h.zone==='MISS'?0:h.zone==='BULL'||h.zone==='DBULL'?25:h.segment||0,mult:h.zone==='T'?3:h.zone==='D'||h.zone==='DBULL'?2:1});
 const stageChain=(z:ArcadeZone,n:number|null)=>{
  if(!activeId||finished||active.player.isBot||isHistoryView)return;
  setChainDraft(previous=>{if(previous.length>=chainDraftLimit||evaluateArcadeProgress([...currentPlayerHits,...previous],rules).complete)return previous;return [...previous,{pid:activeId,zone:z,segment:n}];});
  setChainMult(1);
 };
 const commitChain=()=>{if(!chainCanValidate||isHistoryView)return;
  const before=active.chains?.stats||{},after=liveChain?.chains?.stats||{};
  const keys=Object.keys(after);const record=keys.some(k=>(before[k]?.best||0)>0&&(after[k]?.best||0)>(before[k]?.best||0));
  const rupture=keys.some(k=>(after[k]?.breaks||0)>(before[k]?.breaks||0));
  const linked=chainDraft.some(h=>chainImpactKeys(h).includes(chainKey(rules)));
  if(record||rupture||linked)playNewModeSfx(record?'chain-record':rupture?'chain-break':'chain-link',game.soundsEnabled!==false);
  setHits(previous=>[...previous,...chainDraft]);setChainDraft([]);setChainMult(1);};
 const undoChain=()=>{if(isHistoryView||active.player.isBot)return;if(chainDraft.length)setChainDraft(v=>v.slice(0,-1));else {setChainEnded(false);setHits(v=>v.slice(0,-1));}};
 // Les bots ne sont activés que pour ce nouveau mode, avec le même journal que les humains.
 React.useEffect(()=>{
  if(!isChain||!activeId||!active.player.isBot||finished||isHistoryView||chainDraft.length)return;
  const timer=window.setTimeout(()=>{
   const key=chainKey(rules),n=Number(key.slice(1))||Math.floor(Math.random()*20)+1;
   const rate=active.player.botLevel==='hard'?.75:active.player.botLevel==='medium'?.48:.25;
   let z:ArcadeZone='G',segment:number|null=n;
   if(key==='25'||key==='50'||key==='BULL'){z=key==='25'?'BULL':key==='50'?'DBULL':Math.random()<.5?'BULL':'DBULL';segment=null;}
   else if(key[0]==='D')z='D';else if(key[0]==='T')z='T';else if(key==='HIT')z=Math.random()<.35?'T':Math.random()<.2?'D':'G';
   if(Math.random()>rate){z=Math.random()<.28?'MISS':'G';segment=z==='MISS'?null:Math.floor(Math.random()*20)+1;}
   setHits(previous=>currentArcadePlayer(previous,ids,rules)===activeId?[...previous,{pid:activeId,zone:z,segment}]:previous);
  },420);return()=>window.clearTimeout(timer);
 },[isChain,activeId,active.player.isBot,active.player.botLevel,finished,isHistoryView,hits.length,chainDraft.length,chainEnded]);
 const stats=(player:Player)=>{
  const own=hits.filter(h=>h.pid===player.id);
  const grouped=Object.fromEntries((['G','P','D','T','BULL','DBULL','MISS'] as ArcadeZone[]).map(key=>[key,own.filter(h=>h.zone===key).length]));
  const p=progress.find(row=>row.player.id===player.id)!;
  return {...grouped,accuracy:p.accuracy,darts:p.attempts,score:p.score,bestStreak:p.bestStreak,lives:p.lives,visitScores:p.visitScores};
 };
 const recordHit=(impact:ArcadeZone,segment:number|null)=>{
  if(isHistoryView||!ready||finished)return;
  setHits(previous=>{
   const pid=currentArcadePlayer(previous,ids,rules);
   return pid?[...previous,{pid,zone:impact,segment,choice:(id==='kings-choice'||id==='controlled-roulette')?(previous.filter(h=>h.pid===pid).length%3===0?risk:(previous.filter(h=>h.pid===pid)[previous.filter(h=>h.pid===pid).length-previous.filter(h=>h.pid===pid).length%3]?.choice||risk)):undefined,
    ...(impact==='MISS'&&id==='revenge'?{intendedSegment,intendedZone:zone}:{})}]:previous;
  });
 };
 // Les fantômes proviennent d'anciennes parties enregistrées pour le même profil.
 React.useEffect(()=>{
  if(id!=='ghost-challenge'||ghost.length||isHistoryView)return;
  let alive=true;
  void History.getAll().then((records:any[])=>{
   if(!alive)return;
   const matches=(Array.isArray(records)?records:[]).filter((row:any)=>row?.status==='finished'&&
    (row?.payload?.config?.catalogChallengeId||row?.game?.catalogChallengeId)==='ghost-challenge'&&row?.id!==sessionId);
   const mine=matches.flatMap((row:any)=>row?.payload?.stats?.players||[]).filter((row:any)=>ids.includes(String(row?.id)));
   const best=mine.sort((a:any,b:any)=>Number(b.score||0)-Number(a.score||0))[0];
   if(Array.isArray(best?.scoreHistory)&&best.scoreHistory.length)setGhost(best.scoreHistory);
  }).catch(()=>{});
  return()=>{alive=false};
 },[id,ghost.length,sessionId,isHistoryView,ids.join('|')]);
 const historyRecord=React.useMemo(()=>{
  const now=Date.now();
  const rows=standings.map((row,index)=>({id:row.player.id,name:row.player.name,rank:index+1,
   avatarDataUrl:row.player.avatar||null,...(row.player.onlineUserId?{onlineUserId:row.player.onlineUserId,userId:row.player.onlineUserId}:{}),
   score:row.score,points:row.score,darts:row.attempts,dartsThrown:row.attempts,
   successRate:row.accuracy,accuracy:row.accuracy,hitCount:row.successes,misses:row.attempts-row.successes,
   ...(row.chains?{chainStats:row.chains.stats}:{}),bestStreak:row.bestStreak,visitScores:row.visitScores,scoreHistory:row.scoreHistory,
   exerciseStats:{type:'arcade',modeId:id,score:row.score,accuracy:row.accuracy,attempts:row.attempts,completed:row.complete,...(row.chains?{chainStats:row.chains.stats}:{})}}));
  const topId=finished&&!isTeam&&standings.length>1&&(!isChain||compareArcadeRanks(standings[0]!,standings[1]!,rules)!==0)?standings[0]?.player.id:null;
  const status=finished?'finished':'in_progress';
  const uniqueTarget=isChain?chainConfigKey(rules):`arcade-${id}-${rules.catalogLine}-${rules.catalogVariant}-${rules.catalogRounds}-${rules.catalogTarget}-${rules.catalogMin}-${rules.catalogMax}-${rules.catalogLives}`;
  const storedVisits=isChain?(Number.isFinite(chainLimit(rules))?Math.ceil(chainLimit(rules)/3):1):rules.catalogRounds;
  const summary={title:definition.title,kind:'challenge',mode:'challenge',status,finished,winnerId:topId,
   matchMode:game.matchMode||'solo',scoreLine:rows.map(row=>`${row.name} ${row.score}`).join(' · '),
   rankings:rows,perPlayer:rows,finalScores:Object.fromEntries(rows.map(row=>[row.id,row.score])),
   target:uniqueTarget,leaderboardTarget:uniqueTarget,objective:definition.title,rule:'arcade',visits:storedVisits,exerciseType:'arcade'};
  const log=hits.map(h=>({hit:h.zone==='BULL'?'25':h.zone==='DBULL'?'50':h.zone==='MISS'?'MISS':h.zone==='G'||h.zone==='P'?'S':h.zone,
   zone:h.zone,segment:h.segment,pid:h.pid,choice:h.choice,intendedSegment:h.intendedSegment,intendedZone:h.intendedZone}));
  const state={hits:[...hits],log:[...hits],updatedAt:now,assignments,ghost,chainEnded};
  const config={...game,...rules,...(isChain?{visits:storedVisits,rule:'arcade'}:{}),playerIds:ids,exerciseType:'arcade',leaderboardTarget:uniqueTarget};
  const payload={kind:'challenge',mode:'challenge',sport:'darts',status,config,state,
   entries:log,events:log,players:rows,finalPlayers:rows,summary,
   stats:{kind:'challenge',mode:'challenge',players:rows,global:{matches:1,exerciseType:'arcade',arcadeId:id,visits:storedVisits}}};
  return {id:sessionId,matchId:sessionId,resumeId:sessionId,kind:'challenge',mode:'challenge',sport:'darts',status,
   createdAt,updatedAt:now,finishedAt:finished?now:undefined,winnerId:topId,
   players:players.map(p=>({id:p.id,name:p.name,avatarDataUrl:p.avatar||null,isBot:p.isBot,botLevel:p.botLevel,...(p.onlineUserId?{onlineUserId:p.onlineUserId,userId:p.onlineUserId}:{})})),
   game:{mode:'challenge',exerciseType:'arcade',catalogChallengeId:id,leaderboardTarget:uniqueTarget,target:uniqueTarget,rule:'arcade',visits:storedVisits},
   summary,payload,resume:finished?undefined:{config,state,livePayload:payload,summary}};
 },[hits.length,hits,finished,standings.map(p=>[p.player.id,p.score,p.index,p.complete].join(':')).join('|'),id,assignments,ghost,createdAt,sessionId,chainEnded]);
 // Sur le moteur central History V4, la partie commencée n'apparaît pas comme terminée.
 // Debounce pour éviter un accès IndexedDB par pression ; unflush de fin est immédiat.
 const pendingSaveRef=React.useRef<{record:any;dirty:boolean}>({record:null,dirty:false});
 const trainingSavedRef=React.useRef<string|null>(null);
 React.useEffect(()=>{
  if(!fromTrainingLab||isHistoryView||!trainingOwnerId||!trainingPresetId)return;
  if(finished){clearTrainingArcadeDraft(trainingOwnerId,trainingPresetId);return;}
  if(!hits.length)return;
  saveTrainingArcadeDraft({participantId:trainingOwnerId,presetId:trainingPresetId,savedAt:Date.now(),
   hits:[...hits],config:game,assignments,ghost});
 },[fromTrainingLab,isHistoryView,trainingOwnerId,trainingPresetId,finished,hits,assignments,ghost]);
 React.useEffect(()=>{
  if(!fromTrainingLab||isHistoryView||!ready||!finished||trainingSavedRef.current===sessionId)return;
  trainingSavedRef.current=sessionId;
  const now=Date.now();
  const definition=getChallengeTrainingPreset(trainingPresetId);
  for(const row of progress){
   const participantHits=hits.filter(hit=>hit.pid===row.player.id);
   const completionPct=modeDetails.kind==='path'||modeDetails.kind==='team'
     ?Math.max(0,Math.min(100,Math.round(row.index/Math.max(1,row.totalObjectives)*100)))
     :Math.max(0,Math.min(100,Math.round(row.accuracy)));
   const successful=participantHits.filter((_,index)=>row.hitResults[index]===true).length;
   const objectiveReached=modeDetails.kind==='path'||modeDetails.kind==='team'
     ?row.index>=Math.max(1,row.totalObjectives)
     :modeDetails.kind==='streak'?row.bestStreak>0:row.score>0;
   try{
    recordTrainingDetailedSession({
     id:`${sessionId}-training-${row.player.id}`,modeId:'training_challenges',participantId:row.player.id,
     participantName:row.player.name,participantType:row.player.isBot?'bot':'player',startedAt:createdAt,endedAt:now,
     durationMs:Math.max(0,now-createdAt),darts:row.attempts,hits:successful,
     misses:Math.max(0,row.attempts-successful),points:row.score,accuracyPct:row.accuracy,success:objectiveReached,
     config:{...game,...rules,trainingOrigin:'training_lab',trainingCatalogPresetId:trainingPresetId,sourceMode:'challenge'},
     metrics:{sourceMode:'challenge',exerciseId:trainingPresetId,
      exerciseTitle:definition?.title||getArcadeChallenge(id).title,score:row.score,
      performanceScore:completionPct,trainingPerformancePct:completionPct,completionPct,
      goal:100,exerciseValidationRate:row.accuracy,bestStreak:row.bestStreak,
      exerciseType:'arcade',arcadeId:id,matchId:sessionId,...(row.chains?{chainBest:row.bestStreak,chainTypes:Object.keys(row.chains.stats).length}:{})},
     visitHistory:participantHits,
     telemetry:{sourceMode:'challenge',arcadeId:id,hits:participantHits,scoreHistory:row.scoreHistory,
      visitScores:row.visitScores,hitResults:row.hitResults,...(row.chains?{chainStats:row.chains.stats}:{})},telemetryCoverage:'exact',
    });
   }catch(error){console.warn('[challenge-arcade] entraînement : enregistrement impossible',error)}
  }
 },[fromTrainingLab,isHistoryView,ready,finished,sessionId,trainingPresetId,createdAt,hits,progress,game,modeDetails.kind,id]);
 React.useEffect(()=>{
  if(!isHistoryView&&!fromTrainingLab&&ready&&hits.length)pendingSaveRef.current={record:historyRecord,dirty:true};
 },[historyRecord,isHistoryView,ready,hits.length]);
 React.useEffect(()=>{
  if(isHistoryView||fromTrainingLab||!ready||!hits.length)return;
  const snapshot=historyRecord;
  const timer=window.setTimeout(()=>{
   void History.upsert(snapshot as any).then(()=>{
    if(pendingSaveRef.current.record===snapshot)pendingSaveRef.current.dirty=false;
    setPersistError('');
   }).catch((error:any)=>setPersistError('Sauvegarde impossible : '+String(error?.message||error)));
  },finished?0:700);
  return()=>window.clearTimeout(timer);
 },[hits.length,historyRecord,finished,ready,isHistoryView]);
 React.useEffect(()=>()=>{
  // Une sortie rapide de page ne doit pas annuler l'enregistrement de la volée courante.
  if(!fromTrainingLab&&pendingSaveRef.current.dirty&&pendingSaveRef.current.record){
   void History.upsert(pendingSaveRef.current.record).catch(error=>console.warn('[challenge-arcade] sortie : sauvegarde',error));
  }
 },[]);
 const restart=()=>{
  if(isHistoryView)return;
  setHits([]);setChainDraft([]);setChainEnded(false);setOnlineStatus('');setGhost([]);setResetOpen(false);setCreatedAt(Date.now());
  if(fromTrainingLab&&trainingOwnerId&&trainingPresetId)clearTrainingArcadeDraft(trainingOwnerId,trainingPresetId);
  setSessionId(`challenge-arcade-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
 };
 const shownScore=modeDetails.kind==='path'||modeDetails.kind==='team'?`${active.attempts} FLÉCHETTES`:active.score+' PTS';
 const targetLabel=isChain?localizedChainTitle(chainLang,rules):active.current?.label||(['exact-copy'].includes(id)?'REPRODUIRE LA VOLÉE':id==='territory-war'?'CONQUÉRIR DES TERRITOIRES':id==='contracts'?'3 CONTRATS':id==='bounty-hunt'?'10 PRIMES':id==='ghost-challenge'?'BATS TON FANTÔME':'SCORE À RÉALISER');
 const progressRatio=modeDetails.kind==='path'||modeDetails.kind==='team'?active.index/Math.max(1,active.totalObjectives):Math.min(1,active.attempts/(Math.max(1,Number(rules.catalogRounds))*3));
 const competitionSubmitted=React.useRef('');
 React.useEffect(()=>{
  if(!isChain||!onCompetitionFinish||isHistoryView||!finished||!hits.length||competitionSubmitted.current===sessionId)return;
  if(standings.length>1&&compareArcadeRanks(standings[0],standings[1],rules)===0)return;
  competitionSubmitted.current=sessionId;
  void (async()=>{try{await History.upsert(historyRecord as any);if(pendingSaveRef.current.record===historyRecord)pendingSaveRef.current.dirty=false;
   await onCompetitionFinish({winnerId:standings[0]?.player.id||null,standings:historyRecord.summary.rankings.map(row=>({...row,tieBreak:0})),record:historyRecord});
  }catch(error){competitionSubmitted.current='';setPersistError('Résultat de compétition non enregistré : '+String(error));}})();
 },[isChain,finished,sessionId,isHistoryView,hits.length,onCompetitionFinish]);
 const onlineSubmitted=React.useRef('');
 const [onlineRetry,setOnlineRetry]=React.useState(0);
 React.useEffect(()=>{
  if(!isChain||chainPanel!=='career'||params?.onlineStatsOnly)return;
  let alive=true;const pid=careerPlayer||active.player.id;setCareerLoading(true);setCareerError('');setCareerSessions([]);
  void (async()=>{try{
   const headers=await History.list();const sessions:ChainCareerSession[]=[];
   for(const header of headers as any[]){
    const target=String(header.game?.leaderboardTarget||header.summary?.leaderboardTarget||'');
    if(header.game?.catalogChallengeId!==CHAIN_ID&&!target.startsWith('arcade-'+CHAIN_ID+'-'))continue;
    if(Array.isArray(header.players)&&header.players.length&&!header.players.some((p:any)=>String(p.id)===pid))continue;
    const rec=await History.get(String(header.matchId||header.id));const session=chainCareerSession(rec,pid);if(session)sessions.push(session);
   }
   for(const t of getTrainingDetailedSessions({participantId:pid,modeId:'training_challenges'})){
    if(t.config?.catalogChallengeId!==CHAIN_ID||!Array.isArray(t.telemetry?.hits))continue;
    sessions.push({id:String(t.metrics?.matchId||t.id),config:t.config,hits:t.telemetry.hits,playedAt:t.endedAt,source:'training'});
   }
   if(alive)setCareerSessions(sessions);
  }catch{if(alive)setCareerError('Impossible de charger les records de carrière.');}finally{if(alive)setCareerLoading(false);}})();
  return()=>{alive=false};
 },[isChain,chainPanel,careerPlayer,active.player.id,params?.onlineStatsOnly]);
 const career=React.useMemo(()=>summarizeChainCareer(careerSessions,rules),[careerSessions,chainConfigKey(rules)]);

 React.useEffect(()=>{
  if(!isChain||!finished||!hits.length||params?.onlineStatsOnly||fromTrainingLab||onCompetitionFinish||(isHistoryView&&onlineRetry===0)||onlineSubmitted.current===sessionId)return;
  onlineSubmitted.current=sessionId;
  void (async()=>{try{
   const uid=await getChallengeOnlineUserId();if(!uid){setOnlineStatus('Records locaux conservés · connexion ONLINE requise');onlineSubmitted.current='';return;}
   const row=progress.find(p=>!p.player.isBot&&(p.player.id===uid||p.player.onlineUserId===uid||isChallengeProfileLinkedToUser((store?.profiles||[]).find((profile:any)=>String(profile.id)===p.player.id),uid)));
   if(!row||!row.attempts){setOnlineStatus('Records locaux conservés · profil non lié au compte ONLINE');onlineSubmitted.current='';return;}
   const entries=hits.filter(h=>h.pid===row.player.id).map(h=>({pid:h.pid,zone:h.zone,segment:h.segment,hit:h.zone==='G'||h.zone==='P'?'S':h.zone==='BULL'?'25':h.zone==='DBULL'?'50':h.zone}));
   setOnlineStatus('Synchronisation des chaînes…');
   const response=await submitChainLeaderboardSession({config:{...rules,chainEnded:true},entries,matchId:sessionId,displayName:row.player.name,avatarUrl:row.player.avatar||null});
   setOnlineStatus(response.ok?`${response.submitted}/${response.total} classements ONLINE synchronisés`:`Records locaux conservés · ${response.submitted}/${response.total} classements synchronisés`);
   if(!response.ok)onlineSubmitted.current='';
  }catch{onlineSubmitted.current='';setOnlineStatus('Record local conservé · ONLINE indisponible');}})();
 },[isChain,finished,hits.length,sessionId,isHistoryView,fromTrainingLab,onlineRetry]);
 const haveSetup=ready||(id!=='architects-duel');
 if(isChain){
  const chainActive=liveChain?.chains?.primary||active.chains?.primary;
  const familyKeys=['S','D','T','BULL','25','50'];
  const chainColor=(key:string)=>key==='50'?MSS_HIT.dbull:key==='25'||key==='BULL'?MSS_HIT.bull:key.startsWith('T')?MSS_HIT.triple:key.startsWith('D')?MSS_HIT.double:key.startsWith('S')?MSS_HIT.simple:'#ffc341';
  const broken=Boolean(chainDraft.length&&Object.keys(liveStats||{}).some(k=>(liveStats?.[k]?.breaks||0)>(active.chains?.stats[k]?.breaks||0)));
  const newBest=!!chainDraft.length&&Object.keys(liveStats||{}).some(k=>(liveStats?.[k]?.best||0)>(active.chains?.stats[k]?.best||0));
  const displayHits=chainDraft.map(chainDart);
  const mayEnd=!finished&&!isHistoryView&&hits.length>0&&!chainDraft.length&&chainFormat(rules)==='free'&&(!active.player.isBot)&&progress.every(p=>p.attempts===progress[0]?.attempts);
  return <div className="ca-page ca-chain" style={{background:theme.bg,color:theme.text}}>
   <header className="ca-header"><img src="/challenge/ticker_challenge.png" alt="CHALLENGE"/><div className="ca-back"><BackDot onClick={()=>{if(!chainDraft.length||window.confirm('Quitter sans valider la volée ?'))back()}} size={44} color="#35e9ff" glow="#35e9ff77"/></div><button type="button" className="ca-awena" onClick={()=>awena?.openPanel?.()} aria-label="Awena"><img src="/awena/awena-avatar.webp" alt=""/></button></header>
   <main className="ca-layout chain-layout">
    <section className="ca-panel chain-main">
     <h1>{ct('NE BRISE PAS LA CHAÎNE !')}</h1><div className="chain-subtitle">{localizedChainTitle(chainLang,rules)} · {localizedChainFormat(chainLang,rules)}</div>
     {players.length>1&&<div className="chain-roster">{progress.map(row=><div key={row.player.id} className={row.player.id===activeId?'active':''}><small>{row.player.name}</small><b>{row.streak} <em>/ {row.bestStreak}</em></b></div>)}</div>}
     <div className="chain-hero" data-break={broken?'yes':'no'} data-record={newBest?'yes':'no'}>
      {active.player.avatar&&<img className="chain-avatar" src={active.player.avatar} alt=""/>}
      <div className="chain-person"><strong>{active.player.name}</strong><b>{chainActive?.current||0}</b><small>RECORD {chainActive?.best||0}</small><div className="chain-darts" aria-label="Volée">{Array.from({length:3},(_,i)=><span key={i} style={{backgroundColor:displayHits[i]?mssHitColor(displayHits[i]):MSS_HIT.empty,opacity:displayHits[i]?1:.4,mask:`url(${cricketDartSvg}) center / contain no-repeat`,WebkitMask:`url(${cricketDartSvg}) center / contain no-repeat`}}/>)}</div></div>
      <button type="button" className="chain-objective" onClick={()=>setChainPanel('rules')}><small>OBJECTIF</small><strong>{localizedChainTitle(chainLang,rules)}</strong><small>{(liveChain?.attempts||active.attempts)}{Number.isFinite(chainLimit(rules))?` / ${chainLimit(rules)}`:''} FL.</small></button>
     </div>
     <div className="chain-links" aria-label={`${chainActive?.current||0} maillons`}>{Array.from({length:Math.min(12,chainActive?.current||0)},(_,i)=><span key={i} style={{animationDelay:`${Math.min(i,3)*40}ms`}}/>)}{(chainActive?.current||0)>12&&<b>+{(chainActive?.current||0)-12}</b>}<small>{newBest?ct('NOUVEAU RECORD'):broken?ct('CHAÎNE BRISÉE'):chainActive?.current?'CHAÎNE ACTIVE':'PRÊT À JOUER'}</small></div>
     {chainVariant(rules)==='hybrid'&&<div className="chain-families">{familyKeys.map(k=>{const st=liveStats?.[k]||active.chains?.stats[k];return <button type="button" key={k} style={{'--chain-color':chainColor(k)} as React.CSSProperties} onClick={()=>{setChainFamily(k);setChainPanel('stats')}}><small>{ct(chainLabel(k))}</small><b>{st?.current||0}</b><em>REC. {st?.best||0}</em></button>})}</div>}
     <nav className="chain-actions chain-icon-nav" aria-label="Actions Challenge">{([{key:'rules',label:'RÈGLES',icon:'games',action:()=>setChainPanel('rules')},{key:'players',label:'JOUEURS',icon:'profiles',action:()=>setChainPanel('players')},{key:'stats',label:'STATS',icon:'stats',action:()=>{setChainFamily('ALL');setChainPanel('stats')}},...(!params?.onlineStatsOnly?[{key:'career',label:'RECORDS',icon:'tournaments',action:()=>{setCareerPlayer(active.player.id);setChainPanel('career')}}]:[]),...(!isHistoryView?[{key:'actions',label:'ACTIONS',icon:'settings',action:()=>setResetOpen(v=>!v)}]:[])] as const).map(item=><button key={item.key} type="button" aria-label={item.label} title={item.label} aria-pressed={chainPanel===item.key||(item.key==='actions'&&resetOpen)} onClick={item.action}><BottomNavIcon name={item.icon as React.ComponentProps<typeof BottomNavIcon>['name']} size={22}/>{(chainPanel===item.key||(item.key==='actions'&&resetOpen))&&<small>{item.label}</small>}</button>)}</nav>
     {resetOpen&&<div className="chain-actions"><button onClick={restart}>CONFIRMER RECOMMENCER</button><button onClick={()=>setResetOpen(false)}>ANNULER</button></div>}
     {fromTrainingLab&&!isHistoryView&&<TrainingChallengeVoiceGuide presetId={trainingPresetId} title={definition.title} playerName={active.player.name} goal={targetLabel} phase={`Volée ${Math.floor(active.attempts/3)+1}`} stageKey={`${activeId}:${Math.floor(active.attempts/3)}`} sessionKey={sessionId} finished={finished} darts={active.attempts} score={active.score} accuracy={finished?active.accuracy:null} objectivesDone={null} objectivesTotal={null}/>}
    </section>
    <section className="ca-panel chain-input">
     {finished||isHistoryView?<div className="chain-finish"><h2>{finished?'CHALLENGE TERMINÉ':'PARTIE EN COURS'}</h2><strong>{finishLeader?.score||0} {ct('MAILLONS')}</strong><p>{onCompetitionFinish&&standings.length>1&&compareArcadeRanks(standings[0],standings[1],rules)===0?'ÉGALITÉ PARFAITE · rejouer le duel':`${finishLeader?.player.name} · ${finishLeader?.accuracy||0}% de réussite`}</p><button onClick={()=>{setChainFamily('ALL');setChainPanel('stats')}}>TOUS LES RECORDS</button>{!isHistoryView&&<>{!fromTrainingLab&&<button onClick={()=>go('challenge_leaderboard',{from:'challenge_config',prefilter:true,target:chainConfigKey(rules),rule:'arcade',visits:Number.isFinite(chainLimit(rules))?Math.ceil(chainLimit(rules)/3):1})} >CLASSEMENT ONLINE</button>}<button onClick={restart}>REJOUER</button></>}<button onClick={back}>RETOUR</button>{onlineStatus&&<small>{onlineStatus}</small>}{!fromTrainingLab&&!params?.onlineStatsOnly&&finished&&!onCompetitionFinish&&((isHistoryView&&!onlineStatus)||onlineStatus.includes('conservé'))&&<button onClick={()=>setOnlineRetry(n=>n+1)}>{isHistoryView&&!onlineStatus?'SYNCHRONISER ONLINE':'RELANCER ONLINE'}</button>}</div>:active.player.isBot?<div className="chain-finish"><strong>{active.player.name} joue…</strong></div>:<>
      <Keypad currentThrow={displayHits} multiplier={chainMult} onSimple={()=>setChainMult(1)} onDouble={()=>setChainMult(2)} onTriple={()=>setChainMult(3)} onNumber={n=>stageChain(n===0?'MISS':chainMult===3?'T':chainMult===2?'D':'G',n||null)} onBull={()=>stageChain(chainMult===2?'DBULL':'BULL',null)} onCancel={undoChain} onValidate={commitChain} validateDisabled={!chainCanValidate} hideTotal hidePreview latchMultiplier={false} extraMainButtons={[{label:'DBULL 50',tone:'red',onClick:()=>stageChain('DBULL',null)}]} />
     </>}
     {mayEnd&&<button className="chain-end" onClick={()=>{if(window.confirm('Terminer et enregistrer les records de la session ?'))setChainEnded(true)}}>{ct('TERMINER LA SESSION')}</button>}
     {persistError&&<p className="ca-warning ca-error">{persistError}</p>}
    </section>
   </main>
   {chainPanel&&<div className="chain-modal-backdrop" onClick={()=>setChainPanel(null)}><section role="dialog" aria-modal="true" aria-label={chainPanel==='career'?'Carrière':chainPanel==='stats'?'Statistiques':chainPanel==='rules'?'Règles':'Joueurs'} className="chain-modal" onClick={e=>e.stopPropagation()}><header><h2>{chainPanel==='career'?ct('RECORDS DE CARRIÈRE'):chainPanel==='stats'?'RECORDS & STATISTIQUES':chainPanel==='rules'?'RÈGLES':'CLASSEMENT'}</h2><button aria-label="Fermer" onClick={()=>setChainPanel(null)}>×</button></header>
    {chainPanel==='career'?<>
     <select aria-label="Joueur" value={careerPlayer||active.player.id} onChange={e=>setCareerPlayer(e.target.value)}>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
     <p>{localizedChainTitle(chainLang,rules)} · configuration identique · Challenge et Training terminés</p>
     {careerLoading?<p>Chargement des records…</p>:careerError?<p>{careerError}</p>:!career.count?<p>Aucune session terminée pour cette configuration.</p>:<>
      <div className="chain-career-kpis"><div><small>SESSIONS</small><b>{career.count}</b></div><div><small>{ct('FLÉCHETTES')}</small><b>{career.darts}</b></div></div>
      {chainVariant(rules)==='hybrid'&&<div className="chain-heatmap">{career.heatmap.map(f=><section key={f.family}><h3>{ct(chainLabel(f.family))}</h3><div>{f.cells.map(cell=><span key={cell.key} title={`${cell.key} : ${cell.best??'—'}`} style={{background:cell.best?`color-mix(in srgb, ${chainColor(f.family)} ${Math.min(85,20+cell.best*8)}%, #101722)`:'#182131'}}><small>{cell.key}</small><b>{cell.best??'—'}</b></span>)}</div></section>)}</div>}
      <div className="chain-stat-list">{Object.values(career.stats).map(st=><details key={st.key}><summary><span style={{color:chainColor(st.key)}}>{ct(st.label)}</span><b>{st.best}</b></summary><div>{st.runs} chaînes · {st.breaks} ruptures · moyenne {st.mean.toFixed(1)} · {(100*st.successes/Math.max(1,st.attempts)).toFixed(1)} %<p>{Object.entries(st.distribution).map(([n,count])=>`${n} × ${count}`).join(' · ')||'—'}</p></div></details>)}</div>
      <h3>DERNIÈRES SESSIONS</h3>{career.recent.map(r=><div className="chain-modal-row" key={r.id}><span>{r.playedAt?new Date(r.playedAt).toLocaleDateString():'—'}</span><b>{r.best} maillons</b></div>)}
     </>}
    </>:chainPanel==='rules'?<><p>{localizedChainRule(chainLang,rules)}</p><p>La chaîne traverse les volées. Chaque joueur possède ses propres chaînes. Le record ne diminue jamais après une erreur. En cas d’égalité, les chaînes suivantes départagent les joueurs.</p></>:chainPanel==='players'?standings.map((row,i)=><div className="chain-modal-row" key={row.player.id}><b>{i+1}. {row.player.name}</b><span>{row.bestStreak} maillons · {row.attempts} fl.</span></div>):<>
     {chainVariant(rules)==='hybrid'&&<select value={chainFamily} onChange={e=>setChainFamily(e.target.value)}><option value="ALL">{ct('TOUTES LES CHAÎNES')}</option>{familyKeys.map(k=><option key={k} value={k}>{ct(chainLabel(k))}</option>)}<option value="HIT">{ct('SANS MISS')}</option></select>}
     {standings.map(row=><article key={row.player.id}><h3>{row.player.name} · {row.attempts} FL.</h3><div className="chain-stat-list">{Object.values(row.chains?.stats||{}).filter(st=>chainFamily==='ALL'||st.key===chainFamily||(['S','D','T'].includes(chainFamily)&&st.key.startsWith(chainFamily))).map((st:ChainStat)=><details key={st.key}><summary><span style={{color:chainColor(st.key)}}>{ct(st.label)}</span><b>{st.best}</b></summary><div>Actuelle : {st.current} · ruptures : {st.breaks} · moyenne : {st.mean.toFixed(1)}<p>{Object.entries(st.distribution).map(([n,count])=>`${n} × ${count}`).join(' · ')||'Aucune chaîne'}</p><small>Historique : {st.runs.join(' · ')||'—'}</small></div></details>)}</div></article>)}
    </>}
   </section></div>}
  </div>;
 }
 return <div className="ca-page" style={{background:theme.bg,color:theme.text}}>
  <header className="ca-header">
   <img src="/challenge/ticker_challenge.png" alt="CHALLENGE"/>
   <div className="ca-back"><BackDot onClick={back} size={44} color="#35e9ff" glow="#35e9ff77"/></div>
   <button type="button" className="ca-awena" onClick={()=>awena?.openPanel?.()} aria-label="Ouvrir Awena"><img src="/awena/awena-avatar.webp" alt="Awena"/></button>
  </header>
  <main className="ca-layout">
   <section className="ca-panel ca-info">
    <small className="ca-kicker">{definition.family} · CHALLENGE</small>
    <h1>{definition.title}</h1>
    <p>{arcadeRuleDescription(rules)}</p>
    <div className="ca-meta"><span>{modeDetails.kind==='path'?'OBJECTIFS':modeDetails.kind==='team'?'RELAIS':modeDetails.kind==='streak'?'SÉRIE':'SCORING'}</span><span>{modeDetails.usesRounds?`${rules.catalogRounds} ${modeDetails.roundUnit}`:'OBJECTIF LIBRE'}</span></div>
    <div className="ca-player">
     <div className="ca-avatar">{active.player.avatar?<img src={active.player.avatar} alt=""/>:active.player.name.slice(0,1).toUpperCase()}</div>
     <div className="ca-identity"><small>{finished?'CHALLENGE TERMINÉ':isTeam?'RELAIS · JOUEUR ACTIF':'JOUEUR ACTIF'}</small><strong>{finished?'CLASSEMENT FINAL':active.player.name}</strong></div>
     <div className="ca-score"><small>{modeDetails.kind==='path'||modeDetails.kind==='team'?'FLÉCHETTES':'POINTS'}</small><strong>{modeDetails.kind==='path'||modeDetails.kind==='team'?active.attempts:active.score}</strong></div>
    </div>
    <div className="ca-goal"><small>{finished?'RÉSULTAT FINAL':'OBJECTIF ACTUEL'}</small><strong>{finished?'✓':targetLabel}</strong><span>{modeDetails.kind==='path'||modeDetails.kind==='team'?`${active.index}/${active.totalObjectives} OBJECTIFS`:shownScore}</span>
     <div className="ca-meter"><i style={{width:(100*progressRatio)+'%'}}/></div><p>{active.message||'Le moteur recalcule chaque impact et le score après toute annulation.'}</p>
    </div>
    {fromTrainingLab && !isHistoryView && haveSetup && <TrainingChallengeVoiceGuide
      presetId={trainingPresetId} title={definition.title} playerName={active.player.name}
      goal={finished ? 'Parcours terminé' : targetLabel}
      phase={`Volée ${Math.floor(currentPlayerHits.length / 3) + 1}`}
      stageKey={`${activeId}:${Math.floor(currentPlayerHits.length / 3)}`} sessionKey={sessionId}
      finished={finished} darts={active.attempts} score={active.score} accuracy={finished ? active.accuracy : null}
      objectivesDone={modeDetails.kind === 'path' || modeDetails.kind === 'team' ? active.index : null}
      objectivesTotal={modeDetails.kind === 'path' || modeDetails.kind === 'team' ? active.totalObjectives : null}
    />}
    {sequence.length>0&&<div className="ca-sequence" aria-label="Objectifs du parcours">{sequence.slice(0,60).map((step,index)=><span key={index} className={index<active.index?'passed':index===active.index?'current':''}>{step.label}</span>)}</div>}
    {id==='bounty-hunt'&&<div className="ca-bounty"><h2>PRIMES DISPONIBLES</h2><div>{arcadeBountyNumbers(rules).map(n=><span key={n}>N° {n} · {n*10} PTS</span>)}</div></div>}
    {board&&<div className="ca-territories"><h2>CARTE DES TERRITOIRES</h2><div>{numbers.map(n=><span key={n} className={board[n]?'owned':''} title={board[n]?`Occupé par ${players.find(p=>p.id===board[n]?.owner)?.name||'joueur'}`:'Libre'}>{n}<small>{board[n]?(players.find(p=>p.id===board[n]?.owner)?.name.slice(0,2)||'✓'):'—'}</small></span>)}</div></div>}
    <h2>CLASSEMENT EN DIRECT</h2>
    <div className="ca-standing">{standings.map((row,index)=><div key={row.player.id} className={activeId===row.player.id?'selected':''}><span>{index+1}</span><b>{row.player.name}</b><small>{row.complete?'TERMINÉ':`${row.successes}/${row.attempts} TOUCHE(S)`}</small><strong>{modeDetails.kind==='path'||modeDetails.kind==='team'?`${row.attempts} FL.`:`${row.score} PTS`}</strong></div>)}</div>
    <div className="ca-more"><button onClick={()=>setDetailOpen(v=>!v)}>{detailOpen?'MASQUER LES STATISTIQUES':'SUIVI DE PERFORMANCE'}</button></div>
    {detailOpen&&<div className="ca-detailed">{progress.map(row=>{const st=stats(row.player);return <article key={row.player.id}><h3>{row.player.name}</h3><div><span>PRÉCISION <b>{st.accuracy}%</b></span><span>FLÉCHETTES <b>{st.darts}</b></span><span>MEILLEURE SÉRIE <b>{st.bestStreak}</b></span>{(['G','P','D','T','BULL','DBULL','MISS'] as ArcadeZone[]).map(type=><span key={type}>{type} <b>{st[type]}</b></span>)}</div></article>})}</div>}
    <div className="ca-last"><h2>DERNIERS IMPACTS</h2><div>{lastHits.map((h,i)=><span key={i}>{players.find(p=>p.id===h.pid)?.name||'J'} · {formatArcadeHit(h)}</span>)}</div></div>
   </section>
   <section className="ca-panel ca-input">
    {!haveSetup?<div className="ca-architects"><h2>LE DUEL DES ARCHITECTES</h2><p>Choisis les trois secteurs que chaque adversaire devra réussir. Les deux joueurs seront évalués séparément.</p>{players.map(player=><div key={player.id}><b>CONTRAT POUR {player.name}</b><div>{Array.from({length:3},(_,i)=><select key={i} value={assignments[player.id]?.[i]?.segment||[20,19,18][i]} onChange={e=>setAssignments(old=>({...old,[player.id]:Array.from({length:3},(_,j)=>({zone:'S' as const,segment:j===i?Number(e.target.value):old[player.id]?.[j]?.segment||[20,19,18][j]!,label:'S'+(j===i?e.target.value:old[player.id]?.[j]?.segment||[20,19,18][j]!) }))}))}>{numbers.map(n=><option key={n} value={n}>S{n}</option>)}</select>)}</div></div>)}<button className="ca-launch" onClick={()=>{setAssignments(prev=>Object.fromEntries(players.map(player=>[player.id,Array.from({length:3},(_,i)=>{const n=prev[player.id]?.[i]?.segment||[20,19,18][i]!;return {zone:'S' as const,segment:n,label:'S'+n}})])));setReady(true)}}>COMMENCER LE DUEL</button></div>:<>
     <div className="ca-toolbar"><div><strong>SAISIE DÉTAILLÉE</strong><small>Grand simple / Petit simple / Double / Triple</small></div><button type="button" disabled={!hits.length||isHistoryView} onClick={()=>setHits(prev=>prev.slice(0,-1))}>↶ ANNULER</button></div>
     {finished?<div className="ca-result"><div>🏆</div><h2>CHALLENGE TERMINÉ</h2><p>{isTeam?'RELAIS COLLECTIF TERMINÉ':`${finishLeader?.player.name||'Joueur'} · ${modeDetails.kind==='path'?finishLeader?.attempts+' fléchettes':finishLeader?.score+' points'}`}</p>{!isHistoryView&&<button type="button" onClick={restart}>REJOUER</button>}<button type="button" onClick={back}>AUTRES CHALLENGES</button></div>:isHistoryView?<div className="ca-result"><h2>PARTIE EN COURS</h2><p>Reprends la partie depuis l'Historique pour continuer à saisir les impacts.</p></div>:<>
      {(id==='kings-choice'||id==='controlled-roulette')&&<div className="ca-risk"><b>CHOISIR LA ZONE DE LA VOLÉE</b><select value={visitChoice} disabled={riskLocked} onChange={e=>setRisk(e.target.value as ArcadeVariant)}><option value="classic">SIMPLES · RISQUE FAIBLE</option><option value="doubles">DOUBLES · BONUS ×3</option><option value="triples">TRIPLES · BONUS ×5</option></select>{riskLocked&&<small>Choix verrouillé jusqu'à la fin de la volée</small>}</div>}
     {id==='revenge'&&<div className="ca-risk"><b>NUMÉRO VISÉ EN CAS DE MISS</b><select value={intendedSegment} onChange={e=>setIntendedSegment(Number(e.target.value))}>{numbers.map(n=><option key={n} value={n}>{n}</option>)}</select><small>Les adversaires pourront récupérer la prime uniquement s'ils touchent ce secteur.</small></div>}
     <div className="ca-zones">{(['G','P','D','T'] as ArcadeZone[]).map(value=><button type="button" key={value} className={zone===value?'selected':''} onClick={()=>setZone(value)}><b>{value}</b><small>{value==='G'?'GRAND SIMPLE':value==='P'?'PETIT SIMPLE':value==='D'?'DOUBLE':'TRIPLE'}</small></button>)}</div>
      <div className="ca-sectors">{numbers.map(n=><button type="button" key={n} onClick={()=>recordHit(zone,n)}>{n}</button>)}</div>
      <div className="ca-bulls"><button type="button" className="b25" onClick={()=>recordHit('BULL',null)}>BULL <b>25</b></button><button type="button" className="b50" onClick={()=>recordHit('DBULL',null)}>DBULL <b>50</b></button><button type="button" className="miss" onClick={()=>recordHit('MISS',null)}>MISS <b>×</b></button></div>
     </>}
    </>}
    {!isHistoryView&&<div className="ca-reset"><button type="button" onClick={()=>setResetOpen(v=>!v)}>{resetOpen?'ANNULER':'RECOMMENCER'}</button>{resetOpen&&<button type="button" onClick={restart}>CONFIRMER</button>}</div>}
    {persistError&&<p className="ca-warning ca-error">{persistError}</p>}
    <p className="ca-warning">{fromTrainingLab?"Séance privée du Centre d’entraînement : reprise locale et bilan dans Mes séances. Aucun match envoyé à l’Historique compétitif.":"Les lancers sont enregistrés dans l’Historique V4 après le début de la partie. Classements ONLINE : publication désactivée tant que les barèmes de chaque défi ne sont pas validés."}</p>
   </section>
  </main>
 </div>;
}
