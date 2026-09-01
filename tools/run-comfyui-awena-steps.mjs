import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import os from "node:os";
import { requireMediaTools, runFfmpeg, runFfprobe } from "./fit-awena-media-tools.mjs";
import { validateStepPack } from "./fit-awena-step-quality.mjs";

function arg(name,fallback=""){const i=process.argv.indexOf(name);return i>=0?(process.argv[i+1]??fallback):fallback;}
function flag(name){return process.argv.includes(name);}
const server=arg("--server",process.env.COMFYUI_URL||"http://127.0.0.1:8188").replace(/\/$/,"");
const queueFile=path.resolve(arg("--queue","var/fit-awena/step-queue.json"));
const workflowFile=path.resolve(arg("--workflow",process.env.COMFYUI_AWENA_STEP_WORKFLOW||"tools/comfyui/awena-step-api.json"));
const limit=Math.max(0,Number(arg("--limit","0"))||0);
const match=arg("--match","").toLowerCase().trim();
const overwrite=flag("--overwrite");
const dryRun=flag("--dry-run");
const timeoutMinutes=Math.max(5,Number(arg("--timeout-minutes","60"))||60);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
function replaceTokens(value,tokens){if(Array.isArray(value))return value.map(v=>replaceTokens(v,tokens));if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceTokens(v,tokens)]));if(typeof value!=="string")return value;let out=value;for(const [k,v] of Object.entries(tokens))out=out.split(k).join(String(v));return out;}
async function upload(filePath,name){const bytes=await fs.readFile(filePath);const form=new FormData();form.append("image",new Blob([bytes]),name||path.basename(filePath));form.append("type","input");form.append("overwrite","true");const res=await fetch(`${server}/upload/image`,{method:"POST",body:form});if(!res.ok)throw new Error(`ComfyUI upload ${res.status}: ${await res.text()}`);const d=await res.json();return d.subfolder?`${d.subfolder}/${d.name}`:d.name;}
async function submit(prompt){const res=await fetch(`${server}/prompt`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,client_id:`fit-awena-step-${Date.now()}`})});if(!res.ok)throw new Error(`ComfyUI prompt ${res.status}: ${await res.text()}`);const d=await res.json();if(!d.prompt_id)throw new Error("prompt_id absent");return d.prompt_id;}
async function history(id){const max=Math.ceil(timeoutMinutes*60);for(let i=0;i<max;i++){const res=await fetch(`${server}/history/${id}`);if(res.ok){const d=await res.json();if(d?.[id])return d[id];}await sleep(1000);}throw new Error(`Timeout ComfyUI step ${id} après ${timeoutMinutes} min`);}
function collect(value,out=[]){if(Array.isArray(value)){for(const v of value)collect(v,out);return out;}if(value&&typeof value==="object"){if(typeof value.filename==="string")out.push({filename:value.filename,subfolder:String(value.subfolder||""),type:String(value.type||"output")});for(const v of Object.values(value))collect(v,out);}return out;}
async function materialize(ref,dst){const qs=new URLSearchParams({filename:ref.filename,type:ref.type||"output"});if(ref.subfolder)qs.set("subfolder",ref.subfolder);const res=await fetch(`${server}/view?${qs}`);if(!res.ok)throw new Error(`ComfyUI /view ${res.status}: ${ref.filename}`);await fs.writeFile(dst,Buffer.from(await res.arrayBuffer()));}
function localReference(value){if(!value)return null;const v=String(value);if(path.isAbsolute(v)&&fssync.existsSync(v))return v;if(v.startsWith("/")){const p=path.resolve("public",v.slice(1));return fssync.existsSync(p)?p:null;}const p=path.resolve(v);return fssync.existsSync(p)?p:null;}

