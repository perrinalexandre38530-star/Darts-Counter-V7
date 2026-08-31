// ============================================================
// src/lib/storageQuota.ts
// Garde-fou localStorage (Option B)
// - Purge les grosses clés legacy si on approche du quota
// - Fournit des helpers safeSetItem / safeGetItem / safeRemoveItem
// ============================================================

const HEAVY_KEYS = [
  "dc-history-v1",
  "dc-history-v2",
  "dc-history",
  "dc_training_x01_stats_v1",
  "dc_training_clock_v1",
  "dc_training_registry_v1",
  "dc-quick-stats",
  "dc-lite-v1",
  "dc-online-matches-v1",
];

type PurgeOptions = { force?: boolean };

function purgeHeavyKeys(ls: Storage) {
  HEAVY_KEYS.forEach((key) => {
    try { ls.removeItem(key); } catch {}
  });
}

function isQuotaExceeded(e: unknown) {
  if (!e || typeof e !== "object") return false;
  const err = e as any;
  // Chrome / Edge
  if (err?.code === 22) return true;
  // Firefox
  if (err?.code === 1014) return true;
  const name = String(err?.name || "");
  return (
    name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED"
  );
}

/**
 * À appeler au boot : vérifie qu'on peut écrire
 * un petit item dans localStorage, sinon purge
 * les grosses clés legacy.
 */
export function purgeLegacyLocalStorageIfNeeded(options: PurgeOptions = {}) {
  if (typeof window === "undefined") return;

  try {
    const ls = window.localStorage;

    // Le boot doit rester O(1). Sur Android WebView, Object.entries(localStorage)
    // matérialisait toutes les grosses valeurs historiques sur le thread JS et
    // pouvait geler l'UI avant même que l'authentification soit restaurée.
    // Une purge forcée n'est utilisée qu'après un vrai échec d'écriture.
    if (options.force === true) {
      purgeHeavyKeys(ls);
      return;
    }

    const testKey = "__dc_quota_test__";
    ls.setItem(testKey, "1");
    ls.removeItem(testKey);
  } catch (e) {
    if (isQuotaExceeded(e)) {
      console.warn(
        "[DC][storageQuota] QuotaExceeded au test → purge ciblée des grosses clés."
      );
      try {
        purgeHeavyKeys(window.localStorage);
      } catch {
        // on ne peut vraiment rien faire de plus
      }
    } else {
      console.warn("[DC][storageQuota] Impossible de tester localStorage", e);
    }
  }
}

/**
 * Wrapper pour setItem qui encaisse QuotaExceededError
 * et tente une purge ciblée avant de réessayer.
 */
export function safeSetItem(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    if (isQuotaExceeded(e)) {
      console.warn(
        `[DC][storageQuota] QuotaExceeded sur "${key}" → purge + retry...`
      );
      try {
        const ls = window.localStorage;
        purgeHeavyKeys(ls);
        ls.setItem(key, value);
      } catch (e2) {
        console.error(
          `[DC][storageQuota] Impossible d'écrire "${key}" même après purge.`,
          e2
        );
      }
    } else {
      throw e;
    }
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemoveItem(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
