import { MssClassicConfigFlow } from "../../../components/config/MssClassicConfigFlow";
import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";
import TrainingParticipantsSelector, { buildTrainingParticipantConfig, resolveTrainingParticipants, useTrainingParticipantSelection } from "../../ui/TrainingParticipantsSelector";

const DURATIONS = [30,60,120] as const;

export default function TimeAttackConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart:(cfg:any)=>void; onExit:()=>void; }) {
  const [participants, setParticipants] = useTrainingParticipantSelection(profiles);
  const [seconds, setSeconds] = React.useState<(typeof DURATIONS)[number]>(60);
  const resolved = resolveTrainingParticipants(participants, profiles);
  const [configViewMode, setConfigViewMode] = React.useState<"guided" | "complete">(() => {
    try { return localStorage.getItem("dc_time_attack_config_view") === "complete" ? "complete" : "guided"; } catch { return "guided"; }
  });
  const [guidedStep, setGuidedStep] = React.useState(0);
  const [showHelp, setShowHelp] = React.useState(false);
  const guidedSteps = ["Participants", "Durée", "Résumé"];
  const selectConfigViewMode = (next: "guided" | "complete") => {
    setConfigViewMode(next);
    try { localStorage.setItem("dc_time_attack_config_view", next); } catch {}
  };


  return <TrainingShell
    header={<TrainingHeader title="Time Attack" tickerId="training_time_attack" onBack={onExit} rules={<><p>Marque un maximum de points dans le temps imparti.</p><p>En multi ou équipes, tous jouent exactement la même durée : classement individuel puis moyenne d'équipe.</p></>} />}
    body={<div style={{ width: "min(760px,100%)", margin: "0 auto" }}>
      <MssClassicConfigFlow title="Time Attack" steps={guidedSteps} step={guidedStep}
        view={configViewMode} accent="#27dcff" summary={`${seconds}s · ${resolved.length} joueur(s)`}
        onStep={setGuidedStep} onView={selectConfigViewMode} onHelp={() => setShowHelp((value) => !value)} />
      {(configViewMode === "complete" || guidedStep === 0) && <>
      <TrainingParticipantsSelector profiles={profiles} value={participants} onChange={setParticipants} />
      </>}
      {(configViewMode === "complete" || guidedStep === 1) && <>
      <div style={{ margin: "4px 2px 9px", fontSize: 11, fontWeight: 950, letterSpacing: .85, opacity: .66 }}>DURÉE DE LA SESSION</div>
      {DURATIONS.map((value) => <TrainingOptionCard key={value} title={`${value} secondes`} subtitle={value===30?"Sprint — rythme maximal":value===60?"Standard — vitesse + régularité":"Endurance — tenir le scoring"} active={seconds===value} onClick={() => setSeconds(value)} />)}
      </>}
      {(configViewMode === "complete" || guidedStep === 2) && <>
      <TrainingStartButton disabled={!resolved.length} label={resolved.length > 1 ? `LANCER — ${resolved.length} JOUEURS` : undefined} onClick={() => onStart({ seconds, ...buildTrainingParticipantConfig(participants, profiles) })} />
      </>}
    </div>}
  />;
}
