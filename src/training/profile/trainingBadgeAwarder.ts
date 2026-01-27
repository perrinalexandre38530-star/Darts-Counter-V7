import { supabase } from "../../lib/supabaseClient";
import { computeLocalBadgesFromSummary } from "./trainingBadges";

// Award badges safely (idempotent) based on a profile summary object
export async function awardTrainingBadgesFromSummary(summary: any) {
  const keys = computeLocalBadgesFromSummary(summary);
  for (const k of keys) {
    await supabase.rpc("award_badge", {
      p_badge_key: k,
      p_sport: "training",
      p_mode_id: null,
      p_meta: null,
    });
  }
}
