import React, { useState } from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

const PRESETS = {
  pro: { label: "Pro", subtitle: "Triples / doubles / bull", targets: ["T20","T19","D18","BULL","DBULL"] },
  medium: { label: "Medium", subtitle: "Singles 20→16", targets: ["20","19","18","17","16"] },
} as const;
type PresetKey = keyof typeof PRESETS;

export default function PrecisionConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart: (cfg:any)=>void; onExit:()=>void; }) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => (profiles?.[0]?.id ? [profiles[0].id] : []));
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [preset, setPreset] = useState<PresetKey>("pro");
  const [lives, setLives] = useState(1);

  return (
    <TrainingShell
      header={<TrainingHeader title="Precision" onBack={onExit} rules={<p>Atteins chaque cible du parcours. Raté = perte de vie (si activé).</p>} />}
      body={
        <div>
          <TrainingParticipantsBlock profiles={profiles} selectedPlayerIds={selectedPlayerIds} setSelectedPlayerIds={setSelectedPlayerIds} selectedBotIds={selectedBotIds} setSelectedBotIds={setSelectedBotIds} />
          {(Object.keys(PRESETS) as PresetKey[]).map((k)=>(
            <TrainingOptionCard key={k} title={PRESETS[k].label} subtitle={PRESETS[k].subtitle} active={preset===k} onClick={()=>setPreset(k)} />
          ))}
          {[0,1,3].map((v)=>(
            <TrainingOptionCard key={v} title={v===0?"0 (Hardcore)":`${v}`} subtitle={v===0?"1 erreur = fin":"Tolérance erreurs"} active={lives===v} onClick={()=>setLives(v)} />
          ))}
          <TrainingStartButton onClick={()=>onStart({ targets: PRESETS[preset].targets, lives, selectedPlayerIds, selectedBotIds })} />
        </div>
      }
    />
  );
}
