import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "iceberg" as const;

export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Sécurise les compartiments avant que la coque ne cède : vise les secteurs de réparation et utilise les BULLS pour pomper l’eau." />;
}
