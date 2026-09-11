import fs from "node:fs/promises";
import fssync from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { analyzePilotStep, validatePilotStepPack } from "./fit-awena-pilot-quality.mjs";

function arg(name,fallback=""){const i=process.argv.indexOf(name);return i>=0?(process.argv[i+1]??fallback):fallback;}
function flag(name){return process.argv.includes(name);}
const server=arg("--server",process.env.COMFYUI_URL||"http://127.0.0.1:8188").replace(/\/$/,"");
const workflowFile=path.resolve(arg("--workflow",process.env.COMFYUI_AWENA_IMAGE_WORKFLOW||"tools/comfyui/awena-image-api.json"));
const queueFile=path.resolve(arg("--queue","var/fit-awena/pilot/pilot-queue.json"));
const match=arg("--match","").toLowerCase().trim();
const limit=Math.max(0,Number(arg("--limit","0"))||0);
const overwrite=flag("--overwrite");
const dryRun=flag("--dry-run");
const maxAttempts=Math.max(1,Math.min(4,Number(arg("--attempts","2"))||2));
const delaySeconds=Math.max(0,Number(arg("--delay-seconds","5"))||0);
const exerciseCooldownSeconds=Math.max(0,Number(arg("--exercise-cooldown-seconds","15"))||0);
const timeoutMinutes=Math.max(2,Number(arg("--timeout-minutes","20"))||20);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
function safe(v){return String(v||"file").replace(/[^a-zA-Z0-9._-]+/g,"-").slice(0,120)||"file";}
function replaceTokens(value,tokens){if(Array.isArray(value))return value.map(v=>replaceTokens(v,tokens));if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceTokens(v,tokens)]));if(typeof value!=="string")return value;let out=value;for(const [k,v] of Object.entries(tokens))out=out.split(k).join(String(v));return out;}
async function upload(filePath,name){const bytes=await fs.readFile(filePath);const form=new FormData();form.append("image",new Blob([bytes]),name||path.basename(filePath));form.append("type","input");form.append("overwrite","true");const r=await fetch(`${server}/upload/image`,{method:"POST",body:form});if(!r.ok)throw new Error(`ComfyUI upload ${r.status}: ${await r.text()}`);const d=await r.json();return d.subfolder?`${d.subfolder}/${d.name}`:d.name;}
async function submit(prompt){const r=await fetch(`${server}/prompt`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,client_id:`fit-awena-image-pilot-${Date.now()}`})});if(!r.ok)throw new Error(`ComfyUI prompt ${r.status}: ${await r.text()}`);const d=await r.json();if(!d.prompt_id)throw new Error("ComfyUI prompt_id absent");return d.prompt_id;}
async function history(id){const max=Math.ceil(timeoutMinutes*60);for(let i=0;i<max;i++){const r=await fetch(`${server}/history/${id}`);if(r.ok){const d=await r.json();if(d?.[id])return d[id];}await sleep(1000);}throw new Error(`Timeout ComfyUI image après ${timeoutMinutes} min: ${id}`);}
function collect(value,out=[]){if(Array.isArray(value)){for(const v of value)collect(v,out);return out;}if(value&&typeof value==="object"){if(typeof value.filename==="string")out.push({filename:value.filename,subfolder:String(value.subfolder||""),type:String(value.type||"output")});for(const v of Object.values(value))collect(v,out);}return out;}
async function materialize(ref,dst){const qs=new URLSearchParams({filename:ref.filename,type:ref.type||"output"});if(ref.subfolder)qs.set("subfolder",ref.subfolder);const r=await fetch(`${server}/view?${qs}`);if(!r.ok)throw new Error(`ComfyUI /view ${r.status}: ${ref.filename}`);await fs.writeFile(dst,Buffer.from(await r.arrayBuffer()));}
function adaptWorkflow(base,{guide,prompt,seed,prefix}){
  const wf=structuredClone(base);
  let imageInputs=0,promptInputs=0,saveNodes=0;
  for(const node of Object.values(wf)){
    if(!node||typeof node!=="object"||!node.inputs)continue;
    const cls=String(node.class_type||"");const inputs=node.inputs;
    // Official Flux.2 Klein image-edit subgraph exports expose text/image/model
    // fields on one node; flattened exports expose LoadImage + CLIPTextEncode.
    if(cls==="LoadImage"&&Object.hasOwn(inputs,"image")){inputs.image=guide;imageInputs++;}
    else if(Object.hasOwn(inputs,"image")&&(Object.hasOwn(inputs,"unet_name")||Object.hasOwn(inputs,"clip_name"))&&!Array.isArray(inputs.image)){inputs.image=guide;imageInputs++;}
    if(Object.hasOwn(inputs,"text")&&(cls==="CLIPTextEncode"||Object.hasOwn(inputs,"unet_name"))&&!Array.isArray(inputs.text)){inputs.text=prompt;promptInputs++;}
    if(cls==="UNETLoader"&&Object.hasOwn(inputs,"unet_name"))inputs.unet_name=process.env.AWENA_FLUX_UNET||"flux-2-klein-4b-fp8.safetensors";
    if(cls==="Flux2Scheduler"&&Object.hasOwn(inputs,"steps"))inputs.steps=Math.max(1,Number(process.env.AWENA_FLUX_STEPS||4)||4);
    if(cls==="CLIPLoader"&&Object.hasOwn(inputs,"clip_name"))inputs.clip_name=process.env.AWENA_FLUX_CLIP||"qwen_3_4b_fp4_flux2.safetensors";
    if(cls==="VAELoader"&&Object.hasOwn(inputs,"vae_name"))inputs.vae_name=process.env.AWENA_FLUX_VAE||"flux2-vae.safetensors";
    if(Object.hasOwn(inputs,"unet_name")&&Object.hasOwn(inputs,"clip_name")&&Object.hasOwn(inputs,"vae_name")){
      inputs.unet_name=process.env.AWENA_FLUX_UNET||"flux-2-klein-4b-fp8.safetensors";
      inputs.clip_name=process.env.AWENA_FLUX_CLIP||"qwen_3_4b_fp4_flux2.safetensors";
      inputs.vae_name=process.env.AWENA_FLUX_VAE||"flux2-vae.safetensors";
    }
    for(const key of ["noise_seed","seed"]){if(Object.hasOwn(inputs,key)&&typeof inputs[key]!=="object")inputs[key]=seed;}
    if(cls==="SaveImage"&&Object.hasOwn(inputs,"filename_prefix")){inputs.filename_prefix=prefix;saveNodes++;}
  }
  wf.__meta={};delete wf.__meta;
  if(!imageInputs)throw new Error("Workflow image incompatible: aucune entrée image détectée. Utilise le template officiel Image Edit (Flux.2 Klein 4B) exporté en API.");
  if(!promptInputs)throw new Error("Workflow image incompatible: aucune entrée prompt détectée.");
  if(!saveNodes)throw new Error("Workflow image sans SaveImage. Dans ComfyUI, ajoute une seule sortie « Enregistrer l’image » au résultat du template puis Exporter (API).");
  return wf;
}
async function makeContact(files,target){const thumbs=[];for(const f of files)thumbs.push(await sharp(f).resize(480,480,{fit:"contain",background:{r:239,g:239,b:239}}).webp({quality:90}).toBuffer());await sharp({create:{width:1000,height:1000,channels:3,background:{r:28,g:28,b:28}}}).composite([{input:thumbs[0],left:10,top:10},{input:thumbs[1],left:510,top:10},{input:thumbs[2],left:10,top:510},{input:thumbs[3],left:510,top:510}]).webp({quality:90}).toFile(target);}

