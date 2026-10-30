// ============================================
// src/lib/pingpongHistory.ts
// Ping-Pong — Historique & Stats source
// ============================================

import { History } from "./history";

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
  const row: PingPongHistoryEntry = {
    id: crypto.randomUUID(),
    date: Date.now(),
    ...entry,
  };
  history.unshift(row);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

  // W2 SINGLE SOURCE: legacy helper remains synchronous for callers, but the
  // durable write goes to History V4 with the SAME match id.
  void History.upsert({
    id: row.id,
    matchId: row.id,
    kind: row.mode === "training" ? "pingpong_training" : "pingpong",
    sport: "pingpong",
    status: "finished",
    createdAt: row.date,
    updatedAt: row.date,
    finishedAt: row.date,
    players: row.players,
    winnerId: row.winnerId || null,
    summary: { mode: row.mode, scores: row.scores || {}, sets: row.sets || [], durationMs: row.durationMs || 0 },
    payload: { kind: "pingpong", sport: "pingpong", ...row },
  } as any).catch(() => {});
}

export function clearPingPongHistory() {
  localStorage.removeItem(STORAGE_KEY);
  void (async () => {
    try {
      const rows: any[] = await (History as any).list();
      const matches = (Array.isArray(rows) ? rows : []).filter((rec: any) => {
        const tag = [rec?.kind, rec?.sport, rec?.mode, rec?.payload?.kind, rec?.payload?.sport, rec?.summary?.mode]
          .filter(Boolean).map((v) => String(v).toLowerCase()).join("|");
        return tag.includes("pingpong") || tag.includes("ping-pong") || tag.includes("ping_pong");
      });
      await Promise.all(matches.map((rec: any) => History.remove(String(rec?.id || rec?.matchId || ""))));
    } catch {}
  })();
}
