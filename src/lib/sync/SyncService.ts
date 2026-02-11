// =============================================================
// src/lib/sync/SyncService.ts
// Deterministic sync engine (push + pull)
// =============================================================
import { supabase } from "../supabaseClient";
import {
  getPendingEvents,
  markConfirmed,
  markFailed,
  eventExists,
  setLastSync,
  getLastSync,
} from "./EventBuffer";

export async function syncEvents(): Promise<{
  sent: number;
  received: number;
  ignored: number;
  errors: number;
}> {
  let sent = 0;
  let received = 0;
  let ignored = 0;
  let errors = 0;

  const pending = await getPendingEvents();

  for (const evt of pending) {
    try {
      const { error } = await supabase.from("events").insert(evt);
      if (error) {
        if (error.code === "23505") {
          ignored++;
          await markConfirmed(evt.event_id);
        } else {
          errors++;
          await markFailed(evt.event_id, error.message);
        }
      } else {
        sent++;
        await markConfirmed(evt.event_id);
      }
    } catch (e: any) {
      errors++;
      await markFailed(evt.event_id, e.message);
    }
  }

  const lastSync = await getLastSync();
  const { data } = await supabase
    .from("events")
    .select("*")
    .gt("created_at", lastSync)
    .order("created_at", { ascending: true });

  for (const evt of data ?? []) {
    if (!(await eventExists(evt.event_id))) {
      // Application réelle des events à brancher ici
      received++;
    } else {
      ignored++;
    }
  }

  await setLastSync(new Date().toISOString());

  return { sent, received, ignored, errors };
}