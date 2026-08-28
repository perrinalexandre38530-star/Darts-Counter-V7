#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const store = read("src/fit/fitStore.ts");
const wger = read("src/fit/wgerExerciseCatalog.ts");
const engine = read("src/fit/fitCatalogEngine.ts");
const free = read("src/fit/freeExerciseCatalog.ts");
const plan = read("src/pages/fit/FitPerfPlan.tsx");
const module = read("src/pages/fit/FitPerfModule.tsx");
const motion = read("src/pages/fit/FitExerciseMotion.tsx");
const detail = read("src/pages/fit/FitExerciseDetailDialog.tsx");

assert.ok(store.includes('"wger"') && store.includes("WGER_EXERCISE_CACHE_KEY"), "Le store ne supporte pas wger");
assert.ok(wger.includes("/exerciseinfo/?limit=250") && wger.includes("MAX_PAGES = 12"), "Pagination wger incomplète");
assert.ok(wger.includes("normalizeWgerExerciseRow") && wger.includes('source: "wger"'), "Normalisation wger absente");
assert.ok(wger.includes("rawPrimaryMuscles") && wger.includes("sourceLicense") && wger.includes("mediaLicense"), "Métadonnées/licences wger incomplètes");
assert.ok(wger.includes("imagePaths: images") && wger.includes("videoUrls: videos"), "Médias wger non conservés");
assert.ok(engine.includes("mergeFitExerciseCatalogs") && engine.includes("signature(exercise)") && engine.includes("richness(exercise)"), "Déduplication multi-sources absente");
assert.ok(engine.includes("Promise.allSettled") && engine.includes("loadFreeExerciseCatalog") && engine.includes("loadWgerExerciseCatalog"), "Chargement parallèle multi-sources absent");
assert.ok(free.includes('/^https?:\\/\\//i.test(path)'), "Les médias absolus wger ne sont pas supportés par le résolveur d'image");
assert.ok(plan.includes("getCachedFitCatalog") && plan.includes("loadFitCatalog") && !plan.includes("loadFreeExerciseCatalog"), "La bibliothèque principale n'utilise pas le moteur multi-sources");
assert.ok(module.includes("getCachedFitCatalog") && module.includes("loadFitCatalog") && module.includes("pickerExercises = catalog.exercises"), "La séance n'utilise pas le catalogue fusionné");
assert.ok(motion.includes('exercise.source === "wger"'), "Les images wger ne sont pas utilisables dans le rendu exercice");
assert.ok(detail.includes("exercise.sourceLicense") && detail.includes("exercise.mediaLicense"), "Attribution des sources externes absente de la fiche");

console.log("✅ FIT CATALOG ENGINE V107 OK");
console.log("   wger · cache · pagination · médias · licences · déduplication · bibliothèque · séance");
