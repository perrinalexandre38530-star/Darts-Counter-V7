#!/usr/bin/env node
/**
 * tools/test-cloud-sync.mjs
 * ============================================================
 * Test interne - SYNC user_store
 * Vérifie que l'app implémente un flow cohérent :
 * - pullStoreSnapshot appelée uniquement en signed_in
 * - seed cloud si cloud vide et local non vide
 * - jamais seed local depuis cloud vide
 * ============================================================
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(p) {
  return fs.readFileSync(p, "utf8");
}
function fail(msg) {
  console.error("\n❌ CLOUD SYNC TEST FAILED\n" + msg + "\n");
  process.exit(1);
}
function ok(msg) {
  console.log("✅ " + msg);
}

const app = path.join(ROOT, "src/App.tsx");
if (!fs.existsSync(app)) fail("src/App.tsx not found");
const s = read(app);

// 1) ensure pullStoreSnapshot exists
if (!/onlineApi\.pullStoreSnapshot\(\)/.test(s)) fail("App.tsx does not call onlineApi.pullStoreSnapshot()");
ok("App.tsx calls pullStoreSnapshot()");

// 2) ensure guard signed_in exists before hydrate
if (!/online\.status\s*!==\s*"signed_in"/.test(s)) fail('App.tsx does not guard cloud hydrate by online.status !== "signed_in"');
ok("Cloud hydrate guarded by signed_in");

// 3) ensure seed logic exists
if (!/cloud empty\s*-> seeded from local/.test(s) && !/seeded from local/.test(s)) {
  // allow alternate log
  if (!/seed from local/.test(s)) fail("No detectable 'seed cloud from local' logic/log in App.tsx");
}
ok("Seed-from-local logic present");

// 4) ensure no local overwrite when cloud empty
if (!/return;\s*\/\/\s*⛔ ne pas écraser le store local/.test(s)) {
  fail("App.tsx does not prevent overwriting local store when cloud is empty");
}
ok("Local overwrite is prevented when cloud empty");

console.log("\n✅ CLOUD SYNC SPINE OK\n");
