#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const androidRoot = path.join(root, "android");
const manifestPath = path.join(androidRoot, "app", "src", "main", "AndroidManifest.xml");
const stringsPath = path.join(androidRoot, "app", "src", "main", "res", "values", "strings.xml");

const GOOGLE_TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const appId = String(process.env.ADMOB_ANDROID_APP_ID || GOOGLE_TEST_APP_ID).trim();

function fail(message) {
  console.error(`\n[ADMOB ANDROID] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(androidRoot)) fail("android/ introuvable. Lance d'abord npm run android:bootstrap.");
if (!fs.existsSync(manifestPath)) fail(`AndroidManifest.xml introuvable: ${manifestPath}`);
if (!fs.existsSync(stringsPath)) fail(`strings.xml introuvable: ${stringsPath}`);

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

const isGoogleTest = appId === GOOGLE_TEST_APP_ID;
console.log("\n✅ Configuration Android AdMob appliquée.");
console.log(`   App ID : ${appId}`);
console.log(`   Mode   : ${isGoogleTest ? "GOOGLE TEST (sûr pour développement)" : "PRODUCTION / PERSONNALISÉ"}`);
if (isGoogleTest) console.log("   Aucune vraie impression publicitaire ne sera monétisée avec cet App ID de démonstration.");
