// SuperBullPlay — scoring bull dédié
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

export default function SuperBullPlay({ config, onExit }:{config:{target:number}; onExit:()=>void}) {
  const engine = useMemo(()=>new TrainingEngine({mode:"SUPER_BULL"}),[]);
  const [score,setScore]=useState(0);
  const stats=computeTrainingStats(engine.state);

  function onThrow(t:any,h:boolean){
    if(!h) return;
    const pts = t?.value==="DBULL" ? 50 : t?.value==="BULL" ? 25 : 0;
    if(pts>0){
      setScore(s=>s+pts);
      engine.throw(t,true,pts);
      if(score+pts>=config.target){ engine.finish(true); onExit(); }
    }
  }

  return (
    <TrainingShell
      header={<TrainingHeader rules={<p>Score : {score}/{config.target}</p>} onBack={onExit} />}
      body={<ScoreInputHub onThrow={(t,h)=>onThrow(t,h)} />}
      footer={<TrainingFooter stats={stats} />}
    />
  );
}
