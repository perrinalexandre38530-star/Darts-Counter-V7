#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const read = (file) => fs.readFileSync(file, "utf8");
const fitStore = read("src/fit/fitStore.ts");
const catalog = read("src/fit/awenaPremiumMotions.ts");
const player = read("src/pages/fit/FitPremiumMotionPlayer.tsx");
const renderer = read("src/pages/fit/FitExerciseMotion.tsx");

const exerciseBlock = fitStore.split("export const FIT_EXERCISES")[1]?.split("];", 1)[0] || "";
const exerciseIds = [...exerciseBlock.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]);
assert.ok(exerciseIds.length >= 18, "Bibliothèque FIT PERF trop courte");

for (const exerciseId of exerciseIds) {
  const slotPattern = new RegExp(`(?:^|\\n)\\s*(?:"${exerciseId}"|${exerciseId.replace(/-/g, "\\-")}):\\s*\\{`);
  assert.ok(slotPattern.test(catalog), `Slot premium AWENA absent pour ${exerciseId}`);
}

for (const feature of ["IntersectionObserver", "visibilitychange", "prefers-reduced-motion", "requestAnimationFrame", "playsInline", "preload=\"metadata\""]) {
  assert.ok(player.includes(feature), `Optimisation lecteur premium manquante : ${feature}`);
}
assert.ok(player.includes("video?.sources") && player.includes("frameSequence"), "Le lecteur ne gère pas VIDEO + FRAMES");
assert.ok(renderer.includes("FitPremiumMotionPlayer") && renderer.includes("hasAwenaPremiumMotion"), "Le lecteur premium n'est pas branché dans FitExerciseMotion");
assert.ok(renderer.includes("FitAwenaMotionStage"), "Le fallback procédural AWENA a été supprimé");

const pilot = ["squat", "bench", "deadlift", "curl", "pullup"];
for (const exerciseId of pilot) {
  const frameDir = path.join("public", "fit", "motions", "awena", "premium", exerciseId, "frames");
  assert.ok(fs.existsSync(frameDir), `Dossier frames premium absent : ${exerciseId}`);
  const frameFiles = fs.readdirSync(frameDir).filter((file) => /^frame-\d+\.webp$/.test(file)).sort();
  assert.ok(frameFiles.length >= 5, `Moins de 5 keyframes premium pour ${exerciseId}`);
  for (const frame of frameFiles) {
    const filePath = path.join(frameDir, frame);
    assert.ok(fs.statSync(filePath).size > 8_000, `Frame premium anormalement légère/corrompue : ${filePath}`);
  }
  const poster = path.join("public", "fit", "motions", "awena", "premium", exerciseId, "poster.webp");
  assert.ok(fs.existsSync(poster) && fs.statSync(poster).size > 8_000, `Poster premium absent : ${exerciseId}`);
}

console.log("✅ AWENA PREMIUM MOTION CHECK OK");
console.log(`   ${exerciseIds.length} slots premium prêts · VIDEO > FRAMES > PROCEDURAL`);
console.log(`   ${pilot.length} exercices avec keyframes WebP installées`);
console.log("   Visibilité · pause onglet · reduced motion · preload · fallback contrôlés");
