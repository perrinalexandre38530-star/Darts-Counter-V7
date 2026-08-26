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

for (const feature of ["IntersectionObserver", "visibilitychange", "prefers-reduced-motion", "requestAnimationFrame", "playsInline", 'preload="metadata"']) {
  assert.ok(player.includes(feature), `Optimisation lecteur premium manquante : ${feature}`);
}
assert.ok(player.includes("video?.sources") && player.includes("frameSequence"), "Le lecteur ne gère pas VIDEO + FRAMES");
assert.ok(renderer.includes("FitPremiumMotionPlayer") && renderer.includes("hasAwenaPremiumMotion"), "Le lecteur premium n'est pas branché dans FitExerciseMotion");
assert.ok(renderer.includes("FitAwena3DStage") && renderer.includes("FitAwenaMotionStage"), "La chaîne fallback 3D/procédurale AWENA a été cassée");

const declaredFrameSlots = [...catalog.matchAll(/frameSequence:\s*frames\("([^"]+)",\s*(\d+)/g)]
  .map((match) => ({ exerciseId: match[1], count: Number(match[2]) }));
assert.ok(declaredFrameSlots.length >= 2, "Aucune vraie séquence premium déclarée");

for (const { exerciseId, count } of declaredFrameSlots) {
  const frameDir = path.join("public", "fit", "motions", "awena", "premium", exerciseId, "frames");
  assert.ok(fs.existsSync(frameDir), `Dossier frames premium absent : ${exerciseId}`);
  const frameFiles = fs.readdirSync(frameDir).filter((file) => /^frame-\d+\.webp$/.test(file)).sort();
  assert.equal(frameFiles.length, count, `Nombre de frames incohérent pour ${exerciseId}`);
  for (const frame of frameFiles) {
    const filePath = path.join(frameDir, frame);
    assert.ok(fs.statSync(filePath).size > 8_000, `Frame premium anormalement légère/corrompue : ${filePath}`);
  }
  const poster = path.join("public", "fit", "motions", "awena", "premium", exerciseId, "poster.webp");
  assert.ok(fs.existsSync(poster) && fs.statSync(poster).size > 8_000, `Poster premium absent : ${exerciseId}`);
}


const squatVideo = path.join("public", "fit", "motions", "awena", "premium", "squat", "motion.mp4");
const squatPoster = path.join("public", "fit", "motions", "awena", "premium", "squat", "poster.webp");
assert.ok(catalog.includes('`${ROOT}/squat/motion.mp4`') && catalog.includes('type: "video/mp4"'), "Vidéo premium locale Squat non déclarée");
assert.ok(fs.existsSync(squatVideo) && fs.statSync(squatVideo).size > 80_000 && fs.statSync(squatVideo).size < 500_000, "Vidéo Squat absente ou mal compressée");
assert.ok(fs.existsSync(squatPoster) && fs.statSync(squatPoster).size > 5_000, "Poster Squat absent");
assert.ok(player.includes('compact ? 168 : 260'), "Affichage premium encore trop petit pour les vidéos AWENA");

console.log("✅ AWENA PREMIUM MOTION CHECK OK");
console.log(`   ${exerciseIds.length} slots premium prêts · VIDEO > FRAMES > REAL 3D > PROCEDURAL`);
console.log(`   ${declaredFrameSlots.length} exercices avec séquences WebP réellement installées`);
console.log("   Visibilité · pause onglet · reduced motion · preload · fallback contrôlés");
