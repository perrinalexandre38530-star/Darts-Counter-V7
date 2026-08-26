import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const social = fs.readFileSync(new URL('../src/lib/socialAuth.ts', import.meta.url), 'utf8');

const checks = [
  ['startup stale callback scrubber exists', /function scrubStaleOAuthCallbackUrl\(\)/.test(app)],
  ['scrubber runs before normal App boot', /React\.useState\(\(\) => scrubStaleOAuthCallbackUrl\(\)\)/.test(app)],
  ['stale callback redirects to gameSelect', /#\/gameSelect/.test(app.split('function scrubStaleOAuthCallbackUrl')[1].split('function markOAuthCallbackHandled')[0])],
  ['active OAuth context protects genuine return', /hasActiveSocialAuthContext\(\)/.test(app)],
  ['processed callback is marked handled', /markOAuthCallbackHandled\("success"\)/.test(app) && /markOAuthCallbackHandled\("error"\)/.test(app)],
  ['handled URL drops OAuth code payload', /#\/auth\/callback\?handled=1&result=/.test(app)],
  ['stale cleanup removes social pending state', /clearPendingSocialAuth\(\)/.test(app.split('function scrubStaleOAuthCallbackUrl')[1].split('function markOAuthCallbackHandled')[0])],
  ['stale cleanup removes PKCE verifier state', /clearPendingPkceState\(\)/.test(app.split('function scrubStaleOAuthCallbackUrl')[1].split('function markOAuthCallbackHandled')[0])],
  ['PKCE full-state cleanup exported', /export function clearPendingPkceState\(\)/.test(social)],
  ['active context accepts pending or verifier backup', /export function hasActiveSocialAuthContext\(\)/.test(social) && /getPendingSocialAuth\(\)/.test(social) && /restorePendingPkceVerifierIfNeeded\(\)/.test(social)],
];

let ok = 0;
for (const [label, pass] of checks) {
  if (pass) { console.log(`✅ ${label}`); ok++; }
  else console.error(`❌ ${label}`);
}
if (ok !== checks.length) process.exit(1);
console.log(`\n${ok}/${checks.length} contrôles callback démarrage V77 OK.`);
