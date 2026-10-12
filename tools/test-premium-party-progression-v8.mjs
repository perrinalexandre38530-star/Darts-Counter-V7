import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const progress = read("src/lib/premiumPartyProgress.ts");
const ui = read("src/pages/newModes/PremiumPartyModeUi.tsx");
const css = read("src/pages/newModes/PremiumPartyModeUi.css");
const summary = read("src/pages/DartsModeSummaryPage.tsx");

for (const mode of ["castle", "gotcha", "hare_hounds", "pendu", "menteur"]) {
  assert(progress.includes(`${mode}: [`), `Progression: définitions ${mode} absentes`);
}
for (const marker of ["first_win", "veteran_10", "winner_5", "processedMatchIds", "commitPremiumPartyProgress", "NOUVEAUX BADGES & RECORDS"]) {
  assert(progress.includes(marker) || ui.includes(marker), `Marqueur progression absent: ${marker}`);
}
assert(ui.includes("progression?.unlocks?.length"), "PremiumEndPanel n'affiche pas les déblocages");
assert(ui.includes("progression?.winnerCareer"), "PremiumEndPanel n'affiche pas la carrière du vainqueur");
assert(css.includes("party-mode-end__progress"), "CSS progression absent");
assert(css.includes("party-mode-end__career"), "CSS carrière absent");
assert(summary.includes("ProgressionSummaryBlock"), "Historique détaillé: bloc progression absent");
assert(summary.includes("BADGE DÉBLOQUÉ") && summary.includes("NOUVEAU RECORD"), "Historique détaillé: badges/records absents");

const plays = {
  castle: "src/pages/CastlePlay.tsx",
  gotcha: "src/pages/GotchaPlay.tsx",
  hare_hounds: "src/pages/HareHoundsPlay.tsx",
  pendu: "src/pages/PenduPlay.tsx",
  menteur: "src/pages/MenteurPlay.tsx",
};
for (const [mode, file] of Object.entries(plays)) {
  const src = read(file);
  assert(src.includes('commitPremiumPartyProgress'), `${file}: commit progression absent`);
  assert(src.includes(`mode: "${mode}"`), `${file}: mode progression ${mode} absent`);
  assert(src.includes('processedMatchIds') || progress.includes('processedMatchIds'), `${file}: dédup progression non protégée`);
  assert(src.includes('summary: progress') || src.includes('progression: progress'), `${file}: progression non persistée dans History`);
  assert(src.includes('progression={progression ?'), `${file}: progression non affichée en fin de partie`);
}

console.log("✅ PREMIUM PARTY PROGRESSION V8 — records / badges / carrière : OK");
