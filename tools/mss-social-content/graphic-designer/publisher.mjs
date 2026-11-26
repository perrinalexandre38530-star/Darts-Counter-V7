// Local, opt-in publisher. No credentials or paid calls on startup.
import {readFileSync,mkdirSync,rmdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {root,read,save,selectMedia} from './media-gate.mjs';
import {jobs,prepare} from './planner.mjs';
const ACCOUNT='multisportsscor', LINK='https://play.google.com/store/apps/details?id=com.multisportsscoring.app';
const lock=join(root,'.publisher-lock');
const digest=b=>createHash('sha256').update(b).digest('hex');
const norm=a=>String(a).replace(/^@/,'').toLowerCase();
export const locked=()=>existsSync(lock);
export const history=()=>read('publisher-history.json',{});
const saveHistory=h=>save('publisher-history.json',h);
function weight(s){return [...s.replaceAll(LINK,'x'.repeat(23))].reduce((n,c)=>n+(c.codePointAt(0)<=0x7ff?1:2),0);}
function caption(e){
 const features=e.caption.split('\n')[0].split(' • '), cta=e.copy.cta;
 const title=e.copy.headline.join(' ');
 const make=parts=>[title,parts.join(' • '),cta+' : '+LINK].filter(Boolean).join('\n');
 let text=make(features.slice(0,2));
 for(let i=3;i<=features.length;i++){const t=make(features.slice(0,i));if(weight(t)>270)break;text=t;}
 if(weight(text)>270||!text.includes(LINK))throw Error('Légende trop longue : revoir les textes du média');return text;
}
function eligible(j){
 if(!j||j.status!=='PLANNED_NOT_SENT')throw Error('Créneau non actif');
 if(j.channel!=='x'||norm(j.account)!==ACCOUNT)throw Error('Adaptateur ou compte non autorisé');
 const [locale,campaign]=j.mediaId.split('/');if(locale!==j.locale)throw Error('Langue incohérente');
 const e=selectMedia(locale,campaign);if(e.sha256!==j.sha256)throw Error('Média modifié : replanifier');
 const text=caption(e), fingerprint=digest(JSON.stringify([j.id,j.channel,norm(j.account),j.scheduledAt,j.mediaId,e.sha256,text]));
 return {e,text,fingerprint};
}
export function preview(id){const j=jobs().find(x=>x.id===id);const p=eligible(j);return {id,mediaId:j.mediaId,sha256:j.sha256,text:p.text,fingerprint:p.fingerprint,scheduledAt:j.scheduledAt};}
export function authorize(id,fingerprint){if(locked())throw Error('Envoi en cours');const p=preview(id),h=history();if(p.fingerprint!==fingerprint)throw Error('Aperçu modifié : actualiser');if(h[id]&&h[id].status!=='AUTHORIZED'&&h[id].status!=='REVOKED')throw Error('Créneau déjà traité : aucune relance automatique');h[id]={...p,status:'AUTHORIZED',authorizedAt:new Date().toISOString()};saveHistory(h);return h[id];}
export function revoke(id){if(locked())throw Error('Envoi en cours');const h=history();if(h[id]?.status!=='AUTHORIZED')throw Error('Autorisation introuvable');h[id].status='REVOKED';saveHistory(h);}
export function status(){return {configured:!!process.env.MSS_X_USER_ACCESS_TOKEN,locked:locked(),history:history(),jobs:jobs().map(j=>{try{return {...j,preview:preview(j.id)}}catch(e){return {...j,blocker:e.message}}})};}
function xClient(token,fetcher=fetch){
 if(!token)throw Error('Jeton OAuth utilisateur X absent');
 return async(path,body)=>{let r;try{r=await fetcher('https://api.x.com'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(25000)});}catch{throw Error('Réponse X indisponible ou délai dépassé');}
 if(!r.ok)throw Error('API X HTTP '+r.status);let d;try{d=await r.json();}catch{throw Error('Réponse X illisible');}if(!d.data||d.errors?.length)throw Error('Réponse X non confirmée');return d.data;};
}
export async function runOne({token=process.env.MSS_X_USER_ACCESS_TOKEN,fetcher=fetch,now=()=>Date.now(),canSend=()=>true}={}){
 if(!token)return {status:'NOT_CONFIGURED'};if(!canSend())return {status:'PAUSED'};
 try{mkdirSync(lock);}catch(e){if(e.code==='EEXIST')return {status:'LOCKED'};throw e;}
 try{
  const h=history();if(Object.values(h).some(a=>['SENDING','UNKNOWN'].includes(a.status)))return {status:'RECONCILIATION_REQUIRED'};
  if(Object.values(h).some(a=>['PUBLISHED','FAILED'].includes(a.status)&&now()-Date.parse(a.at)<86400000))return {status:'COOLDOWN'};
  const j=jobs().filter(j=>j.status==='PLANNED_NOT_SENT'&&h[j.id]?.status==='AUTHORIZED'&&Date.parse(j.scheduledAt)<=now()).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt))[0];if(!j)return {status:'NO_DUE_JOB'};
  const a=h[j.id];let posting=false;
  const record=(status,extra={})=>{h[j.id]={...a,status,at:new Date(now()).toISOString(),...extra};saveHistory(h);return {id:j.id,...h[j.id]};};
  let p,bytes;try{p=eligible(j);if(p.fingerprint!==a.fingerprint)throw Error('Autorisation périmée');prepare(j.id);if(Object.values(h).some(x=>x.status==='PUBLISHED'&&(x.sha256===j.sha256||x.text===p.text)))throw Error('Visuel ou texte déjà publié sur X');bytes=readFileSync(p.e.absolute_path);if(digest(bytes)!==p.e.sha256||bytes.length>5_000_000)throw Error('Fichier invalide ou supérieur à 5 Mo');}catch(e){return record('BLOCKED',{reason:e.message});}
  if(!canSend())return {status:'PAUSED'};
  record('SENDING'); // Persist before any external call. Crash => no automatic retry.
  try{
   const api=xClient(token,fetcher);const me=await api('/2/users/me');if(norm(me.username)!==ACCOUNT||!/^\d+$/.test(me.id))throw Error('Compte X connecté différent du compte MSS officiel');
   if(!canSend())throw Error('Publication suspendue');
   const m=await api('/2/media/upload',{media:bytes.toString('base64'),media_category:'tweet_image'});if(!/^\d+$/.test(m.id)|| (m.processing_info&&m.processing_info.state!=='succeeded'))throw Error('Upload X non confirmé');
   const current=jobs().find(x=>x.id===j.id);if(eligible(current).fingerprint!==a.fingerprint||!canSend())throw Error('Créneau modifié ou suspendu avant publication');
   posting=true;const result=await api('/2/tweets',{text:p.text,media:{media_ids:[m.id]}});if(!/^\d+$/.test(result.id))throw Error('Identifiant publication absent');
   return record('PUBLISHED',{postId:result.id,url:'https://x.com/'+ACCOUNT+'/status/'+result.id});
  }catch(e){return record(posting?'UNKNOWN':'FAILED',{reason:e.message});}
 }finally{rmdirSync(lock);}
}
