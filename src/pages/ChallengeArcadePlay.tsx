import React from 'react';
import BackDot from '../components/BackDot';
import {useTheme} from '../contexts/ThemeContext';
import {useStore} from '../contexts/StoreContext';
import {useAwenaOptional} from '../awena/AwenaProvider';
import {useFullscreenPlay} from '../hooks/useFullscreenPlay';
import {History} from '../lib/history';
import {recordTrainingDetailedSession} from '../training/stats/trainingStatsHub';
import {getChallengeTrainingPreset} from '../training/catalog/challengeTrainingCatalog';
import {saveTrainingArcadeDraft,clearTrainingArcadeDraft} from '../training/profile/trainingArcadeDraft';
import {getArcadeChallenge} from '../lib/challengeArcadeCatalog';
import {arcadeObjectives,arcadeBountyNumbers,arcadeRuleDetails,arcadeRuleDescription,arcadeTerritories,arcadeHitValue,compareArcadeRanks,currentArcadePlayer,evaluateArcadeProgress,formatArcadeHit,type ArcadeHit,type ArcadeObjective,type ArcadePlayConfig,type ArcadeZone,type ArcadeVariant} from '../lib/challengeArcadeEngine';
import './ChallengeArcadePlay.css';

type Player={id:string;name:string;avatar?:string;onlineUserId?:string};
const numbers=Array.from({length:20},(_,i)=>i+1);
const avatar=(p:any)=>p?.avatarDataUrl||p?.photoDataUrl||p?.avatarUrl||p?.photoUrl||'';
const onlineId=(p:any)=>String(p?.onlineUserId||p?.privateInfo?.onlineUserId||p?.userId||'').trim();
const normalizedLog=(raw:any):ArcadeHit[]=>Array.isArray(raw)?raw.filter((e:any)=>e&&e.pid&&['G','P','D','T','BULL','DBULL','MISS'].includes(e.zone)).map((e:any)=>({pid:String(e.pid),zone:e.zone as ArcadeZone,segment:e.segment===null?null:Number(e.segment)||null,choice:e.choice,intendedSegment:e.intendedSegment,intendedZone:e.intendedZone})):[];
const useStablePlayers=(ids:string[],profiles:any[]):Player[]=>ids.length?ids.map(id=>{
 const profile:any=profiles.find(item=>String(item?.id)===id);
 return {id,name:String(profile?.name||profile?.nickname||'Joueur'),avatar:avatar(profile),onlineUserId:onlineId(profile)};
}):[{id:'preview',name:'Joueur'}];

/** Même charte et mêmes joueurs que ChallengePlay, avec règles de jeu réellement séparées.
 * Les événements sont rejoués par le moteur pur après chaque saisie et chaque ANNULER.
 */
