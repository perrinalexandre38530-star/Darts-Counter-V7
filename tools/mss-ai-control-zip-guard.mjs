#!/usr/bin/env node
/** MSS AI CONTROL V5: inspect ZIP without applying, modifying Git or writing into repo. */
import { readFileSync, existsSync, lstatSync } from 'node:fs';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { unzipSync } from 'fflate';
import { reviewFiles, validateZipPath } from './mss-zip-guard-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const argv=process.argv.slice(2); const json=argv.includes('--json'); const target=argv.find(v=>!v.startsWith('--'));
const fail=(message,code=2)=>{console.error(`MSS ZIP GUARD — REFUS : ${message}`);process.exit(code)};
if (!target) fail('Usage : node tools/mss-ai-control-zip-guard.mjs chemin/patch.zip [--json]');
const zipPath=resolve(target);
if (!existsSync(zipPath)||lstatSync(zipPath).size>60*1024*1024) fail('ZIP introuvable ou supérieur à 60 Mo (limite de sécurité)');
const git=(args)=>{const p=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:20000,maxBuffer:4e6});return p.status===0?p.stdout.trim():null};
const branch=git(['branch','--show-current']);const commit=git(['rev-parse','HEAD']);
if (!branch||!commit) fail('Git natif inaccessible : contrôle interrompu');
if (branch!=='main') fail(`Branche ${branch} : seule main est autorisée`);
const remote=git(['ls-remote','origin','refs/heads/main']);
const remoteSha=remote?.split(/\s+/)[0];
if (!remoteSha||remoteSha!==commit) fail('main local différent du main GitHub ou référence distante indisponible');
let archive;
try {archive=readFileSync(zipPath);}catch(e){fail(String(e.message));}
let files;let count=0,total=0;const invalid=[];
try {
 files=unzipSync(new Uint8Array(archive),{filter:(info)=>{
   if(info.name.endsWith('/')) return false;
   count++;total+=info.originalSize;
   if(!validateZipPath(info.name)) invalid.push(info.name);
   if(count>300||info.originalSize>20*1024*1024||total>100*1024*1024) throw Error('Limites ZIP dépassées (300 fichiers, 20 Mo/fichier, 100 Mo total)');
   return true;
 }});
}catch(e){fail(`Archive invalide : ${e.message}`);}
if(invalid.length) fail('Chemin(s) ZIP dangereux ou non conformes : '+invalid.slice(0,5).join(', '));
const entries=new Map(Object.entries(files).filter(([p])=>p!=='mss-patch-manifest.json'));
if(!entries.size) fail('ZIP vide ou sans fichiers de correctif');
let manifest=null;
if(files['mss-patch-manifest.json']) {try{manifest=JSON.parse(Buffer.from(files['mss-patch-manifest.json']).toString('utf8'));}catch{fail('Manifeste JSON illisible');}}
const existing=new Map();
for(const [path] of entries) {
 const absolute=resolve(root,path);
 if(!absolute.startsWith(root+sep)) fail('Fichier hors du dépôt : '+path);
 const segments=path.split('/');
 for(let i=1;i<=segments.length;i++) {const part=join(root,...segments.slice(0,i));if(existsSync(part)&&lstatSync(part).isSymbolicLink()) fail('Lien symbolique dans le chemin : '+path);}
 const present=existsSync(absolute);
 if(present&&!lstatSync(absolute).isFile()) fail('Cible existante non régulière : '+path);
 const tracked=git(['ls-files','--error-unmatch','--',path])!==null;
 const dirty=tracked ? (git(['status','--porcelain','--',path])||'').length>0 : present;
 existing.set(path,{exists:present,tracked,dirty,bytes:present?readFileSync(absolute):null});
}
const result=reviewFiles(entries,existing,{manifest,localCommit:commit});
const report={schema:'mss-zip-guard-v5',branch,localCommit:commit,githubCommit:remoteSha,zip:zipPath,...result,applied:false};
if(json) console.log(JSON.stringify(report,null,2));
else {
 console.log(`MSS AI CONTROL — ZIP GUARD V5 : ${report.status}`);
 console.log(`main local=GitHub=${commit.slice(0,12)} | ZIP : ${entries.size} fichiers`);
 for(const r of report.rows) console.log(`${r.status.padEnd(9)} ${r.path} — ${r.reason}`);
 for(const w of report.warnings) console.log(`ATTENTION : ${w}`);
 console.log('Lecture seule : aucun fichier installé ; aucun commit, reset ou push effectué.');
}
process.exit(result.status==='OK'?0:result.status==='REVISION_REQUISE'?1:2);
