/** V206 — projections StatsHub / History V4 : tests lecture-seule. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const read = (relative) => readFileSync(resolve(root, relative), 'utf8');
const temp = mkdtempSync(join(tmpdir(), 'mss-v206-'));
let mod;
try {
  writeFileSync(join(temp,'historyDartsVariants.ts'), read('src/lib/historyDartsVariants.ts'));
  writeFileSync(join(temp,'dartsFamilyStatsSource.ts'), read('src/lib/stats/dartsFamilyStatsSource.ts')
    .replace('from "../historyDartsVariants"', 'from "./historyDartsVariants.ts"'));
  mod = await import(pathToFileURL(join(temp,'dartsFamilyStatsSource.ts')).href);
} finally {
  // ESM modules are loaded into memory before cleanup.
  rmSync(temp, { recursive: true, force: true });
}
const { dartsFamilyStatsMode: mode, shouldHydrateFamilyHistoryForStats: hydrate,
  dartsStatsRowMatchesProfile: rowMatches, isDartsFamilyDraw: isDraw } = mod;

const fixtures = [
  [{kind:'five_lives'}, 'five_lives'],
  [{kind:'five_lives',variantId:'chase'}, 'five_lives'],
  [{kind:'chase'}, 'five_lives'],
  [{kind:'halve_it'}, 'halve_it'],
  [{kind:'halve_it',variantId:'split_score'}, 'split_score'],
  [{kind:'halve_it',summary:{variantId:'split_score'}}, 'split_score'],
  [{kind:'halve_it',payload:{config:{variantId:'split_score'}}}, 'split_score'],
  [{kind:'halve_it',payload:{summary:{variantId:'split_score'}}}, 'split_score'],
  [{kind:'split_score'}, 'split_score'],
  [{kind:'steeplechase',variantId:'chase'}, null],
  [{kind:'x01',variantId:'split_score'}, null],
];
for (const [record, expected] of fixtures) {
  const original = structuredClone(record);
  assert.equal(mode(record), expected, JSON.stringify(record));
  assert.deepEqual(record, original, 'source History V4 non modifiée');
}
assert.equal(hydrate({kind:'halve_it'},'split_score'), true, 'en-tête light de Split Score sous mode HALVE-IT');
assert.equal(hydrate({kind:'halve_it',variantId:'split_score'},'split_score'), true);
assert.equal(hydrate({kind:'five_lives',variantId:'chase'},'five_lives'), true, 'CHASE inclus dans la famille 5 VIES');
assert.equal(hydrate({kind:'x01'},'split_score'), false);
assert.equal(hydrate({kind:'five_lives'},'split_score'), false);
assert.equal(hydrate({kind:'halve_it'},'five_lives'), false);
assert.equal(rowMatches({id:'ninja-old',name:'Ninja'},'ninja-now','Ninja'),false,'pas de fusion d’homonymes identifiés');
assert.equal(rowMatches({id:'old',playerId:'now',name:'Ninja'},'now','Ninja'),true,'autre champ playerId canonique');
assert.equal(rowMatches({name:'Ninja'},'now','ninja'),true,'archive anonyme compatible par nom');
assert.equal(rowMatches({name:'Ninja'},'now','Chevroute'),false);
assert.equal(rowMatches({profileId:'online:abc'},'abc'),true);
assert.equal(isDraw({kind:'halve_it',payload:{summary:{tied:true}}}),true);
assert.equal(isDraw({kind:'halve_it',summary:{tied:false}}),false);

const hub=read('src/pages/StatsHub.tsx');
const halve=read('src/components/stats/HalveItStatsTabFull.tsx');
const five=read('src/stats/FiveLivesStatsTabFull.tsx');
assert.match(hub,/const dartsFamilyMode = dartsFamilyStatsMode\(rec\)/,'classificateur central dans StatsHub');
assert.match(hub,/shouldHydrateFamilyHistoryForStats\(r, focusedMode\)/,'forcer l’hydratation du mode lié');
assert.match(halve,/dartsFamilyStatsMode\(record\) === mode/,'séparer les variantes dans le détail HALVE-IT');
assert.match(halve,/!isDartsFamilyDraw\(record\)/,'ne pas compter les égalités comme victoire');
assert.match(halve,/dartsStatsRowMatchesProfile\(row, id, name\)/,'protection identités HALVE-IT');
assert.match(five,/dartsStatsRowMatchesProfile\(row, playerId, playerName\)/,'protection identités 5 VIES');
assert.match(five,/dartsFamilyStatsMode\(rec\) === "five_lives"/,'CHASE dans les stats de famille');
console.log(`PASS V206 — ${fixtures.length} classifications, tests hydratation, identités, égalités, raccordements UI`);
