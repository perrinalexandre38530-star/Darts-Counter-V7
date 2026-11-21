import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = f => fs.readFileSync(f, 'utf8');
const files = [
  'src/App.tsx', 'src/pages/Games.tsx', 'src/lib/viewer/viewerNavigation.ts',
  'src/lib/viewer/useViewerInteractiveBridge.ts', 'src/lib/viewer/viewerAudioBridge.ts',
  'src/tv/samsung/SamsungTvApp.tsx', 'src/tv/samsung/SamsungTvSharedAppHost.tsx',
];
for (const file of files) {
  const diagnostics = ts.transpileModule(read(file), {
    fileName:file,
    compilerOptions:{ module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2019, jsx:ts.JsxEmit.ReactJSX },
    reportDiagnostics:true,
  }).diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) || [];
  assert.deepEqual(diagnostics,[], `TS parse failed for ${file}`);
}
const html = read('tv-samsung/index.html');
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  new vm.Script(match[1],{filename:'tv-samsung/index.html'});
}
assert.ok(html.indexOf('structuredClone') < html.indexOf('type="module"'));
assert.ok(html.indexOf('__MSS_TV_RESOLVE_MEDIA__') < html.indexOf('type="module"'));
const stage = read('tools/prepare-samsung-tv-package.mjs');
const build = read('tools/build-samsung-tv.mjs');
for (const name of ['sounds','challenge','awena','cast','fit']) {
  assert.match(stage,new RegExp(`\\b${name}\\b`));
  assert.match(build,new RegExp(`\\b${name}\\b`));
}
const tv = read('src/tv/samsung/SamsungTvApp.tsx');
const host = read('src/tv/samsung/SamsungTvSharedAppHost.tsx');
const css = read('src/tv/samsung/samsung-shared-app.css');
const phoneCss = read('src/styles/responsive-landscape.css');
const bridge = read('src/lib/viewer/useViewerInteractiveBridge.ts');
const app = read('src/App.tsx');
for(const match of ['tv_audio_play','tv_audio_ready','tv_audio_failed']) {
  assert.ok(tv.includes(match),`TV receiver missing ${match}`);
}
assert.match(host,/cardsObserver\.disconnect\(\)/);
assert.match(host,/\[aria-modal="true"\]/);
assert.match(tv,/MSS_TV_V242_ADAPTIVE_MEDIA_AUDIO_REMOTE_20261120/);
assert.match(css,/\.five-lives-play-screen/);
assert.match(css,/\.mss-br-play \.mss-br-content/);
assert.match(css,/\.cp-layout/);
assert.match(phoneCss,/data-msc-device="phone"/);
assert.match(bridge,/markViewerTvAudioReady\(sessionId, true\)/);
// App.tsx deliberately uses the legacy phone entrypoint. Ensure it exists
// in the bridge module; a missing named export crashes Vite before React mounts.
assert.match(app,/installViewerPhoneAudioRelay/);
assert.match(read('src/lib/viewer/viewerAudioBridge.ts'),/export function installViewerPhoneAudioRelay\(/);
assert.match(app,/!\(isSamsungTvNativeApp && isGamePlayRoute\)/);
assert.match(tv,/mss:samsung-tv:apply-phone-route/);
assert.match(css,/\.msc-games-secondary/);
// Check the early URL shim routes two real legacy references to the WGT.
const resolver = html.match(/var localDirs\s*=\s*(\/[^;]+);/)?.[1];
assert.ok(resolver);
const localRE = vm.runInNewContext(resolver);
for (const src of ['sounds/dart-hit.mp3','challenge/ticker_challenge.png','awena/awena-avatar.webp']) {
  assert.ok(localRE.test(src),`TV media folder not mapped: ${src}`);
}
const result = spawnSync(process.execPath,['./tools/test-samsung-v241-full-sync.mjs'],{cwd:process.cwd(),encoding:'utf8'});
assert.equal(result.status,0,result.stderr||result.stdout);
console.log('✅ Samsung V242 : syntaxe, V241, menus, plein écran, télécommande, médias, SFX — contrôles statiques OK');
console.log('ℹ️ Tests matériels et build Tizen restent nécessaires.');
