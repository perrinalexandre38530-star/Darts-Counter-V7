// =============================================================
// src/training/lib/trainingCanonical.ts
// Canonical scoring helpers (LOT 23)
// - Define which metric drives ranking per mode (time vs score)
// - Provide formatting + normalization for UI + trends
// =============================================================

export type TrainingMetric = "time" | "score";

export function getTrainingModeMetric(modeId: string | null | undefined): TrainingMetric {
  const id = (modeId || "").toLowerCase();
  // Time-based modes
  if (id.includes("time_attack") || id.includes("timeattack") || id === "training_time_attack") return "time";
  // Default: score-based
  return "score";
}

export function canonicalFromRow(modeId: string | null | undefined, row: { best_score?: any; best_time_ms?: any }) {
  const metric = getTrainingModeMetric(modeId);
  if (metric === "time") {
    const t = row.best_time_ms;
    if (t == null) return null;
    const ms = Number(t);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return ms;
  }
  const s = row.best_score;
  if (s == null) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function formatCanonical(modeId: string | null | undefined, row: { best_score?: any; best_time_ms?: any }) {
  const metric = getTrainingModeMetric(modeId);
  if (metric === "time") {
    const ms = canonicalFromRow(modeId, row);
    if (ms == null) return "—";
    const sec = Math.round(ms / 1000);
    return `${sec}s`;
  }
  const v = canonicalFromRow(modeId, row);
  if (v == null) return "—";
  return `${Math.round(v)}`;
}

/** Convert a raw event into a "higher is better" performance number (for sparkline/trends). */
export function performanceFromEvent(
  modeId: string | null | undefined,
  ev: { score?: any; duration_ms?: any; durationMs?: any }
): number | null {
  const metric = getTrainingModeMetric(modeId);
  if (metric === "time") {
    const d = ev.duration_ms ?? (ev as any).durationMs;
    if (d == null) return null;
    const ms = Number(d);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    // higher is better: "speed" proxy
    return 1_000_000 / ms;
  }
  const s = ev.score;
  if (s == null) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function formatMetricLabel(modeId: string | null | undefined): string {
  const metric = getTrainingModeMetric(modeId);
  return metric === "time" ? "Temps (sec)" : "Score";
}
