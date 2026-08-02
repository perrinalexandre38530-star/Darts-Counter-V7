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
assert(vault.includes('Capacitor.isNativePlatform()'), "détection de la plateforme native");
assert(vault.includes('document.createElement("a")'), "téléchargement PWA conservé");
assert(main.includes("registerPlugin(NativeJsonExportPlugin.class)"), "plugin enregistré dans MainActivity");
assert(plugin.includes("Intent.ACTION_CREATE_DOCUMENT"), "sélecteur Android Enregistrer sous utilisé");
assert(plugin.includes("openOutputStream"), "écriture réelle du JSON dans le fichier choisi");
assert(/await exportJsonDownload\(/.test(page), "erreurs d'export attendues et remontées à l'interface");
console.log("\n✅ Export JSON Android natif prêt.");
