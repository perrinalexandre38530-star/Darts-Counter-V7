// ============================================
// src/lib/accountPurge.ts
// PURGE COMPLETE des données locales liées au compte.
//
// Pourquoi:
// - Déconnexion doit être 100% testable.
// - Éviter la "reconnexion fantôme" causée par des caches (IDB/localStorage).
// - Repartir d'un état propre lors d'un relogin.
//
// Best-effort:
// - Certains navigateurs n'exposent pas indexedDB.databases().
// - On supprime au minimum les DB connues + les clés localStorage dc_*.
// ============================================

const KNOWN_IDB_DBS = [
  // store principal
  "darts-counter-v5",
  // history dump
  "dc-store-v1",
  // buffer events
  "dc-events-v1",
  // misc
  "dc-indexeddb",
  // tournois
  "dc_tournaments_db_v1",
];

function isAppKey(key: string) {
  if (!key) return false;
  return (
    key.startsWith("dc_") ||
    key.startsWith("dc-") ||
    key.startsWith("sb-") ||
    key === "darts-counter-store-v3" ||
    key === "sb-auth-token" ||
    key === "supabase.auth.token" ||
    key === "dc_online_auth_supabase_v1"
  );
}

async function deleteIndexedDbByName(name: string): Promise<void> {
  try {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  } catch {
    // ignore
  }
}

async function deleteAllKnownIndexedDbs(): Promise<void> {
  // 1) si API dispo, on supprime tout ce qui ressemble à nos DB
  try {
    const dbs = (indexedDB as any).databases ? await (indexedDB as any).databases() : null;
    if (Array.isArray(dbs)) {
      const names = dbs
        .map((d: any) => String(d?.name || ""))
        .filter(Boolean)
        .filter((n: string) => n.startsWith("dc") || n.startsWith("darts-counter"));

      for (const n of names) {
        await deleteIndexedDbByName(n);
      }
      return;
    }
  } catch {
    // fallback
  }

  // 2) fallback: DB connues
  for (const n of KNOWN_IDB_DBS) {
    await deleteIndexedDbByName(n);
  }
}

export async function purgeAccountLocalData(): Promise<void> {
  // localStorage/sessionStorage (ciblé)
  try {
    const ls = window.localStorage;
    if (ls) {
      const keys = [] as string[];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && isAppKey(k)) keys.push(k);
      }
      keys.forEach((k) => {
        try {
          ls.removeItem(k);
        } catch {}
      });
    }
  } catch {}

  try {
    const ss = window.sessionStorage;
    if (ss) {
      const keys = [] as string[];
      for (let i = 0; i < ss.length; i++) {
        const k = ss.key(i);
        if (k && isAppKey(k)) keys.push(k);
      }
      keys.forEach((k) => {
        try {
          ss.removeItem(k);
        } catch {}
      });
    }
  } catch {}

  // IndexedDB
  try {
    if (typeof indexedDB !== "undefined") {
      await deleteAllKnownIndexedDbs();
    }
  } catch {}
}
