import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = p => fs.readFileSync(p,'utf8');
const changed = [
  'src/App.tsx', 'src/pages/Games.tsx',
  'src/lib/viewer/viewerNavigation.ts', 'src/lib/viewer/useViewerInteractiveBridge.ts',
  'src/lib/viewer/viewerAudioBridge.ts',
  'src/tv/samsung/SamsungTvApp.tsx', 'src/tv/samsung/SamsungTvSharedAppHost.tsx'
];
for (const file of changed) {
  const result = ts.transpileModule(read(file), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  assert.equal((result.diagnostics || []).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,`Syntax error: ${file}`);
}
const css = read('src/tv/samsung/samsung-adaptive-tv.css');
assert(css.includes('.five-lives-play-screen') && css.includes('.mss-br-play') && css.includes('.ca-page') && css.includes('.cp > .cp-layout'));
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g,'');
assert(!withoutComments.includes(':has('), 'Tizen 6.5 must not rely on :has()');
assert.equal((withoutComments.match(/\{/g)||[]).length,(withoutComments.match(/\}/g)||[]).length,'CSS brace mismatch');
const host = read('src/tv/samsung/SamsungTvSharedAppHost.tsx');
const tv = read('src/tv/samsung/SamsungTvApp.tsx');
const app = read('src/App.tsx');
assert(host.includes('samsung-adaptive-tv.css') && host.includes('MutationObserver(scheduleFocus)'));
assert(tv.includes('receiveViewerTvAudioCue') && tv.includes('viewer_audio_sink_ready'));
assert(app.includes('installViewerPhoneAudioRelay()'));
assert(read('src/lib/viewer/useViewerInteractiveBridge.ts').includes('setViewerTvAudioSink'));
const src = read('src/lib/viewer/viewerAudioBridge.ts');
const compiled = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const context = { module: {exports:{}}, exports: {}, require: () => ({}), URL, Date };
context.exports = context.module.exports;
vm.runInNewContext(compiled,context,{filename:'viewerAudioBridge.js'});
const {viewerAudioAssetPath} = context.module.exports;
assert.equal(viewerAudioAssetPath('/assets/test-abc.mp3','https://mss.example/'), 'assets/test-abc.mp3');
assert.equal(viewerAudioAssetPath('/sounds/bull.mp3','https://mss.example/'), 'sounds/bull.mp3');
assert.equal(viewerAudioAssetPath('https://other.example/sounds/abc.mp3','https://mss.example/'), null);
assert.equal(viewerAudioAssetPath('data:audio/mp3;base64,AA','https://mss.example/'), null);
assert.equal(viewerAudioAssetPath('/assets/../keys/secret.mp3','https://mss.example/'), null);
console.log('✅ Samsung V242: TS, routes, spatial focus, 16:9, audio relay, media paths — OK');
