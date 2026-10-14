import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const assist=read("src/lib/premiumPartyGameplayAssist.ts");
for(const marker of [
  "suggestExactScoreRoute","suggestAtLeastScoreRoute","castleAimAssist","gotchaAimAssist",
  "hareAimAssist","penduAimAssist","menteurProofAimAssist","menteurAuctionAssist",
  "GOTCHA DISPONIBLE","ROUTE DE FINISH","PROCHAINES CIBLES","AIDE OBJECTIF","OBJECTIF + MALÉDICTION","ROUTE DE PREUVE"
]) assert(assist.includes(marker),`Assist: ${marker} absent`);

const ui=read("src/pages/newModes/PremiumPartyModeUi.tsx");
for(const marker of ["AimAssistCard","party-mode-aim__targets","AIDE CIBLE"]) assert(ui.includes(marker),`UI: ${marker} absent`);

const css=read("src/pages/newModes/PremiumPartyModeUi.css");
for(const marker of ["V16 — aide cible / route de volée",".party-mode-aim",".party-mode-aim__targets"]) assert(css.includes(marker),`CSS: ${marker} absent`);

const pages={
  castle:["src/pages/CastlePlay.tsx","castleAimAssist","centerSlot={<AimAssistCard","VISE ${aimPlan.targets[0]}"],
  gotcha:["src/pages/GotchaPlay.tsx","gotchaAimAssist","centerSlot={<AimAssistCard","ROUTE ${aimPlan.targets.join"],
  hare:["src/pages/HareHoundsPlay.tsx","hareAimAssist","centerSlot={<AimAssistCard","ENSUITE ${aimPlan.targets.join"],
  pendu:["src/pages/PenduPlay.tsx","penduAimAssist","centerSlot={<AimAssistCard","EX ${aimPlan.targets.join"],
  menteur:["src/pages/MenteurPlay.tsx","menteurProofAimAssist","menteurAuctionAssist","centerSlot={<AimAssistCard","PRUDENT","PRESSION","BLUFF"],
};
for(const [mode,[file,...markers]] of Object.entries(pages)){
  const src=read(file);
  for(const marker of markers) assert(src.includes(marker),`${mode}: ${marker} absent`);
}
console.log("✅ PREMIUM PARTY TARGET COACH V16 — routes / aide cible / lisibilité gameplay : OK");
