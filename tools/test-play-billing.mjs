#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
const check = (label, ok) => checks.push([label, !!ok]);

const billing = read("src/monetization/nativeBilling.ts");
const catalog = read("src/monetization/billingCatalog.ts");
const provider = read("src/monetization/provider.ts");
const configure = read("tools/configure-android-play-billing.mjs");
const boot = read("tools/bootstrap-android-capacitor.mjs");

check("Billing 9.1.0", configure.includes('BILLING_VERSION = "9.1.0"'));
check("Android API 36", configure.includes("TARGET_API = 36"));
check("BILLING permission", configure.includes("com.android.vending.BILLING"));
check("Custom PlayBilling plugin", configure.includes('@CapacitorPlugin(name = "PlayBilling")'));
check("No automatic acknowledge before server verification", configure.includes("aucun entitlement / acknowledge") || configure.includes("aucun entitlement"));
check("Purchases default locked", billing.includes('VITE_PLAY_BILLING_PURCHASES_ENABLED') && billing.includes('=== "1"'));
check("Server verification required", billing.includes("verificationRequired: true"));
check("Monthly subscription", catalog.includes('msc_premium_monthly') && catalog.includes('productType: "subs"'));
check("Yearly subscription", catalog.includes('msc_premium_yearly') && catalog.includes('productType: "subs"'));
check("Lifetime is INAPP", catalog.includes('msc_remove_ads_lifetime') && catalog.includes('productType: "inapp"'));
check("Provider calls native purchase", provider.includes("purchaseNativeProduct"));
check("Provider calls native restore", provider.includes("restoreNativePurchases"));
check("Bootstrap configures Play Billing", boot.includes("configure-android-play-billing.mjs"));

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "✅" : "❌"} ${label}`);
if (failed.length) process.exit(1);
console.log(`\n✅ Google Play Billing regression: ${checks.length}/${checks.length}`);
