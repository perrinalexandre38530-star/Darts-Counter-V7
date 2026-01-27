import { supabase } from "../../lib/supabaseClient";
import { computeLocalBadgesFromSummary, computePerModeBadges } from "./trainingBadges";

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


// Award per-mode badges safely (idempotent) based on modes summary object
export async function awardTrainingBadgesFromModesSummary(summary: any) {
  // also keep global awards
  await awardTrainingBadgesFromSummary(summary);

  const modes: any[] = summary?.modes || [];
  for (const m of modes) {
    const modeId = m?.mode_id || m?.modeId;
    if (!modeId) continue;

    const keys = computePerModeBadges(String(modeId), m);
    for (const k of keys) {
      await supabase.rpc("award_badge", {
        p_badge_key: k,
        p_sport: "training",
        p_mode_id: String(modeId),
        p_meta: null,
      });
    }
  }
}
