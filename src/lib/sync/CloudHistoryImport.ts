// ============================================
// src/lib/sync/CloudHistoryImport.ts
// Import incrémental des matchs depuis Supabase (stats_events)
// - Lit les events MATCH_SAVED (payload light)
// - Reconstruit des entrées History "light" (ou payload si présent)
// - Utilise History.upsertFromCloud() (anti-boucle + conflits)
// ============================================

import { supabase } from "../supabaseClient";
import { History, type SavedMatch } from "../history";

const CHECKPOINT_KEY = "dc_cloud_history_last_pull_iso_v1";

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

function getCheckpoint(): string {
  try {
    if (!canUseWindow()) return "";
    return String(window.localStorage.getItem(CHECKPOINT_KEY) || "");
  } catch {
    return "";
  }
}

function setCheckpoint(iso: string) {
  try {
    if (!canUseWindow()) return;
    window.localStorage.setItem(CHECKPOINT_KEY, iso);
  } catch {}
}

function normalizeFromMatchSaved(payload: any): SavedMatch | null {
  if (!payload) return null;
  const baseId = String(payload.matchId || payload.id || "").trim();
  if (!baseId) return null;

  // ⚠️ payload light volontaire: on n’essaie pas de reconstruire l’état complet ici
  const rec: SavedMatch = {
    id: baseId,
    matchId: baseId,
    kind: payload.kind,
    status: payload.status,
    winnerId: payload.winnerId ?? null,
    players: payload.players ?? [],
    createdAt: payload.createdAt ?? undefined,
    updatedAt: payload.updatedAt ?? undefined,
    summary: payload.summary ?? null,
  };
  return rec;
}

export async function importHistoryFromCloud(opts?: {
  pageSize?: number;
  maxPages?: number;
  hardReset?: boolean;
}): Promise<{ imported: number; conflicts: number; last?: string }> {
  const pageSize = Math.min(500, Math.max(50, opts?.pageSize ?? 200));
  const maxPages = Math.min(10, Math.max(1, opts?.maxPages ?? 3));

  // Session requise
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } } as any));
  if (!data?.user?.id) return { imported: 0, conflicts: 0 };

  if (opts?.hardReset) setCheckpoint("");
  let checkpoint = getCheckpoint();

  let imported = 0;
  let conflicts = 0;
  let lastSeen = checkpoint;

  for (let page = 0; page < maxPages; page++) {
    let q = supabase
      .from("stats_events")
      .select("id,event_type,payload,created_at", { count: "exact" } as any)
      .eq("event_type", "MATCH_SAVED")
      .order("created_at", { ascending: true })
      .limit(pageSize);

    if (checkpoint) {
      q = q.gt("created_at", checkpoint);
    }

    const { data: rows, error } = await q;
    if (error) {
      console.warn("[CloudHistoryImport] fetch failed", error);
      break;
    }

    if (!rows || rows.length === 0) break;

    for (const r of rows) {
      const rec = normalizeFromMatchSaved((r as any).payload);
      if (!rec) continue;

      // eslint-disable-next-line no-await-in-loop
      const res = await History.upsertFromCloud(rec, { cloudEventId: String((r as any).id || ""), cloudCreatedAt: String((r as any).created_at || "") });
      if (res.applied === "cloud") imported++;
      if (res.conflictId) conflicts++;

      const ca = String((r as any).created_at || "");
      if (ca && (!lastSeen || ca > lastSeen)) lastSeen = ca;
    }

    // Avance le checkpoint même si conflits (on n’insiste pas page suivante sur la même zone)
    if (lastSeen && lastSeen !== checkpoint) {
      checkpoint = lastSeen;
      setCheckpoint(checkpoint);
    }

    if (rows.length < pageSize) break;
  }

  return { imported, conflicts, last: checkpoint || lastSeen || "" };
}
