/**
 * CHALLENGE V141 — diagnostics spécifiques dérivés exclusivement de History V4.
 * Les journaux sont lus sans mutation ; les statistiques absentes restent inconnues.
 * Une partie en cours ou une autre identité ne peut jamais enrichir une performance.
 */
import type {ChallengeArchiveItem} from './challengeArchiveCore.ts';
import {analyzeChallengeExercise,evaluateChallengeEntries, type ChallengeEntryLike} from './challengeExercises.ts';
import {arcadeObjectives,arcadeRuleDetails,evaluateArcadeProgress,type ArcadeHit,type ArcadePlayConfig,type ArcadeZone} from './challengeArcadeEngine.ts';

export type ChallengeDiagnosticCard={label:string;value:string;detail:string};
export type ChallengeObjectiveDiagnostic={key:string;label:string;attempts:number;validated:number;points:number;rate:number};
export type ChallengeVisitDiagnostic={visit:number;attempts:number;successful:number;points:number;productive:number;rate:number};
export type ChallengeSessionDiagnostic={id:string;playedAt:number;attempts:number;successes:number;failures:number;successfulVisits:number;perfectVisits:number;visits:number;bestVisit:number;bestStreak:number;penalties:number;progress:number;score:number};
export type ChallengeModeDiagnostics={
 modeId:string;title:string;unit:'fléchettes'|'volées';
 finished:number;documented:number;missing:number;darts:number;successes:number;failures:number;
 validatedVisits:number;perfectVisits:number;totalVisits:number;penalties:number;bestStreak:number;
 objectives:ChallengeObjectiveDiagnostic[];visits:ChallengeVisitDiagnostic[];sessions:ChallengeSessionDiagnostic[];
 cards:ChallengeDiagnosticCard[]; recordCards:ChallengeDiagnosticCard[];
};
const positive=(n:unknown)=>{const value=Number(n);return Number.isFinite(value)?Math.max(0,value):0};
const round=(n:number)=>Math.round(n*10)/10;
const percent=(a:number,b:number)=>b>0?round(a/b*100):0;
const text=(value:unknown)=>String(value??'').trim();
const segment=(value:unknown):number|null=>{const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=20?n:null};
const legacyZones=new Set(['S','D','T','25','50','MISS']);
const arcadeZones=new Set(['G','P','D','T','BULL','DBULL','MISS']);
const statuses=new Set(['finished']);

