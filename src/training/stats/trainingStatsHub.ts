// ============================================
// src/training/stats/trainingStatsHub.ts
// Stats Training (V2) — global + par mode + par participant (player/bot)
// Stockage localStorage (stable, simple)
// ============================================


import { saveTrainingEvent } from "../sync/trainingEventStore";
import { normalizeTrainingMetrics } from "../sync/trainingNormalize";

export type TrainingStatsRow = {
  sessions: number;
  darts: number;
  points: number;
};

export type ParticipantKind = "player" | "bot";

const KEY_V2 = "dc_training_stats_v2";
const KEY_V1 = "dc_training_stats_v1"; // fallback (anciens patchs)

type StoreV2 = {
  global?: TrainingStatsRow;
  byMode?: Record<string, TrainingStatsRow>;
  byParticipant?: Record<
    string,
    {
      kind: ParticipantKind;
      global: TrainingStatsRow;
      byMode: Record<string, TrainingStatsRow>;
    }
  >;
};

function emptyRow(): TrainingStatsRow {
  return { sessions: 0, darts: 0, points: 0 };
}

function addRow(a: TrainingStatsRow, darts: number, points: number) {
  a.sessions += 1;
  a.darts += Math.max(0, Math.floor(darts || 0));
  a.points += Math.max(0, Math.floor(points || 0));
}

function loadV2(): StoreV2 {
  try {
    const raw = localStorage.getItem(KEY_V2);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return typeof v === "object" && v ? (v as StoreV2) : {};
  } catch {
    return {};
  }
}

function saveV2(s: StoreV2) {
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(s));
  } catch {}
}

// ✅ migration légère (si V1 existe)
function migrateIfNeeded() {
  try {
    const rawV2 = localStorage.getItem(KEY_V2);
    if (rawV2) return;
    const rawV1 = localStorage.getItem(KEY_V1);
    if (!rawV1) return;

    const v1 = JSON.parse(rawV1) as Record<string, TrainingStatsRow>;
    const s: StoreV2 = { global: emptyRow(), byMode: {}, byParticipant: {} };
    for (const [modeId, row] of Object.entries(v1 || {})) {
      const r = s.byMode![modeId] ?? emptyRow();
      r.sessions += row.sessions || 0;
      r.darts += row.darts || 0;
      r.points += row.points || 0;
      s.byMode![modeId] = r;

      addRow(s.global!, row.darts || 0, row.points || 0);
    }
    saveV2(s);
  } catch {
    // ignore
  }
}

export function recordTrainingSession(
  modeId: string,
  darts: number,
  points: number,
  meta?: any
) {
  migrateIfNeeded();
  const id = String(modeId || "unknown");
  const s = loadV2();
  if (!s.global) s.global = emptyRow();
  if (!s.byMode) s.byMode = {};
  const row = s.byMode[id] ?? emptyRow();
  addRow(row, darts, points);
  s.byMode[id] = row;
  addRow(s.global, darts, points);
  saveV2(s);

  // ---- LOT20: normalize + emit event (best-effort, does not break gameplay)
  try {
    const userId =
      (typeof meta?.userId === "string" && meta.userId) ||
      localStorage.getItem("dc_user_id") ||
      undefined;

    const n = normalizeTrainingMetrics(id, darts, points, meta || {});
    saveTrainingEvent({
      id: (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : String(Date.now()) + "-" + Math.random().toString(16).slice(2),
      userId,
      modeId: id,
      participantId: String(meta?.participantId || "global"),
      participantType: (meta?.participantType === "bot" ? "bot" : "player"),
      score: n.score,
      durationMs: n.durationMs,
      meta: n.meta,
      createdAt: Date.now(),
      synced: false,
    });
  } catch {
    // ignore
  }
}

export function recordTrainingParticipantSession(
  modeId: string,
  participantId: string,
  kind: ParticipantKind,
  darts: number,
  points: number,
  meta?: any
) {
  migrateIfNeeded();
  const mid = String(modeId || "unknown");
  const pid = String(participantId || "").trim();
  if (!pid) return;

  const s = loadV2();
  if (!s.byParticipant) s.byParticipant = {};
  const p =
    s.byParticipant[pid] ??
    ({
      kind,
      global: emptyRow(),
      byMode: {},
    } as any);

  // ne pas écraser kind si déjà défini
  if (!p.kind) p.kind = kind;

  if (!p.byMode) p.byMode = {};
  const row = p.byMode[mid] ?? emptyRow();
  addRow(row, darts, points);
  p.byMode[mid] = row;
  addRow(p.global, darts, points);

  s.byParticipant[pid] = p;
  saveV2(s);

  // ---- LOT20: normalize + emit event (best-effort)
  try {
    const userId =
      (typeof meta?.userId === "string" && meta.userId) ||
      localStorage.getItem("dc_user_id") ||
      undefined;

    const n = normalizeTrainingMetrics(mid, darts, points, meta || {});
    saveTrainingEvent({
      id: (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : String(Date.now()) + "-" + Math.random().toString(16).slice(2),
      userId,
      modeId: mid,
      participantId: pid,
      participantType: kind,
      score: n.score,
      durationMs: n.durationMs,
      meta: n.meta,
      createdAt: Date.now(),
      synced: false,
    });
  } catch {}
}

export function getTrainingStatsGlobal(): TrainingStatsRow {
  migrateIfNeeded();
  const s = loadV2();
  return s.global ?? emptyRow();
}

export function getTrainingStatsByMode(): Record<string, TrainingStatsRow> {
  migrateIfNeeded();
  const s = loadV2();
  return s.byMode ?? {};
}

export function getTrainingParticipantStore(): StoreV2["byParticipant"] {
  migrateIfNeeded();
  const s = loadV2();
  return s.byParticipant ?? {};
}

// Compat export (certains écrans importent getTrainingStats)
export function getTrainingStats() {
  return {
    global: getTrainingStatsGlobal(),
    byMode: getTrainingStatsByMode(),
    byParticipant: getTrainingParticipantStore(),
  };
}