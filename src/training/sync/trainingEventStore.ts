export type TrainingEvent = {
  id: string;
  userId: string;
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
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function saveTrainingEvent(ev: TrainingEvent) {
  const all = loadTrainingEvents();
  all.push(ev);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function markEventSynced(id: string) {
  const all = loadTrainingEvents().map(e =>
    e.id === id ? { ...e, synced: true } : e
  );
  localStorage.setItem(KEY, JSON.stringify(all));
}