// ChallengesConfig — sélection de défi
import React, { useState } from "react";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";

const CHALLENGES = [
  {
    id: "3_DOUBLES_9",
    title: "3 Doubles en 9 flèches",
    subtitle: "Objectif : toucher 3 doubles (n’importe lesquels) en 9 darts",
    config: { kind:"doubles", goal:3, darts:9 },
  },
  {
    id: "BULL_T20_D20",
    title: "Bull → T20 → D20",
    subtitle: "Séquence stricte en 12 darts",
    config: { kind:"sequence", seq:["BULL","T20","D20"], darts:12 },
  },
  {
    id: "CHECKOUT_40_3",
    title: "Checkout 40 en 3 flèches",
    subtitle: "Sortie exacte 40 (double obligatoire) en 3 darts",
    config: { kind:"checkout40", darts:3 },
  },
];

export default function ChallengesConfig({ onStart, onExit }:{onStart:(cfg:any)=>void; onExit:()=>void}) {
  const [pick,setPick]=useState(CHALLENGES[0]);

  return (
    <TrainingShell
      header={<TrainingHeader onBack={onExit} rules={<p>Choisis un défi : objectif clair, darts limités.</p>} />}
      body={
        <div>
          {CHALLENGES.map(c=>(
            <button key={c.id} onClick={()=>setPick(c)} style={{display:"block", marginBottom:10, width:"100%"}}>
              <b>{c.title}</b><div style={{opacity:0.8, fontSize:12}}>{c.subtitle}</div>
            </button>
          ))}
          <div style={{marginTop:16}}>
            <button onClick={()=>onStart({ challengeId: pick.id, ...pick.config })}>Lancer</button>
          </div>
        </div>
      }
    />
  );
}
