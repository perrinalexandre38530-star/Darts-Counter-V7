// Canonical darts ProfileStarring rule.
// The visible star level is derived ONLY from X01 AVG3D for human darts profiles:
// - 1 full star per 10 AVG3D points up to 100
// - 1 half star at 5 / 15 / 25 / ... / 95
// - above 100: +1 full violet star at 120 / 140 / 160 / 180

export type ProfileStarRating = {
  score: number;
  baseFullStars: number;
  hasHalfStar: boolean;
  extraStars: number;
  totalGlyphs: number;
};

export function computeProfileStarRating(rawAvg3d: unknown): ProfileStarRating {
  const parsed = Number(rawAvg3d);
  const score = Number.isFinite(parsed) ? Math.max(0, Math.min(180, parsed)) : 0;

  const baseFullStars = Math.min(10, Math.floor(Math.min(score, 100) / 10));
  const hasHalfStar = score < 100 && score >= 5 && (score % 10) >= 5;
  const extraStars = score > 100
    ? Math.floor((Math.min(score, 180) - 100) / 20)
    : 0;

  return {
    score,
    baseFullStars,
    hasHalfStar,
    extraStars,
    totalGlyphs: baseFullStars + (hasHalfStar ? 1 : 0) + extraStars,
  };
}
