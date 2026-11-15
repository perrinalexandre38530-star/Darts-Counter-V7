#!/usr/bin/env node
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProposal,makeReviewZip } from './mss-dev-proposal-core-v13.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const host='127.0.0.1',port=4182,token=randomBytes(24).toString('hex');let review=null;
const page=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MSS AI CONTROL V13 — Revue</title><style>:root{color-scheme:dark}body{font:16px system-ui;background:#071427;color:#e8f2ff;margin:0}main{max-width:900px;margin:35px auto;padding:16px}.card{background:#142742;padding:22px;border:1px solid #35536b;border-radius:14px;margin:16px 0}button{background:#46dbca;border:0;border-radius:7px;padding:12px;cursor:pointer;font-weight:bold}button:disabled{opacity:.45}input{margin:10px 0}li{margin:12px 0}small{color:#b1c5d8}a{color:#9ee9ff}</style><main><h1>🛡 MSS AI CONTROL — Revue développeur V13</h1><p>Contrôle des propositions de modification. Aucun fichier du projet n'est remplacé.</p><section class="card"><h2>1. Importer une proposition JSON</h2><input id="file" type="file" accept=".json,application/json"><button id="analyse">Analyser</button><p><small>Le fichier doit suivre le format mss.dev.proposal.v1. Taille maximale : 3 Mo.</small></p></section><section class="card"><h2>2. Vérification</h2><p id="summary">Aucun dossier analysé.</p><ul id="results"></ul><button id="export" disabled>Exporter ZIP pour revue humaine</button><p><small>Exporter n'installe rien. La proposition doit ensuite être relue et testée.</small></p></section><p><a href="http://127.0.0.1:4181/">Console de préparation V12</a></p></main><script nonce="__NONCE__">const t='__TOKEN__';const q=x=>document.getElementById(x);q('analyse').onclick=async()=>{q('export').disabled=true;q('results').replaceChildren();try{const f=q('file').files[0];if(!f||f.size>3000000)throw Error('Sélectionner un JSON de moins de 3 Mo');const raw=await f.text();const r=await fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':t},body:raw});const d=await r.json();if(!r.ok)throw Error(d.error);q('summary').textContent=d.decision+' — '+d.missionId;for(const item of d.files){const li=document.createElement('li');li.textContent=item.status+' · '+item.path+(item.reason?' : '+item.reason:'');q('results').append(li)}q('export').disabled=d.decision!=='REVISION_HUMAINE_REQUISE'||!d.files.some(x=>x.status==='PRET_A_REVOIR')}catch(e){q('summary').textContent='Erreur : '+e.message}};q('export').onclick=()=>{location.href='/api/export?token='+encodeURIComponent(t)}</script>`;
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
createServer(async(req,res)=>{try{
 if(req.headers.host!==host+':'+port)return json(res,403,{error:'Hôte non autorisé'});
 if(req.method==='GET'&&req.url==='/'){const nonce=randomBytes(16).toString('base64');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`});return res.end(page.replace('__NONCE__',nonce).replace('__TOKEN__',token))}
 if(req.method==='POST'&&req.url==='/api/review'){
  if(req.headers['x-mss-token']!==token||(req.headers.origin&&req.headers.origin!==`http://${host}:${port}`))return json(res,403,{error:'Session refusée'});
  let parts=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>3_000_000)return json(res,413,{error:'Fichier trop volumineux'});parts.push(chunk)}
  let input;try{input=JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{return json(res,400,{error:'JSON invalide'})}
  try{review=checkProposal(root,input);const {files,...meta}=review;return json(res,200,{...meta,files:files.map(({content,...f})=>f)})}catch(e){review=null;return json(res,400,{error:e.message})}
 }
 if(req.method==='GET'&&req.url.startsWith('/api/export?')){
  const u=new URL(req.url,`http://${host}:${port}`);if(u.searchParams.get('token')!==token)return json(res,403,{error:'Session refusée'});
  if(!review)return json(res,404,{error:'Aucune revue'});
  // Recheck live base before exporting: do not trust stale comparisons.
  const entries=review.files.filter(f=>f.status==='PRET_A_REVOIR');
  for(const e of entries){const crypto=await import('node:crypto');const fs=await import('node:fs');const actual=crypto.createHash('sha256').update(fs.readFileSync(resolve(root,e.path))).digest('hex');if(actual!==e.baseSha256)return json(res,409,{error:'Le projet a changé depuis la revue. Réanalyser.'})}
  const zip=makeReviewZip(review);res.writeHead(200,{'Content-Type':'application/zip','Content-Length':zip.length,'Content-Disposition':'attachment; filename="MSS_DEV_PROPOSITION_A_REVOIR.zip"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(zip)
 }
 return json(res,404,{error:'Route inconnue'})
 }catch(e){return json(res,500,{error:'Erreur : '+e.message})}}).listen(port,host,()=>console.log(`MSS DEV REVIEW V13 : http://${host}:${port}/ (Ctrl+C pour arrêter)`));
