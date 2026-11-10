import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/[[path]].js';
const env={MSS_GITHUB_REPO:'owner/repo',MSS_GITHUB_TOKEN:'test-only'};
function context(path,method='GET',data={}){
 const request = new Request(`https://admin.example.com/api/${path}`,{method,headers:method==='POST'?{'origin':'https://admin.example.com','content-type':'application/json'}:{},...(method==='POST'?{body:JSON.stringify(data)}:{})});
 return {request,env,data:{identity:{email:'owner@example.com'}}};
}
const ok=(x,status=200)=>Response.json(x,{status});
function fixtureFetch(log){return async (url,options={})=>{
 const p=new URL(url).pathname;const m=(options.method||'GET').toUpperCase();log.push({m,p,body:options.body?JSON.parse(options.body):null});
 if(p.endsWith('/labels/mss%3Amission')||p.endsWith('/labels/mss%3Aapproved')||p.endsWith('/labels/mss%3Ablocked'))return ok({name:p.split('/').at(-1)});
 if(p.endsWith('/issues')&&m==='POST')return ok({number:42,html_url:'https://github.com/owner/repo/issues/42'},201);
 if(p.endsWith('/issues/42')&&m==='GET')return ok({number:42,state:'open',title:'[AGENT] Déboguer',labels:[{name:'mss:mission'}],body:'**Robot :** debogueur'});
 if(p.endsWith('/issues/42/labels')&&m==='POST')return ok([{name:'mss:approved'}]);
 if(url.includes('/issues?'))return ok([{number:42,state:'open',title:'[AGENT] Déboguer',labels:[],body:'**Robot :** debogueur'}]);
 if(url.includes('/pulls?'))return ok([{number:7,title:'PR agent',draft:true}]);
 if(url.includes('/actions/runs?'))return ok({workflow_runs:[{id:5,name:'MSS Agent',status:'completed',conclusion:'success'}]});
 return ok({message:'Not Found'},404);
};}
const valid={title:'Corriger les stats X01',agent:'data-cloud',priority:'normal',goal:'Réparer le comptage des sets gagnés.',success:'Les chiffres correspondent à History V4.',boundaries:'Ne rien changer aux sauvegardes.'};

test('le tableau de bord lit GitHub sans modifier le dépôt',async()=>{
 const calls=[];const old=globalThis.fetch;globalThis.fetch=fixtureFetch(calls);
 try{const r=await onRequest(context('bootstrap'));assert.equal(r.status,200);const d=await r.json();assert.equal(d.issues.length,1);assert.equal(d.prs.length,1);assert.equal(d.runs.length,1);assert.equal(d.engineActive,false);assert.ok(calls.every(x=>x.m==='GET'));}finally{globalThis.fetch=old;}
});
test('créer une mission fabrique seulement une issue, pas de commit',async()=>{
 const calls=[];const old=globalThis.fetch;globalThis.fetch=fixtureFetch(calls);
 try{const r=await onRequest(context('missions','POST',valid));assert.equal(r.status,201);const d=await r.json();assert.equal(d.number,42);assert.equal(calls.filter(x=>x.m==='POST'&&x.p.endsWith('/issues')).length,1);assert.ok(calls.every(x=>!x.p.includes('/git/')&&!x.p.includes('/actions/workflows/')));}finally{globalThis.fetch=old;}
});
test('approbation = label seulement ; ne lance pas de robot',async()=>{
 const calls=[];const old=globalThis.fetch;globalThis.fetch=fixtureFetch(calls);
 try{const r=await onRequest(context('missions/42/approve','POST',{}));assert.equal(r.status,200);const d=await r.json();assert.equal(d.status,'APPROUVÉE');assert.equal(calls.filter(x=>x.m==='POST').length,1);assert.ok(calls.every(x=>!x.p.includes('/pulls')&&!x.p.includes('/actions/workflows/')));}finally{globalThis.fetch=old;}
});
test('POST sans origine ou utilisateur refusé',async()=>{
 const ctx=context('missions','POST',valid);ctx.request=new Request('https://admin.example.com/api/missions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(valid)});
 const r=await onRequest(ctx);assert.equal(r.status,403);
 const noAuth=context('bootstrap');noAuth.data={};const k=await onRequest(noAuth);assert.equal(k.status,401);
});
