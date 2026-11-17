import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {qualifyInStaging} from './mss-dev-regression-v16.mjs';
const root=mkdtempSync(join(tmpdir(),'mss-v16-test-'));
try{
 mkdirSync(join(root,'tools'));mkdirSync(join(root,'src'));
 writeFileSync(join(root,'src','example.js'),'export const value = 1;\n');
 writeFileSync(join(root,'tools','test-mss-dev-agent-v15.mjs'),"import {value} from '../src/example.js';if(value!==2)process.exit(1);\n");
 writeFileSync(join(root,'package.json'),'{"type":"module"}');
 const original=readFileSync(join(root,'src','example.js'));
 const baseSha256=createHash('sha256').update(original).digest('hex');
 const proposal=(content)=>({schema:'mss.dev.proposal.v1',missionId:'dev-1234567890abcdef',files:[{path:'src/example.js',baseSha256,contentBase64:Buffer.from(content).toString('base64')}]});
 const ok=qualifyInStaging(root,proposal('export const value = 2;\n'),{tests:['qa-agent']});
 assert.equal(ok.report.tests[0].status,'PASS');assert.ok(ok.zip);assert.equal(readFileSync(join(root,'src','example.js'),'utf8'),original.toString());
 const fail=qualifyInStaging(root,proposal('export const value = 3;\n'),{tests:['qa-agent']});
 assert.equal(fail.report.decision,'ECHEC_QA');assert.equal(fail.zip,null);
 const invalid=qualifyInStaging(root,proposal('export const = ;'),{tests:['qa-agent']});
 assert.equal(invalid.report.decision,'BLOQUE');
 const missing=qualifyInStaging(root,proposal('export const value = 2;\n'),{tests:['qa-proposal']});
 assert.equal(missing.report.tests.find(t=>t.id==='qa-proposal').status,'NON_EXECUTE');
 assert.throws(()=>qualifyInStaging(root,proposal('export const value = 2;\n'),{tests:['evil-command']}));
 console.log('V16: 5 tests réussis (PASS, FAIL, syntaxe, absence, allowlist).');
}finally{rmSync(root,{recursive:true,force:true});}
