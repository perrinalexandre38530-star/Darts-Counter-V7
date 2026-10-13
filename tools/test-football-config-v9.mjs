import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const config = read("src/pages/FootballConfig.tsx");
const presets = read("src/lib/footballPresetStore.ts");

const expect = (condition, message) => {
  if (!condition) throw new Error(`DARTS FOOTBALL V9: ${message}`);
};

expect(config.includes("FOOTBALL_BUILTIN_PRESETS"), "profils intégrés non câblés");
expect(config.includes("loadFootballCustomPresets"), "presets personnels non chargés");
expect(config.includes("saveFootballCustomPreset"), "sauvegarde presets personnels absente");
expect(config.includes("teamOverlapIds"), "garde-fou équipes absent");
expect(config.includes("MEMBRE PRÉSENT DANS LES 2 ÉQUIPES"), "message de conflit équipes absent");
expect(config.includes("activeCustom?.name || activeBuiltin?.title || \"Personnalisé\""), "résumé de profil absent");

for (const id of ["express", "standard", "cup", "tactical", "arcade", "simulation"]) {
  expect(presets.includes(`id: \"${id}\"`), `profil ${id} absent`);
}
expect(presets.includes("FOOTBALL_CUSTOM_PRESET_LIMIT = 3"), "limite de 3 presets absente");
expect(presets.includes("footballRulesMatchPreset"), "détection de profil actif absente");

console.log("DARTS FOOTBALL V9 config/presets: OK");
