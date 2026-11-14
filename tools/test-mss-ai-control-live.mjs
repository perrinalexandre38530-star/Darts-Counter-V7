import test from 'node:test';
import assert from 'node:assert/strict';
import {isOutsideRepository,assertLoopbackHost,sanitizeReport,buildPage} from './mss-ai-control-live-core.mjs';

test('reports may not be inside repository',()=>{
 assert.equal(isOutsideRepository('/work/proj','/work/proj'),false);
 assert.equal(isOutsideRepository('/work/proj','/work/proj/sub'),false);
 assert.equal(isOutsideRepository('/work/proj','/work/proj-reports'),true);
});
test('server is loopback only',()=>{
 assert.equal(assertLoopbackHost('127.0.0.1'),'127.0.0.1');
 assert.throws(()=>assertLoopbackHost('0.0.0.0'));
});
test('dashboard reports cannot certify StackBlitz',()=>{
 const s=sanitizeReport({schema:'mss-ai-control-dashboard-v3',generatedAt:'2026-11-14',pc:{status:'ALIGNE',branch:'main',localSha:'a'.repeat(40)},github:{status:'REFERENCE_VERIFIEE',sha:'a'.repeat(40)},stackblitz:{status:'ALIGNE'},qa:{status:'PASS',tests:[]},alerts:[],actions:[]});
 assert.equal(s.stackblitz.status,'NON_VERIFIE');
});
test('invalid report rejected',()=>assert.throws(()=>sanitizeReport({schema:'untrusted'})));
test('UI is read-only and uses textContent for data',()=>{
 const html=buildPage();assert.match(html,/textContent/);assert.match(html,/NON VÉRIFIÉ/);assert.doesNotMatch(html,/innerHTML/);
});
