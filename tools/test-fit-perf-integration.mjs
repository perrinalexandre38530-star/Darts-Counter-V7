#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const app = read("src/App.tsx");
const gameSelect = read("src/pages/GameSelect.tsx");
const sportContext = read("src/contexts/SportContext.tsx");
const bottomNav = read("src/components/BottomNav.tsx");
const quickSwitch = read("src/components/SportQuickSwitch.tsx");
const fitStore = read("src/fit/fitStore.ts");
const fitHome = read("src/pages/fit/FitPerfHome.tsx");
const fitModule = read("src/pages/fit/FitPerfModule.tsx");
const fitPlan = read("src/pages/fit/FitPerfPlan.tsx");
const fitDetail = read("src/pages/fit/FitExerciseDetailDialog.tsx");
const fitBodyMap = read("src/pages/fit/FitBodyMap.tsx");
const fitStats = read("src/pages/fit/FitPerfStatsPage.tsx");
const fitExerciseMotion = read("src/pages/fit/FitExerciseMotion.tsx");
const fitAwenaMotionStage = read("src/pages/fit/FitAwenaMotionStage.tsx");
const fitPremiumMotionPlayer = read("src/pages/fit/FitPremiumMotionPlayer.tsx");
const fitPremiumCatalog = read("src/fit/awenaPremiumMotions.ts");

assert.ok(gameSelect.includes('id: "fit"'), "FIT PERF absent du sélecteur de sports");
assert.ok(gameSelect.includes("logo-fit-performance"), "Logo FIT PERF absent du sélecteur");
assert.ok(sportContext.includes('| "fit"'), "SportId ne contient pas FIT PERF");
assert.ok(app.includes("<FitPerfHome"), "Home FIT PERF non routée");
assert.ok(app.includes("<FitPerfModule"), "Module séance FIT PERF non routé");
assert.ok(app.includes("<FitPerfPlan"), "Plan FIT PERF non routé");
assert.ok(app.includes("<FitPerfStatsPage"), "Stats FIT PERF non routées");
assert.ok(bottomNav.includes('sportLc === "fit"'), "BottomNav FIT PERF absente");
assert.ok(bottomNav.includes('k: "fit_plan"'), "Onglet Exercices FIT PERF absent");
assert.ok(quickSwitch.includes('id: "fit"'), "FIT PERF absent du switch rapide");
assert.ok(fitStore.includes("mss-fit-perf-sessions-v1"), "Persistance FIT PERF absente");
assert.ok(fitStore.includes("estimated1RM"), "Calcul 1RM FIT PERF absent");
assert.ok(fitModule.includes("RÉCUPÉRATION"), "Chronomètre récupération FIT PERF absent");
assert.ok(fitModule.includes("appendFitSession"), "Sauvegarde des séances FIT PERF absente");
assert.ok(fitHome.includes("FIT SCORE"), "Dashboard performance FIT PERF incomplet");
assert.ok(fitPlan.includes("FitExerciseDetailDialog") && fitPlan.includes("FIT_TEMPLATES") && fitPlan.includes("favorites"), "Centre exercices/programmes FIT PERF incomplet");
assert.ok(fitDetail.includes("fit-detail-tabs") && fitDetail.includes("MUSCLES") && fitDetail.includes("DÉTAILS") && fitDetail.includes("OBJECTIF") && fitDetail.includes("RECORDS"), "Nouvelle fiche exercice compacte incomplète");
assert.ok(fitDetail.includes("PUSHUP_HIGH") && fitDetail.includes("fit-detail-lightbox") && fitDetail.includes("MULTISPORTS") && fitDetail.includes("fit-detail-page-watermark"), "Médias/branding de la fiche exercice incomplets");
assert.ok(!fitDetail.includes("AWENA COACH · GUIDE MOUVEMENT") && !fitDetail.includes("AWENA PREMIUM MOTION"), "Anciens libellés AWENA encore visibles dans la fiche exercice");
assert.ok(fitBodyMap.includes("body-muscles@1.0.0") && fitBodyMap.includes("BodyChart") && fitBodyMap.includes("fitBodyMusclePulse"), "Carte anatomique Body Muscles FIT PERF absente");
assert.ok(!fitBodyMap.includes("FRONT_HOTSPOTS") && !fitBodyMap.includes("anatomyImage"), "Ancien mannequin/hotspots FIT PERF encore actif");
assert.ok(fitStats.includes("1RM"), "Stats records FIT PERF incomplètes");
assert.ok(fitExerciseMotion.includes("FitAwenaMotionStage") && fitExerciseMotion.includes("FitPremiumMotionPlayer"), "Renderer AWENA Premium Motion non branché");
assert.ok(fitPremiumMotionPlayer.includes("frameSequence") && fitPremiumMotionPlayer.includes("<video"), "Lecteur premium frames/vidéo incomplet");
assert.ok(fitPremiumCatalog.includes("AWENA_PREMIUM_MOTION_SLOTS"), "Catalogue premium AWENA absent");
assert.ok(!fitExerciseMotion.includes("/fit/motions/awena/${exercise.id}.webp"), "Ancien chargement placeholder AWENA encore actif");
const exerciseBlock = fitStore.split("export const FIT_EXERCISES")[1]?.split("];", 1)[0] || "";
const exerciseIds = [...exerciseBlock.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]);
assert.ok(exerciseIds.length >= 18, "Bibliothèque d’exercices FIT PERF anormalement réduite");
for (const exerciseId of exerciseIds) {
  const covered = fitAwenaMotionStage.includes(`${exerciseId}: {`) || fitAwenaMotionStage.includes(`"${exerciseId}": {`);
  assert.ok(covered, `Animation AWENA manquante pour ${exerciseId}`);
}

console.log("✅ FIT PERF INTEGRATION CHECK OK");
console.log("   Sélecteur · Home · Séance · Exercices · Stats · BottomNav · QuickSwitch");
console.log("   Séries individuelles · volume · chrono repos · records · 1RM · localStorage");
console.log(`   AWENA Motion · ${exerciseIds.length} exercices animés couverts`);
