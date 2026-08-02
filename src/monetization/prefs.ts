import type { MonetizationPrefs, PremiumState } from "./types";

const PREFS_KEY = "dc_monetization_prefs_v1";
export const PREFS_CHANGED_EVENT = "dc:monetization-prefs-changed";
export const VERIFIED_ENTITLEMENTS_CHANGED_EVENT = "dc:verified-entitlements-changed";

const REMOVE_ADS_LIFETIME_PRODUCT = "msc_remove_ads_lifetime";

export const DEFAULT_MONETIZATION_PREFS: MonetizationPrefs = {
  adsEnabled: true,
  bannersEnabled: true,
  endGameVideoEnabled: true,
  // Choix par défaut : ne jamais retarder l'affichage du résultat.
  endGameAdTiming: "after_results",
  // Politique FREE : une tentative d'interstitiel après chaque partie terminée.
  endGameEveryMatches: 1,
  minInterstitialIntervalMs: 0,
  houseAdsEnabled: true,
  testMode: false,
};

function normalize(raw: any): MonetizationPrefs {
  return {
    ...DEFAULT_MONETIZATION_PREFS,
    ...(raw && typeof raw === "object" ? raw : {}),
    // Migration forcée : les anciennes préférences 1/3 + 8 min ne doivent plus
    // survivre dans le localStorage après l'installation de ce patch.
    endGameVideoEnabled: true,
    endGameAdTiming: "after_results",
    endGameEveryMatches: 1,
    minInterstitialIntervalMs: 0,
  };
}

export function loadMonetizationPrefs(): MonetizationPrefs {
  if (typeof window === "undefined") return DEFAULT_MONETIZATION_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_MONETIZATION_PREFS;
  }
}

export function saveMonetizationPrefs(patch: Partial<MonetizationPrefs>): MonetizationPrefs {
  const next = normalize({ ...loadMonetizationPrefs(), ...patch });
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
    try { window.dispatchEvent(new CustomEvent(PREFS_CHANGED_EVENT, { detail: next })); } catch {}
  }
  return next;
}

export function subscribeMonetizationPrefs(listener: (prefs: MonetizationPrefs) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<MonetizationPrefs>).detail;
    listener(detail || loadMonetizationPrefs());
  };
  const storage = (event: StorageEvent) => {
    if (!event.key || event.key === PREFS_KEY) listener(loadMonetizationPrefs());
  };
  window.addEventListener(PREFS_CHANGED_EVENT, handler as EventListener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(PREFS_CHANGED_EVENT, handler as EventListener);
    window.removeEventListener("storage", storage);
  };
}

type VerifiedRuntimeEntitlements = {
  premium?: boolean;
  removeAds?: boolean;
  adFree?: boolean;
  source?: "google-play" | "verified-server" | string;
  products?: unknown[];
};

function readVerifiedRuntimeEntitlements(): VerifiedRuntimeEntitlements | null {
  if (typeof window === "undefined") return null;
  try {
    const runtime = (window as any).__dcVerifiedEntitlements;
    return runtime && typeof runtime === "object" ? runtime as VerifiedRuntimeEntitlements : null;
  } catch {
    return null;
  }
}

function normalizeVerifiedSource(runtime: VerifiedRuntimeEntitlements | null): PremiumState["source"] {
  return runtime?.source === "google-play" ? "google-play" : runtime ? "verified-server" : "none";
}

function normalizeVerifiedProducts(runtime: VerifiedRuntimeEntitlements | null): string[] {
  return Array.isArray(runtime?.products) ? runtime!.products!.map(String) : [];
}

/**
 * IMPORTANT : le Premium réel ne doit jamais être déduit d'un simple localStorage.
 * Le backend / Google Play doit injecter ici un entitlement DÉJÀ vérifié.
 */
export function getVerifiedPremiumState(): PremiumState {
  const runtime = readVerifiedRuntimeEntitlements();
  if (runtime?.premium === true) {
    return {
      active: true,
      source: normalizeVerifiedSource(runtime),
      products: normalizeVerifiedProducts(runtime),
    };
  }
  try {
    if ((import.meta as any)?.env?.DEV && (import.meta as any)?.env?.VITE_MONETIZATION_DEV_PREMIUM === "1") {
      return { active: true, source: "developer", products: ["dev-premium"] };
    }
  } catch {}
  return { active: false, source: "none", products: [] };
}

/**
 * Droit SANS PUB vérifié. Il couvre le Premium et l'achat "sans pub à vie"
 * sans confondre ce dernier avec les autres avantages Premium.
 */
export function getVerifiedAdFreeState(): PremiumState {
  const runtime = readVerifiedRuntimeEntitlements();
  const products = normalizeVerifiedProducts(runtime);
  const verifiedAdFree =
    runtime?.premium === true ||
    runtime?.removeAds === true ||
    runtime?.adFree === true ||
    products.includes(REMOVE_ADS_LIFETIME_PRODUCT);

  if (verifiedAdFree) {
    return {
      active: true,
      source: normalizeVerifiedSource(runtime),
      products,
    };
  }

  try {
    if ((import.meta as any)?.env?.DEV && (import.meta as any)?.env?.VITE_MONETIZATION_DEV_PREMIUM === "1") {
      return { active: true, source: "developer", products: ["dev-premium"] };
    }
  } catch {}

  return { active: false, source: "none", products: [] };
}

/**
 * Point d'entrée réservé à une réponse serveur / Google Play déjà vérifiée.
 * Rien n'est persisté en local : un simple localStorage ne peut jamais accorder
 * Premium ou Sans pub.
 */
export function applyVerifiedEntitlements(runtime: VerifiedRuntimeEntitlements | null): void {
  if (typeof window === "undefined") return;
  try {
    if (runtime && typeof runtime === "object") {
      (window as any).__dcVerifiedEntitlements = {
        premium: runtime.premium === true,
        removeAds: runtime.removeAds === true,
        adFree: runtime.adFree === true,
        source: runtime.source === "google-play" ? "google-play" : "verified-server",
        products: normalizeVerifiedProducts(runtime),
      };
    } else {
      delete (window as any).__dcVerifiedEntitlements;
    }
    window.dispatchEvent(new CustomEvent(VERIFIED_ENTITLEMENTS_CHANGED_EVENT, {
      detail: {
        premium: getVerifiedPremiumState(),
        adFree: getVerifiedAdFreeState(),
      },
    }));
  } catch {}
}

/**
 * À appeler si un autre module remplace directement __dcVerifiedEntitlements
 * après une vérification serveur.
 */
export function notifyVerifiedEntitlementsChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(VERIFIED_ENTITLEMENTS_CHANGED_EVENT, {
      detail: {
        premium: getVerifiedPremiumState(),
        adFree: getVerifiedAdFreeState(),
      },
    }));
  } catch {}
}

export function subscribeVerifiedEntitlements(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(VERIFIED_ENTITLEMENTS_CHANGED_EVENT, handler as EventListener);
  return () => window.removeEventListener(VERIFIED_ENTITLEMENTS_CHANGED_EVENT, handler as EventListener);
}

export function canRequestPaidAds(prefs: MonetizationPrefs = loadMonetizationPrefs()): boolean {
  return prefs.adsEnabled && !getVerifiedAdFreeState().active;
}

export function canRequestBannerAds(prefs: MonetizationPrefs = loadMonetizationPrefs()): boolean {
  return canRequestPaidAds(prefs) && prefs.bannersEnabled;
}
