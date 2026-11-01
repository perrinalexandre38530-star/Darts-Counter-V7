import React from "react"; import Wave61SharedPlay from "../../Wave61SharedPlay";
export const WAVE61_MODE_ID="troupeau_en_danger" as const;
export default function P(props:any){return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="DÉFENSE DU TROUPEAU : marque assez de défense pour repousser chaque vague. Une volée trop faible coûte des moutons. BULL = action du Patou ; DBULL peut déclencher le sauvetage du Berger. Garde au moins un mouton jusqu’à la fin."/>}
