import React, { useState } from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

export default function TimeAttackConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart: (cfg:any)=>void; onExit:()=>void; }) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => (profiles?.[0]?.id ? [profiles[0].id] : []));
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(60);

  return (
    <TrainingShell
      header={<TrainingHeader title="Time Attack" onBack={onExit} rules={<p>Marque un maximum de points dans le temps imparti.</p>} />}
      body={
        <div>
          <TrainingParticipantsBlock profiles={profiles} selectedPlayerIds={selectedPlayerIds} setSelectedPlayerIds={setSelectedPlayerIds} selectedBotIds={selectedBotIds} setSelectedBotIds={setSelectedBotIds} />
          {[30,60,120].map((s)=>(
            <TrainingOptionCard key={s} title={`${s} secondes`} subtitle={s===30?"Sprint":s===60?"Standard":"Endurance"} active={seconds===s} onClick={()=>setSeconds(s)} />
          ))}
          <TrainingStartButton onClick={()=>onStart({ seconds, selectedPlayerIds, selectedBotIds })} />
        </div>
      }
    />
  );
}
