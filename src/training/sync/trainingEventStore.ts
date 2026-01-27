export type TrainingEvent = {
  id: string;
  userId?: string; // optional (offline / before login). sync layer will override with current user id.
  modeId: string;
  participantId: string;
  participantType: "player" | "bot";
  score?: number;
  durationMs?: number;
  meta?: any;
  createdAt: number;
  synced?: boolean;
};

const KEY = "training_events_v1";

export function loadTrainingEvents(): TrainingEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as TrainingEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveTrainingEvent(ev: TrainingEvent) {
  const all = loadTrainingEvents();
  all.push(ev);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // ignore quota errors
  }
}

export function markEventSynced(id: string) {
  const all = loadTrainingEvents().map((e) => (e.id === id ? { ...e, synced: true } : e));
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}
