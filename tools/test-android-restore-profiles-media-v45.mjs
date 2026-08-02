import fs from "node:fs";

const storage = fs.readFileSync(new URL("../src/lib/storage.ts", import.meta.url), "utf8");
const profiles = fs.readFileSync(new URL("../src/pages/Profiles.tsx", import.meta.url), "utf8");
const media = fs.readFileSync(new URL("../src/lib/userMediaFallback.ts", import.meta.url), "utf8");
const homeCard = fs.readFileSync(new URL("../src/components/home/ActiveProfileCard.tsx", import.meta.url), "utf8");
const vault = fs.readFileSync(new URL("../src/pages/StorageVaultPage.tsx", import.meta.url), "utf8");

const shadowBlock = storage.match(/function isOnlineShadowProfile\([\s\S]*?\n\}/)?.[0] || "";
const uiMirrorBlock = profiles.match(/function isMirrorProfile\([\s\S]*?\n\}/)?.[0] || "";
const portableRestoreBlock = storage.match(/async function restorePortableAccountData\([\s\S]*?\n\}/)?.[0] || "";
const importBlock = storage.match(/export async function importCloudSnapshot\([\s\S]*?\n\}/)?.[0] || "";
const legacyMediaBlock = media.match(/async function importLegacyMediaFromSnapshot\([\s\S]*?\n\}/)?.[0] || "";
const exportBlock = storage.match(/export async function exportCloudSnapshot\([\s\S]*?\n\}\n\nexport async function importCloudSnapshot/)?.[0] || "";

const checks = [
  [shadowBlock.includes('id.startsWith("online:")'), "online:* mirror IDs must still be filtered"],
  [!shadowBlock.includes("p?.source") && !shadowBlock.includes("p?.origin") && !shadowBlock.includes("p?.isOnlineMirror"), "restore must not delete local profiles because of stale online markers"],
  [uiMirrorBlock.includes('startsWith("online:")') && !uiMirrorBlock.includes("p.source") && !uiMirrorBlock.includes("p.origin") && !uiMirrorBlock.includes("p.isOnlineMirror"), "Profiles UI must show restored local profiles with stale online markers"],
  [storage.includes("normalizeRestoredLocalProfileMarkers") && storage.includes("delete next.source") && storage.includes("delete next.origin"), "restore must clean stale online markers on local profile IDs"],
  [portableRestoreBlock.includes("restoredDartSetsForRuntime") && portableRestoreBlock.includes("replaceAllDartSets(restoredDartSetsForRuntime"), "portable restore must keep hydrated dartset images"],
  [importBlock.includes("importUserMediaFromSnapshot(dump)"), "restore must scan legacy snapshots for embedded media"],
  [importBlock.includes("hydrateStoreUserMedia({ dartSets: canonical })"), "final dartset write must hydrate media before replacing the canonical store"],
  [legacyMediaBlock.includes("portableAccountData") || media.includes("push(snapshot?.portableAccountData)"), "legacy media scan must include portableAccountData"],
  [media.includes("mediaAssetUrl(set?.mainImageAssetId") && media.includes("mediaAssetUrl(d?.mainImageAssetId"), "dartset media restore must recover NAS asset IDs"],
  [exportBlock.includes("includeEmbeddedMedia !== false") && exportBlock.includes("await captureStoreUserMedia"), "full NAS/local/file backups must await local media capture"],
  [homeCard.includes("profile={profile as any}"), "HOME must pass the full active profile so avatar fallback can resolve by profile id"],
  [vault.includes("actualProfiles") && vault.includes("expectedProfiles"), "restore page must verify profiles actually reloaded"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  console.error("[android-restore-profiles-media-v47] FAILED");
  for (const [, message] of failed) console.error(` - ${message}`);
  process.exit(1);
}

console.log("[android-restore-profiles-media-v47] OK");