function fullLog(item:ChallengeArchiveItem):any[]|null{
 const rec=item.record;
 const candidates=[rec?.payload?.entries,rec?.payload?.state?.hits,rec?.payload?.state?.log,rec?.decoded?.entries,rec?.decoded?.state?.hits,rec?.decoded?.state?.log,rec?.resume?.state?.log];
 const list=candidates.find(value=>Array.isArray(value)&&value.length>0);
 return Array.isArray(list)&&list.length?list:null;
}
/** Player-owned logs only. Anonymous entries are accepted only for verified one-player matches. */
function playerLog(item:ChallengeArchiveItem):any[]|null{
 const rec=item.record;
 const list=fullLog(item);
 if(!list)return null;
 const pid=text(item.playerId);
 if(!pid)return null;
 const people=[rec?.summary?.perPlayer,rec?.payload?.summary?.perPlayer,rec?.players].find(Array.isArray);
 const verifiedSolo=Array.isArray(people)&&people.length===1&&text(people[0]?.id??people[0]?.playerId??people[0]?.profileId)===pid;
 const rows=list.filter((entry:any)=>{
  const id=text(entry?.pid??entry?.playerId??entry?.profileId);
  return id?id===pid:verifiedSolo;
 });
 return rows.length?rows:null;
}
function configOf(item:ChallengeArchiveItem){return item.record?.payload?.config||item.record?.decoded?.config||item.record?.resume?.config||{};}
function loggedLegacy(rows:any[]):ChallengeEntryLike[]|null{
 const out:ChallengeEntryLike[]=[];
 for(const item of rows){
  const hit=text(item?.hit).toUpperCase();
  if(!legacyZones.has(hit))return null;
  out.push({hit:hit as ChallengeEntryLike['hit'],segment:segment(item?.segment),bonusTarget:segment(item?.bonusTarget)});
 }
 return out.length?out:null;
}
function loggedArcade(rows:any[]):ArcadeHit[]|null{
 const out:ArcadeHit[]=[];
 for(const item of rows){
  const zone=text(item?.zone||item?.hit).toUpperCase();
  const actual=zone==='25'?'BULL':zone==='50'?'DBULL':zone;
  // Legacy S cannot safely be converted into a particular G/P ring.
  if(!arcadeZones.has(actual))return null;
  if(!['BULL','DBULL','MISS'].includes(actual)&&segment(item?.segment)===null)return null;
  out.push({pid:text(item?.pid||item?.playerId||item?.profileId),zone:actual as ArcadeZone,
   segment:segment(item?.segment),choice:item?.choice,intendedSegment:segment(item?.intendedSegment),intendedZone:item?.intendedZone});
 }
 return out.length?out:null;
}
function summaryStats(item:ChallengeArchiveItem):any|null{
 const rec=item.record;
 const candidates=[rec?.summary?.perPlayer,rec?.payload?.summary?.perPlayer,rec?.payload?.stats?.players,rec?.decoded?.summary?.perPlayer];
 for(const arr of candidates){
  if(!Array.isArray(arr))continue;
  const player=arr.find((row:any)=>text(row?.id??row?.playerId??row?.profileId)===item.playerId);
  if(player?.exerciseStats&&typeof player.exerciseStats==='object')return player.exerciseStats;
 }
 return null;
}

