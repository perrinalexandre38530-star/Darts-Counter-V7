// ============================================
// src/lib/pingpongHistory.ts
// Ping-Pong — Historique & Stats source
// ============================================

export type PingPongMode =
  | "match_1v1"
  | "match_2v2"
  | "match_2v1"
  | "tournante"
  | "training";

export type PingPongHistoryEntry = {
  id: string;
  date: number;
  mode: PingPongMode;
  players: { id: string; name: string }[];
  winnerId?: string;
  scores?: Record<string, number>;
  sets?: number[];
  durationMs?: number;
};

const STORAGE_KEY = "pingpong_history";

export function loadPingPongHistory(): PingPongHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushPingPongHistory(entry: Omit<PingPongHistoryEntry, "id" | "date">) {
  const history = loadPingPongHistory();
  history.unshift({
    id: crypto.randomUUID(),
    date: Date.now(),
    ...entry,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearPingPongHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
