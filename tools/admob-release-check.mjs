#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requireFullscreen = process.argv.includes("--require-fullscreen") || process.env.ADMOB_REQUIRE_FULLSCREEN === "1";
const envPath = path.join(root, ".env");
const publicConfigPath = path.join(root, "config", "admob.public.json");
const stringsPath = path.join(root, "android", "app", "src", "main", "res", "values", "strings.xml");
const appAdsPath = path.join(root, "public", "app-ads.txt");
const GOOGLE_TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const GOOGLE_TEST_UNITS = new Set([
  "ca-app-pub-3940256099942544/9214589741",
  "ca-app-pub-3940256099942544/1033173712",
  "ca-app-pub-3940256099942544/5224354917",
]);

function readDotEnv() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

function readPublicConfig() {
  if (!fs.existsSync(publicConfigPath)) return {};
  try { return JSON.parse(fs.readFileSync(publicConfigPath, "utf8")); }
  catch { return {}; }
}

function value(env, key, fallback = "") {
  return String(process.env[key] || env[key] || fallback || "").trim();
}
function boolValue(env, key, fallback = false) {
  const raw = value(env, key, fallback ? "true" : "false").toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}
function modeFromConfig(env, publicConfig) {
  const explicit = value(env, "VITE_ADMOB_MODE", publicConfig.mode).toLowerCase();
  if (["production", "prod", "live"].includes(explicit)) return "production";
  if (["real_test", "real-test", "device_test", "device-test"].includes(explicit)) return "real_test";
  if (["google_test", "google-test", "demo", "test"].includes(explicit)) return "google_test";
  return value(env, "VITE_ADMOB_TEST_MODE") === "0" ? "production" : "google_test";
}
function isAppId(id) { return /^ca-app-pub-\d{16}~\d{10}$/.test(id); }
function isUnitId(id) { return /^ca-app-pub-\d{16}\/\d{10}$/.test(id); }
function publisher(id) { return id.match(/^ca-app-pub-(\d{16})[~/]/)?.[1] || ""; }
function parseList(raw) { return String(raw || "").split(/[;,\s]+/).map((x) => x.trim()).filter(Boolean); }

const env = readDotEnv();
const publicConfig = readPublicConfig();
const mode = modeFromConfig(env, publicConfig);
const appId = value(env, "VITE_ADMOB_ANDROID_APP_ID", publicConfig.androidAppId);
const units = {
  banner: value(env, "VITE_ADMOB_ANDROID_BANNER_ID", publicConfig.androidBannerId),
  interstitial: value(env, "VITE_ADMOB_ANDROID_INTERSTITIAL_ID", publicConfig.androidInterstitialId),
  rewarded: value(env, "VITE_ADMOB_ANDROID_REWARDED_ID", publicConfig.androidRewardedId),
};
const placementKeys = [
  ["HOME", "home"],
  ["HOME_SECONDARY", "home_secondary"],
  ["MESSAGES", "messages"],
  ["PROFILES", "profiles"],
  ["GAMES", "games"],
  ["COMPETITIONS", "competitions"],
  ["ONLINE", "online"],
  ["STATS", "stats"],
  ["HISTORY", "history"],
  ["SETTINGS", "settings"],
  ["SCREENS", "screens"],
];
const placementUnits = placementKeys.map(([envName, jsonName]) => [
  envName,
  value(env, `VITE_ADMOB_ANDROID_BANNER_${envName}_ID`, publicConfig.androidBannerIds?.[jsonName] || units.banner),
]);
const testDevices = parseList(value(env, "VITE_ADMOB_ANDROID_TEST_DEVICE_IDS", (publicConfig.testDeviceIds || []).join(",")));
const consoleManaged = boolValue(env, "VITE_ADMOB_TEST_DEVICES_MANAGED_BY_CONSOLE", publicConfig.testDevicesManagedByAdMobConsole === true);
const realTestUseGoogleDemoBanners = boolValue(
  env,
  "VITE_ADMOB_REAL_TEST_USE_GOOGLE_DEMO_BANNERS",
  publicConfig.realTestUseGoogleDemoBanners !== false
);
const checks = [];
const check = (label, ok, detail = "") => checks.push({ label, ok: !!ok, detail });

check("Mode AdMob reconnu", ["google_test", "real_test", "production"].includes(mode), mode);

