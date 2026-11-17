// MSS AI CONTROL V20 — boîtes d'échange locales, sans accès direct au portail distant.
import {mkdirSync,readdirSync,readFileSync,lstatSync,writeFileSync,renameSync,openSync,closeSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {validateImportedDevMission,publicDevReport} from './mss-dev-exchange-v19.mjs';
const MAX_ITEMS=100, MAX_BYTES=6000, NAME=/^[A-Za-z0-9_-]{1,64}\.json$/;
export function bridgePaths(root){
 const base=resolve(root,'..','MSS_AI_CONTROL_REPORTS','PORTAL_BRIDGE_V20');
 const inbox=join(base,'INBOX'),outbox=join(base,'OUTBOX');
 mkdirSync(inbox,{recursive:true});mkdirSync(outbox,{recursive:true});
 return {base,inbox,outbox};
}
export function listIncoming(root){
 const {inbox}=bridgePaths(root);const accepted=[],rejected=[];
 const names=readdirSync(inbox).filter(n=>n.endsWith('.json')).sort().slice(0,MAX_ITEMS+1);
 if(names.length>MAX_ITEMS)rejected.push({file:'*',reason:'Limite de 100 missions : liste tronquée'});
 for(const file of names.slice(0,MAX_ITEMS)){
  if(!NAME.test(file)){rejected.push({file,reason:'Nom non autorisé'});continue;}
  try{
   const path=join(inbox,file),st=lstatSync(path);
   if(!st.isFile()||st.isSymbolicLink()||st.size>MAX_BYTES)throw Error('Fichier invalide ou trop volumineux');
   const mission=validateImportedDevMission(JSON.parse(readFileSync(path,'utf8')));
   if(file!==mission.requestId+'.json')throw Error('Nom différent de requestId');
   accepted.push({requestId:mission.requestId,description:mission.description});
  }catch(e){rejected.push({file,reason:String(e.message).slice(0,120)});}
 }
 return {accepted,rejected,connectedToPortal:false};
}
export function getIncoming(root,id){
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(id))throw Error('Identifiant refusé');
 const {inbox}=bridgePaths(root),path=join(inbox,id+'.json');const st=lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.size>MAX_BYTES)throw Error('Mission refusée');
 return validateImportedDevMission(JSON.parse(readFileSync(path,'utf8')));
}
export function publishPublicReport(root,report){
 if(!report||report.schema!=='mss.dev.report.v1')throw Error('Rapport public V19 requis');
 const id=report.requestId;
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(id))return null;
 const {outbox}=bridgePaths(root);const target=join(outbox,id+'-'+Date.now()+'.json');
 // Écriture exclusive : on ne remplace aucun rapport existant.
 const fd=openSync(target,'wx',0o600);
 try{writeFileSync(fd,JSON.stringify({...report,verifiedByPortal:false,transport:'manual-outbox-v20'},null,2));}
 finally{closeSync(fd);}
 return target;
}
