import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { assetKey, loadCatalog } from "./fit-awena-catalog-source.mjs";
import { AWENA_COMPLETENESS, AWENA_STATUS, canonicalAwenaAssetKey, generatedDirectory, resolveAwenaRegistryState } from "./fit-awena-registry.mjs";

const refresh=process.argv.includes("--refresh");
const catalog=await loadCatalog({refresh,allowCache:true});
const jobs=[];
const fallback=[
  "setup position: body alignment, grip, feet and equipment placement before the repetition starts",
  "controlled eccentric or first movement phase with exact joint alignment",
  "end-range / bottom / peak position showing the key technical checkpoint",
  "concentric return / finish position while keeping posture and equipment controlled",
];

function publicUrlToLocal(url="") {
  return String(url).startsWith("/") ? path.resolve("public", String(url).slice(1)) : String(url || "");
}

const grouped=new Map();
for(const exercise of catalog.exercises){
  const rawKey=assetKey(exercise);
  const key=canonicalAwenaAssetKey(exercise,rawKey);
  const state=await resolveAwenaRegistryState(exercise,rawKey);
  const missingSteps=Number(state.coverage?.steps||0)<4;
  if(!missingSteps) continue;
  const reviewMotionReady=state.status===AWENA_STATUS.REVIEW && state.origin!=="legacy-generated" && Boolean(state.coverage?.video);
  const approvedManualFrames=state.status===AWENA_STATUS.APPROVED
    && state.completeness===AWENA_COMPLETENESS.PARTIAL
    && Array.isArray(state.frameImages)
    && state.frameImages.length>=4;
  const approvedPartialVideo=state.status===AWENA_STATUS.APPROVED
    && state.completeness===AWENA_COMPLETENESS.PARTIAL
    && Boolean(state.coverage?.video);
  const approvedPartialSteps=approvedManualFrames || approvedPartialVideo;
  if(!reviewMotionReady && !approvedPartialSteps) continue;
  if(!grouped.has(key)) grouped.set(key,[]);
  grouped.get(key).push({exercise,rawKey,key,state,reviewMotionReady,approvedPartialSteps,approvedManualFrames,approvedPartialVideo});
}

function rank(entry){
  const ex=entry.exercise; let score=0;
  if(String(ex.source||"").toLowerCase()==="mss")score+=10000;
  if(String(ex.id||"")===entry.key)score+=5000;
  score+=(ex.instructions||[]).length*5;
  return score;
}
let aliasEntriesCollapsed=0;
for(const [key,entries] of grouped){
  const rep=[...entries].sort((a,b)=>rank(b)-rank(a))[0];
  const {exercise,state}=rep;
  const reviewMotionReady=entries.some((e)=>e.reviewMotionReady);
  const approvedPartialSteps=entries.some((e)=>e.approvedPartialSteps);
  const approvedManualFrames=entries.some((e)=>e.approvedManualFrames);
  const approvedPartialVideo=entries.some((e)=>e.approvedPartialVideo);
  const reviewDir=generatedDirectory(AWENA_STATUS.REVIEW,key);
  const stepFiles=Array.from({length:4},(_,i)=>path.join(reviewDir,`awena-step-${String(i+1).padStart(2,"0")}.webp`));
  if(stepFiles.every((file)=>fssync.existsSync(file))) continue;
  const aliases=entries.map((e)=>({exerciseId:e.exercise.id,assetKey:e.rawKey,name:e.exercise.name,source:e.exercise.source}));
  aliasEntriesCollapsed+=Math.max(0,aliases.length-1);
  const instructions=(exercise.instructions||[]).slice(0,4);
  const authoritativeVideo=state.videoUrl||null;
  const approvedFrameSources=Array.isArray(state.frameImages)?state.frameImages:[];
  const stepStrategy=approvedManualFrames
    ? "APPROVED_MANUAL_FRAMES"
    : approvedPartialVideo
      ? "APPROVED_VIDEO_PHASE_FRAMES"
      : "COMFYUI_DEDICATED_STILLS";
  jobs.push({
    version:4,
    exerciseId:exercise.id,
    representativeExerciseId:exercise.id,
    assetKey:key,
    canonicalAssetKey:key,
    aliases,
    name:exercise.name,
    registryStatus:state.status,
    registryCompleteness:state.completeness,
    generationMode:approvedPartialSteps?"STEPS_ONLY_SUPPLEMENT":"STEPS_FOR_REVIEW_PACK",
    stepStrategy,
    requestedComponents:["steps"],
    preserveApprovedComponents:true,
    identityReference:"public/fit/exercise-media/pushup/awena-step-01-start.webp",
    authoritativeVideoReference:authoritativeVideo,
    motionReference:reviewMotionReady?path.join(reviewDir,"awena-preview.webm"):publicUrlToLocal(authoritativeVideo),
    approvedFrameSources,
    phaseFractions:[0.10,0.30,0.50,0.70],
    outputDirectory:reviewDir,
    outputs:["awena-step-01.webp","awena-step-02.webp","awena-step-03.webp","awena-step-04.webp"],
    prompts:Array.from({length:4},(_,i)=>[
      "AWENA, exact same face, ponytail, athletic proportions and black/color-accent fitness outfit as the identity reference.",
      `Exercise: ${exercise.name}. Pedagogical step ${i+1}/4.`,
      instructions[i]||fallback[i],
      `Equipment: ${exercise.equipment||"bodyweight"}.`,
      "Produce a clean instructional still, full body and all equipment completely visible with generous margins, biomechanically correct pose, stable camera, transparent background, no text, no watermark.",
      "This is a dedicated step illustration: a dedicated pedagogical still, not an arbitrary frame extracted from the motion video.",
    ].join(" ")),
  });
}
await fs.mkdir("var/fit-awena",{recursive:true});
const summary={
  version:3,
  createdAt:new Date().toISOString(),
  catalogSnapshotGeneratedAt:catalog.generatedAt||null,
  count:jobs.length,
  approvedPartialStepsOnly:jobs.filter((job)=>job.generationMode==="STEPS_ONLY_SUPPLEMENT").length,
  reviewPackSteps:jobs.filter((job)=>job.generationMode==="STEPS_FOR_REVIEW_PACK").length,
  reusableApprovedFrames:jobs.filter((job)=>job.stepStrategy==="APPROVED_MANUAL_FRAMES").length,
  reusableApprovedVideo:jobs.filter((job)=>job.stepStrategy==="APPROVED_VIDEO_PHASE_FRAMES").length,
  requiresComfyUiImageWorkflow:jobs.filter((job)=>job.stepStrategy==="COMFYUI_DEDICATED_STILLS").length,
  uniqueCanonicalPacks:jobs.length,
  aliasEntriesCollapsed,
  policy:{canonicalPackDeduplication:true,validatedVideoPosterNeverReplaced:true,dedicatedPedagogicalImagesOnly:true},
  jobs,
};
await fs.writeFile("var/fit-awena/step-queue.json",JSON.stringify(summary,null,2));
console.log(JSON.stringify({count:summary.count,approvedPartialStepsOnly:summary.approvedPartialStepsOnly,reviewPackSteps:summary.reviewPackSteps,reusableApprovedFrames:summary.reusableApprovedFrames,reusableApprovedVideo:summary.reusableApprovedVideo,requiresComfyUiImageWorkflow:summary.requiresComfyUiImageWorkflow,uniqueCanonicalPacks:summary.uniqueCanonicalPacks,aliasEntriesCollapsed:summary.aliasEntriesCollapsed},null,2));
console.log("AWENA dedicated step queue -> var/fit-awena/step-queue.json");
