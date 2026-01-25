// TimeAttackConfig — choix durée & règles
import React, { useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";

export default function TimeAttackConfig({ onStart, onExit }:{onStart:(cfg:any)=>void; onExit:()=>void}) {
  const [seconds,setSeconds]=useState(60);
  return (
    <TrainingShell
      header={<TrainingHeader onBack={onExit} rules={<p>Marque un maximum de points dans le temps imparti.</p>} />}
      body={
        <div>
          <h3>Durée</h3>
          {[30,60,120].map(s=>(
            <button key={s} onClick={()=>setSeconds(s)} style={{marginRight:8}}>{s}s</button>
          ))}
          <div style={{marginTop:16}}>
            <button onClick={()=>onStart({seconds})}>Lancer</button>
          </div>
        </div>
      }
    />
  );
}
