// ============================================
// src/lib/sync/CloudHistoryImport.ts
// Import incrémental des matchs depuis Supabase.
// - Schéma courant : public.events
// - Fallback legacy : public.stats_events uniquement si public.events n'existe pas
// - Lit les events MATCH_SAVED (payload light)
// - Reconstruit des entrées History "light" (ou payload si présent)
// - Utilise History.upsertFromCloud() (anti-boucle + conflits)
// ============================================

import { supabase } from "../supabaseClient";
import { History, type SavedMatch } from "../history";
import { cancelScheduledStatsIndexRefresh, scheduleStatsIndexRefresh } from "../stats/rebuildStatsFromHistory";

const CHECKPOINT_KEY = "dc_cloud_history_last_pull_iso_v1";

type NormalizedEventRow = {
  id: string;
  event_type: string;
  payload: any;
  created_at: string;
};

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

function missingRelation(error: any): boolean {
  const code = String(error?.code || "").toUpperCase();
  const text = `${String(error?.message || "")} ${String(error?.details || "")} ${String(error?.hint || "")}`.toLowerCase();
  return code === "PGRST205" || code === "42P01" || text.includes("could not find the table") || text.includes("relation") && text.includes("does not exist");
}

async function fetchMatchSavedPage(args: {
  uid: string;
  checkpoint: string;
  pageSize: number;
}): Promise<{ rows: NormalizedEventRow[]; error?: any }> {
  const { uid, checkpoint, pageSize } = args;

  // 1) Schéma courant : EventBuffer écrit dans public.events.
  let modern = supabase
    .from("events")
    .select("event_id,type,payload,created_at")
    .eq("user_id", uid)
    .like("type", "%:MATCH_SAVED")
    .order("created_at", { ascending: true })
    .limit(pageSize);

  if (checkpoint) modern = modern.gt("created_at", checkpoint);

  const modernResult = await modern;
  if (!modernResult.error) {
    const rows = ((modernResult.data || []) as any[]).map((r) => ({
      id: String(r?.event_id || ""),
      event_type: "MATCH_SAVED",
      // public.events enveloppe le payload applicatif dans { meta, data }.
      payload: r?.payload?.data ?? r?.payload ?? null,
      created_at: String(r?.created_at || ""),
    }));
    return { rows };
  }

  // Une vraie erreur sur le schéma courant doit rester visible.
  if (!missingRelation(modernResult.error)) {
    return { rows: [], error: modernResult.error };
  }

  // 2) Anciennes installations seulement : public.stats_events.
  let legacy = supabase
    .from("stats_events")
    .select("id,event_type,payload,created_at")
    .eq("event_type", "MATCH_SAVED")
    .order("created_at", { ascending: true })
    .limit(pageSize);

  if (checkpoint) legacy = legacy.gt("created_at", checkpoint);

  const legacyResult = await legacy;
  if (legacyResult.error) {
    // Si les deux tables n'existent pas, il n'y a simplement aucun flux d'events cloud à importer.
    // Ne pas polluer la console à chaque montage de page.
    if (missingRelation(legacyResult.error)) return { rows: [] };
    return { rows: [], error: legacyResult.error };
  }

  return {
    rows: ((legacyResult.data || []) as any[]).map((r) => ({
      id: String(r?.id || ""),
      event_type: String(r?.event_type || "MATCH_SAVED"),
      payload: r?.payload ?? null,
      created_at: String(r?.created_at || ""),
    })),
  };
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
  const uid = String(data?.user?.id || "");
  if (!uid) return { imported: 0, conflicts: 0 };

  if (opts?.hardReset) setCheckpoint("");
  let checkpoint = getCheckpoint();

  let imported = 0;
  let conflicts = 0;
  let lastSeen = checkpoint;

  try {
    cancelScheduledStatsIndexRefresh();
  } catch {}

  for (let page = 0; page < maxPages; page++) {
    const result = await fetchMatchSavedPage({ uid, checkpoint, pageSize });
    if (result.error) {
      console.warn("[CloudHistoryImport] fetch failed", result.error);
      break;
    }

    const rows = result.rows;
    if (!rows.length) break;

    for (const r of rows) {
      const rec = normalizeFromMatchSaved(r.payload);
      if (!rec) continue;

      // eslint-disable-next-line no-await-in-loop
      const res = await History.upsertFromCloud(rec, { cloudEventId: r.id, cloudCreatedAt: r.created_at });
      if (res.applied === "cloud") imported++;
      if (res.conflictId) conflicts++;

      const ca = r.created_at;
      if (ca && (!lastSeen || ca > lastSeen)) lastSeen = ca;
    }

    // Avance le checkpoint même si conflits (on n’insiste pas page suivante sur la même zone)
    if (lastSeen && lastSeen !== checkpoint) {
      checkpoint = lastSeen;
      setCheckpoint(checkpoint);
    }

    if (rows.length < pageSize) break;
  }

  if (imported > 0 || conflicts > 0) {
    try {
      await scheduleStatsIndexRefresh({
        includeNonFinished: true,
        persist: true,
        debounceMs: 120,
        reason: `cloud-history-import:${imported}:${conflicts}`,
      });
    } catch {}
  }

  return { imported, conflicts, last: checkpoint || lastSeen || "" };
}
