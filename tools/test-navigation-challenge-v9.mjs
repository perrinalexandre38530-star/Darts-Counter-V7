import fs from 'node:fs';

const page=fs.readFileSync('src/pages/ChallengeLeaderboardPage.tsx','utf8');
const lib=fs.readFileSync('src/lib/challengeLeaderboard.ts','utf8');
const play=fs.readFileSync('src/pages/ChallengePlay.tsx','utf8');
const app=fs.readFileSync('src/App.tsx','utf8');

const checks=[
 ['leaderboard page does not auto backfill history', !/syncChallengeHistoricalScores\(profiles\)/.test(page)],
 ['leaderboard detail has no History.getAll scan', !/await\s+History\.getAll\(\)/.test(lib)],
 ['targeted local detail uses History.get(matchId)', /History\.get\(wantedMatchId\)/.test(lib)],
 ['manual backfill starts from light History.list', /const headers = await History\.list\(\)/.test(lib)],
 ['ChallengePlay rank modal does not auto historical sync', !/historical online leaderboard sync failed/.test(play)],
 ['Android route changes are urgent, not startTransition', !/React\.startTransition\(commitRouteState\)/.test(app)],
 ['legacy missing stats are not rendered as fake zeros', /n’affichera plus de faux zéros/.test(page)],
];
let failed=0;
for(const [name,ok] of checks){ console.log(`${ok?'✅':'❌'} ${name}`); if(!ok) failed++; }
if(failed){ process.exitCode=1; } else console.log('\nV9 navigation + Challenge instant-detail contract OK');
