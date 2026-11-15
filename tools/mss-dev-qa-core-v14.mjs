import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { checkProposal, zipFiles } from './mss-dev-proposal-core-v13.mjs';

const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch { /* Optional: report unverifiable, never claim success. */ }
const MAX_REPORT = 1200;
export function validateDevProposal(root, proposal) {
 const review = checkProposal(root, proposal);
 const checks = [];
 const tmp = mkdtempSync(join(tmpdir(), 'mss-dev-v14-'));
 try {
  for (let i = 0; i < review.files.length; i++) {
   const file = review.files[i];
   if (file.status !== 'PRET_A_REVOIR') { checks.push({path:file.path,status:file.status==='IDENTIQUE'?'SANS_CHANGEMENT':'BLOQUE',detail:file.reason || file.status}); continue; }
   const ext = extname(file.path).toLowerCase();
   if (['.js','.mjs','.jsx'].includes(ext)) {
    if(ext==='.jsx') { checks.push({path:file.path,status:'NON_VERIFIE',detail:'JSX : analyseur JSX requis'}); continue; }
    const name=join(tmp, `f${i}${ext}`);writeFileSync(name,file.content);
    const run=spawnSync(process.execPath,['--check',name],{encoding:'utf8',timeout:10000,maxBuffer:100000,env:{PATH:process.env.PATH || ''}});
    checks.push({path:file.path,status:run.status===0?'SYNTAXE_OK':'ERREUR_SYNTAXE',detail:run.status===0?'Syntaxe JavaScript vérifiée':String(run.stderr || run.error || 'Erreur').slice(0,MAX_REPORT)});
   } else if(['.ts','.tsx','.jsx'].includes(ext)) {
    if(!ts){checks.push({path:file.path,status:'NON_VERIFIE',detail:'TypeScript non installé : vérification impossible'});continue;}
    const output=ts.transpileModule(file.content.toString('utf8'),{fileName:file.path,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
    const errors=(output.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
    checks.push({path:file.path,status:errors.length?'ERREUR_SYNTAXE':'SYNTAXE_OK',detail:errors.length?ts.flattenDiagnosticMessageText(errors[0].messageText,' ').slice(0,MAX_REPORT):'Analyse syntaxique TypeScript (pas un typecheck complet)'});
   } else if(ext==='.json') {
    try{JSON.parse(file.content.toString('utf8'));checks.push({path:file.path,status:'SYNTAXE_OK',detail:'JSON valide'});}catch(e){checks.push({path:file.path,status:'ERREUR_SYNTAXE',detail:String(e.message).slice(0,MAX_REPORT)});}
   } else checks.push({path:file.path,status:'NON_VERIFIE',detail:'Aucun analyseur syntaxique pour ce format'});
  }
 } finally {rmSync(tmp,{recursive:true,force:true});}
 const blocked=review.decision==='BLOQUE'||checks.some(c=>c.status==='ERREUR_SYNTAXE');
 const unchecked=checks.some(c=>c.status==='NON_VERIFIE');
 return {schema:'mss.dev.qa.v14',missionId:review.missionId,decision:blocked?'BLOQUE':unchecked?'REVISION_MANUELLE_REQUISE':'PRET_POUR_REVUE_QA',checks,review};
}
export function makeQaZip(result){
 if(result.decision==='BLOQUE')throw Error('Proposition bloquée');
 const changes=result.review.files.filter(f=>f.status==='PRET_A_REVOIR');
 if(!changes.length)throw Error('Aucun changement');
 const manifest={schema:'mss.dev.qa.v14',missionId:result.missionId,decision:result.decision,checks:result.checks,files:result.review.files.map(({content,...rest})=>rest),notice:'PROPOSITION NON INSTALLEE. Syntaxe seulement, aucun typecheck intégral ni test de régression du correctif. Validation humaine obligatoire. Pas de push.'};
 return zipFiles([...changes.map(f=>[f.path,f.content]),['MSS_DEV_REVIEW.json',Buffer.from(JSON.stringify(manifest,null,2))]]);
}
