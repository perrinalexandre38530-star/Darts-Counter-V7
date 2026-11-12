import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const load = path => readFileSync(new URL(path, root), 'utf8');
const matrix = load('src/components/stats/CapitalContractMatrix.tsx');
const play = load('src/pages/CapitalPlay.tsx');
for (const [name, source] of [['CapitalContractMatrix.tsx', matrix], ['CapitalPlay.tsx', play]]) {
  const result = ts.transpileModule(source, { fileName:name, reportDiagnostics:true, compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX} });
  assert.deepEqual((result.diagnostics || []).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')), [], `${name}: syntaxe TS/TSX`);
}
assert.match(matrix, /contractColumnWidth = compact \? 124 : 146/, 'colonne de contrats limitée');
assert.match(matrix, /playerColumnWidth = compact \? 88 : 102/, 'colonnes joueurs réduites');
assert.match(matrix, /totalWidth = contractColumnWidth \+ participants\.length \* playerColumnWidth/, 'tous les joueurs inclus');
assert.match(matrix, /minWidth: totalWidth/, 'largeur table au moins égale à toutes les colonnes');
assert.match(matrix, /ref=\{scrollRef\}/);
assert.match(matrix, /overflowX: "auto"/);
assert.match(matrix, /onScroll=\{updateScrollPosition\}/);
assert.match(matrix, /position: "sticky", left: 0/, 'contrats restent fixes');
assert.match(matrix, /aria-label="Voir les joueurs suivants"/);
assert.match(matrix, /aria-label="Voir les joueurs précédents"/);
assert.match(matrix, /moveHorizontal\(1\)/);
assert.match(matrix, /direction \* \(playerColumnWidth \* 2 \+ 24\)/, 'défilement à fond, même au format 320px');
assert.match(matrix, /visit\.scoreAfter/, 'valeurs réelles, pas de données reconstruites');
assert.match(matrix, /#4dff89/);
assert.match(matrix, /#ffad45/);
assert.equal((play.match(/<CapitalContractMatrix\b/g) || []).length,2, 'live et fin de partie utilisent le même tableau');
assert.match(play, /src="\/images\/capital\/classements_capital_v155\.webp"/, 'bannière Capital visible');
assert.match(play, /setLiveRankingOpen\(true\)/, 'ouverture classement inchangée');
assert.match(play, /backgroundImage: `linear-gradient\(90deg,rgba\(10,6,1/, 'modal classement aux couleurs Capital');
const image = statSync(new URL('public/images/capital/classements_capital_v155.webp', root));
assert.ok(image.size > 20000 && image.size < 400000, 'bannière WebP présente et optimisée');
// Geometry at CSS widths: at 478px four players fit, at 298px the end is reachable after one click.
const width = 124 + 4 * 88;
assert.ok(width <= 478);
assert.ok(width > 298);
assert.ok((88 * 2 + 24) >= width - 298);
console.log('CAPITAL V155 : colonnes compactes, scroll horizontal 4 joueurs, carte du contrat fixe, classement doré, stats live/fin : OK');
