// Local editorial planning only. No social API or network calls.
import {randomUUID} from 'node:crypto';
import {read,save,entries,selectMedia} from './media-gate.mjs';
export const channels=['x','instagram','facebook','threads','linkedin','pinterest'];
const accountKey=a=>String(a).replace(/^@/,'').toLowerCase();
export const jobs=()=>read('publication-plan.json',[]);
export function plan({locale,channel,account,scheduledAt}){
 if(!channels.includes(channel)||!/^[\w@.\-]{1,80}$/.test(account)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(scheduledAt)||!Number.isFinite(Date.parse(scheduledAt))||Date.parse(scheduledAt)<Date.now())throw Error('Canal, compte ou date UTC invalide');
 if(channel==='x'){if(accountKey(account)!=='multisportsscor')throw Error('Compte X officiel requis : @multisportsscor');account='@multisportsscor';}
 const old=jobs(), candidate=entries().filter(e=>e.locale===locale).sort((a,b)=>a.campaign.localeCompare(b.campaign)).map(e=>{try{return selectMedia(e.locale,e.campaign)}catch{return null}}).filter(Boolean).filter(e=>!old.some(j=>j.channel===channel&&accountKey(j.account)===accountKey(account)&&j.sha256===e.sha256&&j.status!=='CANCELLED'));
 if(!candidate.length)throw Error('Aucun visuel inédit et validé pour cette langue et ce compte');
 if(old.some(j=>j.channel===channel&&accountKey(j.account)===accountKey(account)&&j.status!=='CANCELLED'&&Math.abs(Date.parse(j.scheduledAt)-Date.parse(scheduledAt))<86400000))throw Error('Espacer les publications du même compte de 24 h minimum');
 const e=candidate[0],job={id:randomUUID(),mediaId:e.id,sha256:e.sha256,locale,channel,account,scheduledAt,status:'PLANNED_NOT_SENT',createdAt:new Date().toISOString()};save('publication-plan.json',[...old,job]);return job;
}
export function cancel(id){const a=jobs(),j=a.find(x=>x.id===id);if(!j||j.status!=='PLANNED_NOT_SENT')throw Error('Plan introuvable');j.status='CANCELLED';save('publication-plan.json',a);}
export function prepare(id){const j=jobs().find(x=>x.id===id);if(!j||j.status!=='PLANNED_NOT_SENT'||Date.parse(j.scheduledAt)>Date.now())throw Error('Plan annulé, absent ou pas encore dû');const [l,c]=j.mediaId.split('/'),e=selectMedia(l,c);if(e.sha256!==j.sha256)throw Error('Visuel changé : replanifier');return {...j,media:e,publication:'ADAPTER_NOT_CONNECTED'};}
