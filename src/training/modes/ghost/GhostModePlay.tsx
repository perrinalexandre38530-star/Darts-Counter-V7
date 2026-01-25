// GhostModePlay — comparaison moyenne
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

export default function GhostModePlay({ config, onExit }:{config:{avg:number}; onExit:()=>void}) {
  const engine = useMemo(()=>new TrainingEngine({mode:"GHOST", maxDarts:30}),[]);
  const [darts,setDarts]=useState(0);
  const stats=computeTrainingStats(engine.state);

  function onThrow(t:any,h:boolean,s:number){
    engine.throw(t,h,s);
    setDarts(d=>d+1);
    if(darts+1>=30){
      const myAvg = engine.state.score / 10;
      engine.finish(myAvg>=config.avg);
      onExit();
    }
  }

  return (
    <TrainingShell
      header={<TrainingHeader rules={<p>Objectif : {config.avg} de moyenne</p>} onBack={onExit} />}
      body={<ScoreInputHub onThrow={onThrow} />}
      footer={<TrainingFooter stats={stats} />}
    />
  );
}
