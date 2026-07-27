#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const androidRoot = path.join(root, "android");
const variablesPath = path.join(androidRoot, "variables.gradle");
const appGradlePath = path.join(androidRoot, "app", "build.gradle");
const manifestPath = path.join(androidRoot, "app", "src", "main", "AndroidManifest.xml");
const javaRoot = path.join(androidRoot, "app", "src", "main", "java", "com", "multisportsscoring", "app");
const mainActivityPath = path.join(javaRoot, "MainActivity.java");
const pluginPath = path.join(javaRoot, "PlayBillingPlugin.java");

const BILLING_VERSION = "9.1.0";
const TARGET_API = 36;

function fail(message) {
  console.error(`\n[GOOGLE PLAY ANDROID] ${message}\n`);
  process.exit(1);
}

for (const p of [androidRoot, variablesPath, appGradlePath, manifestPath, mainActivityPath]) {
  if (!fs.existsSync(p)) fail(`Fichier/dossier introuvable : ${p}. Lance d'abord npm run android:bootstrap.`);
}

// Android 16 / API 36 : exigence Play pour nouvelles apps / updates à partir du 31/08/2026.
let variables = fs.readFileSync(variablesPath, "utf8");
if (/compileSdkVersion\s*=\s*\d+/.test(variables)) {
  variables = variables.replace(/compileSdkVersion\s*=\s*\d+/, `compileSdkVersion = ${TARGET_API}`);
} else {
  fail("compileSdkVersion introuvable dans android/variables.gradle");
}
if (/targetSdkVersion\s*=\s*\d+/.test(variables)) {
  variables = variables.replace(/targetSdkVersion\s*=\s*\d+/, `targetSdkVersion = ${TARGET_API}`);
} else {
  fail("targetSdkVersion introuvable dans android/variables.gradle");
}
fs.writeFileSync(variablesPath, variables);

// Google Play Billing 9.1.0.
let gradle = fs.readFileSync(appGradlePath, "utf8");
gradle = gradle.replace(/\n\s*implementation\s+["']com\.android\.billingclient:billing:[^"']+["']/g, "");
const dependencyLine = `    implementation "com.android.billingclient:billing:${BILLING_VERSION}"`;
const depIndex = gradle.indexOf("dependencies {");
if (depIndex < 0) fail("Bloc dependencies introuvable dans android/app/build.gradle");
const insertAt = depIndex + "dependencies {".length;
gradle = `${gradle.slice(0, insertAt)}\n${dependencyLine}${gradle.slice(insertAt)}`;
fs.writeFileSync(appGradlePath, gradle);

// Permission BILLING.
let manifest = fs.readFileSync(manifestPath, "utf8");
const billingPermission = '    <uses-permission android:name="com.android.vending.BILLING" />';
manifest = manifest.replace(/\s*<uses-permission android:name="com\.android\.vending\.BILLING"\s*\/>/g, "");
const appPos = manifest.indexOf("<application");
if (appPos < 0) fail("<application> introuvable dans AndroidManifest.xml");
manifest = `${manifest.slice(0, appPos)}${billingPermission}\n\n    ${manifest.slice(appPos)}`;
fs.writeFileSync(manifestPath, manifest);

fs.mkdirSync(javaRoot, { recursive: true });

