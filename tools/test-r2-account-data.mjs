import fs from "node:fs";

const storage = fs.readFileSync(new URL("../src/lib/storage.ts", import.meta.url), "utf8");
const restore = fs.readFileSync(new URL("../src/lib/cloudAutoRestore.ts", import.meta.url), "utf8");
const events = fs.readFileSync(new URL("../src/lib/cloudEvents.ts", import.meta.url), "utf8");
const tournaments = fs.readFileSync(new URL("../src/lib/tournaments/storeLocal.ts", import.meta.url), "utf8");
const babyfoot = fs.readFileSync(new URL("../src/lib/babyfootLeagueStore.ts", import.meta.url), "utf8");
const directR2 = fs.readFileSync(new URL("../src/lib/directR2BackupApi.ts", import.meta.url), "utf8");
const configuredBackup = fs.readFileSync(new URL("../src/lib/configuredBackupNow.ts", import.meta.url), "utf8");
const dartSetsStore = fs.readFileSync(new URL("../src/lib/dartSetsStore.ts", import.meta.url), "utf8");
const userMedia = fs.readFileSync(new URL("../src/lib/userMediaFallback.ts", import.meta.url), "utf8");
const cors = fs.readFileSync(new URL("../functions/api/storage/backups/_middleware.ts", import.meta.url), "utf8");

const checks = [
  [storage.includes("portableAccountData"), "snapshot must include portableAccountData"],
  [storage.includes("avatarGalleries"), "snapshot must include gallery metadata"],
  [storage.includes("legacyAiGallery"), "snapshot must include legacy AI gallery metadata"],
  [storage.includes("restorePortableAccountData"), "restore must import critical account data"],
  [storage.includes("restoreBotsFromSnapshot"), "restore must restore CPU bots"],
  [storage.includes("replaceAllDartSets"), "restore must restore dartsets"],
  [storage.includes("importLocalTournamentsSnapshot"), "restore must restore competitions"],
  [restore.includes("dc_cloud_auto_restore_v2"), "auto restore marker must be V2"],
  [!restore.includes("readNasAccessToken"), "R2 auto restore must not require NAS JWT"],
  [restore.includes("portableAccountData"), "auto restore must consider critical data even without history"],
  [events.includes("queueCloudR2AccountBackup"), "data changes must queue an R2 account snapshot"],
  [tournaments.includes('emitCloudChange("tournaments:changed")'), "tournament changes must queue cloud backup"],
  [babyfoot.includes('emitCloudChange("babyfoot:leagues:changed")'), "baby-foot league changes must queue cloud backup"],
  [directR2.includes("https://darts-counter-v7.pages.dev/api/storage/backups"), "native R2 must use the Cloudflare Pages origin"],
  [directR2.includes("isDirectR2MediaFresh") && userMedia.includes("isDirectR2MediaFresh"), "unchanged media must be skipped before image conversion/upload"],
  [configuredBackup.includes('mediaMirror: "skip"') && configuredBackup.includes('includeEmbeddedMedia: false') && configuredBackup.includes('includeAvatarFallbacks: false') && configuredBackup.includes('uploadCloudVaultSnapshotJson'), "manual R2 save must use the fast non-blocking data-only path"],
  [storage.includes('mediaMirror?: "await" | "background" | "skip"'), "snapshot export must support non-blocking media mirroring"],
  [storage.includes("r2MainMediaKey") && storage.includes("r2ThumbMediaKey"), "portable dartsets must expose explicit R2 image references"],
  [dartSetsStore.includes("mirrorOneDartSetMediaToR2") && dartSetsStore.includes("mediaUpdatedAt"), "imported dartset photos must be mirrored independently from metadata changes"],
  [cors.includes("capacitor://localhost") && cors.includes("host === \"localhost\"") && cors.includes("url.protocol === \"http:\"") && cors.includes("url.protocol === \"https:\"") && cors.includes("Access-Control-Allow-Origin"), "R2 Pages Function must allow Capacitor and local Vite/WebView origins"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  console.error("[r2-account-data] FAILED");
  for (const [, message] of failed) console.error(` - ${message}`);
  process.exit(1);
}
console.log("[r2-account-data] OK");
