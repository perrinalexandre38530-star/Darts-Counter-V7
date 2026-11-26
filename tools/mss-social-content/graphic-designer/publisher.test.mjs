import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,mkdirSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
test('Publisher: isolation, approval, account, rotation, uncertainty and HTTP payload',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'mss-publisher-test-'));try{
 for(const f of ['publisher.mjs','media-gate.mjs','planner.mjs'])cpSync(join(here,f),join(dir,f));
 const out=join(dir,'output');mkdirSync(join(out,'fr'),{recursive:true});const original=JSON.parse(readFileSync(join(here,'output/catalog.json')));const es=original.entries.filter(e=>e.locale==='fr');for(const e of es)cpSync(join(here,'output',e.file),join(out,e.file));
 const write=(name,data)=>writeFileSync(join(out,name),JSON.stringify(data));write('catalog.json',{entries:es});
 const {preview,authorize,runOne,history,revoke}=await import(pathToFileURL(join(dir,'publisher.mjs')));
 const job=(i,channel='x',account='@multisportsscor')=>({id:'job'+i,mediaId:es[i-1].id,sha256:es[i-1].sha256,locale:'fr',channel,account,scheduledAt:new Date(Date.now()-10000).toISOString(),status:'PLANNED_NOT_SENT'});
 const j1=job(1),j2=job(2),j3=job(3);write('publication-plan.json',[j1,j2,j3]);assert.throws(()=>preview(j1.id),/Validation/);write('approvals.json',Object.fromEntries(es.map(e=>[e.id,{decision:'approved',sha256:e.sha256}])));
 const calls=[];let wrong=true,uncertain=false;const fetcher=async(url,o)=>{calls.push([url,o]);const data=url.endsWith('/me')?{id:'123',username:wrong?'not-mss':'multisportsscor'}:url.endsWith('/upload')?{id:'456'}:{id:'789'};if(uncertain&&url.endsWith('/tweets'))throw Error('timeout');return new Response(JSON.stringify({data}),{status:200});};
 assert.equal((await runOne({token:'fake',fetcher})).status,'NO_DUE_JOB');assert.equal(calls.length,0);assert.throws(()=>authorize(j1.id,'wrong'),/modifié/);authorize(j1.id,preview(j1.id).fingerprint);assert.equal((await runOne({token:'fake',fetcher})).status,'FAILED');assert.equal(calls.length,1);assert.equal((await runOne({token:'fake',fetcher})).status,'COOLDOWN');
 wrong=false;authorize(j2.id,preview(j2.id).fingerprint);revoke(j2.id);const future=()=>Date.now()+86400001;assert.equal((await runOne({token:'fake',fetcher,now:future})).status,'NO_DUE_JOB');authorize(j2.id,preview(j2.id).fingerprint);assert.equal((await runOne({token:'fake',fetcher,now:future})).status,'PUBLISHED');assert.equal(calls.length,4);assert.equal(JSON.parse(calls[3][1].body).media.media_ids[0],'456');assert.equal(history().job2.postId,'789');
 authorize(j3.id,preview(j3.id).fingerprint);uncertain=true;const later=()=>Date.now()+2*86400000+10000;assert.equal((await runOne({token:'fake',fetcher,now:later})).status,'UNKNOWN');assert.equal((await runOne({token:'fake',fetcher,now:later})).status,'RECONCILIATION_REQUIRED');assert.throws(()=>authorize(j3.id,preview(j3.id).fingerprint),/déjà traité/);
 write('publication-plan.json',[job(1,'instagram'),job(2,'x','@other')]);assert.throws(()=>preview('job1'),/non autorisé/);assert.throws(()=>preview('job2'),/non autorisé/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
