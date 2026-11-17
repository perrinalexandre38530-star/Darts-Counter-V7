import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareAgentContext,proposalFromAi,requestAiProposal,qualifyAgentProposal} from './mss-dev-agent-core-v15.mjs';
const root=mkdtempSync(join(tmpdir(),'mss-v15-test-'));mkdirSync(join(root,'src'));
writeFileSync(join(root,'src','example.mjs'),'export const value = 1;\n');let count=0;
const test=(name,fn)=>{fn();count++;console.log('PASS',name)};
try {
 const c=prepareAgentContext(root,'Corriger la valeur dans example',[ 'src/example.mjs']);
 test('contexte SHA',()=>assert.match(c.files[0].baseSha256,/^[0-9a-f]{64}$/));
 test('refus traversal',()=>assert.throws(()=>prepareAgentContext(root,'Corriger la valeur de cet exemple',['src/../secret.mjs'])));
 test('refus fichier secret',()=>assert.throws(()=>prepareAgentContext(root,'Corriger la valeur de cet exemple',['src/my-secret.mjs'])));
 test('refus fichier hors liste',()=>assert.throws(()=>proposalFromAi(c,JSON.stringify({files:[{path:'src/other.mjs',content:'x'}]}))));
 test('refus JSON invalide',()=>assert.throws(()=>proposalFromAi(c,'not-json')));
 const p=proposalFromAi(c,JSON.stringify({files:[{path:'src/example.mjs',content:'export const value = 2;\n'}]}));
 test('v14 valide syntaxe',()=>assert.equal(qualifyAgentProposal(root,p).result.decision,'PRET_POUR_REVUE_QA'));
 test('ZIP produit hors application',()=>assert.equal(qualifyAgentProposal(root,p).zip.readUInt32LE(0),0x04034b50));
 const invalid=proposalFromAi(c,JSON.stringify({files:[{path:'src/example.mjs',content:'export const = ;'}]}));
 test('v14 bloque syntaxe',()=>assert.equal(qualifyAgentProposal(root,invalid).result.decision,'BLOQUE'));
 writeFileSync(join(root,'src','example.mjs'),'export const value = 3;\n');
 test('v13 bloque conflit',()=>assert.equal(qualifyAgentProposal(root,p).result.decision,'BLOQUE'));
 let sent=false;
 await assert.rejects(requestAiProposal(c,{fetchFn:async()=>{sent=true;}}),/OPENAI_API_KEY/);
 test('absence de cle pas de reseau',()=>assert.equal(sent,false));
 const p2=await requestAiProposal(c,{apiKey:'test-key',fetchFn:async(url,opts)=>{assert.equal(opts.method,'POST');return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({files:[{path:'src/example.mjs',content:'export const value = 4;' }]})}}]})}}});
 test('reponse modele simulee',()=>assert.equal(p2.files[0].path,'src/example.mjs'));
 console.log(`${count}/11 tests réussis`);
}finally{rmSync(root,{recursive:true,force:true});}
