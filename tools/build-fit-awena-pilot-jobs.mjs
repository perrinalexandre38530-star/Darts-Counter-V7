import fs from "node:fs/promises";
import path from "node:path";
import { loadCatalog, assetKey } from "./fit-awena-catalog-source.mjs";
import { resolveCatalogImageUrls } from "./fit-awena-driver-utils.mjs";
import { AWENA_COMPLETENESS, AWENA_STATUS, canonicalAwenaAssetKey, resolveAwenaRegistryState } from "./fit-awena-registry.mjs";

function arg(name,fallback=""){const i=process.argv.indexOf(name);return i>=0?(process.argv[i+1]??fallback):fallback;}
function flag(name){return process.argv.includes(name);}
const refresh=flag("--refresh");
const limit=Math.max(1,Number(arg("--limit","10"))||10);
const match=arg("--match","").trim().toLowerCase();
const includePhotoFallback=flag("--include-photo-fallback");
const OUT=path.resolve("var/fit-awena/pilot/pilot-queue.json");
const IDENTITY=path.resolve("public/fit/exercise-media/burpee/awena-01.webp");

function uniq(v){return [...new Set((v||[]).filter(Boolean).map(String))];}
function normalizeEquipment(v){return String(v||"unknown").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function cameraHint(exercise){
  const n=String(exercise.name||"").toLowerCase();
  if(/bench|press|fly|chest/.test(n))return "three-quarter side view, slightly elevated, all equipment visible";
  if(/squat|lunge|deadlift|hinge|calf|leg press|hip thrust/.test(n))return "three-quarter side view at hip height, both feet and all equipment visible";
  if(/pull.?up|chin.?up|pulldown/.test(n))return "front three-quarter view with complete overhead range and both hands visible";
  if(/row|curl|tricep|raise|shoulder/.test(n))return "three-quarter front view with both elbows, hands and all equipment visible";
  if(/plank|push.?up|burpee|mountain climber|crunch|sit.?up/.test(n))return "side three-quarter instructional view with whole body visible";
  return "clean three-quarter instructional view matching the movement reference";
}
function equipmentRule(exercise){
  const eq=String(exercise.equipment||"bodyweight");
  const free=/(bodyweight|poids du corps|none|aucun|sans)/i.test(eq);
  return free
    ? "No external equipment. Both hands and both feet must be anatomically complete."
    : `Equipment integrity is mandatory: ${eq}. Every required implement must be complete, correctly shaped, physically plausible and fully visible. Never crop or merge equipment into a hand.`;
}
function stepPrompt(exercise,index){
  const instructions=(exercise.instructions||[]).slice(0,4);
  const fallback=[
    "setup / starting position before the repetition",
    "controlled first half of the movement",
    "end-range / bottom / peak position",
    "controlled return / finish position",
  ];
  return [
    "The input image is a TWO-PANEL reference board. LEFT panel is AWENA and defines identity/outfit ONLY. RIGHT panel defines exercise pose, body geometry and equipment ONLY.",
    "Create ONE new instructional image, NOT a collage and NOT a split-screen.",
    `AWENA demonstrates ${exercise.name}, pedagogical phase ${index+1}/4: ${instructions[index]||fallback[index]}.`,
    "Preserve AWENA exactly from the LEFT panel: same adult female face, same brown ponytail, same athletic proportions, same black fitness outfit with multicolor accents, same gloves and shoes.",
    "Copy the pose mechanics and required equipment from the RIGHT panel, but NEVER copy the right-side person's identity, face, clothing or background.",
    equipmentRule(exercise),
    `${cameraHint(exercise)}.`,
    "Show AWENA completely from hair to soles. Keep every hand, foot and equipment item inside frame with at least 12 percent empty safety margin around the complete subject.",
    "Plain uniform neutral light-gray studio background (#EFEFEF), no scenery, no gradients, no colored bands, no red background, no text, no watermark, no logo, no shadow crossing the frame.",
    "Correct anatomy, correct number of limbs and fingers, no fused equipment, no crop, no close-up.",
  ].join(" ");
}
function score(exercise,images,videos){
  let s=videos.length*1000+Math.min(8,images.length)*80+Math.min(10,(exercise.instructions||[]).length)*10;
  if(String(exercise.source||"").toLowerCase()==="mss")s+=200;
  if(!/(autre|unknown)/i.test(String(exercise.equipment||"")))s+=50;
  return s;
}

const catalog=await loadCatalog({refresh,allowCache:true});
const candidates=[];
for(const exercise of catalog.exercises){
  const raw=assetKey(exercise);const key=canonicalAwenaAssetKey(exercise,raw);const state=await resolveAwenaRegistryState(exercise,raw);
  if(state.status===AWENA_STATUS.APPROVED&&state.completeness===AWENA_COMPLETENESS.COMPLETE)continue;
  if(state.status===AWENA_STATUS.REVIEW)continue;
  if(match&&!`${exercise.name} ${exercise.id} ${key}`.toLowerCase().includes(match))continue;
  const videos=uniq(exercise.videoUrls||[]);const images=uniq(resolveCatalogImageUrls(exercise));
  const referenceMode=videos.length?"VIDEO":images.length>=2?"PHOTOS":null;
  if(!referenceMode)continue;
  if(referenceMode==="PHOTOS"&&!includePhotoFallback)continue;
  candidates.push({exercise,raw,key,state,videos,images,referenceMode,rank:score(exercise,images,videos)});
}

// Prefer real motion videos and diversify muscle/equipment so the pilot actually
// exercises several kinds of movement instead of ten near-duplicates.
candidates.sort((a,b)=>b.rank-a.rank||a.exercise.name.localeCompare(b.exercise.name,"fr"));
const selected=[];const seenPairs=new Set();
for(const c of candidates){
  const pair=`${String(c.exercise.muscle||"").toLowerCase()}|${normalizeEquipment(c.exercise.equipment)}`;
  if(seenPairs.has(pair))continue;
  selected.push(c);seenPairs.add(pair);if(selected.length>=limit)break;
}
for(const c of candidates){if(selected.length>=limit)break;if(selected.includes(c))continue;selected.push(c);}

const jobs=selected.slice(0,limit).map((c)=>({
  version:1,
  pipeline:"AWENA_IMAGE_FIRST_PILOT_V118",
  stage:"REFERENCE_PREP",
  exerciseId:c.exercise.id,
  assetKey:c.key,
  name:c.exercise.name,
  source:c.exercise.source,
  muscle:c.exercise.muscle,
  equipment:c.exercise.equipment,
  instructions:c.exercise.instructions||[],
  identityReference:path.relative(process.cwd(),IDENTITY).replaceAll("\\","/"),
  referenceMode:c.referenceMode,
  referenceVideos:c.videos,
  referenceImages:c.images,
  phaseFractions:[0.08,0.32,0.56,0.80],
  outputRoot:`var/fit-awena/pilot/generated/${c.key}`,
  referenceRoot:`var/fit-awena/pilot/references/${c.key}`,
  steps:Array.from({length:4},(_,i)=>({index:i+1,prompt:stepPrompt(c.exercise,i)})),
  policy:{stillsBeforeVideo:true,humanReviewBeforeVideo:true,oneJobAtATime:true,rawWanVideoForbiddenAtThisStage:true},
}));

await fs.mkdir(path.dirname(OUT),{recursive:true});
const payload={version:1,generatedAt:new Date().toISOString(),catalogSnapshotGeneratedAt:catalog.generatedAt||null,catalogCount:catalog.exercises.length,requested:limit,selected:jobs.length,videoReferenceJobs:jobs.filter(j=>j.referenceMode==="VIDEO").length,photoFallbackJobs:jobs.filter(j=>j.referenceMode==="PHOTOS").length,policy:{pilotOnly:true,defaultPilotSize:10,preferExistingMotionVideo:true,noVideoGenerationUntilStillsPassHumanReview:true},jobs};
await fs.writeFile(OUT,JSON.stringify(payload,null,2));
console.log(JSON.stringify({catalogCount:payload.catalogCount,selected:payload.selected,videoReferenceJobs:payload.videoReferenceJobs,photoFallbackJobs:payload.photoFallbackJobs},null,2));
console.log(`Pilot queue -> ${path.relative(process.cwd(),OUT)}`);
