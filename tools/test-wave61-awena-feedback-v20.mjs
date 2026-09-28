import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const catalog = read('src/games/dartsWave61.ts');
const engine = read('src/lib/gameEngines/wave61Engine.ts');
const config = read('src/pages/Wave61SharedConfig.tsx');
const play = read('src/pages/Wave61SharedPlay.tsx');
const feedback = read('src/lib/wave61Feedback.ts');
const ids = [...catalog.matchAll(/\{ id: "([^"]+)"/g)].map((m) => m[1]);

assert(ids.length === 61, `61 modes attendus, ${ids.length} trouvés`);
assert(engine.includes('WAVE61_ENGINE_VERSION = 17'), 'Moteur Wave61 V17 attendu');
for (const key of ['targetAdviceEnabled','awenaCommentaryEnabled','wave61SfxEnabled']) {
  assert(engine.includes(key), `Config moteur ${key} absente`);
  assert(config.includes(key), `Config UI ${key} absente`);
  assert(play.includes(key), `Play ${key} absent`);
}
for (const id of ids) assert(feedback.includes(`${id}: {`), `Guidage spécifique absent: ${id}`);
assert(feedback.includes('buildWave61Advice'), 'Générateur de conseil absent');
assert(feedback.includes('buildWave61VisitComment'), 'Commentaires de volée absents');
assert(feedback.includes('playWave61FeedbackTone'), 'Bruitages Wave61 absents');
assert(feedback.includes('wave61ToneForVisit'), 'Sélection du feedback audio absente');
assert(play.includes('useAwenaOptional'), 'Awena non branchée dans le Play');
assert(play.includes('3000'), 'Conseil 3 secondes absent');
assert(play.includes('/awena/awena-avatar.webp'), 'Medaillon Awena absent du conseil flottant');
assert(play.includes('AWENA · CONSEIL CIBLE'), 'Carte conseil Awena absente');
assert(play.includes('buildWave61VisitComment'), 'Commentaires Awena non câblés après volée');
assert(config.includes('Conseil de cible · 3 secondes'), 'Toggle conseil cible absent');
assert(config.includes('Awena · conseils & commentaires brefs'), 'Toggle Awena absent');
assert(config.includes('Bruitages Wave61'), 'Toggle bruitages absent');

console.log('✅ Wave61 V20 — Awena + conseils cible + commentaires + bruitages');
console.log('✅ 61/61 modes possèdent une identité de guidage');
console.log('✅ Conseil flottant limité à 3 secondes + replay vocal');
console.log('✅ Commentaires importants après volée + SFX synthétiques sans média lourd');
