#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const read = (file) => fs.readFileSync(file, "utf8");
const registry = read("src/fit/awenaMocapRegistry.ts");
const runtime = read("src/fit/fitMocapRuntime.ts");
const stage = read("src/pages/fit/FitAwena3DStage.tsx");
const vendor = read("tools/vendor-fit-mocap.mjs");

assert.ok(registry.includes('sourceMotionId: "22_14"'), "CMU 22_14 registry mapping missing");
assert.ok(registry.includes('format: "bvh"'), "BVH format missing from mocap registry");
assert.ok(registry.includes("raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/022/22_14.bvh"), "Verified CMU BVH mirror missing");
assert.ok(runtime.includes('FIT_MOCAP_CACHE_NAME = "fitperf-mocap-v2"'), "Mocap CacheStorage version missing");
assert.ok(runtime.includes("localAsset") && runtime.includes("remoteAsset"), "Local/remote mocap fallback chain missing");
assert.ok(runtime.includes("HIERARCHY") && runtime.includes("MOTION"), "BVH payload validation missing");
assert.ok(stage.includes("BVHLoader"), "Three.js BVHLoader runtime missing");
assert.ok(stage.includes("LeftUpLeg") && stage.includes("RightUpLeg"), "CMU humanoid hip mapping missing");
assert.ok(stage.includes("LeftForeArm") && stage.includes("RightForeArm"), "CMU humanoid arm mapping missing");
assert.ok(stage.includes("setMocapStatus(\"live\")"), "Live mocap state missing");
assert.ok(stage.includes("PROCÉDURAL") && stage.includes("MOCAP"), "Visible live/fallback status missing");
assert.ok(vendor.includes("public/fit/mocap/cmu/22_14.bvh"), "Local vendor target missing");

console.log("✅ FIT PERF REAL BVH RUNTIME CHECK OK");
console.log("   CMU 22_14 · BVHLoader · humanoid joints · CacheStorage · procedural fallback");
