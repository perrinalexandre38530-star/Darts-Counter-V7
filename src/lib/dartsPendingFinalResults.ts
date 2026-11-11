/**
 * V219 - secours local des résultats terminés non encore confirmés par History V4.
 * Distinct des brouillons (parties en cours). Aucune mutation de History V4 ici.
 * Les enregistrements sont isolés par compte et relus au démarrage suivant.
 */
export type DartsFinalMode = "five_lives" | "chase" | "halve_it" | "split_score";
export type PendingDartsFinal = {
  version: 1;
  id: string;
  mode: DartsFinalMode;
  savedAt: number;
  record: Record<string, any>;
};

const STORAGE_PREFIX = "mss_darts_final_pending_v1";
// Ne pas expirer automatiquement un résultat non confirmé, même après plusieurs mois.
const MAX_RECORD_CHARS = 650_000;
const MAX_QUEUE_CHARS = 2_500_000;
const MAX_ITEMS = 12;
const MODES = new Set<DartsFinalMode>(["five_lives", "chase", "halve_it", "split_score"]);
const pendingWrites = new Map<string, Promise<boolean>>();

function storageKey(scope?: string | null): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(String(scope || "local"))}`;
}
function valid(item: any): item is PendingDartsFinal {
  return !!item && item.version === 1 && typeof item.id === "string" && item.id.length > 0
    && item.id.length <= 256 && MODES.has(item.mode)
    && Number.isFinite(item.savedAt) && item.savedAt <= Date.now() + 60_000
    && !!item.record && typeof item.record === "object"
    && !Array.isArray(item.record) && String(item.record.id || "") === item.id
    && item.record.status === "finished";
}
export function listPendingDartsFinalResults(scope?: string | null): PendingDartsFinal[] {
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw || raw.length > MAX_QUEUE_CHARS) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(valid).slice(0, MAX_ITEMS);
  } catch { return []; }
}
function emitChange(): void {
  try { window.dispatchEvent(new Event("msc:darts-final-pending-updated")); } catch {}
}
function writeQueue(scope: string | null | undefined, items: PendingDartsFinal[]): boolean {
  try {
    const encoded = JSON.stringify(items);
    if (encoded.length > MAX_QUEUE_CHARS) return false;
    if (!items.length) localStorage.removeItem(storageKey(scope));
    else localStorage.setItem(storageKey(scope), encoded);
    emitChange();
    return true;
  } catch { return false; }
}

/** Écrire le secours AVANT le premier appel asynchrone History.upsert. */
export function stagePendingDartsFinalResult(
  mode: DartsFinalMode, record: Record<string, any>, scope?: string | null,
): boolean {
  if (!MODES.has(mode) || !record || typeof record !== "object" || record.status !== "finished") return false;
  const id = String(record.id || "");
  if (!id || id.length > 256) return false;
  let clean: Record<string, any>;
  try {
    const serialized = JSON.stringify(record, (key, value) => {
      if (/^(avatarDataUrl|logoDataUrl|imageDataUrl)$/i.test(key)) return null;
      if (typeof value === "string" && /^data:(image|video|audio)\//i.test(value)) return null;
      return value;
    });
    if (!serialized || serialized.length > MAX_RECORD_CHARS) return false;
    clean = JSON.parse(serialized);
  } catch { return false; }
  const queue = listPendingDartsFinalResults(scope);
  const previous = queue.find((item) => item.id === id);
  if (!previous && queue.length >= MAX_ITEMS) return false; // Ne jamais écraser un autre résultat non sauvé.
  const next = [{ version: 1 as const, id, mode, savedAt: previous?.savedAt || Date.now(), record: clean },
    ...queue.filter((item) => item.id !== id)];
  return writeQueue(scope, next);
}

export function clearPendingDartsFinalResult(id: string, scope?: string | null): boolean {
  const queue = listPendingDartsFinalResults(scope);
  if (!queue.some((item) => item.id === id)) return true;
  return writeQueue(scope, queue.filter((item) => item.id !== id));
}

/** Écriture unique, sur action manuelle ou tentative automatique au redémarrage. */
export function recoverPendingDartsFinalResult(
  id: string,
  scope: string | null | undefined,
  write: (record: Record<string, any>) => Promise<boolean> | boolean,
): Promise<boolean> {
  const key = `${storageKey(scope)}:${String(id)}`;
  const existing = pendingWrites.get(key);
  if (existing) return existing;
  const item = listPendingDartsFinalResults(scope).find((entry) => entry.id === id);
  if (!item) return Promise.resolve(false);
  const attempt = Promise.resolve().then(() => write(item.record))
    .then((confirmed) => confirmed === true && clearPendingDartsFinalResult(id, scope))
    .catch(() => false)
    .finally(() => { pendingWrites.delete(key); });
  pendingWrites.set(key, attempt);
  return attempt;
}
