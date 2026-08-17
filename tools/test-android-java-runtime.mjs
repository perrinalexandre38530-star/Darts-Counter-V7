#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  parseJavaMajor,
  parseGradleVersionFromWrapper,
  maxJavaForGradle,
  isJavaCompatible,
} from "./android-java-runtime.mjs";

assert.equal(parseJavaMajor('openjdk version "21.0.8" 2025-07-15'), 21);
assert.equal(parseJavaMajor('openjdk version "25.0.2" 2026-01-20'), 25);
assert.equal(parseJavaMajor('java version "1.8.0_441"'), 8);
assert.equal(parseGradleVersionFromWrapper('distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.3-all.zip'), '8.14.3');
assert.equal(maxJavaForGradle('8.14.3'), 24);
assert.equal(maxJavaForGradle('9.1.0'), 25);
assert.equal(isJavaCompatible(21, '8.14.3'), true);
assert.equal(isJavaCompatible(25, '8.14.3'), false);
assert.equal(isJavaCompatible(17, '8.14.3'), true);

console.log('✅ Android Java runtime resolver regression OK');
