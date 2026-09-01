import fs from "node:fs";
import assert from "node:assert/strict";

const config = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const main = fs.readFileSync("src/main.tsx", "utf8");
const native = fs.readFileSync("src/lib/nativePlatform.ts", "utf8");
const bootstrap = fs.readFileSync("tools/bootstrap-android-capacitor.mjs", "utf8");
const androidVars = fs.readFileSync("android/variables.gradle", "utf8");

assert.equal(config.appId, "com.multisportsscoring.app", "Package Android incorrect.");
assert.equal(config.appName, "MULTISPORTS SCORING", "Nom Android incorrect.");
assert.equal(config.webDir, "dist", "webDir doit pointer vers dist.");
assert.ok(native.includes("isCapacitorNativeRuntime"), "Détection Capacitor native absente.");
assert.ok(main.includes("isCapacitorNativeRuntime"), "main.tsx ne protège pas encore le boot natif.");
assert.ok(main.includes("prepareNativeContentPackServiceWorker"), "SW dédié aux content packs natifs absent.");
assert.ok(main.includes("Native Capacitor: Content Pack Service Worker actif"), "Diagnostic SW content packs natif absent.");
assert.ok(!main.includes("Native Capacitor: Service Worker désactivé"), "La régression qui désactive tout SW natif est revenue.");
assert.ok(bootstrap.includes('CAP_VERSION = "8.4.2"'), "Version Capacitor bootstrap inattendue.");
assert.ok(bootstrap.includes('APP_ID = "com.multisportsscoring.app"'), "App ID bootstrap inattendu.");
assert.ok(
  /minSdkVersion\s*=\s*(?:2[6-9]|[3-9]\d|\d{3,})/.test(androidVars),
  "Health Connect exige minSdkVersion >= 26."
);


const syncNeedle = 'run("npx", ["cap", "sync", "android"])';
const syncPos = bootstrap.indexOf(syncNeedle);
const admobPos = bootstrap.indexOf('run("node", ["./tools/configure-android-admob.mjs"])');
const billingPos = bootstrap.indexOf('run("node", ["./tools/configure-android-play-billing.mjs"])');

assert.ok(syncPos >= 0 && admobPos > syncPos && billingPos > admobPos,
  "Ordre Android incorrect : sync doit précéder AdMob puis Billing.");
assert.equal(bootstrap.indexOf(syncNeedle, syncPos + 1), -1,
  "Un second cap sync après configuration native réintroduirait la régression.");

assert.ok(
  pkg.scripts["android:sync"]?.includes("android:configure-admob") &&
  pkg.scripts["android:sync"]?.includes("android:configure-play"),
  "android:sync doit réappliquer AdMob et Play Billing après cap sync."
);
assert.ok(
  pkg.scripts["android:run"]?.includes("--no-sync"),
  "android:run doit utiliser cap run --no-sync pour préserver la configuration native."
);

console.log("✅ ANDROID CAPACITOR BOOTSTRAP CHECK OK");
console.log(`   ${config.appName} · ${config.appId} · webDir=${config.webDir}`);
console.log("   Pipeline sûr : sync → AdMob → Billing → release-check → cap run --no-sync");
