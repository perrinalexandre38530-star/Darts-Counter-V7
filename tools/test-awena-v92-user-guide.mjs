import fs from 'node:fs';

const core=fs.readFileSync('src/awena/AwenaCore.ts','utf8');
const guide=fs.readFileSync('src/awena/AwenaUserGuideV92.ts','utf8');
const proc=fs.readFileSync('src/awena/AwenaProceduralAcademy.ts','utf8');
const overlay=fs.readFileSync('src/awena/components/AwenaOverlay.tsx','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

const count=(guide.match(/\{id:"/g)||[]).length;
const steps=(guide.match(/steps:\[/g)||[]).length;
if(count < 50) throw new Error(`V9.2 user guide too small: ${count}`);
if(steps < 25) throw new Error(`V9.2 step guides too small: ${steps}`);
if(!core.includes('answerAwenaUserGuideV92')) throw new Error('V9.2 not wired in AwenaCore');
if(!core.includes('pas pour expliquer son code interne')) throw new Error('Developer-only redirection missing');
for(const banned of ['answerAwenaGuidePro(', 'answerAwenaMasterKnowledgeV89(', 'answerAwenaExpertCompanionV90(', 'answerAwenaDiagnosticV90(']) {
  if(core.includes(banned)) throw new Error(`Developer layer still active in normal routing: ${banned}`);
}
if(!proc.includes('USER_FACING_IMPORTED_DOMAINS')) throw new Error('Procedural filter missing');
if(!/LOCAL V9\.[2-9]/.test(overlay)) throw new Error('V9.2+ badge missing');
if(pkg.scripts?.['test:awena:v92'] !== 'node tools/test-awena-v92-user-guide.mjs') throw new Error('V9.2 package script missing');

console.log(`AWENA V9.2 USER GUIDE OK — ${count} user-facing topics, ${steps} step-enabled topics.`);
