import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

function arg(name, fallback="") { const i=process.argv.indexOf(name); return i>=0 ? (process.argv[i+1] ?? fallback) : fallback; }
function flag(name){return process.argv.includes(name);}
const server=arg("--server",process.env.COMFYUI_URL||"http://127.0.0.1:8188").replace(/\/$/,"");
const workflowFile=path.resolve(arg("--workflow",process.env.COMFYUI_AWENA_WORKFLOW||"tools/comfyui/awena-exercise-api.json"));
const queueFile=path.resolve(arg("--queue","var/fit-awena/comfyui-queue.json"));
const referenceFile=path.resolve(arg("--reference",process.env.AWENA_REFERENCE_IMAGE||"public/fit/exercise-media/pushup/awena-step-01-start.webp"));
const driverDir=path.resolve(arg("--driver-dir",process.env.AWENA_DRIVER_DIR||"var/fit-awena/drivers"));
const driverOverride=arg("--driver","").trim();
const comfyOutput=arg("--comfy-output",process.env.COMFYUI_OUTPUT_DIR||"").trim();
const limit=Math.max(0,Number(arg("--limit","0"))||0);
const from=Math.max(0,Number(arg("--from","0"))||0);
const match=arg("--match","").toLowerCase().trim();
const dryRun=flag("--dry-run");
const overwrite=flag("--overwrite");
const invertMask=flag("--invert-mask");
const fps=Math.max(1,Number(arg("--fps","16"))||16);

const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
function safeName(v){return String(v||"file").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").slice(0,130)||"file";}
function extFromUrl(value,fallback=".mp4"){try{const u=new URL(value);const e=path.extname(u.pathname);return e&&e.length<=8?e:fallback;}catch{return path.extname(String(value||""))||fallback;}}

function replaceTokens(value,tokens){
  if(Array.isArray(value)) return value.map(v=>replaceTokens(v,tokens));
  if(value&&typeof value==="object") return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceTokens(v,tokens)]));
  if(typeof value!=="string") return value;
  if(Object.hasOwn(tokens,value)) return tokens[value];
  let out=value; for(const [token,replacement] of Object.entries(tokens)) out=out.split(token).join(String(replacement)); return out;
}

async function uploadMedia(filePath, preferredName=""){
  const bytes=await fs.readFile(filePath); const form=new FormData();
  const uploadName=preferredName||path.basename(filePath);
  form.append("image",new Blob([bytes]),uploadName); form.append("type","input"); form.append("overwrite","true");
  const res=await fetch(`${server}/upload/image`,{method:"POST",body:form}); if(!res.ok)throw new Error(`ComfyUI upload ${res.status}: ${await res.text()}`);
  const data=await res.json(); return data.subfolder?`${data.subfolder}/${data.name}`:data.name;
}

