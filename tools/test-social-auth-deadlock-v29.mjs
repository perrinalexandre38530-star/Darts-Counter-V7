import fs from 'node:fs';

const hook = fs.readFileSync('src/hooks/useAuthOnline.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const social = fs.readFileSync('src/lib/socialAuth.ts', 'utf8');
const login = fs.readFileSync('src/pages/AuthV7Login.tsx', 'utf8');
const debug = fs.readFileSync('src/components/AuthDebugBanner.tsx', 'utf8');

const checks = [];
const ok = (name, cond) => {
  if (!cond) throw new Error(`❌ ${name}`);
  checks.push(name);
  console.log(`✅ ${name}`);
};

ok('Auth hook callback is synchronous', /onAuthStateChange\(\(event, emittedSession\)\s*=>/.test(hook));
ok('Auth hook no async callback', !/onAuthStateChange\(async\s*\(/.test(hook));
ok('Auth hook applies emitted session immediately', /applyAuthFromSession\(setState, emittedSession\)/.test(hook));
ok('Auth hook defers hydration beyond auth callback', /window\.setTimeout\(\(\)\s*=>\s*\{\s*void \(async \(\) =>/.test(hook));
ok('Deferred hydration may resolve canonical session after lock release', /const resolvedSession = await safeGetSession\(\)/.test(hook));
ok('Debug banner defers getSession after auth event', /onAuthStateChange\(\(\) => \{[\s\S]*?window\.setTimeout\(\(\) => \{ void load\(\); \}, 0\)/.test(debug));
ok('OAuth callback no longer blocks on onlineApi.restoreSession', !/auth_callback[\s\S]{0,5000}await onlineApi\.restoreSession\(\)/.test(app));
ok('OAuth landing runs cloud restore in background', /void maybeAutoRestoreCloudForSignedInUser\(uid, \{ force: true \}\)/.test(app));
ok('OAuth callback has finite recovery timeout', /Le retour OAuth n'a pas finalisé la session/.test(app));
ok('Native exchange has a finite 15s timeout', /retour OAuth Supabase n'a pas pu finaliser la session en 15 secondes/.test(social));
ok('Stale OAuth pending is auto-cleared', /Date\.now\(\) - startedAt > 10 \* 60 \* 1000/.test(social));
ok('Login screen clears a stale social spinner', /clearPendingSocialAuth\(\);[\s\S]*?setSocialBusy\(null\)/.test(login));
ok('Public email error no longer blames NAS/R2 as required', /Le NAS\/R2 n'est pas requis pour ouvrir une session publique/.test(login));

console.log(`\n${checks.length}/${checks.length} contrôles anti-freeze OAuth V29 OK.`);
