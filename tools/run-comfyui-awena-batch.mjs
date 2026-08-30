import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function arg(name, fallback="") { const i=process.argv.indexOf(name); return i>=0 ? (process.argv[i+1] ?? fallback) : fallback; }
function flag(name){return process.argv.includes(name);}
const server=arg("--server",process.env.COMFYUI_URL||"http://127.0.0.1:8188").replace(/\/$/,"");
const workflowFile=path.resolve(arg("--workflow",process.env.COMFYUI_AWENA_WORKFLOW||"tools/comfyui/awena-exercise-api.json"));
const queueFile=path.resolve(arg("--queue","var/fit-awena/comfyui-queue.json"));
const referenceFile=path.resolve(arg("--reference",process.env.AWENA_REFERENCE_IMAGE||"public/fit/exercise-media/pushup/awena-step-01-start.webp"));
const comfyOutput=arg("--comfy-output",process.env.COMFYUI_OUTPUT_DIR||"");
const limit=Math.max(0,Number(arg("--limit","0"))||0);
const from=Math.max(0,Number(arg("--from","0"))||0);
const match=arg("--match","").toLowerCase().trim();
const dryRun=flag("--dry-run");
const overwrite=flag("--overwrite");

const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}

function replaceTokens(value,tokens){
  if(Array.isArray(value)) return value.map(v=>replaceTokens(v,tokens));
  if(value&&typeof value==="object") return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceTokens(v,tokens)]));
  if(typeof value!=="string") return value;
  if(Object.hasOwn(tokens,value)) return tokens[value];
  let out=value; for(const [token,replacement] of Object.entries(tokens)) out=out.split(token).join(String(replacement)); return out;
}

async function uploadReference(){
  const bytes=await fs.readFile(referenceFile); const form=new FormData();
  form.append("image",new Blob([bytes]),path.basename(referenceFile)); form.append("type","input"); form.append("overwrite","true");
  const res=await fetch(`${server}/upload/image`,{method:"POST",body:form}); if(!res.ok)throw new Error(`ComfyUI upload ${res.status}: ${await res.text()}`);
  const data=await res.json(); return data.subfolder?`${data.subfolder}/${data.name}`:data.name;
}

