import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const engine=read("src/lib/gameEngines/penduEngine.ts");
assert(engine.includes("forcedCard?: PenduPenaltyCard | null"),"PENDU: sabotage choisi absent du moteur");
assert(engine.includes("forcedCard ? clone(forcedCard) : drawSabotagePenalty()"),"PENDU: carte choisie non appliquée");

const pendu=read("src/pages/PenduPlay.tsx");
for(const marker of [
  "deterministicSabotageChoices",
  "PenduViciousLadder",
  "CHAQUE MORCEAU A UNE CONSÉQUENCE",
  "pendu-sabotage__cards",
  "CIBLE DU SABOTAGE",
  "selectedSabotageId",
  "usePenduSabotage(state, activePlayer.id, targetId, card || null)",
]) assert(pendu.includes(marker),`PENDU live gameplay: ${marker} absent`);

const modes={
  "src/pages/CastlePlay.tsx":["currentThrow }: any", "VOLÉE : +", "has-preview", "CastleBattlefield state={state}"],
  "src/pages/GotchaPlay.tsx":["projectedVictims", "GOTCHA SI VALIDÉ", "is-gotcha", "currentThrow={currentThrow}"],
  "src/pages/HareHoundsPlay.tsx":["previewSteps", "CAPTURE SI VALIDÉ", "ÉVASION SI VALIDÉ", "has-preview"],
  "src/pages/MenteurPlay.tsx":["PRESSION DE L’ANNONCE", "menteur-proof-live", "CONTRAT PROUVÉ", "previewConditionOk"],
};
for(const [file,markers] of Object.entries(modes)){
  const src=read(file);
  for(const marker of markers) assert(src.includes(marker),`${file}: ${marker} absent`);
}

const css=read("src/pages/newModes/PremiumPartyModeUi.css");
for(const marker of [
  "V15 — LIVE GAMEPLAY",
  ".gotcha-race__rows>div.is-gotcha",
  ".hare-circuit__track>div.has-preview",
  ".menteur-proof-live",
  ".pendu-vicious-ladder",
  ".pendu-sabotage__cards",
]) assert(css.includes(marker),`CSS V15: ${marker} absent`);

console.log("✅ PREMIUM PARTY LIVE GAMEPLAY V15 — projections / preuve / sabotage tactique : OK");
