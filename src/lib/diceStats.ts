// =============================================================
// src/lib/diceStats.ts
// Helpers STATS DICE (LOCAL) — extraction robuste depuis store.history
// Objectif: alimenter les pages Stats Dice avec un rendu identique Darts.
// =============================================================

export type DiceMatch = {
  id?: string;
  createdAt?: number;
  updatedAt?: number;
  kind?: string;
  sport?: string;
  winnerId?: string | null;
  players?: Array<{ id?: string; name?: string; avatarDataUrl?: string | null }>;
  payload?: any;
  summary?: any;
};

export type DicePlayerAgg = {
  name: string;
  matches: number;
  wins: number;
  winrate: number;      // 0..1

  // ✅ Dice-native metrics
  avgScore: number;     // moyenne score fin de match
  bestScore: number;    // meilleur score fin de match
  avgDurationMs: number;
  setsWon: number;

  // ✅ Aliases pour réutiliser le layout des pages Stats (issues de Mölkky)
  // (permet de garder un rendu identique sans dupliquer 2000 lignes de JSX)
  avgPtsPerThrow: number; // alias -> avgScore
  avgTurns: number;       // alias -> setsWon
  bestTurns: number;      // alias -> bestScore
  fastestMs: number;      // alias -> avgDurationMs (fallback)
  exact50: number;        // N/A Dice (0)
  over50: number;         // N/A Dice (0)
};

export function safeNum(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function safeStr(v: any, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function formatDuration(ms: number): string {
  const m = Math.max(0, safeNum(ms, 0));
  if (!m) return "—";
  const s = Math.round(m / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return mm > 0 ? `${mm}m ${ss.toString().padStart(2, "0")}s` : `${ss}s`;
}

export function formatDateShort(ts?: number): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const dd = d.getDate().toString().padStart(2, "0");
    const mo = (d.getMonth() + 1).toString().padStart(2, "0");
    const yy = d.getFullYear().toString().slice(-2);
    return `${dd}/${mo}/${yy}`;
  } catch {
    return "";
  }
}

function isDiceRow(r: any): boolean {
  const kind = r?.kind ?? r?.payload?.kind;
  const sport = r?.sport ?? r?.payload?.sport ?? r?.payload?.stats?.sport;
  return kind === "dicegame" || sport === "dicegame";
}

export function getDiceMatches(history: any[]): DiceMatch[] {
  const list = Array.isArray(history) ? history : [];
  return list.filter(isDiceRow);
}

export function getMatchPlayers(m: any): string[] {
  const players = m?.players ?? m?.payload?.players ?? [];
  const names = (players || []).map((p: any) => safeStr(p?.name, "")).filter(Boolean);
  return names.length ? names : [];
}

export function getWinnerName(m: any): string {
  const wid = m?.winnerId ?? m?.payload?.winnerId ?? null;
  const players = m?.players ?? m?.payload?.players ?? [];
  const p = (players || []).find((x: any) => x?.id === wid);
  return safeStr(p?.name, "");
}

export function getDurationMs(m: any): number {
  const createdAt = safeNum(m?.createdAt ?? m?.payload?.createdAt, 0);
  const finishedAt = safeNum(m?.finishedAt ?? m?.payload?.finishedAt, 0);
  if (createdAt && finishedAt && finishedAt >= createdAt) return finishedAt - createdAt;
  return safeNum(m?.summary?.durationMs ?? m?.payload?.summary?.durationMs ?? m?.payload?.stats?.global?.duration, 0);
}

function getPlayerScoreFromMatch(m: any, playerName: string): number {
  const players = m?.payload?.players ?? m?.players ?? [];
  const p = (players || []).find((x: any) => safeStr(x?.name, "") === playerName);
  return safeNum(p?.score ?? p?.finalScore ?? 0, 0);
}

function getPlayerSetsWonFromMatch(m: any, playerName: string): number {
  const players = m?.payload?.players ?? m?.players ?? [];
  const p = (players || []).find((x: any) => safeStr(x?.name, "") === playerName);
  return safeNum(p?.setsWon ?? 0, 0);
}

export function aggregatePlayers(history: any[]): DicePlayerAgg[] {
  const matches = getDiceMatches(history);
  const map = new Map<string, any>();

  for (const m of matches) {
    const players = getMatchPlayers(m);
    const winner = getWinnerName(m);
    const dur = getDurationMs(m);

    for (const name of players.length ? players : [winner || "—"]) {
      const key = name || "—";
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          matches: 0,
          wins: 0,
          sumScore: 0,
          bestScore: 0,
          sumDur: 0,
          setsWon: 0,
        });
      }
      const row = map.get(key);
      row.matches += 1;
      if (winner && key === winner) row.wins += 1;

      const sc = getPlayerScoreFromMatch(m, key);
      row.sumScore += sc;
      row.bestScore = row.bestScore ? Math.max(row.bestScore, sc) : sc;

      if (dur > 0) row.sumDur += dur;

      row.setsWon += getPlayerSetsWonFromMatch(m, key);
    }
  }

  const out: DicePlayerAgg[] = Array.from(map.values()).map((r: any) => {
    const matches = r.matches || 0;
    const wins = r.wins || 0;
    const avgScore = matches ? (r.sumScore || 0) / matches : 0;
    const bestScore = r.bestScore || 0;
    const avgDurationMs = matches ? (r.sumDur || 0) / matches : 0;
    const setsWon = r.setsWon || 0;
    return {
      name: r.name,
      matches,
      wins,
      winrate: matches ? wins / matches : 0,
      avgScore,
      bestScore,
      avgDurationMs,
      setsWon,
      // aliases
      avgPtsPerThrow: avgScore,
      avgTurns: setsWon,
      bestTurns: bestScore,
      fastestMs: avgDurationMs,
      exact50: 0,
      over50: 0,
    };
  });

  out.sort((a, b) => (b.matches - a.matches) || (b.wins - a.wins) || a.name.localeCompare(b.name));
  return out;
}

export function computeDiceSummary(history: any[]) {
  const matches = getDiceMatches(history);
  const total = matches.length;

  const players = aggregatePlayers(history);
  const last = matches
    .slice()
    .sort((a: any, b: any) => (safeNum(b.updatedAt ?? b.createdAt, 0) - safeNum(a.updatedAt ?? a.createdAt, 0)))[0];

  const avgDur = total ? Math.round(matches.reduce((s: number, m: any) => s + getDurationMs(m), 0) / total) : 0;

  return {
    totalMatches: total,
    totalPlayers: players.length,
    avgDurationMs: avgDur,
    lastMatchAt: safeNum(last?.updatedAt ?? last?.createdAt, 0),
  };
}
