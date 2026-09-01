import fs from "node:fs/promises";
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
for(const job of [curl,squat]){
  if(job.stepStrategy!=="COMFYUI_DEDICATED_STILLS")throw new Error(`${job.assetKey} unsafe strategy=${job.stepStrategy}`);
  if(!job.equipmentIntegrityRequired)throw new Error(`${job.assetKey} must enforce equipment integrity`);
}
if((curl.approvedFrameSources||[]).length<4)throw new Error("curl approved frames must remain pose references");
if(!squat.authoritativeVideoReference)throw new Error("squat approved video must remain pose reference");
if(queue.reusableApprovedFrames!==0||queue.reusableApprovedVideo!==0)throw new Error("legacy frames/video must never be copied as final steps in V117");
if(queue.requiresComfyUiImageWorkflow<2)throw new Error(`expected dedicated still workflow jobs, got ${queue.requiresComfyUiImageWorkflow}`);
if(queue.policy?.legacyFramesArePoseReferencesOnly!==true)throw new Error("V117 pose-reference-only policy missing");
console.log("FIT AWENA V117 automated dedicated steps policy: OK");
