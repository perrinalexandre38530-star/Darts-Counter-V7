import fs from 'node:fs';

const leaderboard = fs.readFileSync('src/lib/challengeLeaderboard.ts', 'utf8');
const play = fs.readFileSync('src/pages/ChallengePlay.tsx', 'utf8');

const checks = [
  ['session locale utilisée avant getUser réseau', leaderboard.indexOf('supabase.auth.getSession()') >= 0 && leaderboard.indexOf('supabase.auth.getSession()') < leaderboard.indexOf('supabase.auth.getUser()')],
  ['profil compte dédié id === uid reconnu', leaderboard.includes("if (clean(profile?.id) === wanted) return true;")],
  ['matching historique inspecte toutes les identités', leaderboard.includes('historyRowMatchesProfileIds(candidate, profileIds)') && leaderboard.includes('row?.onlineUserId') && leaderboard.includes('row?.userId')],
  ['backfill ne dépend plus exclusivement du profil hydraté', !leaderboard.includes("if (!profile) return { ok: false, submitted: 0, scanned: 0, skipped: 'NO_LINKED_PROFILE' };") && leaderboard.includes('profileIds.add(uid);')],
  ['soumission live utilise le même contrat de liaison', play.includes('isChallengeProfileLinkedToUser(p?.profile,uid)')],
  ['historique futur conserve le uid online explicite', play.includes('...(onlineUserId?{onlineUserId,userId:onlineUserId}:{})')],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`✅ ${label}`);
  else { console.error(`❌ ${label}`); failed += 1; }
}
if (failed) process.exit(1);
console.log(`\n✅ CHALLENGE ONLINE ACCOUNT LINK — ${checks.length}/${checks.length}`);
