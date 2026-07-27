import { isCapacitorNativeRuntime } from "../lib/nativePlatform";
import { getPlayBillingProductSpec, type PlayBillingProductSpec } from "./billingCatalog";

export type NativeBillingStatus = {
  native: boolean;
  pluginAvailable: boolean;
  connected: boolean;
  purchasesEnabled: boolean;
  billingLibrary: string;
  verificationRequired: true;
  error?: string;
};

export type NativeBillingProduct = {
  productId: string;
  productType: "inapp" | "subs";
  title?: string;
  description?: string;
  formattedPrice?: string;
  currencyCode?: string;
  basePlanId?: string;
  offerToken?: string;
};

export type NativePurchaseReceipt = {
  status: "purchased" | "pending" | "cancelled" | "unavailable" | "error";
  productId?: string;
  purchaseToken?: string;
  acknowledged?: boolean;
  products?: string[];
  purchaseState?: number;
  error?: string;
};

type PlayBillingPlugin = {
  isAvailable: () => Promise<{ connected?: boolean; billingLibrary?: string }>;
  queryProduct: (options: PlayBillingProductSpec) => Promise<NativeBillingProduct>;
  purchase: (options: PlayBillingProductSpec & { accountIdHash?: string }) => Promise<NativePurchaseReceipt>;
  restorePurchases: () => Promise<{ purchases?: NativePurchaseReceipt[] }>;
  acknowledgePurchase: (options: { purchaseToken: string }) => Promise<{ acknowledged?: boolean }>;
};

let pluginCache: PlayBillingPlugin | null | undefined;

function env(name: string): string {
  try { return String((import.meta as any)?.env?.[name] || "").trim(); }
  catch { return ""; }
}

/**
 * Garde-fou RC : les achats restent impossibles tant qu'ils ne sont pas explicitement
 * activés APRÈS branchement de la vérification serveur Google Play.
 */
export function areNativePurchasesEnabled(): boolean {
  return env("VITE_PLAY_BILLING_PURCHASES_ENABLED") === "1";
}

function getPlugin(): PlayBillingPlugin | null {
  if (pluginCache !== undefined) return pluginCache;
  if (typeof window === "undefined" || !isCapacitorNativeRuntime()) {
    pluginCache = null;
    return null;
  }
  try {
    const cap = (window as any).Capacitor;
    if (typeof cap?.registerPlugin === "function") {
      pluginCache = cap.registerPlugin("PlayBilling") as PlayBillingPlugin;
      return pluginCache;
    }
    pluginCache = cap?.Plugins?.PlayBilling || null;
    return pluginCache;
  } catch {
    pluginCache = null;
    return null;
  }
}

export async function getNativeBillingStatus(): Promise<NativeBillingStatus> {
  const base: NativeBillingStatus = {
    native: isCapacitorNativeRuntime(),
    pluginAvailable: false,
    connected: false,
    purchasesEnabled: areNativePurchasesEnabled(),
    billingLibrary: "9.1.0",
    verificationRequired: true,
  };
  const plugin = getPlugin();
  if (!plugin) return base;
  try {
    const state = await plugin.isAvailable();
    return {
      ...base,
      pluginAvailable: true,
      connected: state?.connected === true,
      billingLibrary: String(state?.billingLibrary || "9.1.0"),
    };
  } catch (e: any) {
    return { ...base, pluginAvailable: true, error: String(e?.message || e || "Google Play Billing indisponible") };
  }
}

export async function queryNativeBillingProduct(productId: string): Promise<NativeBillingProduct | null> {
  const plugin = getPlugin();
  const spec = getPlayBillingProductSpec(productId);
  if (!plugin || !spec) return null;
  try { return await plugin.queryProduct(spec); }
  catch { return null; }
}

export async function purchaseNativeProduct(productId: string): Promise<NativePurchaseReceipt> {
  const plugin = getPlugin();
  const spec = getPlayBillingProductSpec(productId);
  if (!plugin || !spec) return { status: "unavailable", productId };
  if (!areNativePurchasesEnabled()) {
    return {
      status: "unavailable",
      productId,
      error: "Achats Google Play verrouillés jusqu'au branchement de la vérification serveur.",
    };
  }
  try {
    return await plugin.purchase(spec);
  } catch (e: any) {
    return { status: "error", productId, error: String(e?.message || e || "Achat Google Play impossible") };
  }
}

/**
 * Diagnostic/restauration : retourne les reçus natifs, mais N'ACCORDE aucun entitlement.
 * Les purchaseToken doivent être vérifiés côté serveur avant toute activation Premium.
 */
export async function restoreNativePurchases(): Promise<NativePurchaseReceipt[]> {
  const plugin = getPlugin();
  if (!plugin) return [];
  try {
    const result = await plugin.restorePurchases();
    return Array.isArray(result?.purchases) ? result.purchases : [];
  } catch {
    return [];
  }
}

export async function acknowledgeNativePurchaseAfterServerVerification(purchaseToken: string): Promise<boolean> {
  const plugin = getPlugin();
  const token = String(purchaseToken || "").trim();
  if (!plugin || !token) return false;
  const result = await plugin.acknowledgePurchase({ purchaseToken: token });
  return result?.acknowledged === true;
}
