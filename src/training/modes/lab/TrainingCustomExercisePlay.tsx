import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";
import { makeTrainingStats, trainingDartMatches, type TrainingDart } from "../../lib/trainingDarts";
import { EXTENDED_RULE_BY_ID, type ExtendedTrainingRule } from "../../catalog/trainingLabExtendedRules";
import { evaluateExtendedOutcome } from "../../profile/trainingExtendedOutcome";
import { getTrainingTechniqueGuide } from "../../catalog/trainingTechniqueGuides";
import { clearTrainingExerciseDraft, getEffectiveDraftSeconds, saveTrainingExerciseDraft } from "../../profile/trainingExerciseDraft";
import { buildTrainingExercisePostSessionFeedback, getTrainingExerciseProgressionSnapshot, type TrainingExercisePostSessionFeedback } from "../../profile/trainingExerciseFeedback";
import { buildTrainingResultVoiceText, pronounceDartSegments } from "../../profile/trainingVoiceScripts";
import { useTrainingVoiceCoach } from "../../ui/useTrainingVoiceCoach";

const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const visitScore=(v:TrainingDart[])=>v.reduce((s,d)=>s+d.score,0);
const countSector=(v:TrainingDart[], sector:number)=>v.filter(d=>d.v===sector).length;
const countMarks=(v:TrainingDart[], sector:number)=>v.reduce((s,d)=>s+(d.v===sector?d.mult:0),0);
const isCheckout=(v:TrainingDart[], score:number)=>visitScore(v)===score && !!v.length && v[v.length-1].mult===2;
const sectorsClock=Array.from({length:20},(_,i)=>i+1);
const cricket=[20,19,18,17,16,15,25];
const routourne:[[number,number],...[number,number][]] = [[20,3],[1,19],[18,7],[4,16],[13,8],[6,11],[10,14],[15,9],[2,12],[17,5],[3,20],[19,1],[7,18],[16,4],[8,13],[11,6],[14,10],[9,15],[12,2],[5,17]] as any;
const switcher=[[20,20,14],[20,20,15],[20,20,16],[20,20,17],[20,20,18],[20,20,19],[20,20,20],[20,20,25]];
const finishSeq=[40,36,32,24,20,16,12,8,4,50];
const halfTargets=[15,16,"double",17,18,"triple",19,20,"bull"] as const;
const deadlineTargets=["D20","S20","T20","S20","BULL","DBULL","BULL","S3","T3","S3","D3","S3","T3","S3","BULL","DBULL","BULL","S20","T20","S20","D20"];
const rainbowRoutes=[["D20","D10","D5"],["D16","D8","D4"],["D4","D2","D1"],["D12","D6","D3"],["DBULL","D18","D9"],["DBULL","D14","D7"]];
const smallFinishSeq=[3,3,3,7,7,7,13,13,13];
const endurance42 = [
  {k:"sector",v:7},{k:"ordered",t:["S1","D2","T3"]},{k:"sector",v:8},{k:"ordered",t:["S4","S3","S2"]},
  {k:"sector",v:9},{k:"double2"},{k:"sector",v:10},{k:"ordered",t:["S7","D8","T9"]},{k:"sector",v:11},{k:"ordered",t:["S11","S12","S13"]},
  {k:"sector",v:12},{k:"finish",v:25},{k:"sector",v:13},{k:"finish",v:50},{k:"sector",v:14},{k:"ordered",t:["S20","D19","T18"]},
  {k:"sector",v:15},{k:"ordered",t:["S17","S16","S15"]},{k:"sector",v:16},{k:"triple2"},{k:"sector",v:17},{k:"ordered",t:["S14","D13","T12"]},
  {k:"sector",v:18},{k:"ordered",t:["S11","S10","S9"]},{k:"sector",v:19},{k:"finish",v:50},{k:"sector",v:20},{k:"finish",v:75},
  {k:"shanghai",v:15},{k:"ordered",t:["S20","D6","T3"]},{k:"shanghai",v:16},{k:"ordered",t:["S6","D3","T11"]},
  {k:"shanghai",v:17},{k:"ordered",t:["S3","D11","T20"]},{k:"shanghai",v:18},{k:"finish",v:75},{k:"shanghai",v:19},{k:"finish",v:100},
  {k:"shanghai",v:20},{k:"finish",v:125},{k:"bull"},{k:"letters"}
] as const;
const exactOrdered=(visit:TrainingDart[],targets:readonly string[])=>targets.every((t,i)=>!!visit[i]&&trainingDartMatches(visit[i],t));
const cardMissions=[
  {t:"40+ points en 3 fléchettes",k:"score",v:40,d:3},{t:"Un double en 9 fléchettes",k:"double",d:9,bonus:true},{t:"Finir 25 en 9 fléchettes",k:"finish",v:25,d:9,bonus:true},{t:"2 fléchettes dans le 20",k:"sector",v:20,c:2,d:3},
  {t:"Finir 40 en 6 fléchettes",k:"finish",v:40,d:6},{t:"Finir 55 en 6 fléchettes",k:"finish",v:55,d:6,bonus:true},{t:"Un triple en 6 fléchettes",k:"triple",d:6},{t:"Finir 121 en 12 fléchettes",k:"finish",v:121,d:12,bonus:true},
  {t:"50+ points en 3 fléchettes",k:"score",v:50,d:3},{t:"Un double en 6 fléchettes",k:"double",d:6},{t:"Finir 25 en 6 fléchettes",k:"finish",v:25,d:6},{t:"3 fléchettes dans le 20",k:"sector",v:20,c:3,d:3},
  {t:"Finir 40 en 3 fléchettes",k:"finish",v:40,d:3},{t:"Finir 75 en 6 fléchettes",k:"finish",v:75,d:6,bonus:true},{t:"2 triples en 6 fléchettes",k:"triple",c:2,d:6,bonus:true},{t:"Finir 121 en 9 fléchettes",k:"finish",v:121,d:9,bonus:true},
  {t:"60+ points en 3 fléchettes",k:"score",v:60,d:3},{t:"2 doubles en 6 fléchettes",k:"double",c:2,d:6},{t:"Finir 61 en 6 fléchettes",k:"finish",v:61,d:6},{t:"70+ points en 3 fléchettes",k:"score",v:70,d:3},
  {t:"Finir 95 en 3 fléchettes",k:"finish",v:95,d:3},{t:"Finir 120 en 6 fléchettes",k:"finish",v:120,d:6},{t:"3 triples en 6 fléchettes",k:"triple",c:3,d:6,bonus:true},{t:"Finir 121 en 6 fléchettes",k:"finish",v:121,d:6},
  {t:"80+ points en 3 fléchettes",k:"score",v:80,d:3},{t:"3 doubles en 6 fléchettes",k:"double",c:3,d:6,bonus:true},{t:"Finir 85 en 3 fléchettes",k:"finish",v:85,d:3},{t:"100+ points en 3 fléchettes",k:"score",v:100,d:3},
  {t:"Finir 105 en 3 fléchettes",k:"finish",v:105,d:3},{t:"Finir 140 en 3 fléchettes",k:"finish",v:140,d:3},{t:"2 triples en 3 fléchettes",k:"triple",c:2,d:3},{t:"Finir 121 en 3 fléchettes",k:"finish",v:121,d:3},
] as const;

