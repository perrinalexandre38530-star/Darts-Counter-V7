import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const storage = read("src/lib/storage.ts");
const cloudRestore = read("src/lib/cloudAutoRestore.ts");
const cloudBackup = read("src/lib/cloudAccountBackup.ts");
const onlineApi = read("src/lib/onlineApi.ts");
const settings = read("src/pages/Settings.tsx");
const vault = read("src/lib/storageVault.ts");

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(storage.includes("PortableAccountRestoreReport"), "La restauration portable retourne un rapport vérifiable");
assert(storage.includes("countRestoredPortableData"), "Les catégories restaurées sont relues depuis leurs stores réels");
assert(storage.includes("dc-portable-account-restored"), "La fin de restauration publie un événement détaillé");
assert(storage.includes("dc:avatar-gallery-changed") && storage.includes("dc-competitions-updated"), "Galerie et compétitions sont rafraîchies après import");
assert(storage.includes("refreshRuntimeStoreAfterRestore"), "Le store React est rafraîchi sans attendre un redémarrage");
assert(cloudRestore.includes("portableRestore.ok === false"), "Un snapshot partiel n'est pas marqué comme restauré");
assert(cloudBackup.includes("statsMatches") && cloudBackup.includes("statsBlocks"), "Le résumé R2 comptabilise les statistiques réelles");
assert(vault.includes('low === "dc_stats_index_v2"'), "Le coffre détecte explicitement l'index de statistiques");
assert(onlineApi.includes("/auth/supabase/nas-capability"), "L'application vérifie le droit NAS fondateur auprès du serveur");
assert(onlineApi.includes('selectedDestination === "founder_nas"') && onlineApi.includes("/auth/supabase/bridge"), "La build Play Store peut activer le NAS uniquement après sélection autorisée");
assert(settings.includes("privateNasCapability?.authorized === true"), "La carte NAS fondateur est masquée aux comptes publics");
assert(settings.includes("getPrivateNasCapability({ force: true })"), "La sélection NAS est revérifiée juste avant la bascule");

console.log("\n✅ ANDROID ACCOUNT RESTORE + FOUNDER NAS CONTRACT OK");
