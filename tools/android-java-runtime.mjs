#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PREFERRED_MAJORS = [21, 17, 24, 23, 22, 20, 19, 18];
const MIN_ANDROID_JAVA = 17;

export function parseJavaMajor(output) {
  const text = String(output || "");
  const match = text.match(/(?:java|openjdk)\s+version\s+["'](\d+)(?:\.(\d+))?/i)
    || text.match(/version\s+["'](\d+)(?:\.(\d+))?/i);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (first === 1 && Number.isFinite(second)) return second;
  return Number.isFinite(first) ? first : null;
}

export function parseGradleVersionFromWrapper(wrapperText) {
  const match = String(wrapperText || "").match(/gradle-([0-9]+(?:\.[0-9]+){1,2})-(?:all|bin)\.zip/i);
  return match?.[1] || null;
}

function versionParts(version) {
  return String(version || "0").split(".").map((x) => Number(x) || 0);
}

function versionAtLeast(version, wanted) {
  const a = versionParts(version);
  const b = versionParts(wanted);
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return true;
}

export function maxJavaForGradle(gradleVersion) {
  // Official Gradle runtime support thresholds.
  if (versionAtLeast(gradleVersion, "9.4")) return 26;
  if (versionAtLeast(gradleVersion, "9.1")) return 25;
  if (versionAtLeast(gradleVersion, "8.14")) return 24;
  if (versionAtLeast(gradleVersion, "8.10")) return 23;
  if (versionAtLeast(gradleVersion, "8.8")) return 22;
  if (versionAtLeast(gradleVersion, "8.5")) return 21;
  if (versionAtLeast(gradleVersion, "8.3")) return 20;
  if (versionAtLeast(gradleVersion, "7.6")) return 19;
  if (versionAtLeast(gradleVersion, "7.5")) return 18;
  return 17;
}

export function isJavaCompatible(javaMajor, gradleVersion) {
  const major = Number(javaMajor);
  return Number.isFinite(major)
    && major >= MIN_ANDROID_JAVA
    && major <= maxJavaForGradle(gradleVersion);
}

function javaExecutable(home) {
  if (!home) return null;
  return path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java");
}

function inspectJavaHome(home, source) {
  if (!home) return null;
  const normalized = path.resolve(String(home).replace(/^"|"$/g, ""));
  const executable = javaExecutable(normalized);
  if (!executable || !fs.existsSync(executable)) return null;
  const probe = spawnSync(executable, ["-version"], { encoding: "utf8", windowsHide: true });
  const output = `${probe.stdout || ""}\n${probe.stderr || ""}`;
  const major = parseJavaMajor(output);
  if (!major) return null;
  return { home: normalized, executable, major, source, output: output.trim() };
}

function addHome(set, home, source) {
  if (!home) return;
  try {
    const normalized = path.resolve(String(home).replace(/^"|"$/g, ""));
    const key = process.platform === "win32" ? normalized.toLowerCase() : normalized;
    if (!set.has(key)) set.set(key, { home: normalized, source });
  } catch {}
}

function scanChildrenForJdks(root, set, source, depth = 2) {
  if (!root || depth < 0 || !fs.existsSync(root)) return;
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = path.join(root, entry.name);
    if (fs.existsSync(javaExecutable(full) || "")) addHome(set, full, `${source}:${entry.name}`);
    if (depth > 0 && /jdk|java|adoptium|corretto|zulu|liberica|android studio|jbr|jetbrains/i.test(entry.name)) {
      scanChildrenForJdks(full, set, source, depth - 1);
    }
  }
}

function collectWindowsCandidates() {
  const candidates = new Map();
  const envHomes = [
    [process.env.MULTISPORTS_ANDROID_JAVA_HOME, "MULTISPORTS_ANDROID_JAVA_HOME"],
    [process.env.JAVA_HOME_21_X64, "JAVA_HOME_21_X64"],
    [process.env.JDK_HOME, "JDK_HOME"],
    [process.env.JAVA_HOME, "JAVA_HOME"],
  ];
  for (const [home, source] of envHomes) addHome(candidates, home, source);

  const where = spawnSync("where.exe", ["java.exe"], { encoding: "utf8", windowsHide: true });
  for (const line of String(where.stdout || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    const home = path.dirname(path.dirname(line));
    addHome(candidates, home, "PATH");
  }

  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const userHome = os.homedir();
  const roots = [
    [path.join(programFiles, "Eclipse Adoptium"), "Adoptium"],
    [path.join(programFiles, "Java"), "Java"],
    [path.join(programFiles, "Microsoft"), "Microsoft"],
    [path.join(programFiles, "Amazon Corretto"), "Corretto"],
    [path.join(programFiles, "BellSoft"), "BellSoft"],
    [path.join(programFiles, "Zulu"), "Zulu"],
    [path.join(programFiles, "Android"), "Android"],
    [path.join(localAppData, "Programs", "Eclipse Adoptium"), "Local Adoptium"],
    [path.join(localAppData, "Programs", "Java"), "Local Java"],
    [path.join(userHome, ".jdks"), "JetBrains .jdks"],
  ];
  for (const [root, source] of roots) scanChildrenForJdks(root, candidates, source, 3);
  return [...candidates.values()];
}

function collectUnixCandidates() {
  const candidates = new Map();
  addHome(candidates, process.env.MULTISPORTS_ANDROID_JAVA_HOME, "MULTISPORTS_ANDROID_JAVA_HOME");
  addHome(candidates, process.env.JDK_HOME, "JDK_HOME");
  addHome(candidates, process.env.JAVA_HOME, "JAVA_HOME");
  const which = spawnSync("sh", ["-lc", "command -v java || true"], { encoding: "utf8" });
  const executable = String(which.stdout || "").trim();
  if (executable) {
    try {
      const real = fs.realpathSync(executable);
      addHome(candidates, path.dirname(path.dirname(real)), "PATH");
    } catch {}
  }
  for (const root of ["/usr/lib/jvm", "/Library/Java/JavaVirtualMachines"]) {
    scanChildrenForJdks(root, candidates, root, 3);
  }
  return [...candidates.values()];
}

function rankJava(candidate) {
  const preferredIndex = PREFERRED_MAJORS.indexOf(candidate.major);
  const majorRank = preferredIndex >= 0 ? preferredIndex : 100 + Math.abs(21 - candidate.major);
  const explicitRank = candidate.source === "MULTISPORTS_ANDROID_JAVA_HOME" ? -1000 : 0;
  return explicitRank + majorRank;
}

export function resolveAndroidJavaRuntime({ cwd = process.cwd(), quiet = false } = {}) {
  const wrapperPath = path.resolve(cwd, "android", "gradle", "wrapper", "gradle-wrapper.properties");
  let gradleVersion = "8.14.3";
  try {
    gradleVersion = parseGradleVersionFromWrapper(fs.readFileSync(wrapperPath, "utf8")) || gradleVersion;
  } catch {}

  const rawCandidates = process.platform === "win32" ? collectWindowsCandidates() : collectUnixCandidates();
  const inspected = rawCandidates
    .map(({ home, source }) => inspectJavaHome(home, source))
    .filter(Boolean);
  const compatible = inspected
    .filter((item) => isJavaCompatible(item.major, gradleVersion))
    .sort((a, b) => rankJava(a) - rankJava(b));

  const chosen = compatible[0] || null;
  if (!chosen) {
    const found = inspected.length
      ? inspected.map((item) => `Java ${item.major}: ${item.home} (${item.source})`).join("\n  - ")
      : "aucun JDK détecté";
    throw new Error(
      `Aucun JDK compatible détecté pour Gradle ${gradleVersion}. `
      + `Le build Android exige Java ${MIN_ANDROID_JAVA} à ${maxJavaForGradle(gradleVersion)}.\n`
      + `Détecté :\n  - ${found}\n`
      + `Installe/préserve un JDK 21, ou définis MULTISPORTS_ANDROID_JAVA_HOME vers son dossier.`
    );
  }

  if (!quiet) {
    const current = inspectJavaHome(process.env.JAVA_HOME, "JAVA_HOME");
    if (current && !isJavaCompatible(current.major, gradleVersion)) {
      console.log(`⚠️ JAVA_HOME système ignoré : Java ${current.major} incompatible avec Gradle ${gradleVersion}.`);
    }
    console.log(`✅ Android JDK auto : Java ${chosen.major} — ${chosen.home}`);
    console.log(`   Source : ${chosen.source} · Gradle ${gradleVersion} accepte Java ${MIN_ANDROID_JAVA}–${maxJavaForGradle(gradleVersion)}.`);
  }

  return { ...chosen, gradleVersion, minJava: MIN_ANDROID_JAVA, maxJava: maxJavaForGradle(gradleVersion) };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  try {
    resolveAndroidJavaRuntime();
  } catch (error) {
    console.error(`❌ ${error?.message || error}`);
    process.exit(1);
  }
}
