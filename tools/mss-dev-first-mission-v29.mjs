import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// No network calls, no AI request, no writes to the application repository.
const CHECKS = Object.freeze([
  ['proposal-validation', 'tools/test-mss-dev-proposal-v13.mjs'],
  ['agent-proposal-mock', 'tools/test-mss-dev-agent-v15.mjs'],
  ['staged-regression', 'tools/test-mss-dev-regression-v16.mjs'],
  ['qa-verdict', 'tools/test-mss-dev-qa-gate-v18.mjs'],
  ['pre-send-security', 'tools/test-mss-dev-send-guard-v23.mjs'],
  ['api-status-mock', 'tools/test-mss-dev-api-check-v28.mjs'],
]);
export function runFirstMissionRehearsal(root,{spawn=spawnSync,save=true}={}) {
  const startedAt=new Date().toISOString();
  const results=[];
  for (const [id,path] of CHECKS) {
    if(!existsSync(join(root,path))){results.push({id,status:'NON_EXECUTE',reason:'Script de test absent'});continue;}
    const r=spawn(process.execPath,[path],{cwd:root,encoding:'utf8',timeout:45000,maxBuffer:250000,env:{...process.env,OPENAI_API_KEY:'',MSS_AI_ALLOW_SEND:'',CI:'1'}});
    const status=r.error?.code==='ETIMEDOUT'?'TIMEOUT':r.error?'ERROR':r.status===0?'PASS':'FAIL';
    // Never expose raw stdout/stderr as they could include project paths or secrets.
    results.push({id,status,exitCode:Number.isInteger(r.status)?r.status:null});
  }
  const status=results.every(r=>r.status==='PASS')?'PASS':'BLOQUE';
  const report={schema:'mss.dev.rehearsal.v29',startedAt,completedAt:new Date().toISOString(),status,results,scope:'Tests unitaires et simulations locales uniquement. Aucun appel IA, aucune correction applicative, aucune publication.',modelRequestPerformed:false,projectChanged:false};
  if(save){const dir=resolve(root,'..','MSS_AI_CONTROL_REPORTS','REHEARSAL_V29');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'latest.json'),JSON.stringify(report,null,2));}
  return report;
}
