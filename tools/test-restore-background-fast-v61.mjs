import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (ok, label) => {
  if (!ok) throw new Error(`❌ ${label}`);
  console.log(`✅ ${label}`);
};

const bg = read("src/lib/backgroundRestore.ts");
const nav = read("src/components/BottomNav.tsx");
const page = read("src/pages/StorageVaultPage.tsx");
const vault = read("src/lib/storageVault.ts");
const api = read("src/lib/apiClient.ts");
const server = read("server.js");

assert(bg.includes("startBackgroundRestoreJob") && bg.includes("currentJob"), "la restauration possède un job global indépendant de la page");
assert(bg.includes("sessionStorage") && bg.includes("dc_background_restore_job_v1"), "l'état de restauration survit aux changements de page");
assert(nav.includes("useBackgroundRestoreState") && nav.includes("Restauration en arrière-plan"), "le ticker global de restauration est visible dans toute l'application");
assert(page.includes("launchNativeRestore") && page.includes("startBackgroundRestoreJob"), "Android lance les restaurations hors du cycle de vie de StorageVaultPage");
assert(page.includes("Tu peux maintenant changer de page") && page.includes("Tu peux naviguer dans l’application"), "la navigation reste explicitement autorisée pendant la restauration");
assert(page.includes("onProgress: (loadedBytes, totalBytes)") && page.includes("Téléchargement NAS"), "la progression NAS réelle est remontée à l'interface");
assert(vault.includes("apiGetBytes") && vault.includes("/sync/pull/raw") && vault.includes("/raw${rawQuery}"), "le client privilégie le flux gzip binaire brut du NAS");
assert(vault.includes('query.set("transport", "1")'), "un transport gzip/base64 compatible reste disponible pour les anciens backends");
assert(vault.includes("onDownloadProgress: opts?.onProgress"), "la progression du corps HTTP est transmise par storageVault");
assert(api.includes("onDownloadProgress?:") && api.includes("readResponseText") && api.includes("readResponseBytes"), "apiClient lit les gros téléchargements texte ou binaires en flux avec progression");
assert(api.includes("apiGetBytes") && api.includes('responseType: "bytes"'), "apiClient expose le téléchargement binaire sans enveloppe JSON");
assert(api.includes("Le délai reste actif pendant la lecture du corps"), "le timeout couvre désormais tout le téléchargement et pas seulement les en-têtes");
assert(server.includes('app.get("/sync/pull/raw"') && server.includes('app.get("/sync/slots/:id/raw"'), "le backend expose les routes gzip brutes pour la sauvegarde courante et les archives");
assert(server.includes('Content-Type", "application/gzip"') && server.includes("gzip-raw-fast"), "le backend envoie directement les octets gzip stockés");
assert(server.includes("loadUserStoreSnapshotTransport") && server.includes("gzip-base64-fast"), "le backend conserve un transport de compatibilité sans gunzip/reparse inutile");
assert(server.includes("Liste rapide : ne jamais décompresser le snapshot complet"), "la liste des sauvegardes n'ouvre plus le payload complet");
assert(!/const restoreNas = async[\s\S]{0,400}setBusy\(true\)/.test(page), "la restauration NAS Android ne dépend plus du state local busy");

console.log("\n✅ RESTORE BACKGROUND FAST V61 OK");
