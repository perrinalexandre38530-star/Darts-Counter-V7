#!/usr/bin/env node
// MSS AI CONTROL V10 — local-only, allowlisted QA mission runner.
import { createServer } from 'node:http';
import { planQa } from './mss-qa-chief-v11.mjs';
import { spawn, execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reports = resolve(root, '..', 'MSS_AI_CONTROL_REPORTS', 'missions-v11');
mkdirSync(reports, { recursive: true });
const HOST='127.0.0.1', PORT=4180;
const secret=randomBytes(24).toString('hex');
const definitions = Object.freeze({
 'sync-main': {title:'Contrôle MAIN réel (PC / GitHub)',files:['tools/mss-main-readonly-v10.mjs']},
 'types': {title:'Contrôle TypeScript du projet',commands:[{label:'npm run typecheck',cmd:process.platform==='win32'?'cmd.exe':'npm',args:process.platform==='win32'?['/d','/s','/c','npm run typecheck']:['run','typecheck']}]},
 'history': {title:'Intégrité de l’historique',files:['tools/test-history-snapshot-integrity-contract.mjs','tools/test-history-integrity-regression.ts']},
 'backup': {title:'Fiabilité des sauvegardes',files:['tools/test-backup-reliability-v17.mjs','tools/test-backup-checkpoint-compaction-v241.mjs']},
 'stats': {title:'Régressions statistiques X01',files:['tools/test-stats-x01-level-v127.mjs','tools/test-stats-x01-lifetime-current-v129.mjs']},
 'navigation': {title:'Navigation de l’application',files:['tools/test-navigation-challenge-v9.mjs','tools/test-profiles-x01-navigation-v74.mjs']},
 'qa-complet': {title:'Audit QA transversal MSS',files:['tools/mss-main-readonly-v10.mjs','tools/test-history-snapshot-integrity-contract.mjs','tools/test-backup-reliability-v17.mjs','tools/test-stats-x01-level-v127.mjs','tools/test-navigation-challenge-v9.mjs']},
});
let active=null, last=null;
try {const prev=JSON.parse(readFileSync(join(reports,'latest.json'),'utf8'));if(prev?.id&&prev?.status!=='RUNNING') last=prev;}catch{}
function listHistory(){return readdirSync(reports).filter(n=>n.endsWith('.json')&&n!=='latest.json').sort().reverse().slice(0,20).map(n=>{try {let o=JSON.parse(readFileSync(join(reports,n),'utf8'));return {id:o.id,title:o.title,status:o.status,start:o.start,end:o.end};}catch{return null}}).filter(Boolean)}
function publicReport(out){
 if(!out || !out.id) return null;
 return {
  schema:'mss.qa.report.v1', origin:'local-pc', verifiedByPortal:false,
  id:out.id, mission:out.mission, plan:out.plan||[out.mission], requestId:out.requestId||null, title:out.title, status:out.status,
  start:out.start, end:out.end, results:(out.results||[]).map(r=>({test:r.test,status:r.status,exitCode:r.exitCode??null,reason:r.reason??null})),
  note:'Rapport local non certifié par le portail. Aucun transfert automatique.'
 };
}

function validateImportedMission(data){
 if(!data || typeof data!=='object' || Array.isArray(data) || data.schema!=='mss.qa.mission.v1') return null;
 if(typeof data.mission!=='string' || !Object.hasOwn(definitions,data.mission)) return null;
 if(typeof data.requestId!=='string' || !/^[A-Za-z0-9_-]{1,64}$/.test(data.requestId)) return null;
 // Ignore all extra fields. No shell commands, file paths, URL or code may be executed from imported data.
 return {mission:data.mission,requestId:data.requestId};
}
function getHistoryRecord(id){
 if(!/^qa-[a-zA-Z0-9_-]{1,120}$/.test(id)) return null;
 const path=join(reports,id+'.json');
 try {const report=JSON.parse(readFileSync(path,'utf8'));return report.id===id?report:null;}catch{return null;}
}
function snapshot(){return {active,last,history:listHistory(),missions:Object.entries(definitions).map(([id,d])=>({id,title:d.title,tests:(d.files?.length||0)+(d.commands?.length||0)}))};}
function respond(res, status, body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
function save(out){const stamp=out.id.replace(/[^0-9A-Za-z_-]/g,'');writeFileSync(join(reports,stamp+'.json'),JSON.stringify(out,null,2));writeFileSync(join(reports,'latest.json'),JSON.stringify(out,null,2));}
function addLog(out,text){out.log=(out.log+text).slice(-85000); if(active?.id===out.id)active.log=out.log;}
async function execute(id, requestId=null, plan=null){const def=definitions[id];if(!def)throw new Error('Mission inconnue');if(active)throw new Error('Une mission est déjà en cours');
 const out={plan:plan||[id],id:'qa-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomBytes(3).toString('hex'),mission:id,requestId,title:def.title,status:'RUNNING',start:new Date().toISOString(),end:null,results:[],log:''};
 active=out;
 (async()=>{try{for (const job of (plan||[id]).flatMap(mid=>{const d=definitions[mid];return [...(d.files||[]).map(rel=>({label:rel,cmd:process.execPath,args:rel.endsWith('.ts')?['--experimental-strip-types',resolve(root,rel)]:[resolve(root,rel)],file:rel})),...(d.commands||[])];})){const rel=job.label; if(job.file&&!existsSync(resolve(root,job.file))){out.results.push({test:rel,status:'ERROR',reason:'Script absent'});addLog(out,'\n[ERREUR] Script absent : '+rel+'\n');continue;}
 addLog(out,'\n=== '+rel+' ===\n');const result=await new Promise(ok=>{
 const child=spawn(job.cmd,job.args,{cwd:root,env:{...process.env,CI:'1',NO_COLOR:'1'},shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});let finished=false,exceeded=false,timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill();},180000);
 function receive(b){let s=b.toString('utf8');if(s.length>15000)s=s.slice(0,15000);addLog(out,s);if(out.log.length>84000){exceeded=true;child.kill();}}
 child.stdout.on('data',receive);child.stderr.on('data',receive);
 child.on('error',e=>{if(!finished){finished=true;clearTimeout(timer);ok({test:rel,status:'ERROR',reason:e.message});}});
 child.on('close',(code,signal)=>{if(!finished){finished=true;clearTimeout(timer);ok({test:rel,status:code===0&&!exceeded&&!timedOut?'PASS':'FAIL',exitCode:code,signal:signal||null,reason:timedOut?'Délai de 180 secondes dépassé':undefined});}});
 });out.results.push(result);addLog(out,'\n=> '+result.status+'\n');}
 out.status=out.results.every(x=>x.status==='PASS')?'PASS':'FAIL';}catch(e){out.status='ERROR';addLog(out,'\nErreur : '+e.message);}finally{out.end=new Date().toISOString();last={...out};active=null;save(out);}})();return {id:out.id,status:out.status};}
const html=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MSS AI CONTROL — Missions QA V11</title><style>:root{color-scheme:dark}body{font:15px system-ui;margin:0;background:#081426;color:#eaf3ff}main{max-width:1050px;margin:25px auto;padding:0 18px}header{display:flex;justify-content:space-between;align-items:center;gap:12px}h1{font-size:26px;margin:0}.sub{color:#a8bdd4}.panel{background:#12243d;border:1px solid #2b4765;border-radius:14px;padding:20px;margin:18px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.mission{background:#192e49;border:1px solid #375979;border-radius:12px;padding:16px}button{background:#39d5bc;color:#05221f;border:0;border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}.small{font-size:13px;color:#b4c6da}.pass{color:#66e0a4}.fail{color:#ff9c9c}.run{color:#f7d083}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:430px;overflow:auto;background:#06101e;padding:14px;border-radius:8px}a{color:#8fdbff}code{color:#d9e9ff}</style><main><header><div><h1>🤖 MSS AI CONTROL — Missions QA</h1><div class="sub">V11 · Chef QA · Audits réels · Rapports hors du dépôt · Mode protégé</div></div><nav><a href="http://127.0.0.1:4181/">Mission développeur V12</a> · <a href="http://127.0.0.1:4179">Console ZIP V6</a></nav></header><section class="panel"><h2>Donner une mission</h2><p class="sub">Chaque mission exécute des contrôles du vrai projet (lecture seule). La vérification TypeScript peut durer plusieurs minutes. Aucun code corrigé, aucun push ni déploiement automatique.</p><div id="missions" class="grid"></div></section><section class="panel"><h2>Chef QA — décrire le problème</h2><p class="sub">Décris le dysfonctionnement. Le Chef QA propose des tests préautorisés ; il n’est pas un agent de correction IA.</p><textarea id="description" maxlength="2000" style="box-sizing:border-box;width:100%;min-height:86px;background:#06101e;color:#eaf3ff;border:1px solid #375979;border-radius:8px;padding:12px" placeholder="Ex. Les statistiques X01 et les sauvegardes NAS ne correspondent plus..."></textarea><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px"><button id="planBtn">Préparer un plan QA</button><button id="planRun" disabled>Lancer les contrôles proposés</button></div><p class="small" id="planStatus">Aucun plan préparé. L'analyse reste locale.</p></section><section class="panel"><h2>Importer une mission QA JSON</h2><p class="sub">Sélectionne un fichier JSON préparé pour MSS AI CONTROL. Seuls les 7 types de contrôle prédéfinis sont acceptés. Vérifie son identité avant le lancement. Aucun code ni commande provenant du fichier n'est exécuté.</p><input type="file" id="missionFile" accept=".json,application/json"><button id="previewImport">Vérifier la mission</button><p id="importState" class="small">Aucune mission importée.</p><button id="runImport" disabled>Lancer cette mission autorisée</button><p class="small">Format : <code>{"schema":"mss.qa.mission.v1","requestId":"MSS-001","mission":"sync-main"}</code></p></section><section class="panel"><h2>Suivi d'exécution</h2><p id="state">Aucune mission lancée.</p><div id="tests"></div><pre id="log">Les résultats apparaîtront ici.</pre><h3>Historique des missions</h3><div id="history" class="small"></div><p class="small">Export anonymisé des résultats, sans journal brut ni chemin du PC. Aucune donnée envoyée en ligne.</p><p class="small">Rapport JSON enregistré dans <code>MSS_AI_CONTROL_REPORTS/missions-v10</code>, à côté du projet.</p></section><section class="panel"><h2>Portail en ligne</h2><p>Le portail d'administration Cloudflare est distinct de cette console locale. Les missions lancées ici ne remontent pas encore dans son interface.</p><a href="https://mss-ai-control-admin.pages.dev/" target="_blank" rel="noopener noreferrer">Ouvrir le portail MSS AI CONTROL</a></section></main><script nonce="__NONCE__">const csrf='__TOKEN__';const el=x=>document.getElementById(x);let running=false;async function refresh(){try{const r=await fetch('/api/state');const s=await r.json();el('missions').replaceChildren();for(const m of s.missions){const d=document.createElement('div');d.className='mission';const h=document.createElement('h3');h.textContent=m.title;d.append(h);const p=document.createElement('p');p.className='small';p.textContent=m.tests+' contrôles automatisés';d.append(p);const b=document.createElement('button');b.textContent='Lancer la mission';b.disabled=!!s.active;b.onclick=async()=>{b.disabled=true;const r=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':csrf},body:JSON.stringify({mission:m.id})});const o=await r.json();if(!r.ok)alert(o.error);await refresh()};d.append(b);el('missions').append(d)}el('history').replaceChildren();for(const h of (s.history||[])){const line=document.createElement('div');line.style.margin='8px 0';const label=document.createElement('span');label.textContent=h.status+' · '+h.start+' · '+h.title+' ';const a=document.createElement('a');a.href='/api/report/'+encodeURIComponent(h.id);a.textContent='Télécharger JSON';line.append(label,a);el('history').append(line)}if(!(s.history||[]).length)el('history').textContent='Aucun rapport précédent';const job=s.active||s.last;if(job){el('state').textContent=job.title+' — '+job.status+' — '+(job.end||'en cours');el('state').className=job.status==='PASS'?'pass':job.status==='RUNNING'?'run':'fail';el('log').textContent=job.log||'Démarrage...';el('tests').textContent=(job.results||[]).map(t=>t.status+' · '+t.test).join(' | ')}}catch(e){el('state').textContent='Serveur indisponible : '+e.message}}
let selectedPlan=null;
el('planBtn').onclick=async()=>{selectedPlan=null;el('planRun').disabled=true;try{const r=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':csrf},body:JSON.stringify({description:el('description').value})});const o=await r.json();if(!r.ok)throw Error(o.error);selectedPlan=o.plan.missions;el('planStatus').textContent='Plan : '+selectedPlan.join(' + ')+' | '+o.plan.reasons.join(' ; ')+' — Validation requise';el('planRun').disabled=false;}catch(e){el('planStatus').textContent='Erreur : '+e.message;}};
el('planRun').onclick=async()=>{if(!selectedPlan||!confirm('Lancer '+selectedPlan.length+' catégorie(s) de contrôles sur ce PC ?'))return;const r=await fetch('/api/run-plan',{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':csrf},body:JSON.stringify({missions:selectedPlan})});const o=await r.json();if(!r.ok)alert(o.error);selectedPlan=null;el('planRun').disabled=true;await refresh();};
let vetted=null;
el('previewImport').onclick=async()=>{vetted=null;el('runImport').disabled=true;try{const f=el('missionFile').files[0];if(!f||f.size>16000)throw Error('Choisir un JSON de 16 Ko maximum');const o=JSON.parse(await f.text());const s=await(await fetch('/api/state')).json();const d=s.missions.find(x=>x.id===o.mission);if(o.schema!=='mss.qa.mission.v1'||typeof o.requestId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(o.requestId)||!d)throw Error('Format ou type de mission non autorisé');vetted={schema:o.schema,requestId:o.requestId,mission:o.mission};el('importState').textContent='Prêt : '+d.title+' | Référence : '+o.requestId+' | Exécution sur PC uniquement';el('runImport').disabled=!!s.active;}catch(e){el('importState').textContent='Refus : '+e.message;}};
el('runImport').onclick=async()=>{if(!vetted)return;const s=await(await fetch('/api/state')).json();if(s.active){alert('Mission déjà en cours');return;}if(!confirm('Lancer sur ce PC le contrôle QA '+vetted.mission+' ?'))return;const r=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':csrf},body:JSON.stringify(vetted)});const o=await r.json();if(!r.ok)alert(o.error||'Erreur');vetted=null;el('runImport').disabled=true;await refresh();};
refresh();setInterval(refresh,1800)</script></html>`;
const server=createServer(async(req,res)=>{try{
 if(req.headers.host!==HOST+':'+PORT){respond(res,403,{error:'Hôte non autorisé'});return;}
 if(req.method==='GET'&&req.url==='/'){const nonce=randomBytes(16).toString('base64');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`});res.end(html.replace('__NONCE__',nonce).replace('__TOKEN__',secret));return;}
 if(req.method==='GET'&&req.url==='/api/state'){respond(res,200,snapshot());return;}
 if(req.method==='GET'&&req.url.startsWith('/api/report/')){
  const id=req.url.slice('/api/report/'.length);
  const record=getHistoryRecord(id);
  if(!record){respond(res,404,{error:'Rapport absent'});return;}
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${id}.json"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(publicReport(record),null,2));return;
 }


 if(req.method==='POST'&&(req.url==='/api/plan'||req.url==='/api/run-plan')){
  if(req.headers['x-mss-token']!==secret){respond(res,403,{error:'Session non autorisée'});return;}
  if(req.headers.origin&&req.headers.origin!==`http://${HOST}:${PORT}`){respond(res,403,{error:'Origine non autorisée'});return;}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>6000){respond(res,413,{error:'Requête trop volumineuse'});return;}}
  let obj;try{obj=JSON.parse(body)}catch{respond(res,400,{error:'JSON invalide'});return;}
  if(req.url==='/api/plan'){
   if(typeof obj.description!=='string'||obj.description.length>2000){respond(res,400,{error:'Description invalide'});return;}
   respond(res,200,{plan:planQa({description:obj.description})});return;
  }
  if(active){respond(res,409,{error:'Mission déjà en cours'});return;}
  if(!Array.isArray(obj.missions)||obj.missions.length<1||obj.missions.length>6||new Set(obj.missions).size!==obj.missions.length||obj.missions.some(x=>typeof x!=='string'||!Object.hasOwn(definitions,x))){respond(res,400,{error:'Plan non autorisé'});return;}
  respond(res,202,await execute(obj.missions[0],null,obj.missions));return;
 }
 if(req.method==='POST'&&req.url==='/api/import'){
  if(req.headers['x-mss-token']!==secret){respond(res,403,{error:'Session non autorisée'});return;}
  if(req.headers.origin&&req.headers.origin!==`http://${HOST}:${PORT}`){respond(res,403,{error:'Origine non autorisée'});return;}
  if(active){respond(res,409,{error:'Mission déjà en cours'});return;}
  let b='';for await(const chunk of req){b+=chunk;if(b.length>16000){respond(res,413,{error:'JSON trop volumineux'});return;}}
  let obj;try{obj=validateImportedMission(JSON.parse(b));}catch{}
  if(!obj){respond(res,400,{error:'Mission JSON non autorisée'});return;}
  respond(res,202,await execute(obj.mission,obj.requestId));return;
 }
 if(req.method==='POST'&&req.url==='/api/run'){if(req.headers['x-mss-token']!==secret){respond(res,403,{error:'Session non autorisée'});return;}if(req.headers.origin&&req.headers.origin!==`http://${HOST}:${PORT}`){respond(res,403,{error:'Origine non autorisée'});return;}let b='';for await(const chunk of req){b+=chunk;if(b.length>1000){respond(res,413,{error:'Requête trop grande'});return;}}let mission;try{mission=JSON.parse(b).mission}catch{respond(res,400,{error:'Requête invalide'});return;}if(!Object.hasOwn(definitions,mission)){respond(res,400,{error:'Mission inconnue'});return;}if(active){respond(res,409,{error:'Mission déjà en cours'});return;}respond(res,202,await execute(mission));return;}
 respond(res,404,{error:'Non trouvé'});
 }catch(e){respond(res,500,{error:e.message});}});
server.listen(PORT,HOST,()=>{console.log(`MSS AI CONTROL Missions V11 : http://${HOST}:${PORT}`);console.log('Prêt : choisir puis lancer une mission QA depuis le navigateur. Ctrl+C pour arrêter.');if(process.platform==='win32'&&!process.env.MSS_NO_BROWSER){execFile('cmd.exe',['/c','start','','http://127.0.0.1:4180/'],{windowsHide:true},()=>{});}});
