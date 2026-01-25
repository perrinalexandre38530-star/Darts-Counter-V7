// EvolutionConfig — progression adaptative
import React, { useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";

export default function EvolutionConfig({ onStart, onExit }:{onStart:(cfg:any)=>void; onExit:()=>void}) {
  const [seconds,setSeconds]=useState(180);
  const [startLevel,setStartLevel]=useState(1);
  return (
    <TrainingShell
      header={<TrainingHeader onBack={onExit} rules={<p>Mode adaptatif : tu montes en niveau si tu réussis, tu redescends si tu rates.</p>} />}
      body={
        <div>
          <h3>Durée</h3>
          {[60,120,180,300].map(s=>(
            <button key={s} onClick={()=>setSeconds(s)} style={{marginRight:8}}>{s}s</button>
          ))}
          <h3 style={{marginTop:12}}>Niveau de départ</h3>
          {[1,3,5].map(l=>(
            <button key={l} onClick={()=>setStartLevel(l)} style={{marginRight:8}}>L{l}</button>
          ))}
          <div style={{marginTop:16}}>
            <button onClick={()=>onStart({seconds, startLevel})}>Lancer</button>
          </div>
        </div>
      }
    />
  );
}
