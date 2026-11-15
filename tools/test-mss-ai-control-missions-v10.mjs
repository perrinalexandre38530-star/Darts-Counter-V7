#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const base='http://127.0.0.1:4180';
const child=spawn(process.execPath,['tools/mss-ai-control-missions-v10.mjs'],{cwd:process.cwd(),env:{...process.env,MSS_NO_BROWSER:'1'},stdio:'ignore'});
try {
 let ok=false;
 for(let i=0;i<60;i++){try{let r=await fetch(base+'/api/state');if(r.ok){ok=true;break}}catch{}await delay(100)}
 assert.ok(ok,'Serveur V9 joignable');
 const state=await(await fetch(base+'/api/state')).json();
 assert.equal(state.missions.length,7);
 assert.equal((await fetch(base+'/api/report/../../etc/passwd')).status,404);
 const pageToken=(await(await fetch(base+'/')).text()).match(/const csrf='([^']+)'/)?.[1];
 let invalid=await fetch(base+'/api/import',{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':pageToken},body:JSON.stringify({schema:'mss.qa.mission.v1',requestId:'MSS-001',mission:'run-shell',command:'rm -rf .'})});assert.equal(invalid.status,400);
 let untrusted=await fetch(base+'/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schema:'mss.qa.mission.v1',requestId:'MSS-001',mission:'sync-main'})});assert.equal(untrusted.status,403);

 const page=await(await fetch(base+'/')).text();
 assert.ok(page.includes('Télécharger JSON'));
 const token=page.match(/const csrf='([^']+)'/)?.[1];assert.ok(token);
 let denied=await fetch(base+'/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mission:'sync-main'})});assert.equal(denied.status,403);
 let r=await fetch(base+'/api/import',{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':token},body:JSON.stringify({schema:'mss.qa.mission.v1',requestId:'MSS-001',mission:'sync-main',command:'ignored'})});assert.equal(r.status,202);
 let out;
 for(let i=0;i<120;i++){await delay(100);out=await(await fetch(base+'/api/state')).json();if(!out.active&&out.last)break}
 assert.equal(['PASS','FAIL'].includes(out.last.status),true,out.last?.log);
 const response=await fetch(base+'/api/report/'+out.last.id);assert.equal(response.status,200);
 const report=await response.json();assert.equal(report.schema,'mss.qa.report.v1');assert.ok(['PASS','FAIL'].includes(report.status));assert.equal(report.requestId,'MSS-001');assert.equal(report.verifiedByPortal,false);assert.ok(!('log' in report));
 console.log('MSS AI CONTROL V10: 9 contrôles PASS');
}finally{child.kill()}
