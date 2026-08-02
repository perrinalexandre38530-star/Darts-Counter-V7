import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
const mainActivityPath = path.join(root, 'android', 'app', 'src', 'main', 'java', 'com', 'multisportsscoring', 'app', 'MainActivity.java');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

const manifest = fs.readFileSync(manifestPath, 'utf8');
const gradle = fs.readFileSync(gradlePath, 'utf8');
const mainActivity = fs.readFileSync(mainActivityPath, 'utf8');

assert(manifest.includes('android:name="com.multisportsscoring.app.MainActivity"'), 'MainActivity utilise le nom Java absolu');
assert(!manifest.includes('android:name=".MainActivity"'), 'aucun nom relatif MainActivity restant');
assert(gradle.includes('namespace = "com.multisportsscoring.app"'), 'namespace Android cohérent');
assert(mainActivity.includes('package com.multisportsscoring.app;'), 'package Java MainActivity cohérent');
console.log('✅ Variante DEV lançable par Android Studio.');
