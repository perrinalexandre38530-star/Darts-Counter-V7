// =============================================================
// src/lib/tournaments/storeLocal.ts
// Stockage TOURNOIS LOCAL -> IndexedDB (anti QuotaExceededError)
// - API sync côté UI via cache mémoire (chargement async au boot)
// - ✅ NEW: API ASYNC (getTournamentLocalAsync / listMatchesForTournamentLocalAsync)
//   pour éviter les écrans vides au 1er render (lazy cache).
// - Migration automatique depuis localStorage:
//   - dc_tournaments_v1
//   - dc_tournament_matches_v1:<id> / dc_tournament_matches_<id> / dc_tournament_<id>_matches
//   - dc_tournament_matches_v1  (map: Record<id, matches[]>)
// =============================================================

type AnyObj = any;

/** --- LocalStorage legacy keys --- */
const LS_TOURNAMENTS = "dc_tournaments_v1";

// format "map": { [tournamentId]: matches[] }
const LS_TOURNAMENT_MATCHES_MAP = "dc_tournament_matches_v1";

// formats legacy "par tournoi"
const lsMatchesKeyCandidates = (id: string) => [
  `dc_tournament_matches_v1:${id}`,
  `dc_tournament_matches_${id}`,
  `dc_tournament_${id}_matches`,
];

/** --- IndexedDB --- */
const DB_NAME = "dc_tournaments_db_v1";
const DB_VER = 1;
const STORE_T = "tournaments";
const STORE_M = "matchesByTournament";

/* =============================================================
 * ✅ Event: refresh UI quand tournois/matchs changent
 * ============================================================= */
export const TOURNAMENTS_UPDATED_EVENT = "dc_tournaments_updated";

function notifyTournamentsUpdated() {
  try {
    window.dispatchEvent(new CustomEvent(TOURNAMENTS_UPDATED_EVENT));
  } catch {}
}

/* ---------------------- IDB tiny wrapper ---------------------- */

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_T)) {
        db.createObjectStore(STORE_T, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_M)) {
        db.createObjectStore(STORE_M, { keyPath: "id" }); // { id: tid, matches: [] }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(storeName: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const st = tx.objectStore(storeName);
    const req = st.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

async function idbGet(storeName: string, key: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const st = tx.objectStore(storeName);
    const req = st.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

async function idbPut(storeName: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const st = tx.objectStore(storeName);
    const req = st.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const st = tx.objectStore(storeName);
    const req = st.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

/* ---------------------- Cache mémoire (API sync) ---------------------- */

let loaded = false;
let loadingPromise: Promise<void> | null = null;

let cacheTournaments: AnyObj[] = [];
let cacheMatchesByTid: Record<string, AnyObj[] | undefined> = {};

function safeParseJSON(raw: string | null): any {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Migration best-effort depuis localStorage
 * - tournois : dc_tournaments_v1 (array)
 * - matches :
 *   A) map: dc_tournament_matches_v1 => Record<id, matches[]>
 *   B) keys legacy par tournoi
 */
async function migrateFromLocalStorageIfNeeded() {
  const rawTours = localStorage.getItem(LS_TOURNAMENTS);
  const tours = safeParseJSON(rawTours);

  const hasTours = Array.isArray(tours) && tours.length > 0;
  const matchesMap = safeParseJSON(localStorage.getItem(LS_TOURNAMENT_MATCHES_MAP));
  const hasMap = matchesMap && typeof matchesMap === "object";

  if (!hasTours && !hasMap) return;

  // 1) Tournois
  if (hasTours) {
    await Promise.all((tours as any[]).map((t) => idbPut(STORE_T, t)));
  }

  // 2) Matches via map (si présent)
  if (hasMap) {
    const mapObj = matchesMap as Record<string, any[]>;
    for (const [tid, matches] of Object.entries(mapObj)) {
      if (!tid) continue;
      if (Array.isArray(matches)) {
        await idbPut(STORE_M, { id: String(tid), matches });
      }
    }
  }

  // 3) Matches legacy par tournoi (si tours dispo)
  if (hasTours) {
    for (const t of tours as any[]) {
      const tid = String(t?.id || "");
      if (!tid) continue;

      // si déjà migré via map, on skip
      const existing = await idbGet(STORE_M, tid);
      if (existing?.matches && Array.isArray(existing.matches) && existing.matches.length) continue;

      let matches: any[] | null = null;
      for (const k of lsMatchesKeyCandidates(tid)) {
        const m = safeParseJSON(localStorage.getItem(k));
        if (Array.isArray(m)) {
          matches = m;
          break;
        }
      }
      if (matches) {
        await idbPut(STORE_M, { id: tid, matches });
      }
    }
  }

  // 4) Cleanup localStorage (libère le quota)
  try {
    localStorage.removeItem(LS_TOURNAMENTS);
    localStorage.removeItem(LS_TOURNAMENT_MATCHES_MAP);

    if (hasTours) {
      for (const t of tours as any[]) {
        const tid = String(t?.id || "");
        for (const k of lsMatchesKeyCandidates(tid)) localStorage.removeItem(k);
      }
    }
  } catch {}
}

async function ensureLoaded() {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      await migrateFromLocalStorageIfNeeded();

      const tours = await idbGetAll(STORE_T);
      cacheTournaments = Array.isArray(tours) ? tours : [];

      // matches: lazy par tournoi
      cacheMatchesByTid = {};
    } catch (e) {
      console.error("[tournaments/storeLocal] load failed:", e);
      cacheTournaments = [];
      cacheMatchesByTid = {};
    } finally {
      loaded = true;
    }
  })();

  return loadingPromise;
}