type State={darts:number;hits:number;points:number;round:number;index:number;remaining:number;best:number;worst:number|null;lives:number;streak:number;bestStreak:number;aggregatedDarts:number;aux:any};
function initial(rule:ExtendedTrainingRule):State{
  return {darts:0,hits:0,points:rule.kind==="bob27"?27:rule.kind==="half_it"?40:0,round:0,index:0,remaining:rule.kind==="x01_restricted"?501:rule.kind==="fish170"?170:0,best:0,worst:null,lives:3,streak:0,bestStreak:0,aggregatedDarts:0,aux: rule.kind==="atomic"?{temps:Array(21).fill(0),fused:new Set<number>()}:{}};
}

function targetText(rule:ExtendedTrainingRule,s:State){
  switch(rule.kind){
    case "progressive_checkout": return String((rule.params?.start||41)+s.index);
    case "clock_speed": return rule.params?.doubles?`D${s.index+1}`:String(s.index+1);
    case "x01_restricted": return `${s.remaining}`;
    case "cricket_count": return cricket[s.round]===25?"BULL":String(cricket[s.round]||20);
    case "bob27": return `D${Math.min(20,s.round+1)}`;
    case "half_it": return String(halfTargets[s.round]||"—").toUpperCase();
    case "hardcore_clock": return `S${s.index+1}`;
    case "deadline": return deadlineTargets[s.index]||"FIN";
    case "brochette": return (rule.params?.targets||[])[s.index%3]||"—";
    case "switcher": { const t=switcher[s.round]?.[s.index%3]||20; return t===25?"BULL":`T${t}`; }
    case "small_finishes": return String(smallFinishSeq[s.round]||3);
    case "streak_sector": return String(rule.params?.sector||20);
    case "around_score": return s.round<20?String(s.round+1):"BULL";
    case "survival_score": return `≥ ${rule.params?.threshold||65}`;
    case "pekin": return s.round<6?String(20-s.round):"BULL";
    case "route_targets": return rule.params?.variant==="routourne"?`D${routourne[s.round]?.[0]||20} • BULL • D${routourne[s.round]?.[1]||3}`:`TOUR ${s.round+1}`;
    case "balanced_bull": return s.round<6?`${20-s.round} + BULL`:`${15+(s.round-5)} + BULL`;
    case "deep_dive": return String(15+s.round);
    case "risk7": return "VERROUILLER UN SECTEUR";
    case "double_or_nothing": return String(finishSeq[s.round]||40);
    case "five_elements": return s.points<4?`PILIER ${s.points+1}/4`:"NOYAU";
    case "card_missions": return `CARTE ${s.round+1}/32`;
    case "endurance42": { const e=endurance42[s.round] as any; return e?.v?`${e.k.toUpperCase()} ${e.v}`:e?.t?e.t.join(" • "):`ÉTAPE ${s.round+1}/42`; }
    case "jdc": { const phase=s.aux.phase||1; if(phase===1)return String(10+(s.aux.step||0)); if(phase===2){const n=(s.aux.doubleIndex||1);return n<=20?`D${n}`:"DBULL";} return String(15+(s.aux.step||0)); }
    case "redemption": return `VOLÉE ${s.round+1}/12`;
    case "atomic": return `TOUR ${s.round+1}`;
    case "rainbow": return `ROUTE ${(s.round%6)+1} • CYCLE ${Math.floor(s.round/6)+1}/3`;
    case "technique": return "FOCUS TECHNIQUE";
    default:return `TOUR ${s.round+1}`;
  }
}

function missionSuccess(m:any,darts:TrainingDart[]){
  if(m.k==="score") return visitScore(darts)>=m.v;
  if(m.k==="double") return darts.filter(d=>d.mult===2).length>=(m.c||1);
  if(m.k==="triple") return darts.filter(d=>d.mult===3).length>=(m.c||1);
  if(m.k==="sector") return darts.filter(d=>d.v===m.v).length>=(m.c||1);
  if(m.k==="finish") return isCheckout(darts,m.v);
  return false;
}

