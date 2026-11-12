import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const matrix = read('src/components/stats/CapitalContractMatrix.tsx');
const play = read('src/pages/CapitalPlay.tsx');
const sources = {
  'src/components/stats/CapitalContractMatrix.tsx': matrix,
  'src/pages/CapitalPlay.tsx': play,
};
for (const [fileName, source] of Object.entries(sources)) {
  const transpiled = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = (transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')), [], `${fileName}: JSX/TS valide`);
}
// Tableau : compression réelle, toutes les colonnes, navigation et scroll natif.
assert.match(matrix, /compact \? 88 : 102/, 'largeur réduite des colonnes joueurs');
assert.match(matrix, /compact \? 124 : 146/, 'première colonne limitée');
assert.match(matrix, /participants\.length \* playerColumnWidth/, 'largeur calculée pour tous les joueurs');
assert.match(matrix, /participants\.map\(\(p, i\) =>/);
assert.match(matrix, /overflowX: "auto"/);
assert.match(matrix, /position: "sticky", left: 0/, 'contrat reste visible');
assert.match(matrix, /onScroll={updateScrollPosition}/);
assert.match(matrix, /moveHorizontal\(1\)/);
assert.match(matrix, /moveHorizontal\(-1\)/);
assert.match(matrix, /visit\.scoreAfter/);
assert.match(matrix, /#4dff89/);
assert.match(matrix, /#ffad45/);

// Accès live et fin de partie au même composant.
const usage = (play.match(/<CapitalContractMatrix\b/g) || []).length;
assert.equal(usage, 2, 'même tableau en live et résumé final');
assert.match(play, /src="\/images\/capital\/contrat_tableau_signature_v154\.webp"/);
assert.match(play, /aria-label="TABLEAU · CONTRATS \/ JOUEURS"/);
assert.doesNotMatch(play, />TABLEAU · CONTRATS \/ JOUEURS</, 'le texte n’est plus visible dans le bandeau');
assert.ok(statSync(new URL('public/images/capital/contrat_tableau_signature_v154.webp', root)).size > 5000, 'image WebP embarquée');

// Carte du contrat cliquable -> modal : ordre, progression, focus, fermeture.
assert.match(play, /onClick=\{\(\) => setContractRouteOpen\(true\)\}/);
assert.match(play, /function CapitalContractRouteModal/);
assert.match(play, /aria-modal="true" aria-label="Liste des contrats de la partie CAPITAL"/);
assert.match(play, /contracts\.map\(\(contractId, index\) =>/);
assert.match(play, /index === currentIndex/);
assert.match(play, /ref=\{current \? activeRef : undefined\}/);
assert.match(play, /active\.offsetTop/);
assert.match(play, /aria-current=\{current \? "step" : undefined\}/);
assert.match(play, /onClose=\{\(\) => setContractRouteOpen\(false\)\}/);
console.log('CAPITAL V153 : colonnes compactes et scroll horizontal, image signature, fenêtre liste contrats + contrat courant : OK.');
