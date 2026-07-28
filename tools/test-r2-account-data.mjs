import fs from "node:fs";

const storage = fs.readFileSync(new URL("../src/lib/storage.ts", import.meta.url), "utf8");
const restore = fs.readFileSync(new URL("../src/lib/cloudAutoRestore.ts", import.meta.url), "utf8");
const events = fs.readFileSync(new URL("../src/lib/cloudEvents.ts", import.meta.url), "utf8");
const tournaments = fs.readFileSync(new URL("../src/lib/tournaments/storeLocal.ts", import.meta.url), "utf8");
const babyfoot = fs.readFileSync(new URL("../src/lib/babyfootLeagueStore.ts", import.meta.url), "utf8");
const directR2 = fs.readFileSync(new URL("../src/lib/directR2BackupApi.ts", import.meta.url), "utf8");
const configuredBackup = fs.readFileSync(new URL("../src/lib/configuredBackupNow.ts", import.meta.url), "utf8");
const cloudAccountBackup = fs.readFileSync(new URL("../src/lib/cloudAccountBackup.ts", import.meta.url), "utf8");
const dartSetsStore = fs.readFileSync(new URL("../src/lib/dartSetsStore.ts", import.meta.url), "utf8");
const userMedia = fs.readFileSync(new URL("../src/lib/userMediaFallback.ts", import.meta.url), "utf8");
const cors = fs.readFileSync(new URL("../functions/api/storage/backups/_middleware.ts", import.meta.url), "utf8");
const viteConfig = fs.readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
const serverConfig = fs.readFileSync(new URL("../src/lib/serverConfig.ts", import.meta.url), "utf8");
const backendServer = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
const profileAvatar = fs.readFileSync(new URL("../src/components/ProfileAvatar.tsx", import.meta.url), "utf8");
const avatarR2Fallback = fs.readFileSync(new URL("../src/lib/avatarR2Fallback.ts", import.meta.url), "utf8");
const bots = fs.readFileSync(new URL("../src/lib/bots.ts", import.meta.url), "utf8");
const authGuard = fs.readFileSync(new URL("../src/lib/authSessionGuard.ts", import.meta.url), "utf8");
const onlineSessionFix = fs.readFileSync(new URL("../src/lib/onlineSessionFix.ts", import.meta.url), "utf8");

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
  [viteConfig.includes("strictPort: true"), "Vite must refuse a silent fallback from localhost:5173 to another storage origin"],
  [viteConfig.includes('"/api/backend"') && viteConfig.includes("api.multisports-api.fr"), "Vite must proxy legacy backend/media calls same-origin in development"],
  [serverConfig.includes("resolveRuntimeMediaUrl") && serverConfig.includes("/api/backend"), "legacy /media URLs must be rewritten through the Pages/backend proxy"],
  [userMedia.includes("resolveRuntimeMediaUrl(value)") && userMedia.includes("fetch(runtimeValue"), "media fallback capture must not fetch the NAS media origin directly"],
  [dartSetsStore.includes("resolveRuntimeMediaUrl") && bots.includes("resolveRuntimeMediaUrl") && profileAvatar.includes("resolveRuntimeMediaUrl"), "dartsets, bots and profile avatars must share the resilient media route"],
  [restore.includes("marqueur ignoré : état local incomplet") && restore.includes("localAfterRestore") && restore.includes("expectedProfiles"), "R2 auto restore marker must self-heal when local profiles are missing"],
  [backendServer.includes("localhost|127\\.0\\.0\\.1") || backendServer.includes("localhost|127\.0\.0\.1"), "legacy backend CORS must tolerate local diagnostic ports"],
  [cloudAccountBackup.includes("getCachedLocalProfilesForSafety") && cloudAccountBackup.includes("Sauvegarde R2 automatique bloquée"), "automatic R2 backup must refuse a partial/empty local profile state"],
  [avatarR2Fallback.includes("resolveRuntimeMediaUrl") && avatarR2Fallback.includes("fetch(runtimeValue"), "avatar R2 recovery must not fetch legacy NAS media cross-origin"],
  [authGuard.includes("isSensitiveAuthStorageKey") && authGuard.includes("dc-supabase-auth-v2:") && authGuard.includes("sb-.*-auth-token"), "Supabase/NAS auth keys must be classified as non-backup data"],
  [storage.includes("isSensitiveAuthStorageKey(key)") && storage.includes("mirrorR2: false") && storage.includes("mirrorR2: true"), "routine store saves must stay local while cloud export owns R2 media mirroring"],
  [directR2.includes("isFreshSupabaseAccessToken") && directR2.includes("directTokenPromise") && directR2.includes("DIRECT_AUTH_REJECT_COOLDOWN_MS"), "R2 requests must reject expired tokens and coalesce/cool down auth failures"],
  [userMedia.includes("canAttemptDirectR2FromStoredSession") && userMedia.includes("opts: { mirrorR2?: boolean }"), "media fallback must not hammer R2 without a fresh cloud session"],
  [cloudAccountBackup.includes("canAttemptDirectR2FromStoredSession") && cloudAccountBackup.includes("sans JWT frais"), "automatic account backup must not run from a stale local user id alone"],
  [restore.includes("/^dc-supabase-auth-v2:/i") && restore.includes("/^sb-.*-auth-token$/i"), "cloud restore must preserve the current dynamic Supabase session keys"],
  [onlineSessionFix.includes("isInvalidRefreshSessionError") && onlineSessionFix.includes("clearSupabaseBrowserAuthStorage"), "invalid refresh tokens must be purged instead of rehydrated forever"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  console.error("[r2-account-data] FAILED");
  for (const [, message] of failed) console.error(` - ${message}`);
  process.exit(1);
}
console.log("[r2-account-data] OK");
