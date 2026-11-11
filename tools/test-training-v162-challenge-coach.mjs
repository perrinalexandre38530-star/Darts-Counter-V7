import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  challengeRulesFingerprint,
  challengeSessionPerformance,
  summarizeComparableChallengeSessions,
  buildChallengeTrainingRecommendations,
} from '../src/training/profile/trainingChallengeCoach.ts';

const simple = { exerciseType: 'classic', target: '20', rule: 'all', visits: 10, trainingOrigin: 'training_lab', trainingCatalogPresetId: 'challenge_t20' };
const longer = { ...simple, visits: 15 };
const sameOrderDifferentFields = { ...simple, playerIds: ['someone'], matchMode: 'solo' };
const row = (id, endedAt, config, performance, participantId = 'ninja', modeId = 'training_challenges') => ({
  id, participantId, modeId, endedAt, config,
  points: performance * 2, metrics: performance === null ? {} : { trainingPerformancePct: performance },
});
assert.equal(challengeRulesFingerprint(simple), challengeRulesFingerprint(sameOrderDifferentFields), 'player and UI labels must not affect rule comparison');
assert.notEqual(challengeRulesFingerprint(simple), challengeRulesFingerprint(longer), 'number of visits materially changes the rules');
assert.notEqual(challengeRulesFingerprint({...simple, exerciseType:'arcade', catalogChallengeId:'opposites', catalogLine:20}),
  challengeRulesFingerprint({...simple, exerciseType:'arcade', catalogChallengeId:'opposites', catalogLine:18}),'arcade line is a rule');
assert.equal(challengeSessionPerformance(row('zero', 3, simple, 0)), 0, 'zero is a valid measured result');
assert.equal(challengeSessionPerformance(row('missing', 3, simple, null)), null, 'missing is not fabricated as zero');
const sessions = [
  row('old', 100, simple, 38),
  row('other-mode', 150, simple, 100, 'ninja', 'challenge'),
  row('other-profile', 160, simple, 100, 'other'),
  row('different-rules', 200, longer, 90),
  row('bad', 240, simple, null),
  row('recent', 300, simple, 45),
  row('not-training', 500, { ...simple, trainingOrigin: 'competitive' }, 100),
];
const stats = summarizeComparableChallengeSessions('challenge_t20', sessions, 'ninja');
assert.equal(stats.attempts, 4, 'only private training sessions for this account');
assert.equal(stats.comparableAttempts, 2, 'only valid same-rules measurements');
assert.equal(stats.comparisonExcluded, 2, 'incomplete and differently configured sessions excluded');
assert.equal(stats.latest, 45);
assert.equal(stats.previous, 38);
assert.equal(stats.delta, 7);
assert.equal(stats.best, 45);
assert.equal(stats.latestPoints, 90);
assert.equal(summarizeComparableChallengeSessions('challenge_t20', sessions, 'other').latest, 100, 'data isolated by profile id');
const fakeCatalog = [
  { id:'challenge_t20', title:'Cible 20', family:'cible', difficulty:2, successValidationPct:50, status:'available', minPlayers:1 },
  { id:'new-doubles', title:'Doubles', family:'doubles', difficulty:1, successValidationPct:40, status:'available', minPlayers:1 },
  { id:'new-multi', title:'Multi', family:'multijoueurs', difficulty:2, successValidationPct:50, status:'available', minPlayers:2 },
  { id:'planned', title:'Not ready', family:'cible', status:'planned', minPlayers:1, successValidationPct:50 },
];
const coach = buildChallengeTrainingRecommendations(fakeCatalog, sessions, 'ninja');
assert.equal(coach[0].preset.id, 'challenge_t20', 'Awena prioritizes an observed below-target result');
assert.equal(coach[0].kind, 'consolider');
assert.ok(coach.some((item) => item.preset.id === 'new-doubles'), 'Awena suggests a new solo family');
assert.ok(coach.every((item) => (item.preset.minPlayers || 1) === 1 && item.preset.status !== 'planned'), 'no blocked multiplayer or unready launch');
assert.equal(buildChallengeTrainingRecommendations(fakeCatalog, sessions, '').length, 0, 'no coaching without a profile');
assert.equal(buildChallengeTrainingRecommendations(fakeCatalog, [], 'ninja')[0].kind, 'decouvrir');
assert.equal(summarizeComparableChallengeSessions('challenge_t20', sessions, '').attempts, 0, 'no profile means no prior user data');
const arcadePreset = { id:'challenge_arcade_sniper', title:'Sniper', family:'precision', status:'available', arcadeId:'sniper', minPlayers:1, successValidationPct:100 };
const arcadeRow = row('arcade1', 900, {...simple, exerciseType:'arcade', catalogChallengeId:'sniper', trainingCatalogPresetId:'challenge_arcade_sniper'}, 55);
const arcadeCoach = buildChallengeTrainingRecommendations([arcadePreset], [arcadeRow], 'ninja');
assert.equal(arcadeCoach[0]?.kind, 'progresser', 'arcade score-based metrics are not incorrectly treated as failing a 100% path goal');

const ui = fs.readFileSync('src/training/ui/TrainingChallengeCatalog.tsx', 'utf8');
const css = fs.readFileSync('src/training/ui/trainingResponsive.css', 'utf8');
const catalog = fs.readFileSync('src/training/catalog/challengeTrainingCatalog.ts','utf8');
assert.match(ui, /Mes exercices conseillés/);
assert.match(ui, /summarizeComparableChallengeSessions/);
assert.match(ui, /onStart\(item\.preset\)/);
assert.match(ui, /mssChallengeCatalogComparison/);
assert.match(ui, /onlyRecommended/);
assert.match(css, /\.mssChallengeCoachGrid/);
assert.match(css, /\.mssChallengeCatalogOverlay/);
assert.match(css, /max-height:calc\(100dvh - 22px\)/);
assert.match(catalog, /\.\.\.CHALLENGE_TRAINING_CATALOG, \.\.\.CHALLENGE_TRAINING_ARCADE_CATALOG/);
assert.match(catalog, /CHALLENGE_ARCADE_CATALOG\.map/);
console.log('✅ V162 Training Challenge coach: strict rule fingerprint, private sessions, no synthetic metrics, personalized recommendations, complete catalogue and responsive UI.');
