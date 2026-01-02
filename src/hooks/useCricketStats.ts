// ============================================
// src/hooks/useCricketStats.ts
// Stats globales Cricket par profil
// - Lit History.listFinished() pour trouver les matchs "cricket"
// - Charge chaque payload via History.get(id)
// - Récupère / calcule legStats par joueur (computeCricketLegStats)
// - Agrège par profil (aggregateCricketMatches)
//
// ✅ FIX V3 (ROBUSTE):
// - Supporte payload "string" (base64 + gzip OU json direct) + payload objet
// - Détecte cricket via kind/mode/config + payload
// - Extrait les hits depuis plusieurs formats legacy (hits/throws/darts/events + turns/visits payload)
// - Convertit "T20/D19/S18/SBULL/DBULL/MISS" -> CricketHit {target,mult}
// - Si profileId est undefined => retourne automatiquement le 1er profil dispo
// ============================================

import * as React from "react";
import { History } from "../lib/history";
import {
  computeCricketLegStats,
  aggregateCricketMatches,
  type CricketLegStats,
  type CricketMatchAgg,
} from "../lib/StatsCricket";
import type { SavedMatch } from "../lib/history";

export type CricketPlayerDashboardStats = CricketMatchAgg & {
  profileId: string;
  profileName?: string;
};

type StateByProfile = Record<string, CricketPlayerDashboardStats>;

/* -------------------------------------------
   Utils
------------------------------------------- */
function str(v: any): string {
  return String(v ?? "");
}
function lower(v: any): string {
  return str(v).toLowerCase();
}

/* -------------------------------------------
   Decode helpers (object | json | base64 | gzip)
------------------------------------------- */
async function decodeMaybe(raw: any): Promise<any | null> {
  if (!raw) return null;

  // already object
  if (typeof raw === "object") return raw;

  if (typeof raw !== "string") return null;

  const s = raw.trim();
  if (!s) return null;

  // 1) raw JSON
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      return JSON.parse(s);
    } catch {
      // continue
    }
  }

  // 2) base64 -> maybe gzip(JSON) OR base64(JSON)
  try {
    const bin = atob(s.replace(/[\r\n\s]/g, ""));
    const buf = Uint8Array.from(bin, (c) => c.charCodeAt(0));

    // 2a) try gzip via DecompressionStream if available
    const DS: any = (window as any).DecompressionStream;
    if (typeof DS === "function") {
      try {
        const ds = new DS("gzip");
        const stream = new Blob([buf]).stream().pipeThrough(ds);
        const resp = new Response(stream);
        return await resp.json();
      } catch {
        // not gzipped, continue
      }
    }

    // 2b) base64(json)
    try {
      return JSON.parse(bin);
    } catch {
      // continue
    }
  } catch {
    // not base64, continue
  }

  // 3) last resort: JSON parse again
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/* -------------------------------------------
   Cricket detection (row + payload)
------------------------------------------- */
function isCricketRowQuick(m: any): boolean {
  const k = lower(m?.kind);
  if (k === "cricket") return true;

  const mode =
    lower(m?.mode) ||
    lower(m?.game?.mode) ||
    lower(m?.summary?.mode) ||
    lower(m?.config?.mode);

  if (mode.includes("cricket")) return true;

  // legacy: sometimes kind unknown but payload/config says cricket (confirm after decode)
  return false;
}

function confirmCricketFromPayload(payload: any, row?: any): boolean {
  const pkind = lower(payload?.kind);
  const pmode = lower(
    payload?.config?.mode ??
      payload?.game?.mode ??
      payload?.mode ??
      payload?.summary?.mode ??
      payload?.state?.mode ??
      payload?.engineState?.mode ??
      ""
  );
  const rkind = lower(row?.kind);
  return pkind === "cricket" || pmode.includes("cricket") || rkind === "cricket";
}

/* -------------------------------------------
   Player helpers
------------------------------------------- */
function pickPlayers(payload: any, row?: any): any[] {
  const p = payload && typeof payload === "object" ? payload : null;

  const p1 = Array.isArray(p?.players) ? p.players : [];
  const p2 = Array.isArray(p?.result?.players) ? p.result.players : [];
  const p3 = Array.isArray(p?.summary?.players) ? p.summary.players : [];
  const p4 = Array.isArray(p?.state?.players) ? p.state.players : [];
  const p5 = Array.isArray(p?.engineState?.players) ? p.engineState.players : [];

  // sometimes row.players is available even if payload minimal
  const pr = Array.isArray(row?.players) ? row.players : [];

  return p1.length
    ? p1
    : p2.length
    ? p2
    : p3.length
    ? p3
    : p4.length
    ? p4
    : p5.length
    ? p5
    : pr.length
    ? pr
    : [];
}

