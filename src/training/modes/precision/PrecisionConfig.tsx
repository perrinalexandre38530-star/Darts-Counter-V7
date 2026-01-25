// PrecisionConfig — parcours de cibles + vies
import React, { useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";

const PRESETS = {
  pro: ["T20","T19","D18","BULL","DBULL"],
  medium: ["20","19","18","17","16"],
};

export default function PrecisionConfig({ onStart, onExit }:{onStart:(cfg:any)=>void; onExit:()=>void}) {
  const [preset,setPreset]=useState<keyof typeof PRESETS>("pro");
  const [lives,setLives]=useState(1);
  return (
    <TrainingShell
      header={<TrainingHeader onBack={onExit} rules={<p>Enchaîne les cibles. Les ratés coûtent des vies.</p>} />}
      body={
        <div>
          <h3>Parcours</h3>
          {Object.keys(PRESETS).map(p=>(
            <button key={p} onClick={()=>setPreset(p as any)} style={{marginRight:8}}>{p}</button>
          ))}
          <h3 style={{marginTop:12}}>Vies</h3>
          {[0,1,3].map(v=>(
            <button key={v} onClick={()=>setLives(v)} style={{marginRight:8}}>{v}</button>
          ))}
          <div style={{marginTop:16}}>
            <button onClick={()=>onStart({targets:PRESETS[preset], lives})}>Lancer</button>
          </div>
        </div>
      }
    />
  );
}
