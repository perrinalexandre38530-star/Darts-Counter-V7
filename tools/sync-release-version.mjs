#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const releaseFile = path.join(root, "config", "release-version.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function validateReleaseVersion(value) {
  if (!value || typeof value !== "object") throw new Error("release-version.json invalide.");
  if (!Number.isInteger(value.versionCode) || value.versionCode < 1) throw new Error("versionCode invalide.");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(value.versionName || ""))) {
    throw new Error("versionName invalide.");
  }
  if (!String(value.appName || "").trim()) throw new Error("appName absent.");
  if (!/^com\.[a-z0-9_.]+$/.test(String(value.packageId || ""))) throw new Error("packageId invalide.");
  return value;
}

function replaceRequired(text, regex, replacement, label) {
  if (!regex.test(text)) throw new Error(`${label} introuvable.`);
  return text.replace(regex, replacement);
}

function updateGradle(relativePath, release) {
  const file = path.join(root, relativePath);
  let text = fs.readFileSync(file, "utf8");

  const isAndroidAppModule =
    /apply\s+plugin:\s*["']com\.android\.application["']/.test(text) &&
    /\bandroid\s*\{/.test(text) &&
    /\bdefaultConfig\s*\{/.test(text) &&
    /\bapplicationId\s+["'][^"']+["']/.test(text);

  if (!isAndroidAppModule) {
    throw new Error(`${relativePath}: ce fichier n'est pas un build.gradle de module Android valide. Refus de le modifier automatiquement.`);
  }

  // Accept both Groovy syntaxes: `versionCode 7` / `versionCode = 7`.
  const versionCodeRe = /versionCode\s*(?:=\s*)?\d+/;
  const versionNameRe = /versionName\s*(?:=\s*)?["'][^"']+["']/;

  if (!versionCodeRe.test(text)) {
    throw new Error(`${relativePath}: defaultConfig/versionCode introuvable.`);
  }
  if (!versionNameRe.test(text)) {
    throw new Error(`${relativePath}: defaultConfig/versionName introuvable.`);
  }

  text = text.replace(versionCodeRe, `versionCode ${release.versionCode}`);
  text = text.replace(versionNameRe, `versionName "${release.versionName}"`);

  fs.writeFileSync(file, text, "utf8");
}

function updateDoc(relativePath, release) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, "utf8");
  text = text.replace(/(Version de référence\s*:\s*\*\*)[^*]+(\*\*)/g, `$1${release.versionName}$2`);
  text = text.replace(/(Code Google Play\s*:\s*\*\*)\d+(\*\*)/g, `$1${release.versionCode}$2`);
  fs.writeFileSync(file, text, "utf8");
}

export function loadReleaseVersion() {
  return validateReleaseVersion(readJson(releaseFile));
}

export function syncReleaseVersion() {
  const release = loadReleaseVersion();

  const packageFile = path.join(root, "package.json");
  const pkg = readJson(packageFile);
  pkg.version = release.versionName;
  writeJson(packageFile, pkg);

  const lockFile = path.join(root, "package-lock.json");
  const lock = readJson(lockFile);
  lock.version = release.versionName;
  if (!lock.packages || !lock.packages[""]) throw new Error('package-lock.json: packages[""] absent.');
  lock.packages[""].version = release.versionName;
  writeJson(lockFile, lock);

  updateGradle("android/app/build.gradle", release);
  updateGradle("android/app/src/build.gradle", release);

  for (const doc of ["README.md", "docs/ANDROID-CURRENT-STATE.md", "docs/GOOGLE_PLAY_INTERNAL_TEST.md"]) {
    updateDoc(doc, release);
  }

  console.log(`✅ Version synchronisée partout : ${release.versionName} — versionCode ${release.versionCode}`);
  return release;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    syncReleaseVersion();
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
