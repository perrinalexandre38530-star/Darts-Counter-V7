#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "config", "admob.public.json");
const GOOGLE_DEMO_UNITS = new Set([
  "ca-app-pub-3940256099942544/9214589741",
  "ca-app-pub-3940256099942544/1033173712",
  "ca-app-pub-3940256099942544/5224354917",
]);

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}
function isAppId(value) { return /^ca-app-pub-\d{16}~\d{10}$/.test(String(value || "").trim()); }
function isUnitId(value) { return /^ca-app-pub-\d{16}\/\d{10}$/.test(String(value || "").trim()); }
function publisher(value) { return String(value || "").match(/^ca-app-pub-(\d{16})[~/]/)?.[1] || ""; }
function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}

if (!fs.existsSync(configPath)) fail(`Configuration introuvable : ${configPath}`);
let config;
try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); }
catch { fail("config/admob.public.json n'est pas un JSON valide."); }

const clear = process.argv.includes("--clear");
const dryRun = process.argv.includes("--dry-run");
const interstitial = arg("--interstitial");
const rewarded = arg("--rewarded");

if (clear) {
  config.androidInterstitialId = "";
  config.androidRewardedId = "";
  if (!dryRun) fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`✅ IDs plein écran ${dryRun ? "seraient effacés" : "effacés"}. Les bannières live restent inchangées.`);
  process.exit(0);
}

if (!interstitial || !rewarded) {
  fail("Utilisation : npm run admob:fullscreen:set -- --interstitial ca-app-pub-…/… --rewarded ca-app-pub-…/…");
}
if (String(config.mode || "").toLowerCase() !== "production") fail("Le helper d'activation finale exige config/admob.public.json en mode production.");
if (!isAppId(config.androidAppId)) fail("App ID AdMob Android réel manquant ou invalide.");
if (!isUnitId(interstitial)) fail("ID Interstitiel invalide.");
if (!isUnitId(rewarded)) fail("ID Rewarded invalide.");
if (GOOGLE_DEMO_UNITS.has(interstitial) || GOOGLE_DEMO_UNITS.has(rewarded)) fail("Les IDs de démonstration Google sont interdits dans l'activation production.");
if (interstitial === rewarded) fail("L'Interstitiel et le Rewarded doivent utiliser deux blocs AdMob distincts.");

const pub = publisher(config.androidAppId);
if (!pub || publisher(interstitial) !== pub || publisher(rewarded) !== pub) {
  fail("Les deux blocs plein écran doivent appartenir au même éditeur que l'App ID AdMob Android.");
}

const next = {
  ...config,
  androidInterstitialId: interstitial,
  androidRewardedId: rewarded,
};

console.log("✅ IDs AdMob plein écran validés.");
console.log(`   Interstitiel : ${interstitial}`);
console.log(`   Rewarded     : ${rewarded}`);
console.log(`   Éditeur      : pub-${pub}`);
if (dryRun) {
  console.log("ℹ️ --dry-run : aucun fichier modifié.");
  process.exit(0);
}

const tempPath = `${configPath}.tmp`;
fs.writeFileSync(tempPath, `${JSON.stringify(next, null, 2)}\n`);
fs.renameSync(tempPath, configPath);
console.log("✅ config/admob.public.json mis à jour atomiquement.");
console.log("➡️ Lance maintenant : npm run admob:fullscreen:check");
