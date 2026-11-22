import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const get = path => fs.readFileSync(path, 'utf8');
const host = get('src/tv/samsung/SamsungTvSharedAppHost.tsx');
const games = get('src/pages/Games.tsx');
const css = get('src/tv/samsung/samsung-tv-viewport-v243.css');
for (const file of ['src/tv/samsung/SamsungTvSharedAppHost.tsx','src/pages/Games.tsx','src/components/gameplay/PlayLandscapeAutoLayout.tsx']) {
  const errors = ts.transpileModule(get(file), {
    fileName:file, reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2019,jsx:ts.JsxEmit.ReactJSX},
  }).diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) || [];
  assert.equal(errors.length,0,`${file}: ${errors.map(d => ts.flattenDiagnosticMessageText(d.messageText,' ')).join(', ')}`);
}
assert.match(host,/samsung-tv-viewport-v243\.css\?inline/,'TV CSS must be inlined after lazy AppRoot CSS');
assert.ok(host.indexOf('<AppRoot />') < host.indexOf('data-mss-tv-styles="last"'),'Final TV CSS must be rendered after AppRoot');
assert.match(games,/mss-tv-games-hub-cards/);
assert.match(games,/msc-games-mode-groups/);
for (const key of ['favorites','all_games','training']) assert.match(games,new RegExp(`tickerId: "${key}"`));
for (const sel of ['.killer-play-top','.killer-play-input','.mss-war-content','.mss-br-content','.msc-five-lives-body','.msc-five-lives-input','.cp-layout','[data-wave61-play-grid="three-zone"]']) assert.ok(css.includes(sel),`Missing ${sel}`);
assert.match(css,/\.killer-play-screen > \.killer-play-top \{\s*display: flex !important;/);
assert.match(get('src/components/gameplay/PlayLandscapeAutoLayout.tsx'),/--mss-tv-left-count/);
assert.match(css,/grid-template-rows: minmax\(0, 1fr\) !important;/);
assert.match(css,/\.mss-tv-games-hub-cards > div > button > img/);
assert.doesNotMatch(css,/body\.innerHTML|transform:\s*scale\(/);
let braces=0,inBlockComment=false;
for(let i=0;i<css.length;i++){
 if(!inBlockComment && css.slice(i,i+2)==='/*'){inBlockComment=true;i++;continue;}
 if(inBlockComment && css.slice(i,i+2)==='*/'){inBlockComment=false;i++;continue;}
 if(inBlockComment)continue;
 if(css[i]==='{')braces++;
 if(css[i]==='}')braces--;
 assert.ok(braces>=0,'Unexpected closing brace');
}
assert.equal(braces,0,'Unbalanced CSS braces');
assert.equal(inBlockComment,false,'Unclosed comment');
console.log('PASS V243: fichiers TSX parsables; 3 cartes TV; CSS en dernier; Killer/BR/Warfare/FiveLives/Challenge/Wave61; pas de transform scale.');
console.log('NOTE: Vérification statique uniquement, pas une validation sur Samsung Tizen.');
