import {
  ACTIVITY_DB_NAME,
  ACTIVITY_DB_VERSION,
  ACTIVITY_STORE_NAME,
  type ActivityRecord,
  type ActivitySport,
} from "./activityTypes";

const FALLBACK_KEY = "mss-activities-fallback-v1";
const FALLBACK_LIMITS = [12, 6, 3, 1];

function normalizeSport(sport: ActivitySport): ActivitySport {
  return sport === "nordic-walking" ? "walking" : sport;
}

function normalizeRecord(record: ActivityRecord): ActivityRecord {
  const sport = normalizeSport(record.sport);
  return sport === record.sport ? record : { ...record, sport };
}

function matchesSport(record: ActivityRecord, sport?: ActivitySport): boolean {
  if (!sport) return true;
  return normalizeSport(record.sport) === normalizeSport(sport);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponible"));
      return;
    }
    const request = indexedDB.open(ACTIVITY_DB_NAME, ACTIVITY_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ACTIVITY_STORE_NAME)) {
        const store = db.createObjectStore(ACTIVITY_STORE_NAME, { keyPath: "id" });
        store.createIndex("sport", "sport", { unique: false });
        store.createIndex("startedAt", "startedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Impossible d'ouvrir la base activités"));
  });
}

function fallbackRead(): ActivityRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map((record) => normalizeRecord(record as ActivityRecord)) : [];
  } catch {
    return [];
  }
}

function fallbackWrite(records: ActivityRecord[]) {
  if (typeof localStorage === "undefined") return;
  const sorted = [...records]
    .map(normalizeRecord)
    .sort((a, b) => Number(b.startedAt || 0) - Number(a.startedAt || 0));
  for (const limit of FALLBACK_LIMITS) {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(sorted.slice(0, limit)));
      return;
    } catch {}
  }
}

function mergeRecords(primary: ActivityRecord[], backup: ActivityRecord[]): ActivityRecord[] {
  const byId = new Map<string, ActivityRecord>();
  for (const record of backup) byId.set(record.id, normalizeRecord(record));
  for (const record of primary) byId.set(record.id, normalizeRecord(record));
  return [...byId.values()].sort((a, b) => Number(b.startedAt || 0) - Number(a.startedAt || 0));
}

export async function saveActivity(record: ActivityRecord): Promise<void> {
  const normalized = normalizeRecord(record);
  let dbSaved = false;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ACTIVITY_STORE_NAME, "readwrite");
      tx.objectStore(ACTIVITY_STORE_NAME).put(normalized);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Sauvegarde activité impossible"));
      tx.onabort = () => reject(tx.error || new Error("Sauvegarde activité annulée"));
    });
    db.close();
    dbSaved = true;
  } catch {}

  // Miroir de secours systématique : si IndexedDB devient momentanément
  // indisponible au prochain lancement, les dernières sorties restent récupérables.
  const backup = fallbackRead().filter((item) => item.id !== normalized.id);
  backup.unshift(normalized);
  fallbackWrite(backup);

  if (!dbSaved && !fallbackRead().some((item) => item.id === normalized.id)) {
    throw new Error("Sauvegarde activité impossible");
  }
}

export async function listActivities(sport?: ActivitySport): Promise<ActivityRecord[]> {
  let primary: ActivityRecord[] = [];
  try {
    const db = await openDb();
    primary = await new Promise<ActivityRecord[]>((resolve, reject) => {
      const tx = db.transaction(ACTIVITY_STORE_NAME, "readonly");
      const request = tx.objectStore(ACTIVITY_STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result || []) as ActivityRecord[]);
      request.onerror = () => reject(request.error || new Error("Lecture activités impossible"));
    });
    db.close();
  } catch {}

  return mergeRecords(primary, fallbackRead()).filter((item) => matchesSport(item, sport));
}

export async function getActivity(id: string): Promise<ActivityRecord | null> {
  if (!id) return null;
  const records = await listActivities();
  return records.find((record) => record.id === id) || null;
}

export async function deleteActivity(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ACTIVITY_STORE_NAME, "readwrite");
      tx.objectStore(ACTIVITY_STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Suppression activité impossible"));
      tx.onabort = () => reject(tx.error || new Error("Suppression activité annulée"));
    });
    db.close();
  } catch {}

  // La suppression doit aussi effacer le miroir de secours, sinon une sortie
  // supprimée peut réapparaître lors d'un fallback IndexedDB.
  fallbackWrite(fallbackRead().filter((item) => item.id !== id));
}
