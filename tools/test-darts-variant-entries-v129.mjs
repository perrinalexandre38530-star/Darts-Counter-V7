import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../',import.meta.url));
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const load=(p,deps={})=>{
 const js=ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{exports:mod.exports,module:mod,require:(dep)=>{assert.ok(dep in deps,`Missing dependency ${dep} in ${p}`);return deps[dep]}},{filename:p});
 return mod.exports;
};
const wave=load('src/games/dartsWave61.ts');
const games=load('src/games/dartsGameRegistry.ts',{'./dartsWave61':wave});
const f=load('src/games/dartsGameFamilies.ts',{'./dartsGameRegistry':games});
const app=read('src/App.tsx');
const entry=read('src/components/GameModeEntryChoice.tsx');
const panel=read('src/components/DartsRelatedModesPanel.tsx');
const cricket=read('src/pages/CricketPlay.tsx');
const training=read('src/pages/TrainingMenu.tsx');
const names=new Set([...app.matchAll(/case\s+"([^"]+)"\s*:/g)].map(x=>x[1]));
for(const group of f.DARTS_GAME_FAMILIES){
 for (const id of [group.mainId,...group.variantIds]) {
  assert.ok(games.DARTS_GAMES.find(g=>g.id===id),`Unknown game ${id}`);
  const link=f.dartsFamilyGameNavigation(id);
  if (games.DARTS_GAMES.find(g=>g.id===id)?.ready) {
    assert.ok(link,`${id} not navigable`);
    assert.ok(names.has(link.tab),`${id}: missing tab ${link.tab}`);
  }
 }
}
for(const id of ['x01','chase','split_score','bobs_27','shanghai','battle_royale','enculette']) {
 assert.match(app,new RegExp('gameId="'+id+'"'),`Entry ${id} missing family id`);
}
assert.equal(games.DARTS_GAMES.find(g=>g.id==='capital')?.category,'classic');
assert.ok(f.dartsGameRelatedIds('capital').includes('shanghai'));
assert.ok(f.dartsGameRelatedIds('tour_horloge').includes('bobs_27'));
assert.ok(f.dartsGameRelatedIds('bobs_27').includes('challenge'));
assert.match(panel,/isFr \? "VARIANTES" : "VARIANTS"/);
assert.doesNotMatch(panel,/DÉCOUVRIR LES VARIANTES|D[EÉ]COUVRIR LES VARIANTES|family\.note/);
assert.match(entry,/onOpenGame=\{onOpenRelatedGame\} bare/);
assert.match(panel,/gridTemplateColumns:\s*"repeat\(auto-fit,minmax\(132px,1fr\)\)"/);
assert.match(cricket,/if \(typeof go === "function"\)/);
assert.doesNotMatch(cricket,/__appGo|__appStore/);
assert.match(training,/g\.id === "training_super_bull" \? findTickerSmart\("super_bull"\)/);
const tickerRoot=path.join(root,'src/assets/tickers');
for(const id of ['ptit_1','super_bull','top_10']) {
 const list=fs.readdirSync(tickerRoot).filter(name => /^ticker_/.test(name) && name.startsWith('ticker_'+id+'.'));
 assert.ok(list.length,`Ticker ${id} missing`);
}
for(const [id,target] of Object.entries({ptit_hun:'ptit_1',training_super_bull:'super_bull',top_10_training:'top_10'})) {
 assert.match(panel,new RegExp(id+':\\s*"'+target+'"'));
 assert.match(read('src/lib/tickers.ts'),new RegExp('"'+id+'":\\s*"'+target+'"'));
}
console.log(`✅ Entrées V129 : ${f.DARTS_GAME_FAMILIES.length} familles, ${new Set(f.DARTS_GAME_FAMILIES.flatMap(x=>[x.mainId,...x.variantIds])).size} modes reliés, tickers et BackDot Cricket contrôlés.`);
