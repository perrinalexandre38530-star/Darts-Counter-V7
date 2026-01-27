export type TrainingBadgeKey =
  | "training_first_finish"
  | "training_10_plays"
  | "training_tier_S"
  | "timeattack_sub45s"
  | "timeattack_sub30s"
  | "ghost_flawless"
  | "precision_90p";

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

export function computePerModeBadges(modeId: string, modeStats: any): TrainingBadgeKey[] {
  const out: TrainingBadgeKey[] = [];
  const bestTime = modeStats?.best_time_ms as number | null | undefined;
  const bestScore = modeStats?.best_score as number | null | undefined;
  const tier = (modeStats?.tier as string | undefined) || "";

  const id = (modeId || "").toLowerCase();

  if (id.includes("timeattack")) {
    if (typeof bestTime === "number" && bestTime > 0 && bestTime <= 45000) out.push("timeattack_sub45s");
    if (typeof bestTime === "number" && bestTime > 0 && bestTime <= 30000) out.push("timeattack_sub30s");
  }

  if (id.includes("ghost")) {
    // "flawless" heuristic: tier S OR very high best_score if score-based
    if (tier === "S" || (typeof bestScore === "number" && bestScore >= 95)) out.push("ghost_flawless");
  }

  if (id.includes("precision")) {
    if (typeof bestScore === "number" && bestScore >= 90) out.push("precision_90p");
  }

  return out;
}
