import { babyFootRating, type BabyFootPlayerAggregate } from "./babyfootStatsAggregate";

export type BabyFootLevelInput = Pick<
  BabyFootPlayerAggregate,
  "matches" | "winRate" | "goalDiff" | "avgGoalsFor" | "avgGoalsAgainst" | "cleanSheets"
>;

export function clampBabyFootLevelScore(score: number): number {
  const n = Number(score);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(0, Math.min(180, Math.round(n)));
}

/**
 * Niveau visuel Baby-Foot pour ProfileStarRing.
 *
 * Important : ProfileStarRing expose encore une prop historique `avg3d`,
 * mais pour le Baby-Foot on lui passe ce score 100% Baby-Foot.
 * Le calcul est volontairement basé sur l'aggregate Baby-Foot : victoires,
 * différence de buts, attaque, défense et clean sheets. Aucun avg3D / dart stat
 * ne doit entrer dans ce score.
 */
export function babyFootLevelScoreFromAggregate(agg: BabyFootLevelInput | null | undefined): number {
  if (!agg || !Number(agg.matches)) return 0;
  return clampBabyFootLevelScore(babyFootRating(agg));
}
