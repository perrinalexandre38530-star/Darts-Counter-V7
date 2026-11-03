import fs from 'node:fs';
import assert from 'node:assert/strict';
import { buildCanonicalX01IndexV2 } from '../src/lib/x01CanonicalIndexV2.ts';
import { selectCanonicalX01ProfileV3 } from '../src/lib/x01CanonicalSelectorsV3.ts';

const filename = process.argv[2];
assert.ok(filename, 'Provide the original History JSON as argv[2]');
const originalBytes = fs.readFileSync(filename);
const data = JSON.parse(originalBytes.toString('utf8'));
const historyBefore = JSON.stringify(data.history);
const rows = Object.values(data.history.rows);
const index = buildCanonicalX01IndexV2(rows);
const headerIndex = buildCanonicalX01IndexV2(rows.map((r: any) => {const {payload,payloadCompressed,...header}=r;return header;}));
assert.equal(rows.length,107);
assert.equal(index.x01MatchCount,67);
assert.equal(headerIndex.x01MatchCount,67);
assert.equal(JSON.stringify(data.history),historyBefore);
const matrix = (idx: any) => idx.matches.reduce((out: Record<string,number>, m: any) => {
 const key = `${m.startScore??'UNKNOWN'}|${m.outMode}`;out[key]=(out[key]||0)+1;return out;
}, {});
assert.deepEqual(matrix(index), matrix(headerIndex));
const modeCounts = matrix(index);
assert.deepEqual(modeCounts, {'301|unknown':47,'301|simple':7,'501|double':12,'501|unknown':1});
const profiles = new Set(index.matches.flatMap((m:any)=>m.participants.map((p:any)=>p.canonicalProfileId).filter(Boolean)));
let excluded = 0, valid = 0;
for(const id of profiles){
  const p=selectCanonicalX01ProfileV3(index,String(id));
  assert.ok(p.referenceCurrentMatches<=10);
  assert.ok(p.reference501DO>=p.referenceCurrentMatches);
  assert.equal(p.referenceCurrent.eligible+p.referenceCurrent.excluded,p.referenceCurrentMatches);
  assert.equal(p.exitModes.simple.matches+p.exitModes.double.matches+p.exitModes.master.matches+p.exitModes.unknown.matches,p.totalMatches);
  if(p.referenceCurrent.value!==null) assert.ok(Number.isFinite(p.referenceCurrent.value));
  excluded+=p.referenceCurrent.excluded;valid+=p.referenceCurrent.eligible;
}
const result={status:'PASS',sourceCount:rows.length,x01Count:index.x01MatchCount,modeCounts,
  profileCount:profiles.size,current501DOEligibleObservations:valid,current501DOExcludedObservations:excluded,
  historyUnchanged:true,readOnly:true,uiSwitched:false};
console.log(JSON.stringify(result,null,2));
