import assert from 'node:assert/strict';
import { createPrisonerState, playPrisonerVisit, getPrisonerAvailableDarts, getPrisonerPlayerRanks } from '../src/lib/gameEngines/prisonerEngine.ts';
const players=[{id:'a',name:'A'},{id:'b',name:'B'}];
const init=(opts={})=>createPrisonerState(players,{startingDarts:3, ...opts});
let s=init();
s=playPrisonerVisit(s,[{bed:'S',number:1,singleRing:'outer'}]);
assert.equal(s.progressIndexByPlayer.a,1);
s=playPrisonerVisit(s,[{bed:'S',number:1,singleRing:'inner'}]);
assert.equal(s.prisoners.length,1);
assert.equal(getPrisonerAvailableDarts(s,'b'),2);
s=playPrisonerVisit(s,[{bed:'D',number:1}]);
assert.equal(s.prisoners.length,0);
assert.equal(s.dartsOwnedByPlayer.a,4);
assert.equal(s.dartsOwnedByPlayer.b,2);
let win=init({startingDarts:9});
win.progressIndexByPlayer.a=19;
win=playPrisonerVisit(win,[{bed:'T',number:20},{bed:'MISS'},{bed:'MISS'}]);
assert.equal(win.finished,true);
assert.equal(win.history.at(-1).darts.length,1);
assert.equal(win.statsByPlayer.a.darts,1);
let draw=init({startingDarts:1});
draw=playPrisonerVisit(draw,[{bed:'S',number:1,singleRing:'inner'}]);
assert.equal(draw.finished,true);
assert.equal(draw.finishReason,'last_player');
let locked=init({startingDarts:1, eliminationEnabled:false});
locked=playPrisonerVisit(locked,[{bed:'S',number:1,singleRing:'inner'}]);
assert.equal(locked.finished,false);
locked=playPrisonerVisit(locked,[{bed:'S',number:1,singleRing:'inner'}]);
assert.equal(locked.finished,true);
assert.equal(locked.finishReason,'stalemate');
// Sans élimination, les joueurs immobilisés passent réellement leur tour :
// ni duplication, ni disparition de volées dans l'historique.
let trapped=init({startingDarts:2, eliminationEnabled:false, missPenaltyEnabled:false});
trapped=playPrisonerVisit(trapped,[{bed:'S',number:1,singleRing:'inner'},{bed:'S',number:2,singleRing:'inner'}]);
assert.equal(getPrisonerAvailableDarts(trapped,'a'),0);
trapped=playPrisonerVisit(trapped,[{bed:'MISS'}]);
assert.equal(trapped.history.length,2);
trapped=playPrisonerVisit(trapped,[]);
assert.equal(trapped.history.length,3);
assert.equal(trapped.history.at(-1).skipped,true);
assert.equal(trapped.statsByPlayer.a.turnsSkipped,1);
assert.equal(trapped.history.at(-1).playerId,'a');
assert.equal(trapped.history.at(-1).darts.length,0);
// Une libération réalisée en cours de volée est prise en compte par le
// moteur de prévisualisation et par la validation définitive.
let preview=init({startingDarts:3});
preview=playPrisonerVisit(preview,[{bed:'S',number:7,singleRing:'inner'}]);
let simulated=playPrisonerVisit(preview,[{bed:'D',number:7}]);
assert.equal(simulated.prisoners.length,0);
assert.equal(simulated.history.at(-1).captures,1);
console.log('PRISONER engine tests OK');

// La capture BULL est précise en règle standard, et permissive en variante.
let strict = init({bullCaptureRule:'bull'});
strict=playPrisonerVisit(strict,[{bed:'OB'}]);
assert.equal(strict.prisoners.length,1);
assert.equal(strict.prisoners[0].bullBed,'OB');
strict=playPrisonerVisit(strict,[{bed:'IB'}]);
assert.equal(strict.prisoners.length,2,'DBULL ne doit pas capturer un BULL25 en règle stricte');
assert.equal(strict.history.at(-1).captures,0);
let freeBull = init({bullCaptureRule:'any_bull'});
freeBull=playPrisonerVisit(freeBull,[{bed:'OB'}]);
freeBull=playPrisonerVisit(freeBull,[{bed:'IB'}]);
assert.equal(freeBull.prisoners.length,0,'DBULL capture BULL25 en variante libre');
assert.equal(freeBull.history.at(-1).captures,1);
assert.equal(freeBull.dartsOwnedByPlayer.b,4);
assert.equal(freeBull.dartsOwnedByPlayer.a,2);

