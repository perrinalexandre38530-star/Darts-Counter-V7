import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const play = fs.readFileSync(path.join(root, 'src/pages/KillerPlay.tsx'), 'utf8');
const config = fs.readFileSync(path.join(root, 'src/pages/KillerConfig.tsx'), 'utf8');

function mustInclude(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`Missing regression guard: ${label}`);
}
function mustNotInclude(source, needle, label) {
  if (source.includes(needle)) throw new Error(`Forbidden regression pattern: ${label}`);
}

// 1) "random" is NOT an in-game assignment round and must not reshuffle players in KillerPlay.
mustInclude(play, 'const inNumberAssignRound = numberAssignMode === "throw";', 'throw-only assignment round');
const randomStart = play.indexOf('if (numberAssignMode === "random") {');
const throwStart = play.indexOf('if (numberAssignMode === "throw") {', randomStart);
if (randomStart < 0 || throwStart < 0) throw new Error('Unable to isolate random-number initialization block');
const randomBlock = play.slice(randomStart, throwStart);
mustNotInclude(randomBlock, '[base[i], base[j]]', 'random-number mode must not reshuffle player order');

// 2) Bots are auto-numbered and never belong to the human throw-assignment queue.
mustInclude(play, 'const waitsForHumanThrow = inNumberAssignRound && !p.isBot;', 'human-only throw assignment');
mustInclude(play, '!p.eliminated && !p.isBot && p.killerPhase === "SELECT"', 'pending human assignment filter');
mustInclude(play, 'const actingTurnIndex = assignActive ? effectiveAssignIndex : turnIndex;', 'race-free assignment actor index');
mustInclude(play, 'const nextIdx = nextPendingHumanAssignIndex(actingTurnIndex);', 'skip bots when advancing assignment');
mustInclude(play, 'if (assignActive && me.killerPhase === "SELECT") {', 'legacy bot SELECT safety');

// 3) Resume cannot convert a human SELECT/number 0 into ARMING (Progressive included).
mustInclude(play, 'const resumeNeedsHumanNumber =', 'resume assignment compatibility');
mustInclude(play, 'merged.killerPhase = "SELECT";', 'resume preserves pending human SELECT');

// 4) Bot gameplay parity for Killer variants/stats.
mustInclude(play, 'if (playerHasShield(victim) || victim.resurrectShield) {', 'bot direct attacks respect shields');
mustInclude(play, 'type: "RESURRECT_SHIELD_BLOCK"', 'bot respects resurrection shield');
mustInclude(play, 'if (disarmEnabled) {', 'DBULL disarm implemented');
mustInclude(play, 'me2.throwsToBecomeKiller += 1;', 'bot throws-to-killer stats');
mustInclude(play, 'me2.killerThrows += 1;', 'bot killer-throw stats');

// 5) Unique target numbers are only defined for 1..20, so config must cap participants.
mustInclude(config, 'selectedIds.length >= 2 && selectedIds.length <= 20', '20-player start guard');
mustInclude(config, 'selectedIds.length >= 20', '20-player selection guard');

console.log('OK — Killer bot flow: automatic unique numbers, human-only throw assignment, race-free launch, resume compatibility, bot rule parity, 20-player safety.');
