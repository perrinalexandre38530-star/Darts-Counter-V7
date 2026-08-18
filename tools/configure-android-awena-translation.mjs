#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appGradlePath = path.join(root, "android", "app", "build.gradle");
const pluginPath = path.join(root, "android", "app", "src", "main", "java", "com", "multisportsscoring", "app", "AwenaTranslationPlugin.java");
const mainActivityPath = path.join(root, "android", "app", "src", "main", "java", "com", "multisportsscoring", "app", "MainActivity.java");
const MLKIT_TRANSLATE_VERSION = "17.0.3";

function fail(message) {
  console.error(`\n[AWENA TRANSLATION ANDROID] ${message}\n`);
  process.exit(1);
}

for (const file of [appGradlePath, pluginPath, mainActivityPath]) {
  if (!fs.existsSync(file)) fail(`Fichier introuvable : ${file}`);
}

let gradle = fs.readFileSync(appGradlePath, "utf8");
gradle = gradle.replace(/\n\s*implementation\s+["']com\.google\.mlkit:translate:[^"']+["']/g, "");
const dependencyLine = `    implementation "com.google.mlkit:translate:${MLKIT_TRANSLATE_VERSION}"`;
const depIndex = gradle.indexOf("dependencies {");
if (depIndex < 0) fail("Bloc dependencies introuvable dans android/app/build.gradle");
const insertAt = depIndex + "dependencies {".length;
gradle = `${gradle.slice(0, insertAt)}\n${dependencyLine}${gradle.slice(insertAt)}`;
fs.writeFileSync(appGradlePath, gradle);

const main = fs.readFileSync(mainActivityPath, "utf8");
if (!main.includes("registerPlugin(AwenaTranslationPlugin.class)")) {
  fail("AwenaTranslationPlugin n'est pas enregistré dans MainActivity.java");
}

console.log("✅ Configuration Android Awena Translation appliquée.");
console.log(`   ML Kit Translation : ${MLKIT_TRANSLATE_VERSION}`);
