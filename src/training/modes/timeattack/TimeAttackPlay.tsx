// TimeAttackPlay — règles propres
import React, { useEffect, useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

export default function TimeAttackPlay({ config, onExit }:{config:{seconds:number}; onExit:()=>void}) {
  const engine = useMemo(()=>new TrainingEngine({mode:"TIME_ATTACK", timeLimitMs: config.seconds*1000}),[]);
  const [ended,setEnded]=useState(false);
  useEffect(()=>{
    const t=setTimeout(()=>{engine.finish(true); setEnded(true);}, config.seconds*1000);
    return ()=>clearTimeout(t);
  },[]);
  const stats=computeTrainingStats(engine.state);
  return (
    <TrainingShell
      header={<TrainingHeader rules={<p>Score libre jusqu’à la fin du timer.</p>} onBack={onExit} />}
      body={<ScoreInputHub onThrow={(t,h,s)=>engine.throw(t,h,s)} />}
      footer={<TrainingFooter stats={stats} />}
    />
  );
}
