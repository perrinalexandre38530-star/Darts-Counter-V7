import fs from 'node:fs';

const page = fs.readFileSync('src/pages/ChallengeLeaderboardPage.tsx', 'utf8');
const lib = fs.readFileSync('src/lib/challengeLeaderboard.ts', 'utf8');

const must = (cond, msg) => { if (!cond) throw new Error(msg); };

must(page.includes('P0 V11 — ONLINE = ONLINE'), 'V11 marker missing');
must(!page.includes('findChallengeHistoryRecordForLeaderboardDetail(fetched'), 'ONLINE detail must not call local History record lookup');
must(!page.includes('enrichChallengeLeaderboardDetailFromHistory(fetched'), 'ONLINE detail must not enrich from local History');
must(page.includes('openFullStats(fetched)'), 'ONLINE detail must render server stats directly');
must(page.includes('aucune lecture lourde de l’historique local'), 'Missing explicit no-local fallback message');

// Keep the helper available for explicit/manual recovery paths, but it must no longer
// be reachable from the normal ONLINE leaderboard click path.
must(lib.includes('await History.get(wantedMatchId)'), 'Targeted local recovery helper unexpectedly removed');

console.log('✅ Challenge ONLINE V11: STATS path is server-only; no IndexedDB/History read on click.');