type AggObj={key:string;attempts:number;validated:number;points:number};
type AggVisit={visit:number;attempts:number;successful:number;points:number;productive:number};
const ensureObj=(map:Map<string,AggObj>,key:string)=>{
 let value=map.get(key);if(!value){value={key,attempts:0,validated:0,points:0};map.set(key,value);}return value;
};
const ensureVisit=(map:Map<number,AggVisit>,index:number)=>{
 let value=map.get(index);if(!value){value={visit:index+1,attempts:0,successful:0,points:0,productive:0};map.set(index,value);}return value;
};
const goalKind=(modeId:string)=>modeId.startsWith('arcade:')?arcadeRuleDetails({catalogChallengeId:modeId.slice(7),catalogLine:20,catalogRounds:5,catalogVariant:'classic'}).kind:'score';
const titles:Record<string,string>={
 classic:'PRÉCISION SUR CIBLE FIXE',clock:'PROGRESSION DANS L’HORLOGE','half-it':'RÉGULARITÉ ET PÉNALITÉS',sequence:'MAÎTRISE DE LA SÉQUENCE',grouping:'REGROUPEMENTS RÉUSSIS',doubles8:'EFFICACITÉ SUR LES DOUBLES',jdc:'PERFORMANCES PAR PHASE',
 'arcade:perfect-line':'LIGNE PARFAITE · OBJECTIFS VALIDÉS','arcade:opposites':'OPPOSÉS · PAIRES RÉUSSIES','arcade:sniper':'SNIPER · PRÉCISION SUR CIBLE',
 'arcade:razor-edge':'PETITS SIMPLES · PRÉCISION','arcade:four-in-row':'QUATRE COURONNES · RÉUSSITE','arcade:lock':'SERRURES DÉVERROUILLÉES',
 'arcade:triple-precision':'TRIPLES SUCCESSIFS','arcade:forbidden-zone':'TOUCHES INTERDITES · PÉNALITÉS',
 'arcade:snake':'SERPENT · PROGRESSION','arcade:zigzag':'ZIGZAG · ALLERS-RETOURS','arcade:spiral':'SPIRALE · COURONNES',
 'arcade:compass':'BOUSSOLE · DIRECTIONS','arcade:ping-pong':'PING-PONG · ALTERNANCES','arcade:crazy-wheel':'ROUE FOLLE · PROGRESSION',
 'arcade:winning-trio':'TRIO GAGNANT · COMBINAISONS','arcade:double-impact':'DOUBLE IMPACT · DOUBLES DISTINCTS',
 'arcade:odd-even':'PAIR / IMPAIR · SÉRIES','arcade:three-kings':'LES TROIS ROIS · COMBINAISONS','arcade:ascension':'ASCENSION · SÉRIES',
 'arcade:bull-sandwich':'BULL SANDWICH · PARCOURS','arcade:exact-count':'COMPTE JUSTE · VOLÉES EXACTES',
 'arcade:milestones':'PALIERS ATTEINTS','arcade:green-zone':'ZONE VERTE · SCORES DANS LA PLAGE',
 'arcade:three-sectors':'TROIS SECTEURS · COMBINAISONS','arcade:hundred-streak':'CAP SUR 100 · SÉRIES',
 'arcade:upper-limit':'LIMITE HAUTE · PRÉCISION DES SCORES','arcade:all-or-nothing':'TOUT OU RIEN · VOLÉES RÉUSSIES',
 'arcade:no-safety-net':'SANS FILET · SÉRIE SANS ÉCHEC','arcade:three-lives':'TROIS VIES · SURVIE',
 'arcade:minefield':'CHAMP DE MINES · RISQUES','arcade:rescue':'SAUVETAGES AU DERNIER DARD',
 'arcade:armored-streak':'SÉRIE BLINDÉE · CAGNOTTE','arcade:safe':'COFFRE-FORT · CODES DÉVERROUILLÉS',
 'arcade:kings-choice':'CHOIX DU ROI · PRISE DE RISQUE','arcade:bounty-hunt':'CHASSE AUX PRIMES · CIBLES RÉCOLTÉES',
 'arcade:contracts':'CONTRATS RÉUSSIS','arcade:controlled-roulette':'ROULETTE · ZONES VALIDÉES',
 'arcade:collector':'COLLECTION DES COURONNES','arcade:architects-duel':'DUEL DES ARCHITECTES · OBJECTIFS',
 'arcade:exact-copy':'COPIE CONFORME · REPRODUCTIONS','arcade:perfect-relay':'RELAIS PARFAIT · CONTRIBUTIONS',
 'arcade:territory-war':'GUERRE DES TERRITOIRES · CONQUÊTES','arcade:ghost-challenge':'DÉFI FANTÔME · PERFORMANCE',
 'arcade:revenge':'REVANCHE · CIBLES REPRISES',
};
function titleFor(modeId:string){
 if(titles[modeId])return titles[modeId];
 const kind=goalKind(modeId);
 return kind==='path'?'VALIDATION DES OBJECTIFS':kind==='team'?'EFFICACITÉ DU RELAIS':kind==='streak'?'TENUE DES SÉRIES':'EFFICACITÉ DES VOLÉES';
}
function finishCards(modeId:string,sessions:ChallengeSessionDiagnostic[],summed:{darts:number;successes:number;validated:number;totalVisits:number;perfect:number;penalties:number;bestStreak:number},unit:'fléchettes'|'volées'){
 const cards:ChallengeDiagnosticCard[]=[];
 const push=(label:string,value:string,detail:string)=>cards.push({label,value,detail});
 const n=sessions.length;
 const kind=goalKind(modeId);
 if(kind==='path'||kind==='team'){
  const objectives=sessions.reduce((sum,s)=>sum+s.progress,0);
  push('OBJECTIFS VALIDÉS',String(objectives),'Progression cumulée documentée');
  push('FL. / OBJECTIF',objectives?String(round(summed.darts/objectives)):'—','Efficacité sur les parcours documentés');
  push('PRÉCISION DES TOUCHES',summed.darts?percent(summed.successes,summed.darts)+' %':'—','Impacts conformes / fléchettes saisies');
 }else if(kind==='streak'){
  push('PLUS LONGUE SÉRIE',String(summed.bestStreak),'Record de touches conformes consécutives');
  push('RÉUSSITE PAR IMPACT',summed.darts?percent(summed.successes,summed.darts)+' %':'—','Fléchettes conformes / fléchettes saisies');
  push('VIE / PÉNALITÉS',modeId==='arcade:three-lives'?String(summed.penalties):'—','Pénalités lorsque documentées dans le moteur');
 }else{
  push('VOLÉES PRODUCTIVES',summed.totalVisits?percent(summed.validated,summed.totalVisits)+' %':'—','Volées avec au moins une réussite');
  push('VOLÉES PARFAITES',String(summed.perfect),'Trois touches valides dans la même volée');
  push('EFFICACITÉ / FL.',summed.darts?percent(summed.successes,summed.darts)+' %':'—','Taux d’impacts conformes');
 }
 if(modeId==='half-it')push('DIVISIONS DU SCORE',String(summed.penalties),'Volées sanctionnées par ÷2');
 if(modeId==='grouping')push('REGROUPEMENTS VALIDÉS',String(summed.validated),'Volées avec seuil de regroupement atteint');
 if(modeId==='doubles8')push('DOUBLES TOUCHÉS',String(summed.successes),'Impacts réussis dans le parcours de doubles');
 if(modeId==='jdc')push('VOLÉES VALIDÉES',String(summed.validated),'Phases et doubles renseignés');
 const recordCards:ChallengeDiagnosticCard[]=[];
 const record=(label:string,value:string,detail:string)=>recordCards.push({label,value,detail});
 if(n){
  record('SÉRIE MAXIMALE',String(summed.bestStreak),'Sur une partie terminée et documentée');
  if((kind==='score'||kind==='streak'||!modeId.startsWith('arcade:'))&&sessions.some(s=>s.bestVisit>0))record('MEILLEURE VOLÉE',String(Math.max(...sessions.map(s=>s.bestVisit)))+' pts','Points validés sur une seule volée');
  record('MINIMUM D’ERREURS',String(Math.min(...sessions.map(s=>s.failures))),'Sur les tentatives dont le détail est disponible');
  const ratio=sessions.map(s=>({score:s.attempts>0?s.successes/s.attempts*100:0,s})).sort((a,b)=>b.score-a.score);
  record('PRÉCISION MAXIMALE',round(ratio[0]!.score)+' %','Meilleur taux d’impacts conformes sur une partie');
 }
 void unit;
 return {cards,recordCards};
}

