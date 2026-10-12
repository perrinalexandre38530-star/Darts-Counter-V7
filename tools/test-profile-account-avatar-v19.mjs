import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const app = read("src/App.tsx");
const profiles = read("src/pages/Profiles.tsx");
const avatar = read("src/components/ProfileAvatar.tsx");
const bridge = read("src/lib/accountBridge.ts");
const online = read("src/lib/onlineApi.ts");
const migration = read("supabase/migrations/20261012160000_account_avatars_bucket.sql");

const checks = [
  ["global avatar monotonic guard", app.includes("protectNewerProfileAvatars") && app.includes("setStoreRaw")],
  ["remote canonical profile id sync", app.includes("canonicalLocalProfileId") && app.includes("canonicalProfileRemoteSyncRef")],
  ["App imports canonical profile resolver", app.includes('import { getCanonicalAccountProfileFromStore } from "./lib/canonicalAccountProfile";')],
  ["new device reuses remote canonical id", bridge.includes("getRemoteCanonicalLocalProfileId") && bridge.includes("remoteCanonicalId || uid")],
  ["profile bridge writes canonical id", bridge.includes("canonicalLocalProfileId: String(merged?.id")],
  ["valid public Supabase avatar URL allowed", avatar.includes("/object/public") && avatar.includes("anciennes URLs d'endpoint d'upload")],
  ["storage path always auth uid", online.includes("const folder = String(user.id")],
  ["inline remote fallback when bucket missing", profiles.includes("avatar-online-inline-fallback-ok") && profiles.includes("avatarUrl: thumbDataUrl")],
  ["avatars bucket migration", migration.includes("values(\n  'avatars'") && migration.includes("avatars_user_insert")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} contrôles V19 OK`);
