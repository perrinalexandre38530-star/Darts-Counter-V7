import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "jackpot" as const;

/** Écran Play dédié à JACKPOT. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Transforme tes trois darts en symboles, cherche les paires et triples, et vise le 777 pour décrocher le pot progressif." />;
}
