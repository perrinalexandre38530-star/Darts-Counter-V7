// PrecisionGauntletPlay — règles parcours
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

export default function PrecisionGauntletPlay({ config, onExit }:{config:{targets:string[]; lives:number}; onExit:()=>void}) {
  const engine = useMemo(()=>new TrainingEngine({mode:"PRECISION"}),[]);
  const [idx,setIdx]=useState(0);
  const [lives,setLives]=useState(config.lives);
  const current=config.targets[idx];
  const stats=computeTrainingStats(engine.state);

  function onThrow(t:any,h:boolean,s:number){
    const hit = h && (
      (current==="BULL" && t?.value==="BULL") ||
      (current==="DBULL" && t?.value==="DBULL") ||
      (String(t?.value)===current.replace(/[^0-9]/g,""))
    );
    if(hit){
      engine.throw(t,true,s);
      if(idx+1>=config.targets.length){ engine.finish(true); onExit(); }
      else setIdx(i=>i+1);
    } else {
      engine.throw(t,false,0);
      if(lives>0){ setLives(l=>l-1); }
      else { engine.finish(false); onExit(); }
    }
  }

  return (
    <TrainingShell
      header={<TrainingHeader rules={<p>Cible : {current}</p>} onBack={onExit} />}
      body={<ScoreInputHub onThrow={onThrow} />}
      footer={<TrainingFooter stats={stats} />}
    />
  );
}
