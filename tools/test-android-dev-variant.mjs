import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

const gradle = fs.readFileSync(gradlePath, 'utf8');
const manifest = fs.readFileSync(manifestPath, 'utf8');
const checks = [
  ['applicationIdSuffix .dev', gradle.includes('applicationIdSuffix ".dev"')],
  ['nom DEV', gradle.includes('MULTISPORTS SCORING DEV')],
  ['nom release conservé', gradle.includes('MULTISPORTS SCORING"]')],
  ['placeholder manifest', manifest.includes('android:label="${appLabel}"')],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('✅ Variante Android DEV prête.');
