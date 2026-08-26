import fs from "node:fs";
import assert from "node:assert/strict";

const read = (p) => fs.readFileSync(p, "utf8");
const coordinator = read("src/lib/backup/accountBackupCoordinator.ts");
const configured = read("src/lib/configuredBackupNow.ts");
const completed = read("src/lib/completedMatchAutoBackup.ts");
const history = read("src/lib/history.ts");
const cloudRestore = read("src/lib/cloudAutoRestore.ts");
const autoService = read("src/lib/backup/autoBackupService.ts");
const app = read("src/App.tsx");
const login = read("src/pages/AuthV7Login.tsx");
const authHook = read("src/hooks/useAuthOnline.tsx");
const onlineApi = read("src/lib/onlineApi.ts");
const directR2 = read("src/lib/directR2BackupApi.ts");
const storage = read("src/lib/storage.ts");

assert.match(coordinator, /scanLocal\(uid\)/);
assert.match(coordinator, /source: "nas"/);
assert.match(coordinator, /source: "r2"/);
assert.match(coordinator, /source: "external"/);
assert.match(coordinator, /pickLatestBackupCandidate/);
assert.match(coordinator, /slot\.source === "before-restore"/);
assert.match(coordinator, /Sécurité avant restauration automatique/);
assert.match(coordinator, /await importCloudSnapshot\(payload, \{ mode: "replace" \}\)/);
assert.match(coordinator, /await importCloudSnapshot\(safetySnapshot, \{ mode: "replace" \}\)/);
assert.match(coordinator, /getPrivateNasCapability/);
assert.match(coordinator, /switchAccountInfrastructure/);

assert.match(configured, /const keepLocalSafety = automatic \|\| prefs\.keepLocalSafetyCopy/);
assert.match(configured, /await createSafetyCopy\(/);
assert.match(configured, /destination === "personal_cloud_manual"/);
assert.match(configured, /requestPermission: false/);
assert.match(configured, /backupTail/);

assert.match(history, /queueCompletedMatchAutoBackup/);
assert.match(history, /inferHistoryStatus\(safe\) === "finished"/);
assert.match(history, /activeStatuses\.has\(rawStatus\)/);
assert.match(cloudRestore, /legacyR2AutoRestoreForDiagnostics/);
assert.match(cloudRestore, /return restoreLatestBackupForSignedInUser\(userId/);
assert.doesNotMatch(history, /triggerAutoBackupIfEnabled\(\)/);
assert.match(completed, /match-end-auto:/);
assert.match(completed, /RETRY_MS/);

assert.match(cloudRestore, /restoreLatestBackupForSignedInUser/);
assert.doesNotMatch(app, /Recherche de la dernière sauvegarde/);
assert.doesNotMatch(login, /maybeAutoRestoreCloudForSignedInUser/);
assert.match(authHook, /shouldSearchBackupsForUser/);
assert.match(authHook, /searchBackupsInBackground/);
assert.doesNotMatch(authHook, /tryBridgeLocalProfile/);
assert.match(app, /loadedStoreScopeRef\.current !== uid/);
assert.match(app, /if \(accountChanged\) setStore\(\{ \.\.\.initialStore \}\)/);
assert.match(coordinator, /inFlightByUser/);
assert.doesNotMatch(coordinator, /let inFlight: Promise<boolean>/);
assert.match(coordinator, /accountStillActive/);
assert.match(coordinator, /payloadHasExplicitOwner/);
assert.match(coordinator, /accountScoped/);
assert.match(onlineApi, /rawHash\.startsWith\("#\/auth\/callback"\)/);
assert.match(onlineApi, /clearStaleAccountCredentialsForSupabaseUser/);
assert.match(directR2, /tokenMatchesCurrentAccount/);
assert.match(directR2, /directTokenPromisesByAccount/);
assert.match(directR2, /const accountKey = currentStorageAccountId\(\)/);
assert.match(storage, /backupManifest/);
assert.match(storage, /userId: ownerId \|\| null/);

assert.match(autoService, /exportCloudSnapshot\(\{ mediaMirror: "skip" \}\)/);
assert.doesNotMatch(autoService, /pushStoreToNas/);
assert.doesNotMatch(autoService, /nasApi\.pushStoreSnapshot/);

console.log("✅ BACKUP COORDINATOR: isolation compte + restore arrière-plan + auto backup fin de partie OK");