export default function ChallengeArcadePlay({go,params}:{go:(tab:any,params?:any)=>void;params?:any}){
 useFullscreenPlay({enabled:true,lockBodyScroll:false});
 const theme=useTheme(),awena=useAwenaOptional();
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
 const players=React.useMemo(()=>useStablePlayers(Array.isArray(game.playerIds)?game.playerIds.map(String):[],Array.isArray(store?.profiles)?store.profiles:[]),[game.playerIds,store?.profiles]);
 const [assignments,setAssignments]=React.useState<Record<string,ArcadeObjective[]>>(()=>oldState.assignments||game.catalogAssignments||{});
 const [ready,setReady]=React.useState(id!=='architects-duel'||Boolean(oldState.assignments||game.catalogAssignments));
 const [ghost,setGhost]=React.useState<number[]>(()=>Array.isArray(oldState.ghost)?oldState.ghost:Array.isArray(game.catalogGhost)?game.catalogGhost:[]);
 const [zone,setZone]=React.useState<ArcadeZone>('D');
 const [risk,setRisk]=React.useState<ArcadeVariant>(game.catalogVariant==='doubles'?'doubles':game.catalogVariant==='triples'?'triples':'classic');
 const [intendedSegment,setIntendedSegment]=React.useState(20);
 const [hits,setHits]=React.useState<ArcadeHit[]>(()=>normalizedLog(oldState.hits||oldState.log||restored.entries));
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
  catalogAssignments:assignments,catalogGhost:ghost};
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
   bestStreak:row.bestStreak,visitScores:row.visitScores,scoreHistory:row.scoreHistory,
   exerciseStats:{type:'arcade',modeId:id,score:row.score,accuracy:row.accuracy,attempts:row.attempts,completed:row.complete}}));
  const topId=finished&&!isTeam&&standings.length>1?standings[0]?.player.id:null;
  const status=finished?'finished':'in_progress';
  const uniqueTarget=`arcade-${id}-${rules.catalogLine}-${rules.catalogVariant}-${rules.catalogRounds}-${rules.catalogTarget}-${rules.catalogMin}-${rules.catalogMax}-${rules.catalogLives}`;
  const summary={title:definition.title,kind:'challenge',mode:'challenge',status,finished,winnerId:topId,
   matchMode:game.matchMode||'solo',scoreLine:rows.map(row=>`${row.name} ${row.score}`).join(' · '),
   rankings:rows,perPlayer:rows,finalScores:Object.fromEntries(rows.map(row=>[row.id,row.score])),
   target:uniqueTarget,leaderboardTarget:uniqueTarget,objective:definition.title,rule:'arcade',visits:rules.catalogRounds,exerciseType:'arcade'};
  const log=hits.map(h=>({hit:h.zone==='BULL'?'25':h.zone==='DBULL'?'50':h.zone==='MISS'?'MISS':h.zone==='G'||h.zone==='P'?'S':h.zone,
   zone:h.zone,segment:h.segment,pid:h.pid,choice:h.choice,intendedSegment:h.intendedSegment,intendedZone:h.intendedZone}));
  const state={hits:[...hits],log:[...hits],updatedAt:now,assignments,ghost};
  const config={...game,...rules,playerIds:ids,exerciseType:'arcade',leaderboardTarget:uniqueTarget};
  const payload={kind:'challenge',mode:'challenge',sport:'darts',status,config,state,
   entries:log,events:log,players:rows,finalPlayers:rows,summary,
   stats:{kind:'challenge',mode:'challenge',players:rows,global:{matches:1,exerciseType:'arcade',arcadeId:id,visits:rules.catalogRounds}}};
  return {id:sessionId,matchId:sessionId,resumeId:sessionId,kind:'challenge',mode:'challenge',sport:'darts',status,
   createdAt,updatedAt:now,finishedAt:finished?now:undefined,winnerId:topId,
   players:players.map(p=>({id:p.id,name:p.name,avatarDataUrl:p.avatar||null,...(p.onlineUserId?{onlineUserId:p.onlineUserId,userId:p.onlineUserId}:{})})),
   game:{mode:'challenge',exerciseType:'arcade',catalogChallengeId:id,leaderboardTarget:uniqueTarget,target:uniqueTarget,rule:'arcade',visits:rules.catalogRounds},
   summary,payload,resume:finished?undefined:{config,state,livePayload:payload,summary}};
 },[hits.length,hits,finished,standings.map(p=>[p.player.id,p.score,p.index,p.complete].join(':')).join('|'),id,assignments,ghost,createdAt,sessionId]);
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
     participantName:row.player.name,participantType:'player',startedAt:createdAt,endedAt:now,
     durationMs:Math.max(0,now-createdAt),darts:row.attempts,hits:successful,
     misses:Math.max(0,row.attempts-successful),points:row.score,accuracyPct:row.accuracy,success:objectiveReached,
     config:{...game,...rules,trainingOrigin:'training_lab',trainingCatalogPresetId:trainingPresetId,sourceMode:'challenge'},
     metrics:{sourceMode:'challenge',exerciseId:trainingPresetId,
      exerciseTitle:definition?.title||getArcadeChallenge(id).title,score:row.score,
      performanceScore:completionPct,trainingPerformancePct:completionPct,completionPct,
      goal:100,exerciseValidationRate:row.accuracy,bestStreak:row.bestStreak,
      exerciseType:'arcade',arcadeId:id,matchId:sessionId},
     visitHistory:participantHits,
     telemetry:{sourceMode:'challenge',arcadeId:id,hits:participantHits,scoreHistory:row.scoreHistory,
      visitScores:row.visitScores,hitResults:row.hitResults},telemetryCoverage:'exact',
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
  setHits([]);setGhost([]);setResetOpen(false);setCreatedAt(Date.now());
  if(fromTrainingLab&&trainingOwnerId&&trainingPresetId)clearTrainingArcadeDraft(trainingOwnerId,trainingPresetId);
  setSessionId(`challenge-arcade-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
 };
 const shownScore=modeDetails.kind==='path'||modeDetails.kind==='team'?`${active.attempts} FLÉCHETTES`:active.score+' PTS';
 const targetLabel=active.current?.label||(['exact-copy'].includes(id)?'REPRODUIRE LA VOLÉE':id==='territory-war'?'CONQUÉRIR DES TERRITOIRES':id==='contracts'?'3 CONTRATS':id==='bounty-hunt'?'10 PRIMES':id==='ghost-challenge'?'BATS TON FANTÔME':'SCORE À RÉALISER');
 const progressRatio=modeDetails.kind==='path'||modeDetails.kind==='team'?active.index/Math.max(1,active.totalObjectives):Math.min(1,active.attempts/(Math.max(1,Number(rules.catalogRounds))*3));
 const haveSetup=ready||(id!=='architects-duel');
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
