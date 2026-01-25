// EvolutionPlay — niveaux adaptatifs
import React, { useEffect, useMemo, useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import ScoreInputHub from "../../../components/ScoreInputHub";

const LEVELS = [
  { label:"S20", need:"S20" },
  { label:"T20", need:"T20" },
  { label:"D20", need:"D20" },
  { label:"T19", need:"T19" },
  { label:"D18", need:"D18" },
  { label:"BULL", need:"BULL" },
  { label:"DBULL", need:"DBULL" },
];

function isMatch(id:string, t:any){
  if(!t) return false;
  if(id==="BULL") return t.value==="BULL";
  if(id==="DBULL") return t.value==="DBULL";
  const m=id[0]; const n=parseInt(id.slice(1),10);
  const mult = m==="S"?1:m==="D"?2:3;
  return t.value===n && t.multiplier===mult;
}

export default function EvolutionPlay({ config, onExit }:{config:{seconds:number; startLevel:number}; onExit:()=>void}) {
  const engine = useMemo(()=>new TrainingEngine({mode:"EVOLUTION"}),[]);
  const [level,setLevel]=useState(Math.max(1, Math.min(LEVELS.length, config.startLevel)));
  const [ended,setEnded]=useState(false);
  const [success,setSuccess]=useState(true);

  const stats=computeTrainingStats(engine.state);

  useEffect(()=>{
    const t=setTimeout(()=>{ engine.finish(true); setEnded(true); }, config.seconds*1000);
    return ()=>clearTimeout(t);
  },[])

  const current = LEVELS[level-1];

  function finish(){
    engine.finish(true);
    setEnded(true);
  }

  function onThrow(t:any,h:boolean,s:number){
    engine.throw(t,h,s);
    const ok = h && isMatch(current.need, t);
    if(ok){
      setLevel(l=>Math.min(LEVELS.length, l+1));
    } else {
      setLevel(l=>Math.max(1, l-1));
      // option: 3 erreurs consécutives => fail (ici on ne fail pas, c'est session)
    }
  }

  return (
    <>
      <TrainingShell
        header={<TrainingHeader rules={<p>Niveau {level} — Cible: {current.label}</p>} onBack={onExit} />}
        body={
          <>
            <div style={{marginBottom:8, opacity:0.85, fontSize:12}}>
              Réussite = niveau +1 • Raté = niveau -1 • Fin au timer
            </div>
            <ScoreInputHub onThrow={onThrow} />
            <div style={{marginTop:10}}>
              <button onClick={finish}>Terminer</button>
            </div>
          </>
        }
        footer={<TrainingFooter stats={stats} />}
      />
      <TrainingResultModal
        open={ended}
        stats={stats}
        success={success}
        onClose={onExit}
        title="Evolution — Session terminée"
      />
    </>
  );
}
