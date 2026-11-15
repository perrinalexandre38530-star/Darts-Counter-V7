import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateDevProposal,makeQaZip} from './mss-dev-qa-core-v14.mjs';
const root=mkdtempSync(join(tmpdir(),'mss-v14-tests-'));mkdirSync(join(root,'src'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const base='export const a=1;\n';writeFileSync(join(root,'src','a.mjs'),base);
const mk=content=>({schema:'mss.dev.proposal.v1',missionId:'dev-0123456789abcdef',files:[{path:'src/a.mjs',baseSha256:sha(base),contentBase64:Buffer.from(content).toString('base64')}]});
let n=0;const pass=s=>{n++;console.log('PASS '+s)};
try{
 let r=validateDevProposal(root,mk('export const a=2;\n'));assert.equal(r.decision,'PRET_POUR_REVUE_QA');pass('syntaxe valide');
 assert.equal(r.checks[0].status,'SYNTAXE_OK');pass('contrôle réel Node');
 assert.equal(makeQaZip(r).readUInt32LE(0),0x04034b50);pass('archive ZIP');
 r=validateDevProposal(root,mk('export const = 2;'));assert.equal(r.decision,'BLOQUE');pass('syntaxe invalide bloquée');
 assert.throws(()=>makeQaZip(r));pass('pas export d erreur');
 writeFileSync(join(root,'src','a.mjs'),'export const a=3;');r=validateDevProposal(root,mk('export const a=4;'));assert.equal(r.decision,'BLOQUE');pass('conflit base');
 assert.throws(()=>validateDevProposal(root,{...mk('abc'),files:[{...mk('abc').files[0],path:'src/../secret.mjs'}]}));pass('traversée refusée');
 console.log(`${n}/7 tests réussis`);
}finally{rmSync(root,{recursive:true,force:true})}
