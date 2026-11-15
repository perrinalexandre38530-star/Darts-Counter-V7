import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const child=spawn(process.execPath,['tools/mss-ai-control-missions-v11.mjs'],{cwd:process.cwd(),env:{...process.env,MSS_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
const base='http://127.0.0.1:4180';
try{
 for(let i=0;i<60;i++){try{const r=await fetch(base+'/api/state');if(r.ok)break;}catch{}await delay(100)}
 const page=await(await fetch(base+'/')).text();assert.match(page,/Chef QA/);const token=page.match(/const csrf='([^']+)'/)[1];
 async function post(route,obj){return fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':token},body:JSON.stringify(obj)})}
 let r=await post('/api/plan',{description:'Les stats X01 et les sauvegardes NAS'});assert.equal(r.status,200);assert.deepEqual((await r.json()).plan.missions,['backup','stats']);
 r=await post('/api/run-plan',{missions:['git reset --hard']});assert.equal(r.status,400);
 r=await fetch(base+'/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"description":"stats"}'});assert.equal(r.status,403);
 r=await post('/api/run-plan',{missions:['sync-main']});assert.equal(r.status,202);const id=(await r.json()).id;assert.match(id,/^qa-/);
 let state;for(let i=0;i<100;i++){state=await(await fetch(base+'/api/state')).json();if(!state.active&&state.last?.id===id)break;await delay(100)}assert.equal(state.last.id,id);assert.equal(state.last.plan[0],'sync-main');
 const exp=await(await fetch(base+'/api/report/'+id)).json();assert.deepEqual(exp.plan,['sync-main']);assert.equal(exp.verifiedByPortal,false);assert.ok(!('log' in exp));
 console.log('MSS AI CONTROL V11 : integration PASS');
}finally{child.kill()}
