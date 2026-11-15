import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { checkProposal,makeReviewZip } from './mss-dev-proposal-core-v13.mjs';
const dir=mkdtempSync(join(tmpdir(),'mss-dev-v13-'));mkdirSync(join(dir,'src'));
try {
 const base=Buffer.from('export const score=1;\n');writeFileSync(join(dir,'src','score.ts'),base);
 const hash=createHash('sha256').update(base).digest('hex');
 const proposal={schema:'mss.dev.proposal.v1',missionId:'dev-0123456789abcdef',files:[{path:'src/score.ts',baseSha256:hash,contentBase64:Buffer.from('export const score=2;\n').toString('base64')}]};
 let result=checkProposal(dir,proposal);assert.equal(result.decision,'REVISION_HUMAINE_REQUISE');assert.equal(result.files[0].status,'PRET_A_REVOIR');console.log('PASS : fichier admissible');
 let zip=makeReviewZip(result);assert.equal(zip.readUInt32LE(0),0x04034b50);console.log('PASS : ZIP de proposition');
 writeFileSync(join(dir,'src','score.ts'),'changed');result=checkProposal(dir,proposal);assert.equal(result.decision,'BLOQUE');assert.equal(result.files[0].status,'CONFLIT');console.log('PASS : base modifiée');
 assert.throws(()=>checkProposal(dir,{...proposal,files:[{...proposal.files[0],path:'src/../secret.ts'}]}));console.log('PASS : traversée interdite');
 assert.throws(()=>checkProposal(dir,{...proposal,files:[proposal.files[0],proposal.files[0]]}));console.log('PASS : doublons interdits');
 assert.throws(()=>makeReviewZip(result));console.log('PASS : refus export conflit');
 console.log('6/6 tests réussis');
} finally {rmSync(dir,{recursive:true,force:true})}
