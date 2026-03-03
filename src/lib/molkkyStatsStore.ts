// @ts-nocheck
// ============================================
// src/lib/molkkyStatsStore.ts
// ✅ LOCAL history persistence for Mölkky (V2)
// - We store FULL state (turns[]) + derived summary
// - Backward compatible: if legacy V1 exists (dc_molkky_history_v1), we import it once (summary-only).
// ============================================

import type { MolkkyState } from "../pages/molkky/engine/molkkyEngine";

export type MolkkyHistoryEntry = {
  id: string;
  sport: "molkky";
  mode?: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  finished: boolean;
  inProgress: boolean;
  state?: MolkkyState | null; // can be null for migrated legacy rows
  summary: any;
  // keep raw legacy fields if any
  legacy?: any;
};

const LS_V2 = "dc_molkky_history_v2";
const LS_V1 = "dc_molkky_history_v1";
const LS_MIGRATED = "dc_molkky_history_v1_migrated_to_v2";

function safeParse(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isEntryV2(x: any): x is MolkkyHistoryEntry {
  return x && typeof x === "object" && (x.sport === "molkky" || x.kind === "molkky") && typeof x.id === "string" && x.summary;
}

function legacyV1ToV2(rows: any[]): MolkkyHistoryEntry[] {
  const out: MolkkyHistoryEntry[] = [];
  const arr = Array.isArray(rows) ? rows : [];
  for (const r of arr) {
    const id = String(r?.matchId || r?.id || `molkky-legacy-${Math.random().toString(36).slice(2, 8)}`);
    const ts = new Date(r?.date || Date.now()).getTime();
    const winnerId = String(r?.winnerId || "");
    const players = Array.isArray(r?.players) ? r.players : [];
    const summary = {
      title: "Mölkky",
      winnerPlayerId: winnerId || null,
      winnerName: winnerId || "",
      players: players.map((p: any) => ({ playerId: String(p?.playerId || ""), name: String(p?.playerId || "") })),
      turns: 0,
      durationMs: 0,
    };
    out.push({
      id,
      sport: "molkky",
      mode: "legacy",
      createdAt: ts || Date.now(),
      updatedAt: ts || Date.now(),
      finished: true,
      inProgress: false,
      state: null,
      summary,
      legacy: r,
    });
  }
  return out;
}

function ensureMigratedOnce() {
  try {
    const migrated = localStorage.getItem(LS_MIGRATED);
    if (migrated === "1") return;

    const v2Raw = localStorage.getItem(LS_V2);
    const v2Parsed = safeParse(v2Raw);
    const v2Has = Array.isArray(v2Parsed) && v2Parsed.length > 0;

    const v1Raw = localStorage.getItem(LS_V1);
    const v1Parsed = safeParse(v1Raw);
    const v1Has = Array.isArray(v1Parsed) && v1Parsed.length > 0;

    if (!v2Has && v1Has) {
      const converted = legacyV1ToV2(v1Parsed);
      localStorage.setItem(LS_V2, JSON.stringify(converted));
    }

    localStorage.setItem(LS_MIGRATED, "1");
  } catch {
    // ignore
  }
}

export function loadMolkkyHistory(): MolkkyHistoryEntry[] {
  ensureMigratedOnce();
  const parsed = safeParse(localStorage.getItem(LS_V2));
  const arr = Array.isArray(parsed) ? parsed : [];
  return arr
    .map((x: any) => {
      if (isEntryV2(x)) {
        return {
          id: String(x.id),
          sport: "molkky",
          mode: x.mode || "classic",
          createdAt: Number(x.createdAt || 0) || 0,
          updatedAt: Number(x.updatedAt || x.createdAt || 0) || 0,
          finished: Boolean(x.finished),
          inProgress: Boolean(x.inProgress),
          state: x.state ?? null,
          summary: x.summary || {},
          legacy: x.legacy,
        } as MolkkyHistoryEntry;
      }
      // unknown row -> drop
      return null;
    })
    .filter(Boolean) as MolkkyHistoryEntry[];
}

export function getMolkkyHistoryEntry(id: string): MolkkyHistoryEntry | null {
  const all = loadMolkkyHistory();
  const x = all.find((e) => String(e.id) === String(id));
  return x || null;
}

// Upsert (by id)
export function saveMolkkyHistoryEntry(entry: MolkkyHistoryEntry) {
  const e = entry as any;
  if (!e?.id) return;

  const all = loadMolkkyHistory();
  const id = String(e.id);
  const idx = all.findIndex((x) => String(x.id) === id);

  const now = Date.now();
  const next: MolkkyHistoryEntry = {
    id,
    sport: "molkky",
    mode: e.mode || "classic",
    createdAt: Number(e.createdAt || now) || now,
    updatedAt: Number(e.updatedAt || now) || now,
    finished: Boolean(e.finished),
    inProgress: Boolean(e.inProgress),
    state: e.state ?? null,
    summary: e.summary || {},
    legacy: e.legacy,
  };

  if (idx >= 0) all[idx] = next;
  else all.push(next);

  // keep chronological order by createdAt
  all.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  localStorage.setItem(LS_V2, JSON.stringify(all));
}

// Replace entirely
export function saveMolkkyHistory(history: MolkkyHistoryEntry[]) {
  const arr = Array.isArray(history) ? history : [];
  const safe = arr.filter((x) => x && x.id && (x.sport === "molkky" || x.kind === "molkky"));
  localStorage.setItem(LS_V2, JSON.stringify(safe));
}

export function clearMolkkyHistory() {
  localStorage.removeItem(LS_V2);
}

// Legacy helper (kept for compatibility with older code)
export function saveMolkkyMatchStats(match: any) {
  // Previously appended a V1 summary-only row; now we upsert as finished summary-only row.
  const id = String(match?.matchId || match?.id || `molkky-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const ts = new Date(match?.date || Date.now()).getTime();
  saveMolkkyHistoryEntry({
    id,
    sport: "molkky",
    mode: "legacy",
    createdAt: ts || Date.now(),
    updatedAt: ts || Date.now(),
    finished: true,
    inProgress: false,
    state: null,
    summary: match?.summary || {
      title: "Mölkky",
      winnerPlayerId: match?.winnerId || null,
      players: (match?.players || []).map((p: any) => ({ playerId: p?.playerId, name: p?.playerId })),
    },
    legacy: match,
  } as any);
}
