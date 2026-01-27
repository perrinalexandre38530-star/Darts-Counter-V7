import { supabase } from "../../lib/supabaseClient";

export type TrainingLeaderboardRow = {
  user_id: string;
  public_name: string;
  best_score: number | null;
  best_time_ms: number | null;
  plays: number;
  last_played_at: string;
};

export async function fetchTrainingPublicLeaderboard(modeId: string, limit = 20) {
  const { data, error } = await supabase.rpc("get_training_public_leaderboard", {
    p_mode_id: modeId,
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []) as TrainingLeaderboardRow[];
}
