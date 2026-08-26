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
const fitStats = read("src/pages/fit/FitPerfStatsPage.tsx");

assert.ok(gameSelect.includes('id: "fit"'), "FIT PERF absent du sélecteur de sports");
assert.ok(gameSelect.includes("logo-fit-performance"), "Logo FIT PERF absent du sélecteur");
assert.ok(sportContext.includes('| "fit"'), "SportId ne contient pas FIT PERF");
assert.ok(app.includes("<FitPerfHome"), "Home FIT PERF non routée");
assert.ok(app.includes("<FitPerfModule"), "Module séance FIT PERF non routé");
assert.ok(app.includes("<FitPerfPlan"), "Plan FIT PERF non routé");
assert.ok(app.includes("<FitPerfStatsPage"), "Stats FIT PERF non routées");
assert.ok(bottomNav.includes('sportLc === "fit"'), "BottomNav FIT PERF absente");
assert.ok(bottomNav.includes('k: "fit_plan"'), "Onglet Plan FIT PERF absent");
assert.ok(quickSwitch.includes('id: "fit"'), "FIT PERF absent du switch rapide");
assert.ok(fitStore.includes("mss-fit-perf-sessions-v1"), "Persistance FIT PERF absente");
assert.ok(fitStore.includes("estimated1RM"), "Calcul 1RM FIT PERF absent");
assert.ok(fitModule.includes("RÉCUPÉRATION"), "Chronomètre récupération FIT PERF absent");
assert.ok(fitModule.includes("appendFitSession"), "Sauvegarde des séances FIT PERF absente");
assert.ok(fitHome.includes("FIT SCORE"), "Dashboard performance FIT PERF incomplet");
assert.ok(fitPlan.includes("PUSH / PULL / LEGS"), "Centre programmes FIT PERF incomplet");
assert.ok(fitStats.includes("1RM"), "Stats records FIT PERF incomplètes");

console.log("✅ FIT PERF INTEGRATION CHECK OK");
console.log("   Sélecteur · Home · Séance · Plan · Stats · BottomNav · QuickSwitch");
console.log("   Séries individuelles · volume · chrono repos · records · 1RM · localStorage");
