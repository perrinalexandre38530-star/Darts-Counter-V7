import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(gradlePath)) fail(`Fichier introuvable : ${gradlePath}`);
if (!fs.existsSync(manifestPath)) fail(`Fichier introuvable : ${manifestPath}`);

let gradle = fs.readFileSync(gradlePath, 'utf8');
let manifest = fs.readFileSync(manifestPath, 'utf8');
let changed = false;

if (!gradle.includes('manifestPlaceholders = [appLabel: "MULTISPORTS SCORING"]')) {
  const versionNamePattern = /(\s+versionName\s+"[^"]+"\s*\r?\n)/;
  if (!versionNamePattern.test(gradle)) fail('Impossible de repérer versionName dans android/app/build.gradle.');
  gradle = gradle.replace(
    versionNamePattern,
    `$1        manifestPlaceholders = [appLabel: "MULTISPORTS SCORING"]\n`,
  );
  changed = true;
}

if (!gradle.includes('applicationIdSuffix ".dev"')) {
  const buildTypesPattern = /(\s+buildTypes\s*\{\s*\r?\n)/;
  if (!buildTypesPattern.test(gradle)) fail('Impossible de repérer buildTypes dans android/app/build.gradle.');
  gradle = gradle.replace(
    buildTypesPattern,
    `$1        debug {\n            applicationIdSuffix ".dev"\n            versionNameSuffix "-dev"\n            manifestPlaceholders = [appLabel: "MULTISPORTS SCORING DEV"]\n        }\n`,
  );
  changed = true;
}

const oldApplicationLabel = 'android:label="@string/app_name"';
const devApplicationLabel = 'android:label="${appLabel}"';
if (manifest.includes(oldApplicationLabel)) {
  manifest = manifest.replaceAll(oldApplicationLabel, devApplicationLabel);
  changed = true;
}
const oldActivityLabel = 'android:label="@string/title_activity_main"';
if (manifest.includes(oldActivityLabel)) {
  manifest = manifest.replaceAll(oldActivityLabel, devApplicationLabel);
  changed = true;
}

if (!manifest.includes(devApplicationLabel)) {
  fail('Impossible de configurer le nom distinct de l’application DEV dans AndroidManifest.xml.');
}

fs.writeFileSync(gradlePath, gradle, 'utf8');
fs.writeFileSync(manifestPath, manifest, 'utf8');

console.log(changed
  ? '✅ Variante Android DEV activée : com.multisportsscoring.app.dev / MULTISPORTS SCORING DEV'
  : '✅ Variante Android DEV déjà configurée.');
console.log('➡️ Lance maintenant : npm run android:run');