const pluginJava = `package com.multisportsscoring.app;

import androidx.annotation.NonNull;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final String BILLING_LIBRARY = "${BILLING_VERSION}";
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        PendingPurchasesParams pending = PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .build();
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(pending)
            .build();
    }

    private interface ReadyAction { void run(); }

    private void whenReady(PluginCall call, ReadyAction action) {
        if (billingClient == null) load();
        if (billingClient.isReady()) {
            action.run();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) action.run();
                else call.reject("Google Play Billing indisponible: " + result.getDebugMessage());
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Reconnexion automatique à la prochaine requête.
            }
        });
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        whenReady(call, () -> {
            JSObject ret = new JSObject();
            ret.put("connected", billingClient.isReady());
            ret.put("billingLibrary", BILLING_LIBRARY);
            call.resolve(ret);
        });
    }

    private QueryProductDetailsParams.Product queryProductSpec(String productId, String type) {
        String productType = "subs".equals(type) ? BillingClient.ProductType.SUBS : BillingClient.ProductType.INAPP;
        return QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(productType)
            .build();
    }

    private ProductDetails.SubscriptionOfferDetails selectSubscriptionOffer(ProductDetails details, String basePlanId) {
        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) return null;
        if (basePlanId != null && !basePlanId.isEmpty()) {
            for (ProductDetails.SubscriptionOfferDetails offer : offers) {
                if (basePlanId.equals(offer.getBasePlanId())) return offer;
            }
        }
        return offers.get(0);
    }

    private JSObject productToJson(ProductDetails details, String basePlanId) {
        JSObject ret = new JSObject();
        ret.put("productId", details.getProductId());
        ret.put("productType", details.getProductType());
        ret.put("title", details.getName());
        ret.put("description", details.getDescription());

        if (BillingClient.ProductType.SUBS.equals(details.getProductType())) {
            ProductDetails.SubscriptionOfferDetails offer = selectSubscriptionOffer(details, basePlanId);
            if (offer != null) {
                ret.put("basePlanId", offer.getBasePlanId());
                ret.put("offerToken", offer.getOfferToken());
                List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
                if (phases != null && !phases.isEmpty()) {
                    ProductDetails.PricingPhase phase = phases.get(phases.size() - 1);
                    ret.put("formattedPrice", phase.getFormattedPrice());
                    ret.put("currencyCode", phase.getPriceCurrencyCode());
                }
            }
        } else {
            ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
            if (offer != null) {
                ret.put("formattedPrice", offer.getFormattedPrice());
                ret.put("currencyCode", offer.getPriceCurrencyCode());
                String token = offer.getOfferToken();
                if (token != null && !token.isEmpty()) ret.put("offerToken", token);
            }
        }
        return ret;
    }

    private void querySingleProduct(PluginCall call, String productId, String type, String basePlanId, java.util.function.Consumer<ProductDetails> onFound) {
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(queryProductSpec(productId, type)))
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Produit Google Play indisponible: " + billingResult.getDebugMessage());
                return;
            }
            List<ProductDetails> list = productDetailsResult.getProductDetailsList();
            if (list == null || list.isEmpty()) {
                call.reject("Produit introuvable dans Google Play Console: " + productId);
                return;
            }
            onFound.accept(list.get(0));
        });
    }

    @PluginMethod
    public void queryProduct(PluginCall call) {
        String productId = call.getString("productId");
        String type = call.getString("productType", "inapp");
        String basePlanId = call.getString("basePlanId", "");
        if (productId == null || productId.trim().isEmpty()) {
            call.reject("productId requis");
            return;
        }
        whenReady(call, () -> querySingleProduct(call, productId, type, basePlanId, details -> {
            call.resolve(productToJson(details, basePlanId));
        }));
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        if (pendingPurchaseCall != null) {
            call.reject("Un achat Google Play est déjà en cours.");
            return;
        }
        String productId = call.getString("productId");
        String type = call.getString("productType", "inapp");
        String basePlanId = call.getString("basePlanId", "");
        String accountIdHash = call.getString("accountIdHash", "");

        if (productId == null || productId.trim().isEmpty()) {
            call.reject("productId requis");
            return;
        }

        whenReady(call, () -> querySingleProduct(call, productId, type, basePlanId, details -> {
            BillingFlowParams.ProductDetailsParams.Builder item = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details);

            if (BillingClient.ProductType.SUBS.equals(details.getProductType())) {
                ProductDetails.SubscriptionOfferDetails offer = selectSubscriptionOffer(details, basePlanId);
                if (offer == null) {
                    call.reject("Aucun base plan/offer disponible pour " + productId);
                    return;
                }
                item.setOfferToken(offer.getOfferToken());
            } else {
                ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
                if (offer != null && offer.getOfferToken() != null && !offer.getOfferToken().isEmpty()) {
                    item.setOfferToken(offer.getOfferToken());
                }
            }

            BillingFlowParams.Builder flow = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(item.build()));
            if (accountIdHash != null && !accountIdHash.isEmpty()) {
                flow.setObfuscatedAccountId(accountIdHash.substring(0, Math.min(accountIdHash.length(), 64)));
            }

            pendingPurchaseCall = call;
            BillingResult launch = billingClient.launchBillingFlow(getActivity(), flow.build());
            if (launch.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                pendingPurchaseCall = null;
                call.reject("Impossible d'ouvrir Google Play: " + launch.getDebugMessage());
            }
        }));
    }

    private JSObject purchaseToJson(Purchase purchase) {
        JSObject ret = new JSObject();
        int state = purchase.getPurchaseState();
        ret.put("status", state == Purchase.PurchaseState.PURCHASED ? "purchased" : "pending");
        ret.put("purchaseToken", purchase.getPurchaseToken());
        ret.put("purchaseState", state);
        ret.put("acknowledged", purchase.isAcknowledged());
        ret.put("purchaseTime", purchase.getPurchaseTime());
        ret.put("orderId", purchase.getOrderId());
        JSArray products = new JSArray();
        for (String product : purchase.getProducts()) products.put(product);
        ret.put("products", products);
        if (!purchase.getProducts().isEmpty()) ret.put("productId", purchase.getProducts().get(0));
        return ret;
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        if (call == null) return;
        pendingPurchaseCall = null;

        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            JSObject ret = new JSObject();
            ret.put("status", "cancelled");
            call.resolve(ret);
            return;
        }
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null || purchases.isEmpty()) {
            call.reject("Achat Google Play échoué: " + result.getDebugMessage());
            return;
        }

        // IMPORTANT : aucun entitlement et aucun acknowledge automatique ici.
        // Le purchaseToken doit d'abord être vérifié par le backend MULTISPORTS SCORING.
        call.resolve(purchaseToJson(purchases.get(0)));
    }

    private void queryOwned(String type, java.util.function.Consumer<List<Purchase>> done, java.util.function.Consumer<String> failed) {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(type)
            .build();
        billingClient.queryPurchasesAsync(params, (result, purchases) -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) done.accept(purchases);
            else failed.accept(result.getDebugMessage());
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        whenReady(call, () -> queryOwned(BillingClient.ProductType.INAPP, inapp -> {
            queryOwned(BillingClient.ProductType.SUBS, subs -> {
                List<Purchase> all = new ArrayList<>();
                if (inapp != null) all.addAll(inapp);
                if (subs != null) all.addAll(subs);
                JSArray items = new JSArray();
                for (Purchase p : all) items.put(purchaseToJson(p));
                JSObject ret = new JSObject();
                ret.put("purchases", items);
                ret.put("verificationRequired", true);
                call.resolve(ret);
            }, call::reject);
        }, call::reject));
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        String token = call.getString("purchaseToken");
        if (token == null || token.trim().isEmpty()) {
            call.reject("purchaseToken requis");
            return;
        }
        whenReady(call, () -> {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(token)
                .build();
            billingClient.acknowledgePurchase(params, result -> {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    JSObject ret = new JSObject();
                    ret.put("acknowledged", true);
                    call.resolve(ret);
                } else {
                    call.reject("Acknowledge Google Play échoué: " + result.getDebugMessage());
                }
            });
        });
    }
}
`;

