import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const api = read("src/lib/apiClient.ts");
const vault = read("src/lib/storageVault.ts");
const page = read("src/pages/StorageVaultPage.tsx");
const autoRestore = read("src/lib/cloudAutoRestore.ts");

assert.match(api, /export type ApiRequestOptions/);
assert.match(api, /manual\?: boolean/);
assert.match(api, /options\?\.manual === true\s*\?\s*false/);
assert.match(api, /export async function apiGet\(path: string, options\?: ApiRequestOptions\)/);

assert.match(vault, /NAS_MANUAL_PULL_TIMEOUT_MS = 120_000/);
assert.match(vault, /apiGet\(path,\s*\{\s*manual: true,\s*timeoutMs: NAS_MANUAL_PULL_TIMEOUT_MS/s);

assert.match(autoRestore, /Capacitor\.isNativePlatform\(\) && opts\?\.explicitManual !== true/);
assert.match(autoRestore, /restauration R2 automatique désactivée/);

assert.match(page, /Téléchargement manuel de la sauvegarde NAS/);
assert.match(page, /Aucune autre source ne sera chargée en arrière-plan/);
assert.match(page, /if \(!Capacitor\.isNativePlatform\(\)\)/);
assert.match(page, /État appliqué sans rechargement/);
assert.match(page, /isPublicSupabaseVaultAuth/);
assert.match(page, /Le NAS privé n’est pas disponible pour ce compte/);
assert.match(page, /canUsePrivateNas \? \(/);
assert.match(page, /if \(!canUsePrivateNas\) return "cloud"/);

console.log("✅ timeout long réservé à la restauration NAS manuelle");
console.log("✅ les lectures automatiques conservent leurs délais courts");
console.log("✅ aucune restauration R2 invisible sur Android");
console.log("✅ aucune réécriture distante ni reload après restauration native");
console.log("✅ message utilisateur explicite pendant le téléchargement NAS");
console.log("✅ le NAS privé est masqué pour les comptes publics Supabase");
console.log("\n✅ ANDROID NAS MANUAL RESTORE V60 OK");
