import assert from "node:assert/strict";
import { createPtitHunState, playPtitHunVisit } from "../src/lib/gameEngines/ptitHunEngine.ts";

const players = [{ id: "p1", name: "Test" }] as any;
const inner = (n: number) => ({ bed: "S", number: n, ring: "inner_single" } as any);
const outer = (n: number) => ({ bed: "S", number: n, ring: "outer_single" } as any);
const D = (n: number) => ({ bed: "D", number: n } as any);
const T = (n: number) => ({ bed: "T", number: n } as any);
const OB = { bed: "OB" } as any;
const IB = { bed: "IB" } as any;
const MISS = { bed: "MISS" } as any;
const cfg = { mode: "ptit_hun", selectedIds: ["p1"], players: 1, rules: { rounds: 30, jackpotEnabled: false } } as any;

let s = createPtitHunState(players, cfg);
assert.equal(s.scores.p1, 20);
s = playPtitHunVisit(s, [inner(1), inner(2), inner(3)]);
assert.equal(s.scores.p1, 26, "petits simples = valeurs normales");
s = playPtitHunVisit(s, [outer(1), inner(1), inner(1)]);
assert.equal(s.scores.p1, 38, "gros 1 = +10 par défaut");
s = playPtitHunVisit(s, [D(1), inner(1), inner(1)]);
assert.equal(s.scores.p1, 44, "D1 = valeur réelle 2 × facteur 2 = +4");
s = playPtitHunVisit(s, [T(1), inner(1), inner(1)]);
assert.equal(s.scores.p1, 55, "T1 = valeur réelle 3 × facteur 3 = +9");
s = playPtitHunVisit(s, [OB, inner(1), inner(1)]);
assert.equal(s.scores.p1, 157, "Bull25 = 25 ×4 = +100");
s = playPtitHunVisit(s, [MISS, inner(1), inner(1)]);
assert.equal(s.scores.p1, 787, "MISS multiplie immédiatement le score courant ×5");

let examples = createPtitHunState(players, cfg);
examples.scores.p1 = 0;
examples = playPtitHunVisit(examples, [D(5), inner(1), inner(1)]);
assert.equal(examples.scores.p1, 22, "D5 = valeur réelle 10 ×2 = +20, puis +1 +1");
examples.scores.p1 = 0;
examples = playPtitHunVisit(examples, [T(5), inner(1), inner(1)]);
assert.equal(examples.scores.p1, 47, "T5 = valeur réelle 15 ×3 = +45, puis +1 +1");

let t = createPtitHunState(players, cfg);
t = playPtitHunVisit(t, [inner(5), inner(5), inner(5)]);
assert.equal(t.scores.p1, 20, "TRIPLE NUL annule la volée, pas le score total");
assert.equal(t.statsByPlayer.p1.tripleNuls, 1);
assert.equal(t.statsByPlayer.p1.zeroVisits, 1, "un Triple Nul compte comme volée à 0");


let p1 = createPtitHunState(players, cfg);
p1 = playPtitHunVisit(p1, [inner(1), inner(1), inner(1)]);
assert.equal(p1.scores.p1, 20, "3 petits 1 = P’TIT 1 PARFAIT et volée à 0");
assert.equal(p1.statsByPlayer.p1.petitOneHits, 3);
assert.equal(p1.statsByPlayer.p1.petitOneTriples, 1);
assert.equal(p1.visits.at(-1)?.petitOnePerfect, true);

let b = createPtitHunState(players, { ...cfg, rules: { ...cfg.rules, shieldEnabled: true, cleanVisitsForShield: 3, shieldDivider: 2 } });
b = playPtitHunVisit(b, [inner(1), inner(1), inner(1)]);
b = playPtitHunVisit(b, [inner(6), inner(6), inner(6)]);
b = playPtitHunVisit(b, [inner(5), inner(5), inner(5)]);
assert.equal(b.shieldActive.p1, true, "3 TRIPLE NUL consécutifs débloquent le bouclier");
const beforeShield = b.scores.p1;
b = playPtitHunVisit(b, [outer(1), inner(1), inner(1)]);
assert.ok(b.scores.p1 > beforeShield && b.scores.p1 < beforeShield + 12, "bouclier réduit la pénalité positive");

