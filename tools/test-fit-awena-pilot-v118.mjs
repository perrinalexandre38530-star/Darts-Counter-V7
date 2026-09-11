import fs from "node:fs";
import assert from "node:assert/strict";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
for(const name of ["fit:awena:pilot:build","fit:awena:pilot:refs","fit:awena:pilot:run","fit:awena:pilot:review","fit:awena:pilot:video:queue"]){assert.ok(pkg.scripts?.[name],`script missing: ${name}`);}
assert.equal(pkg.version,"1.0.0-rc16","package version changed unexpectedly");
const build=fs.readFileSync("tools/build-fit-awena-pilot-jobs.mjs","utf8");const prep=fs.readFileSync("tools/prepare-fit-awena-pilot-references.mjs","utf8");const run=fs.readFileSync("tools/run-comfyui-awena-image-pilot.mjs","utf8");const review=fs.readFileSync("tools/review-fit-awena-pilot-steps.mjs","utf8");const gate=fs.readFileSync("tools/build-fit-awena-video-jobs-from-reviewed-steps.mjs","utf8");
assert.match(build,/defaultPilotSize:10/);assert.match(build,/stillsBeforeVideo:true/);assert.match(build,/awena-01\.webp/);
assert.match(prep,/guide-\$\{String\(i\+1\)/);assert.match(run,/one|STILLS READY/i);assert.match(run,/maxAttempts/);assert.match(run,/exerciseCooldownSeconds/);assert.match(run,/SaveImage/);assert.match(run,/flux-2-klein-4b-fp8\.safetensors/);assert.match(review,/APPROVED_FOR_VIDEO/);assert.match(gate,/HUMAN_REVIEWED_STILLS_REQUIRED|humanReviewedStillsRequired/);assert.match(gate,/VIDEO_FROM_REVIEWED_STEPS/);
assert.ok(pkg.scripts["fit:awena:run"],"existing WAN runner script removed");
console.log("FIT AWENA V118 image-first pilot pipeline: OK");
