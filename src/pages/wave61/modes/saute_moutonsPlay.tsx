import React from "react"; import Wave61SharedPlay from "../../Wave61SharedPlay";
export const WAVE61_MODE_ID="saute_moutons" as const;
export default function P(props:any){return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="COURSE : S = +1, D = +2, T = +3. BULL et DBULL font bondir plus loin. Franchis un autre mouton pendant ton déplacement pour obtenir le bonus saute-mouton. Premier à l’arrivée = victoire."/>}
