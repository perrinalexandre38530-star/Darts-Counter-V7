import { syncTrainingEvents } from "./trainingSyncEngine";

type QueueState = {
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
};

const KEY = "training_sync_queue_v1";

function loadState(): QueueState {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return { attempts: 0, nextAttemptAt: 0 };
  }
}

function saveState(s: QueueState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

function computeBackoffMs(attempts: number) {
  const seq = [2000, 5000, 10000, 20000, 40000, 60000];
  return seq[Math.min(attempts, seq.length - 1)];
}

let running = false;

export async function trainingSyncQueueTry(userId: string) {
  if (!userId) return;
  if (running) return;

  const s = loadState();
  const now = Date.now();
  if (s.nextAttemptAt && now < s.nextAttemptAt) return;

  running = true;
  try {
    await syncTrainingEvents(userId);
    saveState({ attempts: 0, nextAttemptAt: 0 });
  } catch (e: any) {
    const attempts = (s.attempts || 0) + 1;
    const wait = computeBackoffMs(attempts);
    saveState({
      attempts,
      nextAttemptAt: Date.now() + wait,
      lastError: String(e?.message || e || "sync_failed"),
    });
  } finally {
    running = false;
  }
}

export function trainingSyncQueueEnqueueSoon() {
  const s = loadState();
  const nextAttemptAt = Math.min(s.nextAttemptAt || 0, Date.now());
  saveState({ ...s, nextAttemptAt });
}

export function trainingSyncQueueDebugState(): QueueState {
  return loadState();
}