if (mode === "google_test") {
  const strings = fs.existsSync(stringsPath) ? fs.readFileSync(stringsPath, "utf8") : "";
  check("App ID Android Google TEST", strings.includes(GOOGLE_TEST_APP_ID), GOOGLE_TEST_APP_ID);
  if (requireFullscreen) check("Monétisation complète réservée au mode production", false, mode);
  console.log("\nℹ️ Contrôle AdMob : mode google_test, aucune annonce ne sera monétisée.");
} else {
  check("App ID réel valide", isAppId(appId), appId || "manquant");
  check("Bannière générique réelle valide", isUnitId(units.banner), units.banner || "manquant");
  for (const [name, id] of placementUnits) check(`Bannière ${name} valide`, isUnitId(id), id);

  const pub = publisher(appId);
  const realBannerUnits = [units.banner, ...placementUnits.map(([, id]) => id)];
  check("Bannières du même éditeur", !!pub && realBannerUnits.every((id) => publisher(id) === pub), pub || "éditeur manquant");

  const strings = fs.existsSync(stringsPath) ? fs.readFileSync(stringsPath, "utf8") : "";
  check("App ID réel injecté dans Android", !!appId && strings.includes(`<string name="admob_app_id">${appId}</string>`), appId);

  if (mode === "real_test") {
    if (requireFullscreen) check("Monétisation complète réservée au mode production", false, mode);
    check("Appareil de test protégé", testDevices.length > 0 || consoleManaged, consoleManaged && testDevices.length > 0 ? `console AdMob + ${testDevices.length} appareil(s) SDK` : consoleManaged ? "déclaré dans la console AdMob" : `${testDevices.length} appareil(s) SDK`);
    check("App ID non démonstration", appId !== GOOGLE_TEST_APP_ID, appId);
    if (units.interstitial) check("Interstitiel renseigné valide", isUnitId(units.interstitial), units.interstitial);
    if (units.rewarded) check("Rewarded renseigné valide", isUnitId(units.rewarded), units.rewarded);
    console.log(realTestUseGoogleDemoBanners
      ? "\nℹ️ Mode real_test : vrais IDs configurés/contrôlés, mais bannières de démonstration Google utilisées pour un test visuel déterministe. La production reprendra automatiquement les vrais IDs."
      : "\nℹ️ Mode real_test : les bannières utilisent les vrais IDs sur l'appareil déclaré. Un NO_FILL reste possible. Les formats plein écran non renseignés utilisent les IDs de démonstration Google.");
  } else {
    if (units.interstitial) {
      check("Interstitiel réel valide", isUnitId(units.interstitial), units.interstitial);
      check("Interstitiel du même éditeur", publisher(units.interstitial) === pub, pub);
      check("Interstitiel non démonstration", !GOOGLE_TEST_UNITS.has(units.interstitial), units.interstitial);
    } else {
      if (requireFullscreen) check("Interstitiel réel obligatoire pour la monétisation complète", false, "ID manquant");
      console.log("ℹ️ Interstitiel réel non créé : format désactivé, bannières live autorisées.");
    }
    if (units.rewarded) {
      check("Rewarded réel valide", isUnitId(units.rewarded), units.rewarded);
      check("Rewarded du même éditeur", publisher(units.rewarded) === pub, pub);
      check("Rewarded non démonstration", !GOOGLE_TEST_UNITS.has(units.rewarded), units.rewarded);
    } else {
      if (requireFullscreen) check("Rewarded réel obligatoire pour la monétisation complète", false, "ID manquant");
      console.log("ℹ️ Rewarded réel non créé : format désactivé, bannières live autorisées.");
    }
    if (requireFullscreen && units.interstitial && units.rewarded) {
      check("Monétisation plein écran complète", true, "interstitiel + rewarded réels");
    }
    check("App ID et bannières sans ID de démonstration Google", appId !== GOOGLE_TEST_APP_ID && [units.banner, ...placementUnits.map(([, id]) => id)].every((id) => !GOOGLE_TEST_UNITS.has(id)), "production bannières");
    check("Aucun appareil de test local dans le build production", testDevices.length === 0, `${testDevices.length} appareil(s)`);
    check("Debug UMP désactivé en production", ["", "DISABLED"].includes(value(env, "VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY", publicConfig.consentDebugGeography).toUpperCase()), value(env, "VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY", publicConfig.consentDebugGeography) || "DISABLED");
    const expectedLine = pub ? `google.com, pub-${pub}, DIRECT, f08c47fec0942fa0` : "";
    const appAds = fs.existsSync(appAdsPath) ? fs.readFileSync(appAdsPath, "utf8") : "";
    check("public/app-ads.txt présent", !!appAds, appAdsPath);
    check("Publisher AdMob présent dans app-ads.txt", !!expectedLine && appAds.split(/\r?\n/).map((x) => x.trim()).includes(expectedLine), expectedLine);
  }
}

for (const item of checks) console.log(`${item.ok ? "✅" : "❌"} ${item.label}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\n❌ AdMob release guard: ${checks.length - failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\n✅ AdMob release guard: ${checks.length}/${checks.length}`);
if (requireFullscreen) {
  console.log("✅ MONÉTISATION COMPLÈTE PRÊTE : bannières + interstitiel + rewarded réels validés.");
} else if (mode === "production" && (!units.interstitial || !units.rewarded)) {
  console.log("ℹ️ Release banner-only autorisée. Lance npm run admob:fullscreen:check le jour où les deux IDs plein écran seront créés.");
}