function pickFour(values=[]){
  const list=values.filter(Boolean);
  if(list.length<4)return [];
  return Array.from({length:4},(_,i)=>list[Math.round(i*(list.length-1)/3)]);
}
function videoDurationSeconds(file){
  const probe=runFfprobe(["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",file]);
  if(probe.status!==0)throw new Error(`ffprobe duration impossible: ${String(probe.stderr||probe.stdout||"").trim()}`);
  const duration=Number(String(probe.stdout||"").trim());
  if(!Number.isFinite(duration)||duration<=0)throw new Error(`Durée vidéo invalide: ${file}`);
  return duration;
}
async function copyAsWebp(source,target,label){
  await fs.mkdir(path.dirname(target),{recursive:true});
  if(/\.webp$/i.test(source)){await fs.copyFile(source,target);return;}
  runFfmpeg(["-i",source,"-frames:v","1","-c:v","libwebp","-quality","94",target],label);
}
async function prepareFromApprovedFrames(job){
  const sources=pickFour((job.approvedFrameSources||[]).map(localReference).filter(Boolean));
  if(sources.length<4)throw new Error(`Pack frames validé insuffisant pour ${job.assetKey}`);
  await fs.mkdir(job.outputDirectory,{recursive:true});
  for(let i=0;i<4;i++){
    const target=path.join(job.outputDirectory,`awena-step-${String(i+1).padStart(2,"0")}.webp`);
    if(!overwrite&&await exists(target))continue;
    await copyAsWebp(sources[i],target,`Conversion frame validée step ${i+1}`);
  }
  return {sourceMode:"APPROVED_MANUAL_FRAMES",sources};
}
async function prepareFromApprovedVideo(job){
  const source=localReference(job.motionReference||job.authoritativeVideoReference);
  if(!source)throw new Error(`Vidéo AWENA validée introuvable pour ${job.assetKey}: ${job.motionReference||job.authoritativeVideoReference||""}`);
  const duration=videoDurationSeconds(source);
  const fractions=Array.isArray(job.phaseFractions)&&job.phaseFractions.length>=4?job.phaseFractions.slice(0,4):[0.10,0.30,0.50,0.70];
  await fs.mkdir(job.outputDirectory,{recursive:true});
  const times=[];
  for(let i=0;i<4;i++){
    const t=Math.max(0,Math.min(duration-0.02,duration*Number(fractions[i]||0)));
    times.push(Number(t.toFixed(3)));
    const target=path.join(job.outputDirectory,`awena-step-${String(i+1).padStart(2,"0")}.webp`);
    if(!overwrite&&await exists(target))continue;
    runFfmpeg(["-ss",String(t),"-i",source,"-frames:v","1","-c:v","libwebp","-quality","94",target],`Extraction phase validée step ${i+1}`);
  }
  return {sourceMode:"APPROVED_VIDEO_PHASE_FRAMES",source,times};
}
async function writeStepMetadata(job,extra={}){
  const metaFile=path.join(job.outputDirectory,"metadata.json");let meta={};try{meta=JSON.parse(await fs.readFile(metaFile,"utf8"));}catch{}
  const technicalQuality=extra.technicalQuality||null;
  const ready=technicalQuality?.pass===true;
  meta={...meta,assetKey:job.assetKey,exerciseId:job.exerciseId,name:job.name,status:"REVIEW",requestedComponents:["steps"],generationMode:job.generationMode,stepStrategy:job.stepStrategy,aliases:job.aliases||[],equipment:job.equipment||null,equipmentIntegrityRequired:Boolean(job.equipmentIntegrityRequired),stepGuide:{status:ready?"READY":"TECHNICAL_REVIEW_REQUIRED",requiredSteps:4,generatedAt:new Date().toISOString(),policy:"V117: four dedicated pedagogical AWENA stills generated automatically. Legacy frames/video may guide pose only and are never copied as final steps. Human review remains mandatory even after automatic QC."},humanReviewRequired:true,...extra};
  await fs.writeFile(metaFile,JSON.stringify(meta,null,2));
}


