import assert from 'node:assert/strict';
import {checkModelAccess} from './mss-dev-api-check-v28.mjs';
let count=0,calls=[];
const mock=(status)=>async(url,opt)=>{calls.push({url,opt});return {status,ok:status>=200&&status<300}};
let r=await checkModelAccess({});assert.equal(r.reason,'KEY_MISSING');count++;
r=await checkModelAccess({apiKey:'test',model:'bad/model',fetchFn:mock(200)});assert.equal(r.reason,'MODEL_INVALID');count++;
for(const [status,reason] of [[200,'MODEL_VISIBLE'],[401,'AUTH'],[403,'ACCESS'],[404,'MODEL_NOT_FOUND'],[429,'LIMIT'],[500,'HTTP_ERROR']]){
 r=await checkModelAccess({apiKey:'fake-secret',model:'gpt-5-mini',fetchFn:mock(status)});assert.equal(r.reason,reason);count++;
}
assert.equal(calls.length,6);assert.equal(calls[0].opt.method,'GET');assert(!JSON.stringify(calls[0]).includes('src/'));count++;
r=await checkModelAccess({apiKey:'x',fetchFn:async()=>{throw Error('network secret')}});assert.equal(r.reason,'NETWORK');assert(!JSON.stringify(r).includes('network secret'));count++;
r=await checkModelAccess({apiKey:'x',fetchFn:async()=>{const e=Error('aborted');e.name='AbortError';throw e;}});assert.equal(r.reason,'TIMEOUT');count++;
console.log('PASS V28:',count+'/'+count);
