import fs from "node:fs";

const storage = fs.readFileSync(new URL("../src/lib/storage.ts", import.meta.url), "utf8");
const homeCard = fs.readFileSync(new URL("../src/components/home/ActiveProfileCard.tsx", import.meta.url), "utf8");
const vault = fs.readFileSync(new URL("../src/pages/StorageVaultPage.tsx", import.meta.url), "utf8");

const shadowBlock = storage.match(/function isOnlineShadowProfile\([\s\S]*?\n\}/)?.[0] || "";
const exportBlock = storage.match(/export async function exportCloudSnapshot\([\s\S]*?\n\}\n\nexport async function importCloudSnapshot/)?.[0] || "";

const checks = [
  [shadowBlock.includes('id.startsWith("online:")'), "online mirror IDs must still be filtered"],
  [!shadowBlock.includes('if (p?.isOnline === true) return true;'), "local profiles must not be deleted only because isOnline=true"],
  [shadowBlock.includes("isOnlineMirror") && shadowBlock.includes("source") && shadowBlock.includes("origin"), "only explicit online mirrors must be filtered"],
  [exportBlock.includes("includeEmbeddedMedia !== false") && exportBlock.includes("await captureStoreUserMedia"), "full NAS/local/file backups must await local media capture"],
  [exportBlock.includes("bots: loadStoredBots()") && exportBlock.includes("dartSets: getAllDartSets()") && exportBlock.includes("teams: loadStoredTeams()"), "media capture must include canonical bots, dartsets and teams"],
  [homeCard.includes("profile={profile as any}") && !homeCard.includes('dataUrl={(profile as any).avatarDataUrl ?? (profile as any).avatarUrl'), "HOME must pass the full active profile so avatar fallback can resolve by profile id"],
  [vault.includes("importReport = await importCloudSnapshot") && vault.includes("actualProfiles") && vault.includes("expectedProfiles"), "restore page must verify profiles actually reloaded"],
  [vault.includes("La sauvegarde distante n'a pas été réécrite"), "incomplete restores must not overwrite the remote backup"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  console.error("[android-restore-profiles-media-v45] FAILED");
  for (const [, message] of failed) console.error(` - ${message}`);
  process.exit(1);
}

console.log("[android-restore-profiles-media-v45] OK");
