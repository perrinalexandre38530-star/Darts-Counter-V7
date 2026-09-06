#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const stores = JSON.parse(read("config/distribution-stores.json"));

assert.equal(stores.play.packageId, "com.multisportsscoring.app");
assert.equal(stores.galaxy.packageId, "com.multisportsscoring.app.galaxy");
assert.ok(read("android/app/build.gradle").includes("MSS_APPLICATION_ID"));
assert.ok(read("android/app/src/build.gradle").includes("MSS_APPLICATION_ID"));
assert.ok(read("src/monetization/adMobConfig.ts").includes("admob.galaxy.public.json"));
assert.ok(read("src/monetization/nativeBilling.ts").includes('getDistributionStore() === "galaxy"'));
assert.ok(read("tools/build-galaxy-store-aab.mjs").includes("Galaxy Store App Signing"));
assert.ok(read("tools/check-galaxy-store-readiness.mjs").includes("Android Developer Verification"));

console.log("✅ GALAXY STORE TOOLCHAIN V1 OK");
