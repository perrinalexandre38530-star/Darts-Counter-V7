// =============================================================
// src/lib/molkkyStats.ts
// Helpers STATS MÖLKKY (LOCAL) — robust extraction depuis store.history
// Objectif: alimenter les pages Stats Mölkky avec un rendu identique Darts.
// =============================================================

import { loadMolkkyHistory } from "./molkkyStatsStore";

export type MolkkyMatch = {
  id?: string;
  createdAt?: number;
  updatedAt?: number;
  summary: any;
  payload?: any;
  raw: any;
};

export function safeName(x: any) {
  const s = String(x ?? "").trim();
  return s || "—";
}

export function isMolkkyRow(r: any) {
  const k = (r?.sport || r?.kind || "").toString().toLowerCase();
  return k === "molkky";
}

export function getMolkkyMatches(history: any[]): MolkkyMatch[] {
  // ✅ Source of truth: V2 store (FULL state) if present
  let v2: any[] = [];
  try {
    v2 = loadMolkkyHistory() as any[];
  } catch {
    v2 = [];
  }

  if (Array.isArray(v2) && v2.length > 0) {
    return v2.map((e: any) => {
      const summary = e?.summary || {};
      const payload = { ...(e?.payload || {}), state: e?.state ?? null };
      return {
        id: e?.id,
        createdAt: Number(e?.createdAt || 0) || 0,
        updatedAt: Number(e?.updatedAt || e?.createdAt || 0) || 0,
        summary,
        payload,
        raw: e,
      } as MolkkyMatch;
    });
  }

  // 🔁 Fallback: legacy store.history (summary-only)
  const rows = Array.isArray(history) ? history : [];
  const games = rows.filter(isMolkkyRow);
  return games.map((g: any) => {
    const summary = g?.summary || g?.payload?.summary || {};
    const payload = g?.payload || {};
    return {
      id: g?.id || g?.matchId || g?.payload?.matchId,
      createdAt: Number(g?.createdAt || g?.payload?.createdAt || 0) || 0,
      updatedAt: Number(g?.updatedAt || g?.payload?.updatedAt || 0) || 0,
      summary,
      payload,
      raw: g,
    } as MolkkyMatch;
  });
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export function getMatchPlayers(m: MolkkyMatch): string[] {
  const s = m?.summary || {};
  const p = m?.payload || {};
  // cas 1: summary.players = [{name}]
  const a = Array.isArray(s?.players) ? s.players : Array.isArray(p?.players) ? p.players : null;
  if (a) {
    const names = a.map((x: any) => safeName(x?.name || x?.playerName || x?.label));
    return uniq(names);
  }
  // cas 2: summary.playerNames = string[]
  if (Array.isArray(s?.playerNames)) return uniq(s.playerNames.map(safeName));
  // cas 3: winnerName + others
  const names: string[] = [];
  const w = safeName(s?.winnerName || s?.winner || p?.winnerName);
  if (w && w !== "—") names.push(w);
  const losers = Array.isArray(s?.losers) ? s.losers : Array.isArray(s?.loserNames) ? s.loserNames : null;
  if (losers) names.push(...losers.map(safeName));
  return uniq(names);
}

export function getWinnerName(m: MolkkyMatch) {
  const s = m?.summary || {};
  const p = m?.payload || {};
  const w = safeName(s?.winnerName || s?.winner || p?.winnerName || p?.winner);
  return w === "—" ? "" : w;
}

export function getTurns(m: MolkkyMatch) {
  // Prefer FULL state (turns[])
  const st = (m as any)?.payload?.state;
  if (st && Array.isArray(st?.turns)) return st.turns.length;

  const s = m?.summary || {};
  const v = Number(s?.turns ?? s?.rounds ?? s?.nbTurns ?? 0) || 0;
  return v;
}

export function getDurationMs(m: MolkkyMatch) {
  const st = (m as any)?.payload?.state;
  // engine typically stores startedAt/finishedAt or createdAt/finishedAt
  const a = Number(st?.startedAt ?? st?.createdAt ?? 0) || 0;
  const b = Number(st?.finishedAt ?? 0) || 0;
  if (a && b && b >= a) return b - a;

  const s = m?.summary || {};
  const v = Number(s?.durationMs ?? s?.duration ?? 0) || 0;
  return v;
}

// Moyenne "pts / lancer" si dispo dans summary, sinon approx "50/turns" (fallback visuel)
export function getAvgPtsPerThrow(m: MolkkyMatch) {
  const s = m?.summary || {};
  const v = Number(s?.avgPtsPerThrow ?? s?.avgPts ?? s?.avg ?? 0);
  if (Number.isFinite(v) && v > 0) return v;
  const turns = getTurns(m);
  if (turns > 0) return 50 / (turns * 1.0); // fallback neutre
  return 0;
}

export function getExact50Count(m: MolkkyMatch) {
  const s = m?.summary || {};
  const v = Number(s?.exact50Count ?? s?.exact50 ?? 0) || 0;
  return v;
}

export function getOver50Count(m: MolkkyMatch) {
  const s = m?.summary || {};
  const v = Number(s?.over50Count ?? s?.over50 ?? s?.overs ?? 0) || 0;
  return v;
}

export type MolkkyPlayerAgg = {
  name: string;
  matches: number;
  wins: number;
  winrate: number;
  avgPtsPerThrow: number;
  avgTurns: number;
  bestTurns: number; // min
  fastestMs: number; // min
  exact50: number;
  over50: number;
};

export function aggregatePlayers(history: any[]): MolkkyPlayerAgg[] {
  const matches = getMolkkyMatches(history);
  const map = new Map<string, any>();

  for (const m of matches) {
    const players = getMatchPlayers(m);
    const winner = getWinnerName(m);
    const turns = getTurns(m);
    const dur = getDurationMs(m);
    const avg = getAvgPtsPerThrow(m);
    const ex50 = getExact50Count(m);
    const over = getOver50Count(m);

    for (const name of players.length ? players : [winner || "—"]) {
      const key = safeName(name);
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          matches: 0,
          wins: 0,
          sumAvg: 0,
          sumTurns: 0,
          bestTurns: 0,
          fastestMs: 0,
          exact50: 0,
          over50: 0,
        });
      }
      const row = map.get(key);
      row.matches += 1;
      if (winner && key === winner) row.wins += 1;

      if (avg > 0) row.sumAvg += avg;
      if (turns > 0) row.sumTurns += turns;
      if (turns > 0) row.bestTurns = row.bestTurns ? Math.min(row.bestTurns, turns) : turns;
      if (dur > 0) row.fastestMs = row.fastestMs ? Math.min(row.fastestMs, dur) : dur;

      row.exact50 += ex50;
      row.over50 += over;
    }
  }

  const out: MolkkyPlayerAgg[] = Array.from(map.values()).map((r: any) => {
    const matches = r.matches || 0;
    const wins = r.wins || 0;
    const winrate = matches > 0 ? wins / matches : 0;
    const avgPtsPerThrow = matches > 0 ? (r.sumAvg || 0) / matches : 0;
    const avgTurns = matches > 0 ? (r.sumTurns || 0) / matches : 0;
    return {
      name: r.name,
      matches,
      wins,
      winrate,
      avgPtsPerThrow,
      avgTurns,
      bestTurns: r.bestTurns || 0,
      fastestMs: r.fastestMs || 0,
      exact50: r.exact50 || 0,
      over50: r.over50 || 0,
    };
  });

  // ordre par matchs desc puis wins
  out.sort((a, b) => (b.matches - a.matches) || (b.wins - a.wins) || a.name.localeCompare(b.name));
  return out;
}

export function computeMolkkySummary(history: any[]) {
  const matches = getMolkkyMatches(history);
  const total = matches.length;

  const players = aggregatePlayers(history);
  const last = matches
    .slice()
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))[0];

  const avgDur = total ? Math.round(matches.reduce((s, m) => s + getDurationMs(m), 0) / total) : 0;
  const avgTurns = total ? Math.round((matches.reduce((s, m) => s + getTurns(m), 0) / total) * 10) / 10 : 0;

  return {
    totalMatches: total,
    avgDurationMs: avgDur,
    avgTurns,
    lastWinner: last ? getWinnerName(last) : "",
    players,
  };
}

// ============================================================
// Helpers UI (consumed by stats pages)
// ============================================================

/** Safely coerce any value to a finite number (fallback=0). */
export function safeNum(v: any, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Format a duration in ms to H:MM:SS or M:SS. */
export function formatDuration(ms: any): string {
  const totalMs = safeNum(ms, 0);
  const totalSec = Math.max(0, Math.round(totalMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}


export function formatDateShort(v: any): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    // Fallback (YYYY-MM-DD)
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${dd}/${mm}/${yy}`;
  }
}
