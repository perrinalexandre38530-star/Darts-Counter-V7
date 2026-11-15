import assert from 'node:assert/strict';
import {planQa} from './mss-qa-chief-v11.mjs';
assert.deepEqual(planQa({description:'les stats X01 sont fausses'}).missions,['stats']);
assert.deepEqual(planQa({description:'sauvegarde NAS et erreurs TypeScript'}).missions,['backup','types']);
assert.deepEqual(planQa({changedFiles:['src/pages/Profiles.tsx']}).missions,['navigation','types']);
assert.deepEqual(planQa({description:'aucun domaine explicite'}).missions,['qa-complet']);
assert.throws(()=>planQa({description:'x'.repeat(2001)}));
assert.equal(planQa({description:'git reset --hard'}).missions[0],'qa-complet');
console.log('MSS QA Chief V11: 6 tests PASS');
