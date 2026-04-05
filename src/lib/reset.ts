// ============================================================
// src/lib/reset.ts
// Helpers global pour reset les données locales de l'appareil
// ============================================================

const PRESERVED_AUTH_STORAGE_KEYS = [
  "dc_nas_access_token_v1",
  "dc_nas_refresh_token_v1",
  "dc_online_auth_supabase_v1",
  "supabase.auth.token",
] as const;

function snapshotPreservedAuthStorage() {
  const out: Record<string, string> = {};
  try {
    for (const key of PRESERVED_AUTH_STORAGE_KEYS) {
      const value = window.localStorage.getItem(key);
      if (typeof value === "string" && value.length > 0) out[key] = value;
    }
  } catch {}
  return out;
}

function restorePreservedAuthStorage(snapshot: Record<string, string>) {
  try {
    for (const [key, value] of Object.entries(snapshot || {})) {
      if (typeof value === "string" && value.length > 0) {
        window.localStorage.setItem(key, value);
      }
    }
  } catch {}
}

export async function resetLocalData() {
    try {
      // ---- Suppression des DB IndexedDB (noms à adapter si besoin) ----
      const dbs = [
        "dc_history_v1",
        "dc_stats_v1",
        "dc_profiles_v1",
        "dc_settings_v1",
      ];
  
      for (const dbName of dbs) {
        try {
          // Certains navigateurs supportent indexedDB.deleteDatabase
          const req = indexedDB.deleteDatabase(dbName);
          req.onerror = () =>
            console.warn("[RESET] Échec suppression DB", dbName);
        } catch (e) {
          console.warn("[RESET] Exception deleteDatabase", dbName, e);
        }
      }
  
      // ---- localStorage ----
      const preservedAuth = snapshotPreservedAuthStorage();
      localStorage.clear();
      restorePreservedAuthStorage(preservedAuth);
  
      console.log("[RESET] Données locales effacées");
      return true;
    } catch (err) {
      console.error("[RESET] Échec resetLocalData", err);
      return false;
    }
  }
  