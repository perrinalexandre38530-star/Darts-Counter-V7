#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
const check = (label, ok, detail = "") => checks.push({ label, ok: !!ok, detail });

if (!fs.existsSync(path.join(root, "android"))) {
  console.error("❌ android/ absent. Lance d'abord npm run android:bootstrap.");
  process.exit(1);
}

const vars = read("android/variables.gradle");
const gradle = read("android/app/build.gradle");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const main = read("android/app/src/main/java/com/multisportsscoring/app/MainActivity.java");
const plugin = read("android/app/src/main/java/com/multisportsscoring/app/PlayBillingPlugin.java");
const strings = read("android/app/src/main/res/values/strings.xml");
const release = JSON.parse(read("config/release-version.json"));
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const gradleTemplate = read("android/app/src/build.gradle");

const gradleVersionCode = Number(gradle.match(/versionCode\s*(?:=\s*)?(\d+)/)?.[1] || 0);
const gradleVersionName = gradle.match(/versionName\s+["']([^"']+)["']/)?.[1] || "";
const templateVersionCode = Number(gradleTemplate.match(/versionCode\s*(?:=\s*)?(\d+)/)?.[1] || 0);
const templateVersionName = gradleTemplate.match(/versionName\s+["']([^"']+)["']/)?.[1] || "";
check("Version package.json alignée", pkg.version === release.versionName, `${pkg.version} / ${release.versionName}`);
check("Version package-lock alignée", lock.version === release.versionName && lock.packages?.[""]?.version === release.versionName);
check("Android versionName aligné", gradleVersionName === release.versionName, `${gradleVersionName} / ${release.versionName}`);
check("Android versionCode aligné", gradleVersionCode === release.versionCode, `${gradleVersionCode} / ${release.versionCode}`);
check("Template Android aligné", templateVersionName === release.versionName && templateVersionCode === release.versionCode);
check("android/app/build.gradle = module application", /apply\s+plugin:\s*["']com\.android\.application["']/.test(gradle) && /\bdefaultConfig\s*\{/.test(gradle));
check("Signature release Gradle conservée", gradle.includes("playSigningConfigured") && gradle.includes("signingConfig signingConfigs.release"));
const sherpaVersion = gradle.match(/com\.github\.k2-fsa:sherpa-onnx:v([0-9.]+)/)?.[1] || "";
check("Awena sherpa-onnx 1.13.5 présent", sherpaVersion === "1.13.5", sherpaVersion ? `v${sherpaVersion}` : "absent");
check(
  "Awena sherpa-onnx JVM dupliqué exclu",
  gradle.includes('exclude group: "com.github.k2-fsa.sherpa-onnx", module: "sherpa-onnx-jvm"')
);
check("Commons Compress présent", gradle.includes("org.apache.commons:commons-compress:1.27.1"));
check("Awena ML Kit Translation 17.0.3 présent", gradle.includes("com.google.mlkit:translate:17.0.3"));
check("AwenaTranslation plugin registered", main.includes("registerPlugin(AwenaTranslationPlugin.class)"));
const minSdkVersion = Number(vars.match(/minSdkVersion\s*=\s*(\d+)/)?.[1] || 0);
check(
  "minSdkVersion >= 26 (Health Connect)",
  minSdkVersion >= 26,
  minSdkVersion ? `API ${minSdkVersion}` : "absent"
);
check("compileSdkVersion 36", /compileSdkVersion\s*=\s*36/.test(vars));
check("targetSdkVersion 36", /targetSdkVersion\s*=\s*36/.test(vars));
check("Billing Library 9.1.0", gradle.includes("com.android.billingclient:billing:9.1.0"));
check("Permission com.android.vending.BILLING", manifest.includes('android:name="com.android.vending.BILLING"'));
check("PlayBilling plugin registered", main.includes("registerPlugin(PlayBillingPlugin.class)"));
check("No automatic entitlement", plugin.includes("aucun entitlement") && !plugin.includes("grantEntitlement("));
const purchaseCallback = plugin.match(/onPurchasesUpdated[\\s\\S]*?(?=\\n    private void queryOwned)/)?.[0] || "";
check("No automatic acknowledge on purchase callback", !purchaseCallback.includes("billingClient.acknowledgePurchase("));
check("AdMob App ID present", strings.includes('name="admob_app_id"'));

const admobMatch = strings.match(/<string\s+name="admob_app_id">([^<]+)<\/string>/);
const admobId = admobMatch?.[1] || "";
const googleTest = admobId === "ca-app-pub-3940256099942544~3347511713";
check("AdMob mode identified", !!admobId, googleTest ? "GOOGLE TEST" : "PRODUCTION/PERSONNALISÉ");

for (const c of checks) console.log(`${c.ok ? "✅" : "❌"} ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
const failed = checks.filter(c => !c.ok);
if (failed.length) process.exit(1);

console.log("\n✅ Android Play release guard OK.");
if (googleTest) {
  console.log("ℹ️ AdMob est encore en mode Google TEST : parfait pour le test interne, pas pour la production.");
}
console.log("ℹ️ Les achats restent à tester via une installation provenant du Google Play Internal Testing.");
