// RepeatMasterConfig — régularité / streak
import React, { useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";

const TARGETS = [
  { id: "S20", label: "S20" },
  { id: "T20", label: "T20" },
  { id: "D20", label: "D20" },
  { id: "BULL", label: "BULL" },
  { id: "DBULL", label: "DBULL" },
];

export default function RepeatMasterConfig({ onStart, onExit }:{onStart:(cfg:any)=>void; onExit:()=>void}) {
  const [target,setTarget]=useState("T20");
  const [goal,setGoal]=useState(10);
  const [hardcore,setHardcore]=useState(true);

  return (
    <TrainingShell
      header={<TrainingHeader onBack={onExit} rules={<p>Répète une cible. Objectif : atteindre un streak sans craquer.</p>} />}
      body={
        <div>
          <h3>Cible</h3>
          {TARGETS.map(t=>(
            <button key={t.id} onClick={()=>setTarget(t.id)} style={{marginRight:8, marginBottom:8}}>
              {t.label}
            </button>
          ))}

          <h3 style={{marginTop:12}}>Streak objectif</h3>
          {[5,10,15,20].map(v=>(
            <button key={v} onClick={()=>setGoal(v)} style={{marginRight:8}}>{v}</button>
          ))}

          <h3 style={{marginTop:12}}>Mode</h3>
          <button onClick={()=>setHardcore(true)} style={{marginRight:8}}>Hardcore (1 erreur = fin)</button>
          <button onClick={()=>setHardcore(false)}>Soft (erreur = reset)</button>

          <div style={{marginTop:16}}>
            <button onClick={()=>onStart({ target, goal, hardcore })}>Lancer</button>
          </div>
        </div>
      }
    />
  );
}
