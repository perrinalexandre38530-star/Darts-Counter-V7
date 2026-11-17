import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {bridgePaths} from './mss-dev-bridge-v20.mjs';
import {queueSnapshot,prepareQueuedMission,transitionQueuedMission} from './mss-dev-queue-v21.mjs';
const t=mkdtempSync(join(tmpdir(),'mss-v21-')),root=join(t,'project');mkdirSync(root);let n=0;const check=f=>{f();n++};
try{
 const path=join(bridgePaths(root).inbox,'MSS_200.json');const mission={schema:'mss.dev.mission.v1',requestId:'MSS_200',description:'Corriger le calcul des statistiques X01 sur le tableau de bord'};
 writeFileSync(path,JSON.stringify(mission));
 check(()=>assert.equal(queueSnapshot(root).accepted[0].status,'NEW'));
 check(()=>assert.equal(prepareQueuedMission(root,'MSS_200').requestId,'MSS_200'));
 check(()=>assert.equal(queueSnapshot(root).accepted[0].status,'PREPARED'));
 check(()=>assert.equal(transitionQueuedMission(root,'MSS_200','RUNNING').status,'RUNNING'));
 check(()=>assert.throws(()=>transitionQueuedMission(root,'MSS_200','RUNNING')));
 check(()=>assert.equal(transitionQueuedMission(root,'MSS_200','FINISHED',{decision:'BLOQUE'}).status,'FINISHED'));
 check(()=>assert.equal(queueSnapshot(root).accepted[0].decision,'BLOQUE'));
 check(()=>assert.throws(()=>prepareQueuedMission(root,'MSS_200')));
 writeFileSync(path,JSON.stringify({...mission,description:mission.description+' et navigation'}));
 check(()=>assert.equal(queueSnapshot(root).rejected.length,1));
 check(()=>assert.throws(()=>prepareQueuedMission(root,'MSS_200')));
 check(()=>assert.throws(()=>transitionQueuedMission(root,'../MSS_200','RUNNING')));
 console.log(`PASS V21 : ${n}/${n} tests`);
}finally{rmSync(t,{recursive:true,force:true});}
