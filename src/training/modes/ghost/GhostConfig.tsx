import React, { useState } from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

export default function GhostConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart: (cfg:any)=>void; onExit:()=>void; }) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => (profiles?.[0]?.id ? [profiles[0].id] : []));
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [avg, setAvg] = useState(60);

  return (
    <TrainingShell
      header={<TrainingHeader title="Ghost" onBack={onExit} rules={<p>30 flèches. Objectif : moyenne ≥ cible.</p>} />}
      body={
        <div>
          <TrainingParticipantsBlock profiles={profiles} selectedPlayerIds={selectedPlayerIds} setSelectedPlayerIds={setSelectedPlayerIds} selectedBotIds={selectedBotIds} setSelectedBotIds={setSelectedBotIds} />
          {[45,60,75,90].map((a)=>(
            <TrainingOptionCard key={a} title={`${a} de moyenne`} subtitle={a===45?"Débutant":a===60?"Intermédiaire":a===75?"Confirmé":"Expert"} active={avg===a} onClick={()=>setAvg(a)} />
          ))}
          <TrainingStartButton onClick={()=>onStart({ avg, selectedPlayerIds, selectedBotIds })} />
        </div>
      }
    />
  );
}
