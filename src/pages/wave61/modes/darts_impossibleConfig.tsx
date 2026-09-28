import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "darts_impossible" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "missionCount", label: "Nombre de missions", type: "select", defaultValue: 10, options: [{ value: 8, label: "8 · Opération courte" }, { value: 10, label: "10 · Standard" }, { value: 12, label: "12 · Opération longue" }] },
  { key: "alarmGain", label: "Alarme par erreur", type: "select", defaultValue: 18, options: [{ value: 12, label: "+12% · Agent" }, { value: 18, label: "+18% · Standard" }, { value: 25, label: "+25% · Impossible" }] },
  { key: "alarmThreshold", label: "Seuil d'alarme", type: "select", defaultValue: 100, options: [{ value: 80, label: "80% · Tendu" }, { value: 100, label: "100% · Standard" }, { value: 120, label: "120% · Tolérant" }] },
  { key: "failBack", label: "Missions perdues si compromis", type: "select", defaultValue: 1, options: [{ value: 0, label: "0" }, { value: 1, label: "1 · Standard" }, { value: 2, label: "2 · Hardcore" }] },
  { key: "bullCooling", label: "Réduction d'alarme par BULL", type: "select", defaultValue: 16, options: [{ value: 10, label: "10%" }, { value: 16, label: "16% · Standard" }, { value: 25, label: "25%" }] },
];

const DEDICATED_INTRO = "Chaque mission impose un contrat précis. Une erreur déclenche les lasers et fait monter l'alarme ; un BULL peut pirater le système et réduire la pression.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
