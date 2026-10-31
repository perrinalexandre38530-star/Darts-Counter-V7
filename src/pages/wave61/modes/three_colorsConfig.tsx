import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "three_colors" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
];

const DEDICATED_INTRO = "Réussis trois couleurs différentes sur la même volée. Si les 3 couleurs sont présentes, la somme réelle des impacts est ajoutée.";

export default function DedicatedWave61Config(props: any) { return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />; }
