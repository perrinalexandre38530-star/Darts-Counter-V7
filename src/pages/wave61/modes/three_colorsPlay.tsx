import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";
export const WAVE61_MODE_ID = "three_colors" as const;
export default function DedicatedWave61Play(props:any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Obtiens exactement trois couleurs différentes sur la même volée parmi NOIR, BLANC, VERT et ROUGE. Une volée complète marque la somme des trois impacts ; sinon elle vaut 0, hors pénalité optionnelle." />;
}