function getPid(p: any): string {
  if (!p) return "";
  return str(
    p.profileId || p.id || p.playerId || p.player_id || p.uuid || p.uid || ""
  );
}

function getPname(p: any): string | undefined {
  if (!p) return undefined;
  return p.name || p.displayName || p.username || p.nickname || undefined;
}

/* -------------------------------------------
   Hit normalization
   - Accept CricketHit-like objects
   - Accept strings like "T20", "D19", "S18", "SBULL", "DBULL", "MISS"
------------------------------------------- */
function parseSegment(seg: any): { target: number; mult: number } | null {
  if (!seg) return null;

  // already object-ish
  if (typeof seg === "object") {
    const t =
      (seg as any).target ??
      (seg as any).number ??
      (seg as any).value ??
      (seg as any).num ??
      (seg as any).n ??
      (seg as any).bed ??
      null;

    const m =
      (seg as any).mult ??
      (seg as any).multiplier ??
      (seg as any).m ??
      (seg as any).times ??
      (seg as any).x ??
      null;

    if (typeof t === "number" && typeof m === "number") {
      if (t === 25) return { target: 25, mult: m >= 2 ? 2 : 1 };
      if (t >= 15 && t <= 20)
        return { target: t, mult: Math.max(1, Math.min(3, m)) };
    }

    const s =
      (seg as any).segment ||
      (seg as any).seg ||
      (seg as any).label ||
      (seg as any).text ||
      (seg as any).code ||
      null;

    if (typeof s === "string") return parseSegment(s);
    return null;
  }

  if (typeof seg !== "string") return null;

  const s = seg.trim().toUpperCase();
  if (!s) return null;

  // miss
  if (s === "MISS" || s === "M" || s === "0") return null;

  // bull
  if (s === "SBULL" || s === "BULL" || s === "S25" || s === "25") {
    return { target: 25, mult: 1 };
  }
  if (s === "DBULL" || s === "D-BULL" || s === "D25" || s === "50") {
    return { target: 25, mult: 2 };
  }

  // standard "T20" "D19" "S18"
  const mm = /^([SDT])\s*(\d{1,2})$/.exec(s);
  if (mm) {
    const mult = mm[1] === "S" ? 1 : mm[1] === "D" ? 2 : 3;
    const n = Number(mm[2]);
    if (n >= 15 && n <= 20) return { target: n, mult };
  }

  // sometimes just "20" (assume single)
  const n = Number(s);
  if (Number.isFinite(n) && n >= 15 && n <= 20) return { target: n, mult: 1 };

  return null;
}

/**
 * Extract a raw list of "hit-like" events from many legacy shapes.
 */
function extractHitsForPlayer(player: any, payload: any): any[] {
  if (!player) return [];

  // 1) direct arrays on player
  const directCandidates: any[] = [
    player.hits,
    player.cricketHits,
    player.hitLog,
    player.log,
    player.events,
    player.actions,
    player.throws,
    player.darts,
  ];
  for (const c of directCandidates) {
    if (Array.isArray(c) && c.length) return c;
  }

  // 2) arrays of turns/visits on player (need flatten)
  const playerTurns =
    (Array.isArray(player.turns) ? player.turns : null) ||
    (Array.isArray(player.visits) ? player.visits : null) ||
    null;

  if (Array.isArray(playerTurns) && playerTurns.length) {
    const out: any[] = [];
    for (const t of playerTurns) {
      const darts =
        (Array.isArray(t?.darts) ? t.darts : null) ||
        (Array.isArray(t?.throws) ? t.throws : null) ||
        (Array.isArray(t?.hits) ? t.hits : null) ||
        (Array.isArray(t?.events) ? t.events : null) ||
        null;
      if (Array.isArray(darts) && darts.length) out.push(...darts);
    }
    if (out.length) return out;
  }

  // 3) payload-level turns/visits (filter by playerId)
  const pid = getPid(player);
  const turns =
    (Array.isArray(payload?.turns) ? payload.turns : null) ||
    (Array.isArray(payload?.visits) ? payload.visits : null) ||
    (Array.isArray(payload?.rounds) ? payload.rounds : null) ||
    null;

  if (Array.isArray(turns) && turns.length) {
    const out: any[] = [];
    for (const t of turns) {
      const tPid = str(t?.playerId || t?.pid || t?.profileId || t?.id || "");
      if (pid && tPid && pid !== tPid) continue;

      const darts =
        (Array.isArray(t?.darts) ? t.darts : null) ||
        (Array.isArray(t?.throws) ? t.throws : null) ||
        (Array.isArray(t?.hits) ? t.hits : null) ||
        (Array.isArray(t?.events) ? t.events : null) ||
        null;

      if (Array.isArray(darts) && darts.length) out.push(...darts);
    }
    if (out.length) return out;
  }

  return [];
}

