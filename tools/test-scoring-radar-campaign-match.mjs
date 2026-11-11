import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const src=path.resolve('scoring-radar/src/campaign-match.ts');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'radar-campaign-'));
fs.writeFileSync(path.join(dir,'campaign-match.js'),ts.transpileModule(fs.readFileSync(src,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const {assessCampaignMatch}=require(path.join(dir,'campaign-match.js'));
const campaign=(name,verified_facts='Statistiques de partie et score en direct')=>({name,pitch:name,verified_facts,audience:'Joueurs'});
const opportunity=(title,snippet='Je cherche une application pour compter les scores')=>({title,snippet,category:'scoring',intent:'application',score:90});
const cases=[
  ['Darts agrees',campaign('Statistiques fléchettes'),opportunity('Quelle application pour suivre mes fléchettes ?'),true],
  ['Darts vs petanque',campaign('Statistiques fléchettes'),opportunity('Quelle application pour la pétanque ?'),false],
  ['Petanque vs darts',campaign('Tournoi de pétanque'),opportunity('How do I track darts scores?'),false],
  ['Pingpong agrees',campaign('Scoring ping-pong'),opportunity('Besoin score au tennis de table'),true],
  ['Unknown sport blocked',campaign('Stats baby-foot'),opportunity('Need a scoreboard app'),false],
  ['Generic campaign works',campaign('Scoring pour tous'),opportunity('Need a darts scoring app'),true],
  ['Molkky is not fitness',campaign('Mölkky scoring'),opportunity('Fitness workout score app'),false],
  ['Tossit agrees',campaign('TOSSIT scoring'),opportunity('Application TOSSIT pour score'),true]
];
for(const [label,c,o,expected] of cases) assert.equal(assessCampaignMatch(c,o).compatible,expected,label);
console.log('SCORING RADAR campaign match OK ('+cases.length+' scenarios)');