if(!await exists(queueFile))throw new Error(`Queue steps absente: ${queueFile}. Lance npm run fit:awena:steps:queue -- --refresh`);
const q=JSON.parse(await fs.readFile(queueFile,"utf8"));let jobs=q.jobs||[];if(match)jobs=jobs.filter(j=>`${j.name} ${j.exerciseId} ${j.assetKey}`.toLowerCase().includes(match));if(limit)jobs=jobs.slice(0,limit);
if(dryRun){console.log(JSON.stringify({workflowFile,queueFile,jobs:jobs.length,first:jobs[0]?.name},null,2));process.exit(0);}
const needsComfyUi=jobs.some((job)=>job.stepStrategy==="COMFYUI_DEDICATED_STILLS"||!job.stepStrategy);
const needsVideoTools=jobs.some((job)=>job.stepStrategy==="APPROVED_VIDEO_PHASE_FRAMES");
if(needsVideoTools)requireMediaTools({needProbe:true});else if(needsComfyUi)requireMediaTools();
if(needsComfyUi&&!await exists(workflowFile))throw new Error(`Workflow images AWENA dédié absent: ${workflowFile}. Les jobs basés sur médias AWENA déjà APPROVED peuvent être préparés sans ComfyUI; seuls les jobs COMFYUI_DEDICATED_STILLS nécessitent ce fichier. Exporte un workflow ComfyUI image en API format avec les placeholders documentés dans tools/comfyui/AWENA_STEP_WORKFLOW.md.`);
const raw=needsComfyUi?JSON.parse(await fs.readFile(workflowFile,"utf8")):null;const base=raw?(raw.prompt||raw):null;
let completed=0,failed=0;
for(const job of jobs){
  try{
    if(job.stepStrategy==="APPROVED_MANUAL_FRAMES"||job.stepStrategy==="APPROVED_VIDEO_PHASE_FRAMES"){
      throw new Error(`Queue steps legacy V115 refusée pour ${job.assetKey}. Lance npm run fit:awena:sync afin de reconstruire une queue V117 COMFYUI_DEDICATED_STILLS. Les anciennes frames/vidéos ne sont plus copiées comme steps finaux.`);
    }
    const identity=localReference(job.identityReference);if(!identity)throw new Error(`Référence AWENA absente: ${job.identityReference}`);
    const identityName=await upload(identity,`fit-awena-step-identity-${job.assetKey}${path.extname(identity)}`);
    const motion=localReference(job.motionReference);const motionName=motion?await upload(motion,`fit-awena-step-motion-${job.assetKey}${path.extname(motion)}`):"";
    await fs.mkdir(job.outputDirectory,{recursive:true});
    for(let i=0;i<4;i++){
      const target=path.join(job.outputDirectory,`awena-step-${String(i+1).padStart(2,"0")}.webp`);if(!overwrite&&await exists(target))continue;
      const prefix=`fit_awena_steps/${job.assetKey}/step-${String(i+1).padStart(2,"0")}`;
      const tokens={"__AWENA_REFERENCE__":identityName,"__MOTION_REFERENCE__":motionName,"__STEP_PROMPT__":job.prompts[i],"__STEP_INDEX__":i+1,"__STEP_SEED__":Math.abs([...`${job.assetKey}:${i}`].reduce((a,c)=>((a*31)+c.charCodeAt(0))|0,17)),"__STEP_OUTPUT_PREFIX__":prefix,"__ASSET_KEY__":job.assetKey};
      const id=await submit(replaceTokens(structuredClone(base),tokens));const h=await history(id);const refs=collect(h?.outputs||h).filter(r=>/\.(png|webp|jpg|jpeg)$/i.test(r.filename));if(!refs.length)throw new Error(`Aucune image de sortie pour step ${i+1}`);
      const preferred=refs.find(r=>`${r.subfolder}/${r.filename}`.includes(prefix))||refs.at(-1);const tmp=path.join(os.tmpdir(),`awena-step-${job.assetKey}-${i+1}${path.extname(preferred.filename)||".png"}`);await materialize(preferred,tmp);
      if(/\.webp$/i.test(tmp))await fs.copyFile(tmp,target);else runFfmpeg(["-y","-i",tmp,"-frames:v","1","-c:v","libwebp","-quality","92",target],`Conversion step ${i+1}`);await fs.rm(tmp,{force:true}).catch(()=>{});
    }
    const stepFiles=Array.from({length:4},(_,i)=>path.join(job.outputDirectory,`awena-step-${String(i+1).padStart(2,"0")}.webp`));
    const technicalQuality=await validateStepPack(stepFiles,{equipmentIntegrityRequired:Boolean(job.equipmentIntegrityRequired)});
    await writeStepMetadata(job,{preparedFromApprovedMedia:null,technicalQuality});
    if(!technicalQuality.pass){
      failed++;
      console.error(`STEPS QC REFUSÉ ${job.assetKey}: ${(technicalQuality.reasons||[]).join(", ")||"qualité technique insuffisante"}. Le pack reste REVIEW et ne peut pas être approuvé.`);
      continue;
    }
    completed++;console.log(`STEPS REVIEW READY ${job.assetKey} · QC technique OK · validation visuelle requise`);
  }catch(error){failed++;console.error(`ECHEC STEPS ${job.name}: ${error?.message||error}`);}
}
console.log(JSON.stringify({processed:jobs.length,reviewReady:completed,failed},null,2));if(failed)process.exitCode=2;
