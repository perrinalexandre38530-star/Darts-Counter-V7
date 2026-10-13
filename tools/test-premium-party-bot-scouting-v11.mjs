import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const scouting = read("src/lib/premiumPartyBotScouting.ts");
for (const marker of [
  "dc_premium_party_bot_scouting_v1",
  "commitPremiumPartyScouting",
  "adaptPremiumBotBrainFromScouting",
  "getPremiumPartyScoutingEntry",
  "seenMatchIds",
  "MAX_SEEN_MATCHES",
  "AGRESSEUR CONNU",
  "BÂTISSEUR CONNU",
  "PIÉGEUR CONNU",
  "SPRINTER CONNU",
  "COPIEUR SOLIDE CONNU",
  "DÉTECTEUR DE BLUFF CONNU",
  "SURENCHÉRISSEUR CONNU",
]) assert(scouting.includes(marker), `premiumPartyBotScouting: marqueur absent ${marker}`);

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
    "adaptPremiumBotBrainFromScouting",
    "commitPremiumPartyScouting",
    `adaptPremiumBotBrainFromScouting("${mode}"`,
    `mode: "${mode}"`,
    "careerBotAdaptation",
    "activeBotScouting",
    "scouting={activeBotScouting",
    "scoutingConfidence={activeBotScouting?.confidence}",
  ]) assert(src.includes(marker), `${file}: marqueur scouting absent ${marker}`);

  const scoutingPos = src.indexOf(`adaptPremiumBotBrainFromScouting("${mode}"`);
  const memoryPos = src.indexOf(`adaptPremiumBotBrain("${mode}"`);
  assert(scoutingPos >= 0 && memoryPos > scoutingPos, `${file}: le dossier long terme doit être appliqué avant la mémoire intra-match`);
}

const ui = read("src/pages/newModes/PremiumPartyModeUi.tsx");
for (const marker of [
  "DOSSIER LONG TERME",
  "scoutingDetail",
  "scoutingMatches",
  "scoutingConfidence",
  "scoutingTarget",
  "party-mode__bot-scouting",
]) assert(ui.includes(marker), `BotTurn UI scouting: ${marker} absent`);

const css = read("src/pages/newModes/PremiumPartyModeUi.css");
for (const marker of [
  "V11 — dossier inter-match",
  "party-mode__bot-scouting",
]) assert(css.includes(marker), `CSS scouting: ${marker} absent`);

console.log("✅ PREMIUM PARTY BOT SCOUTING V11 — mémoire inter-match / dossier adversaire : OK");
