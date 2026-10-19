import fs from 'node:fs';

const client = fs.readFileSync(new URL('../src/lib/supabaseClient.ts', import.meta.url), 'utf8');
const org = fs.readFileSync(new URL('../src/organizations/organizationService.ts', import.meta.url), 'utf8');

const checks = [
  ['cold-start REST concurrency = 1', client.includes('const maxConcurrency = supabaseRestHealthy ? SUPABASE_REST_NORMAL_CONCURRENCY : 1')],
  ['normal REST concurrency retained', client.includes('SUPABASE_REST_NORMAL_CONCURRENCY = 4')],
  ['circuit persists in session', client.includes('msc:supabase-rest-circuit-v1') && client.includes('restorePersistedSupabaseRestCircuit()')],
  ['base cooldown raised', client.includes('SUPABASE_REST_BASE_COOLDOWN_MS = 60_000')],
  ['organization warnings suppressed for transient outage', org.includes('warnOrganizationCloudError') && org.includes('isSupabaseTransientUnavailableError(error)')],
  ['organization member list gated', org.includes('organizationCloudPaused()) return { members: [], cloudAvailable: false }')],
  ['organization competitions gated', org.includes('organizationCloudPaused()) return { competitions: [], cloudAvailable: false }')],
  ['organization announcements gated', org.includes('organizationCloudPaused()) return { announcements: [], cloudAvailable: false }')],
  ['organization partners gated', org.includes('organizationCloudPaused()) return { partners: [], cloudAvailable: false }')],
  ['no direct organization unavailable warning spam', !/console\.warn\("\[organizations\].*unavailable/.test(org)],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'} - ${label}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} checks OK`);
