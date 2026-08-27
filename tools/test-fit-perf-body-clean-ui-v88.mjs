#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const plan = fs.readFileSync("src/pages/fit/FitPerfPlan.tsx", "utf8");
const map = fs.readFileSync("src/pages/fit/FitBodyMap.tsx", "utf8");

const bodyStart = plan.indexOf('{tab === "body"');
const libraryStart = plan.indexOf('{(tab === "library"', bodyStart);
const bodyBlock = plan.slice(bodyStart, libraryStart);

assert.ok(bodyStart >= 0 && libraryStart > bodyStart, "Bloc Corps FIT PERF introuvable");
assert.ok(!bodyBlock.includes("renderExerciseCard"), "L’onglet Corps affiche encore des cartes d’exercices");
assert.ok(!bodyBlock.includes("FIT_MUSCLE_ORDER.filter"), "Le carrousel de groupes musculaires encombre encore l’onglet Corps");
assert.ok(bodyBlock.includes('setTab("library")'), "Le bouton Voir ne bascule pas vers la bibliothèque filtrée");
assert.ok(bodyBlock.includes('FitIcon name="library"'), "Le bouton Voir n’utilise pas une icône cohérente avec la navigation");
assert.ok(bodyBlock.includes('t("VOIR", "VIEW", "VER")'), "Libellé Voir absent du mini-bloc sélection");
assert.ok(!map.includes("Body Muscles · Apache 2.0"), "La légende technique Body Muscles est encore affichée dans l’UI");
assert.ok(!map.includes("ZONE CIBLÉE"), "La carte anatomique duplique encore le résumé de sélection");
assert.ok(map.includes("fitBodyMusclePulse"), "Le comportement rouge pulsant doit rester actif");

console.log("✅ FIT PERF BODY CLEAN UI V88 CHECK OK");
console.log("   Corps = sélection uniquement · mini résumé · Voir -> bibliothèque filtrée");
