#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const base='http://127.0.0.1:4180';
const child=spawn(process.execPath,['tools/mss-ai-control-missions-v9.mjs'],{cwd:process.cwd(),env:{...process.env,MSS_NO_BROWSER:'1'},stdio:'ignore'});
try {
 let ok=false;
 for(let i=0;i<60;i++){try{let r=await fetch(base+'/api/state');if(r.ok){ok=true;break}}catch{}await delay(100)}
 assert.ok(ok,'Serveur V9 joignable');
 const state=await(await fetch(base+'/api/state')).json();
 assert.equal(state.missions.length,7);
 assert.equal((await fetch(base+'/api/report/../../etc/passwd')).status,404);
 const page=await(await fetch(base+'/')).text();
 assert.ok(page.includes('Télécharger JSON'));
 const token=page.match(/const csrf='([^']+)'/)?.[1];assert.ok(token);
 let denied=await fetch(base+'/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mission:'qa-console'})});assert.equal(denied.status,403);
 let r=await fetch(base+'/api/run',{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':token},body:JSON.stringify({mission:'qa-console'})});assert.equal(r.status,202);
 let out;
 for(let i=0;i<120;i++){await delay(100);out=await(await fetch(base+'/api/state')).json();if(!out.active&&out.last)break}
 assert.equal(out.last.status,'PASS',out.last?.log);
 const response=await fetch(base+'/api/report/'+out.last.id);assert.equal(response.status,200);
 const report=await response.json();assert.equal(report.schema,'mss.qa.report.v1');assert.equal(report.status,'PASS');assert.equal(report.verifiedByPortal,false);assert.ok(!('log' in report));
 console.log('MSS AI CONTROL V9: 9 contrôles PASS');
}finally{child.kill()}