async function submit(prompt){
  const res=await fetch(`${server}/prompt`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,client_id:`fit-awena-${Date.now()}`})});
  if(!res.ok)throw new Error(`ComfyUI prompt ${res.status}: ${await res.text()}`); const data=await res.json(); if(!data.prompt_id)throw new Error(`ComfyUI: prompt_id absent ${JSON.stringify(data)}`); return data.prompt_id;
}
async function history(promptId){
  for(let i=0;i<1800;i++){ const res=await fetch(`${server}/history/${promptId}`); if(res.ok){const data=await res.json(); if(data?.[promptId])return data[promptId];} await sleep(1000); }
  throw new Error(`Timeout ComfyUI ${promptId}`);
}
function collectFiles(value,out=[]){
  if(Array.isArray(value)){for(const v of value)collectFiles(v,out);return out;}
  if(value&&typeof value==="object"){
    if(typeof value.filename==="string")out.push({filename:value.filename,subfolder:String(value.subfolder||""),type:String(value.type||"output")});
    for(const v of Object.values(value))collectFiles(v,out);
  }
  return out;
}
function sourcePath(ref){
  if(!comfyOutput)return null; const base=path.resolve(comfyOutput); return path.join(base,ref.subfolder||"",ref.filename);
}
function convertImage(src,dst){
  const r=spawnSync("ffmpeg",["-y","-loglevel","error","-i",src,"-c:v","libwebp","-quality","88",dst],{stdio:"inherit"}); if(r.status!==0)throw new Error(`Conversion image échouée: ${src}`);
}
function encodeAlphaFrames(frames,dst){
  const tmpDir=path.dirname(frames[0]); const pattern=path.join(tmpDir,"__fit_awena_frame_%06d.png");
  frames.forEach((file,index)=>fssync.copyFileSync(file,pattern.replace("%06d",String(index+1).padStart(6,"0"))));
  const r=spawnSync("ffmpeg",["-y","-loglevel","error","-framerate","24","-i",pattern,"-c:v","libvpx-vp9","-pix_fmt","yuva420p","-auto-alt-ref","0","-b:v","0","-crf","28",dst],{stdio:"inherit"});
  for(let i=1;i<=frames.length;i++){try{fssync.unlinkSync(pattern.replace("%06d",String(i).padStart(6,"0")));}catch{}}
  if(r.status!==0)throw new Error("Encodage VP9 alpha échoué");
}
function alphaInfo(file){
  const r=spawnSync("ffprobe",["-v","error","-show_entries","stream=pix_fmt:stream_tags=alpha_mode","-of","json",file],{encoding:"utf8"});
  if(r.status!==0)return {verified:false,raw:""}; const raw=r.stdout||""; return {verified:/yuva|alpha_mode\"\s*:\s*\"?1/i.test(raw),raw};
}
async function syncJobOutputs(job,h){
  if(!comfyOutput)throw new Error("--comfy-output (ou COMFYUI_OUTPUT_DIR) est requis pour synchroniser les médias dans l'application.");
  const refs=collectFiles(h?.outputs||h); const files=refs.map(r=>({ref:r,src:sourcePath(r)})).filter(x=>x.src&&fssync.existsSync(x.src));
  const outDir=path.resolve(job.output.directory); await fs.mkdir(outDir,{recursive:true});
  const find=(needle,extensions)=>files.find(x=>x.ref.filename.toLowerCase().includes(needle)&&extensions.some(e=>x.ref.filename.toLowerCase().endsWith(e)));
  const video=find("awena-preview",[".webm"]); const rgbaFrames=files.filter(x=>/awena-frame-\d+/i.test(x.ref.filename)&&x.ref.filename.toLowerCase().endsWith(".png")).map(x=>x.src).sort();
  const videoDst=path.join(outDir,"awena-preview.webm");
  if(video?.src)await fs.copyFile(video.src,videoDst); else if(rgbaFrames.length>=8)encodeAlphaFrames(rgbaFrames,videoDst); else throw new Error(`Sortie vidéo introuvable. Le workflow doit produire awena-preview.webm ou des awena-frame-XXXX.png RGBA.`);
  const alpha=alphaInfo(videoDst); if(!alpha.verified)throw new Error(`La vidéo générée ne contient pas d'alpha vérifiable. Refus d'intégrer un faux fond transparent: ${videoDst}`);
  for(const [needle,target] of [["awena-poster","awena-poster.webp"],["awena-step-01","awena-step-01.webp"],["awena-step-02","awena-step-02.webp"],["awena-step-03","awena-step-03.webp"],["awena-step-04","awena-step-04.webp"]]){
    const found=find(needle,[".webp",".png",".jpg",".jpeg"]); if(!found?.src)throw new Error(`Sortie ${needle} absente du workflow ComfyUI.`);
    const dst=path.join(outDir,target); if(found.src.toLowerCase().endsWith(".webp"))await fs.copyFile(found.src,dst); else convertImage(found.src,dst);
  }
  await fs.writeFile(path.join(outDir,"metadata.json"),JSON.stringify({exerciseId:job.exerciseId,name:job.name,assetKey:job.assetKey,generatedAt:new Date().toISOString(),transparentVideo:true,workflow:path.basename(workflowFile),sourceReferenceImages:job.existingReferenceImages||[],sourceReferenceVideos:job.existingReferenceVideos||[]},null,2));
  return {files:refs.length,alphaVerified:true};
}

if(!await exists(queueFile))throw new Error(`Queue absente: ${queueFile}. Lance d'abord npm run fit:awena:queue`);
if(!dryRun&&!await exists(workflowFile))throw new Error(`Workflow ComfyUI API absent: ${workflowFile}. Exporte ton workflow validé en format API dans ce chemin.`);
const queue=JSON.parse(await fs.readFile(queueFile,"utf8")); let jobs=(queue.jobs||[]); if(match)jobs=jobs.filter((job)=>`${job.name} ${job.exerciseId} ${job.assetKey}`.toLowerCase().includes(match)); jobs=jobs.slice(from); if(limit)jobs=jobs.slice(0,limit);
if(dryRun){console.log(JSON.stringify({server,workflowFile,referenceFile,comfyOutput,jobs:jobs.length,first:jobs[0]?.name},null,2));process.exit(0);}
const workflowRaw=JSON.parse(await fs.readFile(workflowFile,"utf8")); const workflowBase=workflowRaw.prompt||workflowRaw;
const referenceName=await uploadReference(); console.log(`Référence AWENA chargée: ${referenceName}`);
let ok=0,failed=0;
for(const [index,job] of jobs.entries()){
  const target=path.resolve(job.output.directory,"awena-preview.webm"); if(!overwrite&&await exists(target)){console.log(`[${index+1}/${jobs.length}] SKIP ${job.name}`);continue;}
  const tokens={
    "__AWENA_REFERENCE__":referenceName,"__POSITIVE_PROMPT__":job.comfyui.prompt,"__NEGATIVE_PROMPT__":job.comfyui.negativePrompt,"__MOTION_PROMPT__":job.comfyui.motionPrompt,
    "__STEP_1_PROMPT__":job.comfyui.stepPrompts[0],"__STEP_2_PROMPT__":job.comfyui.stepPrompts[1],"__STEP_3_PROMPT__":job.comfyui.stepPrompts[2],"__STEP_4_PROMPT__":job.comfyui.stepPrompts[3],
    "__SEED__":job.comfyui.seed,"__EXERCISE_NAME__":job.name,"__ASSET_KEY__":job.assetKey,
    "__OUTPUT_PREFIX__":`fit_awena/${job.assetKey}` ,"__VIDEO_PREFIX__":`fit_awena/${job.assetKey}/awena-preview`,"__POSTER_PREFIX__":`fit_awena/${job.assetKey}/awena-poster`,
    "__STEP_1_PREFIX__":`fit_awena/${job.assetKey}/awena-step-01`,"__STEP_2_PREFIX__":`fit_awena/${job.assetKey}/awena-step-02`,"__STEP_3_PREFIX__":`fit_awena/${job.assetKey}/awena-step-03`,"__STEP_4_PREFIX__":`fit_awena/${job.assetKey}/awena-step-04`,
  };
  try{
    console.log(`[${index+1}/${jobs.length}] ${job.name}`); const prompt=replaceTokens(structuredClone(workflowBase),tokens); const id=await submit(prompt); const h=await history(id); await syncJobOutputs(job,h); ok++; console.log(`  OK ${job.assetKey}`);
  }catch(error){failed++;console.error(`  ECHEC ${job.name}:`,error?.message||error); await fs.mkdir("var/fit-awena/errors",{recursive:true}); await fs.writeFile(path.join("var/fit-awena/errors",`${job.assetKey}.txt`),String(error?.stack||error));}
}
console.log(JSON.stringify({processed:jobs.length,ok,failed},null,2)); if(failed)process.exitCode=2;
