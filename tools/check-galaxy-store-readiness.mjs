#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));

const stores = json("config/distribution-stores.json");
const release = json("config/release-version.json");
const admob = json("config/admob.galaxy.public.json");
const vars = read("android/variables.gradle");
const gradle = read("android/app/build.gradle");
const billing = read("src/monetization/nativeBilling.ts");
const runtimeAdMob = read("src/monetization/adMobConfig.ts");

const checks = [];
const check = (label, ok, detail = "") => checks.push({ label, ok: !!ok, detail });

const galaxyPackage = String(stores?.galaxy?.packageId || "");
const playPackage = String(stores?.play?.packageId || "");
const targetSdk = Number(vars.match(/targetSdkVersion\s*=\s*(\d+)/)?.[1] || 0);
const minSdk = Number(vars.match(/minSdkVersion\s*=\s*(\d+)/)?.[1] || 0);

const isAppId = (value) => /^ca-app-pub-\d{16}~\d{10}$/.test(String(value || "").trim());
const isUnitId = (value) => /^ca-app-pub-\d{16}\/\d{10}$/.test(String(value || "").trim());
const publisher = (value) => String(value || "").match(/^ca-app-pub-(\d{16})[~/]/)?.[1] || "";

check("Package Google Play inchangé", playPackage === "com.multisportsscoring.app", playPackage);
check("Package Galaxy Store distinct", galaxyPackage === "com.multisportsscoring.app.galaxy", galaxyPackage);
check("Override applicationId Galaxy supporté", gradle.includes('MSS_APPLICATION_ID'), "Gradle");
check("targetSdk Galaxy Store >= 33", targetSdk >= 33, `API ${targetSdk}`);
check("minSdk valide", minSdk >= 1, `API ${minSdk}`);
check("ABI 64 bits incluse", /abiFilters\s+"arm64-v8a"/.test(gradle), "arm64-v8a");
check("Build Galaxy coupe Google Play Billing", billing.includes('getDistributionStore() === "galaxy"') && billing.includes("return false"), "achats Play désactivés");
check("AdMob choisit une config Galaxy distincte", runtimeAdMob.includes("admob.galaxy.public.json"), "config Galaxy");

check("AdMob Galaxy en production", String(admob.mode || "").toLowerCase() === "production", String(admob.mode || "manquant"));
check("AdMob Galaxy App ID réel", isAppId(admob.androidAppId), admob.androidAppId || "À créer");
check("AdMob Galaxy bannière générique réelle", isUnitId(admob.androidBannerId), admob.androidBannerId || "À créer");

const pub = publisher(admob.androidAppId);
const declaredPublisher = String(admob.publisherId || "").replace(/^pub-/, "");
if (pub) check("AdMob Galaxy même éditeur", pub === declaredPublisher, declaredPublisher || "éditeur manquant");

const placementNames = ["home","home_secondary","messages","profiles","games","competitions","online","stats","history","settings","screens"];
for (const name of placementNames) {
  const id = String(admob.androidBannerIds?.[name] || admob.androidBannerId || "");
  check(`Bannière Galaxy ${name}`, isUnitId(id), id || "À créer");
}

check("Version Galaxy préparée", Number.isInteger(Number(release.versionCode)) && Number(release.versionCode) > 0, `code ${release.versionCode}`);

for (const item of checks) {
  console.log(`${item.ok ? "✅" : "❌"} ${item.label}${item.detail ? ` — ${item.detail}` : ""}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\n❌ GALAXY STORE PRECHECK : ${checks.length - failed.length}/${checks.length}`);
  console.error("➡️ Renseigne d'abord config/admob.galaxy.public.json avec l'App ID et les bannières de l'app Galaxy AdMob.");
  process.exit(1);
}

console.log(`\n✅ GALAXY STORE PRECHECK : ${checks.length}/${checks.length}`);
console.log("ℹ️ Après l'upload AAB dans Seller Portal, active Galaxy Store App Signing puis récupère le SHA-256 Samsung pour Android Developer Verification (ADV).");
console.log("ℹ️ Seller Portal vérifiera aussi la compatibilité mémoire 16 KB du binaire.");
