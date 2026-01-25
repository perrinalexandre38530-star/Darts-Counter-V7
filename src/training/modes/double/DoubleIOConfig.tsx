// DoubleIOConfig — choix mode
import React, { useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";

export default function DoubleIOConfig({ onStart, onExit }:{onStart:(cfg:any)=>void; onExit:()=>void}) {
  const [mode,setMode]=useState<"DI"|"DO"|"DIDO">("DI");
  return (
    <TrainingShell
      header={<TrainingHeader onBack={onExit} rules={<p>Travaille les doubles avec des objectifs clairs.</p>} />}
      body={
        <div>
          {["DI","DO","DIDO"].map(m=>(
            <button key={m} onClick={()=>setMode(m as any)} style={{marginRight:8}}>{m}</button>
          ))}
          <div style={{marginTop:16}}>
            <button onClick={()=>onStart({mode})}>Lancer</button>
          </div>
        </div>
      }
    />
  );
}
