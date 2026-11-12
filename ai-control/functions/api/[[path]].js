// API minimale Cloudflare Pages Functions. Aucune commande de merge ou de deploiement.
import { AGENTS, validateMission, formatIssueBody, isMission, mapIssue, mapPr, mapRun } from '../../src/server/logic.js';
const HEADERS={'cache-control':'no-store','x-content-type-options':'nosniff'};
const json=(data,status=200)=>Response.json(data,{status,headers:HEADERS});
const bad=(error,status=400)=>json({error},status);
function getConfig(env){
 const repo=String(env.MSS_GITHUB_REPO||'').trim();
 const token=String(env.MSS_GITHUB_TOKEN||'').trim();
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)||!token)throw Object.assign(new Error('La connexion GitHub est à configurer par l’administrateur.'),{status:503});
 return {repo,token};
}
async function github(config,path,method='GET',body=undefined){
 const res=await fetch(`https://api.github.com/repos/${config.repo}${path}`,{
   method,headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${config.token}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'MSS-AI-CONTROL',...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(18000)
 });
 if(!res.ok){console.error('GitHub request failed',method,path,res.status);throw Object.assign(new Error(`GitHub a refusé l’opération (code ${res.status}).`),{status:res.status===401||res.status===403?502:res.status===404?404:502});}
 if(res.status===204)return {};
 return res.json();
}
async function ensureLabel(config,name,color,description){
 const labelPath=`/labels/${encodeURIComponent(name)}`;
 const res=await fetch(`https://api.github.com/repos/${config.repo}${labelPath}`,{headers:{'Authorization':`Bearer ${config.token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'MSS-AI-CONTROL'},signal:AbortSignal.timeout(15000)});
 if(res.ok)return;
 if(res.status!==404)throw Object.assign(new Error(`Vérification de l'étiquette refusée (${res.status}).`),{status:502});
 try{await github(config,'/labels','POST',{name,color,description});}catch(e){
  // Une autre requête peut avoir créé l'étiquette pendant l'opération.
  const retried=await fetch(`https://api.github.com/repos/${config.repo}${labelPath}`,{headers:{'Authorization':`Bearer ${config.token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'MSS-AI-CONTROL'},signal:AbortSignal.timeout(15000)});
  if(!retried.ok)throw e;
 }
}
async function bootstrap(config){
 const issues=await github(config,'/issues?state=open&per_page=100');
 const [pulls,runs]=await Promise.allSettled([github(config,'/pulls?state=open&per_page=100'),github(config,'/actions/runs?per_page=30')]);
 return {
  repository:config.repo,
  issues:issues.filter(isMission).map(mapIssue).sort((a,b)=>b.number-a.number),
  prs:pulls.status==='fulfilled'?pulls.value.map(mapPr).sort((a,b)=>b.number-a.number):[],
  runs:runs.status==='fulfilled'?(runs.value.workflow_runs||[]).map(mapRun):[],
  limitations:[...(pulls.status==='rejected'?['La liste des PR n’a pas pu être chargée.']:[]),...(runs.status==='rejected'?['Les résultats GitHub Actions ne sont pas accessibles avec le jeton fourni.']:[])],
  engineActive:false,
  certifiedAgents:0
 };
}
function checkOrigin(request){const expected=new URL(request.url).origin;return request.headers.get('origin')===expected && request.headers.get('content-type')?.startsWith('application/json');}
async function parseBody(request){if(Number(request.headers.get('content-length')||0)>12000)throw Object.assign(new Error('Formulaire trop long.'),{status:413});const raw=await request.text();if(raw.length>12000)throw Object.assign(new Error('Formulaire trop long.'),{status:413});try{return JSON.parse(raw||'{}');}catch{throw Object.assign(new Error('Contenu JSON incorrect.'),{status:400});}}
export async function onRequest(context){
 const {request,env}=context;
 if(!context.data?.identity?.email)return bad('Authentification obligatoire.',401);
 const path=new URL(request.url).pathname.replace(/^\/api\/?/,'').replace(/\/$/,'');
 const method=request.method.toUpperCase();
 if(!['GET','POST'].includes(method))return bad('Méthode non autorisée.',405);
 if(method==='POST'&&!checkOrigin(request))return bad('Origine ou format de requête non autorisé.',403);
 try{
  const config=getConfig(env);
  if(method==='GET'&&path==='bootstrap')return json(await bootstrap(config));
  if(method==='POST'&&path==='missions'){
   const m=validateMission(await parseBody(request));
   await ensureLabel(config,'mss:mission','207b74','Mission du centre de commande MSS');
   const issue=await github(config,'/issues','POST',{title:`[AGENT] ${m.title}`,body:formatIssueBody(m),labels:['mss:mission']});
   return json({number:issue.number,url:issue.html_url,status:'À QUALIFIER'},201);
  }
  // Read-only QA evidence link. Fetch only when the owner opens a specific mission.
  // Never return raw CI logs or arbitrary public comments as "QA evidence".
  const qaReport=path.match(/^missions\/(\d+)\/qa-report$/);
  if(method==='GET'&&qaReport){
   const number=Number(qaReport[1]);
   if(!Number.isSafeInteger(number)||number<1)return bad('Numéro de mission invalide.');
   const issue=await github(config,`/issues/${number}`);
   if(!isMission(issue))return bad('Mission introuvable.',404);
   const comments=await github(config,`/issues/${number}/comments?per_page=100`);
   // A public Issue comment is untrusted. The marker alone does not prove a QA run.
   // GITHUB_TOKEN comments generated by our workflow have the GitHub Actions bot identity.
   const verifiedComment=(c)=>{
    const body=String(c?.body||'');
    if(c?.user?.login!=='github-actions[bot]' || c?.user?.type!=='Bot'
      || !body.startsWith('<!-- MSS_QA_PILOT_V1 -->\n')
      || !body.includes('**Mission :** #'+number+' — '))return false;
    try{
     const u=new URL(c.html_url);
     return u.protocol==='https:' && u.hostname==='github.com'
       && u.pathname==='/'+config.repo+'/issues/'+number
       && /^#issuecomment-\d+$/.test(u.hash) && !u.search;
    }catch{return false;}
   };
   const matched=comments.filter(verifiedComment);
   const latest=matched.at(-1);
   const verified=latest?.html_url||null;
   return json({number,reportAvailable:Boolean(verified),reportUrl:verified,
     status:matched.length?(issue.labels||[]).some(x=>(typeof x==='string'?x:x?.name)==='mss:review')?'REVUE HUMAINE':'RAPPORT DISPONIBLE':'AUCUN RAPPORT',
     note:verified?'Rapport QA disponible sur GitHub. Il nécessite une revue humaine.':'Aucun rapport QA vérifié pour cette mission.'});
  }
  const decision=path.match(/^missions\/(\d+)\/(approve|pause)$/);
  if(method==='POST'&&decision){
   const number=Number(decision[1]);if(!Number.isSafeInteger(number)||number<1)return bad('Numéro de mission invalide.');
   await parseBody(request);
   const issue=await github(config,`/issues/${number}`);
   if(!isMission(issue))return bad('La mission doit être ouverte et appartenir à MSS AI CONTROL.',403);
   const approve=decision[2]==='approve';
   const labels=(issue.labels||[]).map(x=>String(typeof x==='string'?x:x?.name||'').toLowerCase());
   if(approve && labels.includes('mss:review'))return bad('Mission en revue humaine : terminer cette revue avant une nouvelle approbation.',409);
   const label=approve?'mss:approved':'mss:blocked';
   const opposite=approve?'mss:blocked':'mss:approved';
   // Remove the opposite state BEFORE adding the new label. In particular, a
   // QA workflow triggered by mss:approved must not still see mss:blocked.
   if(labels.includes(opposite))await github(config,`/issues/${number}/labels/${encodeURIComponent(opposite)}`,'DELETE');
   if(!labels.includes(label)){
    await ensureLabel(config,label,approve?'168b75':'b34f68',approve?'Mission approuvée : le pilote QA peut se déclencher si activé':'Mission suspendue');
    await github(config,`/issues/${number}/labels`,'POST',{labels:[label]});
   }
   return json({number,status:approve?'APPROUVÉE':'BLOQUÉE',message:approve?'Mission approuvée : un robot autorisé peut se déclencher si son workflow est actif.':'Mission suspendue.'});
  }
  return bad('Cette action n’existe pas.',404);
 }catch(e){console.error('MSS AI CONTROL API:',e?.name||'error');const message=e?.status===503?e.message:e?.status===400||e?.status===413?e.message:e?.message?.startsWith('GitHub a refusé')?e.message:'Une erreur est survenue. Vérifie la connexion administrateur.';return bad(message,Number(e?.status)||500);}
}
