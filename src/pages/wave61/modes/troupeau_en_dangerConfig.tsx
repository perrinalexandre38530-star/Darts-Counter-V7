import React from "react"; import Wave61SharedConfig,{type Wave61DedicatedOption} from "../../Wave61SharedConfig";
export const WAVE61_MODE_ID="troupeau_en_danger" as const;
const DEDICATED_OPTIONS:Wave61DedicatedOption[]=[
 {key:"flockSize",label:"Taille du troupeau",type:"select",defaultValue:8,options:[{value:5,label:"5 moutons"},{value:8,label:"8 moutons"},{value:12,label:"12 moutons"},{value:15,label:"15 moutons"}]},
 {key:"wolfDifficulty",label:"Meute de loups",type:"select",defaultValue:"normal",options:[{value:"easy",label:"FACILE"},{value:"normal",label:"STANDARD"},{value:"hard",label:"DIFFICILE"},{value:"alpha",label:"ALPHA"}]},
 {key:"patouPower",label:"Puissance du Patou",type:"select",defaultValue:10,options:[{value:0,label:"DÉSACTIVÉ"},{value:10,label:"STANDARD · +10 au Bull"},{value:20,label:"RENFORCÉ · +20 au Bull"}]},
 {key:"shepherdSave",label:"Berger · sauvetage",type:"toggle",defaultValue:true,help:"Le DBULL sauve automatiquement un mouton perdu, sans dépasser la taille initiale du troupeau."},
];
const DEDICATED_INTRO="Protège ton troupeau pendant les vagues de loups. Chaque volée produit une défense ; si elle n’atteint pas la pression de la meute, tu perds des moutons. Le Patou renforce les Bulls et le Berger peut sauver un mouton au DBULL.";
export default function C(props:any){return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO}/>}
