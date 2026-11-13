import test from 'node:test';
import assert from 'node:assert/strict';
import {AUDITOR_MARKER,isApprovedAuditIssue,isTrustedAuditorComment,
  extractQaReport,verifyQaReport,auditorReport} from './mss-qa-auditor.mjs';

const repo='owner/repo';
const issue={number:39,state:'open',labels:[
  {name:'mss:mission'},{name:'mss:approved'},{name:'mss:review'},{name:'mss:audit-approved'}]};
const qaRun={id:120,name:'MSS QA Agent - read-only evidence',event:'issues',
  actor:{login:'owner'},status:'completed',conclusion:'success',head_branch:'main'};
const failedRun={id:130,name:'Android Debug APK',head_sha:'abcdef0123456789',
  head_branch:'main',status:'completed',conclusion:'failure'};
const body=[
  '<!-- MSS_QA_PILOT_V1 -->',
  '## MSS Testeur QA — audit automatisé, lecture seule',
  '**Mission :** #39 — [AGENT] QA',
  '**Branche examinée :** main',
  '**Journal du robot :** https://github.com/owner/repo/actions/runs/120',
  '- **Statut de cet échantillon : FAIL**',
  '### Échecs récents et preuves',
  '- [Android](https://github.com/owner/repo/actions/runs/130) — failure, SHA abcdef012345',
  '### Analyse IA',
  '- Non réalisée : aucun appel payant.'
].join('\n');
const qaComment={user:{login:'github-actions[bot]',type:'Bot'},body,
  html_url:'https://github.com/owner/repo/issues/39#issuecomment-3'};
const fetchRun=async id=>({120:qaRun,130:failedRun}[id]||null);
const fetchJobs=async id=>id===120?[{name:'qa_pilot',status:'completed',conclusion:'success'}]:[];

test('auditor requires the repository owner and separate consent',()=>{
  assert.equal(isApprovedAuditIssue(issue,'owner',repo),true);
  assert.equal(isApprovedAuditIssue(issue,'another',repo),false);
  assert.equal(isApprovedAuditIssue({...issue,labels:issue.labels.filter(x=>x.name!=='mss:audit-approved')},'owner',repo),false);
  assert.equal(isApprovedAuditIssue({...issue,labels:[...issue.labels,{name:'mss:blocked'}]},'owner',repo),false);
  assert.equal(isApprovedAuditIssue({...issue,state:'closed'},'owner',repo),false);
});
test('only genuine bot QA comments with same issue and repo are accepted',()=>{
  assert.equal(extractQaReport(qaComment,39,repo).ok,true);
  assert.equal(extractQaReport({...qaComment,user:{login:'attacker',type:'User'}},39,repo).ok,false);
  assert.equal(extractQaReport({...qaComment,html_url:'https://other.example/reply'},39,repo).ok,false);
  assert.equal(extractQaReport(qaComment,40,repo).ok,false);
  assert.equal(extractQaReport({...qaComment,body:body.replace('owner/repo/actions/runs/120','attacker/repo/actions/runs/120')},39,repo).ok,false);
});
test('auditor verifies independently QA run and linked failing CI run',async()=>{
  const result=await verifyQaReport(issue,[qaComment],repo,fetchRun,fetchJobs);
  assert.deepEqual(result,{status:'VERIFIED',reason:'MÉTADONNÉES_CONFIRMÉES',qaRun:120,sampleStatus:'FAIL',
    evidence:[{id:130,conclusion:'failure'}]});
  const report=auditorReport(issue,result,repo,'999');
  assert.ok(report.startsWith(AUDITOR_MARKER));
  assert.ok(report.includes('**Résultat : VERIFIED**'));
  assert.ok(report.includes('https://github.com/owner/repo/actions/runs/130'));
  assert.ok(report.includes('aucun appel IA'));
  assert.ok(!report.includes('Non réalisée'));
});
test('mismatched conclusion, SHA or branch are BLOCKED',async()=>{
  for(const changed of [
    {...failedRun,conclusion:'success'},
    {...failedRun,head_sha:'123456789abcdef'},
    {...failedRun,head_branch:'foreign'}
  ]){
    const result=await verifyQaReport(issue,[qaComment],repo,id=>id===130?changed:fetchRun(id),fetchJobs);
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'PREUVE_INCOHÉRENTE');
  }
});
test('failed QA workflow and missing QA job never pass',async()=>{
  const invalid=await verifyQaReport(issue,[qaComment],repo,
    id=>id===120?{...qaRun,conclusion:'failure'}:fetchRun(id),fetchJobs);
  assert.equal(invalid.status,'BLOCKED');
  const noJob=await verifyQaReport(issue,[qaComment],repo,fetchRun,async()=>[]);
  assert.equal(noJob.status,'BLOCKED');
  assert.equal(noJob.reason,'JOB_QA_NON_RÉUSSI');
});
test('unavailable metadata and foreign evidence never grant certification',async()=>{
  const broken=await verifyQaReport(issue,[qaComment],repo,async()=>{throw new Error('403');},fetchJobs);
  assert.equal(broken.status,'BLOCKED');
  assert.ok(!auditorReport(issue,broken,repo,'999').includes('**Résultat : VERIFIED**'));
  const foreign={...qaComment,body:body.replace('https://github.com/owner/repo/actions/runs/130',
    'https://github.com/other/repo/actions/runs/130')};
  assert.equal(extractQaReport(foreign,39,repo).ok,false);
});
test('auditor report cannot be impersonated or reused on another issue',()=>{
  const comment={user:{login:'github-actions[bot]',type:'Bot'},
    body:AUDITOR_MARKER+'\n**Mission QA examinée :** #39',
    html_url:'https://github.com/owner/repo/issues/39#issuecomment-19'};
  assert.equal(isTrustedAuditorComment(comment,39,repo),true);
  assert.equal(isTrustedAuditorComment({...comment,user:{login:'owner',type:'User'}},39,repo),false);
  assert.equal(isTrustedAuditorComment({...comment,html_url:'https://github.com/owner/repo/issues/40#issuecomment-19'},39,repo),false);
});

test('a PASS without external failure evidence is not silently certified',async()=>{
  const noFailure=body
    .replace('**Statut de cet échantillon : FAIL**','**Statut de cet échantillon : PASS**')
    .replace('- [Android](https://github.com/owner/repo/actions/runs/130) — failure, SHA abcdef012345','');
  const result=await verifyQaReport(issue,[{...qaComment,body:noFailure}],repo,fetchRun,fetchJobs);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'AUCUN_ÉCHEC_CONCLUANT_A_RECONTRÔLER');
});
