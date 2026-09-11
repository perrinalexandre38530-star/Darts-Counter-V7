import fs from "node:fs/promises";
import fssync from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { requireMediaTools, runFfmpeg, runFfprobe } from "./fit-awena-media-tools.mjs";
import { materializeImageCandidate, localCandidate, safeFilePart } from "./fit-awena-driver-utils.mjs";

function arg(name,fallback=""){const i=process.argv.indexOf(name);return i>=0?(process.argv[i+1]??fallback):fallback;}
function flag(name){return process.argv.includes(name);}
const queueFile=path.resolve(arg("--queue","var/fit-awena/pilot/pilot-queue.json"));
const overwrite=flag("--overwrite");
const match=arg("--match","").toLowerCase().trim();
const limit=Math.max(0,Number(arg("--limit","0"))||0);

async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
function extFromUrl(value,fallback=".mp4"){try{const u=new URL(value);return path.extname(u.pathname)||fallback;}catch{return path.extname(String(value||""))||fallback;}}
async function download(url,dst){const r=await fetch(url,{headers:{Accept:"*/*"}});if(!r.ok)throw new Error(`Téléchargement ${r.status}: ${url}`);await fs.mkdir(path.dirname(dst),{recursive:true});await fs.writeFile(dst,Buffer.from(await r.arrayBuffer()));return dst;}
async function materializeVideo(value,assetKey){
  const local=localCandidate(value);if(local&&await exists(local))return local;
  if(/^https?:\/\//i.test(String(value||""))){const dst=path.resolve("var/fit-awena/pilot/cache",`${safeFilePart(assetKey)}${extFromUrl(value)}`);if(!await exists(dst))await download(value,dst);return dst;}
  return null;
}
function duration(file){const r=runFfprobe(["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",file]);if(r.status!==0)throw new Error(`ffprobe impossible: ${file}`);const d=Number(String(r.stdout||"").trim());if(!Number.isFinite(d)||d<=0)throw new Error(`Durée vidéo invalide: ${file}`);return d;}
function extractFrame(video,time,target){runFfmpeg(["-ss",String(time),"-i",video,"-frames:v","1","-vf","scale=960:960:force_original_aspect_ratio=decrease,pad=960:960:(ow-iw)/2:(oh-ih)/2:color=#efefef","-c:v","libwebp","-quality","94",target],"Extraction pose pilote");}
async function normalizeImage(src,target){await sharp(src,{failOn:"none"}).flatten({background:{r:239,g:239,b:239}}).resize(960,960,{fit:"contain",background:{r:239,g:239,b:239}}).webp({quality:94}).toFile(target);}
async function makeBoard(identity,pose,target){
  const left=await sharp(identity,{failOn:"none"}).ensureAlpha().resize(430,880,{fit:"contain",background:{r:239,g:239,b:239,alpha:0}}).png().toBuffer();
  const right=await sharp(pose,{failOn:"none"}).flatten({background:{r:239,g:239,b:239}}).resize(500,900,{fit:"contain",background:{r:239,g:239,b:239}}).png().toBuffer();
  await sharp({create:{width:1024,height:1024,channels:3,background:{r:239,g:239,b:239}}})
    .composite([
      {input:left,left:45,top:72},
      {input:Buffer.from(`<svg width="8" height="900"><rect width="8" height="900" fill="#c9c9c9"/></svg>`),left:496,top:62},
      {input:right,left:518,top:62},
    ]).webp({quality:94}).toFile(target);
}
async function makeContact(files,target){
  const thumbs=[];for(const file of files)thumbs.push(await sharp(file).resize(480,480,{fit:"contain",background:{r:239,g:239,b:239}}).webp({quality:90}).toBuffer());
  await sharp({create:{width:1000,height:1000,channels:3,background:{r:32,g:32,b:32}}}).composite([
    {input:thumbs[0],left:10,top:10},{input:thumbs[1],left:510,top:10},{input:thumbs[2],left:10,top:510},{input:thumbs[3],left:510,top:510},
  ]).webp({quality:90}).toFile(target);
}

if(!await exists(queueFile))throw new Error(`Queue pilote absente: ${queueFile}. Lance npm run fit:awena:pilot:build`);
requireMediaTools({needProbe:true});
const q=JSON.parse(await fs.readFile(queueFile,"utf8"));let jobs=q.jobs||[];if(match)jobs=jobs.filter(j=>`${j.name} ${j.assetKey}`.toLowerCase().includes(match));if(limit)jobs=jobs.slice(0,limit);
let prepared=0,failed=0;
for(const job of jobs){
  try{
    const identity=path.resolve(job.identityReference);if(!await exists(identity))throw new Error(`Identité AWENA absente: ${identity}`);
    const dir=path.resolve(job.referenceRoot);await fs.mkdir(dir,{recursive:true});
    const poses=Array.from({length:4},(_,i)=>path.join(dir,`pose-${String(i+1).padStart(2,"0")}.webp`));
    if(job.referenceMode==="VIDEO"){
      const srcValue=(job.referenceVideos||[])[0];const video=await materializeVideo(srcValue,job.assetKey);if(!video)throw new Error(`Vidéo de référence inaccessible: ${srcValue||"aucune"}`);
      const d=duration(video);const fr=job.phaseFractions||[.08,.32,.56,.80];
      for(let i=0;i<4;i++){if(!overwrite&&await exists(poses[i]))continue;const t=Math.max(0,Math.min(d-.03,d*Number(fr[i]??0)));extractFrame(video,Number(t.toFixed(3)),poses[i]);}
    }else{
      const imgs=job.referenceImages||[];if(imgs.length<2)throw new Error("Moins de 2 photos de référence");
      const picks=[0,Math.min(1,imgs.length-1),Math.max(0,imgs.length-2),imgs.length-1];
      for(let i=0;i<4;i++){if(!overwrite&&await exists(poses[i]))continue;const tmpBase=path.join(os.tmpdir(),`fit-awena-pilot-${safeFilePart(job.assetKey)}-${i}-${Date.now()}`);const src=await materializeImageCandidate(imgs[picks[i]],tmpBase);await normalizeImage(src,poses[i]);await fs.rm(src,{force:true}).catch(()=>{});}
    }
    const guides=[];
    for(let i=0;i<4;i++){const target=path.join(dir,`guide-${String(i+1).padStart(2,"0")}.webp`);if(overwrite||!await exists(target))await makeBoard(identity,poses[i],target);guides.push(target);}
    await makeContact(poses,path.join(dir,"reference-contact-sheet.webp"));
    job.prepared={at:new Date().toISOString(),poseReferences:poses.map(p=>path.relative(process.cwd(),p).replaceAll("\\","/")),guideReferences:guides.map(p=>path.relative(process.cwd(),p).replaceAll("\\","/"))};
    prepared++;console.log(`PREPARED ${job.assetKey} · ${job.referenceMode}`);
  }catch(error){failed++;job.prepareError=String(error?.message||error);console.error(`ECHEC ${job.name}: ${job.prepareError}`);}
}
q.preparedAt=new Date().toISOString();q.jobs=q.jobs.map(orig=>jobs.find(j=>j.assetKey===orig.assetKey)||orig);await fs.writeFile(queueFile,JSON.stringify(q,null,2));
console.log(JSON.stringify({processed:jobs.length,prepared,failed},null,2));if(failed)process.exitCode=2;
