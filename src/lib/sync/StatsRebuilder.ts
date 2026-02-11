// =============================================================
// src/lib/sync/StatsRebuilder.ts
// Rebuild stats locally from events (cloud or IndexedDB)
// =============================================================
import { supabase } from "../supabaseClient";
import { EventBuffer } from "./EventBuffer";

export type RebuildOptions = {
  from?: string; // ISO date
  to?: string;   // ISO date
};

export async function rebuildStatsFromEvents(opts?: RebuildOptions) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;

    // Pull all events from cloud for safety
    const query = supabase
      .from("events")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });

    const { data, error } = await query;
    if (error || !data) return;

    // ⚠️ IMPORTANT :
    // Ici on NE synchronise PAS les stats.
    // On reconstruit les stats locales depuis les events.
    // Chaque sport peut brancher son propre reducer.
    for (const evt of data) {
      try {
        // Placeholder: dispatch vers tes moteurs existants
        // ex: dispatchDartsEvent(evt), dispatchBabyfootEvent(evt), etc.
        // Pour l'instant, on se contente de les bufferiser localement
        await EventBuffer.push({
          sport: evt.sport,
          mode: evt.mode,
          event_type: evt.event_type,
          payload: evt.payload,
          user_id: evt.user_id,
          device_id: evt.device_id,
        });
      } catch {}
    }
  } catch (e) {
    console.warn("[StatsRebuilder] rebuild failed", e);
  }
}