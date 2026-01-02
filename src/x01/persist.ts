// ============================================
// src/x01/persist.ts
// Persistance historique + "glue" StatsBridge
// ============================================
import { History } from "../lib/history";
import { addMatchSummary } from "../lib/statsLiteIDB";
import { extractAggFromSavedMatch } from "../lib/aggFromHistory";
import type { MatchRecord } from "../lib/types";

/* ---------- Record "engine-like" minimal pour Historique ---------- */
export function makeX01RecordFromEngineCompat(args: {
  engine: {
    rules: {
      start: number;
      doubleOut: boolean;
      setsToWin?: number;
      legsPerSet?: number;
      outMode?: "simple" | "double" | "master";
      inMode?: "simple" | "double" | "master";
    };
    players: Array<{ id: string; name: string }>;
    scores: number[];
    currentIndex: number;
    dartsThisTurn: any[];
    winnerId: string | null;
  };
  existingId?: string;
}): MatchRecord {
  const { engine, existingId } = args;
  const payload = {
    state: {
      rules: engine.rules,
      players: engine.players,
      scores: engine.scores,
      currentIndex: engine.currentIndex,
      dartsThisTurn: engine.dartsThisTurn,
      winnerId: engine.winnerId,
    },
    kind: "x01",
  };
  const now = Date.now();
  const rec: any = {
    id: existingId ?? (crypto.randomUUID?.() ?? String(now)),
    kind: "x01",
    status: engine.winnerId ? "finished" : "in_progress",
    players: engine.players,
    winnerId: engine.winnerId || null,
    createdAt: now,
    updatedAt: now,
    payload,
  };
  return rec as MatchRecord;
}

/* ---------- Upsert sûr + agrégateur LITE ---------- */
export async function safeSaveMatch({
  id, players, winnerId, summary, payload,
}: {
  id: string;
  players: { id: string; name?: string; avatarDataUrl?: string | null }[];
  winnerId: string | null;
  summary: { legs?: number; darts?: number; avg3ByPlayer?: Record<string, number>; co?: number } | null;
  payload: any;
}) {
  try {
    const now = Date.now();
    await History.upsert({
      id, kind: "x01", status: "finished",
      players, winnerId, createdAt: now, updatedAt: now, summary: summary || null, payload,
    });

    // alimente l’agrégateur profils immédiatement (unique source)
    const { winnerId: w, perPlayer } = extractAggFromSavedMatch({
      id, players, winnerId, summary, payload,
    });
    if (Object.keys(perPlayer || {}).length) {
      await addMatchSummary({ winnerId: w, perPlayer });
    }

    await History.list();
    console.info("[HIST:OK]", id);
  } catch (e) {
    console.warn("[HIST:FAIL]", e);
  }
}

/* ---------- Émission record complet legacy (si tu l’utilises ici) ---------- */
export function emitHistoryRecord_X01({
  playersLite, winnerId, resumeId, legStats, visitsLog, onFinish,
}: {
  playersLite: { id: string; name?: string; avatarDataUrl?: string | null }[];
  winnerId: string | null;
  resumeId?: string | null;
  legStats: any;   // LegStatsCompat
  visitsLog: any[]; // VisitH[]
  onFinish: (rec: any) => void;
}) {
  const now = Date.now();
  // Ici on peut décider de ne plus "projetter" si EndOfLegOverlay lit direct legStats.
  const rec: any = {
    id: `x01-${now}-${Math.random().toString(36).slice(2, 8)}`,
    kind: "x01",
    status: "finished",
    players: playersLite,
    winnerId,
    createdAt: now,
    updatedAt: now,
    summary: { kind: "x01", winnerId, updatedAt: now },
    payload: { players: playersLite, resumeId: resumeId ?? null, __legStats: legStats, visits: visitsLog || [] },
  };
  (window as any).__lastMatchRecord = rec;
  onFinish(rec);
}
