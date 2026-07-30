#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
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

function value(env, key) {
  return String(process.env[key] || env[key] || "").trim();
}
function modeFromEnv(env) {
  const explicit = value(env, "VITE_ADMOB_MODE").toLowerCase();
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
const mode = modeFromEnv(env);
const appId = value(env, "VITE_ADMOB_ANDROID_APP_ID");
const units = {
  banner: value(env, "VITE_ADMOB_ANDROID_BANNER_ID"),
  interstitial: value(env, "VITE_ADMOB_ANDROID_INTERSTITIAL_ID"),
  rewarded: value(env, "VITE_ADMOB_ANDROID_REWARDED_ID"),
};
const placementKeys = [
  "HOME", "MESSAGES", "PROFILES", "GAMES", "COMPETITIONS",
  "ONLINE", "STATS", "HISTORY", "SETTINGS", "SCREENS",
];
const placementUnits = placementKeys
  .map((name) => [name, value(env, `VITE_ADMOB_ANDROID_BANNER_${name}_ID`)])
  .filter(([, id]) => id);
const testDevices = parseList(value(env, "VITE_ADMOB_ANDROID_TEST_DEVICE_IDS"));
const checks = [];
const check = (label, ok, detail = "") => checks.push({ label, ok: !!ok, detail });

check("Mode AdMob reconnu", ["google_test", "real_test", "production"].includes(mode), mode);

if (mode === "google_test") {
  const strings = fs.existsSync(stringsPath) ? fs.readFileSync(stringsPath, "utf8") : "";
  check("App ID Android Google TEST", strings.includes(GOOGLE_TEST_APP_ID), GOOGLE_TEST_APP_ID);
  console.log("\nℹ️ Contrôle AdMob : mode google_test, aucune annonce ne sera monétisée.");
} else {
  check("App ID réel valide", isAppId(appId), appId || "manquant");
  check("Bannière réelle valide", isUnitId(units.banner), units.banner || "manquant");
  check("Interstitiel réel valide", isUnitId(units.interstitial), units.interstitial || "manquant");
  check("Rewarded réel valide", isUnitId(units.rewarded), units.rewarded || "manquant");
  check("Aucun ID de démonstration Google", appId !== GOOGLE_TEST_APP_ID && Object.values(units).every((id) => !GOOGLE_TEST_UNITS.has(id)));

  const pub = publisher(appId);
  check("Blocs du même éditeur", !!pub && [...Object.values(units), ...placementUnits.map(([, id]) => id)].every((id) => publisher(id) === pub));
  for (const [name, id] of placementUnits) check(`Bannière ${name} valide`, isUnitId(id), id);

  const strings = fs.existsSync(stringsPath) ? fs.readFileSync(stringsPath, "utf8") : "";
  check("App ID réel injecté dans Android", !!appId && strings.includes(`<string name="admob_app_id">${appId}</string>`), appId);

  if (mode === "real_test") {
    check("Téléphone de test déclaré", testDevices.length > 0, `${testDevices.length} appareil(s)`);
  } else {
    check("Aucun appareil de test dans le build production", testDevices.length === 0, `${testDevices.length} appareil(s)`);
    check("Debug UMP désactivé en production", ["", "DISABLED"].includes(value(env, "VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY").toUpperCase()), value(env, "VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY") || "DISABLED");
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
