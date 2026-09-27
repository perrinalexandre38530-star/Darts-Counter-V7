import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "mythologie" as const;

/** Écran Play dédié à mythologie. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Enchaîne les épreuves divines, accumule la faveur et utilise les bulls pour accélérer la bénédiction des dieux." />;
}