if(!await exists(queueFile))throw new Error(`Queue pilote absente: ${queueFile}`);
if(!await exists(workflowFile))throw new Error(`Workflow FLUX image absent: ${workflowFile}. Une seule configuration manuelle est nécessaire: ouvrir le template ComfyUI « Image Edit (Flux.2 Klein 4B) », connecter sa sortie à « Enregistrer l’image », puis « Graphe > Exporter (API) » vers tools/comfyui/awena-image-api.json.`);
const raw=JSON.parse(await fs.readFile(workflowFile,"utf8"));const base=raw.prompt||raw;
const q=JSON.parse(await fs.readFile(queueFile,"utf8"));let jobs=(q.jobs||[]).filter(j=>j.prepared?.guideReferences?.length===4);if(match)jobs=jobs.filter(j=>`${j.name} ${j.assetKey}`.toLowerCase().includes(match));if(limit)jobs=jobs.slice(0,limit);
if(dryRun){console.log(JSON.stringify({server,workflowFile,queueFile,jobs:jobs.length,first:jobs[0]?.name,maxAttempts,delaySeconds,exerciseCooldownSeconds},null,2));process.exit(0);}
let ready=0,failed=0;
for(const [ji,job] of jobs.entries()){
  const outDir=path.resolve(job.outputRoot);await fs.mkdir(outDir,{recursive:true});const stepFiles=[];const stepQa=[];
  try{
    for(let i=0;i<4;i++){
      const target=path.join(outDir,`raw-step-${String(i+1).padStart(2,"0")}.webp`);stepFiles.push(target);
      if(!overwrite&&await exists(target)){stepQa.push(await analyzePilotStep(target));continue;}
      const guideLocal=path.resolve(job.prepared.guideReferences[i]);const guide=await upload(guideLocal,`fit-awena-guide-${safe(job.assetKey)}-${i+1}.webp`);
      let accepted=false,lastQa=null;
      for(let attempt=1;attempt<=maxAttempts;attempt++){
        const extra=attempt===1?"":` RETRY ${attempt}: previous result failed technical framing. Make AWENA 20 percent smaller in frame, centered, with more empty margin around hair, hands, equipment and soles. Keep the background perfectly uniform light gray.`;
        const prefix=`fit_awena_pilot/${job.assetKey}/step-${String(i+1).padStart(2,"0")}-attempt-${attempt}`;
        const tokens={"__AWENA_GUIDE__":guide,"__STEP_PROMPT__":job.steps[i].prompt+extra,"__STEP_SEED__":Math.abs([...`${job.assetKey}:${i}:${attempt}`].reduce((a,c)=>((a*31)+c.charCodeAt(0))|0,17)),"__STEP_OUTPUT_PREFIX__":prefix};
        const wf=adaptWorkflow(replaceTokens(structuredClone(base),tokens),{guide,prompt:job.steps[i].prompt+extra,seed:tokens.__STEP_SEED__,prefix});
        console.log(`[${ji+1}/${jobs.length}] ${job.name} · step ${i+1}/4 · attempt ${attempt}/${maxAttempts}`);
        const id=await submit(wf);const h=await history(id);const refs=collect(h?.outputs||h).filter(r=>/\.(png|webp|jpg|jpeg)$/i.test(r.filename));if(!refs.length)throw new Error("Aucune image de sortie trouvée dans l'historique ComfyUI");
        const tmp=path.join(os.tmpdir(),`fit-awena-pilot-${safe(job.assetKey)}-${i}-${attempt}-${Date.now()}${path.extname(refs.at(-1).filename)||".png"}`);await materialize(refs.at(-1),tmp);const candidate=path.join(outDir,`candidate-step-${String(i+1).padStart(2,"0")}-attempt-${attempt}.webp`);await sharp(tmp,{failOn:"none"}).flatten({background:{r:239,g:239,b:239}}).webp({quality:94}).toFile(candidate);await fs.rm(tmp,{force:true}).catch(()=>{});lastQa=await analyzePilotStep(candidate);
        if(lastQa.pass){await fs.copyFile(candidate,target);accepted=true;break;}
        console.warn(`  QC refusé: ${(lastQa.reasons||[]).join(", ")}`);if(delaySeconds)await sleep(delaySeconds*1000);
      }
      stepQa.push(lastQa||{pass:false,reasons:["NO_OUTPUT"]});if(!accepted)throw new Error(`Step ${i+1} refusé après ${maxAttempts} tentative(s): ${(lastQa?.reasons||[]).join(", ")}`);if(delaySeconds)await sleep(delaySeconds*1000);
    }
    const packQa=await validatePilotStepPack(stepFiles);await makeContact(stepFiles,path.join(outDir,"generated-contact-sheet.webp"));const metadata={pipeline:"AWENA_IMAGE_FIRST_PILOT_V118",assetKey:job.assetKey,exerciseId:job.exerciseId,name:job.name,generatedAt:new Date().toISOString(),stage:"STILLS_GENERATED",stepFiles:stepFiles.map(p=>path.relative(process.cwd(),p).replaceAll("\\","/")),technicalQuality:packQa,visualReview:{status:"PENDING",required:true},videoGate:{allowed:false,reason:"HUMAN_STEP_REVIEW_REQUIRED"}};await fs.writeFile(path.join(outDir,"metadata.json"),JSON.stringify(metadata,null,2));
    ready++;console.log(`STILLS READY ${job.assetKey} · ouvrir ${path.relative(process.cwd(),path.join(outDir,"generated-contact-sheet.webp"))}`);
  }catch(error){failed++;console.error(`ECHEC ${job.name}: ${error?.message||error}`);await fs.writeFile(path.join(outDir,"metadata.json"),JSON.stringify({pipeline:"AWENA_IMAGE_FIRST_PILOT_V118",assetKey:job.assetKey,exerciseId:job.exerciseId,name:job.name,stage:"FAILED",failedAt:new Date().toISOString(),error:String(error?.message||error),visualReview:{status:"BLOCKED"},videoGate:{allowed:false}},null,2)).catch(()=>{});}
  if(exerciseCooldownSeconds&&ji<jobs.length-1)await sleep(exerciseCooldownSeconds*1000);
}
console.log(JSON.stringify({processed:jobs.length,stillsReady:ready,failed,videoJobsCreated:0},null,2));if(failed)process.exitCode=2;
