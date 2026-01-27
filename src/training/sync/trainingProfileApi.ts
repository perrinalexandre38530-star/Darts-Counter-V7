import { supabase } from "../../lib/supabaseClient";

export async function fetchTrainingProfileSummary(userId: string) {
  const { data, error } = await supabase.rpc("get_training_profile_summary", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data;
}
