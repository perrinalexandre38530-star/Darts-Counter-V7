// =============================================================
// src/lib/sync/cloudEventSyncPolicy.ts
// Legacy Supabase event-table sync gate.
//
// MULTISPORTS SCORING now uses:
// - local History / IndexedDB as the gameplay/statistics source of truth
// - Cloudflare R2 for account backup / restore / multi-device persistence
// - Supabase for public auth / social / online data
//
// The historical `events` / `stats_events` pipeline is therefore disabled
// unless explicitly re-enabled for a project that actually provisions those
// tables. This prevents repeated PostgREST 404s on projects without them.
// =============================================================

const ENV_KEY = "VITE_SUPABASE_EVENT_SYNC";

export function isSupabaseEventSyncEnabled(): boolean {
  try {
    const raw = String((import.meta as any)?.env?.[ENV_KEY] ?? "").trim().toLowerCase();
    return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
  } catch {
    return false;
  }
}

export const SUPABASE_EVENT_SYNC_DISABLED_REASON =
  "Supabase legacy events/stats_events sync is disabled; History + R2 are authoritative.";