function normalizeHits(rawHits: any[]): any[] {
  if (!Array.isArray(rawHits) || !rawHits.length) return [];

  const out: any[] = [];

  for (const h of rawHits) {
    if (!h) continue;

    if (typeof h === "object") {
      const target = (h as any).target ?? (h as any).number ?? null;
      const mult = (h as any).mult ?? (h as any).multiplier ?? null;
      if (typeof target === "number" && typeof mult === "number") {
        out.push({ target, mult });
        continue;
      }

      const seg =
        (h as any).segment ??
        (h as any).bed ??
        (h as any).label ??
        (h as any).code ??
        (h as any).text ??
        (h as any).s ??
        null;

      const parsed = parseSegment(seg);
      if (parsed) out.push(parsed);
      continue;
    }

    const parsed = parseSegment(h);
    if (parsed) out.push(parsed);
  }

  return out;
}

/* -------------------------------------------
   Hook
------------------------------------------- */
export function useCricketStats() {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [statsByProfile, setStatsByProfile] = React.useState<StateByProfile>({});

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      try {
        const all: SavedMatch[] = await History.listFinished();

        // Quick prefilter: cricket-ish rows
        const maybeCricket = (all || []).filter((m: any) => {
          const status = lower(m?.status);
          if (status && status !== "finished") return false;
          return isCricketRowQuick(m);
        });

        const legsByProfile: Record<string, { name?: string; legs: CricketLegStats[] }> = {};

        for (const row of maybeCricket) {
          const full = await History.get((row as any).id);
          const rawPayload =
            (full as any)?.payload ??
            (row as any)?.payload ??
            null;

          const payload = await decodeMaybe(rawPayload);
          if (!payload || typeof payload !== "object") continue;

          if (!confirmCricketFromPayload(payload, row)) continue;

          const players = pickPlayers(payload, row);

          for (const p of players) {
            const pid = getPid(p);
            if (!pid) continue;

            // prefer precomputed legStats if present
            const existingLegStats =
              (p as any).legStats && typeof (p as any).legStats === "object"
                ? ((p as any).legStats as CricketLegStats)
                : null;

            let legStats: CricketLegStats;

            if (existingLegStats) {
              legStats = existingLegStats;
            } else {
              const rawHits = extractHitsForPlayer(p, payload);
              const hits = normalizeHits(rawHits);
              legStats = computeCricketLegStats(hits);
            }

            if (!legsByProfile[pid]) {
              legsByProfile[pid] = { name: getPname(p), legs: [] };
            }
            if (!legsByProfile[pid].name) legsByProfile[pid].name = getPname(p);
            legsByProfile[pid].legs.push(legStats);
          }
        }

        const out: StateByProfile = {};
        for (const [pid, bucket] of Object.entries(legsByProfile)) {
          const agg = aggregateCricketMatches(bucket.legs);
          out[pid] = {
            ...agg,
            profileId: pid,
            profileName: bucket.name,
          };
        }

        if (!cancelled) {
          setStatsByProfile(out);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error("Cricket stats error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    // refresh if history changes (history.ts dispatches dc-history-updated)
    const onUpd = () => void run();
    if (typeof window !== "undefined") {
      window.addEventListener("dc-history-updated", onUpd);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("dc-history-updated", onUpd);
      }
    };
  }, []);

  const getForProfile = React.useCallback(
    (profileId?: string | null) => {
      if (!profileId) {
        const first = Object.values(statsByProfile)[0];
        return first ?? null;
      }
      return statsByProfile[String(profileId)] ?? null;
    },
    [statsByProfile]
  );

  return { loading, error, statsByProfile, getForProfile };
}

// Petit hook pratique, pour un seul profil
export function useCricketStatsForProfile(profileId?: string | null) {
  const { loading, error, getForProfile } = useCricketStats();
  const stats = getForProfile(profileId ?? undefined);
  return { loading, error, stats };
}
