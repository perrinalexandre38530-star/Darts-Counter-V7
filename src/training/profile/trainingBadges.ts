export type TrainingBadgeKey =
  | "training_first_finish"
  | "training_10_plays"
  | "training_tier_S"
  | "timeattack_sub45s";

export type PlayerBadge = {
  badge_key: string;
  sport: string;
  mode_id?: string | null;
  meta?: any;
  earned_at: string;
};

export function computeLocalBadgesFromSummary(summary: any): TrainingBadgeKey[] {
  const out: TrainingBadgeKey[] = [];
  const t = summary?.training;
  if (!t) return out;

  if ((t.plays ?? 0) >= 1) out.push("training_first_finish");
  if ((t.plays ?? 0) >= 10) out.push("training_10_plays");
  if (t.tier === "S") out.push("training_tier_S");
  return out;
}
