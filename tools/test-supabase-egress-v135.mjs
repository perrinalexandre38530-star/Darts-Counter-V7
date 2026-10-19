import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const checks = [];
const ok = (name, value) => checks.push({ name, ok: !!value });

const owned = read('src/lib/accountOwnedSync.ts');
const social = read('src/lib/publicSocialApi.ts');
const notify = read('src/lib/messageCenterNotify.ts');
const nav = read('src/components/BottomNav.tsx');
const messages = read('src/pages/MessagesPage.tsx');
const sql = read('supabase/migrations/20261019_egress_guard_message_summary_v135.sql');

ok('account sync fallback poll >= 120s', /const POLL_MS = 120_000/.test(owned));
ok('history inventory omits payload', /select\("owner_user_id,document_type,document_id,client_updated_at,deleted_at,created_at,updated_at"\)[\s\S]{0,250}document_type", DOC\.historyMatch/.test(owned));
ok('non-history polling omits payload', /Polling de secours = métadonnées seulement[\s\S]{0,500}select\("owner_user_id,document_type,document_id,client_updated_at,deleted_at,created_at,updated_at"\)/.test(owned));
ok('message list default capped', /Math\.min\(250, Number\(opts\.limit \|\| 120\)\)/.test(social));
ok('message summary RPC used', /ms_message_center_summary/.test(social) && /cloudGetMessageCenterSummary/.test(notify));
ok('global message center no full history fan-out', !/Promise\.all\(\[\s*listPrivateMessages/.test(notify));
ok('global badge poll reduced to 60s', /constrained \? 120_000 : 60_000/.test(nav));
ok('public messages deduplicate shared matches', /sharedMatchesFromPrivateMessages/.test(messages));
ok('public chat compact poll', /limit: 80, compact: true/.test(messages));
ok('compact SQL strips shared payload', /coalesce\(m\.metadata->'sharedMatch','\{\}'::jsonb\) - 'payload'/.test(sql));
ok('summary SQL is aggregate only', /create or replace function public\.ms_message_center_summary/.test(sql));
ok('message indexes added', /ms_private_messages_to_unread_idx/.test(sql));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'OK' : 'FAIL'} - ${c.name}`);
if (failed.length) process.exit(1);
console.log(`V135 egress checks: ${checks.length}/${checks.length} OK`);
