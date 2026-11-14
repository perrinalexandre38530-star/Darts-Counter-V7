/**
 * Static/syntax contract for a safe native share flow on Android and iOS.
 * Only a real phone can finally validate the share sheet.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const read = file => fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const component=read('src/components/ShoveFinalExportActions.tsx');
const engine=read('src/lib/challengeResultsExport.ts');
const compiled=ts.transpileModule(component,{fileName:'ShoveFinalExportActions.tsx',reportDiagnostics:true,
  compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
assert.match(component,/const prepareShare=async\(\)=>/);
assert.match(component,/await mod\.prepareChallengeShare\(report\)/);
assert.match(component,/if\(liveMatchIdRef\.current!==preparingForId\)return/);
assert.match(component,/preparedMatchId!==matchIdentity/);
assert.match(component,/const shareNow=\(format:ShareFormat\)=>\{/);
assert.match(component,/const pending=sharePreparedRef\.current\(prepared,format\);\s*setBusy\('share'\)/,
  'share method must be called synchronously BEFORE any state-update async task');
assert.doesNotMatch(component,/const shareNow=async/);
assert.match(engine,/export function sharePreparedChallenge\(/);
assert.match(engine,/const pending = nav\.share\(\{files,title:prepared\.title/);
assert.match(component,/data-shove-native-share-ready/);
assert.match(component,/saveError \? <div/);
console.log('✅ SHOVE V146 : partage natif préparé, appel synchrone sur clic, contrôle identité, TypeScript TSX.');
