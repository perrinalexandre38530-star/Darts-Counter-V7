import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,symlinkSync,readdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {bridgePaths,listIncoming,getIncoming,publishPublicReport} from './mss-dev-bridge-v20.mjs';
const t=mkdtempSync(join(tmpdir(),'mss-v20-')),root=join(t,'project');mkdirSync(root);
let tests=0;
function check(fn){fn();tests++;}
try{
 const p=bridgePaths(root);
 check(()=>assert.ok(p.inbox.endsWith('INBOX')&&p.outbox.endsWith('OUTBOX')));
 writeFileSync(join(p.inbox,'DEV_123.json'),JSON.stringify({schema:'mss.dev.mission.v1',requestId:'DEV_123',description:'Corriger les statistiques X01 en erreur'}));
 check(()=>assert.equal(listIncoming(root).accepted.length,1));
 check(()=>assert.equal(getIncoming(root,'DEV_123').requestId,'DEV_123'));
 writeFileSync(join(p.inbox,'BAD.json'),JSON.stringify({schema:'mss.dev.mission.v1',requestId:'BAD',description:'Exécuter une commande non autorisée',command:'rm -rf /'}));
 check(()=>assert.equal(listIncoming(root).rejected.length,1));
 check(()=>assert.throws(()=>getIncoming(root,'../BAD')));
 writeFileSync(join(p.inbox,'HUGE.json'),'x'.repeat(6100));
 check(()=>assert.equal(listIncoming(root).rejected.length,2));
 const r={schema:'mss.dev.report.v1',requestId:'DEV_123',verifiedByPortal:false,decision:'BLOQUE',tests:[]};
 const out=publishPublicReport(root,r);
 check(()=>assert.equal(JSON.parse(readFileSync(out)).verifiedByPortal,false));
 check(()=>assert.equal(JSON.parse(readFileSync(out)).transport,'manual-outbox-v20'));
 check(()=>assert.equal(publishPublicReport(root,{schema:'mss.dev.report.v1',requestId:null}),null));
 check(()=>assert.equal(listIncoming(root).connectedToPortal,false));
 console.log(`PASS V20 : ${tests}/${tests} contrôles`);
}finally{rmSync(t,{recursive:true,force:true});}
