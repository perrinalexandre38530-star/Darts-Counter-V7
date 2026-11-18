import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {inspectOutboundContext,assertOutboundContext} from './mss-dev-send-guard-v23.mjs';
const root=mkdtempSync(join(tmpdir(),'mss-send-v23-'));mkdirSync(join(root,'src'));
let tests=0;const test=(fn)=>{fn();tests++};
const sha=x=>createHash('sha256').update(x).digest('hex');
const path=join(root,'src','demo.ts');
const context={description:'Corriger le comportement de la page de demonstration',files:[{path:'src/demo.ts',content:'export const x=1;',baseSha256:sha('export const x=1;')}]};
try{
 writeFileSync(path,context.files[0].content);
 test(()=>assert.equal(inspectOutboundContext(root,context).ok,true));
 test(()=>assert.doesNotThrow(()=>assertOutboundContext(root,context)));
 test(()=>assert.equal(inspectOutboundContext(root,context,{expectedDescription:'autre'}).ok,false));
 writeFileSync(path,'export const x=2;');
 test(()=>assert.equal(inspectOutboundContext(root,context).ok,false));
 test(()=>assert.throws(()=>assertOutboundContext(root,context),/modifié/));
 writeFileSync(path,context.files[0].content);
 context.files[0].content='const secret = "sk-proj-'+'a'.repeat(48)+'";';context.files[0].baseSha256=sha(context.files[0].content);writeFileSync(path,context.files[0].content);
 test(()=>assert.equal(inspectOutboundContext(root,context).ok,false));
 test(()=>assert.ok(inspectOutboundContext(root,context).issues.join(' ').includes('Secret')));
 context.files[0].path='../outside.ts';
 test(()=>assert.equal(inspectOutboundContext(root,context).ok,false));
 context.files[0].path='src/demo.ts';context.description='Utiliser api_key = "value_hidden_example_1234" pour tester';
 test(()=>assert.equal(inspectOutboundContext(root,context).ok,false));
 console.log('PASS V23: '+tests+'/'+tests);
} finally{rmSync(root,{recursive:true,force:true});}
