import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const social = read('src/lib/socialAuth.ts');
const client = read('src/lib/supabaseClient.ts');
const app = read('src/App.tsx');

const checks = [];
const check = (name, ok) => { checks.push([name, !!ok]); if (!ok) console.error('FAIL:', name); };

check('PKCE verifier backup key exists', social.includes('msc_social_pkce_backup_v1'));
check('PKCE verifier is backed up after OAuth URL creation', social.includes('backupPendingPkceVerifier(provider)'));
check('PKCE verifier restore helper exists', social.includes('restorePendingPkceVerifierIfNeeded'));
check('Backup is outside Supabase auth namespace', !social.includes('const PKCE_BACKUP_KEY = "dc-supabase-auth-v2:'));
check('Native callback restores verifier before exchange', /restorePendingPkceVerifierIfNeeded\(\);[\s\S]{0,300}exchangeCodeForSession\(code\)/.test(social));
check('Web callback restores verifier before exchange', /restorePendingPkceVerifierIfNeeded\(\);[\s\S]{0,300}exchangeCodeForSession\(code\)/.test(app));
check('Auto refresh disabled during PKCE callback landing', client.includes('autoRefreshToken: !PKCE_CALLBACK_LANDING'));
check('PKCE callback landing detects hash route and code', client.includes('PKCE_CALLBACK_LANDING') && client.includes('auth\\/callback'));
check('Auto refresh resumes after successful exchange', app.includes('clearPendingPkceBackup();') && app.includes('resumeSupabaseAuthRuntime();'));
check('Auth callback exchange is idempotent per component mount', app.includes('exchangeStartedRef.current'));
check('Microsoft remains Azure provider with email scope', social.includes('azure: { label: "Microsoft", oauthProvider: "azure", scopes: "email"'));

const failed = checks.filter(([, ok]) => !ok);
console.log(`${checks.length - failed.length}/${checks.length} PKCE callback resilience checks passed`);
if (failed.length) process.exit(1);
