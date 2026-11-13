import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
let ts; try { ts=require('typescript'); } catch { ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
function evaluateTs(source, resolver=()=>{throw Error('Import non prévu');}) {
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
  const errors=(output.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('\n'));
  const exports={};
  new Function('require','exports',output.outputText)(resolver,exports);
  return exports;
}
const voices=evaluateTs(read('src/training/profile/trainingVoiceScripts.ts'));
const scripts=evaluateTs(read('src/training/profile/trainingChallengeVoiceScripts.ts'),spec=>{
  assert.equal(spec,'./trainingVoiceScripts'); return voices;
});
assert.match(scripts.challengeTrainingStepSpeech({title:'La Ligne parfaite',goal:'D20',phase:'Volée 1',playerName:'Ninja'}),/double 20/);
assert.match(scripts.challengeTrainingRuleSpeech({title:'Les Opposés',instruction:'Enchaîner D20, D3',goal:'D3'}),/double 3/);
const noAccuracy=scripts.challengeTrainingResultSpeech({title:'Défi',darts:3,score:25,accuracy:null});
assert.match(noAccuracy,/3 fléchettes/);assert.match(noAccuracy,/25 points/);
assert.doesNotMatch(noAccuracy,/précision|pour cent/i,'do not fabricate accuracy');
assert.match(scripts.challengeTrainingResultSpeech({title:'Défi',darts:5,score:70,accuracy:81,objectivesDone:4,objectivesTotal:6}),/4 objectifs sur 6/);
assert.match(scripts.challengeTrainingResultSpeech({title:'Défi',darts:5,score:70,accuracy:1000}),/100 pour cent/);
const panel=read('src/training/ui/TrainingChallengeVoiceGuide.tsx');
const css=read('src/training/ui/trainingChallengeVoiceGuide.css');
const legacy=read('src/pages/ChallengePlay.tsx');
const arcade=read('src/pages/ChallengeArcadePlay.tsx');
assert.match(panel,/useTrainingVoiceCoach/);
assert.match(panel,/getChallengeTrainingPreset/);
assert.match(panel,/voice\.announce/);
assert.match(panel,/voice\.setAuto/);
assert.match(panel,/voice\.say/);
assert.match(panel,/finished \? result : full/);
assert.match(legacy,/fromTrainingLab && !historyStatsOnly && <TrainingChallengeVoiceGuide/);
assert.match(arcade,/fromTrainingLab && !isHistoryView && haveSetup && <TrainingChallengeVoiceGuide/);
assert.match(legacy, /\{!fromTrainingLab && <button type="button" className="online-rank"/);
assert.match(css,/max-height:520px/);
assert.doesNotMatch(panel,/History\.|recordTrainingDetailedSession|window\.speechSynthesis/,'existing voice and training engines only');
for (const file of ['src/pages/ChallengePlay.tsx','src/pages/ChallengeArcadePlay.tsx','src/training/ui/TrainingChallengeVoiceGuide.tsx']) {
  const transpiled=ts.transpileModule(read(file),{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
  const errors=(transpiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,`${file}: ${errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; ')}`);
}
console.log('OK — V111 voix Challenge 12+44, textes mesurés, commandes AUDIO/AUTO, filtrage compétition, rendu compact.');
