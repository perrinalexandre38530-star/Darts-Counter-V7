import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const presets = read("src/theme/themePresets.ts");
const access = read("src/theme/themeAccess.ts");
const settings = read("src/pages/Settings.tsx");
const catalog = read("src/monetization/catalog.ts");
const themeContext = read("src/contexts/ThemeContext.tsx");

const ids = [
  "arenaDartsPub",
  "arenaChampionship",
  "arenaCyber",
  "arenaStreet",
  "arenaStadiumNight",
  "arenaLuxuryClub",
  "arenaRetroArcade",
  "arenaFireIce",
];

for (const id of ids) {
  assert.ok(presets.includes(`id: "${id}"`), `Preset manquant: ${id}`);
  assert.ok(access.includes(`"${id}"`), `Droit Boutique manquant: ${id}`);
}
assert.ok(settings.includes('label: "ARENAS & AMBIANCES"'), "Pack ARENAS absent de Réglages > Thème.");
assert.ok(settings.includes("VOIR CE PACK DANS LA BOUTIQUE"), "CTA Boutique absent de l'aperçu verrouillé.");
assert.ok(settings.includes('setShopInitialTab("packs")'), "Navigation directe vers l'onglet Packs absente.");
assert.ok(catalog.includes('title: "Pack Arenas & Ambiances"'), "Pack Boutique non renommé.");
assert.ok(themeContext.includes("canUseTheme(id)"), "Le ThemeContext ne protège pas les thèmes payants.");
assert.ok(presets.includes("ambientOverlay") && presets.includes("pageBackground") && presets.includes("cardBackground"), "Extensions visuelles premium incomplètes.");
assert.ok(presets.includes("textureOverlay") && presets.includes("surfaceSheen") && presets.includes("buttonBackground"), "Matières/reliefs premium V2 incomplets.");
assert.ok(settings.includes("Mini vraie page de l'application"), "Aperçu global de l'application absent.");
assert.ok(settings.includes("VALIDER LA VOLÉE") && settings.includes("NAVIGATION") && settings.includes("AVG 3D"), "Le mini-écran ne montre pas assez de surfaces thémées.");
assert.ok(themeContext.includes("--dc-theme-texture") && themeContext.includes("--dc-theme-surface-shadow"), "Variables globales de matière premium absentes.");

console.log("✅ ARENAS & AMBIANCES SHOP REGRESSION OK");
console.log(`   ${ids.length} thèmes premium contrôlés`);
