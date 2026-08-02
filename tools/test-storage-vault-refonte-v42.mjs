import fs from "node:fs";
import assert from "node:assert/strict";

const page = fs.readFileSync(new URL("../src/pages/StorageVaultPage.tsx", import.meta.url), "utf8");
const vault = fs.readFileSync(new URL("../src/lib/storageVault.ts", import.meta.url), "utf8");
const plans = fs.readFileSync(new URL("../src/lib/storagePlans.ts", import.meta.url), "utf8");
const external = fs.readFileSync(new URL("../src/lib/externalBackupTarget.ts", import.meta.url), "utf8");

assert.match(page, /type RestoreSource = BackupProvider \| "local" \| "file"/);
assert.match(page, /selectRemoteRestoreSource\("nas"\)/);
assert.match(page, /selectRemoteRestoreSource\("cloud"\)/);
assert.match(page, /selectLocalRestoreSource/);
assert.match(page, /selectFileRestoreSource/);
assert.match(page, /refresh\(provider\)/);

const resolver = page.match(/const resolveBackupProvider = React\.useCallback\([\s\S]*?\n  \}, \[[^\]]*\]\);/)?.[0] || "";
assert.ok(resolver, "resolveBackupProvider introuvable");
assert.doesNotMatch(resolver, /selectedDestination/);

assert.match(page, /function StorageTickerHeader/);
assert.match(page, />SAUVEGARDE<\/div>/);
assert.match(page, />& RESTAURATION<\/div>/);
assert.doesNotMatch(page, /COMPTE usr_/);
assert.match(page, /\["PARTIES", headerSummary\.matches/);
assert.match(page, /\["PROFILS", headerSummary\.profiles/);
assert.match(page, /\["STATS", headerSummary\.statsMatches \|\| headerSummary\.statsBlocks/);

assert.match(page, /function MiniInfoButton/);
assert.equal((page.match(/<InfoDot/g) || []).length, 1, "InfoDot doit rester uniquement dans le header");
assert.match(page, /function BackupDetailsModal/);
for (const label of ["Images / médias", "Équipes / teams", "Bots", "Dartsets", "Parties avec stats", "RÉPARTITION PAR SPORT ET MODE"]) {
  assert.ok(page.includes(label), `Détail manquant : ${label}`);
}
assert.match(page, /function DestinationSetupModal/);
assert.match(page, /Synology Drive ou QNAP/);
assert.match(page, /partage NAS monté/);
assert.match(page, /TRANSFÉRER VERS UN AUTRE APPAREIL/);
assert.doesNotMatch(page, /MULTI-APPAREILS/);

assert.match(external, /export async function chooseExternalBackupTargetOnly/);
assert.match(plans, /Cloud personnel \/ NAS personnel/);
assert.match(plans, /Carte SD \/ clé USB \/ disque externe/);

for (const field of ["statsMatches", "images", "teams", "bots", "dartsets", "visits", "darts"]) {
  assert.match(vault, new RegExp(`${field}\\??:`), `Champ de résumé manquant : ${field}`);
}

console.log("✅ Refonte sauvegarde V42 : sources de restauration indépendantes");
console.log("✅ Sélecteurs fichier/SD/cloud-NAS personnel câblés");
console.log("✅ Ticker, mini-info et détails complets contrôlés");
console.log("✅ Comptages PARTIES / PROFILS / STATS et métriques avancées présents");
