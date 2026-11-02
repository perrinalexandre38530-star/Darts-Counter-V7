import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "une_ptite_raclette" as const;

export default function UnePtiteRaclettePlay(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="UNE P’TITE RACLETTE ? · Compose ton assiette : fromage, pommes de terre et charcuterie. S/D/T donnent 1/2/3 portions. BULL 25 et DBULL 50 réchauffent tous les ingrédients. Le premier à servir l’objectif de raclettes gagne." />;
}
