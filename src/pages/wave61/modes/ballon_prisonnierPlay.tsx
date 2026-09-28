import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "ballon_prisonnier" as const;

export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Touche les adversaires pour les envoyer en prison ; BULL et DBULL servent à libérer un allié ou renforcer ton bouclier." />;
}
