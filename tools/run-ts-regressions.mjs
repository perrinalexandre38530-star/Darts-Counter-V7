#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const allTests = [
  "tools/test-x01v3-regression.ts",
  "tools/test-baseball-regression.ts",
  "tools/test-shooter-regression.ts",
  "tools/test-loterie-regression.ts",
  "tools/test-linked-profile-history.ts",
  "tools/test-history-integrity-regression.ts",
  "src/tools/test-territories-value-win.ts",
  "src/tools/test-territories-unique-values.ts",
];

const onlyIndex = process.argv.indexOf("--only");
const tests = onlyIndex >= 0 && process.argv[onlyIndex + 1] ? [process.argv[onlyIndex + 1]] : allTests;

let build;
try {
  ({ build } = await import("esbuild"));
} catch (error) {
  console.error("❌ esbuild est indisponible. Lance npm ci avant les tests de régression.");
  console.error(error?.message || error);
  process.exit(2);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mss-regressions-"));
let failed = false;

try {
  for (let i = 0; i < tests.length; i += 1) {
    const rel = tests[i];
    const entry = path.resolve(root, rel);
    if (!fs.existsSync(entry)) {
      console.error(`❌ Test introuvable: ${rel}`);
      failed = true;
      break;
    }
    const outfile = path.join(tmpDir, `test-${i}.mjs`);
    console.log(`\n▶ ${rel}`);
    try {
      await build({
        entryPoints: [entry],
        outfile,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node22",
        sourcemap: "inline",
        logLevel: "silent",
      });
    } catch (error) {
      console.error(`❌ Bundle impossible pour ${rel}`);
      console.error(error?.errors?.map((e) => e.text).join("\n") || error?.message || error);
      failed = true;
      break;
    }
    const run = spawnSync(process.execPath, [outfile], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    if (run.status !== 0) {
      console.error(`❌ Régression détectée dans ${rel}`);
      failed = true;
      break;
    }
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

if (failed) process.exit(1);
console.log("\n✅ GAME / HISTORY REGRESSION SUITE OK\n");
