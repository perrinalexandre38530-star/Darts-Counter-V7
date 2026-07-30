#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const androidRoot = path.join(root, "android");
const manifestPath = path.join(androidRoot, "app", "src", "main", "AndroidManifest.xml");
const stringsPath = path.join(androidRoot, "app", "src", "main", "res", "values", "strings.xml");
const appGradlePath = path.join(androidRoot, "app", "build.gradle");
const envPath = path.join(root, ".env");

const GOOGLE_TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713";

function readDotEnv() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function fail(message) {
  console.error(`\n[ADMOB ANDROID] ${message}\n`);
  process.exit(1);
}

function modeFromEnv(values) {
  const explicit = String(process.env.VITE_ADMOB_MODE || values.VITE_ADMOB_MODE || "").trim().toLowerCase();
  if (["production", "prod", "live"].includes(explicit)) return "production";
  if (["real_test", "real-test", "device_test", "device-test"].includes(explicit)) return "real_test";
  if (["google_test", "google-test", "demo", "test"].includes(explicit)) return "google_test";
  const legacy = String(process.env.VITE_ADMOB_TEST_MODE || values.VITE_ADMOB_TEST_MODE || "1").trim();
  return legacy === "0" ? "production" : "google_test";
}

function isValidAppId(value) {
  return /^ca-app-pub-\d{16}~\d{10}$/.test(String(value || "").trim());
}

const dotenv = readDotEnv();
const mode = modeFromEnv(dotenv);
const configuredAppId = String(
  process.env.ADMOB_ANDROID_APP_ID ||
  process.env.VITE_ADMOB_ANDROID_APP_ID ||
  dotenv.VITE_ADMOB_ANDROID_APP_ID ||
  ""
).trim();

const appId = mode === "google_test" ? GOOGLE_TEST_APP_ID : configuredAppId;
if (mode !== "google_test" && !isValidAppId(appId)) {
  fail(`${mode} exige un vrai VITE_ADMOB_ANDROID_APP_ID au format ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY.`);
}

if (!fs.existsSync(androidRoot)) fail("android/ introuvable. Lance d'abord npm run android:bootstrap.");
if (!fs.existsSync(manifestPath)) fail(`AndroidManifest.xml introuvable: ${manifestPath}`);
if (!fs.existsSync(stringsPath)) fail(`strings.xml introuvable: ${stringsPath}`);
if (!fs.existsSync(appGradlePath)) fail(`build.gradle introuvable: ${appGradlePath}`);

let manifest = fs.readFileSync(manifestPath, "utf8");
const meta = `        <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="@string/admob_app_id" />`;

if (/android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"/.test(manifest)) {
  manifest = manifest.replace(
    /\s*<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[\s\S]*?\/>/m,
    `\n${meta}`,
  );
} else {
  const idx = manifest.indexOf("</application>");
  if (idx < 0) fail("Balise </application> introuvable dans AndroidManifest.xml.");
  manifest = `${manifest.slice(0, idx)}${meta}\n    ${manifest.slice(idx)}`;
}
fs.writeFileSync(manifestPath, manifest);

let strings = fs.readFileSync(stringsPath, "utf8");
const escapedId = appId.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const line = `    <string name="admob_app_id">${escapedId}</string>`;
if (/<string\s+name="admob_app_id">[\s\S]*?<\/string>/.test(strings)) {
  strings = strings.replace(/\s*<string\s+name="admob_app_id">[\s\S]*?<\/string>/, `\n${line}`);
} else {
  const idx = strings.indexOf("</resources>");
  if (idx < 0) fail("Balise </resources> introuvable dans strings.xml.");
  strings = `${strings.slice(0, idx)}${line}\n${strings.slice(idx)}`;
}
fs.writeFileSync(stringsPath, strings);

// InlineAdMobPlugin.java utilise directement le SDK Google Mobile Ads.
// cap sync ne doit jamais laisser le module app sans cette dépendance.
let appGradle = fs.readFileSync(appGradlePath, "utf8");
const gmaDependency = '    implementation "com.google.android.gms:play-services-ads:${rootProject.ext.playServicesAdsVersion}"';
if (!appGradle.includes("com.google.android.gms:play-services-ads:")) {
  const depIndex = appGradle.indexOf("dependencies {");
  if (depIndex < 0) fail("Bloc dependencies introuvable dans android/app/build.gradle");
  const insertAt = depIndex + "dependencies {".length;
  appGradle = `${appGradle.slice(0, insertAt)}\n${gmaDependency}${appGradle.slice(insertAt)}`;
  fs.writeFileSync(appGradlePath, appGradle);
}

console.log("\n✅ Configuration Android AdMob appliquée.");
console.log(`   Mode   : ${mode}`);
console.log(`   App ID : ${appId}`);
if (mode === "google_test") {
  console.log("   Les IDs de démonstration Google restent actifs : aucune monétisation.");
} else if (mode === "real_test") {
  console.log("   Vrais IDs AdMob + appareils de test : aucun trafic réel ne doit être comptabilisé.");
} else {
  console.log("   Configuration production : le contrôle de release vérifiera tous les blocs et app-ads.txt.");
}
