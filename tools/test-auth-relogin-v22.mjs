import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const online = read('src/lib/onlineApi.ts');
const hook = read('src/hooks/useAuthOnline.tsx');
const social = read('src/lib/socialAuth.ts');

const tests = [
  ['Supabase runtime can restart after logout', /function resumeSupabaseAuthRuntime\(\)[\s\S]*startAutoRefresh/.test(online)],
  ['Email login restarts Supabase runtime', /async function loginPublic[\s\S]*clearExplicitLogout\(\);\s*resumeSupabaseAuthRuntime\(\);/.test(online)],
  ['Signup restarts Supabase runtime', /async function signupPublic[\s\S]*clearExplicitLogout\(\);\s*resumeSupabaseAuthRuntime\(\);/.test(online)],
  ['Legacy NAS fallback restored on normal login', /loginPublic[\s\S]*tryNasLoginWithoutInvitation/.test(online)],
  ['Legacy NAS session accepted by current-session resolver', /getCurrentSession[\s\S]*if \(isValidNasSession\(cached\)\) return cached;/.test(online)],
  ['Legacy NAS profile can use cached profile', /getProfile[\s\S]*return live \|\| cached\?\.profile \|\| null/.test(online)],
  ['Late onlineApi logout cannot repurge a new login', /finally \{[\s\S]*if \(isExplicitlyLoggedOut\(\)\)[\s\S]*clearSupabaseBrowserAuthStorage/.test(online)],
  ['Late React logout cannot repurge a new login', /finally \{[\s\S]*if \(isExplicitlyLoggedOut\(\)\)[\s\S]*purgeAuthKeysFromBrowser/.test(hook)],
  ['Social login also restarts Supabase runtime', /startSocialSignIn[\s\S]*resumeSupabaseAuthRuntime\(\)/.test(social)],
  ['Native social callback restarts Supabase runtime', /exchangeNativeCallbackUrl[\s\S]*resumeSupabaseAuthRuntime\(\)/.test(social)],
];

let failed = 0;
for (const [name, ok] of tests) {
  if (ok) console.log(`✅ ${name}`);
  else { console.error(`❌ ${name}`); failed++; }
}
if (failed) process.exit(1);
console.log(`\n${tests.length}/${tests.length} contrôles reconnexion V22 OK.`);
