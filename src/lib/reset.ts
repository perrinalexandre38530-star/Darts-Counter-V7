// ============================================================
// src/lib/reset.ts
// Helpers global pour reset les données locales de l'appareil
// ============================================================

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
      localStorage.clear();
  
      console.log("[RESET] Données locales effacées");
      return true;
    } catch (err) {
      console.error("[RESET] Échec resetLocalData", err);
      return false;
    }
  }
  