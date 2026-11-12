import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const play = readFileSync(new URL('src/pages/CapitalPlay.tsx', root), 'utf8');
const transpiled = ts.transpileModule(play, {
  fileName: 'src/pages/CapitalPlay.tsx', reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
assert.deepEqual((transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')), []);
assert.match(play, /height: "clamp\(54px, 7vw, 72px\)"/);
assert.match(play, /<picture style=\{\{ display: "block", width: "100%", height: "100%"/);
assert.match(play, /<source media="\(max-width: 600px\)" srcSet="\/images\/capital\/contrat_tableau_signature_mobile_v154\.webp"\/>/);
assert.match(play, /<img src="\/images\/capital\/contrat_tableau_signature_v154\.webp"/);
assert.match(play, /objectFit: "cover", objectPosition: "center"/);
assert.match(play, /border: "1px solid rgba\(255,178,51,\.66\)"/);
assert.match(play, /aria-label="TABLEAU · CONTRATS \/ JOUEURS"/);
for (const asset of ['contrat_tableau_signature_v154.webp', 'contrat_tableau_signature_mobile_v154.webp']) {
  assert.ok(statSync(new URL(`public/images/capital/${asset}`, root)).size > 10000, `image ${asset} found`);
}
assert.ok(play.includes('setLiveStatsInitialTab("tableau")'), 'access remains wired');
console.log('CAPITAL V154 : banner desktop/mobile, aspect-adaptive cover, golden style, opening table: OK');
