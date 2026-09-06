#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");

const java = read("android/app/src/main/java/com/multisportsscoring/app/InlineAdMobPlugin.java");
const bridge = read("src/monetization/inlineAdMob.ts");
const panel = read("src/monetization/MonetizationSettingsPanel.tsx");

assert.ok(java.includes("setOnPaidEventListener"), "OnPaidEventListener absent");
assert.ok(java.includes('notifyListeners("inlineAdPaid"'), "callback inlineAdPaid absent");
assert.ok(java.includes('notifyListeners("inlineAdImpression"'), "callback impression absent");
assert.ok(java.includes('notifyListeners("inlineAdClicked"'), "callback clic absent");
assert.ok(java.includes("getValueMicros()"), "valeur ILRD absente");

assert.ok(bridge.includes("InlineAdMobTelemetrySnapshot"), "snapshot télémétrie absent");
assert.ok(bridge.includes('listen("inlineAdPaid"'), "listener paid absent");
assert.ok(bridge.includes("valueMicrosByCurrency"), "agrégation revenu absente");
assert.ok(bridge.includes("testImpressions"), "séparation impressions test/live absente");

assert.ok(panel.includes("BANNIÈRES LIVE · CONTRÔLE DES IMPRESSIONS"), "panneau de preuve live absent");
assert.ok(panel.includes("IMPRESSIONS LIVE"), "compteur impressions absent");
assert.ok(panel.includes("ÉVÉNEMENTS PAYÉS"), "compteur paid absent");

console.log("✅ ADMOB ILRD / BANNIÈRES LIVE V81 OK");
