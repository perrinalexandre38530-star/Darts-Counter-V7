import {
 analyzeChallengeExercise, challengeExerciseType, evaluateChallengeEntries,
 jdcObjectiveForDart, objectiveForVisit, objectiveLabel,
 type ChallengeExerciseConfigLike, type ChallengeEntryLike,
} from './challengeExercises';
import type {
 ChallengeExportPlayer, ChallengeExportReport, ChallengeExportSection, ChallengeExportMetric,
} from './challengeResultsExport';

type RecordedDart=ChallengeEntryLike & {pid?:string};
const hits=['S','D','T','25','50','MISS'] as const;
const hitName=(hit:string,sector?:number|null):string=>
 hit==='MISS'?'MISS':hit==='25'?'BULL':hit==='50'?'DBULL':hit+(Number(sector)||'?');
const pct=(num:number,den:number)=>den?(num/den*100).toFixed(1)+'%':'0%';
const n=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
const cell=(v:unknown)=>v===undefined||v===null?'—':String(v);
const metric=(label:string,value:unknown):ChallengeExportMetric=>({label,value:cell(value)});
const asConfig=(raw:any):ChallengeExerciseConfigLike=>({
 target:String(raw?.target||'20'),rule:String(raw?.rule||'all'),
 visits:Math.max(0,n(raw?.visits)),exerciseType:raw?.exerciseType,
 clockIncludeBull:raw?.clockIncludeBull,clockScoreMode:raw?.clockScoreMode,
 halfItStartScore:raw?.halfItStartScore,sequenceObjectives:raw?.sequenceObjectives,
 sequenceScoreMode:raw?.sequenceScoreMode,groupingMin:raw?.groupingMin,
 groupingMax:raw?.groupingMax,groupingHits:raw?.groupingHits,
 doublesBonusTarget:raw?.doublesBonusTarget,doublesTargets:raw?.doublesTargets,
});
const section=(title:string,columns:string[],rows:string[][],note?:string):ChallengeExportSection=>
 ({title,columns,rows,note});

/** The saved workout log is authoritative; no score or success is reconstructed
 * from hit labels without calling the original Challenge scoring engine.
 */
