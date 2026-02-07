// ============================================
// src/lib/sync/EventImport.ts
// Cloud -> Local import (multi-device)
// - Lit les events Supabase (table: stats_events) pour l'utilisateur connecté
// - Recrée des entrées History "light" (sans payload lourd)
// - Déduplication par matchId/id + updatedAt
// - Checkpoint local pour import incrémental
// ============================================

import { supabase } from "../supabaseClient";
import type { SavedMatch } from "../history";
import { upsertFromCloud } from "../history";

const LS_LAST_PULL = "dc_cloud_events_last_pull_iso_v1";

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

function getLastPullIso(): string {
  if (!canUseWindow()) return "";
  try {
    return String(window.localStorage.getItem(LS_LAST_PULL) || "");
  } catch {
    return "";
  }
}

function setLastPullIso(iso: string) {
  if (!canUseWindow()) return;
  try {
    window.localStorage.setItem(LS_LAST_PULL, String(iso || ""));
  } catch {}
}

function safeNum(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeMatchFromEventPayload(p: any): SavedMatch | null {
  if (!p || typeof p !== "object") return null;

  const id = String(p.id || p.matchId || "");
  if (!id) return null;

  const kind = typeof p.kind === "string" ? p.kind : undefined;
  const status = typeof p.status === "string" ? (p.status as any) : undefined;
  const matchId = typeof p.matchId === "string" ? p.matchId : undefined;
  const winnerId = typeof p.winnerId === "string" ? p.winnerId : (p.winnerId == null ? null : undefined);

  const createdAt = safeNum(p.createdAt);
  const updatedAt = safeNum(p.updatedAt);

  const players = Array.isArray(p.players)
    ? p.players
        .map((pl: any) => {
          if (!pl || typeof pl !== "object") return null;
          const pid = String(pl.id || "");
          if (!pid) return null;
          return {
            id: pid,
            name: typeof pl.name === "string" ? pl.name : undefined,
            avatarDataUrl: typeof pl.avatarDataUrl === "string" ? pl.avatarDataUrl : null,
          };
        })
        .filter(Boolean)
    : undefined;

  const summary = p.summary && typeof p.summary === "object" ? (p.summary as any) : null;

  const rec: SavedMatch = {
    id,
    matchId,
    kind,
    status,
    winnerId: winnerId as any,
    players,
    createdAt,
    updatedAt,
    summary: summary ?? null,
    payload: null, // import "light" (pas de payload lourd)
  };

  return rec;
}

export type CloudImportResult = {
  pulled: number;
  imported: number;
  lastPulledIso: string;
};

/**
 * Import incrémental des events cloud -> History local.
 * - Ne casse jamais l'app (failsafe)
 * - Ne nécessite aucune migration DB
 */
export async function importHistoryFromCloud(opts?: {
  limit?: number;
  forceSinceIso?: string;
}): Promise<CloudImportResult> {
  const limit = Math.max(1, Math.min(1000, opts?.limit ?? 400));

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return { pulled: 0, imported: 0, lastPulledIso: getLastPullIso() };
    const uid = String(userData?.user?.id || "");
    if (!uid) return { pulled: 0, imported: 0, lastPulledIso: getLastPullIso() };

    const sinceIso = String(opts?.forceSinceIso || getLastPullIso() || "");

    // select minimal pour éviter PGRST204 si colonnes manquantes
    let q = supabase
      .from("stats_events")
      .select("id,event_type,payload,created_at")
      .eq("user_id", uid)
      .in("event_type", ["MATCH_SAVED", "MATCH_FINISH"])
      .order("created_at", { ascending: true })
      .limit(limit);

    if (sinceIso) q = q.gt("created_at", sinceIso);

    const { data, error } = await q;
    if (error) {
      console.warn("[EventImport] read stats_events failed", error);
      return { pulled: 0, imported: 0, lastPulledIso: getLastPullIso() };
    }

    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) return { pulled: 0, imported: 0, lastPulledIso: getLastPullIso() };

    let imported = 0;
    let lastIso = sinceIso;

    for (const r of rows) {
      const created_at = String((r as any).created_at || "");
      if (created_at) lastIso = created_at;

      const rec = normalizeMatchFromEventPayload((r as any).payload);
      if (!rec) continue;

      // upsert en mode "cloud" (ne repousse pas un event)
      // eslint-disable-next-line no-await-in-loop
      await upsertFromCloud(rec);
      imported++;
    }

    if (lastIso) setLastPullIso(lastIso);

    try {
      if (canUseWindow()) window.dispatchEvent(new Event("dc-cloud-import-finished"));
    } catch {}

    return { pulled: rows.length, imported, lastPulledIso: lastIso || getLastPullIso() };
  } catch (e) {
    console.warn("[EventImport] importHistoryFromCloud failed", e);
    return { pulled: 0, imported: 0, lastPulledIso: getLastPullIso() };
  }
}
