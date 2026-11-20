import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
import vm from 'node:vm';

const read = file => fs.readFileSync(file, 'utf8');
const app = read('src/App.tsx');
const games = read('src/pages/Games.tsx');
const tv = read('src/tv/samsung/SamsungTvApp.tsx');
const host = read('src/tv/samsung/SamsungTvSharedAppHost.tsx');
const bridge = read('src/lib/viewer/useViewerInteractiveBridge.ts');
const css = read('src/tv/samsung/samsung-shared-app.css');
const navSrc = read('src/lib/viewer/viewerNavigation.ts');
const html = read('tv-samsung/index.html');

// Parse every changed TS/TSX file; this test requires no built app or TV.
for (const file of [
  'src/App.tsx', 'src/pages/Games.tsx', 'src/tv/samsung/SamsungTvApp.tsx',
  'src/tv/samsung/SamsungTvSharedAppHost.tsx',
  'src/lib/viewer/useViewerInteractiveBridge.ts',
  'src/lib/viewer/viewerNavigation.ts',
]) {
  const errors = ts.transpileModule(read(file), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  }).diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) || [];
  assert.equal(errors.length, 0, `Syntaxe TS/TSX invalide : ${file}`);
}

// Exercise the real sanitizer as a pure module, not merely a source-string check.
const compiled = ts.transpileModule(navSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, console, WeakSet, JSON, Object, Set }, { filename: 'viewerNavigation.js' });
const { sanitizeViewerRouteParams, isViewerRemoteTabAllowed, isViewerGameplayRoute } = exports;
const payload = {
  gamesView: 'all', gamesCategory: 'fun', gameId: 'crados',
  launchMode: 'quick_play', variantId: 'chase',
  quickPlayers: [{ id: '1', name: 'Ninja' }],
  config: { startScore: 501, players: [{ id: '1', name: 'Ninja' }] },
  x01ConfigV3: { startScore: 501 },
  source: 'phone', token: 'secret',
};
const out = sanitizeViewerRouteParams(payload);
for (const [k, v] of [
  ['gamesView', 'all'], ['gamesCategory', 'fun'], ['gameId', 'crados'],
  ['launchMode', 'quick_play'], ['variantId', 'chase'],
]) assert.equal(out[k], v, `Paramètre ${k} manquant`);
assert.equal(out.quickPlayers[0].name, 'Ninja');
assert.equal(out.config.players[0].name, 'Ninja');
assert.equal(out.source, undefined);
assert.equal(out.token, undefined);
const bigImage = 'data:image/png;base64,' + 'a'.repeat(100000);
const sanitized = sanitizeViewerRouteParams({ config: { player: { avatar: bigImage, name: 'Ninja' } } });
assert.equal(sanitized.config.player.avatar, undefined);
assert.equal(sanitized.config.player.name, 'Ninja');
assert.equal(sanitizeViewerRouteParams({ config: { password: 'secret', player: { name: 'Ninja' } } }).config.password, undefined);
for (const route of ['games', 'darts_entry_choice', 'tossit_config', 'crados_config', 'killer_play', 'molkky_config', 'wave61_play', 'x01_play_v3', 'five_lives_config']) {
  assert.equal(isViewerRemoteTabAllowed(route), true, `Route TV→téléphone bloquée : ${route}`);
}
assert.equal(isViewerRemoteTabAllowed('admin_secret'), false);
assert.equal(isViewerRemoteTabAllowed('auth_reset'), false);
assert.equal(isViewerGameplayRoute('x01_play_v3'), true);

// Regression checks specific to reported faults.
assert.match(tv, /autoFollowGameRef\.current = false/);
assert.match(tv, /!phoneNavigationRef\.current \|\| phoneNavigationRef\.current\.gameplay/);
assert.match(tv, /mss:samsung-tv:apply-phone-route/);
assert.match(tv, /const x01InferredConfigCache = new Map/);
assert.match(tv, /createdAt: fallback\.createdAt/);
assert.match(tv, /if \(previousNav && nav\.at < previousNav\.at\) return;/);
assert.match(tv, /sendNavigate\("games", \{ gamesView: "hub", source: "samsung-tv" \}\)/);
assert.doesNotMatch(tv, /key=\{`\$\{sharedAppBoot\.storeMode[^`]*sharedAppBoot\.tab/);
assert.match(host, /activeTab === "x01_play_v3"/);
assert.match(app, /mss:samsung-tv:apply-phone-route/);
assert.match(app, /setRouteParams\(nextParams\);\s*setTab\(next as Tab\);/);
assert.match(app, /!\(isSamsungTvNativeApp && isGamePlayRoute\)/);
assert.match(css, /\[data-msc-route="games"\] \.msc-games-secondary/);
assert.match(games, /gamesSubcategory: id/);
assert.match(games, /gamesCategory: c\.id/);
assert.match(css, /\[data-msc-game-screen="play"\][\s\S]*?width: 100vw !important/);
assert.match(bridge, /"tossit"/);
assert.ok(html.indexOf('globalThis.structuredClone =') < html.indexOf('type="module"'));
console.log('✅ Samsung V241 : menus, routes, X01, fullscreen, sortie anti-boucle — tests OK');
