export type TrainingDailyQueue = {
  version: 1;
  dateKey: string;
  exerciseIds: string[];
  updatedAt: number;
};

const PREFIX = "dc_training_daily_queue_v1:";
const MAX_ITEMS = 3;

function accountKey(accountId?: string | null) {
  const value = String(accountId || "local").trim();
  return value || "local";
}

export function trainingLocalDateKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function storageKey(accountId?: string | null) {
  return `${PREFIX}${accountKey(accountId)}`;
}

function sanitizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const value of ids) {
    const id = String(value || "").trim();
    if (!id || out.includes(id)) continue;
    out.push(id);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function loadTrainingDailyQueue(accountId?: string | null, now = new Date()): TrainingDailyQueue {
  const dateKey = trainingLocalDateKey(now);
  try {
    const raw = window.localStorage.getItem(storageKey(accountId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TrainingDailyQueue>;
      if (parsed?.version === 1 && parsed.dateKey === dateKey) {
        return { version: 1, dateKey, exerciseIds: sanitizeIds(parsed.exerciseIds), updatedAt: Number(parsed.updatedAt || Date.now()) };
      }
    }
  } catch {}
  return { version: 1, dateKey, exerciseIds: [], updatedAt: Date.now() };
}

export function saveTrainingDailyQueue(accountId: string | null | undefined, exerciseIds: string[], now = new Date()): TrainingDailyQueue {
  const queue: TrainingDailyQueue = {
    version: 1,
    dateKey: trainingLocalDateKey(now),
    exerciseIds: sanitizeIds(exerciseIds),
    updatedAt: Date.now(),
  };
  try { window.localStorage.setItem(storageKey(accountId), JSON.stringify(queue)); } catch {}
  return queue;
}

export function ensureTrainingDailyQueue(accountId: string | null | undefined, suggestedIds: string[], now = new Date()): TrainingDailyQueue {
  const current = loadTrainingDailyQueue(accountId, now);
  if (current.exerciseIds.length) return current;
  return saveTrainingDailyQueue(accountId, suggestedIds, now);
}

export function clearTrainingDailyQueue(accountId?: string | null) {
  try { window.localStorage.removeItem(storageKey(accountId)); } catch {}
}

export function trainingSessionDateKey(value: unknown): string {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  const ms = numeric < 1e12 ? numeric * 1000 : numeric;
  return trainingLocalDateKey(new Date(ms));
}
