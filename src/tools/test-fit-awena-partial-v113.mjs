import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { AWENA_COMPLETENESS, summarizeAwenaCoverage } from "./fit-awena-registry.mjs";

const complete = summarizeAwenaCoverage({ video: true, poster: true, steps: 4, frames: 0 });
assert.equal(complete.completeness, AWENA_COMPLETENESS.COMPLETE);
assert.deepEqual(complete.missingComponents, []);

const missingVideo = summarizeAwenaCoverage({ video: false, poster: true, steps: 4, frames: 5 });
assert.equal(missingVideo.completeness, AWENA_COMPLETENESS.PARTIAL);
assert.deepEqual(missingVideo.missingComponents, ["video"]);

const missingSteps = summarizeAwenaCoverage({ video: true, poster: true, steps: 0, frames: 0 });
assert.equal(missingSteps.completeness, AWENA_COMPLETENESS.PARTIAL);
assert.deepEqual(missingSteps.missingComponents, ["steps"]);

const empty = summarizeAwenaCoverage({});
assert.equal(empty.completeness, AWENA_COMPLETENESS.NONE);
assert.deepEqual(empty.missingComponents, ["video", "poster", "steps"]);

const jobsSource = await fs.readFile(new URL("./build-fit-awena-jobs.mjs", import.meta.url), "utf8");
assert.match(jobsSource, /VIDEO_ONLY_SUPPLEMENT/);
assert.match(jobsSource, /approvedCompleteNeverQueued/);
assert.match(jobsSource, /validatedPosterAndStepsNeverRegenerated/);

const stepSource = await fs.readFile(new URL("./build-fit-awena-step-jobs.mjs", import.meta.url), "utf8");
assert.match(stepSource, /STEPS_ONLY_SUPPLEMENT/);
assert.match(stepSource, /dedicated pedagogical still/i);

const reviewSource = await fs.readFile(new URL("./review-fit-awena-media.mjs", import.meta.url), "utf8");
assert.match(reviewSource, /Refus d'écraser un composant APPROVED existant/);
assert.match(reviewSource, /Premier pack AWENA incomplet/);
assert.match(reviewSource, /supplementForExistingApprovedPack/);

const auditSource = await fs.readFile(new URL("./audit-fit-awena-media.mjs", import.meta.url), "utf8");
for (const field of ["approvedComplete", "approvedPartial", "missingVideo", "missingSteps", "rejectedArtifacts"]) assert.ok(auditSource.includes(field), `audit field missing: ${field}`);

console.log("FIT AWENA V113 partial/complete policy: OK");
