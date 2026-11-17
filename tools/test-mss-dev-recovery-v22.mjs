import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {bridgePaths} from './mss-dev-bridge-v20.mjs';
import {queueSnapshot,prepareQueuedMission,transitionQueuedMission} from './mss-dev-queue-v21.mjs';
import {recoverInterruptedMission} from './mss-dev-recovery-v22.mjs';
const folder=mkdtempSync(join(tmpdir(),'mss-recovery-v22-')),root=join(folder,'project');mkdirSync(root);let n=0;
const check=(cb)=>{cb();n++};
try{
 const mission={schema:'mss.dev.mission.v1',requestId:'MSS_220',description:'Corriger les statistiques X01 entre les pages du projet'};
 const input=join(bridgePaths(root).inbox,'MSS_220.json');writeFileSync(input,JSON.stringify(mission));
 check(()=>assert.equal(prepareQueuedMission(root,'MSS_220').requestId,'MSS_220'));
 check(()=>assert.throws(()=>recoverInterruptedMission(root,'MSS_220',{confirm:true})));
 transitionQueuedMission(root,'MSS_220','RUNNING');
 check(()=>assert.throws(()=>recoverInterruptedMission(root,'MSS_220')));
 check(()=>assert.throws(()=>recoverInterruptedMission(root,'MSS_220',{confirm:true,active:true})));
 check(()=>assert.throws(()=>recoverInterruptedMission(root,'MSS_220',{confirm:true})));
 check(()=>assert.equal(recoverInterruptedMission(root,'MSS_220',{confirm:true,now:Date.now()+70000}).status,'INTERRUPTED'));
 check(()=>assert.equal(queueSnapshot(root).accepted[0].status,'INTERRUPTED'));
 check(()=>assert.throws(()=>recoverInterruptedMission(root,'MSS_220',{confirm:true,now:Date.now()+200000})));
 check(()=>assert.equal(prepareQueuedMission(root,'MSS_220').requestId,'MSS_220'));
 transitionQueuedMission(root,'MSS_220','RUNNING');
 writeFileSync(input,JSON.stringify({...mission,description:'Mission modifiée après préparation et lancement'}));
 check(()=>assert.throws(()=>recoverInterruptedMission(root,'MSS_220',{confirm:true,now:Date.now()+70000})));
 check(()=>assert.equal(queueSnapshot(root).rejected.length,1));
 console.log(`PASS V22: ${n}/${n}`);
}finally{rmSync(folder,{recursive:true,force:true});}
