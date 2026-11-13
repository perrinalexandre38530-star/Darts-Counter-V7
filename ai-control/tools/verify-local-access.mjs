#!/usr/bin/env node
// Local integration smoke: an unconfigured Cloudflare Pages admin project
// must deny static and API requests before any credentials are configured.
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const port=await new Promise((resolvePort,reject)=>{
  const server=createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
    const n=server.address().port;
    server.close(err=>err?reject(err):resolvePort(n));
  });
});
const bin=resolve(root,'node_modules','.bin','wrangler');
const child=spawn(bin,['pages','dev','public','--port',String(port), '--ip','127.0.0.1'],{
  cwd:root,
  env:{...process.env,CF_ACCESS_TEAM_DOMAIN:'',CF_ACCESS_AUD:'',OWNER_EMAIL:'',MSS_GITHUB_TOKEN:''},
  stdio:['ignore','pipe','pipe'],
});
let logs='';
for(const stream of [child.stdout,child.stderr]){
  stream.on('data',chunk=>{logs=(logs+chunk.toString()).slice(-5000);});
}
const origin='http://127.0.0.1:'+port;
async function get(path){
  return fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(1500)});
}
let error;
try{
  const deadline=Date.now()+45000;
  let up=false;
  while(Date.now()<deadline){
    if(child.exitCode!==null)throw new Error('Wrangler exited before readiness');
    try{await get('/');up=true;break;}catch{await new Promise(r=>setTimeout(r,700));}
  }
  if(!up)throw new Error('Wrangler did not accept connections in 45 seconds');
  for(const path of ['/','/index.html','/manifest.webmanifest','/api/bootstrap']){
    const response=await get(path);
    const body=await response.text();
    if(response.status!==503){
      throw new Error(path+': expected fail-closed HTTP 503, received '+response.status);
    }
    if(body.includes('<!doctype')||body.includes('MSS AI CONTROL · ADMINISTRATION')){
      throw new Error(path+': admin UI unexpectedly visible');
    }
    console.log('PASS fail-closed',path,response.status);
  }
}catch(e){error=e;}finally{
  if(child.exitCode===null){child.kill('SIGTERM');}
}
if(error){
  console.error('FAIL Pages Access smoke:',error.message);
  console.error('Wrangler diagnostic (truncated):',logs.slice(-1500));
  process.exitCode=1;
}else console.log('PASS: pages and API deny access before Cloudflare configuration');
