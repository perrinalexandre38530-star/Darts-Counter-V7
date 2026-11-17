// V22 — explicit, non-destructive recovery of interrupted local missions.
import {readFileSync,existsSync,lstatSync,writeFileSync,renameSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {bridgePaths,getIncoming} from './mss-dev-bridge-v20.mjs';
const ID=/^[A-Za-z0-9_-]{1,64}$/;
const SCHEMA='mss.dev.queue.v21';
const statusSet=new Set(['NEW','PREPARED','RUNNING','FINISHED','FAILED','INTERRUPTED']);
function dataPath(root,id){if(!ID.test(id||''))throw Error('Identifiant invalide');return join(bridgePaths(root).base,'STATE_V21',id+'.json');}
function digest(m){return createHash('sha256').update(JSON.stringify([m.schema,m.requestId,m.description])).digest('hex');}
function load(root,id){const file=dataPath(root,id);if(!existsSync(file))throw Error('Mission jamais préparée');const st=lstatSync(file);if(!st.isFile()||st.isSymbolicLink()||st.size>4096)throw Error('État invalide');const value=JSON.parse(readFileSync(file,'utf8'));if(value.schema!==SCHEMA||value.requestId!==id||!statusSet.has(value.status)||!/^[0-9a-f]{64}$/.test(value.digest))throw Error('Format état invalide');return {file,value};}
export function recoverInterruptedMission(root,id,{confirm=false,active=false,now=Date.now(),minAgeMs=60_000}={}){
 if(confirm!==true)throw Error('Confirmation humaine obligatoire');
 if(active)throw Error('Une mission IA est encore en cours');
 const {file,value}=load(root,id),m=getIncoming(root,id);
 if(value.digest!==digest(m))throw Error('Mission modifiée depuis son lancement');
 if(value.status!=='RUNNING')throw Error('Seules les missions RUNNING peuvent être débloquées');
 const age=now-Date.parse(value.updatedAt||'');
 if(!Number.isFinite(age)||age<minAgeMs)throw Error('Mission trop récente pour être déclarée interrompue');
 const next={...value,status:'INTERRUPTED',updatedAt:new Date(now).toISOString(),decision:'INTERRUPTED_REVIEW_REQUIRED'};
 const temp=file+'.'+process.pid+'.recovery.tmp';
 const fd=openSync(temp,'wx',0o600);
 try{writeFileSync(fd,JSON.stringify(next,null,2));}finally{closeSync(fd);}
 try{renameSync(temp,file);}catch(e){try{unlinkSync(temp)}catch{}throw e;}
 return {requestId:id,status:'INTERRUPTED',message:'Mission débloquée pour une nouvelle préparation manuelle; aucun appel IA exécuté'};
}
