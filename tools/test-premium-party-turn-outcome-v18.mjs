import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const helper=read("src/lib/premiumPartyTurnOutcome.ts");
for(const marker of [
  "castleTurnOutcome","gotchaTurnOutcome","hareTurnOutcome","penduTurnOutcome","menteurTurnOutcome",
  "CHÂTEAU RENFORCÉ","GOTCHA ×","LIÈVRE CAPTURÉ","OBJECTIF RÉUSSI","BLUFF DÉMASQUÉ",
]) assert(helper.includes(marker),`Outcome helper: ${marker} absent`);

const ui=read("src/pages/newModes/PremiumPartyModeUi.tsx");
for(const marker of ["TurnOutcomeCard","party-mode-outcome__body","À SUIVRE"]) assert(ui.includes(marker),`UI V18: ${marker} absent`);

const css=read("src/pages/newModes/PremiumPartyModeUi.css");
for(const marker of ["V18 — résultat de tour / conséquence immédiate",".party-mode-outcome",".party-mode-outcome__icon"]) assert(css.includes(marker),`CSS V18: ${marker} absent`);

const pages={
  castle:["src/pages/CastlePlay.tsx",'premiumPartyTurnOutcome("castle"',"<TurnOutcomeCard"],
  gotcha:["src/pages/GotchaPlay.tsx",'premiumPartyTurnOutcome("gotcha"',"<TurnOutcomeCard"],
  hare:["src/pages/HareHoundsPlay.tsx",'premiumPartyTurnOutcome("hare_hounds"',"<TurnOutcomeCard"],
  pendu:["src/pages/PenduPlay.tsx",'premiumPartyTurnOutcome("pendu"',"<TurnOutcomeCard"],
  menteur:["src/pages/MenteurPlay.tsx",'premiumPartyTurnOutcome("menteur"',"<TurnOutcomeCard"],
};
for(const [mode,[file,...markers]] of Object.entries(pages)){
  const src=read(file);
  for(const marker of markers) assert(src.includes(marker),`${mode}: ${marker} absent`);
}

console.log("✅ PREMIUM PARTY TURN OUTCOME V18 — conséquence immédiate / résultat de tour 5 modes : OK");
