import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {planDevelopment,missionPacket,validateTask} from './mss-dev-mission-core-v12.mjs';
import {spawn} from 'node:child_process';
const root=mkdtempSync(join(tmpdir(),'mss-v12-'));
try{
 mkdirSync(join(root,'src'));writeFileSync(join(root,'src','x01Stats.ts'),'export const averageX01 = 42;');
 assert.throws(()=>validateTask('court'));
 const plan=planDevelopment(root,'Les statistiques X01 sont fausses dans le dashboard');
 assert.equal(plan.schema,'mss.dev.mission.v1');assert(plan.files.some(f=>f.path==='src/x01Stats.ts'));assert(plan.suggestedQaMissions.includes('stats'));
 assert.equal(plan.files[0].sha256,createHash('sha256').update('export const averageX01 = 42;').digest('hex'));
 const packet=missionPacket(plan);assert.equal(packet.readUInt32LE(0),0x04034b50);
 assert.equal(packet.readUInt32LE(packet.length-22),0x06054b50);
 // No executable source is exported with the packet.
 assert(!packet.toString('utf8').includes('export const averageX01'));
 console.log('PASS V12 : validation, triage, SHA-256, ZIP et absence de code source');
}finally{rmSync(root,{recursive:true,force:true});}
