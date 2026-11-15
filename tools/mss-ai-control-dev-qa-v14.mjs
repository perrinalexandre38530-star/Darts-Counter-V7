#!/usr/bin/env node
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { validateDevProposal, makeQaZip } from './mss-dev-qa-core-v14.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const HOST='127.0.0.1', PORT=4183, token=randomBytes(24).toString('hex');
let result=null;
const html=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MSS AI CONTROL — QA V14</title><style>:root{color-scheme:dark}body{font:16px system-ui;background:#091529;color:#eef5ff;margin:0}main{max-width:920px;margin:30px auto;padding:18px}.card{background:#142740;border:1px solid #38536d;border-radius:14px;padding:22px;margin:15px 0}h1{font-size:26px}h2{font-size:19px}p,small{color:#bdcee0}button{background:#4dd4c1;color:#072a32;border:0;border-radius:8px;padding:12px 18px;font-weight:bold;cursor:pointer}button:disabled{opacity:.4}li{margin:10px 0;overflow-wrap:anywhere}a{color:#7be2ff}.status{font-weight:bold}</style><main><h1>🛡 MSS AI CONTROL — Qualification développeur V14</h1><p>Import d'une proposition V13 → contrôle de conflit → validation syntaxique → ZIP de revue. Aucun fichier du projet n'est modifié.</p><div class="card"><h2>1. Charger une proposition JSON</h2><input id="file" type="file" accept=".json,application/json"><button id="check">Contrôler la proposition</button><p><small>Format : mss.dev.proposal.v1 (maximum 3 Mo)</small></p></div><div class="card"><h2>2. Rapport des contrôles</h2><p id="summary">Aucune proposition analysée</p><ul id="details"></ul><button id="download" disabled>Exporter ZIP pour revue humaine</button><p><small>Une syntaxe valide ne garantit pas un code correct. Le ZIP reste une proposition non testée en intégration.</small></p></div><p><a href="http://127.0.0.1:4182/">Revue V13</a> · <a href="http://127.0.0.1:4181/">Préparation V12</a></p></main><script nonce="__NONCE__">const token='__TOKEN__',el=id=>document.getElementById(id);el('check').onclick=async()=>{el('download').disabled=true;el('details').replaceChildren();try{const f=el('file').files[0];if(!f||f.size>3000000)throw Error('Sélectionner un JSON de 3 Mo maximum');const res=await fetch('/api/check',{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':token},body:await f.text()});const data=await res.json();if(!res.ok)throw Error(data.error||'Contrôle impossible');el('summary').textContent=data.decision+' — '+data.missionId;for(const item of data.checks){const li=document.createElement('li');li.textContent=item.status+' — '+item.path+' : '+item.detail;el('details').append(li)}el('download').disabled=data.decision==='BLOQUE'}catch(e){el('summary').textContent='Erreur : '+e.message}};el('download').onclick=()=>{location.href='/api/export?token='+encodeURIComponent(token)}</script>`;
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
const server=createServer(async(req,res)=>{try{
 if(req.headers.host!==`${HOST}:${PORT}`)return send(res,403,{error:'Hôte non autorisé'});
 if(req.method==='GET'&&req.url==='/'){const nonce=randomBytes(16).toString('base64');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`});return res.end(html.replace('__NONCE__',nonce).replace('__TOKEN__',token))}
 if(req.method==='POST'&&req.url==='/api/check'){
  if(req.headers['x-mss-token']!==token||(req.headers.origin&&req.headers.origin!==`http://${HOST}:${PORT}`))return send(res,403,{error:'Session refusée'});
  let parts=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>3_000_000){result=null;return send(res,413,{error:'Proposition trop volumineuse'})}parts.push(chunk)}
  let input;try{input=JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{result=null;return send(res,400,{error:'JSON invalide'})}
  try{result=validateDevProposal(root,input);return send(res,200,{schema:result.schema,missionId:result.missionId,decision:result.decision,checks:result.checks})}catch(e){result=null;return send(res,400,{error:e.message})}
 }
 if(req.method==='GET'&&req.url.startsWith('/api/export?')){
  const u=new URL(req.url,`http://${HOST}:${PORT}`);if(u.searchParams.get('token')!==token)return send(res,403,{error:'Session refusée'});
  if(!result||result.decision==='BLOQUE')return send(res,409,{error:'Proposition indisponible ou bloquée'});
  // Check all baseline files again to prevent stale export.
  for(const file of result.review.files){if(!file.baseSha256)continue;const digest=createHash('sha256').update(readFileSync(resolve(root,file.path))).digest('hex');if(digest!==file.baseSha256)return send(res,409,{error:'Le fichier source a changé. Relancer la validation.'})}
  const zip=makeQaZip(result);res.writeHead(200,{'Content-Type':'application/zip','Content-Length':zip.length,'Content-Disposition':'attachment; filename="MSS_DEV_PROPOSITION_QA_V14.zip"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(zip);
 }
 return send(res,404,{error:'Route inconnue'});
}catch(e){return send(res,500,{error:'Erreur de contrôle : '+e.message})}});
server.listen(PORT,HOST,()=>console.log(`MSS AI CONTROL V14 : http://${HOST}:${PORT}/  (Ctrl+C pour arrêter)`));
