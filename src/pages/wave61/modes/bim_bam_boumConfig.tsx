import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";
export const WAVE61_MODE_ID = "bim_bam_boum" as const;
const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key:"comboRule", label:"Contrat BIM → BAM → BOUM", type:"select", defaultValue:"same", options:[{value:"same",label:"CLASSIQUE · Simple / Double / Triple même secteur"},{value:"beds",label:"LIBRE · Simple / Double / Triple secteurs libres"},{value:"progressive",label:"PROGRESSIF · 3 impacts de valeur croissante"}]},
  { key:"comboBonus", label:"Bonus BOUM", type:"select", defaultValue:50, options:[{value:25,label:"+25"},{value:50,label:"+50"},{value:100,label:"+100"}]},
  { key:"superBoom", label:"SUPER BOUM", type:"toggle", defaultValue:true, help:"Trois combos réussis d’affilée doublent le bonus du prochain BOUM." },
  { key:"missPenalty", label:"Pénalité volée ratée", type:"select", defaultValue:0, options:[{value:0,label:"AUCUNE"},{value:10,label:"-10"},{value:25,label:"-25"}]},
];
const DEDICATED_INTRO="Construis une volée en trois temps : BIM, BAM puis BOUM. Le mode Classique exige Simple → Double → Triple sur le même secteur ; le combo marque la valeur réelle des impacts + le bonus BOUM.";
export default function C(props:any){return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO}/>}
