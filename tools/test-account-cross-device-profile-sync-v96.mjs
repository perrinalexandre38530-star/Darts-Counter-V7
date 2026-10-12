import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
function check(label, ok) {
  if (!ok) throw new Error(`❌ ${label}`);
  checks.push(label);
  console.log(`✅ ${label}`);
}

const auth = read('src/hooks/useAuthOnline.tsx');
const app = read('src/App.tsx');
const api = read('src/lib/onlineApi.ts');
const canonical = read('src/lib/canonicalAccountProfile.ts');

check(
  'auth reads public.profiles directly before legacy onlineApi fallbacks',
  auth.includes('loadSupabaseAccountProfile(user)') &&
  auth.indexOf('const direct = await loadSupabaseAccountProfile(user)') < auth.indexOf('if (typeof api.getProfile === "function")'),
);

check(
  'direct cloud profile maps nickname and avatar_url into the OnlineProfile used by UI',
  auth.includes('nickname: nickname || displayName || undefined') &&
  auth.includes('avatarUrl: String(row?.avatar_url || "").trim() || undefined'),
);

check(
  'profile hydration is no longer delayed by Android idle scheduling',
  auth.includes('window.setTimeout(() => {\n      void safeLoadProfileBestEffort(user)') &&
  !auth.includes('isCapacitorNativeRuntime() ? 3600 : 120'),
);

check(
  'cross-device refresh runs on focus, visibility, realtime and 30s polling fallback',
  auth.includes('window.addEventListener("focus", onFocus)') &&
  auth.includes('document.addEventListener("visibilitychange", onVisible)') &&
  auth.includes('postgres_changes') &&
  auth.includes('30_000'),
);

check(
  'same-device profile writes notify Auth context without full auth refresh',
  api.includes('dc:account-profile-cloud-updated') &&
  auth.includes('dc:account-profile-cloud-updated'),
);

const bridgeEffectStart = app.indexOf('// ✅ ONLINE→LOCAL BRIDGE (COMPTE UTILISATEUR UNIQUE)');
const bridgeEffectEnd = app.indexOf('// V19 — IDENTITÉ COMPTE MULTI-APPAREILS.', bridgeEffectStart);
const bridgeEffect = app.slice(bridgeEffectStart, bridgeEffectEnd);
check(
  'account identity bridge no longer waits for cloud backup hydration',
  bridgeEffectStart >= 0 && bridgeEffectEnd > bridgeEffectStart && !bridgeEffect.includes('if (!cloudHydrated) return'),
);

const remoteSyncStart = app.indexOf('// V19 — IDENTITÉ COMPTE MULTI-APPAREILS.');
const remoteSyncEnd = app.indexOf('const currentTabRef', remoteSyncStart);
const remoteSync = app.slice(remoteSyncStart, remoteSyncEnd);
check(
  'canonical profile id sync waits for the correct scoped store, not cloud backup hydration',
  remoteSync.includes('bootStoreLoadedRef.current') &&
  remoteSync.includes('loadedStoreScopeRef.current !== uid') &&
  !remoteSync.includes('!cloudHydrated'),
);

const resolverStart = canonical.indexOf('export function getCanonicalAccountProfileFromStore');
const resolverEnd = canonical.indexOf('export function getCanonicalAccountProfileId', resolverStart);
const resolver = canonical.slice(resolverStart, resolverEnd);
check(
  'explicit account binding is resolved before arbitrary activeProfileId',
  resolver.indexOf('exactBindings.length === 1') >= 0 &&
  resolver.indexOf('exactBindings.length === 1') < resolver.indexOf('const activeId = cleanId(store?.activeProfileId);', resolver.indexOf('exactBindings.length === 1') + 1),
);

console.log(`\n✅ Cross-device account profile sync V96: ${checks.length}/${checks.length}`);
