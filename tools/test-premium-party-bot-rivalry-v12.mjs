import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const rivalry = read("src/lib/premiumPartyBotRivalry.ts");
for (const marker of [
  "dc_premium_party_bot_rivalry_v1",
  "commitPremiumPartyRivalry",
  "adaptPremiumBotBrainFromRivalry",
  "getPremiumPartyRivalryEntry",
  "seenMatchIds",
  "RIVALITÉ ÉQUILIBRÉE",
  "REVANCHE",
  "BOT EN TÊTE",
  "SÉRIE DU BOT",
  "rivalryTension",
  "quoteFor",
]) assert(rivalry.includes(marker), `premiumPartyBotRivalry: marqueur absent ${marker}`);

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
    "adaptPremiumBotBrainFromRivalry",
    "commitPremiumPartyRivalry",
    `adaptPremiumBotBrainFromRivalry("${mode}"`,
    `mode: "${mode}"`,
    "rivalryBotAdaptation",
    "activeBotRivalry",
    "rivalry={activeBotRivalry",
    "rivalryConfidence={activeBotRivalry?.confidence}",
    "rivalryTension={activeBotRivalry?.tension}",
  ]) assert(src.includes(marker), `${file}: marqueur rivalité absent ${marker}`);

  const scoutingPos = src.indexOf(`adaptPremiumBotBrainFromScouting("${mode}"`);
  const rivalryPos = src.indexOf(`adaptPremiumBotBrainFromRivalry("${mode}"`);
  const memoryPos = src.indexOf(`adaptPremiumBotBrain("${mode}"`);
  assert(scoutingPos >= 0 && rivalryPos > scoutingPos && memoryPos > rivalryPos,
    `${file}: ordre attendu = scouting -> rivalité -> mémoire live`);
}

const ui = read("src/pages/newModes/PremiumPartyModeUi.tsx");
for (const marker of [
  "RIVALITÉ",
  "rivalryDetail",
  "rivalryRecord",
  "rivalryMatches",
  "rivalryConfidence",
  "rivalryTension",
  "rivalryTarget",
  "rivalryQuote",
  "party-mode__bot-rivalry",
]) assert(ui.includes(marker), `BotTurn UI rivalité: ${marker} absent`);

const css = read("src/pages/newModes/PremiumPartyModeUi.css");
for (const marker of [
  "V12 — rivalité BOT ↔ humain",
  "party-mode__bot-rivalry",
  "party-mode__bot-rivalry-bars",
]) assert(css.includes(marker), `CSS rivalité: ${marker} absent`);

console.log("✅ PREMIUM PARTY BOT RIVALRY V12 — historique duel / revanche / contre-stratégie : OK");
