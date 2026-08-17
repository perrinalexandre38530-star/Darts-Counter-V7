#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveAndroidJavaRuntime } from "./android-java-runtime.mjs";

const task = String(process.argv[2] || "assembleDebug").trim();
const projectRoot = process.cwd();
const androidDir = path.resolve(projectRoot, "android");
const command = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

let javaRuntime;
try {
  javaRuntime = resolveAndroidJavaRuntime({ cwd: projectRoot });
} catch (error) {
  console.error(`\n❌ PRECHECK JAVA ANDROID\n${error?.message || error}\n`);
  process.exit(1);
}

const binDir = path.join(javaRuntime.home, "bin");
const separator = process.platform === "win32" ? ";" : ":";
const currentPath = process.env.PATH || process.env.Path || "";
const env = {
  ...process.env,
  JAVA_HOME: javaRuntime.home,
  PATH: `${binDir}${separator}${currentPath}`,
  Path: `${binDir}${separator}${currentPath}`,
};

const result = spawnSync(command, [task], {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