// Lance le chargement ASAP (sans bloquer)
void ensureLoaded();

/* ---------------------- Public API (sync-friendly) ---------------------- */

export function listTournamentsLocal(): AnyObj[] {
  void ensureLoaded();
  return cacheTournaments
    .slice()
    .sort(
      (a, b) =>
        Number(b?.updatedAt || b?.createdAt || 0) -
        Number(a?.updatedAt || a?.createdAt || 0)
    );
}

/**
 * ✅ IMPORTANT: sync-friendly
 * Si pas encore chargé : renvoie null et déclenche le load en fond.
 */
export function getTournamentLocal(tournamentId: string): AnyObj | null {
  void ensureLoaded();
  const tid = String(tournamentId || "");
  if (!tid) return null;
  return cacheTournaments.find((t) => String(t?.id) === tid) ?? null;
}

/**
 * ✅ NEW: ASYNC — toujours fiable (attend le load + fallback IDB)
 */
export async function getTournamentLocalAsync(tournamentId: string): Promise<AnyObj | null> {
  const tid = String(tournamentId || "");
  if (!tid) return null;

  await ensureLoaded();

  const cached = cacheTournaments.find((t) => String(t?.id) === tid) ?? null;
  if (cached) return cached;

  // fallback (au cas où cache pas à jour)
  try {
    const rec = await idbGet(STORE_T, tid);
    if (rec) {
      // hydrate cache (best effort)
      const idx = cacheTournaments.findIndex((x) => String(x?.id) === tid);
      if (idx >= 0) cacheTournaments[idx] = rec;
      else cacheTournaments.unshift(rec);
    }
    return rec ?? null;
  } catch {
    return null;
  }
}

export function upsertTournamentLocal(tour: AnyObj) {
  void ensureLoaded();

  const t = { ...(tour || {}) };
  const now = Date.now();

  if (!t.id) t.id = `tour-${now}-${Math.random().toString(36).slice(2, 8)}`;
  if (!t.createdAt) t.createdAt = now;
  t.updatedAt = now;

  const tid = String(t.id);
  const idx = cacheTournaments.findIndex((x) => String(x?.id) === tid);
  if (idx >= 0) cacheTournaments[idx] = t;
  else cacheTournaments.unshift(t);

  void idbPut(STORE_T, t)
    .then(() => notifyTournamentsUpdated())
    .catch((e) => console.error("[tournaments] idbPut tournament failed:", e));

  // ✅ refresh immédiat (même si IDB est en async)
  notifyTournamentsUpdated();

  return t;
}

