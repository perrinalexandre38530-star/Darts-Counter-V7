/** MSS V248 landscape contract checks, no npm packages or TV required. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const css = read('src/styles/mss-landscape-fit-v248.css');
const bridge = read('src/components/gameplay/LandscapePageFitBridge.tsx');
const responsive = read('src/styles/responsive-landscape.css');
const tv = read('src/tv/samsung/SamsungTvSharedAppHost.tsx');

assert.ok(app.includes('import LandscapePageFitBridge from'), 'Le pont landscape doit etre importe');
assert.ok(app.includes('<LandscapePageFitBridge routeKey={String(tab)} />'), 'Le pont doit suivre les changements de page');
assert.ok(app.includes('import "./styles/mss-landscape-fit-v248.css"'), 'Le style commun doit etre charge');
assert.ok(bridge.includes('MutationObserver(refresh)'), 'Les routes lazy-loaded doivent etre prises en charge');
assert.ok(bridge.includes('current.dataset.mssLandscapeUnclamp = "1"'), 'Les seuls conteneurs centraux etroits doivent etre elargis');
assert.ok(bridge.includes('content.length !== 1'), 'Ne pas modifier les conteneurs multi-cartes');
assert.ok(css.includes('[data-mss-auto-play-ready="unresolved"]'), 'Les parties sans layout natif doivent rester accessibles');
assert.ok(css.includes('[data-mss-samsung-tv-shared-app="1"]'), 'Les regles TV doivent rester ciblees');
assert.ok(!css.includes('background-color:'), 'Le patch ne doit pas changer les couleurs de keypad');
assert.ok(responsive.includes('data-msc-orientation="landscape"'), 'Conserver le responsive existant');
assert.ok(tv.includes('RemoteFocusBridge'), 'Conserver la navigation telecommande existante');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(path.join(dir, entry.name), out);
    else if (/\.(tsx|css)$/.test(entry.name)) out.push(path.join(dir, entry.name));
  }
  return out;
}
const pages = walk(fileURLToPath(new URL('../src/pages/', import.meta.url)));
const fixed = pages.filter((p) => /maxWidth\s*:\s*(?:\d{3,}|["'`]\d{3,}px)|max-width\s*:\s*\d{3,}px/.test(fs.readFileSync(p,'utf8')));
console.log(`MSS V248 LANDSCAPE GATE OK — ${pages.length} fichiers ecran examines; ${fixed.length} avec des limites numeriques a surveiller.`);
console.log('Priorite validation reelle : GAMES / X01 / FIVE LIVES / BATTLE ROYALE / CHALLENGE / navigation telecommande.');
