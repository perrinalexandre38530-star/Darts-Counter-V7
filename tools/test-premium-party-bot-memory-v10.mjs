import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const memory = read("src/lib/premiumPartyBotMemory.ts");
for (const marker of [
  "adaptPremiumBotBrain",
  "PremiumOpponentModel",
  "Mémoire intra-match",
  "castleModel",
  "gotchaModel",
  "hareModel",
  "penduModel",
  "menteurModel",
  "AGRESSEUR",
  "PIÉGEUR GOTCHA",
  "SPRINTER",
  "COPIEUR SOLIDE",
  "DÉTECTEUR DE BLUFF",
  "strengthFromSamples",
]) {
  assert(memory.includes(marker), `premiumPartyBotMemory: marqueur absent ${marker}`);
}

const plays = {
  castle: "src/pages/CastlePlay.tsx",
  gotcha: "src/pages/GotchaPlay.tsx",
  hare_hounds: "src/pages/HareHoundsPlay.tsx",
  pendu: "src/pages/PenduPlay.tsx",
  menteur: "src/pages/MenteurPlay.tsx",
};
for (const [mode, file] of Object.entries(plays)) {
  const src = read(file);
  for (const marker of [
    "adaptPremiumBotBrain",
    `adaptPremiumBotBrain("${mode}"`,
    "baseBotBrain",
    "activeBotAdaptation",
    "activeBotMemory",
    "activeBotBrain",
    "adaptation={activeBotMemory",
    "learningConfidence={activeBotMemory?.confidence}",
  ]) assert(src.includes(marker), `${file}: marqueur mémoire IA absent ${marker}`);
}

const ui = read("src/pages/newModes/PremiumPartyModeUi.tsx");
for (const marker of [
  "MÉMOIRE ADVERSAIRE",
  "learningConfidence",
  "learningTarget",
  "adaptationDetail",
  "party-mode__bot-memory",
]) assert(ui.includes(marker), `BotTurn UI mémoire: ${marker} absent`);

const css = read("src/pages/newModes/PremiumPartyModeUi.css");
for (const marker of [
  "V10 — mémoire intra-match",
  "party-mode__bot-memory",
  "party-mode__bot-learning",
]) assert(css.includes(marker), `CSS mémoire: ${marker} absent`);

console.log("✅ PREMIUM PARTY BOT MEMORY V10 — adaptation intra-match / adversaire : OK");
