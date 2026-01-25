// GhostConfig — moyenne cible
import React, { useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";

export default function GhostConfig({ onStart, onExit }:{onStart:(cfg:any)=>void; onExit:()=>void}) {
  const [avg,setAvg]=useState(60);
  return (
    <TrainingShell
      header={<TrainingHeader onBack={onExit} rules={<p>Affronte une moyenne cible (ghost).</p>} />}
      body={
        <div>
          {[45,60,75,90].map(a=>(
            <button key={a} onClick={()=>setAvg(a)} style={{marginRight:8}}>{a}</button>
          ))}
          <div style={{marginTop:16}}>
            <button onClick={()=>onStart({avg})}>Lancer</button>
          </div>
        </div>
      }
    />
  );
}
