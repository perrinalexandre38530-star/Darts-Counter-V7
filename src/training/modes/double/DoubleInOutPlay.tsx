// DoubleInOutPlay — règles distinctes doubles
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

export default function DoubleInOutPlay({ config, onExit }:{config:{mode:"DI"|"DO"|"DIDO"}; onExit:()=>void}) {
  const engine = useMemo(()=>new TrainingEngine({mode:"DOUBLE"}),[]);
  const [validated,setValidated]=useState(0);
  const stats=computeTrainingStats(engine.state);
  return (
    <TrainingShell
      header={<TrainingHeader rules={<p>Valide des doubles selon le mode choisi.</p>} onBack={onExit} />}
      body={
        <>
          <div>Validés: {validated}</div>
          <ScoreInputHub onThrow={(t,h,s)=>{
            if(h && t?.multiplier===2){ setValidated(v=>v+1); engine.throw(t,h,s);}
            else engine.throw(t,false,0);
          }} />
        </>
      }
      footer={<TrainingFooter stats={stats} />}
    />
  );
}
