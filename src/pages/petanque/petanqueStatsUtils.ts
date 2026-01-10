// @ts-nocheck
// =============================================================
// src/pages/petanque/petanqueStatsUtils.ts
// Helpers robustes : filtre records pétanque + extract score/teams/players
// =============================================================

export type PeriodKey = "D" | "W" | "M" | "Y" | "ALL";

const day = 24 * 60 * 60 * 1000;

export function periodToMs(p: PeriodKey) {
  switch (p) {
    case "D":
      return day;
    case "W":
      return 7 * day;
    case "M":
      return 31 * day;
    case "Y":
      return 366 * day;
    case "ALL":
    default:
      return 0;
  }
}

export function numOr0(...values: any[]) {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function getRecTimestamp(rec: any): number {
  return (
    numOr0(
      rec?.updatedAt,
      rec?.createdAt,
      rec?.ts,
      rec?.date,
      rec?.payload?.updatedAt,
      rec?.payload?.createdAt,
      rec?.payload?.ts,
      rec?.payload?.summary?.finishedAt,
      rec?.summary?.finishedAt
    ) || 0
  );
}

export function inPeriod(rec: any, period: PeriodKey): boolean {
  if (period === "ALL") return true;
  const dt = getRecTimestamp(rec);
  if (!dt) return true;
  const span = periodToMs(period);
  if (!span) return true;
  return Date.now() - dt <= span;
}

function lower(s: any) {
  return String(s ?? "").toLowerCase();
}

export function isPetanqueRec(rec: any): boolean {
  const k = lower(rec?.kind);
  const m1 = lower(rec?.payload?.mode);
  const m2 = lower(rec?.payload?.cfg?.mode);
  const m3 = lower(rec?.payload?.config?.mode);
  const m4 = lower(rec?.summary?.mode);
  return k.includes("petanque") || m1.includes("petanque") || m2.includes("petanque") || m3.includes("petanque") || m4.includes("petanque");
}

export function cleanName(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s === "—" || s === "-" || s.toLowerCase() === "undefined" || s.toLowerCase() === "null") return "";
  return s;
}

export function pickAvatar(obj: any): string | null {
  if (!obj) return null;
  const v =
    obj.avatarDataUrl ||
    obj.avatar_data_url ||
    obj.avatar ||
    obj.avatarUrl ||
    obj.avatarURL ||
    obj.photoDataUrl ||
    obj.photo ||
    null;
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "undefined" || s.toLowerCase() === "null") return null;
  return s;
}

export function getPlayers(rec: any): any[] {
  const a = Array.isArray(rec?.players) ? rec.players : [];
  const b = Array.isArray(rec?.payload?.players) ? rec.payload.players : [];
  return a.length ? a : b;
}

// Extraction “meilleure effort” score A/B
export function getScoreAB(rec: any): { scoreA: number; scoreB: number } {
  const p = rec?.payload || {};
  const s = p?.state || p?.st || p?.match || {};
  const t = p?.teams || p?.team || {};

  const scoreA = numOr0(
    p?.scoreA,
    p?.score?.A,
    p?.scores?.A,
    s?.scoreA,
    s?.score?.A,
    t?.A?.score,
    t?.a?.score,
    p?.A?.score
  );

  const scoreB = numOr0(
    p?.scoreB,
    p?.score?.B,
    p?.scores?.B,
    s?.scoreB,
    s?.score?.B,
    t?.B?.score,
    t?.b?.score,
    p?.B?.score
  );

  return { scoreA, scoreB };
}

// Extraction équipes (ids/noms) tolérante
export function getTeams(rec: any): {
  mode: "teams" | "ffa";
  teamA: any[];
  teamB: any[];
  ffa: any[];
} {
  const p = rec?.payload || {};
  const cfgMode = String(p?.cfg?.mode ?? p?.mode ?? "").toLowerCase();

  const players = getPlayers(rec);
  const ffa = cfgMode.includes("ffa") ? players : [];

  if (ffa.length) return { mode: "ffa", teamA: [], teamB: [], ffa };

  const t = p?.teams || p?.team || {};
  const teamA =
    (Array.isArray(t?.A?.players) && t.A.players) ||
    (Array.isArray(t?.a?.players) && t.a.players) ||
    (Array.isArray(p?.teamA?.players) && p.teamA.players) ||
    (Array.isArray(p?.A?.players) && p.A.players) ||
    [];

  const teamB =
    (Array.isArray(t?.B?.players) && t.B.players) ||
    (Array.isArray(t?.b?.players) && t.b.players) ||
    (Array.isArray(p?.teamB?.players) && p.teamB.players) ||
    (Array.isArray(p?.B?.players) && p.B.players) ||
    [];

  if (teamA.length || teamB.length) return { mode: "teams", teamA, teamB, ffa: [] };

  // fallback : split players
  if (players.length === 2) return { mode: "teams", teamA: [players[0]], teamB: [players[1]], ffa: [] };
  if (players.length === 4) return { mode: "teams", teamA: [players[0], players[1]], teamB: [players[2], players[3]], ffa: [] };

  // sinon : pas exploitable => on met tout en “ffa” pour ne rien casser
  return { mode: "ffa", teamA: [], teamB: [], ffa: players };
}

export function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}