import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

// Diagnostic local uniquement. Aucun appel réseau, aucune lecture de clé ni écriture Git.
export function checkDevReadiness(root, {env=process.env, gitRunner, moduleResolver}={}) {
  const checks=[];
  const add=(id,status,message)=>checks.push({id,status,message});
  const run=gitRunner||((args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:5000,stdio:['ignore','pipe','ignore']}).trim());
  const resolveModule=moduleResolver||((id)=>createRequire(resolve(root,'package.json')).resolve(id));
  let branch=null, head=null;
  try {
    branch=run(['branch','--show-current']);
    head=run(['rev-parse','--short','HEAD']);
    add('git',branch==='main'?'PASS':'BLOCK',branch==='main'?`Git local : main (${head})`:`Branche locale : ${branch||'inconnue'} — main requis`);
  } catch {
    add('git','BLOCK','Git local inaccessible depuis le serveur Node. Aucun changement Git effectué.');
  }
  try {
    resolveModule('typescript');
    add('typescript','PASS','Compilateur TypeScript accessible dans le projet. Le typecheck complet n’a pas été lancé.');
  } catch {
    add('typescript','BLOCK','TypeScript introuvable dans les dépendances du projet. Installer les dépendances avant qualification.');
  }
  if (typeof env.OPENAI_API_KEY==='string' && env.OPENAI_API_KEY.trim().length>0) {
    add('api','READY_UNVERIFIED','Variable OPENAI_API_KEY présente. Validité, crédits et accès réseau NON testés.');
  } else {
    add('api','BLOCK','Clé API absente de l’environnement du serveur. Les missions de repérage restent disponibles.');
  }
  add('portal','NOT_CONNECTED','Portail Cloudflare non raccordé : seules les missions locales sont disponibles.');
  const canAttemptAi=checks.some(x=>x.id==='git'&&x.status==='PASS')&&checks.some(x=>x.id==='typescript'&&x.status==='PASS')&&checks.some(x=>x.id==='api'&&x.status==='READY_UNVERIFIED');
  return {schema:'mss.dev.readiness.v27',checkedAt:new Date().toISOString(),canAttemptAi,apiConnectionTested:false,portalConnected:false,checks};
}
