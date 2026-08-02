#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { syncReleaseVersion } from "./sync-release-version.mjs";

const [codeArg, nameArg] = process.argv.slice(2);
const code = Number(codeArg);
if (!Number.isInteger(code) || code < 1 || !nameArg) {
  console.error('Usage: npm run android:version -- <versionCode> <versionName>');
  console.error('Version actuelle : npm run android:version -- 3 1.0.0-rc2');
  console.error('Prochaine RC prévue : npm run android:version -- 4 1.0.0-rc3');
  process.exit(1);
}
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(nameArg)) {
  console.error(`❌ versionName invalide : ${nameArg}`);
  process.exit(1);
}

const file = path.join(process.cwd(), "config", "release-version.json");
const release = JSON.parse(fs.readFileSync(file, "utf8"));
release.versionCode = code;
release.versionName = nameArg;
fs.writeFileSync(file, `${JSON.stringify(release, null, 2)}\n`, "utf8");

try {
  syncReleaseVersion();
  console.log(`✅ Nouvelle référence enregistrée : ${nameArg} — versionCode ${code}`);
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
