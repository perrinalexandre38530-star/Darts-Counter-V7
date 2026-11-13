import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const mod=(filename,inject={})=>{
 const source=read(filename);const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};vm.runInNewContext(js,{exports:m.exports,module:m,require:(s)=>{assert.ok(s in inject,`${filename} dependency ${s}`);return inject[s]}},{filename});return m.exports;
};
const wave=mod('src/games/dartsWave61.ts');
const catalog=mod('src/games/dartsGameRegistry.ts',{'./dartsWave61':wave});
const families=mod('src/games/dartsGameFamilies.ts',{'./dartsGameRegistry':catalog});
const gamesSource=read('src/pages/Games.tsx');
const appSource=read('src/App.tsx');
const cases=new Set([...appSource.matchAll(/case\s+"([^"]+)"\s*:/g)].map(m=>m[1]));
const members=new Set();
for(const f of families.DARTS_GAME_FAMILIES){
 assert.ok(f.variantIds.length,`${f.id}: needs variants`);
 assert.equal(f.mainId,f.id,`${f.id}: main naming mismatch`);
 for(const id of [f.mainId,...f.variantIds]) {
   assert.ok(!members.has(id),`${id}: duplicate family membership`);members.add(id);
   assert.ok(catalog.DARTS_GAMES.some(g=>g.id===id),`${id}: unknown mode`);
   const forward=families.dartsGameFamily(id);
   assert.equal(forward.id,f.id);
   const nav=families.dartsFamilyGameNavigation(id);
   if(catalog.DARTS_GAMES.find(g=>g.id===id)?.ready) {
     assert.ok(nav,`${id}: missing navigation`);
     assert.ok(cases.has(nav.tab),`${id}: App route ${nav.tab} missing`);
     assert.ok(families.dartsGameRelatedIds(id).length>0,`${id}: no reverse family links`);
   }
 }
}
// Every published variant belongs to a discoverable family.
const orphanVariants=catalog.DARTS_GAMES.filter(g=>g.category==='variant'&&g.ready&&!families.dartsGameFamily(g.id));
assert.equal(orphanVariants.length,0,'orphan variants');
assert.equal(catalog.DARTS_GAMES.find(g=>g.id==='shove_a_penny').category,'variant');
assert.equal(catalog.DARTS_GAMES.find(g=>g.id==='scram').category,'variant');
for(const id of ['cricket_cut_throat','shove_a_penny','scram','enculette'])
  assert.ok(families.dartsGameRelatedIds('cricket').includes(id));
assert.equal(JSON.stringify(families.dartsFamilyGameNavigation('cricket_cut_throat')),JSON.stringify({tab:'cricket',params:{launchMode:'arcade',variantId:'cut_throat'}}));
assert.equal(families.dartsFamilyGameNavigation('chase').tab,'five_lives_config');
assert.equal(families.dartsFamilyGameNavigation('split_score').tab,'halve_it_config');
assert.equal(families.dartsFamilyGameNavigation('shove_a_penny').params.gameId,'shove_a_penny');

// Execute the actual Games configuration resolver (without mounting React).
const gamesTree=ts.createSourceFile('Games.tsx',gamesSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let fn;
const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text==='configPathForGame')fn=node;ts.forEachChild(node,visit)};
visit(gamesTree);assert.ok(fn,'Games configPathForGame() missing');
const fnText=fn.getText(gamesTree);
const compiled=ts.transpileModule(fnText,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={};vm.runInNewContext(`${compiled};this.configPathForGame=configPathForGame;`,sandbox);
const resolve=sandbox.configPathForGame;
const routes=new Map();
for(const g of catalog.DARTS_GAMES.filter(x=>x.ready)) {
 const entry=resolve(g);
 assert.match(entry,/^tab:[a-z0-9_]+/i,`${g.id}: malformed link ${entry}`);
 const [tab,query]=entry.slice(4).split('?');
 assert.ok(cases.has(tab),`${g.id}: GameSelect fallthrough! route ${tab} missing`);
 if(tab==='wave61_config')assert.ok(query?.includes(`gameId=${g.id}`),`${g.id}: Wave61 mode lost`);
 routes.set(g.id,tab);
}
assert.equal(routes.get('cricket'),'cricket');
assert.equal(routes.get('cricket_cut_throat'),'cricket');
assert.equal(routes.get('shanghai'),'shanghai');
assert.equal(routes.get('battle_royale'),'battle_royale');
assert.equal(routes.get('enculette'),'enculette_config');
for(const id of ['training_x01','tour_horloge','training_super_bull'])assert.equal(routes.get(id),'training');
assert.match(gamesSource,/onOpenRelatedGame|DartsRelatedModesPanel/);
assert.match(appSource,/onOpenRelatedGame/);
assert.match(read('src/pages/CricketPlay.tsx'),/DartsRelatedModesPanel/);
assert.match(read('src/pages/Wave61SharedConfig.tsx'),/DartsRelatedModesPanel/);
assert.match(read('src/pages/Top10Config.tsx'),/DartsRelatedModesPanel/);
assert.match(read('src/pages/SuperBullConfig.tsx'),/DartsRelatedModesPanel/);
console.log(`✅ ${catalog.DARTS_GAMES.length} modes audités, ${routes.size} routes publiées vérifiées, ${families.DARTS_GAME_FAMILIES.length} familles, ${members.size} modes reliés.`);
