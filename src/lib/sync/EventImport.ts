// ============================================
// src/lib/sync/EventImport.ts
// Import MATCH events from Supabase (stats_events) into local History.
// - Incremental with checkpoint (created_at)
// - Paging (range)
// - Best-effort + schema tolerant (minimal select)
// ============================================

import { supabase } from "../supabaseClient";
import type { SavedMatch } from "../history";
import { upsertFromCloud } from "../history";

type RawEventRow = {
  id?: string;
  event_type?: string;
  payload?: any;
  created_at?: string;
};

const LSK_CHECKPOINT = "dc_cloud_events_checkpoint_v1";

type Checkpoint = {
  lastCreatedAtIso: string | null;
};

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

function readCheckpoint(): Checkpoint {
  if (!canUseWindow()) return { lastCreatedAtIso: null };
  try {
    const raw = localStorage.getItem(LSK_CHECKPOINT);
    if (!raw) return { lastCreatedAtIso: null };
    const parsed = JSON.parse(raw);
    const v = String(parsed?.lastCreatedAtIso || "").trim();
    return { lastCreatedAtIso: v || null };
  } catch {
    return { lastCreatedAtIso: null };
  }
}

function writeCheckpoint(cp: Checkpoint) {
  if (!canUseWindow()) return;
  try {
    localStorage.setItem(LSK_CHECKPOINT, JSON.stringify(cp));
  } catch {}
}

function isIsoDate(s: any): s is string {
  return typeof s === "string" && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s);
}

function normalizeToSavedMatch(payload: any): SavedMatch | null {
  if (!payload || typeof payload !== "object") return null;
  const id = String(payload?.matchId || payload?.id || "").trim();
  if (!id) return null;

  // On importe une version light (si payload complet absent)
  const rec: SavedMatch = {
    id,
    matchId: String(payload?.matchId || id),
    kind: payload?.kind || payload?.mode || "x01",
    status: payload?.status || "finished",
    winnerId: payload?.winnerId ?? null,
    players: Array.isArray(payload?.players) ? payload.players : [],
    createdAt: typeof payload?.createdAt === "number" ? payload.createdAt : undefined,
    updatedAt: typeof payload?.updatedAt === "number" ? payload.updatedAt : undefined,
    summary: payload?.summary ?? null,
    // payload complet éventuellement present
    payload: payload?.payload ?? undefined,
  };
  return rec;
}

export async function importHistoryFromCloud(opts?: {
  // Soft cap for how many events to import.
  limit?: number;
  pageSize?: number;
  maxPages?: number;
  // When no checkpoint exists, import only recent events (default 60 days).
  sinceDays?: number;
}): Promise<{ imported: number }>
{
  const limit = Number(opts?.limit ?? 400);
  const pageSize = Math.min(300, Math.max(50, opts?.pageSize ?? Math.min(200, limit || 200)));
  const maxPages = Math.min(10, Math.max(1, opts?.maxPages ?? Math.ceil((limit || pageSize) / pageSize)));

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return { imported: 0 };
    const uid = String(userData?.user?.id || "");
    if (!uid) return { imported: 0 };

    const cp = readCheckpoint();
    let imported = 0;
    let lastSeenCreatedAt = cp.lastCreatedAtIso;

    for (let page = 0; page < maxPages; page++) {
      let q = supabase
        .from("stats_events")
        .select("id,event_type,payload,created_at")
        .eq("user_id", uid)
        .in("event_type", ["MATCH_SAVED", "MATCH_FINISH", "MATCH_BEGIN"])
        .order("created_at", { ascending: true })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (lastSeenCreatedAt && isIsoDate(lastSeenCreatedAt)) {
        q = q.gt("created_at", lastSeenCreatedAt);
      }

      const { data, error } = await q;
      if (error) {
        console.warn("[EventImport] importHistoryFromCloud failed", error);
        break;
      }

      const rows = (data || []) as RawEventRow[];
      if (!rows.length) break;

      for (const r of rows) {
        const rec = normalizeToSavedMatch(r.payload);
        if (!rec) continue;
        // best-effort: upsertFromCloud évite les boucles (EventBuffer + cloud snapshots)
        // eslint-disable-next-line no-await-in-loop
        await upsertFromCloud(rec);
        imported += 1;
        if (r.created_at && isIsoDate(r.created_at)) lastSeenCreatedAt = r.created_at;
      }

      // si page incomplète, on a fini
      if (rows.length < pageSize) break;
    }

    writeCheckpoint({ lastCreatedAtIso: lastSeenCreatedAt || cp.lastCreatedAtIso });
    return { imported };
  } catch (e) {
    console.warn("[EventImport] importHistoryFromCloud exception", e);
    return { imported: 0 };
  }
}

export function resetCloudEventsCheckpoint() {
  if (!canUseWindow()) return;
  try {
    localStorage.removeItem(LSK_CHECKPOINT);
  } catch {}
}
