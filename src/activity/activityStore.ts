import {
  ACTIVITY_DB_NAME,
  ACTIVITY_DB_VERSION,
  ACTIVITY_STORE_NAME,
  type ActivityRecord,
  type ActivitySport,
} from "./activityTypes";

const FALLBACK_KEY = "mss-activities-fallback-v1";

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
  try {
    const parsed = JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fallbackWrite(records: ActivityRecord[]) {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(records.slice(0, 60)));
  } catch {}
}

export async function saveActivity(record: ActivityRecord): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ACTIVITY_STORE_NAME, "readwrite");
      tx.objectStore(ACTIVITY_STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Sauvegarde activité impossible"));
      tx.onabort = () => reject(tx.error || new Error("Sauvegarde activité annulée"));
    });
    db.close();
  } catch {
    const next = fallbackRead().filter((item) => item.id !== record.id);
    next.unshift(record);
    fallbackWrite(next);
  }
}

export async function listActivities(sport?: ActivitySport): Promise<ActivityRecord[]> {
  try {
    const db = await openDb();
    const records = await new Promise<ActivityRecord[]>((resolve, reject) => {
      const tx = db.transaction(ACTIVITY_STORE_NAME, "readonly");
      const request = tx.objectStore(ACTIVITY_STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result || []) as ActivityRecord[]);
      request.onerror = () => reject(request.error || new Error("Lecture activités impossible"));
    });
    db.close();
    return records
      .filter((item) => !sport || item.sport === sport)
      .sort((a, b) => Number(b.startedAt || 0) - Number(a.startedAt || 0));
  } catch {
    return fallbackRead()
      .filter((item) => !sport || item.sport === sport)
      .sort((a, b) => Number(b.startedAt || 0) - Number(a.startedAt || 0));
  }
}

export async function deleteActivity(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ACTIVITY_STORE_NAME, "readwrite");
      tx.objectStore(ACTIVITY_STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Suppression activité impossible"));
    });
    db.close();
  } catch {
    fallbackWrite(fallbackRead().filter((item) => item.id !== id));
  }
}
