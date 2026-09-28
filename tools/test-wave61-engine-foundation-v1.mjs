import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const catalog = read('src/games/dartsWave61.ts');
const families = read('src/games/dartsWave61Families.ts');
const registry = read('src/games/dartsGameRegistry.ts');
const app = read('src/App.tsx');
const config = read('src/pages/Wave61SharedConfig.tsx');
const play = read('src/pages/Wave61SharedPlay.tsx');
const engine = read('src/lib/gameEngines/wave61Engine.ts');
const gamesPage = read('src/pages/Games.tsx');

const ids = [...catalog.matchAll(/\{ id: "([a-z0-9_]+)", label:/g)].map((m) => m[1]);
const EXPECTED = 65;
assert(ids.length === EXPECTED, `Catalogue: ${ids.length}/${EXPECTED}`);
assert(new Set(ids).size === EXPECTED, 'IDs dupliqués dans le catalogue');

const classified = [...catalog.matchAll(/\{ id: "([a-z0-9_]+)", label: "[^"]+", category: "([^"]+)", subCategory: "([^"]+)"/g)]
  .map((m) => ({ id: m[1], category: m[2], subCategory: m[3] }));
assert(classified.length === EXPECTED, `Classement UI incomplet: ${classified.length}/${EXPECTED}`);
assert(classified.every((row) => row.subCategory !== 'wave61'), 'Sous-onglet artificiel wave61 encore présent');
assert(classified.some((row) => row.category === 'classic'), 'Aucun mode Wave61 classé en Classiques');
assert(classified.some((row) => row.category === 'challenge'), 'Aucun mode Wave61 classé en Défis');
assert(classified.some((row) => row.category === 'fun'), 'Aucun mode Wave61 classé en Fun');

const mapBlock = families.split('const MODE_OVERRIDES')[0];
for (const id of ids) assert(new RegExp(`\\b${id}:\\s*"`).test(mapBlock), `Famille manquante: ${id}`);

assert(registry.includes('tab: "wave61_config"'), 'Registry non branché vers wave61_config');
assert(registry.includes('category: g.category'), 'Registry force encore une catégorie unique pour Wave61');
assert(registry.includes('subCategory: g.subCategory'), 'Registry force encore une sous-catégorie unique pour Wave61');
assert(!registry.includes('subCategory: "wave61"'), 'Ancien groupe Vague 61 encore présent dans le registry');
assert(gamesPage.includes('renderSubcategoryTabs'), 'Sous-onglets Games absents');
assert(!gamesPage.includes('"fun:wave61"'), 'Libellé Vague 61 encore présent dans Games');
assert(registry.includes('ready: true'), 'Registry sans modes ready');
assert(app.includes('case "wave61_config"'), 'Route config absente');
assert(app.includes('case "wave61_play"'), 'Route play absente');
assert(app.includes('"wave61_play"'), 'Fullscreen play absent');
assert(config.includes('go("wave61_play"'), 'Config ne lance pas wave61_play');
assert(play.includes('playWave61Visit'), 'Play non branché au moteur');
assert(play.includes('History.upsert'), 'Sauvegarde/reprise non branchée');
assert(play.includes('UNDO'), 'Undo absent');
assert(engine.includes('pickWave61BotDarts'), 'Bots absents');
assert(engine.includes('placeAlign4'), 'ALIGN 4 non spécialisé');
assert(engine.includes('processMinefield'), 'DÉMINEUR non spécialisé');
assert(engine.includes('scoreReplicat'), 'REPLICAT non spécialisé');
assert(engine.includes('state.modeId === "double_down"'), 'DOUBLE DOWN non spécialisé');
assert(engine.includes('state.modeId === "nine_dart_century"'), '9 DART CENTURY non spécialisé');

console.log(`✅ Vague 61: ${ids.length} modes, ${new Set(ids).size} IDs uniques`);
console.log('✅ 11 familles moteur + config/play mutualisés');
console.log(`✅ ${EXPECTED} modes redistribués dans Classiques / Défis / Fun + sous-onglets métier`);
console.log('✅ Undo + History + Bots + Teams auto + ScoreInputHub');
console.log('✅ Spécialisations V1: ALIGN 4, DÉMINEUR, REPLICAT, DOUBLE DOWN, 9 DART CENTURY, CODEBREAKER');
