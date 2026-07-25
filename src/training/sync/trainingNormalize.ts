export type NormalizedTrainingMetrics = {
  score?: number;
  durationMs?: number;
  meta?: any;
};

/**
 * Normalise les résultats Training avant stockage/synchronisation.
 *
 * Convention V3 :
 * - score = performance canonique, plus haut = meilleur ;
 * - durationMs = durée informative de la session ;
 * - Time Attack est un mode "maximum de points dans un temps donné" :
 *   sa métrique de classement est donc le score, pas la durée fixe.
 */
export function normalizeTrainingMetrics(
  modeId: string,
  darts: number,
  points: number,
  meta: any = {}
): NormalizedTrainingMetrics {
  let durationMs: number | undefined =
    typeof meta?.durationMs === "number" ? meta.durationMs : undefined;

  if (
    durationMs == null &&
    typeof meta?.startedAt === "number" &&
    typeof meta?.endedAt === "number"
  ) {
    durationMs = Math.max(0, meta.endedAt - meta.startedAt);
  }

  if (
    durationMs == null &&
    typeof meta?.startedAt === "string" &&
    typeof meta?.endedAt === "string"
  ) {
    const a = Date.parse(meta.startedAt);
    const b = Date.parse(meta.endedAt);
    if (!Number.isNaN(a) && !Number.isNaN(b)) durationMs = Math.max(0, b - a);
  }

  let score: number | undefined;
  if (typeof meta?.score === "number") score = meta.score;
  else if (typeof meta?.performanceScore === "number") score = meta.performanceScore;
  else if (typeof meta?.percent === "number") score = meta.percent;
  else if (typeof meta?.completionPct === "number") score = meta.completionPct;
  else if (typeof meta?.accuracyPercent === "number" && Number(points || 0) <= 0) {
    score = meta.accuracyPercent;
  } else {
    score = Number(points || 0);
  }

  if (typeof score === "number" && Number.isFinite(score)) score = Math.max(0, score);
  else score = undefined;

  if (typeof durationMs === "number" && Number.isFinite(durationMs)) {
    durationMs = Math.max(0, Math.round(durationMs));
  } else {
    durationMs = undefined;
  }

  const enrichedMeta = {
    ...(meta || {}),
    darts: Math.max(0, Number(darts) || 0),
    points: Math.max(0, Number(points) || 0),
    normalized: {
      score,
      durationMs,
      modeId,
    },
  };

  return { score, durationMs, meta: enrichedMeta };
}
