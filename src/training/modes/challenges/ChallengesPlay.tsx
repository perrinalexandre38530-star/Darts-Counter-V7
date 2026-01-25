// ChallengesPlay — règles par challenge
import React, { useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

function isDouble(t:any){ return t?.multiplier===2 && typeof t?.value==="number"; }
function isMatch(id:string, t:any){
  if(!t) return false;
  if(id==="BULL") return t.value==="BULL";
  if(id==="DBULL") return t.value==="DBULL";
  const m=id[0]; const n=parseInt(id.slice(1),10);
  const mult = m==="S"?1:m==="D"?2:3;
  return t.value===n && t.multiplier===mult;
}

export default function ChallengesPlay({ config, onExit }:{config:any; onExit:()=>void}) {
  const engine = useMemo(()=>new TrainingEngine({mode:"CHALLENGES", maxDarts: config.darts}),[]);
  const [ended,setEnded]=useState(false);
  const [success,setSuccess]=useState(false);
  const [progress,setProgress]=useState(0);
  const [remaining,setRemaining]=useState(config.darts);

  const stats=computeTrainingStats(engine.state);

  function finish(ok:boolean){
    engine.finish(ok);
    setSuccess(ok);
    setEnded(true);
  }

  function onThrow(t:any,h:boolean,s:number){
    engine.throw(t,h,s);
    setRemaining(r=>r-1);

    if(config.kind==="doubles"){
      if(h && isDouble(t)){
        setProgress(p=>{
          const next=p+1;
          if(next>=config.goal) finish(true);
          return next;
        });
      }
    }

    if(config.kind==="sequence"){
      const need = config.seq[progress];
      if(h && isMatch(need, t)){
        const next=progress+1;
        setProgress(next);
        if(next>=config.seq.length) finish(true);
      }
    }

    if(config.kind==="checkout40"){
      // Simple: si score de la flèche == 40 et double => win (approximation)
      if(h && t?.multiplier===2 && t?.value===20){
        finish(true);
      }
    }

    if(remaining-1<=0 && !ended){
      finish(false);
    }
  }

  const title =
    config.kind==="doubles" ? `Doubles: ${progress}/${config.goal}` :
    config.kind==="sequence" ? `Séquence: ${progress}/${config.seq.length}` :
    "Checkout 40";

  return (
    <>
      <TrainingShell
        header={<TrainingHeader rules={<p>{title} — Darts restants: {remaining}</p>} onBack={onExit} />}
        body={<ScoreInputHub onThrow={onThrow} />}
        footer={<TrainingFooter stats={stats} />}
      />
      <TrainingResultModal
        open={ended}
        stats={stats}
        success={success}
        onClose={onExit}
        title={success ? "Défi réussi" : "Défi raté"}
      />
    </>
  );
}
