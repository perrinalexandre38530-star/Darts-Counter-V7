#!/usr/bin/env node
/**
 * Configuration automatique Stripe stockage Multisports.
 *
 * Commandes utiles :
 *   node tools/create-storage-stripe-products.mjs
 *   node tools/create-storage-stripe-products.mjs --write-env
 *   node tools/create-storage-stripe-products.mjs --write-env --create-webhook
 *
 * La commande --write-env met à jour le .env et crée un backup .env.bak-YYYYMMDD-HHMMSS.
 * La commande --create-webhook crée le webhook stockage vers STRIPE_STORAGE_WEBHOOK_URL
 * et remplit STRIPE_WEBHOOK_SECRET_STORAGE si Stripe retourne le secret.
 */

import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const WRITE_ENV = args.has("--write-env") || args.has("--write") || args.has("--apply");
const CREATE_WEBHOOK = args.has("--create-webhook") || args.has("--webhook");
const ENV_FILE = process.env.ENV_FILE || ".env";

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "");
}

function loadDotEnv(file = ENV_FILE) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return { full, text: "" };
  const text = fs.readFileSync(full, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#") || !raw.includes("=")) continue;
    const idx = raw.indexOf("=");
    const key = raw.slice(0, idx).trim();
    let value = raw.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
  return { full, text };
}

const env = loadDotEnv();
const SECRET = String(process.env.STRIPE_SECRET_KEY || "").trim();
if (!SECRET) {
  console.error("❌ STRIPE_SECRET_KEY manquant dans .env");
  process.exit(1);
}
if (typeof fetch !== "function") {
  console.error("❌ Node 18+ requis : fetch() n'est pas disponible.");
  process.exit(1);
}

const PLANS = [
  { id: "starter_500mb", label: "Starter 500 Mo", monthly: 99, yearly: 999, monthlyEnv: "STRIPE_PRICE_STORAGE_STARTER_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_STARTER_YEARLY" },
  { id: "player_5gb", label: "Player 5 Go", monthly: 199, yearly: 1999, monthlyEnv: "STRIPE_PRICE_STORAGE_PLAYER_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_PLAYER_YEARLY" },
  { id: "plus_25gb", label: "Plus 25 Go", monthly: 399, yearly: 3999, monthlyEnv: "STRIPE_PRICE_STORAGE_PLUS_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_PLUS_YEARLY" },
  { id: "pro_100gb", label: "Pro 100 Go", monthly: 999, yearly: 9999, monthlyEnv: "STRIPE_PRICE_STORAGE_PRO_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_PRO_YEARLY" },
  { id: "club_500gb", label: "Club 500 Go", monthly: 2499, yearly: 24900, monthlyEnv: "STRIPE_PRICE_STORAGE_CLUB_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_CLUB_YEARLY" },
  { id: "titan_2tb", label: "Titan 2 To", monthly: 5999, yearly: 59900, monthlyEnv: "STRIPE_PRICE_STORAGE_TITAN_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_TITAN_YEARLY" },
];

const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

function form(entries = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params;
}

