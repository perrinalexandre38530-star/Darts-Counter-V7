import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const file = read('src/lib/botSkillLevel.ts');
const js = ts.transpileModule(file,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const module = {exports:{}};
vm.runInNewContext(js,{module,exports:module.exports});
const {resolveBotStars,resolveBotGameDifficulty} = module.exports;
for(const [value,level,difficulty] of [
 ['5/5',5,'hard'], ['4.5/5',4.5,'hard'], ['4/5',4,'hard'], ['Mixte',3.5,'hard'],
 ['Rising',3,'normal'], ['normal',2,'normal'], ['rookie',1,'easy'], [80,4,'hard'],
]){
 const bot={botLevel:value};
 assert.equal(resolveBotStars(bot),level,`stars for ${value}`);
 assert.equal(resolveBotGameDifficulty(bot),difficulty,`difficulty for ${value}`);
}
assert.equal(resolveBotGameDifficulty({botLevel:null}),'normal','legacy fallback');
assert.equal(resolveBotGameDifficulty({botLevel:'normal',profileStarring:'5/5'}),'hard','displayed profile stars take precedence');
const select=read('src/components/BotPagedSelector.tsx');
assert.match(select,/data-mss-selected-bots="compact"/);
assert.match(select,/selectedCount > 0 && !showSelectedSummary/);
assert.match(select,/role="list"/);
assert.match(select,/avatarOf\(bot\)/);
assert.match(select,/onToggle\(String\(bot\.id\)\)/);
assert.match(select,/showChooser/);
const config=read('src/pages/Wave61SharedConfig.tsx');
assert.doesNotMatch(config,/<OptionRow label="Niveau BOT">/);
assert.match(config,/showChooser=\{botsOpen\}/);
assert.match(config,/botLevel: "normal"/);
const play=read('src/pages/Wave61SharedPlay.tsx');
assert.match(play,/resolveBotGameDifficulty\(activeProfile, "normal"\)/);
const legacy=read('src/pages/wave61/Wave61SharedPlay.tsx');
assert.match(legacy,/resolveBotGameDifficulty\(activeProfile, "normal"\)/);
console.log('OK : avatar bots sélectionnés dans le sélecteur partagé, niveau individuel en étoiles, Wave61 sans niveau global.');
