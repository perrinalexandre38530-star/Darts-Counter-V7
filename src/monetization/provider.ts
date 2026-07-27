import type { AdShowResult } from "./types";
import { loadMonetizationPrefs } from "./prefs";

export type PurchaseResult = {
  status: "purchased" | "restored" | "cancelled" | "unavailable" | "error";
  productId?: string;
  error?: string;
};

type NativeMonetizationBridge = {
  showInterstitial?: (payload: { placement: string; reason?: string }) => Promise<any> | any;
  showRewarded?: (payload: { rewardId: string }) => Promise<any> | any;
  purchase?: (payload: { productId: string }) => Promise<any> | any;
  restorePurchases?: () => Promise<any> | any;
};

function nativeBridge(): NativeMonetizationBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as any).DCNativeMonetization;
  return bridge && typeof bridge === "object" ? bridge : null;
}

function testInterstitial(title: string): Promise<AdShowResult> {
  if (typeof document === "undefined") return Promise.resolve({ status: "unavailable", provider: "none" });
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.setAttribute("data-dc-ad-test", "interstitial");
    Object.assign(root.style, {
      position: "fixed", inset: "0", zIndex: "2147483000", display: "grid", placeItems: "center",
      background: "rgba(0,0,0,.94)", padding: "20px", fontFamily: "system-ui, sans-serif",
    });
    const card = document.createElement("div");
    Object.assign(card.style, {
      width: "min(440px, 94vw)", borderRadius: "24px", padding: "24px", textAlign: "center",
      color: "white", background: "linear-gradient(180deg,#172033,#0b0f18)",
      border: "1px solid rgba(255,196,60,.55)", boxShadow: "0 24px 80px rgba(0,0,0,.65)",
    });
    const label = document.createElement("div");
    label.textContent = "PUBLICITÉ TEST";
    Object.assign(label.style, { fontSize: "11px", letterSpacing: "1.4px", opacity: ".72", marginBottom: "18px" });
    const heading = document.createElement("div");
    heading.textContent = title;
    Object.assign(heading.style, { fontSize: "22px", fontWeight: "900", marginBottom: "10px" });
    const body = document.createElement("div");
    body.textContent = "Emplacement vidéo/interstitiel prêt pour AdMob. Aucun réseau réel n'est appelé en mode test.";
    Object.assign(body.style, { fontSize: "13px", lineHeight: "1.45", opacity: ".78", marginBottom: "20px" });
    const button = document.createElement("button");
    button.textContent = "Fermer";
    Object.assign(button.style, {
      border: "0", borderRadius: "999px", padding: "11px 22px", fontWeight: "900", cursor: "pointer",
      background: "linear-gradient(180deg,#ffd65a,#ffb300)", color: "#211706",
    });
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      try { root.remove(); } catch {}
      resolve({ status: "shown", provider: "web-test" });
    };
    button.onclick = close;
    card.append(label, heading, body, button);
    root.append(card);
    document.body.append(root);
  });
}

export async function showInterstitialAd(reason = "end_game", forceTest = false): Promise<AdShowResult> {
  const bridge = nativeBridge();
  if (bridge?.showInterstitial) {
    try {
      await bridge.showInterstitial({ placement: "end_game", reason });
      return { status: "shown", provider: "android" };
    } catch (e: any) {
      return { status: "error", provider: "android", error: String(e?.message || e || "AdMob error") };
    }
  }

  const prefs = loadMonetizationPrefs();
  if (forceTest || prefs.testMode) return testInterstitial("Fin de partie");
  return { status: "unavailable", provider: "none" };
}

export async function showRewardedAd(rewardId: string): Promise<AdShowResult> {
  const bridge = nativeBridge();
  if (bridge?.showRewarded) {
    try {
      await bridge.showRewarded({ rewardId });
      return { status: "shown", provider: "android" };
    } catch (e: any) {
      return { status: "error", provider: "android", error: String(e?.message || e || "Rewarded error") };
    }
  }
  const prefs = loadMonetizationPrefs();
  if (prefs.testMode) return testInterstitial(`Récompense : ${rewardId}`);
  return { status: "unavailable", provider: "none" };
}

export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  const bridge = nativeBridge();
  if (!bridge?.purchase) return { status: "unavailable", productId };
  try {
    const result = await bridge.purchase({ productId });
    return { status: result?.status || "purchased", productId };
  } catch (e: any) {
    return { status: "error", productId, error: String(e?.message || e || "Billing error") };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  const bridge = nativeBridge();
  if (!bridge?.restorePurchases) return { status: "unavailable" };
  try {
    await bridge.restorePurchases();
    return { status: "restored" };
  } catch (e: any) {
    return { status: "error", error: String(e?.message || e || "Restore error") };
  }
}
