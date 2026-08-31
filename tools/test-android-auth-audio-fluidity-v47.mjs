import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const hook = read('src/hooks/useAuthOnline.tsx');
const api = read('src/lib/onlineApi.ts');
const social = read('src/lib/socialAuth.ts');
const audio = read('src/components/NavigationBackgroundMusic.tsx');
const app = read('src/App.tsx');

const checks = [];
function ok(name, condition) {
  if (!condition) throw new Error(`❌ ${name}`);
  checks.push(name);
  console.log(`✅ ${name}`);
}

const safeGetStart = hook.indexOf('async function safeGetSession()');
const safeGetEnd = hook.indexOf('async function safeEnsureSession()', safeGetStart);
const safeGet = hook.slice(safeGetStart, safeGetEnd);
ok('Auth fast path reads Supabase local session before NAS bridge', safeGet.indexOf('supabase.auth.getSession()') >= 0 && safeGet.indexOf('supabase.auth.getSession()') < safeGet.indexOf('safeGetNasBridgeSession()'));
ok('Auth fast path can reuse same-account cached bridge without network', safeGet.includes('cachedSessionMatchesSupabaseUser') && safeGet.includes('authSessionToPseudoSupabaseSession'));
ok('Auth change handler is non-reentrant', hook.includes('authChangeInFlightRef.current') && hook.includes('authChangeInFlightRef.current = true') && hook.includes('authChangeInFlightRef.current = false'));
ok('Profile loads are coalesced', hook.includes('profileLoadInFlight.get(userId)') && hook.includes('profileLoadInFlight.set(userId, task)'));
ok('Cloud restore is cooldown-deduped', hook.includes('BACKUP_RESTORE_COOLDOWN_MS') && hook.includes('backupRestoreInFlight.has(userId)'));
ok('Cloud/profile work waits outside navigation', hook.includes('scheduleOutsideNavigation') && hook.includes('dataset.mscNavigating'));
ok('TOKEN_REFRESHED does not wake profile/cloud hydration', hook.includes('event !== "TOKEN_REFRESHED"'));
ok('Email login consumes returned session directly', hook.includes('const directSession = authSessionToPseudoSupabaseSession(ok)'));

ok('Auth persistence only broadcasts identity changes', api.includes('previousSignature === nextSignature') && api.includes('reason: "auth_identity_changed"'));
ok('Public login returns a fast Supabase session', api.includes('buildFastPublicAuthSession(data?.session)'));
ok('Public profile/NAS bridge hydration is deferred to idle', api.includes('schedulePublicAuthHydration()') && api.includes('scheduleRuntimeIdle(() =>'));
ok('Supabase bridge hydration is coalesced', api.includes('__buildAuthFromSupabaseInFlight'));

ok('OAuth settings fetch has a finite timeout', social.includes('fetchWithTimeout(`${__SUPABASE_ENV__.url}/auth/v1/settings`') && social.includes('}, 2800)'));
ok('OAuth preflight has a finite timeout', social.includes('fetchWithTimeout(url') && social.includes('}, 3200)'));
ok('Native OAuth fallback polling is no longer sub-second', /setInterval\(\(\) => \{[\s\S]{0,160}?getPendingSocialAuth\(\)[\s\S]{0,80}?\}, 2500\)/.test(social));

ok('Navigation music owns exactly one Audio element', (audio.match(/new Audio\(\)/g) || []).length === 1);
ok('Normal navigation keeps the same music zone', audio.includes('if (zone === previousZone)') && audio.includes('if (zone) void requestPlay()'));
ok('Awena music listener no longer re-registers on every route', audio.includes('}, [loadRequestedTrack, requestPlay]);'));
ok('Expensive now-playing backdrop blur is disabled in native runtime', audio.includes('nativeRuntime ? "none" : "blur(14px)'));

ok('Android route state uses React.startTransition', app.includes('getRuntimePlatform() === "android"') && app.includes('React.startTransition(commitRouteState)'));
ok('OAuth progress animation is throttled', app.includes('}, 110);'));

console.log(`\n${checks.length}/${checks.length} contrôles Android AUTH + AUDIO V47 OK.`);