async function stripe(pathname, options = {}) {
  const res = await fetch(`https://api.stripe.com${pathname}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${SECRET}`,
      ...(options.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: options.body,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = json?.error?.message || text || `Stripe HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

async function findPriceByLookupKey(lookupKey) {
  const qs = new URLSearchParams();
  qs.append("lookup_keys[]", lookupKey);
  qs.set("limit", "1");
  const json = await stripe(`/v1/prices?${qs.toString()}`);
  return Array.isArray(json?.data) ? json.data[0] || null : null;
}

async function createProduct(plan) {
  const body = form({
    name: `Multisports Storage — ${plan.label}`,
    description: `Quota cloud R2 ${plan.label} pour Multisports Scoring.`,
    "metadata[multisports_feature]": "storage_cloud",
    "metadata[multisports_plan_id]": plan.id,
  });
  return stripe("/v1/products", { method: "POST", body });
}

async function createRecurringPrice(plan, productId, interval, amountCents) {
  const lookupKey = `multisports_storage_${plan.id}_${interval}`;
  const existing = await findPriceByLookupKey(lookupKey);
  if (existing?.id) return { price: existing, created: false };

  const body = form({
    product: productId,
    currency: "eur",
    unit_amount: amountCents,
    "recurring[interval]": interval === "yearly" ? "year" : "month",
    lookup_key: lookupKey,
    "metadata[multisports_feature]": "storage_cloud",
    "metadata[multisports_plan_id]": plan.id,
    "metadata[billing_interval]": interval,
  });
  const price = await stripe("/v1/prices", { method: "POST", body });
  return { price, created: true };
}

async function createStorageWebhook() {
  const existingSecret = String(process.env.STRIPE_WEBHOOK_SECRET_STORAGE || process.env.STRIPE_STORAGE_WEBHOOK_SECRET || "").trim();
  if (existingSecret) {
    console.log("✅ STRIPE_WEBHOOK_SECRET_STORAGE existe déjà dans .env : création webhook ignorée.");
    return null;
  }
  const webhookUrl = String(process.env.STRIPE_STORAGE_WEBHOOK_URL || "https://api.multisports-api.fr/account/storage/stripe-webhook").trim();
  if (!webhookUrl.startsWith("https://")) {
    throw new Error(`Webhook URL invalide : ${webhookUrl}. Stripe exige une URL HTTPS publique.`);
  }
  const body = new URLSearchParams();
  body.set("url", webhookUrl);
  body.set("description", "Multisports Scoring — stockage cloud R2");
  for (const eventName of WEBHOOK_EVENTS) body.append("enabled_events[]", eventName);
  body.set("metadata[multisports_feature]", "storage_cloud");
  body.set("metadata[managed_by]", "create-storage-stripe-products");
  const endpoint = await stripe("/v1/webhook_endpoints", { method: "POST", body });
  if (!endpoint?.secret) {
    console.warn("⚠️ Webhook créé mais Stripe n'a pas renvoyé de secret. Récupère le whsec_... dans le dashboard Stripe.");
    return { endpoint, env: null };
  }
  console.log(`✅ Webhook stockage créé : ${endpoint.id}`);
  console.log(`   URL : ${webhookUrl}`);
  return { endpoint, env: { STRIPE_WEBHOOK_SECRET_STORAGE: endpoint.secret, STRIPE_STORAGE_WEBHOOK_URL: webhookUrl } };
}

function upsertEnvLines(originalText, values) {
  let text = originalText || "";
  if (!text.endsWith("\n")) text += "\n";
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=.*$`, "m");
    if (pattern.test(text)) text = text.replace(pattern, line);
    else text += `${line}\n`;
  }
  return text;
}

const mode = SECRET.startsWith("sk_live_") ? "LIVE" : SECRET.startsWith("sk_test_") ? "TEST" : "INCONNU";
console.log(`Stripe mode détecté : ${mode}`);
console.log("Création / récupération des produits + prix stockage…\n");

const envValues = {};
for (const plan of PLANS) {
  const existingMonthly = await findPriceByLookupKey(`multisports_storage_${plan.id}_monthly`);
  const existingYearly = await findPriceByLookupKey(`multisports_storage_${plan.id}_yearly`);
  let productId = existingMonthly?.product || existingYearly?.product || "";

  if (!productId) {
    const product = await createProduct(plan);
    productId = product.id;
    console.log(`✅ Produit créé : ${plan.label} (${productId})`);
  } else {
    console.log(`↩️  Produit existant réutilisé : ${plan.label} (${productId})`);
  }

  const monthly = await createRecurringPrice(plan, productId, "monthly", plan.monthly);
  const yearly = await createRecurringPrice(plan, productId, "yearly", plan.yearly);
  envValues[plan.monthlyEnv] = monthly.price.id;
  envValues[plan.yearlyEnv] = yearly.price.id;
  console.log(`${monthly.created ? "✅" : "↩️ "} ${plan.monthlyEnv}=${monthly.price.id}`);
  console.log(`${yearly.created ? "✅" : "↩️ "} ${plan.yearlyEnv}=${yearly.price.id}`);
}

let webhookResult = null;
if (CREATE_WEBHOOK) {
  console.log("\nCréation / configuration du webhook stockage…");
  webhookResult = await createStorageWebhook();
  if (webhookResult?.env) Object.assign(envValues, webhookResult.env);
}

const block = Object.entries(envValues).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
const generatedPath = path.resolve(process.cwd(), "storage-stripe.generated.env");
fs.writeFileSync(generatedPath, block, "utf8");

console.log("\n================ LIGNES .env À COPIER / APPLIQUER ================");
console.log(block.trim());
console.log("==================================================================\n");
console.log(`Fichier généré : ${generatedPath}`);

if (WRITE_ENV) {
  const current = fs.existsSync(env.full) ? fs.readFileSync(env.full, "utf8") : "";
  const backup = `${env.full}.bak-${timestamp()}`;
  if (current) fs.writeFileSync(backup, current, "utf8");
  fs.writeFileSync(env.full, upsertEnvLines(current, envValues), "utf8");
  console.log(`✅ .env mis à jour : ${env.full}`);
  if (current) console.log(`Backup créé : ${backup}`);
} else {
  console.log("Mode lecture seule : ton .env n'a pas été modifié.");
  console.log("Pour appliquer automatiquement : npm run stripe:storage:setup");
}
