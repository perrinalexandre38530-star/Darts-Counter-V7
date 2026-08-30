import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const read=(file)=>fs.readFileSync(file,"utf8");
const registry=read("tools/fit-awena-registry.mjs");
const queue=read("tools/build-fit-awena-jobs.mjs");
const runner=read("tools/run-comfyui-awena-batch.mjs");
const media=read("src/fit/fitAwenaMedia.ts");
const motion=read("src/pages/fit/FitExerciseMotion.tsx");
const review=read("tools/review-fit-awena-media.mjs");
const stepJobs=read("tools/build-fit-awena-step-jobs.mjs");
const pkg=JSON.parse(read("package.json"));

for(const status of ["APPROVED","REVIEW","MISSING","REJECTED"])assert.ok(registry.includes(status),`status ${status} absent`);
assert.ok(registry.includes('manualAwenaKeyForExercise')&&registry.includes('bench')&&registry.includes('pushup'),"manual AWENA resolver absent");
for(const file of [
  "public/fit/motions/awena/premium/bench/motion.mp4",
  "public/fit/motions/awena/premium/bench/poster.webp",
  "public/fit/exercise-media/bench/awena-step-03-bottom.webp",
  "public/fit/motions/awena/premium/pushup/motion.webm",
])assert.ok(fs.existsSync(file)&&fs.statSync(file).size>1000,`manual AWENA asset absent: ${file}`);
assert.ok(queue.includes('registryState.status===AWENA_STATUS.APPROVED')&&queue.includes('registryState.status===AWENA_STATUS.REVIEW'),"queue does not protect approved/review media");
assert.ok(queue.includes('generatedDirectory(AWENA_STATUS.REVIEW'),"generated jobs are not routed to REVIEW");
assert.ok(media.includes('/approved')&&!media.includes('`${FIT_AWENA_LIBRARY_ROOT}/${assetKey}`'),"runtime generated path is not approval-gated");
assert.ok(motion.indexOf('knownVideo && knownVideoOk') < motion.indexOf('generatedVideoOk ?'),"manual AWENA is not authoritative in renderer");
assert.ok(runner.includes('timeoutMinutes')&&runner.includes('COMFYUI_TIMEOUT_MINUTES')&&runner.includes('inflightDir'),"runner timeout/resume protection absent");
assert.ok(runner.includes('humanReviewRequired:true')&&runner.includes('HORIZONTAL_BANDING')&&runner.includes('MASK_TOO_SMALL'),"technical QA/review gate absent");
assert.ok(review.includes('--approve')&&review.includes('--reject')&&review.includes('AWENA manuel'),"human review command incomplete");
assert.ok(review.includes('Les review-keyframes ne sont PAS des étapes pédagogiques')&&stepJobs.includes('dedicated step illustration'),"arbitrary video frames can still be promoted as exercise steps");
assert.ok(pkg.scripts?.['fit:awena:registry']&&pkg.scripts?.['fit:awena:review']&&pkg.scripts?.['fit:awena:steps:queue'],"registry/review/step scripts missing from package.json");
assert.ok(pkg.scripts?.['test:esports'],"V37 package.json scripts were overwritten");
console.log("✅ FIT AWENA REGISTRY V112 OK");
console.log("   manual APPROVED > generated APPROVED > REVIEW/REJECTED quarantined");
console.log("   queue protection · long timeout · resume · visual review gate · technical QA");
