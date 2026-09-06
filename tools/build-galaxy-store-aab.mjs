#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const release = JSON.parse(fs.readFileSync(path.join(root, "config", "release-version.json"), "utf8"));
const stores = JSON.parse(fs.readFileSync(path.join(root, "config", "distribution-stores.json"), "utf8"));
const galaxyPackage = String(stores?.galaxy?.packageId || "com.multisportsscoring.app.galaxy");
const stringsPath = path.join(root, "android", "app", "src", "main", "res", "values", "strings.xml");
const originalStrings = fs.existsSync(stringsPath) ? fs.readFileSync(stringsPath, "utf8") : null;

const env = {
  ...process.env,
  VITE_DISTRIBUTION_STORE: "galaxy",
  MSS_DISTRIBUTION_STORE: "galaxy",
};

function run(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

function sha256(file) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

try {
  run(process.execPath, ["./tools/check-galaxy-store-readiness.mjs"]);
  run("npm", ["run", "version:check"]);
  run("npm", ["run", "typecheck"]);
  run("npm", ["run", "android:sync"]);
  run(process.execPath, ["./tools/run-android-gradle.mjs", "bundleRelease", `-PMSS_APPLICATION_ID=${galaxyPackage}`]);

  const source = path.join(root, "android", "app", "build", "outputs", "bundle", "release", "app-release.aab");
  if (!fs.existsSync(source)) {
    console.error(`❌ AAB Galaxy introuvable : ${source}`);
    process.exit(1);
  }

  const outDir = path.join(root, "android", "app", "build", "outputs", "galaxy");
  fs.mkdirSync(outDir, { recursive: true });
  const safeVersion = String(release.versionName || packageJson.version || "1.0.0").replace(/[^0-9A-Za-z._-]+/g, "-");
  const target = path.join(outDir, `MULTISPORTS-SCORING-GALAXY-${safeVersion}-code${release.versionCode}.aab`);
  fs.copyFileSync(source, target);

  const stat = fs.statSync(target);
  const metadata = {
    store: "Samsung Galaxy Store",
    packageId: galaxyPackage,
    versionName: release.versionName,
    versionCode: release.versionCode,
    sizeBytes: stat.size,
    sizeMiB: Number((stat.size / 1024 / 1024).toFixed(2)),
    sha256: sha256(target),
    generatedAt: new Date().toISOString(),
    nextActions: [
      "Upload this AAB in Galaxy Store Seller Portal.",
      "Use Galaxy Store App Signing.",
      "Retrieve the Galaxy signing certificate SHA-256 and register it in Android Developer Verification.",
      "After the app is listed, link the Galaxy Store listing in AdMob.",
    ],
  };
  const metaPath = target.replace(/\.aab$/i, ".json");
  fs.writeFileSync(metaPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

  console.log("\n✅ AAB GALAXY STORE PRÊT");
  console.log(`   Package : ${galaxyPackage}`);
  console.log(`   Version : ${release.versionName} / code ${release.versionCode}`);
  console.log(`   Taille  : ${metadata.sizeMiB} MiB`);
  console.log(`   SHA-256 : ${metadata.sha256}`);
  console.log(`   Fichier : ${target}`);
  console.log(`   Rapport : ${metaPath}`);
} finally {
  // Ne laisse jamais l'App ID AdMob Galaxy injecté dans le projet Play après le build.
  if (originalStrings !== null) {
    try { fs.writeFileSync(stringsPath, originalStrings, "utf8"); } catch {}
  }
}
