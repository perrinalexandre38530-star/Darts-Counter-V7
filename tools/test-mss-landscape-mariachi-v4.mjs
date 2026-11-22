/** Shared landscape & MARIACHI gate. Source checks are not browser screenshots. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const engine=read('src/lib/gameEngines/mexicainMariachi.ts');
const config=read('src/pages/Wave61SharedConfig.tsx');
const bridge=read('src/components/gameplay/LandscapePageFitBridge.tsx');
const css=read('src/styles/mss-landscape-fit-v248.css');
const mexicanCss=read('src/pages/wave61/MexicainFiesta.css');
const presentation=read('src/lib/gameEngines/mexicainPresentation.ts');
const play=read('src/pages/Wave61SharedPlay.tsx');
assert.match(engine,/mariachiRotation==='families'/);
assert.match(engine,/mariachiRotation==='round'/);
assert.match(engine,/familyRotation \? types\[/);
assert.match(config,/mariachiRotation: "families"/);
assert.match(config,/mariachiMode: "fiesta"/);
assert.match(config,/5 CONTRATS À VENIR/);
assert.match(config,/mariachiRotation === "round" \? "families"/);
assert.match(bridge,/roomWidth >= 840 && roomHeight >= 650/);
assert.match(bridge,/removeAttribute\("data-mss-landscape-spacious"\)/);
assert.match(css,/data-mss-landscape-spacious="1"/);
assert.match(mexicanCss,/\[data-wave61-zone="mission"\] \.mex-target-stage\.mex-target-art/);
assert.match(mexicanCss,/\[data-wave61-zone="input"\] > \.mex-target-input/);
assert(!/transform\s*:\s*scale\(/.test(css+ '\n'+mexicanCss.slice(mexicanCss.lastIndexOf('/* V7(4)'))), 'no CSS scaling of text and controls');
assert.match(presentation,/mariachiRotation === 'families'/);
assert.match(play,/FIESTA · CONTRAT/);
assert.match(play,/Contrat FIESTA en cours/);
for(const p of ['src/lib/gameEngines/mexicainMariachi.ts','src/lib/gameEngines/mexicainPresentation.ts','src/pages/Wave61SharedConfig.tsx','src/components/gameplay/LandscapePageFitBridge.tsx','src/pages/Wave61SharedPlay.tsx']){
 const raw=read(p);
 const d=ts.transpileModule(raw,{fileName:p,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[];
 assert.equal(d.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,`${p}: invalid TS/TSX syntax`);
}
console.log('PASS: roomy landscape bridge, overflow cleanup, Mariachi family selection & TS/TSX syntax');
