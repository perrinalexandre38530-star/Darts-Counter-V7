import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const hub = read('src/pages/OnlineHub.tsx');
const auth = read('src/hooks/useAuthOnline.tsx');
const api = read('src/lib/publicSocialApi.ts');
const migration = read('supabase/migrations/20260902143000_online_community_pulse_v1.sql');

const checks = [
  ['hub loads real pulse', hub.includes('cloudGetCommunityPulse') && hub.includes('COMMUNAUTÉ MULTISPORTS')],
  ['hub exposes real counters', ['MEMBRES','ACTIFS 24 H','ACTIFS 7 J','EN LIGNE'].every((x) => hub.includes(x))],
  ['live feed is data-driven', hub.includes('communityFeed.map') && hub.includes('>RÉEL</span>')],
  ['no fake human seed list', !/Thomas.*Lucas.*Sarah.*Alex/.test(hub)],
  ['global auth heartbeat exists', auth.includes('cloudCommunityHeartbeat') && auth.includes('60_000')],
  ['heartbeat stays outside navigation', auth.includes('scheduleOutsideNavigation')],
  ['public api exposes pulse', api.includes('ms_get_community_pulse') && api.includes('ms_community_heartbeat')],
  ['backend has real account count', migration.includes('select count(*) into v_members from auth.users')],
  ['backend has 24h and 7d activity', migration.includes("interval '24 hours'") && migration.includes("interval '7 days'")],
  ['ghost-online protection', migration.match(/interval '2 minutes'/g)?.length >= 4],
  ['heartbeat does not auto-publish profile', !migration.match(/ms_community_heartbeat[\s\S]{0,1000}ms_touch_public_profile/)],
  ['RPCs authenticated-only', migration.includes('grant execute on function public.ms_get_community_pulse(integer) to authenticated')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`\n${checks.length} checks passed.`);
