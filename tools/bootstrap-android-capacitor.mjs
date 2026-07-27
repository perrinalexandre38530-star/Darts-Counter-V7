#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const CAP_VERSION = "8.4.2";
const APP_ID = "com.multisportsscoring.app";
const APP_NAME = "MULTISPORTS SCORING";
const ADMOB_PLUGIN_VERSION = "8.0.0";

function fail(message) {
  console.error(`\n[ANDROID BOOTSTRAP] ${message}\n`);
  process.exit(1);
}

function run(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const res = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.error) fail(res.error.message);
  if (res.status !== 0) process.exit(res.status || 1);
}

if (!fs.existsSync(path.join(root, "package.json"))) fail("package.json introuvable.");
if (!fs.existsSync(path.join(root, "capacitor.config.json"))) fail("capacitor.config.json introuvable.");

const config = JSON.parse(fs.readFileSync(path.join(root, "capacitor.config.json"), "utf8"));
if (config.appId !== APP_ID || config.appName !== APP_NAME || config.webDir !== "dist") {
  fail("Identité Capacitor inattendue. Attendu: MULTISPORTS SCORING / com.multisportsscoring.app / dist.");
}

const nodeMajor = Number(process.versions.node.split(".")[0] || 0);
if (nodeMajor < 22) {
  console.warn(`⚠️ Node ${process.versions.node} détecté. Pour le chantier Android V8, utilise de préférence Node 22 LTS ou plus récent.`);
}

run("npm", ["install", `@capacitor/core@${CAP_VERSION}`, `@capacitor/android@${CAP_VERSION}`, `@capacitor-community/admob@${ADMOB_PLUGIN_VERSION}`]);
run("npm", ["install", "--save-dev", `@capacitor/cli@${CAP_VERSION}`]);

const androidDir = path.join(root, "android");
if (!fs.existsSync(androidDir)) run("npx", ["cap", "add", "android"]);
else console.log("\n✓ Dossier android/ déjà présent : cap add ignoré.");

run("npm", ["run", "build"]);
run("npx", ["cap", "sync", "android"]);
run("node", ["./tools/configure-android-admob.mjs"]);
run("node", ["./tools/configure-android-play-billing.mjs"]);
run("npx", ["cap", "sync", "android"]);

console.log("\n✅ Shell Android Capacitor prêt.");
console.log(`   App : ${APP_NAME}`);
console.log(`   Package : ${APP_ID}`);
console.log(`   Capacitor : ${CAP_VERSION}`);
console.log(`   AdMob plugin : ${ADMOB_PLUGIN_VERSION} (Google TEST par défaut)`);
console.log("   Play Billing : 9.1.0 / achats verrouillés jusqu’à vérification serveur");
console.log("   Étape locale suivante : npm run android:open");
