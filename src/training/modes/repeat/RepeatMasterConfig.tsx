import React, { useState } from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

const TARGETS = ["S20","T20","D20","BULL","DBULL"];

export default function RepeatMasterConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart:(cfg:any)=>void; onExit:()=>void; }) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => (profiles?.[0]?.id ? [profiles[0].id] : []));
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [target, setTarget] = useState("T20");
  const [goal, setGoal] = useState(10);
  const [hardcore, setHardcore] = useState(true);

  return (
    <TrainingShell
      header={<TrainingHeader title="Repeat Master" onBack={onExit} rules={<p>Répète une cible. Objectif: streak. Hardcore = 1 erreur = fin.</p>} />}
      body={
        <div>
          <TrainingParticipantsBlock profiles={profiles} selectedPlayerIds={selectedPlayerIds} setSelectedPlayerIds={setSelectedPlayerIds} selectedBotIds={selectedBotIds} setSelectedBotIds={setSelectedBotIds} />
          {TARGETS.map((t)=>(
            <TrainingOptionCard key={t} title={t} active={target===t} onClick={()=>setTarget(t)} />
          ))}
          {[5,10,15,20].map((v)=>(
            <TrainingOptionCard key={v} title={`${v}`} subtitle="Streak" active={goal===v} onClick={()=>setGoal(v)} />
          ))}
          <TrainingOptionCard title="Hardcore" subtitle="1 erreur = fin" active={hardcore} onClick={()=>setHardcore(true)} />
          <TrainingOptionCard title="Soft" subtitle="Erreur = reset" active={!hardcore} onClick={()=>setHardcore(false)} />
          <TrainingStartButton onClick={()=>onStart({ target, goal, hardcore, selectedPlayerIds, selectedBotIds })} />
        </div>
      }
    />
  );
}
