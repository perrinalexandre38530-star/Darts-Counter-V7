import React, { useState } from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

export default function SuperBullConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart:(cfg:any)=>void; onExit:()=>void; }) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => (profiles?.[0]?.id ? [profiles[0].id] : []));
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [target, setTarget] = useState(100);

  return (
    <TrainingShell
      header={<TrainingHeader title="Super Bull" onBack={onExit} rules={<p>BULL=25, DBULL=50. Atteins le score objectif.</p>} />}
      body={
        <div>
          <TrainingParticipantsBlock profiles={profiles} selectedPlayerIds={selectedPlayerIds} setSelectedPlayerIds={setSelectedPlayerIds} selectedBotIds={selectedBotIds} setSelectedBotIds={setSelectedBotIds} />
          {[50,100,150].map((v)=>(
            <TrainingOptionCard key={v} title={`${v} points`} subtitle={v===50?"Rapide":v===100?"Standard":"Long"} active={target===v} onClick={()=>setTarget(v)} />
          ))}
          <TrainingStartButton onClick={()=>onStart({ target, selectedPlayerIds, selectedBotIds })} />
        </div>
      }
    />
  );
}