export function enrichChallengeReport(
 report:ChallengeExportReport,config:unknown,rawLog:unknown,
 storedPlayers:unknown[]=[],
):ChallengeExportReport{
 const cfg=asConfig(config);
 const type=challengeExerciseType(cfg);
 const allEntries=Array.isArray(rawLog)?rawLog as RecordedDart[]:[];
 const historical=Array.isArray(storedPlayers)?storedPlayers as any[]:[];
 const details:ChallengeExportSection[]=[];
 const append=(player:ChallengeExportPlayer,heading:string,columns:string[],rows:string[][],note?:string)=>{
  if(rows.length)details.push(section(player.name.toUpperCase()+' · '+heading,columns,rows,note));
 };
 const meta=[
  ['EXERCICE',type.toUpperCase()],
  ['CIBLE',cfg.target],
  ['RÈGLE',cfg.rule],
  ['VOLÉES CONFIGURÉES',String(cfg.visits||report.rounds)],
  ['JOUEURS',String(report.players.length)],
 ];
 details.push(section('CONFIGURATION DE LA PARTIE',['PARAMÈTRE','VALEUR'],meta));
 for(const player of report.players){
  const stored=historical.find(row=>String(row?.id||row?.pid||row?.playerId||'')===String(player.participantId||''))
   ||historical.find(row=>String(row?.name||row?.playerName||'')===String(player.name))||{};
  const all=allEntries.filter(e=>!player.participantId||String(e?.pid||'')===String(player.participantId));
  const entries=all.length?all:(report.players.length===1?allEntries:[]);
  const storedHits=stored.hitSummary||{};
  const storedPositions=Array.isArray(stored.positionStats)?stored.positionStats:[];
  const storedExercise=stored.exerciseStats||stored.special?.exerciseStats||{};
  const rowsHits:string[][]=[];
  const categories=[['S','SIMPLES'],['D','DOUBLES'],['T','TRIPLES'],['25','BULL 25'],['50','DBULL 50'],['MISS','MISS']];
  if(entries.length){
   const evalResult=evaluateChallengeEntries(entries,cfg);
   categories.forEach(([hit,name])=>{
    const indexes=entries.map((entry,i)=>entry.hit===hit?i:-1).filter(i=>i>=0);
    rowsHits.push([name,String(indexes.length),
      String(indexes.filter(index=>evalResult.entrySuccessful[index]).length),
      pct(indexes.filter(index=>evalResult.entrySuccessful[index]).length,indexes.length)]);
   });
   append(player,'RÉPARTITION DES TOUCHES',['TYPE','FLÉCHETTES','RÉUSSIES','PRÉCISION'],rowsHits,
    'Une touche réussie respecte la cible et la règle de l’exercice.');
   const positions=[0,1,2].map(i=>{
    const attempts=entries.filter((_,j)=>j%3===i).length;
    const successes=evalResult.entrySuccessful.filter((value,j)=>j%3===i&&value).length;
    return ['#'+(i+1),String(attempts),String(successes),pct(successes,attempts)];
   });
   append(player,'PRÉCISION PAR FLÉCHETTE',['POSITION','TENTATIVES','RÉUSSITES','TAUX'],positions);
   const analyzer=analyzeChallengeExercise(entries,cfg);
   const met:ChallengeExportMetric[]=[
    metric('Volées jouées',analyzer.visitsPlayed),
    metric('Volées complètes',analyzer.completedVisits),
    metric('Volées validées',analyzer.validatedVisits),
    metric('Volées manquées',analyzer.failedVisits),
    metric('Taux validation',analyzer.validationRate+'%'),
    metric('Volées parfaites',analyzer.perfectVisits),
    metric('Meilleure suite validée',analyzer.bestValidatedVisitStreak),
    metric('Meilleure suite parfaite',analyzer.bestPerfectVisitStreak),
    metric('Meilleure volée',analyzer.bestVisitPoints),
   ];
   if(type==='jdc')met.push(
    metric('Points phase 1',analyzer.jdcPhaseScores?.[0]??0),
    metric('Points phase 2',analyzer.jdcPhaseScores?.[1]??0),
    metric('Points phase 3',analyzer.jdcPhaseScores?.[2]??0),
    metric('Shanghai',analyzer.jdcShanghaiCount??0),
    metric('Doubles réussis',analyzer.jdcDoubleHits??0),
    metric('Bulls réussis',analyzer.jdcBullHits??0));
   if(type==='half-it')met.push(metric('Divisions par 2',analyzer.halfItCuts),
    metric('Score le plus bas',analyzer.halfItLowestScore),metric('Score final',analyzer.halfItEndScore));
   if(type==='grouping')met.push(metric('Doublets',analyzer.groupingDoublets),
    metric('Triplets',analyzer.groupingTriplets),metric('Points groupement',analyzer.groupingPoints),
    metric('Secteur dominant',analyzer.topGroupingSector??'—'));
   if(type==='doubles8')met.push(
    metric('Doubles touchés',analyzer.doublesRegularHits??0),
    metric('Fléchettes doubles',analyzer.doublesRegularDarts??0),
    metric('Bonus touchés',analyzer.doublesBonusHits??0),
    metric('Bonus points',analyzer.doublesBonusScore??0));
   append(player,'INDICATEURS EXERCICE',['STATISTIQUE','VALEUR'],
    met.map(m=>[m.label,m.value]));
   const targets=new Map<string,{phase:string;label:string;darts:number;successes:number;points:number;shanghai:number}>();
   for(let i=0;i<entries.length;i++){
    const e=entries[i];
    const objective=type==='jdc'?jdcObjectiveForDart(i):null;
    const key=objective?String(objective.phase)+':'+objective.label
      :objectiveForVisit(cfg,Math.floor(i/3));
    const title=objective?.label||objectiveLabel(String(key),cfg);
    const row=targets.get(String(key))||{phase:objective?'PHASE '+objective.phase:'',label:title,darts:0,successes:0,points:0,shanghai:0};
    row.darts++;
    if(evalResult.entrySuccessful[i])row.successes++;
    const points=n(evalResult.entryPoints[i]);row.points+=points;
    if(type==='jdc'&&i%3===2&&objective&&objective.phase!==2&&
      points>n((e.hit==='S'?1:e.hit==='D'?2:e.hit==='T'?3:0)*n(e.segment)))row.shanghai++;
    targets.set(String(key),row);
   }
   append(player,'PERFORMANCE PAR CIBLE',
    ['PHASE','CIBLE','LANCERS','RÉUSSITES','POINTS','SHANGHAI'],
    Array.from(targets.values()).map(row=>[row.phase,row.label,String(row.darts),
      String(row.successes),String(row.points),String(row.shanghai)]),
    type==='jdc'?'Valeurs réelles pour les secteurs · 50 pts par double / 100 pts par DBULL · Shanghai +100.':undefined);
   const visitRows:string[][]=[];
   for(let i=0;i<Math.ceil(entries.length/3);i++){
    const chunk=entries.slice(i*3,i*3+3);
    const labelObjective=type==='jdc'
      ?jdcObjectiveForDart(i*3).phase===2
        ?Array.from({length:chunk.length},(_,j)=>jdcObjectiveForDart(i*3+j).label).join('/')
        :jdcObjectiveForDart(i*3).label
      :objectiveLabel(objectiveForVisit(cfg,i),cfg);
    const first=i*3;
    const scores=evalResult.entryPoints.slice(first,first+chunk.length);
    const hits=evalResult.entrySuccessful.slice(first,first+chunk.length).filter(Boolean).length;
    visitRows.push([
      String(i+1),type==='jdc'?'P'+jdcObjectiveForDart(first).phase:'—',
      labelObjective,
      ...Array.from({length:3},(_,j)=>chunk[j]?hitName(chunk[j].hit,chunk[j].segment)+' +'+n(scores[j]):'—'),
      String(hits)+'/'+chunk.length,
      String(evalResult.visitScores[i]??0),
      String(evalResult.cumulativeScores[i]??0),
    ]);
   }
   append(player,'JOURNAL DE TOUTES LES VOLÉES',
    ['N°','PHASE','CIBLE','DART 1','DART 2','DART 3','HITS','PTS','TOTAL'],
    visitRows,'Le journal affiche les saisies réellement enregistrées, y compris les MISS.');
   const sumLast=evalResult.cumulativeScores[evalResult.cumulativeScores.length-1];
   if(Number.isFinite(sumLast)&&Number.isFinite(player.score)&&n(sumLast)!==n(player.score)){
    details.push(section(player.name+' · CONTRÔLE DES TOTAUX',['VÉRIFICATION','VALEUR'],
      [['Total enregistré',String(player.score)],['Total recalculé par le moteur',String(sumLast)]],
      'Écart entre le total sauvegardé et le journal : les données d’origine ne sont pas modifiées.'));
   }
  }else{
   // Older archives may have aggregate stats but not dart-by-dart events.
   if(Object.keys(storedHits).length){
    for(const [hit,name] of categories){
     const field=hit==='25'?'SBull':hit==='50'?'DBull':hit;
     if(storedHits[field]!==undefined)rowsHits.push([name,String(storedHits[field]),'—','—']);
    }
    append(player,'RÉPARTITION DES TOUCHES',['TYPE','FLÉCHETTES','RÉUSSIES','PRÉCISION'],
      rowsHits,'Les résultats individuels ne sont pas conservés dans cette archive.');
   }
   if(storedPositions.length)append(player,'PRÉCISION PAR FLÉCHETTE',
    ['POSITION','TENTATIVES','RÉUSSITES','TAUX'],
    storedPositions.map((p:any)=>['#'+cell(p.position),cell(p.attempts),cell(p.successful),p.accuracy===undefined?'—':p.accuracy+'%']));
   const exMeta=Object.entries(storedExercise).filter(([key,value])=>
      typeof value==='number'&&Number.isFinite(value)&&!key.toLowerCase().includes('ratio'));
   append(player,'INDICATEURS ENREGISTRÉS',['INDICATEUR','VALEUR'],
    exMeta.map(([key,value])=>[key,String(value)]).slice(0,60));
   if(Array.isArray(player.visits)&&player.visits.length){
    append(player,'RÉSULTATS PAR VOLÉE',['N°','POINTS','CUMUL'],
      player.visits.map((points,i)=>[String(i+1),String(points),
        String(player.visits.slice(0,i+1).reduce((total,v)=>total+n(v),0))]),
      'L’archive ne contient pas les trois fléchettes individuelles.');
   }
  }
 }
 return {...report,details};
}
