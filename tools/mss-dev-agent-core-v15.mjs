import { readFileSync, statSync, realpathSync, lstatSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { planDevelopment, validateTask } from './mss-dev-mission-core-v12.mjs';
import { validateDevProposal, makeQaZip } from './mss-dev-qa-core-v14.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const MAX_FILES=3, MAX_BYTES=35_000, MAX_REPLY=600_000;
const ALLOWED=/^(src|tools)\/(?!.*(?:\.env|secret|credential|token|key)[^/]*$)[A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx|mjs|json|css)$/i;

export function prepareAgentContext(root, description, paths) {
 const task=validateTask(description), base=realpathSync(root);
 const triage=planDevelopment(base,task);
 const selected=paths?.length?paths:triage.files.filter(f=>ALLOWED.test(f.path)).slice(0,MAX_FILES).map(f=>f.path);
 if(!selected.length)throw Error('Aucun fichier candidat. Précisez les chemins avec --files src/...');
 if(selected.length>MAX_FILES || new Set(selected).size!==selected.length)throw Error('Maximum 3 fichiers distincts');
 let total=0;
 const files=selected.map(path=>{
  if(!ALLOWED.test(path)||path.includes('//')||path.split('/').some(p=>p==='.'||p==='..'))throw Error('Chemin refusé : '+path);
  const full=resolve(base,...path.split('/'));
  if(!full.startsWith(base+sep))throw Error('Chemin hors du projet');
  let current=base;
  for(const p of path.split('/')) {current=resolve(current,p);if(lstatSync(current).isSymbolicLink())throw Error('Lien symbolique refusé');}
  const size=statSync(full).size;
  if(!size||size>MAX_BYTES)throw Error('Fichier trop volumineux (limite 35 Ko) : '+path);
  total+=size;if(total>MAX_BYTES*MAX_FILES)throw Error('Limite globale dépassée');
  const buffer=readFileSync(full);if(buffer.includes(0))throw Error('Contenu binaire refusé');
  return {path,baseSha256:sha(buffer),content:buffer.toString('utf8')};
 });
 return {missionId:triage.id,description:task,files,tests:triage.suggestedQaMissions,notice:'Les contenus sélectionnés seront envoyés au prestataire IA uniquement après consentement explicite.'};
}

function parseJsonText(text){
 if(typeof text!=='string'||text.length>MAX_REPLY)throw Error('Réponse IA trop volumineuse');
 let obj;try{obj=JSON.parse(text);}catch{throw Error('Réponse IA non conforme au JSON attendu');}
 if(!obj || !Array.isArray(obj.files))throw Error('Proposition de fichiers absente');
 return obj;
}
export function proposalFromAi(context, text) {
 const result=parseJsonText(text);
 if(result.files.length<1||result.files.length>context.files.length)throw Error('Nombre de fichiers proposé invalide');
 const allow=new Map(context.files.map(f=>[f.path,f]));const seen=new Set();
 const files=result.files.map(f=>{
  if(!f || typeof f.path!=='string' || !allow.has(f.path) || seen.has(f.path))throw Error('Fichier hors périmètre ou doublon');
  seen.add(f.path);
  if(typeof f.content!=='string'||Buffer.byteLength(f.content)>250_000)throw Error('Contenu généré invalide ou trop gros');
  return {path:f.path,baseSha256:allow.get(f.path).baseSha256,contentBase64:Buffer.from(f.content,'utf8').toString('base64')};
 });
 return {schema:'mss.dev.proposal.v1',missionId:context.missionId,files};
}
export async function requestAiProposal(context,{apiKey,model='gpt-5-mini',fetchFn=fetch,endpoint='https://api.openai.com/v1/chat/completions'}={}){
 if(!apiKey)throw Error('OPENAI_API_KEY manquante : aucun appel réseau effectué');
 const instructions='Tu es un agent de correction TypeScript/JavaScript. Réponds UNIQUEMENT avec un objet JSON {"files":[{"path":"chemin existant","content":"contenu INTÉGRAL du fichier modifié"}]}. Ne crée pas de fichiers, ne réponds pas avec des diffs ni des commandes. Tu ne peux modifier que les chemins fournis. Limite les modifications au strict nécessaire. Si la correction est impossible, renvoie {"files":[]}.';
 const input={mission:context.description,files:context.files.map(f=>({path:f.path,sha256:f.baseSha256,content:f.content}))};
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),90_000);
 try {
  const response=await fetchFn(endpoint,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_object'}}),signal:controller.signal});
  if(!response.ok)throw Error(`Prestataire IA : HTTP ${response.status} (aucun détail sensible affiché)`);
  const data=await response.json();return proposalFromAi(context,data?.choices?.[0]?.message?.content);
 }finally{clearTimeout(timer);}
}
export function qualifyAgentProposal(root,proposal){
 const result=validateDevProposal(root,proposal);
 const changed=result.review.files.filter(f=>f.status==='PRET_A_REVOIR').length;
 return {result,changed,zip:result.decision!=='BLOQUE'&&changed?makeQaZip(result):null};
}
