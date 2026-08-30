import fs from "node:fs/promises";
import path from "node:path";
import { assetKey, loadCatalog } from "./fit-awena-catalog-source.mjs";
import { AWENA_STATUS, resolveAwenaRegistryState } from "./fit-awena-registry.mjs";

const refresh=process.argv.includes("--refresh");
const catalog=await loadCatalog({refresh,allowCache:true});
const jobs=[];
const fallback=[
  "setup position: body alignment, grip, feet and equipment placement before the repetition starts",
  "controlled eccentric or first movement phase with exact joint alignment",
  "end-range / bottom / peak position showing the key technical checkpoint",
  "concentric return / finish position while keeping posture and equipment controlled",
];
for(const exercise of catalog.exercises){
  const key=assetKey(exercise); const state=await resolveAwenaRegistryState(exercise,key);
  if(state.status!==AWENA_STATUS.REVIEW||state.origin==="legacy-generated")continue;
  const reviewDir=path.resolve("public/fit/awena-library/review",key);
  const instructions=(exercise.instructions||[]).slice(0,4);
  jobs.push({
    version:1,exerciseId:exercise.id,assetKey:key,name:exercise.name,status:"PENDING_DEDICATED_IMAGE_WORKFLOW",
    identityReference:"public/fit/exercise-media/pushup/awena-step-01-start.webp",
    motionReference:path.join(reviewDir,"awena-preview.webm"),
    outputDirectory:reviewDir,
    outputs:["awena-step-01.webp","awena-step-02.webp","awena-step-03.webp","awena-step-04.webp"],
    prompts:Array.from({length:4},(_,i)=>[
      "AWENA, exact same face, ponytail, athletic proportions and black/color-accent fitness outfit as the identity reference.",
      `Exercise: ${exercise.name}. Pedagogical step ${i+1}/4.`,
      instructions[i]||fallback[i],
      `Equipment: ${exercise.equipment||"bodyweight"}.`,
      "Produce a clean instructional still, full body and all equipment completely visible with generous margins, biomechanically correct pose, stable camera, transparent background, no text, no watermark.",
      "This is a dedicated step illustration, not an arbitrary frame extracted from the motion video.",
    ].join(" ")),
  });
}
await fs.mkdir("var/fit-awena",{recursive:true});
await fs.writeFile("var/fit-awena/step-queue.json",JSON.stringify({version:1,createdAt:new Date().toISOString(),count:jobs.length,jobs},null,2));
console.log(`AWENA dedicated step jobs: ${jobs.length} -> var/fit-awena/step-queue.json`);
