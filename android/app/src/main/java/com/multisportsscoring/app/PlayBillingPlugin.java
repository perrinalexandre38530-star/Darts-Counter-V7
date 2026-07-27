package com.multisportsscoring.app;

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
    private static final String BILLING_LIBRARY = "9.1.0";
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
