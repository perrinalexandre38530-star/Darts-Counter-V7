import { mkdtempSync, cpSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateDevProposal, makeQaZip } from './mss-dev-qa-core-v14.mjs';
import { typecheckOverlay } from './mss-dev-typecheck-v17.mjs';

const TESTS = Object.freeze({
 'qa-agent': ['tools/test-mss-dev-agent-v15.mjs'],
 'qa-proposal': ['tools/test-mss-dev-proposal-v13.mjs'],
 'qa-qualification': ['tools/test-mss-dev-qa-v14.mjs'],
 'qa-missions': ['tools/test-mss-ai-control-missions-v10.mjs'],
});
const SKIP = new Set(['node_modules','.git','dist','build','coverage','.next','.cache','.wrangler','android','ios','public','.env']);
const MAX_STDOUT = 2500;
function runNode(stage, relative, timeoutMs) {
 const result=spawnSync(process.execPath,[relative], {cwd:stage, encoding:'utf8', timeout:timeoutMs, maxBuffer:750_000, env:{...process.env, OPENAI_API_KEY:'', MSS_AI_ALLOW_SEND:'', CI:'1'}});
 return {status:result.error?.code==='ETIMEDOUT'?'TIMEOUT':result.status===0?'PASS':'FAIL', exitCode:result.status, detail:String(result.stderr||result.stdout||result.error?.message||'').slice(-MAX_STDOUT)};
}
function stageProject(root,stage){
 // Never follow symlinks from the project: stage only regular source/config data.
 const {readdirSync,lstatSync}=requireFs;
 function walk(src,dst,depth=0){
  if(depth>30)throw Error('Arborescence trop profonde');
  for(const entry of readdirSync(src,{withFileTypes:true})){
   if(SKIP.has(entry.name)||entry.name.startsWith('.env'))continue;
   const origin=join(src,entry.name),target=join(dst,entry.name);
   const stat=lstatSync(origin);
   if(stat.isSymbolicLink())continue;
   if(stat.isDirectory()) { mkdirSync(target,{recursive:true});walk(origin,target,depth+1); }
   else if(stat.isFile()) {
    if(stat.size>3_000_000)continue;
    // Source/config only; ignore images and binary artifacts.
    if(!/\.(?:[cm]?[jt]sx?|json|css|scss|html|yaml|yml|md|txt|svg)$/.test(entry.name))continue;
    cpSync(origin,target);
   }
  }
 }
 walk(root,stage);
}
import { readdirSync,lstatSync } from 'node:fs';
const requireFs={readdirSync,lstatSync};
export function qualifyInStaging(root,proposal,{tests=['qa-agent','qa-proposal','qa-qualification'],timeoutMs=45000,requireTypecheck=false,typescriptModule}={}){
 const base=resolve(root);
 const qa=validateDevProposal(base,proposal);
 const changed=qa.review.files.filter(f=>f.status==='PRET_A_REVOIR');
 const out={schema:'mss.dev.regression.v16',missionId:proposal?.missionId,createdAt:new Date().toISOString(),qualification:qa.decision,changed:changed.map(f=>f.path),tests:[],decision:'BLOQUE',notice:'Copie de travail temporaire : pas une sandbox de sécurité. Aucun fichier du dépôt d’origine n’est modifié, aucun push. Revue humaine nécessaire.'};
 if(qa.decision==='BLOQUE'||!changed.length){out.reason=qa.decision==='BLOQUE'?'Conflit ou syntaxe invalide':'Aucune modification';return {report:out,zip:null};}
 const stage=mkdtempSync(join(tmpdir(),'mss-dev-regression-v16-'));
 try{
  stageProject(base,stage);
  for(const file of changed){
   const dest=resolve(stage,file.path);
   if(!dest.startsWith(stage+sep)||!existsSync(dest))throw Error('Fichier non copié ou interdit : '+file.path);
   writeFileSync(dest,file.content);
  }
  for(const file of changed){
   if(/\.(?:js|mjs)$/.test(file.path)){
    const check=spawnSync(process.execPath,['--check','--input-type=module'],{input:file.content,encoding:'utf8',timeout:10000,maxBuffer:100000});
    out.tests.push({id:'syntax:'+file.path,status:check.status===0?'PASS':'FAIL',detail:String(check.stderr||'').slice(-MAX_STDOUT)});
   }
  }
  if(out.tests.some(t=>t.status==='FAIL')){out.decision='BLOQUE';out.reason='Syntaxe invalide détectée dans la copie';return {report:out,zip:null};}
  for(const id of tests){
   if(!Object.hasOwn(TESTS,id))throw Error('Test non autorisé : '+id);
   const relative=TESTS[id][0];
   if(!existsSync(join(stage,relative))){out.tests.push({id,status:'NON_EXECUTE',detail:'Script absent de cette version'});continue;}
   out.tests.push({id,...runNode(stage,relative,timeoutMs)});
  }
  out.tests.push(typecheckOverlay(base,changed.map(f=>({path:f.path,content:f.content.toString('utf8')})),{typescriptModule}));
  out.decision=out.tests.some(t=>t.status==='FAIL'||t.status==='TIMEOUT')?'ECHEC_QA':out.tests.some(t=>t.status==='NON_EXECUTE'||t.status==='BASELINE_ERRORS')||qa.decision!=='PRET_POUR_REVUE_QA'?'REVISION_HUMAINE_REQUISE':'TESTS_CIBLES_OK_REVISION_HUMAINE';
  out.reason=out.decision==='ECHEC_QA'?'Tests en échec':out.decision==='REVISION_HUMAINE_REQUISE'?'Couverture insuffisante ou vérification manuelle nécessaire':'Tests ciblés réussis, pas de validation fonctionnelle complète';
  if(requireTypecheck && out.tests.find(t=>t.id==='typecheck-global')?.status==='NON_EXECUTE'){out.decision='BLOQUE';out.reason='Typecheck obligatoire non exécuté';}
  out.schema='mss.dev.regression.v17';
  return {report:out,zip:['ECHEC_QA','BLOQUE'].includes(out.decision)?null:makeQaZip(qa)};
 }finally{rmSync(stage,{recursive:true,force:true});}
}
