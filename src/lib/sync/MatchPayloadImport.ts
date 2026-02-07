// ============================================
// src/lib/sync/MatchPayloadImport.ts
// Import full match payload from Supabase (stats_events: MATCH_PAYLOAD_PART)
// - Groups chunks by (matchId, hash)
// - Picks latest version per matchId (by created_at)
// - Incremental checkpoint + paging
// ============================================

import { supabase } from "../supabaseClient";
import type { SavedMatch } from "../history";
import { upsertFromCloud } from "../history";
import { joinChunks } from "./PayloadChunk";

type RawRow = {
  event_type?: string;
  payload?: any;
  created_at?: string;
};

const LSK_CHECKPOINT = "dc_cloud_payload_checkpoint_v1";

type Checkpoint = {
  lastCreatedAtIso: string | null;
};

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

function isIsoDate(s: any): s is string {
  return typeof s === "string" && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s);
}

function readCheckpoint(): Checkpoint {
  if (!canUseWindow()) return { lastCreatedAtIso: null };
  try {
    const raw = localStorage.getItem(LSK_CHECKPOINT);
    if (!raw) return { lastCreatedAtIso: null };
    const p = JSON.parse(raw);
    const v = String(p?.lastCreatedAtIso || "").trim();
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

type ChunkKey = string; // `${matchId}::${hash}`

type ChunkGroup = {
  matchId: string;
  hash: string;
  kind?: string;
  status?: string;
  createdAtMax: string | null;
  total: number;
  parts: Map<number, string>;
};

function makeKey(matchId: string, hash: string): ChunkKey {
  return `${matchId}::${hash}`;
}

function toSavedMatchFromFullPayload(matchId: string, payload: any, meta?: { kind?: string; status?: string }): SavedMatch | null {
  if (!matchId) return null;
  const kind = meta?.kind || payload?.kind || payload?.mode || "x01";
  const status = meta?.status || payload?.status || "finished";
  const players = Array.isArray(payload?.players) ? payload.players : [];
  const winnerId = payload?.winnerId ?? null;
  const createdAt = typeof payload?.createdAt === "number" ? payload.createdAt : undefined;
  const updatedAt = typeof payload?.updatedAt === "number" ? payload.updatedAt : undefined;

  return {
    id: matchId,
    matchId,
    kind,
    status,
    players,
    winnerId,
    createdAt,
    updatedAt,
    summary: payload?.summary ?? null,
    payload,
  };
}

export async function importMatchPayloadsFromCloud(opts?: {
  pageSize?: number;
  maxPages?: number;
}): Promise<{ imported: number; assembled: number; skipped: number }>
{
  const pageSize = Math.min(1000, Math.max(50, opts?.pageSize ?? 500));
  const maxPages = Math.min(30, Math.max(1, opts?.maxPages ?? 8));

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return { imported: 0, assembled: 0, skipped: 0 };
    const uid = String(userData?.user?.id || "");
    if (!uid) return { imported: 0, assembled: 0, skipped: 0 };

    const cp = readCheckpoint();
    let lastSeenCreatedAt = cp.lastCreatedAtIso;

    // On collecte des chunks (incrémental), puis on assemble la "dernière" version par matchId.
    const groups = new Map<ChunkKey, ChunkGroup>();
    const bestByMatch = new Map<string, { key: ChunkKey; createdAtMax: string | null }>();

    let scanned = 0;
    let skipped = 0;

    for (let page = 0; page < maxPages; page++) {
      let q = supabase
        .from("stats_events")
        .select("event_type,payload,created_at")
        .eq("user_id", uid)
        .eq("event_type", "MATCH_PAYLOAD_PART")
        .order("created_at", { ascending: true })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (lastSeenCreatedAt && isIsoDate(lastSeenCreatedAt)) {
        q = q.gt("created_at", lastSeenCreatedAt);
      }

      const { data, error } = await q;
      if (error) {
        console.warn("[MatchPayloadImport] query failed", error);
        break;
      }

      const rows = (data || []) as RawRow[];
      if (!rows.length) break;

      for (const r of rows) {
        scanned += 1;
        if (r.created_at && isIsoDate(r.created_at)) lastSeenCreatedAt = r.created_at;

        const p = r.payload;
        const matchId = String(p?.matchId || p?.id || "").trim();
        const hash = String(p?.hash || "").trim();
        const chunkIndex = Number(p?.chunkIndex);
        const chunkTotal = Number(p?.chunkTotal);
        const dataPart = typeof p?.data === "string" ? p.data : "";

        if (!matchId || !hash || !Number.isFinite(chunkIndex) || !Number.isFinite(chunkTotal) || chunkTotal <= 0) {
          skipped += 1;
          continue;
        }

        const key = makeKey(matchId, hash);
        let g = groups.get(key);
        if (!g) {
          g = {
            matchId,
            hash,
            kind: p?.kind,
            status: p?.status,
            createdAtMax: r.created_at && isIsoDate(r.created_at) ? r.created_at : null,
            total: chunkTotal,
            parts: new Map<number, string>(),
          };
          groups.set(key, g);
        }

        // update meta
        if (r.created_at && isIsoDate(r.created_at)) {
          if (!g.createdAtMax || r.created_at > g.createdAtMax) g.createdAtMax = r.created_at;
        }
        g.total = Math.max(g.total, chunkTotal);
        if (!g.kind && p?.kind) g.kind = p.kind;
        if (!g.status && p?.status) g.status = p.status;

        // store part
        if (!g.parts.has(chunkIndex)) g.parts.set(chunkIndex, dataPart);

        // decide best version per match = latest createdAtMax
        const existing = bestByMatch.get(matchId);
        const candMax = g.createdAtMax;
        if (!existing) {
          bestByMatch.set(matchId, { key, createdAtMax: candMax });
        } else {
          const prevMax = existing.createdAtMax;
          if (!prevMax || (candMax && candMax > prevMax)) {
            bestByMatch.set(matchId, { key, createdAtMax: candMax });
          }
        }
      }

      if (rows.length < pageSize) break;
    }

    // Assemble only best version per match.
    let assembled = 0;
    let imported = 0;

    for (const [matchId, best] of bestByMatch.entries()) {
      const g = groups.get(best.key);
      if (!g) continue;

      // check completeness
      if (g.parts.size < g.total) {
        skipped += 1;
        continue;
      }

      const ordered: string[] = [];
      for (let i = 0; i < g.total; i++) {
        const part = g.parts.get(i);
        if (typeof part !== "string") {
          skipped += 1;
          ordered.length = 0;
          break;
        }
        ordered.push(part);
      }
      if (!ordered.length) continue;

      const raw = joinChunks(ordered);
      let json: any = null;
      try {
        json = JSON.parse(raw);
      } catch {
        skipped += 1;
        continue;
      }

      const rec = toSavedMatchFromFullPayload(matchId, json, { kind: g.kind, status: g.status });
      if (!rec) {
        skipped += 1;
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await upsertFromCloud(rec);
      imported += 1;
      assembled += 1;
    }

    writeCheckpoint({ lastCreatedAtIso: lastSeenCreatedAt || cp.lastCreatedAtIso });
    if (scanned && canUseWindow()) {
      try {
        window.dispatchEvent(new Event("dc-cloud-payload-imported"));
      } catch {}
    }
    return { imported, assembled, skipped };
  } catch (e) {
    console.warn("[MatchPayloadImport] exception", e);
    return { imported: 0, assembled: 0, skipped: 0 };
  }
}

export function resetCloudPayloadCheckpoint() {
  if (!canUseWindow()) return;
  try {
    localStorage.removeItem(LSK_CHECKPOINT);
  } catch {}
}
