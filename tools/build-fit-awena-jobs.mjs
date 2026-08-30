import fs from "node:fs/promises";
import path from "node:path";
import { assetKey, loadCatalog } from "./fit-awena-catalog-source.mjs";

const ROOT = process.cwd();
const MEDIA_ROOT = path.join(ROOT, "public/fit/awena-library");
const OUT_DIR = path.join(ROOT, "var/fit-awena");
const QUEUE_FILE = path.join(OUT_DIR, "comfyui-queue.json");
const CATALOG_FILE = path.join(OUT_DIR, "catalog.json");
const REPORT_FILE = path.join(OUT_DIR, "queue-report.json");
const forceAll = process.argv.includes("--all");
const refresh = process.argv.includes("--refresh");

async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }

function cameraHint(exercise) {
  const n=String(exercise.name||"").toLowerCase();
  if (/bench|press|fly|chest/.test(n) && /bench|barre|halt|dumbbell|barbell/i.test(String(exercise.equipment||""))) return "three-quarter side view, slightly elevated camera, entire bench and equipment visible";
  if (/squat|lunge|deadlift|hinge|calf|leg press|hip thrust/.test(n)) return "three-quarter side view at hip height, feet and equipment fully visible";
  if (/pull.?up|chin.?up|pulldown|lat pull/.test(n)) return "front three-quarter view, full overhead range and hands fully visible";
  if (/row|curl|tricep|raise|shoulder/.test(n)) return "three-quarter front view, elbows hands and equipment clearly visible";
  if (/plank|push.?up|burpee|mountain climber|crunch|sit.?up/.test(n)) return "side three-quarter view, full body from head to feet visible";
  if (/stretch|mobility|rotation|yoga/.test(n)) return "clean three-quarter instructional view emphasizing joint position and full range";
  return "clean three-quarter instructional camera angle chosen to make the complete movement path obvious";
}

function negativePrompt() {
  return [
    "camera movement, camera shake, zoom, dolly, pan, tilt, camera rotation, changing perspective, changing framing, scene change, background change",
    "character moving out of frame, cropped body, cropped feet, cropped hands, cut off head",
    "wrong exercise, wrong equipment, equipment changing shape, hands sliding unexpectedly, feet sliding unexpectedly, incorrect grip",
    "hips rising, hips sagging, arched back, bent knees when not required, twisted torso, asymmetric movement, uncontrolled bouncing",
    "changing face, different face, face morphing, changing hairstyle, changing hair length, changing body shape, changing clothing, changing leggings, changing shoes, changing gloves",
    "extra arms, extra legs, extra hands, extra feet, extra fingers, missing fingers, fused fingers, malformed fingers, deformed hands, deformed feet, broken wrists, broken elbows, broken shoulders, broken anatomy, duplicated limbs",
    "warping, morphing, melting body, ghosting, flickering, temporal inconsistency, jitter, motion artifacts, excessive motion blur",
    "text, subtitles, logo, watermark"
  ].join(", ");
}

function basePrompt(exercise) {
  const instructions=(exercise.instructions||[]).slice(0,6).join(" ");
  const muscles=[exercise.muscle,...(exercise.rawPrimaryMuscles||[]).slice(0,3)].filter(Boolean).join(", ");
  return [
    "AWENA, the exact same adult athletic female fitness coach as the supplied identity reference image. Preserve her identity perfectly: same face and facial features, same brown ponytail hairstyle, same athletic body proportions, same black sports bra, same black leggings with colorful accents, same black fingerless gloves and same black athletic shoes with colorful details.",
    `Demonstrate the fitness exercise: ${exercise.name}.`,
    `Equipment: ${exercise.equipment || "bodyweight"}. Primary target: ${muscles || "full body"}.`,
    instructions ? `Technique to follow: ${instructions}` : "Use biomechanically correct standard technique for this named exercise.",
    cameraHint(exercise)+".",
    "Full body completely inside frame at every moment with generous margin around head, hands, equipment and feet.",
    "Professional exercise encyclopedia demonstration, neutral expression, one complete controlled repetition, stable locked camera, realistic anatomy and educational clarity. Preserve identity, anatomy, clothing, equipment, framing and character scale throughout the entire animation.",
    "Subject isolated for alpha matting. Final deliverable must have a genuinely transparent background, not a black or white background, with clean hair and limb edges.",
    "No text, no labels, no watermark."
  ].join(" ");
}

