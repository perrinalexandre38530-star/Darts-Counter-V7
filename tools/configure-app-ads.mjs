#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const outputPath = path.join(root, "public", "app-ads.txt");
const publicConfigPath = path.join(root, "config", "admob.public.json");

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

function modeFromEnv(values, publicConfig) {
  const explicit = String(process.env.VITE_ADMOB_MODE || values.VITE_ADMOB_MODE || publicConfig.mode || "").trim().toLowerCase();
  if (["production", "prod", "live"].includes(explicit)) return "production";
  if (["real_test", "real-test", "device_test", "device-test"].includes(explicit)) return "real_test";
  if (["google_test", "google-test", "demo", "test"].includes(explicit)) return "google_test";
  return String(process.env.VITE_ADMOB_TEST_MODE || values.VITE_ADMOB_TEST_MODE || "1").trim() === "0" ? "production" : "google_test";
}

function publisherDigits(value) {
  const raw = String(value || "").trim();
  return raw.match(/^pub-(\d{16})$/)?.[1]
    || raw.match(/^(\d{16})$/)?.[1]
    || raw.match(/^ca-app-pub-(\d{16})[~/]/)?.[1]
    || "";
}

const env = readDotEnv();
const publicConfig = readPublicConfig();
const mode = modeFromEnv(env, publicConfig);
const publisher = publisherDigits(
  process.env.ADMOB_PUBLISHER_ID
  || env.ADMOB_PUBLISHER_ID
  || process.env.VITE_ADMOB_ANDROID_APP_ID
  || env.VITE_ADMOB_ANDROID_APP_ID
  || publicConfig.publisherId
  || publicConfig.androidAppId
  || ""
);

if (!publisher) {
  if (mode === "production") {
    console.error("\n[APP-ADS.TXT] ADMOB_PUBLISHER_ID manque en mode production.\n");
    process.exit(1);
  }
  console.log("ℹ️ app-ads.txt non généré : renseigne ADMOB_PUBLISHER_ID après création du compte/app AdMob.");
  process.exit(0);
}

const lines = [`google.com, pub-${publisher}, DIRECT, f08c47fec0942fa0`];
const extras = String(process.env.ADMOB_APP_ADS_EXTRA_LINES || env.ADMOB_APP_ADS_EXTRA_LINES || "")
  .replace(/\\n/g, "\n")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
for (const line of extras) if (!lines.includes(line)) lines.push(line);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`✅ app-ads.txt généré dans public/app-ads.txt pour pub-${publisher}.`);
