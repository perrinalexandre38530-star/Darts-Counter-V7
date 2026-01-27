import { loadTrainingEvents, markEventSynced } from "./trainingEventStore";
import { supabase } from "../../lib/supabaseClient";

export async function syncTrainingEvents(userId: string) {
  const events = loadTrainingEvents().filter(e => !e.synced);
  if (!events.length) return;

  for (const ev of events) {
    const { error } = await supabase.from("training_stats_events").insert({
      id: ev.id,
      user_id: userId,
      mode_id: ev.modeId,
      participant_id: ev.participantId,
      participant_type: ev.participantType,
      score: ev.score,
      duration_ms: ev.durationMs,
      meta: ev.meta,
      created_at: new Date(ev.createdAt).toISOString(),
    });

    if (!error) markEventSynced(ev.id);
  }
}