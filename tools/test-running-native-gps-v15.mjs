import fs from "node:fs";
import assert from "node:assert/strict";

const bridge = fs.readFileSync("src/activity/nativeActivityTracking.ts", "utf8");
const running = fs.readFileSync("src/pages/running/RunningModule.tsx", "utf8");
const plugin = fs.readFileSync("android/app/src/main/java/com/multisportsscoring/app/ActivityTrackingPlugin.java", "utf8");
const service = fs.readFileSync("android/app/src/main/java/com/multisportsscoring/app/ActivityTrackingService.java", "utf8");
const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

assert.ok(bridge.includes('registerPlugin("ActivityTracking")'), "Le bridge Running doit enregistrer explicitement le plugin Capacitor natif.");
assert.ok(bridge.includes("waitForNativeGpsFix"), "Le test GPS doit attendre un vrai fix natif.");
assert.ok(running.includes("copy.gpsSearching"), "L'UI doit distinguer la recherche GPS d'un GPS prêt.");
assert.ok(running.includes("gpsFixVerified"), "GPS VÉRIFIÉ ne doit être affiché qu'après un vrai point GPS.");
assert.ok(running.includes("lastGpsPointAtRef"), "La perte de signal doit être détectée.");
assert.ok(plugin.includes("hasLocationPermission()"), "Le plugin doit vérifier les permissions Android réelles.");
assert.ok(service.includes("getLastKnownLocation"), "Le service doit pouvoir amorcer rapidement avec un fix Android récent.");
assert.ok(manifest.includes("android.permission.ACCESS_FINE_LOCATION"), "ACCESS_FINE_LOCATION absent du manifeste.");
assert.ok(manifest.includes("android.permission.FOREGROUND_SERVICE_LOCATION"), "FOREGROUND_SERVICE_LOCATION absent du manifeste.");

console.log("✅ RUNNING NATIVE GPS V15 CHECK OK");
console.log("   Capacitor custom plugin registration + real GPS fix + signal-loss states + Android permissions");
