import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, relative, join, extname } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

const SKIP = new Set(['node_modules','.git','dist','build','coverage','android','.next','vendor','public','assets']);
const EXT = new Set(['.ts','.tsx','.js','.jsx','.mjs','.json']);
const GROUPS = [
 {re:/x01|501|301|statist|avg|moyenn|checkout|niveau/i,tests:['stats','types'],terms:['x01','stats','statistics','avg','checkout']},
 {re:/nas|cloud|backup|sauvegarde|historique|restaur|drive|sync/i,tests:['backup','history'],terms:['backup','history','sync','restore','nas','cloud']},
 {re:/navigation|route|menu|bouton|page|affichage|ticker/i,tests:['navigation','types'],terms:['navigation','routes','pages','app','header']},
 {re:/typescript|erreur|crash|exception|bug|compile|build/i,tests:['types'],terms:['app','error','type']},
 {re:/robot|agent|mission|ai control|qa/i,tests:['qa-complet'],terms:['mss-ai-control','mss-qa','mission']},
];
export function validateTask(value) {
 if(typeof value!=='string' || value.trim().length<15 || value.length>3000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw Error('Décrire le problème entre 15 et 3000 caractères.');
 return value.trim();
}
export function planDevelopment(root, description) {
 const task=validateTask(description);
 const match=GROUPS.filter(g=>g.re.test(task));
 const tests=[...new Set((match.length?match:[{tests:['types','qa-complet']}]).flatMap(g=>g.tests))];
 const userWords=(task.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]{4,}/g)||[])
 .filter(w=>!['dans','avec','pour','nous','plus','cette','quand','faire','probleme','fonctionne','correctif','application','multisports','scoring'].includes(w)).slice(0,18);
 const hints=match.flatMap(g=>g.terms);
 const terms=[...new Set([...userWords,...hints])];
 const candidates=[];let visited=0;
 function walk(dir){if(visited>1800)return;
  let entries;try{entries=readdirSync(dir,{withFileTypes:true});}catch{return;}
  for(const e of entries){if(visited>1800)break;const path=join(dir,e.name);if(e.isDirectory()){if(!SKIP.has(e.name)&&!e.name.startsWith('.'))walk(path);continue;}
   if(!e.isFile()||!EXT.has(extname(e.name)))continue;
   visited++;let st;try{st=statSync(path);}catch{continue;}if(st.size>120000||st.size===0)continue;
   const rel=relative(root,path).replaceAll('\\','/');const low=rel.toLowerCase();
   const nameScore=terms.reduce((sum,t)=>sum+(low.includes(t)?5:0),0);
   if(!nameScore && candidates.length>250)continue;
   let bytes;try{bytes=readFileSync(path);}catch{continue;}
   const contents=bytes.toString('utf8').toLowerCase();
   const contentsScore=terms.reduce((sum,t)=>sum+(contents.includes(t)?1:0),0);
   const score=nameScore+contentsScore;
   if(score>1)candidates.push({path:rel,score,sha256:createHash('sha256').update(bytes).digest('hex'),size:st.size});
  }
 }
 for(const folder of ['src','tools'])if(existsSync(join(root,folder)))walk(join(root,folder));
 candidates.sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
 return {schema:'mss.dev.mission.v1',id:'dev-'+randomBytes(8).toString('hex'),description:task,createdAt:new Date().toISOString(),scope:'local-read-only',baseCommit:null,files:candidates.slice(0,15),suggestedQaMissions:tests,scannedFiles:visited,status:'TRIAGE_ONLY',limitations:['Aucun correctif de code généré','La correspondance des fichiers est heuristique','Le portail Cloudflare ne reçoit pas cette mission automatiquement']};
}
function crc32(buffer){let n=0xffffffff;for(const b of buffer){n^=b;for(let j=0;j<8;j++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
export function makeZip(files) {
 const parts=[], central=[];let offset=0;
 for(const [name,body] of Object.entries(files)){
  if(!/^[A-Za-z0-9_.-]+$/.test(name))throw Error('Nom ZIP non autorisé');
  const filename=Buffer.from(name);const data=Buffer.from(body,'utf8');const crc=crc32(data);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(0,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(filename.length,26);
  parts.push(h,filename,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(filename.length,28);c.writeUInt32LE(offset,42);
  central.push(c,filename);offset+=h.length+filename.length+data.length;
 }
 const size=central.reduce((n,b)=>n+b.length,0),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);e.writeUInt16LE(Object.keys(files).length,8);e.writeUInt16LE(Object.keys(files).length,10);e.writeUInt32LE(size,12);e.writeUInt32LE(offset,16);
 return Buffer.concat([...parts,...central,e]);
}
export function missionPacket(plan) {
 const manifest={...plan,files:plan.files.map(({path,sha256,size})=>({path,sha256,size}))};
 return makeZip({'mission.json':JSON.stringify(manifest,null,2)+'\n','README.txt':'MSS AI CONTROL V12 - Dossier de mission DEV\nCe ZIP contient une demande et la liste des fichiers candidats (empreintes SHA-256).\nIl ne contient aucun code source ni correctif executable.\nNe pas extraire ce ZIP par-dessus le projet.\nAucune modification de main, aucun push et aucun envoi Cloudflare.\n'});
}
