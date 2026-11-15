#!/usr/bin/env node
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planDevelopment, missionPacket } from './mss-dev-mission-core-v12.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const HOST='127.0.0.1', PORT=4181, secret=randomBytes(24).toString('hex');
let latest=null;
const html=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MSS AI CONTROL — Développement V12</title><style>:root{color-scheme:dark}body{background:#071427;color:#e8f2ff;font:15px system-ui;margin:0}main{max-width:880px;margin:40px auto;padding:0 18px}h1{font-size:25px}.panel{background:#142742;border:1px solid #305372;border-radius:14px;padding:24px;margin:18px 0}textarea{box-sizing:border-box;width:100%;height:140px;padding:12px;background:#071427;border:1px solid #49627c;border-radius:8px;color:white;font:inherit}button{background:#3ed5bd;border:0;border-radius:8px;padding:12px 18px;font-weight:750;cursor:pointer}button:disabled{opacity:.5}a{color:#8fe4ff}small,.muted{color:#aec3d9}li{margin:8px 0}code{color:#b8ecff}</style><main><h1>🛠️ MSS AI CONTROL — Mission développeur V12</h1><p class="muted">Triage du vrai projet · Dossier de mission ZIP · Aucun changement de code, Git ou Cloudflare</p><section class="panel"><h2>1. Décrire le problème</h2><textarea id="task" maxlength="3000" placeholder="Ex. Les statistiques X01 affichent des moyennes différentes entre le Dashboard et la page Profil."></textarea><p><button id="prepare">Analyser le code concerné</button></p><small>Le robot recherche des fichiers candidats et propose des contrôles. Ce n'est pas encore un modèle IA qui rédige un correctif.</small></section><section class="panel"><h2>2. Résultat du triage</h2><p id="state">Aucune mission analysée.</p><div id="details"></div><button id="download" disabled>Télécharger le dossier de mission ZIP</button></section><section class="panel"><h2>3. Suite supervisée</h2><p>Le dossier ZIP contient la consigne, les chemins candidats et leurs SHA-256. Il peut être transmis à un développeur ou à un agent doté d'un vrai moteur de modification du code. Il n'est pas un patch installable.</p><a href="http://127.0.0.1:4180/">Retour aux missions QA</a></section></main><script nonce="__NONCE__">const csrf='__TOKEN__',el=id=>document.getElementById(id);let ready=false;el('prepare').onclick=async()=>{el('state').textContent='Analyse en cours…';el('download').disabled=true;ready=false;try{const r=await fetch('/api/prepare',{method:'POST',headers:{'Content-Type':'application/json','X-MSS-Token':csrf},body:JSON.stringify({description:el('task').value})});const d=await r.json();if(!r.ok)throw Error(d.error);ready=true;el('state').textContent=d.files.length+' fichier(s) candidat(s) parmi '+d.scannedFiles+' fichiers examinés · '+d.id;const div=el('details');div.replaceChildren();const title=document.createElement('p');title.textContent='Contrôles QA proposés : '+d.suggestedQaMissions.join(', ');div.append(title);const ul=document.createElement('ul');d.files.forEach(f=>{const li=document.createElement('li');li.textContent=f.path+' · score '+f.score;ul.append(li)});div.append(ul);el('download').disabled=false;}catch(e){el('state').textContent='Erreur : '+e.message;}};el('download').onclick=()=>{if(ready)location.href='/api/packet?token='+encodeURIComponent(csrf)};</script></html>`;
function reply(res,code,obj){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));}
const server=createServer(async(req,res)=>{try{
 if(req.headers.host!==HOST+':'+PORT)return reply(res,403,{error:'Hôte interdit'});
 if(req.method==='GET'&&req.url==='/'){const nonce=randomBytes(16).toString('base64');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`});return res.end(html.replace('__NONCE__',nonce).replace('__TOKEN__',secret));}
 if(req.method==='POST'&&req.url==='/api/prepare'){
  if(req.headers['x-mss-token']!==secret || (req.headers.origin&&req.headers.origin!==`http://${HOST}:${PORT}`))return reply(res,403,{error:'Session refusée'});
  let body='';for await(const chunk of req){body+=chunk;if(body.length>7000)return reply(res,413,{error:'Taille excessive'});}
  let input;try{input=JSON.parse(body);}catch{return reply(res,400,{error:'JSON invalide'});}
  try{latest=planDevelopment(ROOT,input.description);return reply(res,200,latest);}catch(e){return reply(res,400,{error:e.message});}
 }
 if(req.method==='GET'&&req.url.startsWith('/api/packet?')){
  const u=new URL(req.url,`http://${HOST}:${PORT}`);
  if(u.searchParams.get('token')!==secret)return reply(res,403,{error:'Session refusée'});
  if(!latest)return reply(res,404,{error:'Préparer une mission avant export'});
  const zip=missionPacket(latest);res.writeHead(200,{'Content-Type':'application/zip','Content-Length':zip.length,'Content-Disposition':`attachment; filename="MSS_DEV_MISSION_${latest.id}.zip"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(zip);
 }
 return reply(res,404,{error:'Route inconnue'});
 }catch(e){return reply(res,500,{error:'Erreur du moteur : '+e.message});}});
server.listen(PORT,HOST,()=>console.log(`MSS AI CONTROL DEV V12 : http://${HOST}:${PORT}/  (Ctrl+C pour arrêter)`));
