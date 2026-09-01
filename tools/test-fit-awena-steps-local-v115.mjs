import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function run(args){
  const r=spawnSync(process.execPath,args,{encoding:"utf8",windowsHide:true});
  if(r.status!==0)throw new Error(`${args.join(" ")} failed\n${r.stdout||""}\n${r.stderr||""}`);
  return `${r.stdout||""}${r.stderr||""}`;
}

run(["./tools/build-fit-awena-registry.mjs"]);
run(["./tools/build-fit-awena-step-jobs.mjs"]);
const queue=JSON.parse(await fs.readFile("var/fit-awena/step-queue.json","utf8"));
const curl=queue.jobs.find((j)=>j.assetKey==="curl");
const squat=queue.jobs.find((j)=>j.assetKey==="squat");
if(!curl)throw new Error("curl missing from step queue");
if(!squat)throw new Error("squat missing from step queue");
if(curl.stepStrategy!=="APPROVED_MANUAL_FRAMES")throw new Error(`curl strategy=${curl.stepStrategy}`);
if(squat.stepStrategy!=="APPROVED_VIDEO_PHASE_FRAMES")throw new Error(`squat strategy=${squat.stepStrategy}`);
if(queue.requiresComfyUiImageWorkflow!==0)throw new Error(`unexpected ComfyUI step jobs: ${queue.requiresComfyUiImageWorkflow}`);

const reviewCurl=path.resolve("public/fit/awena-library/review/curl");
const backup=path.resolve("var/fit-awena/test-backup-review-curl");
await fs.rm(backup,{recursive:true,force:true});
if(fssync.existsSync(reviewCurl)){await fs.mkdir(path.dirname(backup),{recursive:true});await fs.rename(reviewCurl,backup);}
try{
  run(["./tools/run-comfyui-awena-steps.mjs","--match","curl","--overwrite"]);
  for(let i=1;i<=4;i++){
    const f=path.join(reviewCurl,`awena-step-${String(i).padStart(2,"0")}.webp`);
    const s=await fs.stat(f);if(s.size<1000)throw new Error(`invalid generated curl step ${i}`);
  }
  const meta=JSON.parse(await fs.readFile(path.join(reviewCurl,"metadata.json"),"utf8"));
  if(meta.status!=="REVIEW"||meta.stepStrategy!=="APPROVED_MANUAL_FRAMES")throw new Error("curl metadata policy mismatch");
}finally{
  await fs.rm(reviewCurl,{recursive:true,force:true});
  if(fssync.existsSync(backup))await fs.rename(backup,reviewCurl);
}
console.log("FIT AWENA V115 local step preparation: OK");
