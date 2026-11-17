// MSS AI CONTROL V19 — format d'échange local, sans transport vers Cloudflare.
import {createHash} from 'node:crypto';
const SCHEMA='mss.dev.mission.v1';
export function validateImportedDevMission(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.schema!==SCHEMA)throw Error('Format mission développement invalide');
 const {requestId,description}=input;
 if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(requestId))throw Error('Identifiant mission invalide');
 if(typeof description!=='string'||description.trim().length<15||description.length>4000)throw Error('Description requise : 15 à 4 000 caractères');
 // Pas de champs supplémentaires : notamment commandes, URL, fichiers, clés, code.
 if(Object.keys(input).some(k=>!['schema','requestId','description'].includes(k)))throw Error('Champs supplémentaires interdits');
 return Object.freeze({schema:SCHEMA,requestId,description:description.trim()});
}
export function publicDevReport({mission,decision,changed,gate,regression,zipAvailable,createdAt}){
 const tests=(regression?.tests||[]).map(t=>({id:String(t.id||'inconnu').slice(0,80),status:['PASS','FAIL','SKIP','NOT_RUN','ERROR'].includes(t.status)?t.status:'UNKNOWN'}));
 const pass=tests.filter(t=>t.status==='PASS').length;
 const fail=tests.filter(t=>t.status==='FAIL'||t.status==='ERROR').length;
 const notRun=tests.length-pass-fail;
 const report={schema:'mss.dev.report.v1',origin:'local-pc',verifiedByPortal:false,requestId:mission.requestId||null,missionId:mission.missionId,descriptionDigest:createHash('sha256').update(mission.description).digest('hex'),createdAt,decision,changed,tests,summary:{passed:pass,failed:fail,notRun},pilot:gate?.pilot?.verdict||'UNKNOWN',auditor:gate?.auditor?.verdict||'UNKNOWN',zipForHumanReview:!!zipAvailable,installed:false,pushed:false,note:'Rapport local non certifié par le portail. Ne contient ni code, ni secret, ni chemin absolu. Aucun transfert automatique.'};
 return report;
}
