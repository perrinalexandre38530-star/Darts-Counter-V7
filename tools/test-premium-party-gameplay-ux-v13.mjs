import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const ui = read("src/pages/newModes/PremiumPartyModeUi.tsx");
assert(ui.includes("export function GameplayMission"), "GameplayMission absent");
assert(ui.includes("CE QUE TU DOIS FAIRE"), "kicker gameplay absent");

for (const file of ["CastlePlay.tsx", "GotchaPlay.tsx", "HareHoundsPlay.tsx", "PenduPlay.tsx", "MenteurPlay.tsx"]) {
  const src = read(`src/pages/${file}`);
  assert(src.includes("GameplayMission"), `${file}: bandeau gameplay absent`);
}
const pendu = read("src/pages/PenduPlay.tsx");
for (const marker of ["PenduObjectiveCard", "OBJECTIF ALÉATOIRE", "RÉUSSIS L’OBJECTIF AVANT LA 3E FLÉCHETTE", "Échec : +1 partie du dessin"]) {
  assert(pendu.includes(marker), `PenduPlay: ${marker} absent`);
}
const engine = read("src/lib/gameEngines/penduEngine.ts");
for (const marker of ["kind: \"color\"", "kind: \"parity\"", "kind: \"zone\"", "kind: \"range\"", "kind: \"bed\"", "startRandomRound", "roundNumber"]) {
  assert(engine.includes(marker), `PenduEngine: ${marker} absent`);
}
const cfg = read("src/pages/newModes/NewDartsModeConfig.tsx");
assert(cfg.includes("Rondes aléatoires — recommandé"), "config PENDU rondes aléatoires absente");
assert(cfg.includes("Arcade complet — scores, zones, couleurs, D/T/Bull"), "config paquet arcade absent");

console.log("✅ PREMIUM PARTY GAMEPLAY UX V13 — guidage 5 modes + PENDU arcade : OK");
