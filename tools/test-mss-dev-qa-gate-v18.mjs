import assert from 'node:assert/strict';
import {evaluateQaGates} from './mss-dev-qa-gate-v18.mjs';
const base={missionId:'mss-sample',changed:['src/a.ts'],qualification:'PRET_POUR_REVUE_QA',decision:'TESTS_CIBLES_OK_REVISION_HUMAINE',tests:[{id:'qa-agent',status:'PASS'},{id:'typecheck-global',status:'PASS'}]};
let n=0;
function test(label,f){f();console.log('PASS',label);n++;}
test('zip review on complete green evidence',()=>{const x=evaluateQaGates(base,{zipAvailable:true});assert.equal(x.zipPermitted,true);assert.equal(x.auditor.verdict,'PASS')});
test('unexecuted typecheck blocked',()=>assert.equal(evaluateQaGates({...base,tests:[{id:'qa-agent',status:'PASS'},{id:'typecheck-global',status:'NON_EXECUTE'}]},{zipAvailable:true}).zipPermitted,false));
test('baseline errors blocked',()=>assert.equal(evaluateQaGates({...base,tests:[{id:'qa-agent',status:'PASS'},{id:'typecheck-global',status:'BASELINE_ERRORS'}]},{zipAvailable:true}).zipPermitted,false));
test('test failure blocked',()=>assert.equal(evaluateQaGates({...base,tests:[{id:'qa-agent',status:'FAIL'},{id:'typecheck-global',status:'PASS'}]},{zipAvailable:true}).zipPermitted,false));
test('no targeted test blocked',()=>assert.equal(evaluateQaGates({...base,tests:[{id:'typecheck-global',status:'PASS'}]},{zipAvailable:true}).zipPermitted,false));
test('duplicate test ids blocked',()=>assert.equal(evaluateQaGates({...base,tests:[...base.tests,{id:'qa-agent',status:'PASS'}]},{zipAvailable:true}).zipPermitted,false));
test('no zip blocked',()=>assert.equal(evaluateQaGates(base,{zipAvailable:false}).zipPermitted,false));
test('no changes blocked',()=>assert.equal(evaluateQaGates({...base,changed:[]},{zipAvailable:true}).zipPermitted,false));
test('qualification blocked',()=>assert.equal(evaluateQaGates({...base,qualification:'BLOQUE'},{zipAvailable:true}).zipPermitted,false));
test('unrecognized status blocked',()=>assert.equal(evaluateQaGates({...base,tests:[{id:'qa-agent',status:'MAGIC'},{id:'typecheck-global',status:'PASS'}]},{zipAvailable:true}).zipPermitted,false));
test('invalid report rejected',()=>assert.throws(()=>evaluateQaGates(null)));
console.log(`${n} tests V18 réussis`);