let z = createPtitHunState(players, { ...cfg, rules: { ...cfg.rules, dbullEnabled: true, zeroAbsoluteEnabled: true, dbullsForZero: 3 } });
z.scores.p1 = 100;
z = playPtitHunVisit(z, [IB, inner(1), inner(1)]);
assert.equal(z.scores.p1, 52, "1er DBULL : 100 ÷2 puis +1 +1");
z = playPtitHunVisit(z, [IB, inner(1), inner(1)]);
assert.equal(z.scores.p1, 15, "2e DBULL cumulé : 52 ÷4 puis +1 +1");
z = playPtitHunVisit(z, [IB, inner(1), inner(1)]);
assert.equal(z.scores.p1, 2, "3e DBULL : ZÉRO ABSOLU au hit puis la volée continue");
assert.equal(z.statsByPlayer.p1.zeroAbsolute, 1);
assert.ok((z.visits.at(-1)?.dartSteps || []).some((step:any) => step.zeroAbsoluteNow && step.after === 0), "ZÉRO ABSOLU est appliqué au moment exact du DBULL");

let j = createPtitHunState(players, { ...cfg, rules: { ...cfg.rules, jackpotEnabled: true, jackpotRingMode: "triple", jackpotZones: 1, jackpotRefresh: "visit" } });
j.jackpotTargets = [{ bed: "T", number: 7, label: "T7" }];
const beforeJackpot = j.scores.p1;
j = playPtitHunVisit(j, [inner(1), T(7), MISS]);
assert.equal(j.scores.p1, beforeJackpot, "Jackpot T7 force toute la volée à 0");
assert.equal(j.statsByPlayer.p1.jackpotVisits, 1);
assert.equal(j.statsByPlayer.p1.zeroVisits, 1, "un Jackpot compte comme volée à 0");
assert.equal(j.visits.at(-1)?.jackpotHit, true);

let noJ = createPtitHunState(players, { ...cfg, rules: { ...cfg.rules, jackpotEnabled: true, jackpotRingMode: "double", jackpotZones: 1 } });
noJ.jackpotTargets = [{ bed: "D", number: 5, label: "D5" }];
const beforeNoJ = noJ.scores.p1;
noJ = playPtitHunVisit(noJ, [inner(5), inner(5), outer(5)]);
assert.notEqual(noJ.scores.p1, beforeNoJ, "un simple 5 ne déclenche jamais un Jackpot D5");
assert.equal(noJ.statsByPlayer.p1.jackpotVisits, 0);

let custom = createPtitHunState(players, { ...cfg, rules: { ...cfg.rules, startScore: 50, outerSingleFactor: 20, missMode: "add", missValue: 100, doubleFactor: 3, tripleFactor: 4, bull25Factor: 5, jackpotEnabled: false } });
assert.equal(custom.scores.p1, 50);
custom = playPtitHunVisit(custom, [outer(2), MISS, inner(1)]);
assert.equal(custom.scores.p1, 191, "variantes de scoring configurables appliquées");

let zeroGuard = createPtitHunState(players, { ...cfg, rules: { ...cfg.rules, startScore: 20, jackpotEnabled: false, shieldEnabled: false } });
zeroGuard.scores.p1 = 0;
zeroGuard = playPtitHunVisit(zeroGuard, [T(1), inner(1), inner(1)]);
assert.equal(zeroGuard.scores.p1, 11, "à 0, T1 ajoute sa valeur réelle 3 ×3 = 9 puis +1 +1");
assert.equal(zeroGuard.visits.at(-1)?.zeroPenaltyFloor, false, "le plancher anti-exploit ne concerne que le MISS multiplicatif");
let zeroMiss = createPtitHunState(players, { ...cfg, rules: { ...cfg.rules, startScore: 20, jackpotEnabled: false, shieldEnabled: false } });
zeroMiss.scores.p1 = 0;
zeroMiss = playPtitHunVisit(zeroMiss, [MISS, inner(1), inner(1)]);
assert.equal(zeroMiss.scores.p1, 102, "MISS à 0 repart du score de départ 20 ×5 puis +1 +1");
assert.equal(zeroMiss.visits.at(-1)?.zeroPenaltyFloor, true);

let zeroJackpot = createPtitHunState(players, { ...cfg, rules: { ...cfg.rules, startScore: 20, jackpotEnabled: true, jackpotRingMode: "triple", jackpotZones: 1 } });
zeroJackpot.scores.p1 = 0;
zeroJackpot.jackpotTargets = [{ bed: "T", number: 7, label: "T7" }];
zeroJackpot = playPtitHunVisit(zeroJackpot, [T(7), MISS, D(20)]);
assert.equal(zeroJackpot.scores.p1, 0, "à 0, un Jackpot reste une vraie volée à 0");

console.log("P’TIT 1 regression: OK");
