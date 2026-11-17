import assert from 'node:assert/strict';
import {validateImportedDevMission, publicDevReport} from './mss-dev-exchange-v19.mjs';
const valid={schema:'mss.dev.mission.v1',requestId:'MSS-1901',description:'Corriger les statistiques du mode X01'};
assert.equal(validateImportedDevMission(valid).requestId,'MSS-1901');
for(const bad of [{...valid,command:'git reset --hard'}, {...valid,requestId:'../secrets'}, {...valid,description:'court'}, {...valid,files:['src/App.tsx']}, {...valid,schema:'mss.qa.mission.v1'}]) assert.throws(()=>validateImportedDevMission(bad));
const data=publicDevReport({mission:{...valid,missionId:'qa-1901'},decision:'BLOQUE',changed:1,gate:{pilot:{verdict:'FAIL'},auditor:{verdict:'FAIL'}},regression:{tests:[{id:'ts',status:'PASS',log:'SECRETS'},{id:'qa',status:'NOT_RUN'}]},zipAvailable:false,createdAt:'2026-11-17T18:00:00Z'});
assert.equal(data.summary.passed,1);assert.equal(data.summary.notRun,1);assert.equal(data.verifiedByPortal,false);assert.equal(data.installed,false);assert.equal(data.zipForHumanReview,false);assert.ok(!JSON.stringify(data).includes('SECRETS'));
console.log('MSS V19: 8 assertions/scenarios PASS');