async function download(url,dst){
  const res=await fetch(url,{headers:{Accept:"*/*"}}); if(!res.ok)throw new Error(`Téléchargement ${res.status} ${url}`);
  const bytes=Buffer.from(await res.arrayBuffer()); await fs.mkdir(path.dirname(dst),{recursive:true}); await fs.writeFile(dst,bytes); return dst;
}
function localCandidate(value){
  if(!value)return null; const v=String(value);
  if(/^file:\/\//i.test(v)){try{return new URL(v).pathname;}catch{return null;}}
  if(/^https?:\/\//i.test(v))return null;
  if(v.startsWith("/")){const publicPath=path.resolve("public",v.slice(1)); if(fssync.existsSync(publicPath))return publicPath;}
  const direct=path.resolve(v); if(fssync.existsSync(direct))return direct;
  return null;
}
async function resolveDriver(job){
  if(driverOverride){const p=path.resolve(driverOverride); if(await exists(p))return {path:p,mode:"override"}; throw new Error(`Driver --driver introuvable: ${p}`);}
  for(const ext of [".mp4",".webm",".mov",".mkv"]){const p=path.join(driverDir,`${job.assetKey}${ext}`); if(await exists(p))return {path:p,mode:"local-driver"};}
  const candidates=[...(job.motionDriver?.existingVideoCandidates||[]),...(job.existingReferenceVideos||[])].filter(Boolean);
  for(const candidate of candidates){
    const local=localCandidate(candidate); if(local&&await exists(local))return {path:local,mode:"catalog-local"};
    if(/^https?:\/\//i.test(String(candidate))){
      const dst=path.resolve("var/fit-awena/driver-cache",`${job.assetKey}${extFromUrl(candidate)}`);
      try{if(!await exists(dst))await download(candidate,dst); return {path:dst,mode:"catalog-url",source:candidate};}catch(error){console.warn(`  Driver vidéo inaccessible: ${candidate} (${error?.message||error})`);}
    }
  }
  return null;
}

async function submit(prompt){
  const res=await fetch(`${server}/prompt`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,client_id:`fit-awena-${Date.now()}`})});
  if(!res.ok)throw new Error(`ComfyUI prompt ${res.status}: ${await res.text()}`); const data=await res.json(); if(!data.prompt_id)throw new Error(`ComfyUI: prompt_id absent ${JSON.stringify(data)}`); return data.prompt_id;
}
async function history(promptId){
  for(let i=0;i<2400;i++){ const res=await fetch(`${server}/history/${promptId}`); if(res.ok){const data=await res.json(); if(data?.[promptId])return data[promptId];} await sleep(1000); }
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
function refKey(ref){return `${ref.subfolder||""}/${ref.filename||""}`.replace(/^\//,"").toLowerCase();}
function localOutputPath(ref){if(!comfyOutput)return null;return path.join(path.resolve(comfyOutput),ref.subfolder||"",ref.filename);}
async function materializeRef(ref,dst){
  const local=localOutputPath(ref); if(local&&fssync.existsSync(local)){await fs.copyFile(local,dst);return dst;}
  const qs=new URLSearchParams({filename:ref.filename,type:ref.type||"output"}); if(ref.subfolder)qs.set("subfolder",ref.subfolder);
  const res=await fetch(`${server}/view?${qs.toString()}`); if(!res.ok)throw new Error(`ComfyUI /view ${res.status}: ${ref.filename}`);
  await fs.writeFile(dst,Buffer.from(await res.arrayBuffer())); return dst;
}
function runFfmpeg(args,label){const r=spawnSync("ffmpeg",["-y","-loglevel","error",...args],{stdio:"inherit"});if(r.status!==0)throw new Error(`${label} échoué (ffmpeg ${r.status})`);}
function alphaInfo(file){const r=spawnSync("ffprobe",["-v","error","-show_entries","stream=pix_fmt:stream_tags=alpha_mode","-of","json",file],{encoding:"utf8"});if(r.status!==0)return {verified:false,raw:""};const raw=r.stdout||"";return {verified:/yuva|alpha_mode\"\s*:\s*\"?1/i.test(raw),raw};}
function makeAlphaVideo(rgbPattern,maskPattern,dst){
  const maskFilter=invertMask?"[1:v]format=gray,negate[alpha]":"[1:v]format=gray[alpha]";
  runFfmpeg(["-framerate",String(fps),"-i",rgbPattern,"-framerate",String(fps),"-i",maskPattern,"-filter_complex",`${maskFilter};[0:v][alpha]alphamerge`,"-c:v","libvpx-vp9","-pix_fmt","yuva420p","-auto-alt-ref","0","-b:v","0","-crf","28",dst],"Encodage WebM alpha");
}
function makeAlphaStill(rgb,mask,dst){
  const maskFilter=invertMask?"[1:v]format=gray,negate[alpha]":"[1:v]format=gray[alpha]";
  runFfmpeg(["-i",rgb,"-i",mask,"-filter_complex",`${maskFilter};[0:v][alpha]alphamerge`,"-frames:v","1","-c:v","libwebp","-quality","90",dst],"Création WebP alpha");
}

async function syncJobOutputs(job,h){
  const refs=collectFiles(h?.outputs||h); const rgbRefs=refs.filter(r=>refKey(r).includes("awena-rgb")&&r.filename.toLowerCase().endsWith(".png")).sort((a,b)=>refKey(a).localeCompare(refKey(b),"en",{numeric:true}));
  const maskRefs=refs.filter(r=>refKey(r).includes("awena-mask")&&r.filename.toLowerCase().endsWith(".png")).sort((a,b)=>refKey(a).localeCompare(refKey(b),"en",{numeric:true}));
  if(rgbRefs.length<8)throw new Error(`Seulement ${rgbRefs.length} frames RGB trouvées; le workflow doit sortir les frames finales via le node FIT AWENA.`);
  if(maskRefs.length!==rgbRefs.length)throw new Error(`Frames/mattes incohérents: ${rgbRefs.length} RGB / ${maskRefs.length} masks.`);

  const tempDir=await fs.mkdtemp(path.join(os.tmpdir(),`fit-awena-${job.assetKey.slice(0,35)}-`));
  const rgbFiles=[],maskFiles=[];
  try{
    for(let i=0;i<rgbRefs.length;i++){
      const n=String(i+1).padStart(6,"0"); const rgb=path.join(tempDir,`rgb_${n}.png`); const mask=path.join(tempDir,`mask_${n}.png`);
      await Promise.all([materializeRef(rgbRefs[i],rgb),materializeRef(maskRefs[i],mask)]); rgbFiles.push(rgb);maskFiles.push(mask);
    }
    const outDir=path.resolve(job.output.directory); await fs.mkdir(outDir,{recursive:true}); const videoDst=path.join(outDir,"awena-preview.webm");
    makeAlphaVideo(path.join(tempDir,"rgb_%06d.png"),path.join(tempDir,"mask_%06d.png"),videoDst);
    const alpha=alphaInfo(videoDst); if(!alpha.verified)throw new Error(`Alpha VP9 non vérifiable: ${videoDst}`);
    const max=rgbFiles.length-1; const posterIndex=Math.max(0,Math.min(max,Math.round(max*.10))); const stepIndices=[0,.33,.66,1].map(v=>Math.max(0,Math.min(max,Math.round(max*v))));
    makeAlphaStill(rgbFiles[posterIndex],maskFiles[posterIndex],path.join(outDir,"awena-poster.webp"));
    for(let i=0;i<4;i++)makeAlphaStill(rgbFiles[stepIndices[i]],maskFiles[stepIndices[i]],path.join(outDir,`awena-step-${String(i+1).padStart(2,"0")}.webp`));
    await fs.writeFile(path.join(outDir,"metadata.json"),JSON.stringify({exerciseId:job.exerciseId,name:job.name,assetKey:job.assetKey,generatedAt:new Date().toISOString(),transparentVideo:true,alphaVerified:true,alphaSource:"SAM2 final-frame matte",workflow:path.basename(workflowFile),frames:rgbFiles.length,fps,stepFrameIndices:stepIndices,posterFrameIndex:posterIndex,motionDriver:job.__driverMeta||null,sourceReferenceImages:job.existingReferenceImages||[],sourceReferenceVideos:job.existingReferenceVideos||[]},null,2));
    return {frames:rgbFiles.length,alphaVerified:true};
  }finally{await fs.rm(tempDir,{recursive:true,force:true}).catch(()=>{});}
}

if(!await exists(queueFile))throw new Error(`Queue absente: ${queueFile}. Lance d'abord npm run fit:awena:queue -- --refresh`);
if(!dryRun&&!await exists(workflowFile))throw new Error(`Workflow ComfyUI API absent: ${workflowFile}`);
const queue=JSON.parse(await fs.readFile(queueFile,"utf8")); let jobs=(queue.jobs||[]); if(match)jobs=jobs.filter((job)=>`${job.name} ${job.exerciseId} ${job.assetKey}`.toLowerCase().includes(match)); jobs=jobs.slice(from); if(limit)jobs=jobs.slice(0,limit);
if(dryRun){console.log(JSON.stringify({server,workflowFile,referenceFile,driverDir,jobs:jobs.length,first:jobs[0]?.name},null,2));process.exit(0);}
const workflowRaw=JSON.parse(await fs.readFile(workflowFile,"utf8")); const workflowBase=workflowRaw.prompt||workflowRaw;
const referenceName=await uploadMedia(referenceFile,`fit-awena-${path.basename(referenceFile)}`); console.log(`Référence AWENA chargée: ${referenceName}`);
let ok=0,failed=0,blocked=0; const blockedJobs=[];
for(const [index,jobOriginal] of jobs.entries()){
  const job=structuredClone(jobOriginal); const target=path.resolve(job.output.directory,"awena-preview.webm"); if(!overwrite&&await exists(target)){console.log(`[${index+1}/${jobs.length}] SKIP ${job.name}`);continue;}
  try{
    const driver=await resolveDriver(job); if(!driver){blocked++;blockedJobs.push({exerciseId:job.exerciseId,assetKey:job.assetKey,name:job.name,reason:"NO_MOTION_DRIVER",photoCandidates:(job.existingReferenceImages||[]).length});console.warn(`[${index+1}/${jobs.length}] BLOCKED ${job.name} — aucune vidéo de mouvement de référence`);continue;}
    const driverName=await uploadMedia(driver.path,`fit-driver-${safeName(job.assetKey)}${path.extname(driver.path)||".mp4"}`); job.__driverMeta={mode:driver.mode,source:driver.source||driver.path};
    const tokens={
      "__AWENA_REFERENCE__":referenceName,"__MOTION_REFERENCE_VIDEO__":driverName,"__POSITIVE_PROMPT__":job.comfyui.prompt,"__NEGATIVE_PROMPT__":job.comfyui.negativePrompt,"__MOTION_PROMPT__":job.comfyui.motionPrompt,
      "__STEP_1_PROMPT__":job.comfyui.stepPrompts?.[0]||"","__STEP_2_PROMPT__":job.comfyui.stepPrompts?.[1]||"","__STEP_3_PROMPT__":job.comfyui.stepPrompts?.[2]||"","__STEP_4_PROMPT__":job.comfyui.stepPrompts?.[3]||"",
      "__SEED__":job.comfyui.seed,"__SEED_2__":Number(job.comfyui.seed||0)+1,"__EXERCISE_NAME__":job.name,"__ASSET_KEY__":job.assetKey,
      "__RAW_STAGE1_PREFIX__":`fit_awena/${job.assetKey}/debug-stage1`,"__RAW_VIDEO_PREFIX__":`fit_awena/${job.assetKey}/debug-final`,
      "__RGB_FRAME_PREFIX__":`fit_awena/${job.assetKey}/awena-rgb`,"__MASK_FRAME_PREFIX__":`fit_awena/${job.assetKey}/awena-mask`,
      "__OUTPUT_PREFIX__":`fit_awena/${job.assetKey}` ,"__VIDEO_PREFIX__":`fit_awena/${job.assetKey}/awena-preview`,"__POSTER_PREFIX__":`fit_awena/${job.assetKey}/awena-poster`,
      "__STEP_1_PREFIX__":`fit_awena/${job.assetKey}/awena-step-01`,"__STEP_2_PREFIX__":`fit_awena/${job.assetKey}/awena-step-02`,"__STEP_3_PREFIX__":`fit_awena/${job.assetKey}/awena-step-03`,"__STEP_4_PREFIX__":`fit_awena/${job.assetKey}/awena-step-04`,
    };
    console.log(`[${index+1}/${jobs.length}] ${job.name} · driver=${driver.mode}`); const prompt=replaceTokens(structuredClone(workflowBase),tokens); const id=await submit(prompt); const h=await history(id); await syncJobOutputs(job,h); ok++; console.log(`  OK ${job.assetKey}`);
  }catch(error){failed++;console.error(`  ECHEC ${job.name}:`,error?.message||error); await fs.mkdir("var/fit-awena/errors",{recursive:true}); await fs.writeFile(path.join("var/fit-awena/errors",`${job.assetKey}.txt`),String(error?.stack||error));}
}
await fs.mkdir("var/fit-awena",{recursive:true}); await fs.writeFile("var/fit-awena/blocked-no-motion-driver.json",JSON.stringify({generatedAt:new Date().toISOString(),count:blockedJobs.length,jobs:blockedJobs},null,2));
console.log(JSON.stringify({processed:jobs.length,ok,failed,blockedNoMotionDriver:blocked},null,2)); if(failed)process.exitCode=2;
