import fs from 'node:fs';

const app=fs.readFileSync('src/App.tsx','utf8');
const page=fs.readFileSync('src/pages/ChallengeLeaderboardPage.tsx','utf8');
const lib=fs.readFileSync('src/lib/challengeLeaderboard.ts','utf8');
const play=fs.readFileSync('src/pages/ChallengePlay.tsx','utf8');
const crash=fs.readFileSync('src/lib/crashGuard.ts','utf8');
const backup=fs.readFileSync('src/lib/backup/accountBackupCoordinator.ts','utf8');
const codec=fs.readFileSync('src/lib/imageStorageCodec.ts','utf8');
const dartsets=fs.readFileSync('src/lib/dartSetsStore.ts','utf8');
const linked=fs.readFileSync('src/lib/linkedProfileSync.ts','utf8');
const avatar=fs.readFileSync('src/components/ProfileAvatar.tsx','utf8');
const card=fs.readFileSync('src/components/home/ActiveProfileCard.tsx','utf8');

const checks=[
 ['route changes are immediate', !/React\.startTransition\(commitRouteState\)/.test(app)],
 ['Challenge page no automatic history backfill', !/syncChallengeHistoricalScores\(profiles\)/.test(page)],
 ['Challenge detail targeted by match id', /History\.get\(wantedMatchId\)/.test(lib)],
 ['Challenge detail no History.getAll', !/await\s+History\.getAll\(\)/.test(lib)],
 ['ChallengePlay modal no automatic backfill', !/historical online leaderboard sync failed/.test(play)],
 ['Android CrashGuard skips full store scan foreground', /getRuntimePlatform\(\) === "android" && !hidden/.test(crash)],
 ['automatic backup compare is metadata-only', /user-choice-required-metadata-only/.test(backup)],
 ['quota write circuit breaker installed', /STORAGE_QUOTA_COOLDOWN_MS/.test(codec) && /localStorageWriteBlocked/.test(codec)],
 ['dartset image bank no Date.now on read', !/updatedAt:\s*Math\.max\(n\(normalized\.updatedAt, 0\), Date\.now\(\)\)/.test(dartsets)],
 ['linked dartsets do not manufacture timestamps', !/updatedAt:\s*Number\(rawSet\?\.updatedAt \|\| Date\.now\(\)\)/.test(linked)],
 ['Home avatar requests profile URL priority', /preferProfileAvatarUrl/.test(card) && /if \(preferProfileAvatarUrl\)/.test(avatar)],
];
let failed=0;
for(const [name,ok] of checks){ console.log(`${ok?'✅':'❌'} ${name}`); if(!ok) failed++; }
if(failed){ process.exitCode=1; } else console.log('\nV10 P0 navigation/avatar/quota contract OK');
