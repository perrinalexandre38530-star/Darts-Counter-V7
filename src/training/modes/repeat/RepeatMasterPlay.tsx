// RepeatMasterPlay — streak + règles hardcore/soft
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

function isTargetMatch(targetId:string, t:any){
  if(!t) return false;
  if(targetId==="BULL") return t.value==="BULL";
  if(targetId==="DBULL") return t.value==="DBULL";
  const m = targetId[0]; // S/T/D
  const n = parseInt(targetId.slice(1),10);
  const mult = m==="S"?1:m==="D"?2:3;
  return t.value===n && t.multiplier===mult;
}

export default function RepeatMasterPlay({ config, onExit }:{config:{target:string; goal:number; hardcore:boolean}; onExit:()=>void}) {
  const engine = useMemo(()=>new TrainingEngine({mode:"REPEAT"}),[]);
  const [streak,setStreak]=useState(0);
  const [best,setBest]=useState(0);
  const [ended,setEnded]=useState(false);
  const [success,setSuccess]=useState(false);

  const stats=computeTrainingStats(engine.state);

  function finish(ok:boolean){
    engine.finish(ok);
    setSuccess(ok);
    setEnded(true);
  }

  function onThrow(t:any,h:boolean,s:number){
    const ok = h && isTargetMatch(config.target, t);
    if(ok){
      engine.throw(t,true,s);
      setStreak(prev=>{
        const next=prev+1;
        setBest(b=>Math.max(b,next));
        if(next>=config.goal) finish(true);
        return next;
      });
    } else {
      engine.throw(t,false,0);
      if(config.hardcore){
        finish(false);
      } else {
        setStreak(0);
      }
    }
  }

  return (
    <>
      <TrainingShell
        header={<TrainingHeader rules={<p>Cible: {config.target} — Streak: {streak}/{config.goal} (best {best})</p>} onBack={onExit} />}
        body={<ScoreInputHub onThrow={onThrow} />}
        footer={<TrainingFooter stats={stats} />}
      />

      <TrainingResultModal
        open={ended}
        stats={stats}
        success={success}
        onClose={onExit}
        title={success ? "Streak validé" : "Session terminée"}
      />
    </>
  );
}
