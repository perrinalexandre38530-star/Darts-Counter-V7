import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const ai = read("src/lib/premiumPartyBotAI.ts");
for (const marker of [
  '"aggressive"', '"tactician"', '"sniper"', '"steady"', '"trickster"',
  "resolvePremiumBotBrain", "premiumBotTacticalPlan", "premiumBotReaction",
  '"power_scorer"', '"checkout_master"', '"ultra_regular"', '"all_rounder"',
  "precision", "risk", "attackBias", "gotchaBias", "bluffBias", "callBias",
]) assert(ai.includes(marker), `premiumPartyBotAI: marqueur absent ${marker}`);

const engines = {
  castle: ["src/lib/gameEngines/castleEngine.ts", "pickCastleBotDarts"],
  gotcha: ["src/lib/gameEngines/gotchaEngine.ts", "pickGotchaBotDarts"],
  hare_hounds: ["src/lib/gameEngines/hareHoundsEngine.ts", "pickHareBotDarts"],
  pendu: ["src/lib/gameEngines/penduEngine.ts", "pickPenduBotDarts"],
  menteur: ["src/lib/gameEngines/menteurEngine.ts", "pickMenteurBotAction"],
};
for (const [mode, [file, fn]] of Object.entries(engines)) {
  const src = read(file);
  assert(src.includes("PremiumBotBrain"), `${file}: PremiumBotBrain absent`);
  assert(src.includes(`${fn}(`), `${file}: ${fn} absent`);
  assert(src.includes("brain?"), `${file}: cerveau IA optionnel absent`);
}
assert(read("src/lib/gameEngines/menteurEngine.ts").includes("pickMenteurBotDarts"), "MENTEUR: IA de preuve absente");

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
    "resolvePremiumBotBrain", "premiumBotTacticalPlan", "activeBotBrain", "activeBotPlan",
    "persona={activeBotPlan.persona}", "reaction={activeBotPlan.reaction}",
    "objectiveDetail={activeBotPlan.detail}",
  ]) assert(src.includes(marker), `${file}: marqueur IA absent ${marker}`);
}

const ui = read("src/pages/newModes/PremiumPartyModeUi.tsx");
for (const marker of ["OBJECTIF TACTIQUE", "RÉACTION IA", "personaIcon", "objectiveDetail", "party-mode__bot-meta"]) {
  assert(ui.includes(marker), `BotTurn UI: ${marker} absent`);
}
const css = read("src/pages/newModes/PremiumPartyModeUi.css");
for (const marker of ["party-mode__bot-meta", "party-mode__bot-reaction", "party-mode__bot-intent"]) {
  assert(css.includes(marker), `BotTurn CSS: ${marker} absent`);
}

console.log("✅ PREMIUM PARTY BOT AI V9 — personnalités / tactique / réactions : OK");
