import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "le_loup" as const;

export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Si tu es le loup, attrape une cible pour transmettre la chasse. Sinon fuis et utilise les BULLS pour accumuler de la protection." />;
}
