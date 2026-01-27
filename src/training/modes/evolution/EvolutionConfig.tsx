import React, { useState } from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

export default function EvolutionConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart:(cfg:any)=>void; onExit:()=>void; }) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => (profiles?.[0]?.id ? [profiles[0].id] : []));
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(180);
  const [startLevel, setStartLevel] = useState(1);

  return (
    <TrainingShell
      header={<TrainingHeader title="Evolution" onBack={onExit} rules={<p>Réussite = +1 niveau, raté = -1 niveau. Fin au timer.</p>} />}
      body={
        <div>
          <TrainingParticipantsBlock profiles={profiles} selectedPlayerIds={selectedPlayerIds} setSelectedPlayerIds={setSelectedPlayerIds} selectedBotIds={selectedBotIds} setSelectedBotIds={setSelectedBotIds} />
          {[60,120,180,300].map((s)=>(
            <TrainingOptionCard key={s} title={`${s} secondes`} active={seconds===s} onClick={()=>setSeconds(s)} />
          ))}
          {[1,3,5].map((l)=>(
            <TrainingOptionCard key={l} title={`Niveau ${l}`} active={startLevel===l} onClick={()=>setStartLevel(l)} />
          ))}
          <TrainingStartButton onClick={()=>onStart({ seconds, startLevel, selectedPlayerIds, selectedBotIds })} />
        </div>
      }
    />
  );
}