/** Exploit only confirmed finished games and the selected exact configuration. */
export function buildChallengeModeDiagnostics(input:readonly ChallengeArchiveItem[],modeId:string):ChallengeModeDiagnostics{
 const finished=input.filter(item=>statuses.has(item.status)&&item.modeId===modeId);
 const objectiveMap=new Map<string,AggObj>();const visitMap=new Map<number,AggVisit>();
 const sessions:ChallengeSessionDiagnostic[]=[];
 const extras=new Map<string,number>();
 const addExtra=(key:string,n:unknown)=>extras.set(key,(extras.get(key)||0)+positive(n));
 let missing=0;
 let totalDarts=0,totalSuccesses=0,totalValidated=0,totalPerfect=0,totalVisits=0,totalPenalties=0,maxStreak=0;
 const arcade=modeId.startsWith('arcade:');
 for(const item of finished){
  const cfg=configOf(item);
  const logs=playerLog(item);
  let summary:any=null;
  let attempts=0,successes=0,visits=0,productive=0,perfect=0,bestVisit=0,penalties=0,progress=0,bestStreak=0;
  let visitRows:Array<{index:number;darts:number;successful:number;points:number;validated:boolean;perfect:boolean}>=[];
  if(arcade){
   const globalRows=fullLog(item);
   const allHits=globalRows?loggedArcade(globalRows):null;
   const global=Boolean(allHits?.length&&allHits.every(hit=>hit.pid!==''&&hit.pid!=='undefined'));
   // Use the very same object instances in both arrays: duel/copy/revenge
   // evaluators resolve a player's position with globalHits.indexOf(hit).
   const hits=global?allHits!.filter(hit=>hit.pid===item.playerId):logs?loggedArcade(logs):null;
   if(!hits?.length){missing++;continue;}
   const c:ArcadePlayConfig={...cfg,catalogChallengeId:modeId.slice(7),catalogLine:Number(cfg.catalogLine)||20,catalogRounds:Number(cfg.catalogRounds)||5,catalogVariant:cfg.catalogVariant||'classic'};
   const p=evaluateArcadeProgress(hits,c,global?allHits!:hits,item.playerId);
   let flags=p.hitResults.slice(0,p.attempts);
   if(modeId==='arcade:perfect-relay'&&global){
    // The relay engine reports the shared team's hits. Count only this player's
    // contribution, never credit every teammate with the full relay result.
    flags=flags.filter((_,index)=>allHits![index]?.pid===item.playerId);
   }
   attempts=flags.length;successes=flags.filter(Boolean).length;bestStreak=p.bestStreak;
   progress=modeId==='arcade:perfect-relay'?successes:p.index;
   visits=Math.ceil(attempts/3);
   visitRows=Array.from({length:visits},(_,index)=>{
    const part=flags.slice(index*3,index*3+3);
    const successes=part.filter(Boolean).length;
    return {index,darts:part.length,successful:successes,points:p.visitScores[index]??0,validated:successes>0,perfect:part.length===3&&successes===3};
   });
   productive=visitRows.filter(row=>goalKind(modeId)==='score'?row.points>0:row.validated).length;perfect=visitRows.filter(row=>row.perfect).length;
   if(!['path','team'].includes(goalKind(modeId))&&!['arcade:milestones','arcade:contracts','arcade:bounty-hunt','arcade:territory-war','arcade:collector'].includes(modeId))progress=productive;
   bestVisit=Math.max(0,...visitRows.map(row=>row.points));
   if(modeId==='arcade:three-lives'||modeId==='arcade:forbidden-zone')penalties=Math.max(0,(Number(cfg.catalogLives)||3)-p.lives);
   // Scoring goals are validated per whole volley, never merely by hitting a
   // non-MISS segment. A total of 99 must not validate the COMPTE JUSTE 100.
   if(goalKind(modeId)==='score'){
    for(const row of visitRows){
     const agg=ensureObj(objectiveMap,`VOLÉE ${row.index+1}`);
     agg.attempts++;
     if(row.points>0)agg.validated++;
     agg.points+=row.points;
    }
   }else{
    const objectives=arcadeObjectives(c,item.playerId);
    let stage=0;
    for(let index=0;index<flags.length;index++){
     const hit=hits[index];if(!hit)break;
     const key=modeId==='arcade:collector'?(hit.zone==='MISS'?'TOUCHE MANQUÉE':'ZONE '+hit.zone):objectives.length&&goalKind(modeId)==='path'&&modeId!=='arcade:lock'?objectives[Math.min(stage,objectives.length-1)]?.label||'ÉTAPE':`VOLÉE ${Math.floor(index/3)+1}`;
     const agg=ensureObj(objectiveMap,key);agg.attempts++;
     if(flags[index]){agg.validated++;if(objectives.length&&goalKind(modeId)==='path'&&modeId!=='arcade:collector'&&modeId!=='arcade:lock')stage++;}
    }
   }
  }else{
   const source=logs?loggedLegacy(logs):null;
   summary=summaryStats(item);
   if(!summary&&source){
    const exerciseType=modeId==='classic'?'classic':modeId as any;
    summary=analyzeChallengeExercise(source,{target:String(cfg.target||'20'),rule:String(cfg.rule||'all'),visits:Number(cfg.visits)||30,...cfg,exerciseType});
   }
   if(!summary){missing++;continue;}
   if(modeId==='grouping'){
    addExtra('doublets',summary.groupingDoublets);addExtra('triplets',summary.groupingTriplets);
    addExtra('groupingPoints',summary.groupingPoints);
   }
   if(modeId==='doubles8'){
    addExtra('regularHits',summary.doublesRegularHits);addExtra('bonusHits',summary.doublesBonusHits);
    addExtra('bonusDarts',summary.doublesBonusDarts);
   }
   if(modeId==='jdc'){
    addExtra('shanghai',summary.jdcShanghaiCount);addExtra('doubleHits',summary.jdcDoubleHits);
    addExtra('bullHits',summary.jdcBullHits);
    if(Array.isArray(summary.jdcPhaseScores))summary.jdcPhaseScores.slice(0,3).forEach((value:any,index:number)=>addExtra('phase'+(index+1),value));
   }
   attempts=source?.length||positive(item.darts);
   successes=positive(item.successful);
   if(source){
    const analyzed=analyzeChallengeExercise(source,{target:String(cfg.target||'20'),rule:String(cfg.rule||'all'),visits:Number(cfg.visits)||30,...cfg,exerciseType:modeId as any});
    const evaluation=evaluateChallengeEntries(source,{target:String(cfg.target||'20'),rule:String(cfg.rule||'all'),visits:Number(cfg.visits)||30,...cfg,exerciseType:modeId as any});
    successes=evaluation.entrySuccessful.filter(Boolean).length;
    summary=analyzed;
   }
   visits=positive(summary.visitsPlayed);
   bestStreak=positive(summary.bestValidatedVisitStreak);
   penalties=positive(summary.halfItCuts);
   progress=positive(summary.validatedVisits);
   const raw=Array.isArray(summary.visitStats)?summary.visitStats:[];
   visitRows=raw.map((row:any,index:number)=>({index,darts:positive(row.darts),successful:positive(row.successfulHits),points:positive(row.points),validated:Boolean(row.validated),perfect:Boolean(row.perfect)}));
   productive=visitRows.filter(row=>row.validated).length;perfect=visitRows.filter(row=>row.perfect).length;
   if(!visitRows.length){productive=positive(summary.validatedVisits);perfect=positive(summary.perfectVisits);}
   bestVisit=positive(summary.bestVisitPoints);
   for(const [key,rawRow] of Object.entries(summary.objectiveStats||{})){
    const sourceRow:any=rawRow;
    const agg=ensureObj(objectiveMap,key);
    agg.attempts+=positive(sourceRow?.attempts);agg.validated+=positive(sourceRow?.validated);agg.points+=positive(sourceRow?.points);
   }
  }
  attempts=positive(attempts);successes=positive(successes);
  if(successes>attempts)successes=attempts;
  totalDarts+=attempts;totalSuccesses+=successes;totalVisits+=visits;
  totalValidated+=productive;totalPerfect+=perfect;totalPenalties+=penalties;
  maxStreak=Math.max(maxStreak,bestStreak);
  for(const row of visitRows){
   const agg=ensureVisit(visitMap,row.index);agg.attempts+=row.darts;agg.successful+=row.successful;agg.points+=row.points;if(row.validated)agg.productive++;
  }
  sessions.push({id:item.id,playedAt:item.playedAt,attempts,successes,failures:Math.max(0,attempts-successes),successfulVisits:productive,perfectVisits:perfect,visits,bestVisit,bestStreak,penalties,progress,score:item.score});
 }
 const objectives=[...objectiveMap.values()].map(row=>({...row,label:row.key,rate:percent(row.validated,row.attempts)})).sort((a,b)=>b.attempts-a.attempts||a.label.localeCompare(b.label)).slice(0,25);
 const visits=[...visitMap.values()].map(row=>({...row,rate:percent(row.successful,row.attempts)})).sort((a,b)=>a.visit-b.visit).slice(0,25);
 const unit=arcade&&['path','team'].includes(goalKind(modeId))?'fléchettes':'volées';
 const details=sessions.length?finishCards(modeId,sessions,{darts:totalDarts,successes:totalSuccesses,validated:totalValidated,totalVisits,perfect:totalPerfect,penalties:totalPenalties,bestStreak:maxStreak},unit):{cards:[],recordCards:[]};
 if(sessions.length){
  const add=(label:string,value:string,detail:string)=>details.cards.push({label,value,detail});
  if(modeId==='arcade:exact-count'||modeId==='arcade:green-zone'||modeId==='arcade:upper-limit'||modeId==='arcade:all-or-nothing')
   add('VOLÉES RÉUSSIES',String(totalValidated),'Volées ayant atteint les conditions de score du défi');
  if(modeId==='arcade:three-lives'||modeId==='arcade:forbidden-zone')
   add('VIES PERDUES',String(totalPenalties),'Vies retirées par le moteur pendant les parties documentées');
  if(modeId==='arcade:milestones')add('PALIERS PASSÉS',String(sessions.reduce((sum,s)=>sum+s.progress,0)),'Progression des seuils validés');
  if(modeId==='arcade:contracts')add('CONTRATS VALIDÉS',String(sessions.reduce((sum,s)=>sum+s.progress,0)),'Contrats réalisés pendant les parties documentées');
  if(modeId==='arcade:bounty-hunt')add('PRIMES RÉCOLTÉES',String(sessions.reduce((sum,s)=>sum+s.progress,0)),'Cibles distinctes récompensées');
  if(modeId==='arcade:territory-war')add('TERRITOIRES FINAUX',String(sessions.reduce((sum,s)=>sum+s.progress,0)),'Territoires possédés à la fin de chaque partie documentée');
  if(modeId==='arcade:collector')add('ZONES COLLECTÉES',String(sessions.reduce((sum,s)=>sum+s.progress,0)),'Zones distinctes réunies en fin de partie');
  if(modeId==='grouping'){
   add('DOUBLETS FORMÉS',String(extras.get('doublets')||0),'Volées à deux fléchettes sur le même secteur');
   add('TRIPLETS FORMÉS',String(extras.get('triplets')||0),'Volées à trois touches sur le même secteur');
  }
  if(modeId==='doubles8'){
   add('TOUCHES BONUS',String(extras.get('bonusHits')||0),'Doubles validés dans la volée bonus');
   add('DOUBLETS RÉGULIERS',String(extras.get('regularHits')||0),'Impacts valides sur les doubles de la série');
  }
  if(modeId==='jdc'){
   add('SHANGHAI RÉUSSIS',String(extras.get('shanghai')||0),'Bonus Shanghai documentés');
   add('DOUBLES VALIDÉS',String(extras.get('doubleHits')||0),'Phase dédiée au tour des doubles');
   add('BULLS VALIDÉS',String(extras.get('bullHits')||0),'Bull de la phase des doubles');
   for(let i=1;i<=3;i++)add('PHASE '+i,String(extras.get('phase'+i)||0)+' pts','Total réel cumulé des performances de cette phase');
  }
 }
 return {modeId,title:titleFor(modeId),unit,finished:finished.length,documented:sessions.length,missing,
  darts:totalDarts,successes:totalSuccesses,failures:Math.max(0,totalDarts-totalSuccesses),
  validatedVisits:totalValidated,perfectVisits:totalPerfect,totalVisits,penalties:totalPenalties,bestStreak:maxStreak,
  objectives,visits,sessions:sessions.sort((a,b)=>a.playedAt-b.playedAt),...details};
}