export default function TrainingCustomExercisePlay({config,onExit,exercise}:{config:any;onExit:()=>void;exercise:any}){
  const resolvedRule=EXTENDED_RULE_BY_ID[exercise.ruleId||exercise.id];
  const rule: ExtendedTrainingRule = resolvedRule || { id: String(exercise?.id || "unknown"), title: String(exercise?.title || "Exercice indisponible"), subtitle: "Définition d’exercice introuvable.", family: exercise?.family || "regularity", difficulty: 1, kind: "technique", params: { focus: "Cet exercice doit être réparé avant de pouvoir être joué." } };
  const ruleMissing = !resolvedRule;
  const participantId = String(config?.activeParticipant?.id || config?.selectedPlayerIds?.[0] || "").trim() || null;
  const resumeExerciseDraft = config?.resumeExerciseDraft && String(config.resumeExerciseDraft.exerciseId || "") === String(exercise.id) ? config.resumeExerciseDraft : null;
  const [state,setState]=React.useState<State>(()=>resumeExerciseDraft?.state ? { ...initial(rule), ...resumeExerciseDraft.state, aux: resumeExerciseDraft.state.aux || {} } : initial(rule));
  const stateRef=React.useRef(state); React.useEffect(()=>{stateRef.current=state},[state]);
  const startedAt=React.useRef(Number(resumeExerciseDraft?.startedAt) || Date.now());
  const [result,setResult]=React.useState<any>(null);
  const [exerciseFeedback,setExerciseFeedback]=React.useState<TrainingExercisePostSessionFeedback|null>(null);
  const resumedSeconds = getEffectiveDraftSeconds(resumeExerciseDraft);
  const [secondsLeft,setSecondsLeft]=React.useState(resumedSeconds == null ? (rule.durationSec||0) : resumedSeconds);
  const finishedRef=React.useRef(false);
  const participantIds=config?.selectedPlayerIds;

  const persistDraft=React.useCallback((nextState:State=stateRef.current,nextSeconds=secondsLeft)=>{
    if(finishedRef.current || String(config?.sessionKind || "exercise") !== "exercise") return;
    saveTrainingExerciseDraft({exerciseId:exercise.id,participantId,engine:"custom",savedAt:Date.now(),startedAt:startedAt.current,state:nextState,visitHistory:[],secondsLeft:rule.durationSec?nextSeconds:null});
  },[config?.sessionKind,exercise.id,participantId,rule.durationSec,secondsLeft]);

  const finish=React.useCallback((success=true,finalState?:State)=>{
    if(finishedRef.current)return; finishedRef.current=true;
    const s=finalState||stateRef.current; const endedAt=Date.now();
    clearTrainingExerciseDraft(exercise.id,participantId);
    const scorePoints = rule.kind==="bull_stack" ? Math.max(s.best,s.points) : rule.kind==="fish170" ? (s.best||99) : s.points;
    const outcome = evaluateExtendedOutcome(rule, s, success);
    const preciseDarts = Math.max(0, s.darts - (s.aggregatedDarts || 0));
    const accuracyPct = preciseDarts ? (s.hits / preciseDarts) * 100 : null;
    const completionPct = rule.rounds ? Math.min(100, (s.round / Math.max(1, rule.rounds)) * 100) : success ? 100 : Math.min(99, outcome.performanceScore);
    const metrics={exerciseId:exercise.id,exerciseTitle:exercise.title,family:exercise.family,difficulty:exercise.difficulty,completionPct,accuracyPct,precisionUnavailable:accuracyPct===null,aggregatedDarts:s.aggregatedDarts||0,aggregateVisits:Array.isArray(s.aux?.aggregateVisits)?s.aux.aggregateVisits:[],performanceScore:outcome.performanceScore,score:scorePoints,customRule:rule.kind,objectivePassed:outcome.passed,objectiveMetric:outcome.metricLabel,objectiveValue:outcome.metricValue,objectiveTarget:outcome.targetValue,objectiveDirection:outcome.direction};
    const participantId=String(config?.activeParticipant?.id||participantIds?.[0]||"").trim()||null;
    const progressionBefore=getTrainingExerciseProgressionSnapshot(exercise,participantId);
    recordSoloTrainingResult({modeId:"training_lab",config:{...config,exerciseId:exercise.id,family:exercise.family,customRule:rule.kind},participantIds,startedAt:startedAt.current,endedAt,darts:s.darts,hits:s.hits,points:scorePoints,success:outcome.passed,metrics,visitHistory:[]});
    setExerciseFeedback(buildTrainingExercisePostSessionFeedback(exercise,participantId,progressionBefore,Number(metrics.performanceScore)||0));
    setResult({success:outcome.passed,metrics,outcome,stats:makeTrainingStats({darts:s.darts,hits:s.hits,points:Math.max(0,s.points),startedAt:startedAt.current,endedAt})});
  },[config,exercise,participantId,participantIds,rule]);

  React.useEffect(()=>{ if(!rule.durationSec||result)return; const id=setInterval(()=>setSecondsLeft(x=>{if(x<=1){clearInterval(id); setTimeout(()=>finish(true),0); return 0;}return x-1}),1000); return()=>clearInterval(id);},[finish,result,rule.durationSec]);

  const applyVisit=React.useCallback((visit:TrainingDart[])=>{
    if(result||!visit.length)return;
    setState(prev=>{
      let s:{[K in keyof State]:State[K]}={...prev,aux:{...prev.aux}};
      s.darts+=visit.length; s.hits+=visit.filter(d=>!d.miss).length;
      const vs=visitScore(visit);
      const done=(ok=true)=>setTimeout(()=>finish(ok,s as State),0);
      switch(rule.kind){
        case "progressive_checkout":{
          const target=(rule.params?.start||41)+s.index; const ok=isCheckout(visit,target);
          if(rule.params?.refuge){ if(ok){ if(visit.length<=3)s.aux.refuge=target; s.index+=1;} else s.index=Math.max(0,(s.aux.refuge||rule.params.start)-rule.params.start); }
          else if(ok)s.index+=1;
          if(ok)s.points+=1;
          if((rule.params?.start||41)+s.index>(rule.params?.end||80))done(true); break;
        }
        case "clock_speed":{
          if(rule.params?.simpleClock){ const target=s.index+1; for(const d of visit){ if(d.v===target){s.index++;break;} } }
          else if(rule.params?.doubles){ const target=s.index+1; for(const d of visit){ if(d.v===target&&d.mult===2){s.index++;break;} } }
          else for(const d of visit){const target=s.index+1;if(d.v===target)s.index+=d.mult;}
          if(s.index>=20)done(true);break;
        }
        case "x01_restricted":{
          let score=0; for(const d of visit){ if(s.remaining<=170)score+=d.score; else if([18,19,20].includes(d.v)){ if(rule.params?.variant==="switch"){const dartPos=(s.darts-visit.length)+visit.indexOf(d);const required=[20,19,18][dartPos%3];if(d.v===required)score+=d.score;}else score+=d.score; } }
          const next=s.remaining-score; if(next===0&&visit.some(d=>d.mult===2)){s.remaining=0;done(true);} else if(next>1)s.remaining=next; break;
        }
        case "round_score":{
          if(rule.params?.mode==="checkout50"){ if(visit[0]?.v===25&&isCheckout(visit,50))s.points+=1; }
          else if(rule.params?.target){ for(const d of visit)if(d.v===rule.params.target)s.points+=rule.params.multPoints?d.mult:1; }
          else if(rule.params?.chooseSegment){const seg=s.aux.segment||20;for(const d of visit)if(d.v===seg)s.points+=d.score;}
          else s.points+=vs; s.round++; if(s.round>=(rule.rounds||8))done(true);break;
        }
        case "bull_stack":{let add=0;for(const d of visit)if(d.v===25)add+=d.mult===2?50:25;if(add===0)s.points=0;else{s.points+=add;s.best=Math.max(s.best,s.points);}break;}
        case "fish170":{s.aux.attemptDarts=(s.aux.attemptDarts||0)+visit.length;s.remaining-=vs;if(s.remaining===0&&visit.length&&visit[visit.length-1].mult===2){const used=s.aux.attemptDarts;s.best=s.best?Math.min(s.best,used):used;s.points=s.best;s.remaining=170;s.aux.attemptDarts=0;s.aux.attempt=(s.aux.attempt||1)+1;}else if(s.remaining<2||(s.aux.attemptDarts||0)>=15){s.remaining=170;s.aux.attemptDarts=0;s.aux.attempt=(s.aux.attempt||1)+1;}break;}
        case "hardcore_clock":{const target=s.index+1;const n=visit.filter(d=>d.v===target&&d.mult===1).length;if(n===3)s.index++;else if(n<=1)s.index=Math.max(0,s.index-1);s.round++;s.points=Math.max(s.points,s.index);if(s.index>=20)done(true);break;}
        case "cricket_count":{const target=cricket[s.round];for(const d of visit){if(target===25&&d.v===25)s.points+=d.mult===2?2:1;else if(d.v===target)s.points+=d.mult;}s.round++;if(s.round>=7)done(true);break;}
        case "bob27":{const target=s.round+1;let hits=visit.filter(d=>d.v===target&&d.mult===2).length;if(hits)s.points+=hits*(target*2);else s.points-=target*2;s.round++;if(s.round>=20)done(true);break;}
        case "half_it":{const target=halfTargets[s.round];let add=0;if(target==="double")add=visit.filter(d=>d.mult===2).reduce((a,d)=>a+d.score,0);else if(target==="triple")add=visit.filter(d=>d.mult===3).reduce((a,d)=>a+d.score,0);else if(target==="bull")add=visit.filter(d=>d.v===25).reduce((a,d)=>a+d.score,0);else add=visit.filter(d=>d.v===target).reduce((a,d)=>a+d.score,0);s.points=add?s.points+add:Math.ceil(s.points/2);s.round++;if(s.round>=9)done(true);break;}
        case "deadline":{for(const d of visit){const t=deadlineTargets[s.index];if(t&&trainingDartMatches(d,t))s.index++;if(s.index>=deadlineTargets.length){done(true);break;}}break;}
        case "brochette":{let n=0;(rule.params?.targets||[]).forEach((t:string,i:number)=>{if(visit[i]&&trainingDartMatches(visit[i],t))n++;});s.points+=n*n;s.round++;if(s.round>=8)done(true);break;}
        case "switcher":{const targets=switcher[s.round]||[];let perfect=s.aux.perfect!==false;visit.forEach((d,i)=>{const t=targets[i];if(t===25?d.v===25:d.v===t)s.points+=d.score;const exact=t===25?d.v===25:(d.v===t&&d.mult===3);if(!exact)perfect=false;});s.aux.perfect=perfect;s.round++;if(s.round>=8){if(perfect)s.points+=100;done(true);}break;}
        case "double_or_nothing":{const target=finishSeq[s.round];if(s.aux.bonus){s.points+=vs*(s.round===9?2:1);s.aux.bonus=false;s.round++;}else{const special=s.round===9;const ok=isCheckout(visit,target)&&(!special||visit[0]?.v===25);if(ok)s.aux.bonus=true;else s.round++;}if(s.round>=10)done(true);break;}
        case "small_finishes":{const target=smallFinishSeq[s.round]||3;if(isCheckout(visit,target))s.points+=50;else{const rest=target-vs;if(rest>0&&rest%2===0)s.points+=10;}s.round++;if(s.round>=9)done(true);break;}
        case "streak_sector":{const sector=rule.params?.sector||20;for(const d of visit){if(d.v===sector){s.streak+=d.mult;s.bestStreak=Math.max(s.bestStreak,s.streak);}else s.streak=0;}s.points=s.bestStreak;break;}
        case "redemption":{const score=vs;if(score>s.best){s.best=score;s.aux.bestCount=1;}else if(score===s.best){s.aux.bestCount=(s.aux.bestCount||0)+1;}s.worst=s.worst===null?score:Math.min(s.worst,score);if((s.aux.bestCount||0)>=2&&s.worst!==null){s.worst=null;s.aux.bestCount=0;}s.points=s.worst??score;s.round++;if(s.round>=12)done(true);break;}
        case "around_score":{const target=s.round<20?s.round+1:25;for(const d of visit)if(d.v===target)s.points+=target===25?(d.mult===2?2:1):d.mult;s.round++;if(s.round>=21)done(true);break;}
        case "survival_score":{if(vs>=(rule.params?.threshold||65))s.points++;s.round++;if(s.round>=15)done(true);break;}
        case "pekin":{const target=s.round<6?20-s.round:25;s.aux.used=(s.aux.used||0)+visit.length;if(target===25){s.aux.half=(s.aux.half||0)+visit.filter(d=>d.v===25&&d.mult===1).length;s.aux.dbull=(s.aux.dbull||0)+visit.filter(d=>d.v===25&&d.mult===2).length;const valid=(s.aux.half||0)>=3&&(s.aux.dbull||0)>=1;if(valid||s.aux.used>=9){if(valid)s.points+=Math.max(0,10-s.aux.used);s.round++;s.aux={};if(s.round>=7)done(true);}}else{const marks=countMarks(visit,target);s.aux.marks=(s.aux.marks||0)+marks;if((s.aux.marks||0)>=5||s.aux.used>=9){if(s.aux.marks>=5)s.points+=Math.max(0,10-s.aux.used);s.round++;s.aux={};if(s.round>=7)done(true);}}break;}
        case "route_targets":{if(rule.params?.variant==="routourne"){const [a,b]=routourne[s.round]||[20,3];let hits=0;if(visit.some(d=>d.v===a&&d.mult===2))hits++;if(visit.some(d=>d.v===25))hits++;if(visit.some(d=>d.v===b&&d.mult===2))hits++;s.points+=hits===3?5:hits===2?3:hits===1?1:0;s.round++;if(s.round>=(rule.rounds||20))done(true);}else{const target=s.round<11?10+s.round:25;const phase=s.aux.phase||1;if(phase===1){s.aux.marks=target===25?visit.filter(d=>d.v===25).reduce((a,d)=>a+(d.mult===2?2:1),0):visit.filter(d=>d.v===target).reduce((a,d)=>a+d.mult,0);s.aux.phase=2;}else if(phase===2){s.aux.baseScore=vs;s.aux.phase=3;}else{const temp=(s.aux.marks||0)*(s.aux.baseScore||0);const checkoutTarget=Number(String(Math.max(0,temp)).slice(0,2))||0;const doubled=checkoutTarget>1&&isCheckout(visit,checkoutTarget);s.points+=temp*(doubled?2:1);s.round++;s.aux={};if(s.round>=(rule.rounds||12))done(true);}}break;}
        case "balanced_bull":{const target=s.round<6?20-s.round:15+(s.round-5);if(!s.aux.phase||s.aux.phase==="sector"){s.aux.sectorPts=visit.filter(d=>d.v===target).reduce((a,d)=>a+d.mult,0);s.aux.phase="bull";}else{const bullPts=visit.filter(d=>d.v===25).reduce((a,d)=>a+(d.mult===2?2:1),0);s.points+=(s.aux.sectorPts||0)*bullPts;s.round++;s.aux={phase:"sector"};if(s.round>=11)done(true);}break;}
        case "deep_dive":{const target=15+s.round;const marks=countMarks(visit,target);const delta=marks===3?Math.max(0,3-visit.length)*target:-Math.abs(3-marks)*target;s.points+=delta;s.round++;if(s.round>=6)done(true);break;}
        case "risk7":{const marksBy=new Map<number,number>();for(const d of visit){if(!d.miss)marksBy.set(d.v,(marksBy.get(d.v)||0)+d.mult);}const candidates=[...marksBy.entries()].filter(([,m])=>m>=3);if(candidates.length){const [sec,m]=candidates.sort((a,b)=>b[1]-a[1])[0];s.aux.locked=s.aux.locked||{};const prev=s.aux.locked[sec]||0;if(m>prev){s.points+=(m-prev)*sec;s.aux.locked[sec]=m;}}break;}
        case "surcharge":{const groups=new Map<string,TrainingDart[]>();for(const d of visit){if(d.miss)continue;const k=d.label;groups.set(k,[...(groups.get(k)||[]),d]);}const valid=[...groups.values()].filter(arr=>arr.length===1).flat();let total=valid.reduce((a,d)=>a+d.score,0);const sectorCount=new Map<number,number>();for(const d of valid)sectorCount.set(d.v,(sectorCount.get(d.v)||0)+1);for(const n of sectorCount.values())if(n===2)total+=50;else if(n===3)total+=100;s.points+=total;s.round++;if(s.round>=8)done(true);break;}
        case "five_elements":{const triples=visit.filter(d=>d.mult===3&&d.v>=15&&d.v<=20).length;const inRange=visit.filter(d=>d.v>=15&&d.v<=20).length;if(s.points<4){if(triples>0&&inRange===3)s.points=Math.min(4,s.points+Math.min(3,triples));}else{if(visit.some(d=>d.v===25)&&inRange>=2){s.points=5;done(true);}}break;}
        case "card_missions":{const m=cardMissions[s.round];const ok=missionSuccess(m,visit);if(ok){s.points++;if(m.bonus&&visit.length<=3)s.lives++;s.round++;}else s.lives--;if(s.round===8||s.round===16||s.round===24)s.lives++;if(s.lives<=0||s.round>=32)done(s.round>=32);break;}
        case "endurance42":{const e=endurance42[s.round] as any;let add=0;if(e.k==="sector")add=visit.filter(d=>d.v===e.v).reduce((a,d)=>a+d.score,0);else if(e.k==="ordered")add=visit.reduce((a,d,i)=>a+(e.t[i]&&trainingDartMatches(d,e.t[i])?d.score:0),0);else if(e.k==="finish")add=isCheckout(visit,e.v)?e.v:0;else if(e.k==="shanghai"){const ok=visit.some(d=>d.v===e.v&&d.mult===1)&&visit.some(d=>d.v===e.v&&d.mult===2)&&visit.some(d=>d.v===e.v&&d.mult===3);add=visit.filter(d=>d.v===e.v).reduce((a,d)=>a+d.score,0)+(ok?100:0);}else if(e.k==="double2"){const by=new Map<number,number>();visit.filter(d=>d.mult===2).forEach(d=>by.set(d.v,(by.get(d.v)||0)+1));const hit=[...by.entries()].find(([,n])=>n>=2);if(hit)add=hit[0]*2*hit[1];}else if(e.k==="triple2"){const by=new Map<number,number>();visit.filter(d=>d.mult===3).forEach(d=>by.set(d.v,(by.get(d.v)||0)+1));const hit=[...by.entries()].find(([,n])=>n>=2);if(hit)add=hit[0]*3*hit[1];}else if(e.k==="bull")add=visit.filter(d=>d.v===25).reduce((a,d)=>a+d.score,0);else if(e.k==="letters"){if(visit[0]?.v===11)add+=60;if(visit[1]?.v===6)add+=60;if(visit[2]?.v===25)add+=60;}s.points+=add;s.round++;if(s.round>=42)done(true);break;}
        case "jdc":{s.aux.phase=s.aux.phase||1;s.aux.step=s.aux.step||0;if(s.aux.phase===1){const t=10+s.aux.step;for(const d of visit)if(d.v===t)s.points+=d.score;if(visit.some(d=>d.v===t&&d.mult===1)&&visit.some(d=>d.v===t&&d.mult===2)&&visit.some(d=>d.v===t&&d.mult===3))s.points+=100;s.aux.step++;if(s.aux.step>=6){s.aux.phase=2;s.aux.doubleIndex=1;s.aux.step=0;}}else if(s.aux.phase===2){for(const d of visit){const n=s.aux.doubleIndex||1;if(n<=20){if(d.v===n&&d.mult===2)s.points+=50;}else if(n===21&&d.v===25&&d.mult===2)s.points+=100;s.aux.doubleIndex=n+1;if(s.aux.doubleIndex>21){s.aux.phase=3;s.aux.step=0;break;}}}else{const t=15+s.aux.step;for(const d of visit)if(d.v===t)s.points+=d.score;if(visit.some(d=>d.v===t&&d.mult===1)&&visit.some(d=>d.v===t&&d.mult===2)&&visit.some(d=>d.v===t&&d.mult===3))s.points+=100;s.aux.step++;if(s.aux.step>=6)done(true);}s.round++;break;}
        case "atomic":{const temps=[...(s.aux.temps||Array(21).fill(0))];const fused=new Set<number>(s.aux.fused||[]);const heat:number[]=[];let seed=(s.round+1)*7919;while(heat.length<3){seed=(seed*1103515245+12345)&0x7fffffff;const sec=(seed%20)+1;if(!heat.includes(sec))heat.push(sec);}heat.forEach(sec=>{if(!fused.has(sec))temps[sec]+=1});for(const d of visit)if(d.v>=1&&d.v<=20&&!fused.has(d.v))temps[d.v]=Math.max(0,temps[d.v]-d.mult);for(let i=1;i<=20;i++)if(temps[i]>=5)fused.add(i);s.aux={temps,fused,heat};s.round++;s.points=s.round;if(fused.size>=3)done(false);break;}
        case "rainbow":{const route=rainbowRoutes[s.round%6];let n=0;route.forEach((t,i)=>{if(visit[i]&&trainingDartMatches(visit[i],t))n++;});let add=n===3?6:n===2?3:n===1?1:0;if(Math.floor(s.round/6)===2)add*=2;s.points+=add;s.aux.completed=s.aux.completed||new Set<number>();if(n===3)s.aux.completed.add(s.round%6);s.round++;if(s.round>=18){const c=s.aux.completed.size;s.points+=[0,2,4,8,16,32,64][c]||0;done(true);}break;}
      }
      persistDraft(s as State,secondsLeft);
      return s as State;
    });
  },[finish,persistDraft,result,rule,secondsLeft]);

  const quickScoreCompatible = rule.kind === "survival_score" || rule.kind === "redemption" || (rule.kind === "round_score" && !rule.params?.target && !rule.params?.chooseSegment && rule.params?.mode !== "checkout50");
  const onQuickVisit = (total: number, dartCount: number) => {
    if (!quickScoreCompatible || finishedRef.current || result || dartCount < 1 || dartCount > 3 || !Number.isInteger(total) || total < 0 || total > dartCount * 60) return;
    setState(prev => {
      const s: State = { ...prev, aux: { ...prev.aux, aggregateVisits: [...(prev.aux?.aggregateVisits || []), { score: total, darts: dartCount }] }, darts: prev.darts + dartCount, aggregatedDarts: (prev.aggregatedDarts || 0) + dartCount };
      if (rule.kind === "round_score") { s.points += total; s.round++; }
      else if (rule.kind === "survival_score") { if (total >= (rule.params?.threshold || 65)) s.points++; s.round++; }
      else if (rule.kind === "redemption") {
        if (total > s.best) { s.best = total; s.aux.bestCount = 1; }
        else if (total === s.best) s.aux.bestCount = (s.aux.bestCount || 0) + 1;
        s.worst = s.worst === null ? total : Math.min(s.worst, total);
        if ((s.aux.bestCount || 0) >= 2 && s.worst !== null) { s.worst = null; s.aux.bestCount = 0; }
        s.points = s.worst ?? total;
        s.round++;
      }
      persistDraft(s, secondsLeft);
      if (rule.rounds && s.round >= rule.rounds) setTimeout(() => finish(true,s),0);
      return s;
    });
  };
  const manualHit=(value:number)=>setState(prev=>{const s={...prev,darts:prev.darts+1,hits:prev.hits+(value>0?1:0),points:prev.points+value};persistDraft(s,secondsLeft);return s});
  const handleExit=React.useCallback(()=>{ if(!result) persistDraft(stateRef.current,secondsLeft); onExit(); },[onExit,persistDraft,result,secondsLeft]);
  const s=state;
  const timeText=rule.durationSec?`${Math.floor(secondsLeft/60)}:${String(secondsLeft%60).padStart(2,"0")}`:null;
  const manual=rule.kind==="manual_hits";
  const technique=rule.kind==="technique";
  const techniqueSteps = technique ? getTrainingTechniqueGuide(rule.id, String(rule.params?.focus || "Reproduis un geste fluide.")) : [];
  const techniqueStage = Math.max(0, Math.min(techniqueSteps.length, Number(s.aux?.techniqueStage || 0)));
  const voiceCoach = useTrainingVoiceCoach();
  const rawCustomStep = technique
    ? `${exercise.title}. Étape ${Math.min(techniqueStage + 1, techniqueSteps.length)} sur ${techniqueSteps.length}. ${techniqueSteps[techniqueStage]?.title || "Pratique libre"}. ${techniqueSteps[techniqueStage]?.cue || "Conserve une routine stable."}`
    : `${exercise.title}. ${rule.subtitle}. ${rule.level1Label || "Suis l'objectif indiqué sur la cible."}`;
  const spokenCustomStep = pronounceDartSegments(rawCustomStep);
  const spokenCustomResult = result ? buildTrainingResultVoiceText({
    title: exercise.title,
    success: !!result.success,
    performanceScore: Number(result.metrics?.performanceScore) || 0,
    completionPct: Number(result.metrics?.completionPct) || 0,
    accuracyPct: result.metrics?.precisionUnavailable ? null : Number(result.metrics?.accuracyPct ?? 0),
    nextCue: exerciseFeedback?.nextObjective,
  }) : "";
  React.useEffect(() => {
    if (!ruleMissing && !result) voiceCoach.announce(`custom:${exercise.id}:${technique ? techniqueStage : 0}`, spokenCustomStep);
  }, [exercise.id, result, ruleMissing, spokenCustomStep, technique, techniqueStage, voiceCoach.announce]);
  React.useEffect(() => {
    if (result) voiceCoach.announce(`custom-result:${exercise.id}`, spokenCustomResult);
  }, [exercise.id, result, spokenCustomResult, voiceCoach.announce]);

  const advanceTechnique = (direction: number) => {
    setState(prev => {
      const next: State = { ...prev, aux: { ...prev.aux, techniqueStage: Math.max(0, Math.min(techniqueSteps.length, Number(prev.aux?.techniqueStage || 0) + direction)) } };
      persistDraft(next, secondsLeft);
      return next;
    });
  };
  if (ruleMissing) return <TrainingPlayLayout title="Centre d'entraînement" tickerId="training_center" onExit={handleExit} participant={config?.activeParticipant}
    eyebrow="EXERCICE INDISPONIBLE" target="—" targetHint="La définition de cet exercice est absente."
    progress={{value:0,max:1,label:"ERREUR"}} kpis={[]}
  ><div style={{padding:20,textAlign:"center",display:"grid",gap:12}}><div style={{fontSize:18,fontWeight:950}}>Impossible de lancer cet exercice</div><div style={{fontSize:13,opacity:.7,lineHeight:1.5}}>Le catalogue contient une référence sans règle de jeu associée. Reviens au Centre et choisis un autre exercice.</div><button type="button" onClick={handleExit} style={{height:46,borderRadius:12,border:"1px solid rgba(255,255,255,.14)",background:"rgba(255,255,255,.06)",color:"inherit",fontWeight:950,cursor:"pointer"}}>RETOUR AU CENTRE</button></div></TrainingPlayLayout>;
  return <>
    <TrainingPlayLayout title="Centre d'entraînement" tickerId="training_center" onExit={handleExit} participant={config?.activeParticipant}
      rules={<><p><b>{exercise.title}</b></p><p>{exercise.subtitle}</p><p>Objectif suivant : {rule.level1Label||"progresser"}.</p></>}
      playerScore={rule.kind === "x01_restricted" ? s.remaining : s.points} playerScoreLabel={rule.kind === "x01_restricted" ? "RESTE" : "SCORE"}
      sessionObjective={rule.level1Label || (rule.durationSec ? `Objectif en ${Math.ceil(rule.durationSec / 60)} minutes` : "Atteindre la cible affichée")}
      roundLabel={rule.rounds ? `${Math.min(s.round+1,rule.rounds)}/${rule.rounds}` : s.round+1} dartsPlayed={s.darts}
      stats={[{label:"EXERCICE",value:exercise.title},{label:"TOURS",value:rule.rounds?`${Math.min(s.round+1,rule.rounds)}/${rule.rounds}`:s.round+1},{label:"FLÉCHETTES",value:s.darts},{label:"POINTS",value:s.points},{label:"TEMPS",value:timeText||"—"}]}
      eyebrow={exercise.title} target={targetText(rule,s)} targetHint={`${timeText?`${timeText} • `:""}${s.darts} fléchettes • ${s.points} pts`}
      progress={{value:rule.rounds?Math.min(rule.rounds,s.round):Math.min(100,s.points),max:rule.rounds||100,label:rule.family.toUpperCase()}}
      kpis={[{label:"DARTS",value:s.darts},{label:"POINTS",value:s.points},{label:"TOURS",value:rule.rounds?`${Math.min(s.round+1,rule.rounds)}/${rule.rounds}`:s.round+1},{label:"TEMPS",value:timeText||"—"}]}
    >
      <div className="mssTrainingVoiceBar" aria-label="Conseils vocaux Awena">
        <span className="mssTrainingVoiceHint" title={spokenCustomStep}>✦ AWENA · {technique ? `ÉTAPE ${techniqueStage+1}` : "CONSEIL"}<span>{technique ? techniqueSteps[techniqueStage]?.title || "Pratique libre" : rule.subtitle}</span></span>
        <button type="button" onClick={() => voiceCoach.say(spokenCustomStep)} aria-label="Écouter le conseil Awena">🔊</button>
        <button type="button" aria-pressed={voiceCoach.automatic} className={voiceCoach.automatic ? "is-active" : ""} onClick={() => voiceCoach.setAuto(!voiceCoach.automatic)}>AUTO {voiceCoach.automatic ? "✓" : "○"}</button>
      </div>
      {voiceCoach.notice && <div className="mssTrainingVoiceNotice" role="status">{voiceCoach.notice}</div>}
      {technique ? <div style={{padding:"16px 12px",display:"grid",gap:12}}>
        <div style={{fontSize:10,fontWeight:950,letterSpacing:1,color:"#27dcff"}}>PARCOURS TECHNIQUE MSS • {techniqueStage < techniqueSteps.length ? `ÉTAPE ${techniqueStage+1}/${techniqueSteps.length}` : "PRATIQUE LIBRE"}</div>
        <div style={{display:"flex",gap:6}}>{techniqueSteps.map((step,index)=><div key={step.title} aria-label={`Étape ${index+1}`} style={{flex:1,height:6,borderRadius:99,background: index <= techniqueStage ? "#27dcff" : "rgba(255,255,255,.12)"}}/>)}</div>
        <div style={{padding:16,borderRadius:16,background:"linear-gradient(135deg,rgba(39,220,255,.095),rgba(140,90,255,.06))",border:"1px solid rgba(39,220,255,.23)",fontSize:13,lineHeight:1.55}}>
          <b style={{display:"block",fontSize:16,marginBottom:8,color:"#c4f7ff"}}>{techniqueSteps[techniqueStage]?.title || "À toi de jouer !"}</b>
          {techniqueSteps[techniqueStage]?.cue || `Pendant le temps restant (${timeText || "5:00"}), applique les repères que tu viens de travailler. Privilégie la régularité du geste plutôt que les points.`}
        </div>
        <div style={{fontSize:11.5,opacity:.72,lineHeight:1.5}}>Travaille à ton rythme : le chrono sert de repère et les étapes restent enregistrées si tu quittes la séance.</div>
        <div style={{display:"flex",gap:8}}>
          {techniqueStage>0 && <button type="button" onClick={()=>advanceTechnique(-1)} style={{flex:1,minHeight:46,borderRadius:12,border:"1px solid rgba(255,255,255,.14)",background:"rgba(255,255,255,.04)",color:"inherit",fontWeight:900,cursor:"pointer"}}>PRÉCÉDENT</button>}
          {techniqueStage<techniqueSteps.length ? <button type="button" onClick={()=>advanceTechnique(1)} style={{flex:2,minHeight:46,borderRadius:12,border:"1px solid rgba(39,220,255,.35)",background:"rgba(39,220,255,.14)",color:"inherit",fontWeight:950,cursor:"pointer"}}>ÉTAPE SUIVANTE →</button> : <button type="button" onClick={()=>finish(true)} style={{flex:2,minHeight:46,borderRadius:12,border:"1px solid rgba(80,255,174,.38)",background:"rgba(80,255,174,.12)",color:"#9fffc2",fontWeight:950,cursor:"pointer"}}>TERMINER LA SÉANCE</button>}
        </div>
      </div> : manual ? <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,padding:12}}>
        {(rule.params?.manualScores||[0,1]).map((v:number,i:number)=><button key={v} onClick={()=>manualHit(v)} style={{minHeight:80,borderRadius:14,border:"1px solid rgba(255,255,255,.12)",background:v?"rgba(80,255,174,.08)":"rgba(255,80,80,.06)",color:"inherit",fontWeight:950,cursor:"pointer"}}>{rule.params?.manualLabels?.[i]|| (v?"TOUCHÉ":"RATÉ")}<div style={{marginTop:5,fontSize:12,opacity:.6}}>+{v}</div></button>)}
      </div> : <TrainingDartPad enableMethods disabled={!!result} onVisit={applyVisit} onQuickVisit={onQuickVisit} allowQuickScore={quickScoreCompatible} storageKey={participantId || "training"} requireFullVisit={false} notice={<div style={{fontSize:11,textAlign:"center",opacity:.72}}>Saisis tes fléchettes normalement. Le moteur applique automatiquement les règles de l'exercice.</div>} />}
    </TrainingPlayLayout>
    <TrainingResultModal summaryCards={result?.metrics?.precisionUnavailable ? [
      { label: "SCORE", value: result?.stats?.score ?? 0 }, { label: "FLÉCHETTES", value: result?.stats?.darts ?? 0 },
      { label: "TOUCHES", value: "—" }, { label: "PRÉCISION", value: "Non mesurée" },
    ] : undefined} open={!!result} success={!!result?.success} title={result?.success?"Objectif atteint":"Objectif à retenter"} stats={result?.stats||makeTrainingStats({darts:0,hits:0,points:0,startedAt:Date.now()})} metrics={result?[{label:"EXERCICE",value:exercise.title},{label:result.outcome?.metricLabel||"SCORE",value:result.outcome?.metricValue??s.points},{label:"PERFORMANCE",value:`${Math.round(result.metrics?.performanceScore||0)}/100`},{label:"NIVEAU",value:`${exerciseFeedback?.afterLevel??0}/5`}]:[]} note={<div className="mssTrainingResultVoice"><button type="button" onClick={() => voiceCoach.say(spokenCustomResult)}>🔊 ÉCOUTER LE BILAN AWENA</button>{exerciseFeedback?<div style={{padding:10,borderRadius:12,background:exerciseFeedback.levelUp?"rgba(80,255,174,.07)":"rgba(39,220,255,.06)",border:exerciseFeedback.levelUp?"1px solid rgba(80,255,174,.22)":"1px solid rgba(39,220,255,.18)"}}><div style={{fontSize:8,fontWeight:950,letterSpacing:1,opacity:.58}}>PROGRESSION PERSONNELLE</div><div style={{marginTop:4,fontSize:12,fontWeight:1000}}>{exerciseFeedback.masteredNow?"MAÎTRISE DÉBLOQUÉE":exerciseFeedback.levelUp?`NIVEAU ${exerciseFeedback.afterLevel}/5 DÉBLOQUÉ`:`NIVEAU ${exerciseFeedback.afterLevel}/5`}</div><div style={{marginTop:5,fontSize:9.2,lineHeight:1.42,opacity:.72}}>{exerciseFeedback.newRecord?`Nouveau record • ${exerciseFeedback.currentPerformance}/100. `:""}{exerciseFeedback.afterLevel>=5?"Exercice maîtrisé.":`Prochain objectif : ${exerciseFeedback.nextObjective}`}</div></div>:null}</div>} onClose={handleExit}/>
  </>;
}
