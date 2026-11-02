import React from "react";
import Wave61SharedConfig,{type Wave61DedicatedOption} from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID="saute_moutons" as const;

const DEDICATED_OPTIONS:Wave61DedicatedOption[]=[
 {key:"seriesFormat",label:"Scoreboard / manches",type:"select",defaultValue:"single",options:[{value:"single",label:"1 MANCHE · sans scoreboard"},{value:"bo3",label:"BO 3"},{value:"bo5",label:"BO 5"},{value:"bo7",label:"BO 7"},{value:"ft3",label:"FT 3"},{value:"ft5",label:"FT 5"},{value:"ft7",label:"FT 7"}],help:"Chaque manche relance une nouvelle course ; le scoreboard conserve les manches gagnées."},
 {key:"trackLength",label:"Longueur de la course",type:"select",defaultValue:20,options:[{value:12,label:"SPRINT · 12 cases"},{value:20,label:"CLASSIQUE · 20 cases"},{value:30,label:"MARATHON · 30 cases"}]},
 {key:"leapfrogBonus",label:"Bonus saute-mouton",type:"select",defaultValue:1,options:[{value:0,label:"DÉSACTIVÉ"},{value:1,label:"+1 case"},{value:2,label:"+2 cases"}]},
 {key:"bull25Jump",label:"BULL 25",type:"select",defaultValue:4,options:[{value:3,label:"+3 cases"},{value:4,label:"+4 cases"},{value:5,label:"+5 cases"}]},
 {key:"bull50Jump",label:"DBULL 50",type:"select",defaultValue:6,options:[{value:5,label:"+5 cases"},{value:6,label:"+6 cases"},{value:8,label:"+8 cases"}]},
];
const DEDICATED_INTRO="Une vraie course de moutons sur la cible : Simple = +1 case, Double = +2, Triple = +3. Les Bulls déclenchent de grands bonds. Si ton déplacement franchit la position d’un adversaire, tu le sautes et gagnes le bonus Saute-Mouton.";
export default function C(props:any){return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO}/>}
