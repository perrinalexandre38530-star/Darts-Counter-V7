#!/usr/bin/env node
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const must = (ok, message) => {
  if (!ok) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
};

const academy = read("src/awena/AwenaProceduralAcademy.ts");
const core = read("src/awena/AwenaCore.ts");
const info = read("src/components/InfoDot.tsx");
const sync = read("src/pages/SyncCenter.tsx");
const calibration = read("src/pages/CameraScoringCalibration.tsx");
const overlay = read("src/awena/components/AwenaOverlay.tsx");
const pkg = JSON.parse(read("package.json"));

const ids = Array.from(academy.matchAll(/\n\s*id:\s*"([^"]+)"/g)).map((m) => m[1]);
must(ids.length >= 55, `Procedural Academy coverage: ${ids.length} entries`);
for (const id of [
  "cast-start","cast-diagnostic","viewer-create","viewer-diagnostic",
  "camera-source-choice","phone-companion-link","camera-local-calibration",
  "bridge-websocket","scolia","grandarts","bluetooth-scoring",
  "recovery-export","recovery-restore","nas-backup","r2-backup",
  "peer-sync-qr","cloud-token-sync","cloud-diagnostic","auto-backup",
  "tournament-create","tournament-teams","x01-guided-config","awena-x01-voice",
  "history-source","safe-troubleshooting"
]) must(ids.includes(id), `Critical workflow present: ${id}`);

must(core.includes("answerAwenaProceduralAcademy"), "Procedural Academy wired into AwenaCore");
must(core.includes("awenaProceduralStepCount"), "Awena identity advertises guided procedural depth");
must(academy.includes("followupText") && academy.includes("etape|step") && academy.includes("marche pas"), "Follow-up procedural dialog supported");
must(academy.includes("isAwenaComplexRoute") && academy.includes("awenaProcedurePromptForRoute"), "Complex-route contextual helpers present");
must(info.includes("awenaComplexTakesOver") && info.includes("awenaProcedurePromptForRoute"), "InfoDot hands complex screens to Awena");
must(sync.includes("Guide Sync & Partage") && sync.includes('route: "sync_center"'), "Sync Center direct contextual Awena entry present");
must(calibration.includes('route: "camera_scoring_calibration"') && calibration.includes("awenaProcedurePromptForRoute"), "Camera calibration direct contextual Awena entry present");
must(overlay.includes("LOCAL V8.7") && overlay.includes("ACADEMY + VOICE X01"), "Awena overlay advertises V8.7 Academy");
must(overlay.includes("proceduralRoute") && overlay.includes("Tutoriel pas à pas") && overlay.includes("Diagnostic"), "Complex screens expose tutorial/prerequisite/diagnostic shortcuts in Awena overlay");
must(pkg.scripts["test:awena:v87"] === "node tools/test-awena-v87-procedural-academy.mjs", "package.json V8.7 test script present");

const aliasArrays = Array.from(academy.matchAll(/aliases:\s*(\[[^\n]+\])/g)).map((m) => {
  try { return JSON.parse(m[1]); } catch { return []; }
});
const aliases = aliasArrays.reduce((n, arr) => n + arr.length, 0);
must(aliases >= 220, `Broad phrasing coverage: ${aliases} aliases`);

const stepArrays = Array.from(academy.matchAll(/steps:\s*(\[[^\n]+\])/g)).map((m) => {
  try { return JSON.parse(m[1]); } catch { return []; }
});
const steps = stepArrays.reduce((n, arr) => n + arr.length, 0);
must(steps >= 300, `Guided procedural depth: ${steps} steps`);

console.log(`\n✅ AWENA V8.7 Procedural Academy: OK`);
console.log(`   ${ids.length} guided workflows`);
console.log(`   ${aliases} understood phrasings`);
console.log(`   ${steps} explicit guided steps`);
