import { babyFootLevelPercent, type BabyFootPlayerAggregate } from "./babyfootStatsAggregate";

export type BabyFootLevelBreakdown = {
  matches: number;
  winPct: number;
  bpPct: number;
  bcPenaltyPct: number;
  rawFormula: number;
  levelPct: number;
  rating: number;
  starScore: number;
};

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function pct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

const BABYFOOT_TARGET_GOALS_FOR_LEVEL = 10;
const STAR_SCORE_MAX = 180;

export function babyFootLevelScoreFromRating(ratingPct: number): number {
  // ProfileStarRing reste le même composant visuel : 180 = 14 étoiles.
  // Le Baby-Foot lui envoie maintenant un niveau logique 0..100%.
  return Math.round((clampNumber(Number(ratingPct) || 0, 0, 100) / 100) * STAR_SCORE_MAX);
}

export function babyFootLevelScoreFromAggregate(
  agg: Pick<BabyFootPlayerAggregate, "matches" | "winRate" | "avgGoalsFor" | "avgGoalsAgainst"> | null | undefined,
): number {
  if (!agg || !Number(agg.matches || 0)) return 0;
  return babyFootLevelScoreFromRating(babyFootLevelPercent(agg));
}

export function babyFootLevelBreakdown(
  agg: Pick<BabyFootPlayerAggregate, "matches" | "winRate" | "avgGoalsFor" | "avgGoalsAgainst"> | null | undefined,
): BabyFootLevelBreakdown {
  const matches = Math.max(0, Number(agg?.matches || 0));
  if (!agg || !matches) {
    return { matches: 0, winPct: 0, bpPct: 0, bcPenaltyPct: 0, rawFormula: 0, levelPct: 0, rating: 0, starScore: 0 };
  }

  const winPct = pct(Number(agg.winRate || 0) * 100);
  const bpPct = pct((Math.max(0, Number(agg.avgGoalsFor || 0)) / BABYFOOT_TARGET_GOALS_FOR_LEVEL) * 100);
  const bcPenaltyPct = pct((Math.max(0, Number(agg.avgGoalsAgainst || 0)) / BABYFOOT_TARGET_GOALS_FOR_LEVEL) * 100);
  const rawFormula = winPct + bpPct - bcPenaltyPct;
  const levelPct = babyFootLevelPercent(agg);

  return {
    matches,
    winPct: Math.round(winPct * 10) / 10,
    bpPct: Math.round(bpPct * 10) / 10,
    bcPenaltyPct: Math.round(bcPenaltyPct * 10) / 10,
    rawFormula: Math.round(rawFormula * 10) / 10,
    levelPct,
    rating: levelPct,
    starScore: babyFootLevelScoreFromRating(levelPct),
  };
}
