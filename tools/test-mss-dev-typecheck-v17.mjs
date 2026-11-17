import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {typecheckOverlay} from './mss-dev-typecheck-v17.mjs';
import {qualifyInStaging} from './mss-dev-regression-v16.mjs';
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript')}catch{console.error('TypeScript requis pour les tests V17');process.exit(2)}
const root=mkdtempSync(join(tmpdir(),'mss-v17-test-'));
try {
 mkdirSync(join(root,'src'));mkdirSync(join(root,'tools'));
 writeFileSync(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',strict:true,noEmit:true,skipLibCheck:true},include:['src/**/*.ts']}));
 writeFileSync(join(root,'package.json'),'{"type":"module"}');
 const path='src/example.ts',original='export const value: number = 1;\n';
 writeFileSync(join(root,path),original);
 const check=content=>typecheckOverlay(root,[{path,content}],{typescriptModule:ts});
 assert.equal(check('export const value: number = 2;\n').status,'PASS');
 const fail=check('export const value: number = "incorrect";\n');
 assert.equal(fail.status,'FAIL');assert.equal(fail.introducedErrors,1);
 assert.equal(readFileSync(join(root,path),'utf8'),original,'Typecheck ne doit jamais écrire dans le projet');
 writeFileSync(join(root,path),'export const value: number = "baseline";\n');
 const baseline=check('export const value: number = "baseline";\n');
 assert.equal(baseline.status,'BASELINE_ERRORS');assert.equal(baseline.introducedErrors,0);
 writeFileSync(join(root,path),original);
 const baseSha256=createHash('sha256').update(original).digest('hex');
 const proposal=content=>({schema:'mss.dev.proposal.v1',missionId:'dev-1234567890abcdef',files:[{path,baseSha256,contentBase64:Buffer.from(content).toString('base64')}]});
 const ok=qualifyInStaging(root,proposal('export const value: number = 2;\n'),{tests:[],typescriptModule:ts,requireTypecheck:true});
 assert.equal(ok.report.tests.find(t=>t.id==='typecheck-global').status,'PASS');assert.ok(ok.zip);
 const bad=qualifyInStaging(root,proposal('export const value: number = "erreur";\n'),{tests:[],typescriptModule:ts,requireTypecheck:true});
 assert.equal(bad.report.decision,'ECHEC_QA');assert.equal(bad.zip,null);
 const blocked=qualifyInStaging(root,proposal('export const value: number = 2;\n'),{tests:[],requireTypecheck:true,typescriptModule:{}});
 assert.equal(blocked.report.decision,'BLOQUE');assert.equal(blocked.zip,null);
 console.log('V17 : 7 contrôles PASS (overlay, erreur, intégrité, baseline, ZIP OK, ZIP refusé, TypeScript absent).');
}finally{rmSync(root,{recursive:true,force:true});}
