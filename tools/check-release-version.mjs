#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));
const release = json("config/release-version.json");
const failures = [];
const ok = [];
const check = (label, condition, detail = "") => {
  if (condition) ok.push(`✅ ${label}`);
  else failures.push(`❌ ${label}${detail ? ` — ${detail}` : ""}`);
};

const pkg = json("package.json");
const lock = json("package-lock.json");
const gradle = read("android/app/build.gradle");
const gradleTemplate = read("android/app/src/build.gradle");
const capacitor = json("capacitor.config.json");

const gradleCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1] || 0);
const gradleName = gradle.match(/versionName\s+["']([^"']+)["']/)?.[1] || "";
const templateCode = Number(gradleTemplate.match(/versionCode\s+(\d+)/)?.[1] || 0);
const templateName = gradleTemplate.match(/versionName\s+["']([^"']+)["']/)?.[1] || "";

check("Version canonique valide", Number.isInteger(release.versionCode) && release.versionCode > 0 && !!release.versionName);
check("package.json aligné", pkg.version === release.versionName, `${pkg.version} != ${release.versionName}`);
check("package-lock.json aligné", lock.version === release.versionName, `${lock.version} != ${release.versionName}`);
check('package-lock packages[""] aligné', lock.packages?.[""]?.version === release.versionName, `${lock.packages?.[""]?.version} != ${release.versionName}`);
check("Android actif versionName aligné", gradleName === release.versionName, `${gradleName} != ${release.versionName}`);
check("Android actif versionCode aligné", gradleCode === release.versionCode, `${gradleCode} != ${release.versionCode}`);
check("Template Android versionName aligné", templateName === release.versionName, `${templateName} != ${release.versionName}`);
check("Template Android versionCode aligné", templateCode === release.versionCode, `${templateCode} != ${release.versionCode}`);
check("Nom Capacitor aligné", capacitor.appName === release.appName, `${capacitor.appName} != ${release.appName}`);
check("Package Capacitor aligné", capacitor.appId === release.packageId, `${capacitor.appId} != ${release.packageId}`);
check("Package Android aligné", gradle.includes(`applicationId "${release.packageId}"`) && gradle.includes(`namespace = "${release.packageId}"`));

for (const doc of ["README.md", "docs/ANDROID-CURRENT-STATE.md", "docs/GOOGLE_PLAY_INTERNAL_TEST.md"]) {
  const text = read(doc);
  check(`${doc} versionName aligné`, text.includes(`Version de référence : **${release.versionName}**`));
  check(`${doc} versionCode aligné`, text.includes(`Code Google Play : **${release.versionCode}**`));
}

console.log([...ok, ...failures].join("\n"));
if (failures.length) {
  console.error(`\n❌ VERSION ALIGNMENT FAILED (${failures.length})`);
  process.exit(1);
}
console.log(`\n✅ VERSION ALIGNMENT OK — ${release.versionName} / code ${release.versionCode}`);