function stepPrompts(exercise) {
  const source=(exercise.instructions||[]).slice(0,4);
  const fallback=[
    "correct starting/setup position before the repetition begins",
    "controlled first half of the movement with correct joint alignment",
    "end-range or peak contraction position with correct posture",
    "controlled return toward the starting position, maintaining tension"
  ];
  return Array.from({length:4},(_,index)=>[
    "AWENA, exact same identity and outfit as the reference image.",
    `Exercise: ${exercise.name}.`,
    `Instructional step ${index+1} of 4: ${source[index] || fallback[index]}.`,
    cameraHint(exercise)+".",
    "Single clear still frame, full body and all equipment fully visible, realistic anatomy, transparent background, no text, no watermark."
  ].join(" "));
}

function motionPrompt(exercise) {
  return `AWENA performs one technically correct complete repetition of ${exercise.name}, from setup through full range and back to the start. Controlled educational tempo, stable camera, consistent face/body/outfit/equipment, no cuts, seamless short loop, whole body always visible.`;
}

async function mediaState(key) {
  const dir=path.join(MEDIA_ROOT,key);
  const video=path.join(dir,"awena-preview.webm");
  const poster=path.join(dir,"awena-poster.webp");
  const steps=Array.from({length:4},(_,i)=>path.join(dir,`awena-step-${String(i+1).padStart(2,"0")}.webp`));
  return { video:await exists(video), poster:await exists(poster), steps:await Promise.all(steps.map(exists)) };
}

const catalog=await loadCatalog({refresh,allowCache:true});
await fs.mkdir(OUT_DIR,{recursive:true});
await fs.mkdir(MEDIA_ROOT,{recursive:true});
await fs.writeFile(CATALOG_FILE,JSON.stringify(catalog,null,2));

const jobs=[]; let complete=0; let partial=0;
for(const exercise of catalog.exercises){
  const key=assetKey(exercise); const state=await mediaState(key); const stepCount=state.steps.filter(Boolean).length;
  const isComplete=state.video&&state.poster&&stepCount>=4;
  if(isComplete&&!forceAll){complete++;continue;}
  if(state.video||state.poster||stepCount)partial++;
  jobs.push({
    version:1,
    exerciseId:exercise.id,
    assetKey:key,
    name:exercise.name,
    source:exercise.source,
    muscle:exercise.muscle,
    equipment:exercise.equipment,
    level:exercise.level||"",
    category:exercise.category||"",
    existingReferenceImages:exercise.imagePaths||[],
    existingReferenceVideos:exercise.videoUrls||[],
    motionDriver:{
      required:true,
      existingVideoCandidates:exercise.videoUrls||[],
      photoCandidates:exercise.imagePaths||[],
      strategy:(exercise.videoUrls||[]).length?"existing-video":"needs-generated-driver",
    },
    instructions:exercise.instructions||[],
    output:{
      directory:`public/fit/awena-library/${key}`,
      video:"awena-preview.webm",
      poster:"awena-poster.webp",
      steps:["awena-step-01.webp","awena-step-02.webp","awena-step-03.webp","awena-step-04.webp"],
      transparent:true,
      alphaCodec:"VP9 yuva420p WebM",
    },
    comfyui:{
      prompt:basePrompt(exercise),
      negativePrompt:negativePrompt(),
      motionPrompt:motionPrompt(exercise),
      stepPrompts:stepPrompts(exercise),
      seed:Math.abs([...String(exercise.id)].reduce((a,c)=>((a*31)+c.charCodeAt(0))|0,17)),
    },
  });
}
const report={generatedAt:new Date().toISOString(),catalogCount:catalog.exercises.length,alreadyComplete:complete,partial,queued:jobs.length,withExistingMotionVideo:jobs.filter((j)=>j.existingReferenceVideos?.length).length,withReferencePhotos:jobs.filter((j)=>j.existingReferenceImages?.length).length,needsGeneratedMotionDriver:jobs.filter((j)=>!j.existingReferenceVideos?.length).length,sources:catalog.sources,sourceErrors:catalog.errors||[]};
await fs.writeFile(QUEUE_FILE,JSON.stringify({version:1,createdAt:new Date().toISOString(),catalogCount:catalog.exercises.length,jobs},null,2));
await fs.writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
console.log(`Queue: ${QUEUE_FILE}`);
