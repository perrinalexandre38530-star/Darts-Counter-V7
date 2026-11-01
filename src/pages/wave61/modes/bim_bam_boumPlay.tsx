import React from "react"; import Wave61SharedPlay from "../../Wave61SharedPlay";
export const WAVE61_MODE_ID="bim_bam_boum" as const;
export default function P(props:any){return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="BIM → BAM → BOUM : construis ton combo sur les trois fléchettes. En classique, vise Simple puis Double puis Triple du même secteur. Trois combos consécutifs peuvent charger le SUPER BOUM."/>}
