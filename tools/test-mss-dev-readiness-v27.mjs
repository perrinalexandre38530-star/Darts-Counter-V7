import assert from 'node:assert/strict';
import {checkDevReadiness} from './mss-dev-readiness-v27.mjs';
const run=(branch='main')=>args=>args[0]==='branch'?branch:'abc123';
const yes=()=>'/tmp/typescript';
const no=()=>{throw Error('missing')};
const tests=[
  ()=>{const x=checkDevReadiness('/tmp',{env:{OPENAI_API_KEY:'fake-test-value'},gitRunner:run(),moduleResolver:yes});assert.equal(x.canAttemptAi,true);assert.equal(x.apiConnectionTested,false)},
  ()=>{const x=checkDevReadiness('/tmp',{env:{},gitRunner:run(),moduleResolver:yes});assert.equal(x.canAttemptAi,false)},
  ()=>{const x=checkDevReadiness('/tmp',{env:{OPENAI_API_KEY:'fake-test-value'},gitRunner:run('other'),moduleResolver:yes});assert.equal(x.canAttemptAi,false)},
  ()=>{const x=checkDevReadiness('/tmp',{env:{OPENAI_API_KEY:'fake-test-value'},gitRunner:run(),moduleResolver:no});assert.equal(x.canAttemptAi,false)},
  ()=>{const x=checkDevReadiness('/tmp',{env:{OPENAI_API_KEY:'SECRET_MARKER'},gitRunner:run(),moduleResolver:yes});assert.ok(!JSON.stringify(x).includes('SECRET_MARKER'))},
  ()=>{const x=checkDevReadiness('/tmp',{env:{OPENAI_API_KEY:'X'},gitRunner:()=>{throw Error('missing git')},moduleResolver:yes});assert.equal(x.canAttemptAi,false)},
  ()=>{const x=checkDevReadiness('/tmp',{env:{},gitRunner:run(),moduleResolver:yes});assert.equal(x.portalConnected,false)},
];
for(const t of tests)t();
console.log(`PASS V27 : ${tests.length}/${tests.length}`);
