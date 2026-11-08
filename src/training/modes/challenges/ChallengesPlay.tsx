import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import {
  countNonMisses,
  isDoubleDart,
  makeTrainingStats,
  trainingDartMatches,
  visitScore,
  type TrainingDart,
} from "../../lib/trainingDarts";
import { appendTrainingVisit, recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";
import { analyzeChallengeExercise, evaluateChallengeEntries, jdcObjectiveForDart, JDC_MAX_SCORE, JDC_TOTAL_DARTS, JDC_TOTAL_VISITS, type ChallengeEntryLike, type ChallengeHit } from "../../../lib/challengeExercises";

const DOUBLES_8_TARGETS = [20, 18, 16, 12, 10, 8, 4, 2] as const;
const normalizeDoublesTargets = (value: any): number[] => {
  const raw = Array.isArray(value) && value.length ? value : DOUBLES_8_TARGETS;
  const out: number[] = [];
  for (const item of raw) { const n = Math.max(1, Math.min(20, Math.round(Number(item) || 20))); if (!out.includes(n)) out.push(n); }
  return out.length ? out : [...DOUBLES_8_TARGETS];
};

function DoublesObjectivePad({ target, disabled, onVisit }: { target: number; disabled?: boolean; onVisit: (visit: TrainingDart[]) => void }) {
  const [pending, setPending] = React.useState<TrainingDart[]>([]);

  React.useEffect(() => { setPending([]); }, [target]);

  const push = React.useCallback((hit: boolean) => {
    if (disabled) return;
    const dart: TrainingDart = hit
      ? { v: target, mult: 2, score: target * 2, label: `D${target}`, miss: false, bull: false, dbull: false }
      : { v: 0, mult: 1, score: 0, label: "MISS", miss: true, bull: false, dbull: false };
    setPending((prev) => {
      const next = [...prev, dart].slice(0, 3);
      if (next.length === 3) {
        queueMicrotask(() => onVisit(next));
        return [];
      }
      return next;
    });
  }, [disabled, onVisit, target]);

  return (
    <div style={{ display: "grid", gap: 10, padding: "4px 0 10px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
        {[0, 1, 2].map((index) => (
          <div key={index} style={{ minHeight: 42, display: "grid", placeItems: "center", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: pending[index] ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.035)", color: pending[index]?.miss ? "#9ba3b3" : "#fff", fontSize: 12, fontWeight: 950 }}>
            {pending[index]?.label || `#${index + 1}`}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button type="button" disabled={disabled} onClick={() => push(true)} style={{ minHeight: 82, borderRadius: 18, border: "1px solid rgba(255,65,84,.72)", background: "linear-gradient(180deg,rgba(255,58,78,.96),rgba(158,18,36,.98))", color: "#fff", fontSize: 24, fontWeight: 1100, boxShadow: "0 10px 28px rgba(255,40,64,.18)" }}>
          D{target}<span style={{ display: "block", marginTop: 4, fontSize: 9, letterSpacing: 1.1, opacity: .78 }}>TOUCHÉ</span>
        </button>
        <button type="button" disabled={disabled} onClick={() => push(false)} style={{ minHeight: 82, borderRadius: 18, border: "1px solid rgba(148,158,177,.38)", background: "linear-gradient(180deg,rgba(37,44,57,.98),rgba(16,20,28,.98))", color: "#e7ebf2", fontSize: 22, fontWeight: 1100 }}>
          MISS<span style={{ display: "block", marginTop: 4, fontSize: 9, letterSpacing: 1.1, opacity: .65 }}>RATÉ</span>
        </button>
      </div>
      {pending.length > 0 ? <button type="button" disabled={disabled} onClick={() => setPending((prev) => prev.slice(0, -1))} style={{ minHeight: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.045)", color: "#d9e1ec", fontSize: 10, fontWeight: 950, letterSpacing: .7 }}>↶ ANNULER LA DERNIÈRE FLÉCHETTE</button> : null}
      <div style={{ textAlign: "center", fontSize: 10.5, opacity: .7 }}>3 essais par volée · l'objectif change automatiquement après les 3 volées prévues.</div>
    </div>
  );
}

/** JDC pad : sectors S/D/T on a single target, then one D/Bull attempt per dart. */
function JdcObjectivePad({visitsCompleted,disabled,onVisit}:{visitsCompleted:number;disabled?:boolean;onVisit:(visit:TrainingDart[])=>void}){
 const [pending,setPending]=React.useState<TrainingDart[]>([]);
 const dartIndex=Math.min(56,visitsCompleted*3+pending.length);
 const objective=jdcObjectiveForDart(dartIndex);
 const options:(ChallengeHit[]) = objective.hit==='sector'?['S','D','T','MISS']:objective.hit==='bull'?['50','MISS']:['D','MISS'];
 const push=(hit:ChallengeHit)=>{
  if(disabled)return;
  const miss=hit==='MISS';
  const bull=hit==='50';
  const mult=(hit==='T'?3:hit==='D'||bull?2:1) as 1|2|3;
  const v=miss?0:bull?25:objective.sector;
  const dart:TrainingDart={v,mult,score:miss?0:bull?50:v*mult,label:miss?'MISS':bull?'BULL 50':`${hit}${v}`,miss,bull:false,dbull:bull};
  const next=[...pending,dart].slice(0,3);
  if(next.length===3){setPending([]);queueMicrotask(()=>onVisit(next));}
  else setPending(next);
 };
 return <div style={{display:'grid',gap:10,padding:'5px 0 10px'}}>
  <div style={{textAlign:'center',padding:10,border:'1px solid #23556d',borderRadius:12,background:'#07141f'}}><small style={{display:'block',color:'#27dcff',fontSize:11,fontWeight:950}}>PHASE {objective.phase} · FLÉCHETTE {dartIndex+1}/57</small><strong style={{display:'block',fontSize:23,color:'#fff'}}>{objective.hit==='sector'?`SECTEUR ${objective.sector}`:objective.label}</strong><small>{objective.hit==='sector'?'SIMPLE · DOUBLE · TRIPLE · MISS | SHANGHAI +100':objective.hit==='bull'?'BULL ROUGE UNIQUEMENT · +100 PTS':'1 ESSAI SUR CE DOUBLE · +50 PTS'}</small></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7}}>{[0,1,2].map(i=><div key={i} style={{padding:9,border:'1px solid #33475a',borderRadius:9,textAlign:'center',fontWeight:900,fontSize:12,minHeight:36,color:pending[i]?'#fff':'#8293a8'}}>{pending[i]?.label||`#${i+1}`}</div>)}</div>
  <div style={{display:'grid',gridTemplateColumns:`repeat(${options.length},minmax(0,1fr))`,gap:7}}>{options.map(hit=><button key={hit} type="button" disabled={disabled} onClick={()=>push(hit)} style={{minWidth:0,minHeight:74,borderRadius:13,border:'1px solid #566271',background:hit==='MISS'?'linear-gradient(#26313c,#141a22)':hit==='T'?'linear-gradient(#e9ab29,#83521a)':hit==='D'||hit==='50'?'linear-gradient(#ed4255,#871623)':'linear-gradient(#246ca0,#142e50)',color:'#fff',fontWeight:1000,fontSize:'clamp(12px,3.5vw,20px)'}}>{hit==='MISS'?'MISS':hit==='50'?'BULL 50':`${hit}${objective.sector}`}</button>)}</div>
  {pending.length>0&&<button type="button" onClick={()=>setPending(old=>old.slice(0,-1))} style={{padding:11,border:'1px solid #324353',borderRadius:10,color:'#d6e5f5',background:'#101722'}}>↶ ANNULER DERNIÈRE FLÉCHETTE</button>}
  <small style={{opacity:.7,textAlign:'center'}}>Objectif automatique · volée de 3 fléchettes · score cumulé</small>
 </div>;
}

export default function ChallengesPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const challengeId = String(config?.challengeId || config?.id || "3_DOUBLES_9");
  const doublesTargets = normalizeDoublesTargets(config?.doublesTargets);
  const jdcEntriesRef=React.useRef<ChallengeEntryLike[]>([]);
  const jdcConfig={exerciseType:"jdc" as const,target:"10",rule:"all",visits:JDC_TOTAL_VISITS};
  const doubles8VisitsMax = doublesTargets.length * 3 + 1;
  const doubles8MaxDarts = doublesTargets.length * 9 + 3;
  const doubles8MaxScore = doublesTargets.length * 300 + 150;
  const maxDarts = Math.max(1, Math.floor(Number(challengeId === "DOUBLES_8_BONUS" ? doubles8MaxDarts : challengeId === "JDC_CHALLENGE" ? JDC_TOTAL_DARTS : config?.darts || (challengeId === "CHECKOUT_40_3" ? 3 : 9))));
  const sequence = Array.isArray(config?.seq) ? config.seq.map(String) : ["BULL", "T20", "D20"];
  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const visitHistoryRef = React.useRef<any[]>([]);
  const dataRef = React.useRef({
    darts: 0,
    hits: 0,
    points: 0,
    doubles: 0,
    sequenceIndex: 0,
    doubles8Visits: 0,
    regularHits: 0,
    regularPoints: 0,
    bonusHits: 0,
    perDoubleHits: {} as Record<string, number>,
    perDoubleAttempts: {} as Record<string, number>,
    perDoublePoints: {} as Record<string, number>,
  });
  const [, rerender] = React.useReducer((value) => value + 1, 0);
  const [result, setResult] = React.useState<any>(null);
  const [bonusDouble, setBonusDouble] = React.useState<number | null>(null);

  const title =
    challengeId === "JDC_CHALLENGE" ? "LE JDC CHALLENGE" : challengeId === "BULL_T20_D20"
      ? "BULL → T20 → D20"
      : challengeId === "DOUBLES_8_BONUS"
      ? (doublesTargets.length === DOUBLES_8_TARGETS.length && doublesTargets.every((n, i) => n === DOUBLES_8_TARGETS[i]) ? "8 DOUBLES · 9 FLÉCHETTES" : `${doublesTargets.length} DOUBLE${doublesTargets.length > 1 ? 'S' : ''} PERSONNALISÉ${doublesTargets.length > 1 ? 'S' : ''}`)
      : challengeId === "CHECKOUT_40_3"
      ? "CHECKOUT 40"
      : "3 DOUBLES / 9";

  const finish = React.useCallback(
    (success: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const endedAt = Date.now();
      const data = dataRef.current;
      const accuracyPct = data.darts > 0 ? (data.hits / data.darts) * 100 : 0;
      const completion =
        challengeId === "3_DOUBLES_9"
          ? Math.min(1, data.doubles / 3)
          : challengeId === "BULL_T20_D20"
          ? Math.min(1, data.sequenceIndex / Math.max(1, sequence.length))
          : challengeId === "DOUBLES_8_BONUS"
          ? Math.min(1, data.doubles8Visits / doubles8VisitsMax)
          : challengeId === "JDC_CHALLENGE" ? Math.min(1,data.darts/JDC_TOTAL_DARTS)
          : success
          ? 1
          : 0;
      const stats = makeTrainingStats({
        darts: data.darts,
        hits: data.hits,
        points: data.points,
        startedAt: startedAtRef.current,
        endedAt,
      });
      const doublesBreakdown = doublesTargets.map((target) => {
        const key = String(target);
        const attempts = Number(data.perDoubleAttempts[key] || 0);
        const hits = Number(data.perDoubleHits[key] || 0);
        return { target, attempts, hits, points: Number(data.perDoublePoints[key] || 0), accuracyPct: attempts > 0 ? (hits / attempts) * 100 : 0 };
      });
      const playedDoubles = doublesBreakdown.filter((row) => row.attempts > 0);
      const bestDouble = playedDoubles.slice().sort((a, b) => b.accuracyPct - a.accuracyPct || b.hits - a.hits || b.points - a.points)[0] || null;
      const weakestDouble = playedDoubles.slice().sort((a, b) => a.accuracyPct - b.accuracyPct || a.hits - b.hits || a.points - b.points)[0] || null;
      const jdcAnalytics=challengeId==="JDC_CHALLENGE"?analyzeChallengeExercise(jdcEntriesRef.current,jdcConfig):null;
      const metrics = {
        jdcPhaseScores:jdcAnalytics?.jdcPhaseScores,
        jdcShanghaiCount:jdcAnalytics?.jdcShanghaiCount,
        jdcDoubleHits:jdcAnalytics?.jdcDoubleHits,
        jdcBullHits:jdcAnalytics?.jdcBullHits,
        challengeId,
        title,
        maxDarts,
        doubles: data.doubles,
        sequenceCompleted: data.sequenceIndex,
        sequenceLength: sequence.length,
        accuracyPct,
        completionPct: completion * 100,
        dartsUsed: data.darts,
        score: challengeId === "DOUBLES_8_BONUS" || challengeId === "JDC_CHALLENGE" ? data.points : success ? 100 : completion * 100,
        bonusDouble,
        bonusHits: data.bonusHits,
        regularHits: data.regularHits,
        regularScore: data.regularPoints,
        bonusScore: data.bonusHits * 50,
        perDoubleHits: { ...data.perDoubleHits },
        perDoubleAttempts: { ...data.perDoubleAttempts },
        perDoublePoints: { ...data.perDoublePoints },
        doublesBreakdown,
        bestDouble,
        weakestDouble,
        doublesTargets: [...doublesTargets],
      };

      recordSoloTrainingResult({
        modeId: "training_challenges",
        config,
        participantIds: config?.selectedPlayerIds,
        startedAt: startedAtRef.current,
        endedAt,
        darts: data.darts,
        hits: data.hits,
        points: data.points,
        success,
        visitHistory: visitHistoryRef.current,
        metrics: { ...metrics, accuracyPercent: accuracyPct },
      });
      setResult({ success, stats, metrics });
    },
    [bonusDouble, challengeId, config, doubles8VisitsMax, doublesTargets, maxDarts, sequence.length, title]
  );

  const onVisit = React.useCallback(
    (visit: TrainingDart[]) => {
      if (endedRef.current || !visit.length) return;
      const data = dataRef.current;
      const enteringBonus = challengeId === "DOUBLES_8_BONUS" && data.doubles8Visits >= doublesTargets.length * 3;
      if (enteringBonus && !bonusDouble) return;
      const remaining = Math.max(0, maxDarts - data.darts);
      const darts = visit.slice(0, remaining);
      if (!darts.length) return;
      appendTrainingVisit(visitHistoryRef.current, darts, { roundIndex: visitHistoryRef.current.length });

      if (challengeId === "CHECKOUT_40_3") {
        data.darts += darts.length;
        data.hits += countNonMisses(darts);
        const score = visitScore(darts);
        data.points += score;
        const last = darts[darts.length - 1];
        const success = score === 40 && isDoubleDart(last);
        rerender();
        finish(success);
        return;
      }

      if(challengeId === "JDC_CHALLENGE"){
        const offset=jdcEntriesRef.current.length;
        const entries=darts.map((dart,j)=>{
          const objective=jdcObjectiveForDart(offset+j);
          return {hit:(dart.miss?'MISS':dart.dbull?'50':dart.mult===3?'T':dart.mult===2?'D':'S') as ChallengeHit,segment:dart.miss||dart.dbull?undefined:dart.v};
        });
        jdcEntriesRef.current.push(...entries);
        const evaluation=evaluateChallengeEntries(jdcEntriesRef.current,jdcConfig);
        data.darts=jdcEntriesRef.current.length;
        data.hits=evaluation.entrySuccessful.filter(Boolean).length;
        data.points=evaluation.score;
        rerender();
        if(data.darts>=JDC_TOTAL_DARTS)finish(true);
        return;
      }

      if (challengeId === "DOUBLES_8_BONUS") {
        const visitIndex = Math.max(0, visitHistoryRef.current.length - 1);
        const bonusVisit = visitIndex >= doublesTargets.length * 3;
        const target = bonusVisit ? Number(bonusDouble) : doublesTargets[Math.min(doublesTargets.length - 1, Math.floor(visitIndex / 3))];
        const targetHits = darts.filter((dart) => dart.v === target && dart.mult === 2).length;
        data.darts += darts.length;
        data.hits += targetHits;
        data.doubles8Visits += 1;
        if (bonusVisit) {
          data.bonusHits += targetHits;
          data.points += targetHits * 50;
        } else {
          const key = String(target);
          const visitPoints = targetHits >= 3 ? 100 : targetHits === 2 ? 30 : targetHits === 1 ? 10 : 0;
          data.regularHits += targetHits;
          data.regularPoints += visitPoints;
          data.perDoubleHits[key] = (data.perDoubleHits[key] || 0) + targetHits;
          data.perDoubleAttempts[key] = (data.perDoubleAttempts[key] || 0) + darts.length;
          data.perDoublePoints[key] = (data.perDoublePoints[key] || 0) + visitPoints;
          data.points += visitPoints;
        }
        rerender();
        if (data.doubles8Visits >= doubles8VisitsMax || data.darts >= maxDarts) finish(true);
        return;
      }

      for (const dart of darts) {
        if (endedRef.current) break;
        data.darts += 1;
        data.points += dart.score;

        if (challengeId === "3_DOUBLES_9") {
          if (isDoubleDart(dart)) {
            data.hits += 1;
            data.doubles += 1;
            if (data.doubles >= 3) {
              rerender();
              finish(true);
              return;
            }
          }
        } else {
          const expected = sequence[data.sequenceIndex];
          if (expected && trainingDartMatches(dart, expected)) {
            data.hits += 1;
            data.sequenceIndex += 1;
            if (data.sequenceIndex >= sequence.length) {
              rerender();
              finish(true);
              return;
            }
          }
        }

        if (data.darts >= maxDarts) {
          rerender();
          finish(false);
          return;
        }
      }

      rerender();
    },
    [bonusDouble, challengeId, doubles8VisitsMax, doublesTargets, finish, maxDarts, sequence]
  );

  const data = dataRef.current;
  const doubles8VisitIndex = Math.max(0, Math.min(doubles8VisitsMax - 1, data.doubles8Visits));
  const doubles8BonusPhase = challengeId === "DOUBLES_8_BONUS" && doubles8VisitIndex >= doublesTargets.length * 3;
  const bonusChoiceRequired = doubles8BonusPhase && !bonusDouble && !result;
  const doubles8Target = doubles8BonusPhase ? (bonusDouble || doublesTargets[0]) : doublesTargets[Math.min(doublesTargets.length - 1, Math.floor(doubles8VisitIndex / 3))];
  const currentTarget =
    challengeId === "JDC_CHALLENGE" ? `PHASE ${jdcObjectiveForDart(data.darts).phase} · ${jdcObjectiveForDart(data.darts).label}` : challengeId === "3_DOUBLES_9"
      ? "DOUBLE"
      : challengeId === "DOUBLES_8_BONUS"
      ? (bonusChoiceRequired ? "BONUS · À CHOISIR" : `${doubles8BonusPhase ? "BONUS · " : ""}D${doubles8Target}`)
      : challengeId === "CHECKOUT_40_3"
      ? "40"
      : sequence[Math.min(data.sequenceIndex, sequence.length - 1)] || "—";
  const progressValue =
    challengeId === "JDC_CHALLENGE" ? Math.floor(data.darts/3) : challengeId === "3_DOUBLES_9"
      ? data.doubles
      : challengeId === "BULL_T20_D20"
      ? data.sequenceIndex
      : challengeId === "DOUBLES_8_BONUS"
      ? data.doubles8Visits
      : result?.success
      ? 1
      : 0;
  const progressMax =
    challengeId === "JDC_CHALLENGE" ? JDC_TOTAL_VISITS : challengeId === "3_DOUBLES_9" ? 3 : challengeId === "BULL_T20_D20" ? sequence.length : challengeId === "DOUBLES_8_BONUS" ? doubles8VisitsMax : 1;

  return (
    <>
      <TrainingPlayLayout
        title="Challenges"
        tickerId="training_challenges"
        onExit={onExit}
        participant={config?.activeParticipant}
        participantIndex={Number(config?.activeParticipantIndex || 0) + 1}
        participantTotal={Number(config?.activeParticipantTotal || 1)}
        rules={
          <>
            <p><b>{title}</b></p>
            <p>
              {challengeId === "JDC_CHALLENGE" ? "Phase 1 : secteurs 10 à 15, S/D/T à valeur réelle et Shanghai +100 ; phase 2 : une fléchette par D1 à D20 (+50), puis Bull rouge (+100) ; phase 3 : secteurs 15 à 20 avec Shanghai +100." : challengeId === "3_DOUBLES_9"
                ? "Touche trois doubles quelconques en neuf fléchettes maximum."
                : challengeId === "BULL_T20_D20"
                ? "Valide BULL, puis T20, puis D20 dans cet ordre en douze fléchettes maximum."
                : challengeId === "DOUBLES_8_BONUS"
                ? `Joue ${doublesTargets.map((n) => `D${n}`).join(', ')} : trois volées par double. 1 touche = 10 pts, 2 = 30 pts, 3 = 100 pts. Après la phase principale, choisis ton double bonus parmi les cibles jouées : +50 pts par touche.`
                : "Fais exactement 40 en trois fléchettes maximum et termine sur un double."}
            </p>
          </>
        }
        eyebrow={title}
        target={currentTarget}
        targetHint={challengeId === "JDC_CHALLENGE" ? `Volée ${Math.min(19,Math.floor(data.darts/3)+1)} / 19 · ${data.darts} / 57 fléchettes` : challengeId === "DOUBLES_8_BONUS" ? `Volée ${Math.min(doubles8VisitsMax, data.doubles8Visits + 1)} / ${doubles8VisitsMax} · ${data.darts} / ${maxDarts} fléchettes` : `${data.darts} / ${maxDarts} fléchettes utilisées`}
        progress={{ value: progressValue, max: progressMax, label: "OBJECTIF" }}
        kpis={[
          { label: "DARTS", value: `${data.darts}/${maxDarts}` },
          { label: "VALIDÉS", value: data.hits },
          { label: "POINTS", value: data.points },
          { label: challengeId === "DOUBLES_8_BONUS" ? "VOLÉES" : "RESTE", value: challengeId === "DOUBLES_8_BONUS" ? `${data.doubles8Visits}/${doubles8VisitsMax}` : Math.max(0, maxDarts - data.darts) },
        ]}
      >
        {challengeId === "JDC_CHALLENGE" ? <JdcObjectivePad visitsCompleted={Math.floor(data.darts/3)} disabled={!!result} onVisit={onVisit}/> : challengeId === "DOUBLES_8_BONUS" ? (
          bonusChoiceRequired ? (
            <div style={{ display: "grid", gap: 10, padding: "7px 0 12px" }}>
              <div style={{ padding: "12px 13px", borderRadius: 14, border: "1px solid rgba(39,220,255,.34)", background: "rgba(39,220,255,.06)", textAlign: "center" }}>
                <div style={{ color: "#27dcff", fontSize: 10, fontWeight: 950, letterSpacing: 1 }}>VOLÉE BONUS</div>
                <div style={{ marginTop: 5, fontSize: 15, fontWeight: 950 }}>CHOISIS TON DOUBLE</div>
                <div style={{ marginTop: 4, fontSize: 10.5, opacity: .72 }}>Uniquement parmi les doubles de ce parcours · +50 pts par touche</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
                {doublesTargets.map((target) => <button key={target} type="button" onClick={() => setBonusDouble(target)} style={{ minHeight: 56, borderRadius: 14, border: "1px solid rgba(255,69,83,.68)", background: "linear-gradient(180deg,rgba(255,62,81,.94),rgba(143,16,31,.98))", color: "#fff", fontSize: 19, fontWeight: 1000 }}>D{target}</button>)}
              </div>
            </div>
          ) : <DoublesObjectivePad target={doubles8Target} disabled={!!result} onVisit={onVisit} />
        ) : (
          <TrainingDartPad
            disabled={!!result}
            onVisit={onVisit}
            notice={
              <div style={{ fontSize: 10.5, textAlign: "center", opacity: 0.68 }}>
                {challengeId === "CHECKOUT_40_3"
                  ? "Saisis ta tentative puis valide la volée : le défi s'arrête immédiatement."
                  : "Le défi s'arrête dès que l'objectif est atteint ou la limite de fléchettes consommée."}
              </div>
            }
          />
        )}
      </TrainingPlayLayout>

      <TrainingResultModal
        open={!!result}
        success={!!result?.success}
        title={challengeId === "JDC_CHALLENGE" || challengeId === "DOUBLES_8_BONUS" ? "Challenge terminé" : result?.success ? "Défi réussi" : "Défi manqué"}
        stats={
          result?.stats ||
          makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })
        }
        summaryCards={result ? (challengeId === "JDC_CHALLENGE" ? [
          {label:"SCORE",value:Math.round(result.metrics.score)},
          {label:"PHASE 1",value:result.metrics.jdcPhaseScores?.[0]||0},
          {label:"PHASE 2",value:result.metrics.jdcPhaseScores?.[1]||0},
          {label:"PHASE 3",value:result.metrics.jdcPhaseScores?.[2]||0},
        ] : challengeId === "DOUBLES_8_BONUS" ? [
          { label: "SCORE", value: Math.round(result.metrics.score) },
          { label: "PHASE", value: result.metrics.regularScore },
          { label: "BONUS", value: result.metrics.bonusScore },
          { label: "RÉUSSITE", value: `${Math.round((result.metrics.regularHits / Math.max(1, doublesTargets.length * 9)) * 100)}%` },
        ] : challengeId === "3_DOUBLES_9" ? [
          { label: "DOUBLES", value: `${result.metrics.doubles}/3` },
          { label: "DARTS", value: result.metrics.dartsUsed },
          { label: "RESTANTES", value: Math.max(0, result.metrics.maxDarts - result.metrics.dartsUsed) },
          { label: "RÉUSSITE", value: `${Math.round(result.metrics.accuracyPct)}%` },
        ] : challengeId === "BULL_T20_D20" ? [
          { label: "ÉTAPES", value: `${result.metrics.sequenceCompleted}/${result.metrics.sequenceLength}` },
          { label: "DARTS", value: result.metrics.dartsUsed },
          { label: "HITS", value: result.stats.hits },
          { label: "RÉUSSITE", value: `${Math.round(result.metrics.accuracyPct)}%` },
        ] : [
          { label: "SORTIE", value: result.success ? "RÉUSSIE" : "MANQUÉE" },
          { label: "SCORE VOLÉE", value: Math.round(result.stats.score) },
          { label: "DARTS", value: result.metrics.dartsUsed },
          { label: "HITS", value: result.stats.hits },
        ]) : undefined}
        metrics={result ? (challengeId === "JDC_CHALLENGE" ? [
          {label:"SCORE FINAL",value:`${result.metrics.score} / ${JDC_MAX_SCORE} pts`},
          {label:"PHASE 1 · SECTEURS 10–15",value:`${result.metrics.jdcPhaseScores?.[0]||0} pts`},
          {label:"PHASE 2 · D1–D20 + BULL",value:`${result.metrics.jdcPhaseScores?.[1]||0} pts · ${result.metrics.jdcDoubleHits||0}/20 doubles · Bull ${result.metrics.jdcBullHits||0}/1`},
          {label:"PHASE 3 · SECTEURS 15–20",value:`${result.metrics.jdcPhaseScores?.[2]||0} pts`},
          {label:"SHANGHAI",value:`${result.metrics.jdcShanghaiCount||0} × 100 pts`},
          {label:"FLÉCHETTES",value:`${result.metrics.dartsUsed}/57`},
        ] : challengeId === "DOUBLES_8_BONUS" ? [
          { label: "DÉFI", value: result.metrics.title },
          { label: "PARCOURS", value: doublesTargets.map((target) => `D${target}`).join(" · ") },
          { label: "SCORE CHALLENGE", value: `${Math.round(result.metrics.score)} / ${doubles8MaxScore}` },
          { label: "PHASE PRINCIPALE", value: `${result.metrics.regularScore} pts · ${result.metrics.regularHits}/${doublesTargets.length * 9} touches` },
          { label: `BONUS D${result.metrics.bonusDouble}`, value: `${result.metrics.bonusHits} touche${result.metrics.bonusHits > 1 ? "s" : ""} · ${result.metrics.bonusScore} pts` },
          ...(result.metrics.bestDouble ? [{ label: "DOUBLE FORT", value: `D${result.metrics.bestDouble.target} · ${Math.round(result.metrics.bestDouble.accuracyPct)}% · ${result.metrics.bestDouble.hits}/${result.metrics.bestDouble.attempts}` }] : []),
          ...(result.metrics.weakestDouble ? [{ label: "DOUBLE À TRAVAILLER", value: `D${result.metrics.weakestDouble.target} · ${Math.round(result.metrics.weakestDouble.accuracyPct)}% · ${result.metrics.weakestDouble.hits}/${result.metrics.weakestDouble.attempts}` }] : []),
        ] : challengeId === "3_DOUBLES_9" ? [
          { label: "DÉFI", value: result.metrics.title },
          { label: "DOUBLES VALIDÉS", value: `${result.metrics.doubles}/3` },
          { label: "DARTS UTILISÉES", value: `${result.metrics.dartsUsed}/${result.metrics.maxDarts}` },
          { label: "PRÉCISION DOUBLES", value: `${Math.round(result.metrics.accuracyPct)}%` },
        ] : challengeId === "BULL_T20_D20" ? [
          { label: "DÉFI", value: result.metrics.title },
          { label: "SÉQUENCE VALIDÉE", value: `${result.metrics.sequenceCompleted}/${result.metrics.sequenceLength}` },
          { label: "DARTS UTILISÉES", value: `${result.metrics.dartsUsed}/${result.metrics.maxDarts}` },
          { label: "PRÉCISION CIBLES", value: `${Math.round(result.metrics.accuracyPct)}%` },
        ] : [
          { label: "DÉFI", value: result.metrics.title },
          { label: "SORTIE", value: result.success ? "RÉUSSIE" : "MANQUÉE" },
          { label: "DARTS UTILISÉES", value: `${result.metrics.dartsUsed}/${result.metrics.maxDarts}` },
          { label: "SCORE DE LA VOLÉE", value: Math.round(result.stats.score) },
        ]) : []}
        onClose={onExit}
      />
    </>
  );
}
