import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runFirstMissionRehearsal } from './mss-dev-first-mission-v29.mjs';
const outer=mkdtempSync(join(tmpdir(),'mss-v29-test-'));const root=join(outer,'project');
try{
 mkdirSync(join(root,'tools'),{recursive:true});
 let result=runFirstMissionRehearsal(root,{save:false});assert.equal(result.status,'BLOQUE');assert(result.results.every(x=>x.status==='NON_EXECUTE'));
 for(const p of ['test-mss-dev-proposal-v13.mjs','test-mss-dev-agent-v15.mjs','test-mss-dev-regression-v16.mjs','test-mss-dev-qa-gate-v18.mjs','test-mss-dev-send-guard-v23.mjs','test-mss-dev-api-check-v28.mjs'])writeFileSync(join(root,'tools',p),'console.log("pass")');
 let calls=0;result=runFirstMissionRehearsal(root,{spawn:(...args)=>{calls++;assert.equal(args[2].env.OPENAI_API_KEY,'');return {status:0};}});assert.equal(result.status,'PASS');assert.equal(calls,6);assert.equal(result.modelRequestPerformed,false);
 let saved=JSON.parse(readFileSync(join(outer,'MSS_AI_CONTROL_REPORTS','REHEARSAL_V29','latest.json')));assert.equal(saved.status,'PASS');
 result=runFirstMissionRehearsal(root,{save:false,spawn:()=>({status:1})});assert.equal(result.status,'BLOQUE');
 result=runFirstMissionRehearsal(root,{save:false,spawn:()=>({error:{code:'ETIMEDOUT'},status:null})});assert(result.results.every(x=>x.status==='TIMEOUT'));
 console.log('PASS V29: 6 scénarios (absents, réussite, secret neutralisé, rapport, échec, expiration).');
}finally{rmSync(outer,{recursive:true,force:true});}
