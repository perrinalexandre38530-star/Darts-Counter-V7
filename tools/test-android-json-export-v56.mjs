import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
};

const vault = read("src/lib/storageVault.ts");
const page = read("src/pages/StorageVaultPage.tsx");
const main = read("android/app/src/main/java/com/multisportsscoring/app/MainActivity.java");
const plugin = read("android/app/src/main/java/com/multisportsscoring/app/NativeJsonExportPlugin.java");

assert(vault.includes('registerPlugin<NativeJsonExportPlugin>("NativeJsonExport")'), "plugin Android appelé depuis le frontend");
assert(vault.includes("ANDROID_JSON_CHUNK_CHARS = 64 * 1024"), "taille de bloc limitée pour protéger la WebView");
assert(vault.includes("beginJsonExport"), "sélecteur Android ouvert avant le transfert");
assert(vault.includes("appendJsonChunk"), "JSON envoyé par blocs au pont Capacitor");
assert(vault.includes("finishJsonExport"), "export natif finalisé explicitement");
assert(vault.includes("abortJsonExport"), "session native annulée en cas d'erreur");
assert(vault.includes("splitSurrogatePair"), "les caractères Unicode ne sont pas coupés entre deux blocs");
assert(vault.includes('document.createElement("a")'), "téléchargement PWA conservé");
assert(main.includes("registerPlugin(NativeJsonExportPlugin.class)"), "plugin enregistré dans MainActivity");
assert(plugin.includes("Intent.ACTION_CREATE_DOCUMENT"), "sélecteur Android Enregistrer sous utilisé");
assert(plugin.includes("ConcurrentHashMap"), "sessions d'export natives isolées");
assert(plugin.includes("session.output.write(bytes)"), "écriture progressive dans le fichier choisi");
assert(plugin.includes("index != session.nextIndex"), "ordre des blocs contrôlé");
assert(plugin.includes("session.output.flush()"), "fichier finalisé et vidé sur disque");
assert(!plugin.includes('call.getString("content")'), "le JSON complet ne traverse plus le pont Capacitor");
assert(/await exportJsonDownload\(/.test(page), "erreurs d'export remontées à l'interface");

console.log("\n✅ Export JSON Android par blocs prêt.");
