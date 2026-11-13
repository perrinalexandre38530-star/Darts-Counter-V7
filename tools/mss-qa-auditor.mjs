/**
 * MSS-Auditeur V1: independent verification of read-only QA GitHub metadata.
 * No model inference, source edits, deployments or unapproved issue mutations.
 */
import {pathToFileURL} from 'node:url';
import {isTrustedOwnerActor, isTrustedPilotComment} from './mss-qa-pilot.mjs';

export const AUDITOR_MARKER = '<!-- MSS_QA_AUDITOR_V1 -->';
const QA_WORKFLOW = 'MSS QA Agent - read-only evidence';
const MAX_EVIDENCE = 3;
const safe = (x,length=140) => String(x||'').replace(/[<>\r\n|]/g,' ').replace(/\s+/g,' ').trim().slice(0,length);
const escapeRegex = x => x.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');

export function isApprovedAuditIssue(issue,actor,repo) {
  if(!isTrustedOwnerActor(actor,repo)||!issue||issue.state!=='open'||issue.pull_request)return false;
  const names=new Set((issue.labels||[]).map(l=>String(typeof l==='string'?l:l?.name||'').toLowerCase()));
  return ['mss:mission','mss:approved','mss:review','mss:audit-approved'].every(x=>names.has(x))
    && !names.has('mss:blocked');
}

export function isTrustedAuditorComment(comment,number,repo) {
  if(comment?.user?.login!=='github-actions[bot]'||comment?.user?.type!=='Bot'
    ||!String(comment?.body||'').startsWith(AUDITOR_MARKER+'\n')
    ||!comment.body.includes('**Mission QA examinée :** #'+number))return false;
  try {
    const u=new URL(comment.html_url);
    return u.protocol==='https:'&&u.hostname==='github.com'
      &&u.pathname==='/'+repo+'/issues/'+number
      &&/^#issuecomment-\d+$/.test(u.hash)&&!u.search;
  } catch {return false;}
}

export function extractQaReport(comment,number,repo) {
  if(!isTrustedPilotComment(comment,number,repo))
    return {ok:false,reason:'AUCUN_RAPPORT_QA_AUTHENTIQUE'};
  const source=String(comment.body);
  const workflow=source.match(/\*\*Journal du robot :\*\* https:\/\/github\.com\/([^\s/]+\/[^\s/]+)\/actions\/runs\/(\d+)/);
  const status=source.match(/\*\*Statut de cet échantillon : (PASS|FAIL|BLOQUÉ)\*\*/);
  if(!workflow||workflow[1]!==repo||!status)
    return {ok:false,reason:'MÉTADONNÉES_RAPPORT_INVALIDES'};
  const evidence=[];
  const re=new RegExp('^\\s*- \\[([^\\]\\n]*)\\]\\(https:\\/\\/github\\.com\\/'+escapeRegex(repo)+'\\/actions\\/runs\\/(\\d+)\\) — (failure|timed_out), SHA ([0-9a-f]{7,40})$','gm');
  let match;
  while((match=re.exec(source))!==null){
    if(evidence.length>=MAX_EVIDENCE)return {ok:false,reason:'TROP_DE_PREUVES'};
    evidence.push({id:Number(match[2]),conclusion:match[3],sha:match[4]});
  }
  if(status[1]==='FAIL'&&evidence.length===0)return {ok:false,reason:'ÉCHEC_SANS_PREUVE'};
  if(status[1]!=='FAIL'&&evidence.length>0)return {ok:false,reason:'STATUT_INCOHÉRENT'};
  const foreign=[...source.matchAll(/https:\/\/github\.com\/([^\s/)]+\/[^\s/)]+)\/actions\/runs\/\d+/g)].some(m=>m[1]!==repo);
  if(foreign)return {ok:false,reason:'LIEN_EXTERNE_NON_FIABLE'};
  return {ok:true,qaRun:Number(workflow[2]),status:status[1],evidence};
}