// Sans pénalité activée, MISS reste un lancer raté mais ne compte
// jamais parmi les fléchettes temporairement indisponibles.
let noMissPenalty = init({ missPenaltyEnabled: false });
noMissPenalty = playPrisonerVisit(noMissPenalty, [{bed:'MISS'}]);
assert.equal(noMissPenalty.statsByPlayer.a.offboardMisses, 1);
assert.equal(noMissPenalty.statsByPlayer.a.temporaryLostDarts, 0);
assert.equal(getPrisonerAvailableDarts(noMissPenalty,'a'), 3);
// Deux captures sur une même zone doivent libérer deux tokens distincts.
let multiRescue = init({startingDarts: 3});
multiRescue = playPrisonerVisit(multiRescue, [{bed:'S',number:5,singleRing:'inner'},{bed:'S',number:5,singleRing:'inner'}]);
assert.equal(multiRescue.prisoners.length,2);
multiRescue = playPrisonerVisit(multiRescue,[{bed:'D',number:5},{bed:'T',number:5}]);
assert.equal(multiRescue.prisoners.length,0);
assert.equal(multiRescue.history.at(-1).captures,2);
console.log('PRISONER V118 follow-up tests OK');

// En mode équipes, le vainqueur doit être une équipe, jamais un joueur.
const teams=[{id:'red',name:'Rouges',playerIds:['a']},{id:'blue',name:'Bleus',playerIds:['b']}];
let teamFinish=createPrisonerState(players,{participantMode:'teams',startingDarts:3},teams);
teamFinish.progressIndexByPlayer.a=teamFinish.sequence.length-1;
teamFinish=playPrisonerVisit(teamFinish,[{bed:'S',number:teamFinish.sequence.at(-1),singleRing:'outer'}]);
assert.equal(teamFinish.finished,true);
assert.deepEqual(teamFinish.winnerIds,['red']);
assert.equal(teamFinish.standings.find(row=>row.id==='red')?.completed,true);
console.log('PRISONER team results tests OK');

// Une série est consécutive : MISS / prisonnier / capture seule l'interrompent.
let streak=init({startingDarts:9,missPenaltyEnabled:false});
streak=playPrisonerVisit(streak,[{bed:'S',number:1,singleRing:'outer'},{bed:'MISS'},{bed:'S',number:18,singleRing:'outer'}]);
assert.equal(streak.statsByPlayer.a.bestProgressStreak,1);
assert.equal(streak.statsByPlayer.a.currentProgressStreak,1);
streak=playPrisonerVisit(streak,[{bed:'MISS'}]); // B
streak=playPrisonerVisit(streak,[{bed:'S',number:7,singleRing:'inner'}]); // A
assert.equal(streak.statsByPlayer.a.currentProgressStreak,0);
assert.equal(streak.statsByPlayer.a.bestProgressStreak,1);
// Le classement affiche les ex æquo dès la première ligne et partage les rangs.
const three=[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}];
const standings=createPrisonerState(three,{startingDarts:3});
assert.deepEqual(standings.standings.map(r=>r.rank),[1,1,1]);
assert.deepEqual(standings.standings.map(r=>r.tied),[true,true,true]);
standings.progressIndexByPlayer.c=1;
// Déclencher un recalcul via une volée normale.
const reordered=playPrisonerVisit(standings,[{bed:'MISS'}]);
assert.deepEqual(reordered.standings.map(r=>r.rank),[1,2,2]);
assert.deepEqual(reordered.standings.map(r=>r.tied),[false,true,true]);
console.log('PRISONER V121 streak and tied ranks tests OK');

// Classement individuel persistant : les rangs exportés doivent préserver les ex æquo.
const exportRanks = getPrisonerPlayerRanks(reordered);
assert.deepEqual(exportRanks, {a: 2, b: 2, c: 1});
const distinct = createPrisonerState(three, {startingDarts:3});
distinct.progressIndexByPlayer.a = 5;
distinct.progressIndexByPlayer.b = 3;
distinct.progressIndexByPlayer.c = 3;
distinct.statsByPlayer.c.captures = 1;
assert.deepEqual(getPrisonerPlayerRanks(distinct), {a: 1, b: 3, c: 2});
console.log('PRISONER V124 persistent ranking tests OK');

// History V4 : copies du même match et anciennes victoires en équipe.
const { uniquePrisonerRecords, isPrisonerPlayerWinner } = await import('../src/lib/gameEngines/prisonerHistoryStats.ts');
const original = { id: 'p-123', winnerIds: ['red'] };
const duplicate = { matchId: 'p-123', winnerIds: ['red'] };
const another = { id: 'p-124', winnerId: 'b' };
assert.deepEqual(uniquePrisonerRecords([original, duplicate, another]), [original, another]);
assert.equal(uniquePrisonerRecords([{}, {}]).length, 2, 'Conserver les historiques sans identifiant');
assert.equal(isPrisonerPlayerWinner(original, { playerId: 'a', teamId: 'red' }, 'a'), true);
assert.equal(isPrisonerPlayerWinner(original, { playerId: 'b', teamId: 'blue' }, 'b'), false);
assert.equal(isPrisonerPlayerWinner(another, { playerId: 'b' }, 'b'), true);
assert.equal(isPrisonerPlayerWinner({ payload: { summary: { winnerIds: ['red'] } } }, { teamId: 'red' }, 'a'), true);
console.log('PRISONER V128 History V4 / team win tests OK');

