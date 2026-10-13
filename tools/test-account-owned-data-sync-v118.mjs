import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const sync = read("src/lib/accountOwnedSync.ts");
const migration = read("supabase/migrations/20261013091500_account_owned_data_sync_v1.sql");
const bots = read("src/lib/bots.ts");
const teams = read("src/lib/petanqueTeamsStore.ts");
const teamsLegacy = read("src/lib/teamsStore.ts");
const statsLite = read("src/lib/statsLiteIDB.ts");
const statsIndex = read("src/lib/stats/rebuildStatsFromHistory.ts");
const storage = read("src/lib/storage.ts");
const history = read("src/lib/history.ts");
const app = read("src/App.tsx");
const orgService = read("src/organizations/organizationService.ts");

const tests = [];
const add = (name, ok) => tests.push([name, !!ok]);

add("private account_sync_documents table exists with auth.uid owner RLS",
  migration.includes("create table if not exists public.account_sync_documents") &&
  migration.includes("owner_user_id = auth.uid()") &&
  migration.includes("grant select, insert, update, delete on table public.account_sync_documents to authenticated") &&
  migration.includes("revoke all on table public.account_sync_documents from anon"));

add("account-owned table is published to Supabase Realtime",
  migration.includes("alter publication supabase_realtime add table public.account_sync_documents"));

add("sync service covers local profiles, bots, teams, gallery, stats, org workspace and history",
  ["local_profiles", "bots", "teams", "avatar_gallery", "stats_index", "stats_sources", "organization_workspace", "history_match"]
    .every((token) => sync.includes(`\"${token}\"`)));

add("canonical account profile is excluded from local-profile documents",
  sync.includes("isCanonicalAccountProfile") &&
  sync.includes(".filter((profile) => profile && !isCanonicalAccountProfile(profile, userId))"));

add("heavy images stay out of Supabase and are rehydrated from the media vault/R2",
  sync.includes("isInlineImage(value) ? null : value") &&
  sync.includes("resolveUserMediaFallback(profileAvatarMediaKey") &&
  sync.includes("resolveUserMediaFallback(botAvatarMediaKey") &&
  sync.includes("resolveUserMediaFallback(teamLogoMediaKey") &&
  sync.includes("resolveUserMediaFallback(galleryItemMediaKey"));

add("custom bots are account-scoped and no longer scan galleries of other users",
  bots.includes("botsMetaStorageKey") && bots.includes("accountScopedLocalStorageKey") &&
  bots.includes("readAvatarGallery(getAccountScopeId())") &&
  !bots.includes('if (!key.startsWith("dc_avatar_gallery_v1:")) continue;'));

add("both team stores are account-scoped",
  teams.includes("teamsStorageKey") && teams.includes("accountScopedLocalStorageKey") &&
  teamsLegacy.includes("teamsStorageKey") && teamsLegacy.includes("accountScopedLocalStorageKey"));

add("stats lite/quick caches are account-scoped",
  statsLite.includes("getAccountLocalStorageItem(KEY)") &&
  statsLite.includes("setAccountLocalStorageItem(KEY") &&
  statsIndex.includes("getAccountLocalStorageItem(STATS_QUICK_MIRROR_KEY)") &&
  statsIndex.includes("setAccountLocalStorageItem(STATS_DIRTY_KEY"));

add("History emits finished-match mutations and has a no-echo cloud deletion path",
  history.includes("ACCOUNT_HISTORY_LOCAL_CHANGE_EVENT") &&
  history.includes('op: "upsert", record: syncedRecord') &&
  history.includes("removeFromCloud") &&
  history.includes('op: "delete"'));

add("finished History rows are individually synchronized and trigger stats rebuild",
  sync.includes("bootstrapHistory") && sync.includes("DOC.historyMatch") &&
  sync.includes("History.upsertFromCloud") && sync.includes("scheduleStatsIndexRefresh"));

add("supplemental training/sport stats sources are isolated per account",
  sync.includes("activateStatsSourceNamespace") &&
  sync.includes("STATS_SOURCE_OWNER_KEY") &&
  sync.includes("dc_training_x01_full_v1") &&
  sync.includes("dc_territories_history_v1") &&
  sync.includes("pingpong_history") &&
  sync.includes("babyfoot_league_store_v1"));

add("same-tab localStorage changes can wake the account synchronizer",
  storage.includes("ACCOUNT_LOCAL_STORAGE_MUTATION_EVENT") &&
  storage.includes("isAppUserCreatedLocalStorageKey(key)") &&
  sync.includes("ACCOUNT_LOCAL_STORAGE_MUTATION_EVENT"));

add("App starts sync only after the correct auth.uid scoped store is loaded",
  app.includes("startAccountOwnedDataSync") &&
  app.includes("bootStoreLoadedRef.current") &&
  app.includes("loadedStoreScopeRef.current !== uid") &&
  app.includes("applyLocalProfiles"));

add("Supabase profile remains authority for the account identity while only local profiles are replaced",
  app.includes("Le profil COMPTE reste exclusivement piloté par public.profiles") &&
  app.includes("const accountProfiles = current.filter(isAccountProfile)"));

add("organizations keep their existing server model instead of being duplicated as local entities",
  /supabase|rpc|organization/i.test(orgService) &&
  sync.includes("organization_workspace") &&
  !sync.includes('document_type: "organizations"'));

add("Realtime + focus/visibility/online + 30s polling fallback are present",
  sync.includes('"postgres_changes"') &&
  sync.includes('window.addEventListener("focus"') &&
  sync.includes('document.addEventListener("visibilitychange"') &&
  sync.includes('window.addEventListener("online"') &&
  sync.includes("POLL_MS = 30_000"));

let passed = 0;
for (const [name, ok] of tests) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (ok) passed++;
}
console.log(`\n${passed === tests.length ? "✅" : "❌"} Account-owned multi-device sync V118: ${passed}/${tests.length}`);
if (passed !== tests.length) process.exit(1);
