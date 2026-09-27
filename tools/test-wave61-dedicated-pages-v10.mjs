import fs from 'node:fs';
import path from 'node:path';

function assert(cond, msg) { if (!cond) throw new Error(msg); }
const catalog = fs.readFileSync('src/games/dartsWave61.ts', 'utf8');
const ids = [...catalog.matchAll(/\{ id: "([^"]+)"/g)].map((m) => m[1]);
assert(ids.length === 61, `Catalogue attendu: 61, trouvé: ${ids.length}`);
assert(new Set(ids).size === 61, 'IDs Wave61 dupliqués');

const dir = 'src/pages/wave61/modes';
for (const id of ids) {
  const config = path.join(dir, `${id}Config.tsx`);
  const play = path.join(dir, `${id}Play.tsx`);
  assert(fs.existsSync(config), `Config dédiée absente: ${config}`);
  assert(fs.existsSync(play), `Play dédié absent: ${play}`);
  const c = fs.readFileSync(config, 'utf8');
  const p = fs.readFileSync(play, 'utf8');
  assert(c.includes(`WAVE61_MODE_ID = "${id}"`), `Config ${id}: mode id absent`);
  assert(p.includes(`WAVE61_MODE_ID = "${id}"`), `Play ${id}: mode id absent`);
  assert(c.includes('Wave61SharedConfig'), `Config ${id}: socle partagé absent`);
  assert(p.includes('Wave61SharedPlay'), `Play ${id}: socle partagé absent`);
}

const configRouter = fs.readFileSync('src/pages/Wave61Config.tsx', 'utf8');
const playRouter = fs.readFileSync('src/pages/Wave61Play.tsx', 'utf8');
assert(configRouter.includes('import.meta.glob("./wave61/modes/*Config.tsx")'), 'Dispatcher Config V10 absent');
assert(playRouter.includes('import.meta.glob("./wave61/modes/*Play.tsx")'), 'Dispatcher Play V10 absent');
assert(configRouter.includes('React.lazy'), 'Lazy loading Config V10 absent');
assert(playRouter.includes('React.lazy'), 'Lazy loading Play V10 absent');

console.log('✅ Wave61 V10 — 61 fichiers Config dédiés + 61 fichiers Play dédiés');
console.log('✅ Dispatchers lazy par gameId + moteur mutualisé conservé');