// V129 : History V4 doit préférer un snapshot plus récent du même match,
// sans dédoubler les statistiques ni perdre les archives sans ID.
const oldSnapshot = { id: 'p-recovered', updatedAt: 1000, payload: { stats: { players: [{ id: 'a', darts: 2 }] } } };
const newSnapshot = { matchId: 'p-recovered', updatedAt: 2000, payload: { stats: { players: [{ id: 'a', darts: 9 }] } } };
const noId = { updatedAt: 3000 };
assert.deepEqual(uniquePrisonerRecords([oldSnapshot, noId, newSnapshot]), [newSnapshot, noId]);
assert.deepEqual(uniquePrisonerRecords([newSnapshot, oldSnapshot]), [newSnapshot]);
assert.deepEqual(uniquePrisonerRecords([oldSnapshot, newSnapshot, another]), [newSnapshot, another]);
console.log('PRISONER V129 snapshots History V4 tests OK');

// V134 : dénominateur réel par parcours (et compatibilité des archives).
const { prisonerCourseLength } = await import('../src/lib/gameEngines/prisonerHistoryStats.ts');
assert.equal(prisonerCourseLength({ payload: { stats: { match: { courseLength: 12 } } } }), 12);
assert.equal(prisonerCourseLength({ summary: { matchStats: { courseLength: 15 } } }), 15);
assert.equal(prisonerCourseLength({ summary: { sequence: [1, 5, 9] } }), 3);
assert.equal(prisonerCourseLength({ payload: { state: { sequence: [1, 2, 3, 4] } } }), 4);
assert.equal(prisonerCourseLength({}), 20);
assert.equal(prisonerCourseLength({ payload: { stats: { match: { courseLength: 0 } } } }), 20);
console.log('PRISONER V134 variable course history tests OK');

// V135 : la variante Bull doit être sélectionnable en configuration, mémorisée,
// transmise au Play et reconnue par le moteur (pas de valeur figée).
const { readFileSync } = await import('node:fs');
const configSource = readFileSync(new URL('../src/pages/PrisonerConfig.tsx', import.meta.url), 'utf8');
const playSource = readFileSync(new URL('../src/pages/PrisonerPlay.tsx', import.meta.url), 'utf8');
assert.match(configSource, /value=\{bullCaptureRule\}/);
assert.match(configSource, /saved\.bullCaptureRule === "any_bull"/);
assert.match(configSource, /startingDarts, sequenceMode, bullCaptureRule, missPenaltyEnabled/);
assert.doesNotMatch(configSource, /bullCaptureRule: "bull"/);
assert.match(playSource, /raw\?\.bullCaptureRule === "any_bull"/);
console.log('PRISONER V135 Bull config-to-Play contract tests OK');

// V140 clôture : la stratégie IA suit le vrai moteur entre deux lancers.
const { planPrisonerBotVisit } = await import('../src/lib/gameEngines/prisonerEngine.ts');
let botRoute = init({ startingDarts: 3, sequenceMode: 'numeric' });
const routeShots = planPrisonerBotVisit(botRoute, 'a', 'hard', () => 0);
assert.deepEqual(routeShots.map((dart) => dart.number), [1, 2, 3], 'La cible IA doit avancer après chaque tir valide');
botRoute = playPrisonerVisit(botRoute, [{bed:'S',number:5,singleRing:'inner'}]);
// B est maintenant actif ; son premier tir doit capturer le prisonnier de A.
const captureShots = planPrisonerBotVisit(botRoute, 'b', 'hard', () => 0);
assert.equal(captureShots[0]?.number, 5);
const captureState = playPrisonerVisit(botRoute, captureShots);
assert.equal(captureState.statsByPlayer.b.opponentCaptures, 1);
let bullBot = init({ startingDarts: 3, bullCaptureRule: 'bull' });
bullBot = playPrisonerVisit(bullBot, [{bed:'IB'}]);
const bullShots = planPrisonerBotVisit(bullBot, 'b', 'hard', () => 0);
assert.equal(bullShots[0]?.bed, 'IB', 'Le bot doit viser le bon anneau du Bull classique');
assert.equal(playPrisonerVisit(bullBot,bullShots).statsByPlayer.b.opponentCaptures, 1);
console.log('PRISONER V140 IA dynamique et captures Bull tests OK');
