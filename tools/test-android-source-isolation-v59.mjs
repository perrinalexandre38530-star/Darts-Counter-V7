import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cloud = fs.readFileSync(path.join(root, "src/lib/cloudAutoRestore.ts"), "utf8");
const storage = fs.readFileSync(path.join(root, "src/lib/storage.ts"), "utf8");
const vault = fs.readFileSync(path.join(root, "src/pages/StorageVaultPage.tsx"), "utf8");

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(cloud.includes("Capacitor.isNativePlatform() && opts?.explicitManual !== true"), "Android bloque la restauration R2 automatique au démarrage");
assert(cloud.includes("restauration R2 automatique désactivée"), "Le diagnostic Android explique le blocage volontaire");
assert(cloud.indexOf("Capacitor.isNativePlatform()") < cloud.indexOf("ensureCloudHistoryAutoSync(uid)"), "Le garde-fou s'exécute avant toute fusion d'historique R2");
assert(storage.includes("currentAccountStoreAliases"), "Les alias Supabase/NAS du même compte sont regroupés");
assert(storage.includes("const simpleScope = key.match(/^store:([^:]+)$/)?.[1]"), "Les clés store récursives sont exclues du choix canonique");
assert(storage.includes("best.profiles.length > currentProfiles.length"), "Un store scopé existant mais incomplet est réparé");
assert(storage.includes("store scopé enrichi depuis la source locale canonique"), "La réparation est traçable dans les logs");

const restoreStart = vault.indexOf("const restoreSnapshotIntoBrowserAndAccount");
const restoreEnd = vault.indexOf("const restoreSingleMatch", restoreStart);
const restoreBlock = vault.slice(restoreStart, restoreEnd);
const nativeBranchStart = restoreBlock.indexOf("// ANDROID SOURCE UNIQUE V59:");
const nativeBranch = restoreBlock.slice(nativeBranchStart);
assert(restoreBlock.includes("if (!Capacitor.isNativePlatform())"), "Le comportement PWA existant reste inchangé");
assert(!nativeBranch.includes("pushSnapshotToAccount(snapshot, reason)"), "Android ne renvoie plus immédiatement 54 Mo vers le NAS");
assert(!nativeBranch.includes("uploadCurrentSnapshotToCloudVault"), "Android ne crée plus automatiquement une nouvelle copie R2 après restauration");
assert(!nativeBranch.includes("window.location.reload()"), "Android ne force plus de reload WebView");
assert(nativeBranch.includes("État appliqué sans rechargement"), "La confirmation Android indique que l'état vivant a été appliqué");

console.log("\n✅ ANDROID SOURCE ISOLATION V59 OK");
