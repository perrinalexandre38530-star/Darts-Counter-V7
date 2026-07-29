#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";

const task = String(process.argv[2] || "assembleDebug").trim();
const androidDir = path.resolve(process.cwd(), "android");
const command = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const result = spawnSync(command, [task], {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
