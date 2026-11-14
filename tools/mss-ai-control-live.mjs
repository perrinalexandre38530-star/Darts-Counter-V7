#!/usr/bin/env node
/** Local browser dashboard for MSS AI CONTROL, read-only Git and outside-repo reports. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLoopbackHost, isOutsideRepository, sanitizeReport, buildPage } from './mss-ai-control-live-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const reports=resolve(dirname(root),'MSS_AI_CONTROL_REPORTS');
if(!isOutsideRepository(root,reports)) throw new Error('Dossier des rapports à l’intérieur du dépôt');
const host=assertLoopbackHost('127.0.0.1');
const port=Number(process.env.MSS_AI_CONTROL_PORT || 4178);
if(!Number.isInteger(port)||port<1024||port>65535) throw new Error('Port invalide.');
mkdirSync(reports,{recursive:true});
let running=null;
function refresh(){
 if(running) return running;
 running=new Promise((done)=>{
  const processChild=spawn(process.execPath,[join(root,'tools/mss-ai-control-dashboard.mjs'),'--sync-only'],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
  let stderr='', stdout='', completed=false;
  const finish=result=>{if(completed)return;completed=true;done(result)};
  processChild.stderr.on('data',v=>{stderr=(stderr+v).slice(-3000)});
  processChild.stdout.on('data',v=>{stdout=(stdout+v).slice(-3000)});
  processChild.on('error',e=>finish({code:2,error:e.message}));
  processChild.on('close',code=>finish({code,error:stderr.trim()||null,output:stdout.trim()}));
  setTimeout(()=>{if(!completed){processChild.kill();finish({code:2,error:'Contrôle interrompu après 30 secondes'})}},30000).unref();
 }).finally(()=>{running=null});
 return running;
}
function respond(res,code,body,type='application/json; charset=utf-8'){
 res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"});res.end(body);
}
function json(res,code,obj){respond(res,code,JSON.stringify(obj))}
const server=createServer(async(req,res)=>{
 const path=(req.url||'').split('?')[0];
 // Loopback-only, disallow host header-based DNS rebinding access.
 const requestHost=(req.headers.host||'').split(':')[0];
 if(requestHost!=='127.0.0.1'&&requestHost!=='localhost') return json(res,403,{error:'Hôte refusé'});
 if(req.method==='GET'&&path==='/')return respond(res,200,buildPage(),'text/html; charset=utf-8');
 if(req.method==='GET'&&path==='/api/status'){
  try{return json(res,200,sanitizeReport(JSON.parse(readFileSync(join(reports,'latest.json'),'utf8'))))}
  catch(e){return json(res,503,{error:'Aucun rapport V3 valide : '+e.message})}
 }
 if(req.method==='GET'&&path==='/rapport'){
  try{return respond(res,200,readFileSync(join(reports,'latest.html'),'utf8'),'text/html; charset=utf-8')}
  catch{return json(res,404,{error:'Rapport HTML absent'})}
 }
 if(req.method==='POST'&&path==='/api/refresh'){
  // Same-origin protection: a hostile webpage cannot launch the local runner.
  const origin=req.headers.origin;
  if(origin!==`http://${host}:${port}`)return json(res,403,{error:'Origine absente ou refusée'});
  if(req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site']))return json(res,403,{error:'Requête externe refusée'});
  const result=await refresh();
  return json(res,result.code===2?503:200,{status:result.code===0?'OK':result.code===1?'BLOQUE':'ERREUR',error:result.code===2?result.error:null});
 }
 return json(res,404,{error:'Route inconnue'});
});
server.listen(port,host,()=>{
 console.log(`MSS AI CONTROL V4 : http://${host}:${port}`);
 console.log('Ctrl+C pour arrêter. Lecture seule. Aucun changement Git.');
 refresh().then(r=>console.log(`Premier contrôle : ${r.code===0?'OK':r.code===1?'BLOQUÉ':'ERREUR'}`));
});
