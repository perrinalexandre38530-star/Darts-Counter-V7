import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const androidDir = path.join(root, "android");
const propsPath = path.join(androidDir, "key.properties");
const gradlePath = path.join(androidDir, "app", "build.gradle");

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(propsPath)) fail("android/key.properties absent. Exécute tools/create-android-upload-key.ps1 avant de construire l'AAB Play.");
const raw = fs.readFileSync(propsPath, "utf8");
const props = Object.fromEntries(raw.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
  const i = line.indexOf("=");
  return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
}));
for (const key of ["storeFile", "storePassword", "keyAlias", "keyPassword"]) {
  if (!props[key]) fail(`android/key.properties: ${key} manquant.`);
}
const keyPath = path.resolve(androidDir, props.storeFile);
if (!fs.existsSync(keyPath)) fail(`Keystore introuvable: ${keyPath}`);
if (!fs.existsSync(gradlePath)) fail("android/app/build.gradle introuvable.");
const gradle = fs.readFileSync(gradlePath, "utf8");
if (!gradle.includes("playSigningConfigured") || !gradle.includes("signingConfig signingConfigs.release")) fail("La signature release Gradle n'est pas configurée.");
if (!/applicationId\s+["']com\.multisportsscoring\.app["']/.test(gradle)) fail("Package Android inattendu.");
const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1] || 0);
const versionName = gradle.match(/versionName\s+["']([^"']+)["']/)?.[1] || "";
if (!Number.isInteger(versionCode) || versionCode < 1) fail("versionCode Android invalide.");
if (!versionName) fail("versionName Android absent.");
console.log(`✅ Signature Google Play prête: ${path.basename(keyPath)} / alias ${props.keyAlias}`);
console.log(`✅ com.multisportsscoring.app — versionCode ${versionCode} — versionName ${versionName}`);
