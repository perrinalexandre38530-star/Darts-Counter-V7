import type { MonetizationPrefs, PremiumState } from "./types";

const PREFS_KEY = "dc_monetization_prefs_v1";
export const PREFS_CHANGED_EVENT = "dc:monetization-prefs-changed";

export const DEFAULT_MONETIZATION_PREFS: MonetizationPrefs = {
  adsEnabled: true,
  bannersEnabled: true,
  endGameVideoEnabled: true,
  // Choix par défaut : ne jamais retarder l'affichage du résultat.
  endGameAdTiming: "after_results",
  endGameEveryMatches: 3,
  minInterstitialIntervalMs: 8 * 60 * 1000,
  houseAdsEnabled: true,
  testMode: false,
};

function normalize(raw: any): MonetizationPrefs {
  const every = Math.max(1, Math.min(10, Number(raw?.endGameEveryMatches || DEFAULT_MONETIZATION_PREFS.endGameEveryMatches)));
  const minMs = Math.max(60_000, Math.min(60 * 60_000, Number(raw?.minInterstitialIntervalMs || DEFAULT_MONETIZATION_PREFS.minInterstitialIntervalMs)));
  const timing = raw?.endGameAdTiming === "before_results" || raw?.endGameAdTiming === "off"
    ? raw.endGameAdTiming
    : "after_results";

  return {
    ...DEFAULT_MONETIZATION_PREFS,
    ...(raw && typeof raw === "object" ? raw : {}),
    endGameEveryMatches: every,
    minInterstitialIntervalMs: minMs,
    endGameAdTiming: timing,
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

/**
 * IMPORTANT : le Premium réel ne doit jamais être déduit d'un simple localStorage.
 * Le futur backend / Google Play doit injecter ici un entitlement déjà vérifié.
 */
export function getVerifiedPremiumState(): PremiumState {
  if (typeof window === "undefined") return { active: false, source: "none", products: [] };
  try {
    const runtime = (window as any).__dcVerifiedEntitlements;
    if (runtime?.premium === true) {
      return {
        active: true,
        source: runtime?.source === "google-play" ? "google-play" : "verified-server",
        products: Array.isArray(runtime?.products) ? runtime.products.map(String) : [],
      };
    }
    if ((import.meta as any)?.env?.DEV && (import.meta as any)?.env?.VITE_MONETIZATION_DEV_PREMIUM === "1") {
      return { active: true, source: "developer", products: ["dev-premium"] };
    }
  } catch {}
  return { active: false, source: "none", products: [] };
}
