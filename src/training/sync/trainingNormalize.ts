export type NormalizedTrainingMetrics = {
  score?: number;        // normalized "performance" score (higher is better)
  durationMs?: number;   // duration in ms when relevant (lower is better)
  meta?: any;            // enriched meta for analytics
};

/**
 * Normalize raw training metrics into a consistent schema.
 *
 * Conventions:
 * - score: higher is better (0..100 typically)
 * - durationMs: lower is better for time-based modes (TimeAttack etc.)
 *
 * We keep best-effort heuristics to avoid breaking existing modes.
 */
export function normalizeTrainingMetrics(
  modeId: string,
  darts: number,
  points: number,
  meta: any = {}
): NormalizedTrainingMetrics {
  const mid = String(modeId || "unknown").toLowerCase();

  // derive duration if possible
  let durationMs: number | undefined =
    typeof meta?.durationMs === "number" ? meta.durationMs : undefined;

  if (durationMs == null && typeof meta?.startedAt === "number" && typeof meta?.endedAt === "number") {
    durationMs = Math.max(0, meta.endedAt - meta.startedAt);
  }
  if (durationMs == null && typeof meta?.startedAt === "string" && typeof meta?.endedAt === "string") {
    const a = Date.parse(meta.startedAt);
    const b = Date.parse(meta.endedAt);
    if (!Number.isNaN(a) && !Number.isNaN(b)) durationMs = Math.max(0, b - a);
  }

  // score heuristics
  let score: number | undefined;

  // explicit score in meta wins
  if (typeof meta?.score === "number") score = meta.score;
  if (score == null && typeof meta?.percent === "number") score = meta.percent;
  if (score == null && typeof meta?.accuracyPercent === "number") score = meta.accuracyPercent;

  // Mode-specific defaults
  if (score == null) {
    if (mid.includes("precision")) {
      // points is usually "points" but some modes may pass percent -> keep
      score = points;
    } else if (mid.includes("timeattack") || mid.includes("time_attack") || mid.includes("time-attack")) {
      // TimeAttack is time-based: points may be seconds. durationMs should be set, score optional.
      if (durationMs == null) {
        if (points > 0 && points < 1000) durationMs = Math.round(points * 1000);
        else if (points >= 1000) durationMs = Math.round(points);
      }
      score = meta?.score != null ? meta.score : undefined;
    } else if (mid.includes("ghost")) {
      // ghost: streak / hits -> points is acceptable
      score = points;
    } else {
      // generic: keep points as score
      score = points;
    }
  }

  // clamp reasonable
  if (typeof score === "number" && Number.isFinite(score)) {
    // allow negative? no.
    score = Math.max(0, score);
  } else {
    score = undefined;
  }

  if (typeof durationMs === "number" && Number.isFinite(durationMs)) {
    durationMs = Math.max(0, Math.round(durationMs));
  } else {
    durationMs = undefined;
  }

  const enrichedMeta = {
    ...(meta || {}),
    darts,
    points,
    normalized: {
      score,
      durationMs,
      modeId,
    },
  };

  return { score, durationMs, meta: enrichedMeta };
}
