import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "mythologie" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "trialNeed", label: "Marques requises par épreuve", type: "select", defaultValue: 3, options: [{ value: 2, label: "2 · Héros" },{ value: 3, label: "3 · Standard" },{ value: 4, label: "4 · Demi-dieu" }] },
  { key: "favorThreshold", label: "Faveur requise pour le bonus divin", type: "select", defaultValue: 60, options: [{ value: 45, label: "45%" },{ value: 60, label: "60%" },{ value: 75, label: "75%" }] },
  { key: "bullFavor", label: "Faveur gagnée sur BULL", type: "select", defaultValue: 18, options: [{ value: 12, label: "12%" },{ value: 18, label: "18%" },{ value: 24, label: "24%" }] },
];

const DEDICATED_INTRO = "Définis la difficulté des épreuves, le seuil de faveur divine et le bonus obtenu grâce aux bulls.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
