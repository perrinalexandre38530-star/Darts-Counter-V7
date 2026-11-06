import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Régression V170 : le moteur de déblocage est GLOBAL, la page galerie
// ne doit plus référencer un callback onPersistUnlocks non destructuré.
const root = process.cwd();
const read = (pathFromRoot) => fs.readFileSync(path.join(root, pathFromRoot), "utf8");
const panel = read("src/components/profile/CollectibleCardsPanel.tsx");
const notifier = read("src/components/GlobalCollectibleUnlockNotifier.tsx");
const app = read("src/App.tsx");
const profiles = read("src/pages/Profiles.tsx");
const cards = read("src/lib/collectibleCards.ts");

assert.match(panel, /const refresh = React\.useCallback\(async \(\) =>/);
assert.match(panel, /\}, \[profileId, scanNonce\]\);/,
  "refresh must depend only on variables it actually uses");
const body = panel.split("const refresh = React.useCallback")[1]?.split("React.useEffect(() => { void refresh()")[0] || "";
assert.doesNotMatch(body, /\bonPersistUnlocks\b/,
  "unbound callback onPersistUnlocks in gallery's refresh scope");
assert.match(panel, /computeCollectibleMetrics\(id\)/,
  "gallery must still compute progress");
assert.match(notifier, /onPersistRef\.current/,
  "global notifier must still persist unlocks");
assert.match(app, /onPersistUnlocks=\{persistGlobalCollectibleUnlocks\}/,
  "global notifier must remain wired to the persistence function");
assert.match(profiles, /onPersistUnlocks=\{onPersistCollectibleUnlocks\}/,
  "gallery hook contract must not change");
for (const id of ["legend_ultra_the_power", "legend_ultra_green_machine", "legend_ultra_the_flying_scotsman"]) {
  assert.ok(cards.includes(`id: "${id}"`), `missing ultra card ${id}`);
}

const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const parsed=ts.transpileModule(panel,{fileName:"CollectibleCardsPanel.tsx",reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
assert.equal((parsed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length, 0,
  "gallery TSX syntax must compile");
console.log("OK V170: galerie Profils sans référence libre, déblocage global maintenu, 3 ultras conservées");
