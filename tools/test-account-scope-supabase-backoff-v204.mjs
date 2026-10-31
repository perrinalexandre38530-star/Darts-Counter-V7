import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const canonical = read("src/lib/canonicalAccountScope.ts");
const accountScope = read("src/lib/accountScope.ts");
const historyV4 = read("src/lib/historyV4.ts");
const historyCloud = read("src/lib/historyCloud.ts");
const storage = read("src/lib/storage.ts");
const orchestrator = read("src/lib/sync/syncOrchestrator.ts");
const accountSync = read("src/lib/accountOwnedSync.ts");
const offline = read("src/lib/offlineFirstRuntime.ts");
const plans = read("src/lib/storagePlans.ts");
const backup = read("src/lib/matchAutoBackup.ts");
const completedBackup = read("src/lib/completedMatchAutoBackup.ts");
const directR2 = read("src/lib/directR2BackupApi.ts");
const backupCoordinator = read("src/lib/backup/accountBackupCoordinator.ts");
const vault = read("src/lib/storageVault.ts");

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(canonical.includes("getCanonicalAccountScopeId") && canonical.includes("runtimePrimaryAccountScopeId"), "Un résolveur de scope canonique unique existe");
assert(!canonical.includes('localStorage.getItem("dc_user_id")'), "dc_user_id legacy ne peut plus devenir l'autorité de namespace");
assert(canonical.indexOf("runtimePrimaryAccountScopeId()") < canonical.indexOf("stableSupabaseAccountScopeIdFromAuthStorage()"), "Le runtime auth.uid reste prioritaire sur le cache auth");
assert(accountScope.includes("return getCanonicalAccountScopeId();"), "accountScope délègue au résolveur canonique");
assert(historyV4.includes("const uid = getCanonicalAccountScopeId();") && !historyV4.includes("detectHistoryScopeUserId"), "History V4 utilise le scope canonique unique");
assert(historyCloud.includes("const uid = getCanonicalAccountScopeId();") && !historyCloud.includes("detectHistoryScopeUserId"), "History Cloud utilise le même scope que History V4");
assert(storage.includes("const canonical = getCanonicalAccountScopeId();") && storage.includes("stableSupabaseAccountScopeIdFromAuthStorage"), "storage.ts partage le même résolveur Supabase");
assert(orchestrator.includes("return String(getCanonicalAccountScopeId()") && orchestrator.includes('reason: "supabase-circuit-open"'), "Le coordinateur utilise le bon compte et saute account-owned pendant le circuit Supabase");
assert(!accountSync.includes('runAccountOwnedSyncCycle({ reason: "boot"'), "accountOwnedSync ne lance plus un second cycle distant de boot concurrent");
assert(accountSync.includes('reason: "account-owned-ready"') && accountSync.includes('window.dispatchEvent(new CustomEvent("msc:sync-request"'), "Le bridge demande sa passe via l'orchestrateur unique quand il est prêt");
assert(accountSync.includes("await syncCollection(") && accountSync.includes("if (!remotePaused()) await refreshRemoteDocuments();"), "Le reconnect account-owned sérialise profils puis refresh au lieu de lancer deux GET concurrents");
assert(offline.includes("getCanonicalAccountScopeId"), "Le runtime offline utilise le même compte local");
assert(plans.includes("getCanonicalAccountScopeId"), "Les préférences de destination utilisent le même scope");
assert(backup.includes("return getCanonicalAccountScopeId();"), "Les sauvegardes de match utilisent le même owner canonique en fallback");
assert(completedBackup.includes("getCanonicalAccountScopeId") && !completedBackup.includes('localStorage.getItem("dc_storage_user_id_v1") || localStorage.getItem("dc_user_id")'), "Le snapshot automatique post-match utilise le même scope canonique");
assert(directR2.includes("return String(getCanonicalAccountScopeId()"), "Direct R2 valide le token contre le même compte canonique");
assert(backupCoordinator.includes("return String(getCanonicalAccountScopeId()"), "Le coordinateur de restore/backup suit le même compte canonique");
assert(vault.includes("getCanonicalAccountScopeId"), "Le coffre de sauvegarde lit le même owner canonique");

console.log("\n✅ V204 ACCOUNT SCOPE + SUPABASE BACKOFF W3 CONTRACT OK");