/**
 * ✅ NEW: suppression matches uniquement (utile si tu veux purger sans supprimer le tournoi)
 */
export function deleteMatchesForTournamentLocal(tournamentId: string) {
  void ensureLoaded();

  const tid = String(tournamentId || "");
  if (!tid) return;

  cacheMatchesByTid[tid] = [];
  void idbDelete(STORE_M, tid).catch((e) =>
    console.error("[tournaments] idbDelete matches failed:", e)
  );

  notifyTournamentsUpdated();
}

/**
 * ✅ Delete tournoi + purge matches (IDB + cache)
 */
export function deleteTournamentLocal(tournamentId: string) {
  void ensureLoaded();

  const tid = String(tournamentId || "");
  if (!tid) return;

  cacheTournaments = cacheTournaments.filter((t) => String(t?.id) !== tid);
  delete cacheMatchesByTid[tid];

  void idbDelete(STORE_T, tid).catch((e) =>
    console.error("[tournaments] idbDelete tournament failed:", e)
  );
  void idbDelete(STORE_M, tid).catch((e) =>
    console.error("[tournaments] idbDelete matches failed:", e)
  );

  notifyTournamentsUpdated();
}

/**
 * LIST (sync) : renvoie le cache si chargé.
 * Si pas chargé / pas en cache : renvoie [] et lance un lazy load en tâche de fond.
 */
export function listMatchesForTournamentLocal(tournamentId: string): AnyObj[] {
  void ensureLoaded();

  const tid = String(tournamentId || "");
  if (!tid) return [];

  const cached = cacheMatchesByTid[tid];
  if (Array.isArray(cached)) return cached.slice();

  // lazy load async
  void (async () => {
    try {
      const rec = await idbGet(STORE_M, tid);
      const matches = Array.isArray(rec?.matches) ? rec.matches : [];
      cacheMatchesByTid[tid] = matches;
      notifyTournamentsUpdated();
    } catch (e) {
      console.error("[tournaments] load matches failed:", e);
      cacheMatchesByTid[tid] = [];
    }
  })();

  return [];
}

/**
 * ✅ NEW: ASYNC — toujours fiable (attend le load + lit IDB direct)
 */
export async function listMatchesForTournamentLocalAsync(tournamentId: string): Promise<AnyObj[]> {
  const tid = String(tournamentId || "");
  if (!tid) return [];

  await ensureLoaded();

  const cached = cacheMatchesByTid[tid];
  if (Array.isArray(cached)) return cached.slice();

  try {
    const rec = await idbGet(STORE_M, tid);
    const matches = Array.isArray(rec?.matches) ? rec.matches : [];
    cacheMatchesByTid[tid] = matches;
    return matches.slice();
  } catch (e) {
    console.error("[tournaments] async load matches failed:", e);
    cacheMatchesByTid[tid] = [];
    return [];
  }
}

/**
 * SAVE (alias) : persiste + met à jour cache
 */
export function saveMatchesForTournamentLocal(tournamentId: string, matches: AnyObj[]) {
  void ensureLoaded();

  const tid = String(tournamentId || "");
  if (!tid) return;

  const list = Array.isArray(matches) ? matches : [];
  cacheMatchesByTid[tid] = list;

  void idbPut(STORE_M, { id: tid, matches: list })
    .then(() => notifyTournamentsUpdated())
    .catch((e) => console.error("[tournaments] idbPut matches failed:", e));

  notifyTournamentsUpdated();
}

/**
 * UPSERT : même comportement que saveMatches... (compat avec tes imports)
 * Utilisé à la création du tournoi.
 */
export function upsertMatchesForTournamentLocal(tournamentId: string, matches: AnyObj[]) {
  saveMatchesForTournamentLocal(tournamentId, matches);
}

/**
 * ✅ Alias optionnel (au cas où un fichier importe "getMatchesForTournamentLocal")
 */
export function getMatchesForTournamentLocal(tournamentId: string): AnyObj[] {
  return listMatchesForTournamentLocal(tournamentId);
}
