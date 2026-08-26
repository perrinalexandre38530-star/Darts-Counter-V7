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
assert.match(app, /Recherche de la dernière sauvegarde/);

assert.match(autoService, /exportCloudSnapshot\(\{ mediaMirror: "skip" \}\)/);
assert.doesNotMatch(autoService, /pushStoreToNas/);
assert.doesNotMatch(autoService, /nasApi\.pushStoreSnapshot/);

console.log("✅ BACKUP COORDINATOR V62: latest multi-source restore + safe per-match auto backup OK");
