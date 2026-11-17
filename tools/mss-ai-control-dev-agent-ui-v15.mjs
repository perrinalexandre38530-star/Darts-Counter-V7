#!/usr/bin/env node
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import {prepareAgentContext,requestAiProposal} from './mss-dev-agent-core-v15.mjs';
import {qualifyInStaging} from './mss-dev-regression-v16.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'), host='127.0.0.1',port=4184, token=randomBytes(32).toString('hex');
let pending=null, busy=false;
const page=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MSS AI CONTROL — Robot développeur V17</title><style>:root{color-scheme:dark}body{margin:0;background:#091728;color:#e9f4ff;font:15px system-ui}main{max-width:830px;margin:35px auto;padding:0 16px}.card{background:#162a43;border:1px solid #385575;padding:24px;border-radius:14px;margin:15px 0}h1{font-size:26px}textarea{box-sizing:border-box;width:100%;height:125px;background:#091728;color:white;border:1px solid #627b95;border-radius:8px;padding:12px;font:inherit}button{background:#53d3b9;color:#092232;padding:10px 16px;border:0;border-radius:8px;cursor:pointer;font-weight:750}button:disabled{opacity:.4;cursor:not-allowed}small,p.note{color:#b1c8db}li{margin:7px 0}code{color:#9be9ee}#state{white-space:pre-wrap}a{color:#9de9ff}</style><main><h1>🛠️ Robot développeur V17</h1><p class="note">Missions réelles · Proposition assistée par modèle IA · ZIP pour validation · Aucune installation ni push</p><section class="card"><h2>1. Mission</h2><textarea id="task" placeholder="Décris précisément un bug ou une modification souhaitée (15 caractères minimum)"></textarea><p><button id="plan">Repérer les fichiers</button></p><p id="state">Aucune mission préparée.</p><ul id="files"></ul></section><section class="card"><h2>2. Proposer une correction</h2><p class="note">Les fichiers ci-dessus seront transmis à l'API du modèle uniquement après ton accord explicite. Ne confirme pas si un fichier contient des secrets ou des informations privées.</p><p><button id="run" disabled>Confirmer l’envoi et demander un correctif IA</button></p><p id="result"></p></section><section class="card"><h2>3. Validation</h2><p>Le correctif passe par V13/V14, puis par des tests ciblés sur une copie temporaire (V16) et par le typecheck global en mémoire (V17). Les tests non exécutés restent signalés. Le ZIP est enregistré en dehors du dépôt, dans <code>MSS_AI_CONTROL_REPORTS/DEV_V15</code>. Il n’est pas installé. Les tests ciblés ne remplacent pas la validation fonctionnelle complète.</p><small>Clé requise sur le PC : variable OPENAI_API_KEY. Modèle par défaut : gpt-5-mini. Aucun secret n'est stocké dans cette page.</small></section></main><script nonce="__NONCE__">const T='__TOKEN__',el=x=>document.getElementById(x);let id=null;async function post(url,data){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':T},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||'Échec');return d;}el('plan').onclick=async()=>{el('run').disabled=true;id=null;el('state').textContent='Recherche en cours…';el('files').replaceChildren();try{const d=await post('/api/plan',{description:el('task').value});id=d.id;el('state').textContent='Mission '+id+' · '+d.files.length+' fichier(s) · modèle '+d.model+' · API '+(d.configured?'configurée':'NON configurée');d.files.forEach(f=>{const li=document.createElement('li');li.textContent=f.path+' ('+f.bytes+' octets)';el('files').append(li)});el('run').disabled=!d.configured;if(!d.configured)el('result').textContent='Configurer OPENAI_API_KEY sur le PC, puis relancer le serveur.';}catch(e){el('state').textContent='Erreur : '+e.message;}};el('run').onclick=async()=>{if(!id)return;el('run').disabled=true;el('result').textContent='Demande IA en cours et validation technique…';try{const d=await post('/api/run',{id,confirm:true});el('result').textContent='Résultat : '+d.decision+' · '+d.changed+' fichier(s) · Contrôles : '+(d.tests||[]).map(t=>t.id+'='+t.status).join(', ')+' · Rapport : '+d.report+(d.zip?' · ZIP : '+d.zip:' · Aucun ZIP généré');}catch(e){el('result').textContent='Erreur : '+e.message;}finally{id=null;}};</script></html>`;
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>8000)throw Error('Requête trop grande');}return JSON.parse(s);}
createServer(async(req,res)=>{
 try{
  if(req.headers.host!==host+':'+port)return json(res,403,{error:'Hôte refusé'});
  if(req.method==='GET'&&req.url==='/'){const nonce=randomBytes(16).toString('base64');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`default-src 'none'; connect-src 'self'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'`});return res.end(page.replace('__NONCE__',nonce).replace('__TOKEN__',token));}
  if(req.method!=='POST'||!['/api/plan','/api/run'].includes(req.url))return json(res,404,{error:'Route absente'});
  if(req.headers['x-mss-token']!==token||(req.headers.origin&&req.headers.origin!==`http://${host}:${port}`))return json(res,403,{error:'Session refusée'});
  if(busy)return json(res,409,{error:'Mission déjà en cours'});
  const data=await body(req);
  if(req.url==='/api/plan'){
   pending=prepareAgentContext(root,data.description);
   return json(res,200,{id:pending.missionId,files:pending.files.map(f=>({path:f.path,bytes:Buffer.byteLength(f.content)})),model:process.env.MSS_AI_MODEL||'gpt-5-mini',configured:!!process.env.OPENAI_API_KEY});
  }
  if(!pending||data.id!==pending.missionId||data.confirm!==true)return json(res,400,{error:'Mission non confirmée'});
  if(!process.env.OPENAI_API_KEY)return json(res,400,{error:'OPENAI_API_KEY absente'});
  const context=pending;pending=null;busy=true;
  try{
   const proposal=await requestAiProposal(context,{apiKey:process.env.OPENAI_API_KEY,model:process.env.MSS_AI_MODEL||'gpt-5-mini'});
   const {report:regression,zip}=qualifyInStaging(root,proposal,{requireTypecheck:true});
   const changed=regression.changed.length;
   const out=resolve(root,'..','MSS_AI_CONTROL_REPORTS','DEV_V15');mkdirSync(out,{recursive:true});
   const report=join(out,context.missionId+'.json');
   writeFileSync(report,JSON.stringify({schema:'mss.dev.agent.v17',missionId:context.missionId,decision:regression.decision,changed,regression,notice:'Proposition non installée. Tests ciblés et typecheck en mémoire. Revue humaine obligatoire.'},null,2));
   let zipPath=null;if(zip){zipPath=join(out,context.missionId+'-A_REVOIR.zip');writeFileSync(zipPath,zip);}
   return json(res,200,{decision:regression.decision,changed,tests:regression.tests.map(t=>({id:t.id,status:t.status})),report,zip:zipPath});
  }finally{busy=false;}
 }catch(e){json(res,400,{error:String(e.message||e).slice(0,300)});}
}).listen(port,host,()=>console.log(`MSS AI CONTROL DEVELOPPEUR V15 : http://${host}:${port}/`));
