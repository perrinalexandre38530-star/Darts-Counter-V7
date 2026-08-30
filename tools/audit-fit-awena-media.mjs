import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { assetKey, loadCatalog } from "./fit-awena-catalog-source.mjs";

const refresh=process.argv.includes("--refresh");
const catalog=await loadCatalog({refresh,allowCache:true});
const root=path.resolve("public/fit/awena-library"); const outDir=path.resolve("var/fit-awena"); await fs.mkdir(outDir,{recursive:true});
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
function alphaVerified(file){
  if(!file)return false;
  const r=spawnSync("ffprobe",["-v","error","-show_entries","stream=pix_fmt:stream_tags=alpha_mode","-of","json",file],{encoding:"utf8"});
  return r.status===0 && /yuva|alpha_mode\"\s*:\s*\"?1/i.test(r.stdout||"");
}
const rows=[];
for(const ex of catalog.exercises){
  const key=assetKey(ex),dir=path.join(root,key),videoFile=path.join(dir,"awena-preview.webm"); const video=await exists(videoFile); const poster=await exists(path.join(dir,"awena-poster.webp")); let steps=0;
  for(let i=1;i<=8;i++)if(await exists(path.join(dir,`awena-step-${String(i).padStart(2,"0")}.webp`)))steps++;
  const alpha=video?alphaVerified(videoFile):false;
  rows.push({id:ex.id,name:ex.name,muscle:ex.muscle,equipment:ex.equipment,source:ex.source,referencePhotos:(ex.imagePaths||[]).length,referenceVideos:(ex.videoUrls||[]).length,awenaVideo:video,awenaAlphaVerified:alpha,awenaPoster:poster,awenaSteps:steps,awenaComplete:video&&alpha&&poster&&steps>=4,assetKey:key});
}
const summary={generatedAt:new Date().toISOString(),catalogCount:rows.length,withAwenaVideo:rows.filter(r=>r.awenaVideo).length,withTransparentAwenaVideo:rows.filter(r=>r.awenaAlphaVerified).length,withAwenaPoster:rows.filter(r=>r.awenaPoster).length,withFourAwenaSteps:rows.filter(r=>r.awenaSteps>=4).length,awenaComplete:rows.filter(r=>r.awenaComplete).length,missingAwena:rows.filter(r=>!r.awenaComplete).length,withReferencePhotos:rows.filter(r=>r.referencePhotos>0).length,withoutReferencePhotos:rows.filter(r=>r.referencePhotos===0).length,withReferenceVideos:rows.filter(r=>r.referenceVideos>0).length,sources:catalog.sources,sourceErrors:catalog.errors||[]};
await fs.writeFile(path.join(outDir,"awena-media-audit.json"),JSON.stringify({summary,rows},null,2));
const headers=Object.keys(rows[0]||{id:"",name:""}); const esc=v=>`"${String(v??"").replaceAll('"','""')}"`; const csv=[headers.map(esc).join(";"),...rows.map(r=>headers.map(h=>esc(r[h])).join(";"))].join("\n"); await fs.writeFile(path.join(outDir,"awena-media-audit.csv"),csv);
console.log(JSON.stringify(summary,null,2));
console.log("Rapports: var/fit-awena/awena-media-audit.json + .csv");
