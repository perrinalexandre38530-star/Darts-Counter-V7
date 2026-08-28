#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const fitStore = read("src/fit/fitStore.ts");
const freeDb = read("src/fit/freeExerciseCatalog.ts");
const catalogEngine = read("src/fit/fitCatalogEngine.ts");
const mocap = read("src/fit/awenaMocapRegistry.ts");
const stage3d = read("src/pages/fit/FitAwena3DStage.tsx");
const renderer = read("src/pages/fit/FitExerciseMotion.tsx");
const plan = read("src/pages/fit/FitPerfPlan.tsx");
const module = read("src/pages/fit/FitPerfModule.tsx");

assert.ok(freeDb.includes("yuhonas/free-exercise-db/main/dist/exercises.json"), "URL Free Exercise DB absente");
assert.ok(freeDb.includes("Unlicense / public domain"), "Licence Free Exercise DB non enregistrée");
assert.ok(freeDb.includes("registerExternalFitExercises"), "Catalogue libre non enregistré dans FIT PERF");
assert.ok(fitStore.includes("FREE_EXERCISE_CACHE_KEY") && fitStore.includes("externalExerciseRegistry"), "Cache/registre exercices externes absent");
assert.ok(plan.includes("loadFitCatalog") && catalogEngine.includes("loadFreeExerciseCatalog") && catalogEngine.includes("loadWgerExerciseCatalog"), "Catalogue multi-sources non branché dans la page Exercices");
assert.ok(module.includes("loadFitCatalog") && module.includes("pickerExercises"), "Catalogue multi-sources non branché dans le sélecteur de séance");
assert.ok(renderer.includes("FitAwena3DStage") && renderer.includes("hasFitAwena3DMotion"), "Rendu 3D non branché avant le fallback 2D");
assert.ok(renderer.includes("freeExerciseImageUrl"), "Référence visuelle open DB absente pour les mouvements non mappés");
assert.ok(stage3d.includes("three@0.180.0") && stage3d.includes("WebGLRenderer"), "Runtime Three.js 3D absent");
assert.ok(stage3d.includes("pointerdown") && stage3d.includes("GLISSER ↔"), "Rotation interactive 3D absente");
assert.ok(stage3d.includes("setPaused") && stage3d.includes("PAUSE"), "Contrôle pause 3D absent");
assert.ok(mocap.includes('sourceMotionId: "22_14"') && mocap.includes('source: "cmu"'), "Mapping CMU Squat 22_14 absent");
assert.ok(fs.existsSync("public/fit/mocap/README.md"), "Documentation mocap libre absente");
assert.ok(fs.existsSync("public/fit/models/awena/README.md"), "Slot modèle AWENA GLB absent");

for (const key of ["squat", "deadlift", "rdl", "goblet", "curl", "lateral-raise", "ohp", "pullup", "row", "bench", "plank", "hip-thrust", "leg-press"]) {
  assert.ok(stage3d.includes(`${key}: {`) || stage3d.includes(`"${key}": {`), `Mouvement 3D absent : ${key}`);
}

console.log("✅ FIT PERF FREE 3D PIPELINE CHECK OK");
console.log("   Free Exercise DB · cache local · sélecteur séance");
console.log("   Three.js runtime · rotation · pause · fallback 2D");
console.log("   CMU 22_14 mapping · mocap vendor slots · AWENA GLB slot");
