import fs from "node:fs";
import assert from "node:assert/strict";

const config = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const main = fs.readFileSync("src/main.tsx", "utf8");
const native = fs.readFileSync("src/lib/nativePlatform.ts", "utf8");
const bootstrap = fs.readFileSync("tools/bootstrap-android-capacitor.mjs", "utf8");

assert.equal(config.appId, "com.multisportsscoring.app", "Package Android incorrect.");
assert.equal(config.appName, "MULTISPORTS SCORING", "Nom Android incorrect.");
assert.equal(config.webDir, "dist", "webDir doit pointer vers dist.");
assert.ok(native.includes("isCapacitorNativeRuntime"), "Détection Capacitor native absente.");
assert.ok(main.includes("isCapacitorNativeRuntime"), "main.tsx ne protège pas encore le boot natif.");
assert.ok(main.includes("Native Capacitor: Service Worker désactivé"), "Politique SW native absente.");
assert.ok(bootstrap.includes('CAP_VERSION = "8.4.2"'), "Version Capacitor bootstrap inattendue.");
assert.ok(bootstrap.includes('APP_ID = "com.multisportsscoring.app"'), "App ID bootstrap inattendu.");

console.log("✅ ANDROID CAPACITOR BOOTSTRAP CHECK OK");
console.log(`   ${config.appName} · ${config.appId} · webDir=${config.webDir}`);
