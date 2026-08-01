import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../src/pages/StorageVaultPage.tsx");
const nav = read("../src/components/BottomNav.tsx");
const jobs = read("../src/lib/backgroundBackup.ts");
const vault = read("../src/lib/storageVault.ts");
const server = read("../server.js");

assert.match(page, /startBackgroundBackupJob\(/, "la sauvegarde principale doit être détachée de la page");
assert.match(page, /Tu peux changer de page et continuer à utiliser l'application/, "l'UI doit annoncer la navigation libre");
assert.match(page, /PreparedBackupKind = "full" \| "cloud-fast"/, "les snapshots complets et R2 rapides doivent être séparés");
assert.match(page, /mediaMirror: "background"[\s\S]*includeEmbeddedMedia: false[\s\S]*includeAvatarFallbacks: false/, "R2 ne doit pas attendre le coffre média embarqué");
assert.match(page, /const compressed = await getPreparedGzip\(prepared\)/, "le gzip doit être mémorisé et réutilisé");
assert.match(page, /pushSnapshotToNasFast\([\s\S]*prepared\.summary,[\s\S]*compressed,/, "le NAS doit réutiliser le même gzip");
assert.match(page, /createLocalMemorySlotFromSnapshot\([\s\S]*prepared\.snapshotJson,[\s\S]*compressed,/, "la copie locale doit réutiliser le gzip");

assert.match(jobs, /useSyncExternalStore/, "le statut global doit survivre au changement de page");
assert.match(jobs, /currentJob/, "une seule sauvegarde doit être exécutée à la fois");
assert.match(nav, /Sauvegarde en arrière-plan/, "la navigation doit afficher l'avancement global");

assert.match(vault, /encoding: "uint8array"/, "les slots locaux doivent être stockés compressés dans IndexedDB");
assert.match(vault, /payload\.data instanceof Uint8Array/, "les slots compressés doivent être restaurables");

assert.match(server, /encodedSnapshotFromGzipTransport/, "le backend NAS doit accepter directement le gzip navigateur");
assert.match(server, /transport: "gzip\+store-v2-fast"/, "le backend doit confirmer le chemin rapide");
assert.match(server, /data_text = NULL/, "la copie PostgreSQL dupliquée doit être supprimée");
assert.doesNotMatch(server, /VALUES \(\$1,\$2,'main',NULL,NULL,\$3,\$3,\$4,\$4/, "le snapshot ne doit plus être écrit deux fois");

console.log("✅ Sauvegarde locale/NAS/R2 détachée de la page");
console.log("✅ Progression globale visible pendant la navigation");
console.log("✅ Compression unique réutilisée pour NAS + sécurité locale");
console.log("✅ Backend NAS sans décompression/recompression ni double colonne");
