// SuperBullConfig — bull-only
import React, { useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";

export default function SuperBullConfig({ onStart, onExit }:{onStart:(cfg:any)=>void; onExit:()=>void}) {
  const [target,setTarget]=useState(100);
  return (
    <TrainingShell
      header={<TrainingHeader onBack={onExit} rules={<p>Touche Bull/DBull pour atteindre le score cible.</p>} />}
      body={
        <div>
          <h3>Score objectif</h3>
          {[50,100,150].map(v=>(
            <button key={v} onClick={()=>setTarget(v)} style={{marginRight:8}}>{v}</button>
          ))}
          <div style={{marginTop:16}}>
            <button onClick={()=>onStart({target})}>Lancer</button>
          </div>
        </div>
      }
    />
  );
}
