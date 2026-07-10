import { babyFootRating, type BabyFootPlayerAggregate } from "./babyfootStatsAggregate";

export type BabyFootLevelBreakdown = {
  matches: number;
  win: number;
  attack: number;
  defense: number;
  diff: number;
  clean: number;
  rating: number;
  starScore: number;
};

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function babyFootLevelScoreFromRating(rating: number): number {
  return Math.round(clampNumber(Number(rating) || 0, 0, 180));
}

export function babyFootLevelScoreFromAggregate(
  agg: Pick<BabyFootPlayerAggregate, "matches" | "winRate" | "goalDiff" | "avgGoalsFor" | "avgGoalsAgainst" | "cleanSheets"> | null | undefined,
): number {
  if (!agg || !Number(agg.matches || 0)) return 0;
  return babyFootLevelScoreFromRating(babyFootRating(agg));
}

export function babyFootLevelBreakdown(
  agg: Pick<BabyFootPlayerAggregate, "matches" | "winRate" | "goalDiff" | "avgGoalsFor" | "avgGoalsAgainst" | "cleanSheets"> | null | undefined,
): BabyFootLevelBreakdown {
  const matches = Math.max(0, Number(agg?.matches || 0));
  if (!agg || !matches) {
    return { matches: 0, win: 0, attack: 0, defense: 0, diff: 0, clean: 0, rating: 0, starScore: 0 };
  }

  const win = clampNumber(Number(agg.winRate || 0), 0, 1) * 100;
  const attack = Math.max(0, Number(agg.avgGoalsFor || 0)) * 5;
  const defense = Math.max(0, 6 - Math.max(0, Number(agg.avgGoalsAgainst || 0))) * 3;
  const diff = (Number(agg.goalDiff || 0) / Math.max(1, matches)) * 10;
  const clean = (Math.max(0, Number(agg.cleanSheets || 0)) / Math.max(1, matches)) * 12;
  const rating = babyFootRating(agg);

  return {
    matches,
    win: Math.round(win * 10) / 10,
    attack: Math.round(attack * 10) / 10,
    defense: Math.round(defense * 10) / 10,
    diff: Math.round(diff * 10) / 10,
    clean: Math.round(clean * 10) / 10,
    rating,
    starScore: babyFootLevelScoreFromRating(rating),
  };
}
