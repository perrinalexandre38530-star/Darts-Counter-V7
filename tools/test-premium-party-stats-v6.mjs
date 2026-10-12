import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const hub = read("src/pages/StatsHub.tsx");
const full = read("src/components/stats/PartyModesStatsTabFull.tsx");

for (const mode of ["castle", "gotcha", "hare_hounds", "pendu", "menteur"]) {
  assert(hub.includes(`{ key: "${mode}"`), `StatsHub: onglet ${mode} absent`);
  assert(hub.includes(`initialStatsSubTab`) && hub.includes(`"${mode}"`), `StatsHub: sous-onglet ${mode} non déclaré`);
  assert(full.includes(`${mode}: {`) || full.includes(`mode === "${mode}"`), `PartyModesStatsTabFull: ${mode} absent`);
}

assert(hub.includes('return "castle";'), "classifyRecordMode: CASTLE absent");
assert(hub.includes('return "gotcha";'), "classifyRecordMode: GOTCHA absent");
assert(hub.includes('return "hare_hounds";'), "classifyRecordMode: HARE & HOUNDS absent");
assert(hub.includes("<PartyModesStatsTabFull"), "StatsHub: composant détaillé non rendu");
assert(!hub.includes('"president", "pendu", "menteur", "fifty_one_by_five"'), "ancien bloc générique PENDU/MENTEUR encore actif");

const playFiles = {
  castle: "src/pages/CastlePlay.tsx",
  gotcha: "src/pages/GotchaPlay.tsx",
  hare_hounds: "src/pages/HareHoundsPlay.tsx",
  pendu: "src/pages/PenduPlay.tsx",
  menteur: "src/pages/MenteurPlay.tsx",
};
for (const [mode, file] of Object.entries(playFiles)) {
  const src = read(file);
  assert(src.includes(`initialStatsSubTab: "${mode}"`) || src.includes(`initialStatsSubTab:"${mode}"`), `${file}: bouton STATS ne cible pas ${mode}`);
  assert(src.includes(`mode: "active"`) || src.includes(`mode:"active"`), `${file}: ouverture StatsHub sans mode profil actif`);
  assert(src.includes(`initialStatsSubTab: "history"`) || src.includes(`initialStatsSubTab:"history"`), `${file}: bouton HISTORIQUE non normalisé`);
}

for (const marker of [
  "challengesPassed", "contractsProven", "castleBuilds", "gotchas", "hareSteps",
  "TYPE DE TOUCHES", "IMPACT DU MODE", "HISTORIQUE DE PERFORMANCE"
]) {
  assert(hub.includes(marker) || full.includes(marker), `marqueur stats manquant: ${marker}`);
}

console.log("✅ PREMIUM PARTY STATS V6 — CASTLE / GOTCHA / HARE & HOUNDS / PENDU / MENTEUR : OK");