fs.writeFileSync(pluginPath, pluginJava);

// Enregistrement du plugin Capacitor dans MainActivity.
let main = fs.readFileSync(mainActivityPath, "utf8");
if (!main.includes("import android.os.Bundle;")) {
  const packageEnd = main.indexOf(";\n");
  if (packageEnd < 0) fail("Package Java illisible dans MainActivity.java");
  main = `${main.slice(0, packageEnd + 2)}\nimport android.os.Bundle;${main.slice(packageEnd + 2)}`;
}
if (!main.includes("registerPlugin(PlayBillingPlugin.class)")) {
  const onCreate = /(public|protected)\s+void\s+onCreate\s*\(\s*Bundle\s+savedInstanceState\s*\)\s*\{/;
  if (onCreate.test(main)) {
    main = main.replace(onCreate, match => `${match}\n        registerPlugin(PlayBillingPlugin.class);`);
  } else {
    const classOpen = /public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{/;
    if (!classOpen.test(main)) fail("Classe MainActivity standard introuvable.");
    main = main.replace(classOpen, match => `${match}
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
`);
  }
}
fs.writeFileSync(mainActivityPath, main);

console.log("\n✅ Google Play Android configuré.");
console.log(`   Target / compile SDK : ${TARGET_API} (Android 16)`);
console.log(`   Google Play Billing  : ${BILLING_VERSION}`);
console.log("   Plugin Capacitor     : PlayBilling");
console.log("   Achats               : verrouillés côté React tant que VITE_PLAY_BILLING_PURCHASES_ENABLED != 1");
console.log("   Sécurité             : aucun entitlement / acknowledge avant vérification serveur");
