import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { AWENA_STATUS, generatedDirectory } from "./fit-awena-registry.mjs";
import { buildMotionDriverFromImages } from "./fit-awena-driver-utils.mjs";
import { requireMediaTools, runFfmpeg, runFfprobe } from "./fit-awena-media-tools.mjs";

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
const timeoutMinutes=Math.max(5,Number(arg("--timeout-minutes",process.env.COMFYUI_TIMEOUT_MINUTES||"180"))||180);
const resume=!flag("--no-resume");
const inflightDir=path.resolve("var/fit-awena/inflight");

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
  const photoCandidates=[...(job.resolvedReferenceImages||[]),...(job.motionDriver?.photoCandidates||[])].filter(Boolean);
  if(photoCandidates.length>=2){
    try{
      const built=await buildMotionDriverFromImages({assetKey:job.assetKey,imageCandidates:photoCandidates,outputDir:driverDir,overwrite:false,fps});
      if(built?.ok)return {path:built.path,mode:built.mode||"generated-photo-driver",source:(built.sources||[]).join(" | ")};
    }catch(error){
      console.warn(`  Driver photo impossible: ${job.name} (${error?.message||error})`);
    }
  }
  return null;
}

async function submit(prompt){
  const res=await fetch(`${server}/prompt`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,client_id:`fit-awena-${Date.now()}`})});
  if(!res.ok)throw new Error(`ComfyUI prompt ${res.status}: ${await res.text()}`); const data=await res.json(); if(!data.prompt_id)throw new Error(`ComfyUI: prompt_id absent ${JSON.stringify(data)}`); return data.prompt_id;
}
async function historyOnce(promptId){
  const res=await fetch(`${server}/history/${promptId}`);
  if(!res.ok)return null;
  const data=await res.json();
  return data?.[promptId]||null;
}
async function history(promptId){
  const maxPolls=Math.max(1,Math.round(timeoutMinutes*60));
  for(let i=0;i<maxPolls;i++){
    const found=await historyOnce(promptId);
    if(found)return found;
    if(i>0&&i%300===0)console.log(`  ComfyUI toujours en cours · ${Math.round(i/60)} min · prompt=${promptId}`);
    await sleep(1000);
  }
  const lastChance=await historyOnce(promptId);
  if(lastChance)return lastChance;
  throw new Error(`Timeout ComfyUI après ${timeoutMinutes} min ${promptId}`);
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
function alphaInfo(file){const r=runFfprobe(["-v","error","-show_entries","stream=pix_fmt:stream_tags=alpha_mode","-of","json",file],{encoding:"utf8"});if(r.status!==0)return {verified:false,raw:""};const raw=r.stdout||"";return {verified:/yuva|alpha_mode"\s*:\s*"?1/i.test(raw),raw};}
function makeAlphaVideo(rgbPattern,maskPattern,dst){
  const maskFilter=invertMask?"[1:v]format=gray,negate[alpha]":"[1:v]format=gray[alpha]";
  runFfmpeg(["-framerate",String(fps),"-i",rgbPattern,"-framerate",String(fps),"-i",maskPattern,"-filter_complex",`${maskFilter};[0:v][alpha]alphamerge`,"-c:v","libvpx-vp9","-pix_fmt","yuva420p","-auto-alt-ref","0","-b:v","0","-crf","28",dst],"Encodage WebM alpha");
}
function makeAlphaStill(rgb,mask,dst){
  const maskFilter=invertMask?"[1:v]format=gray,negate[alpha]":"[1:v]format=gray[alpha]";
  runFfmpeg(["-i",rgb,"-i",mask,"-filter_complex",`${maskFilter};[0:v][alpha]alphamerge`,"-frames:v","1","-c:v","libwebp","-quality","90",dst],"Création WebP alpha");
}

async function analyzeMask(file){
  const {data,info}=await sharp(file).greyscale().raw().toBuffer({resolveWithObject:true});
  const width=info.width,height=info.height,total=width*height;
  let foreground=0,minX=width,minY=height,maxX=-1,maxY=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(data[y*width+x]>127){foreground++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
  }
  const coverage=foreground/Math.max(1,total);
  const bbox=foreground?{minX:minX/width,maxX:maxX/width,minY:minY/height,maxY:maxY/height}:null;
  return {coverage,bbox,width,height};
}
async function horizontalBandingScore(file){
  const {data,info}=await sharp(file).resize(160,92,{fit:"fill"}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const {width,height,channels}=info;let row=0,rowN=0,col=0,colN=0;
  for(let y=1;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<Math.min(3,channels);c++){row+=Math.abs(data[(y*width+x)*channels+c]-data[((y-1)*width+x)*channels+c]);rowN++;}
  for(let y=0;y<height;y++)for(let x=1;x<width;x++)for(let c=0;c<Math.min(3,channels);c++){col+=Math.abs(data[(y*width+x)*channels+c]-data[(y*width+x-1)*channels+c]);colN++;}
  const rowMean=row/Math.max(1,rowN),colMean=col/Math.max(1,colN);
  return {rowMean,colMean,ratio:rowMean/Math.max(.001,colMean)};
}
async function technicalQuality(rgbFiles,maskFiles){
  const max=rgbFiles.length-1;
  const indices=Array.from(new Set([0,.2,.4,.6,.8,1].map(v=>Math.max(0,Math.min(max,Math.round(max*v))))));
  const samples=[];
  for(const index of indices){
    const mask=await analyzeMask(maskFiles[index]);
    const banding=await horizontalBandingScore(rgbFiles[index]);
    samples.push({index,mask,banding});
  }
  const coverages=samples.map(s=>s.mask.coverage);
  const minCoverage=Math.min(...coverages),maxCoverage=Math.max(...coverages);
  const edgeTouches=samples.filter(s=>s.mask.bbox&&(s.mask.bbox.minX<=.004||s.mask.bbox.maxX>=.996||s.mask.bbox.minY<=.004)).length;
  const banded=samples.filter(s=>s.banding.rowMean>7&&s.banding.ratio>3.5).length;
  const reasons=[];
  if(minCoverage<.015)reasons.push(`MASK_TOO_SMALL:${minCoverage.toFixed(4)}`);
  if(maxCoverage>.78)reasons.push(`MASK_TOO_LARGE:${maxCoverage.toFixed(4)}`);
  if(minCoverage>0&&maxCoverage/minCoverage>4)reasons.push(`MASK_TEMPORAL_INSTABILITY:${(maxCoverage/minCoverage).toFixed(2)}`);
  if(edgeTouches>=Math.ceil(samples.length*.5))reasons.push(`SUBJECT_TOUCHES_FRAME:${edgeTouches}/${samples.length}`);
  if(banded>=2)reasons.push(`HORIZONTAL_BANDING:${banded}/${samples.length}`);
  return {pass:reasons.length===0,visualReviewRequired:true,reasons,samples};
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
    const outDir=path.resolve(job.output.directory); if(overwrite&&fssync.existsSync(outDir))await fs.rm(outDir,{recursive:true,force:true}); await fs.mkdir(outDir,{recursive:true}); const videoDst=path.join(outDir,"awena-preview.webm");
    makeAlphaVideo(path.join(tempDir,"rgb_%06d.png"),path.join(tempDir,"mask_%06d.png"),videoDst);
    const alpha=alphaInfo(videoDst); if(!alpha.verified)throw new Error(`Alpha VP9 non vérifiable: ${videoDst}`);
    const max=rgbFiles.length-1; const posterIndex=Math.max(0,Math.min(max,Math.round(max*.10))); const reviewFrameIndices=[0,.33,.66,1].map(v=>Math.max(0,Math.min(max,Math.round(max*v))));
    makeAlphaStill(rgbFiles[posterIndex],maskFiles[posterIndex],path.join(outDir,"awena-poster.webp"));
    const reviewFramesDir=path.join(outDir,"review-keyframes"); await fs.mkdir(reviewFramesDir,{recursive:true});
    for(let i=0;i<4;i++)makeAlphaStill(rgbFiles[reviewFrameIndices[i]],maskFiles[reviewFrameIndices[i]],path.join(reviewFramesDir,`candidate-${String(i+1).padStart(2,"0")}.webp`));
    const quality=await technicalQuality(rgbFiles,maskFiles);
    const metadata={exerciseId:job.exerciseId,name:job.name,assetKey:job.assetKey,status:AWENA_STATUS.REVIEW,generatedAt:new Date().toISOString(),transparentVideo:true,alphaVerified:true,alphaSource:"SAM2 final-frame matte",workflow:path.basename(workflowFile),frames:rgbFiles.length,fps,reviewFrameIndices,posterFrameIndex:posterIndex,motionDriver:job.__driverMeta||null,sourceReferenceImages:job.existingReferenceImages||[],sourceReferenceVideos:job.existingReferenceVideos||[],technicalQuality:quality,humanReviewRequired:true,stepGuide:{status:"MISSING_DEDICATED_GUIDE",requiredSteps:4,policy:"Review keyframes are inspection aids only. They are never published as pedagogical AWENA steps."}};
    await fs.writeFile(path.join(outDir,"metadata.json"),JSON.stringify(metadata,null,2));
    if(!quality.pass){
      const rejectedDir=generatedDirectory(AWENA_STATUS.REJECTED,job.assetKey);
      if(fssync.existsSync(rejectedDir))await fs.rm(rejectedDir,{recursive:true,force:true});
      await fs.mkdir(path.dirname(rejectedDir),{recursive:true});
      await fs.rename(outDir,rejectedDir);
      metadata.status=AWENA_STATUS.REJECTED;metadata.rejectedAt=new Date().toISOString();metadata.rejectionReason="AUTOMATIC_TECHNICAL_QA";
      await fs.writeFile(path.join(rejectedDir,"metadata.json"),JSON.stringify(metadata,null,2));
      return {frames:rgbFiles.length,alphaVerified:true,quality,status:AWENA_STATUS.REJECTED,directory:rejectedDir};
    }
    return {frames:rgbFiles.length,alphaVerified:true,quality,status:AWENA_STATUS.REVIEW,directory:outDir};
  }finally{await fs.rm(tempDir,{recursive:true,force:true}).catch(()=>{});}
}

if(!await exists(queueFile))throw new Error(`Queue absente: ${queueFile}. Lance d'abord npm run fit:awena:queue -- --refresh`);
if(!dryRun){const mediaTools=requireMediaTools({needProbe:true});console.log(`FFmpeg OK: ${mediaTools.ffmpeg}`);console.log(`FFprobe OK: ${mediaTools.ffprobe}`);}
if(!dryRun&&!await exists(workflowFile))throw new Error(`Workflow ComfyUI API absent: ${workflowFile}`);
const queue=JSON.parse(await fs.readFile(queueFile,"utf8")); let jobs=(queue.jobs||[]); if(match)jobs=jobs.filter((job)=>`${job.name} ${job.exerciseId} ${job.assetKey}`.toLowerCase().includes(match)); jobs=jobs.slice(from); if(limit)jobs=jobs.slice(0,limit);
if(dryRun){console.log(JSON.stringify({server,workflowFile,referenceFile,driverDir,timeoutMinutes,resume,jobs:jobs.length,first:jobs[0]?.name},null,2));process.exit(0);}
const workflowRaw=JSON.parse(await fs.readFile(workflowFile,"utf8")); const workflowBase=workflowRaw.prompt||workflowRaw;
const referenceName=await uploadMedia(referenceFile,`fit-awena-${path.basename(referenceFile)}`); console.log(`Référence AWENA chargée: ${referenceName}`);
let ok=0,failed=0,blocked=0,rejectedQuality=0,resumed=0; const blockedJobs=[];
await fs.mkdir(inflightDir,{recursive:true});
for(const [index,jobOriginal] of jobs.entries()){
  const job=structuredClone(jobOriginal); const target=path.resolve(job.output.directory,"awena-preview.webm"); const inflightFile=path.join(inflightDir,`${job.assetKey}.json`);
  if(!overwrite&&await exists(target)){console.log(`[${index+1}/${jobs.length}] SKIP REVIEW ${job.name}`);continue;}
  try{
    let promptId=""; let h=null;
    if(resume&&await exists(inflightFile)){
      try{
        const saved=JSON.parse(await fs.readFile(inflightFile,"utf8")); promptId=String(saved.promptId||"");
        if(promptId){h=await historyOnce(promptId); if(h){resumed++;console.log(`[${index+1}/${jobs.length}] RESUME COMPLETED ${job.name} · ${promptId}`);}else{console.log(`[${index+1}/${jobs.length}] RESUME WAIT ${job.name} · ${promptId}`);h=await history(promptId);resumed++;}}
      }catch(error){console.warn(`  Reprise impossible ${job.name}: ${error?.message||error}`);promptId="";h=null;}
    }
    if(!h){
      const driver=await resolveDriver(job); if(!driver){blocked++;blockedJobs.push({exerciseId:job.exerciseId,assetKey:job.assetKey,name:job.name,reason:"NO_MOTION_DRIVER",photoCandidates:(job.resolvedReferenceImages||job.existingReferenceImages||[]).length});console.warn(`[${index+1}/${jobs.length}] BLOCKED ${job.name} — aucune vidéo de mouvement de référence`);continue;}
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
      console.log(`[${index+1}/${jobs.length}] ${job.name} · driver=${driver.mode} · destination=REVIEW`); const prompt=replaceTokens(structuredClone(workflowBase),tokens); promptId=await submit(prompt);
      await fs.writeFile(inflightFile,JSON.stringify({assetKey:job.assetKey,exerciseId:job.exerciseId,name:job.name,promptId,submittedAt:new Date().toISOString()},null,2));
      h=await history(promptId);
    }
    const result=await syncJobOutputs(job,h);
    await fs.rm(inflightFile,{force:true}).catch(()=>{});
    if(result.status===AWENA_STATUS.REJECTED){rejectedQuality++;console.warn(`  REJECTED ${job.assetKey} · ${result.quality.reasons.join(", ")}`);}else{ok++;console.log(`  REVIEW READY ${job.assetKey} · validation humaine obligatoire`);}
  }catch(error){failed++;console.error(`  ECHEC ${job.name}:`,error?.message||error); await fs.mkdir("var/fit-awena/errors",{recursive:true}); await fs.writeFile(path.join("var/fit-awena/errors",`${job.assetKey}.txt`),String(error?.stack||error));}
}
await fs.mkdir("var/fit-awena",{recursive:true}); await fs.writeFile("var/fit-awena/blocked-no-motion-driver.json",JSON.stringify({generatedAt:new Date().toISOString(),count:blockedJobs.length,jobs:blockedJobs},null,2));
console.log(JSON.stringify({processed:jobs.length,reviewReady:ok,rejectedQuality,failed,blockedNoMotionDriver:blocked,resumed},null,2)); if(failed)process.exitCode=2;