export async function verifyQaReport(issue,comments,repo,fetchRun,fetchJobs){
  const report=(Array.isArray(comments)?comments:[]).filter(c=>isTrustedPilotComment(c,issue.number,repo)).at(-1);
  if(!report)return {status:'BLOCKED',reason:'AUCUN_RAPPORT_QA_AUTHENTIQUE',evidence:[]};
  const parsed=extractQaReport(report,issue.number,repo);
  if(!parsed.ok)return {status:'BLOCKED',reason:parsed.reason,evidence:[]};
  if(parsed.status!=='FAIL'||parsed.evidence.length===0)
    return {status:'BLOCKED',reason:'AUCUN_ÉCHEC_CONCLUANT_A_RECONTRÔLER',evidence:[]};
  let qaRun;
  try{qaRun=await fetchRun(parsed.qaRun);}catch{
    return {status:'BLOCKED',reason:'JOURNAL_QA_INACCESSIBLE',evidence:[]};
  }
  if(qaRun?.name!==QA_WORKFLOW||qaRun?.status!=='completed'||qaRun?.conclusion!=='success'
    ||!['issues','workflow_dispatch'].includes(qaRun?.event)
    ||!isTrustedOwnerActor(qaRun?.actor?.login,repo)||qaRun?.head_branch!=='main'){
    return {status:'BLOCKED',reason:'EXÉCUTION_QA_NON_CERTIFIÉE',evidence:[]};
  }
  let jobs;
  try{jobs=await fetchJobs(parsed.qaRun);}catch{
    return {status:'BLOCKED',reason:'JOBS_QA_INACCESSIBLES',evidence:[]};
  }
  if(!(Array.isArray(jobs)?jobs:[]).some(j=>j.name==='qa_pilot'&&j.status==='completed'&&j.conclusion==='success'))
    return {status:'BLOCKED',reason:'JOB_QA_NON_RÉUSSI',evidence:[]};
  const verified=[];
  for(const evidence of parsed.evidence){
    if(evidence.id===parsed.qaRun||!Number.isSafeInteger(evidence.id))
      return {status:'BLOCKED',reason:'PREUVE_NON_FIABLE',evidence:verified};
    let run;
    try{run=await fetchRun(evidence.id);}catch{
      return {status:'BLOCKED',reason:'PREUVE_INACCESSIBLE',evidence:verified};
    }
    if(run?.status!=='completed'||run?.conclusion!==evidence.conclusion
      ||!run?.head_sha?.startsWith(evidence.sha)||run?.head_branch!=='main'
      ||/^MSS QA Agent\b/i.test(run?.name||'')){
      return {status:'BLOCKED',reason:'PREUVE_INCOHÉRENTE',evidence:verified};
    }
    verified.push({id:evidence.id,conclusion:evidence.conclusion});
  }
  return {status:'VERIFIED',reason:'MÉTADONNÉES_CONFIRMÉES',qaRun:parsed.qaRun,
    sampleStatus:parsed.status,evidence:verified};
}

export function auditorReport(issue,result,repo,runId) {
  const lines=[
    AUDITOR_MARKER,
    '## MSS-Auditeur — contrôle indépendant du rapport QA',
    '',
    '**Mission QA examinée :** #'+issue.number,
    '**Journal du contrôle :** https://github.com/'+repo+'/actions/runs/'+runId,
    '**Résultat : '+result.status+'** — '+safe(result.reason),
    '',
    '### Vérifications',
    '- Identité du robot QA, rattachement à la mission, acteur propriétaire et job terminé contrôlés.',
    '- Les conclusions des exécutions CI citées ont été comparées aux métadonnées officielles GitHub.',
    '- Preuves de runs revalidées : **'+(result.evidence?.length||0)+'** (maximum '+MAX_EVIDENCE+').',
  ];
  for(const item of result.evidence||[])lines.push('  - https://github.com/'+repo+'/actions/runs/'+item.id+' — '+item.conclusion);
  lines.push('',
    '- **Portée :** cohérence des métadonnées, pas preuve de cause racine ni certification de l’application.',
    '- **Aucun accès aux logs bruts, aucun appel IA, aucune écriture de code, fusion ou déploiement.**',
    '- Une décision humaine reste nécessaire pour ouvrir une mission de correction.');
  if(result.status!=='VERIFIED')lines.push('- Les incohérences imposent un nouveau contrôle manuel.');
  return lines.join('\n');
}

async function main() {
  const repo=process.env.GITHUB_REPOSITORY||'';
  const actor=process.env.GITHUB_ACTOR||'';
  const token=process.env.GITHUB_TOKEN||'';
  const number=Number(process.env.ISSUE_NUMBER||'');
  if(!isTrustedOwnerActor(actor,repo)||!token||!Number.isSafeInteger(number)||number<1)
    throw new Error('Owner authorization, issue number or token missing');
  const endpoint='https://api.github.com/repos/'+repo;
  async function api(path,method='GET',body){
    const response=await fetch(endpoint+path,{
      method,
      headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28','User-Agent':'MSS-AUDITOR-V1'},
      body:body===undefined?undefined:JSON.stringify(body),
      signal:AbortSignal.timeout(20000)
    });
    if(!response.ok)throw new Error('GitHub HTTP '+response.status+' ('+method+')');
    return response.status===204?null:response.json();
  }
  const issue=await api('/issues/'+number);
  if(!isApprovedAuditIssue(issue,actor,repo)){
    console.log('SKIP: audit not owner-approved for this QA issue');return;
  }
  const comments=await api('/issues/'+number+'/comments?per_page=100');
  if(comments.some(c=>isTrustedAuditorComment(c,number,repo))){
    console.log('SKIP: independent audit already posted');return;
  }
  const review=await verifyQaReport(issue,comments,repo,
    id=>api('/actions/runs/'+id),
    async id=>(await api('/actions/runs/'+id+'/jobs?per_page=100')).jobs||[]);
  await api('/issues/'+number+'/comments','POST',{body:auditorReport(issue,review,repo,process.env.GITHUB_RUN_ID||'')});
  if(review.status==='VERIFIED'){
    try{await api('/labels/mss:audited');}
    catch{await api('/labels','POST',{name:'mss:audited',color:'6f42c1',description:'QA metadata independently rechecked'});}
    await api('/issues/'+number+'/labels','POST',{labels:['mss:audited']});
  }
  console.log('MSS-Auditeur: '+review.status+'; checked '+(review.evidence?.length||0)+' run links.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(e=>{console.error('MSS-Auditeur:',e.message);process.exitCode=1;});
}
