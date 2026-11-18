// V23: revalidate exactly what the operator previewed before a model request.
// Read-only; no git, network or file modifications.
import {readFileSync, lstatSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, sep} from 'node:path';
const hash = b => createHash('sha256').update(b).digest('hex');
const MAX_BYTES=35000;
const sensitive = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
  /\bsk-(?:proj-|svcacct-|[a-z0-9]{20,})[a-z0-9_-]{12,}/i,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{25,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /(?:password|passwd|client_secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[\"'`][^\"'`\r\n]{8,}[\"'`]/i,
  /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._-]{20,}/i
];
export function inspectOutboundContext(root,context,{expectedDescription=null}={}) {
 const issues=[];
 if(!context||!Array.isArray(context.files)||!context.files.length||context.files.length>3) return {ok:false,issues:['Préparation absente ou invalide']};
 const base=realpathSync(root);
 if(expectedDescription!==null&&context.description!==expectedDescription)issues.push('Description de mission modifiée');
 if(sensitive.some(re=>re.test(context.description||'')))issues.push('Secret potentiel dans la description de mission');
 for(const file of context.files){
  const path=file?.path;
  if(typeof path!=='string'||! /^(src|tools)\/[A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx|mjs|json|css)$/i.test(path)||path.split('/').some(x=>x==='.'||x==='..')||path.includes('//')){issues.push('Chemin de fichier refusé');continue;}
  try{
   const full=resolve(base,...path.split('/'));
   if(!full.startsWith(base+sep))throw Error('Chemin hors projet');
   let current=base;
   for(const segment of path.split('/')){current=resolve(current,segment);if(lstatSync(current).isSymbolicLink())throw Error('Lien symbolique');}
   const st=lstatSync(full);
   if(!st.isFile()||st.size>MAX_BYTES)throw Error('Type ou taille invalide');
   const currentBytes=readFileSync(full);
   if(hash(currentBytes)!==file.baseSha256||currentBytes.toString('utf8')!==file.content)throw Error('Fichier modifié depuis la préparation');
   if(sensitive.some(re=>re.test(file.content)))throw Error('Secret potentiel détecté');
  }catch(e){issues.push(path+' : '+String(e.message).slice(0,100));}
 }
 return {ok:issues.length===0,issues};
}
export function assertOutboundContext(root,context,options={}){const result=inspectOutboundContext(root,context,options);if(!result.ok)throw Error('Envoi IA refusé : '+result.issues.join(' ; '));return result;}
