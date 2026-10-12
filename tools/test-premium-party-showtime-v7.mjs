import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const ui = read("src/pages/newModes/PremiumPartyModeUi.tsx");
const moments = read("src/pages/newModes/premiumPartyMoments.ts");
const css = read("src/pages/newModes/PremiumPartyModeUi.css");

assert(ui.includes("PremiumMomentOverlay"), "PremiumMomentOverlay absent");
assert(ui.includes("INTENTION IA"), "BotTurn n'affiche pas l'intention IA");
assert(ui.includes("confidence"), "BotTurn n'affiche pas la confiance IA");
assert(css.includes("party-mode-moment"), "CSS des moments forts absent");
assert(css.includes("party-mode__bot-intent"), "CSS intention IA absent");

const modes = {
  castle: "src/pages/CastlePlay.tsx",
  gotcha: "src/pages/GotchaPlay.tsx",
  hare_hounds: "src/pages/HareHoundsPlay.tsx",
  pendu: "src/pages/PenduPlay.tsx",
  menteur: "src/pages/MenteurPlay.tsx",
};
for (const [mode, file] of Object.entries(modes)) {
  const src = read(file);
  assert(src.includes("PremiumMomentOverlay"), `${file}: overlay moment absent`);
  assert(src.includes(`resolvePremiumPartyMoment("${mode}"`), `${file}: résolution moment ${mode} absente`);
  assert(src.includes(`premiumBotIntent("${mode}"`), `${file}: intention IA ${mode} absente`);
  assert(src.includes("premiumBotConfidence(config.botLevel)"), `${file}: confiance BOT absente`);
  assert(src.includes("setMoment(null)"), `${file}: reset moment absent`);
  const awardCount = (src.match(/label:/g) || []).length;
  assert(awardCount >= 4, `${file}: récompenses de fin insuffisantes`);
}

for (const token of [
  "ASSAUT", "GOTCHA !", "CAPTURE", "ÉLIMINATION", "MENSONGE DÉMASQUÉ",
  "ATTRIBUTION DU SECTEUR", "PIÈGE GOTCHA", "FUITE MAXIMALE", "SURVIE — ZÉRO ERREUR", "DÉTECTER LE BLUFF"
]) assert(moments.includes(token), `premiumPartyMoments: ${token} absent`);

console.log("✅ PREMIUM PARTY SHOWTIME V7 — moments / transitions / IA / awards : OK");
