import { loadTrainingEvents, markEventSynced } from "./trainingEventStore";
import { shouldAttemptRemoteWork } from "../../lib/offlineFirstRuntime";
import { supabase } from "../../lib/supabaseClient";

export async function syncTrainingEvents(currentUserId: string) {
  if (!shouldAttemptRemoteWork()) return;
  const events = loadTrainingEvents().filter((e) => !e.synced);
  if (!events.length) return;

  for (const ev of events) {
    const userId = currentUserId || ev.userId;
    if (!userId) continue;

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

    if (!error) {
      markEventSynced(ev.id);
      continue;
    }

    // IDEMPOTENCE W6 : si le même event_id a déjà été reçu par Supabase
    // (reconnect, crash entre insert et mark local), le cloud est déjà correct.
    if (String((error as any)?.code || "") === "23505") {
      markEventSynced(ev.id);
      continue;
    }

    // Une vraie erreur doit remonter jusqu'à trainingSyncQueueTry afin que son
    // backoff persistant reste actif. L'ancienne version avalait l'erreur puis
    // remettait la queue à zéro malgré des événements encore pending.
    throw error;
  }
}
