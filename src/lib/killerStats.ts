// @ts-nocheck
// ============================================
// src/lib/killerStats.ts
// Helpers "rows" pour UI (StatsKillerPanel / listes / etc.)
// ✅ SOURCE UNIQUE : computeKillerStatsAggForProfile() depuis statsKiller.ts
// - Support période D/W/M/Y/ALL/TOUT
// - Retourne des rows par profil : matches/wins/winRate/kills/darts/favs
// ============================================

import type { Profile } from "./types";
import { computeKillerStatsAggForProfile } from "./statsKiller";

export type PeriodKey = "D" | "W" | "M" | "Y" | "ALL" | "TOUT";

export type KillerRow = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;

  matches: number;
  wins: number;
  winRate: number; // 0..100

  kills: number;
  killsAvg: number;

  darts: number;
  dartsAvg: number;

  deaths: number;
  deathsAvg: number;

  favSegment: string | null;
  favNumber: string | null;

  lastPlayedAt: number | null;
};

function numOr0(...values: any[]): number {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function safeArr(a: any) {
  return Array.isArray(a) ? a : [];
}

function safeStr(v: any) {
  if (v === undefined || v === null) return "";
  return String(v);
}

function isKillerRecord(rec: any) {
  const kind = rec?.kind || rec?.summary?.kind || rec?.payload?.kind;
  const mode = rec?.mode || rec?.summary?.mode || rec?.payload?.mode || rec?.payload?.summary?.mode;
  return kind === "killer" || mode === "killer";
}

function periodToMs(p: PeriodKey): number {
  const day = 24 * 60 * 60 * 1000;
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
    case "TOUT":
    default:
      return 0;
  }
}

function getRecTimestamp(rec: any): number {
  return (
    numOr0(
      rec?.updatedAt,
      rec?.finishedAt,
      rec?.createdAt,
      rec?.ts,
      rec?.date,
      rec?.summary?.updatedAt,
      rec?.summary?.finishedAt,
      rec?.summary?.createdAt,
      rec?.payload?.updatedAt,
      rec?.payload?.createdAt,
      rec?.payload?.ts,
      rec?.payload?.summary?.updatedAt,
      rec?.payload?.summary?.finishedAt
    ) || 0
  );
}

function inPeriod(rec: any, period: PeriodKey): boolean {
  if (period === "ALL" || period === "TOUT") return true;
  const dt = getRecTimestamp(rec);
  if (!dt) return true; // si pas de date fiable, on conserve
  const span = periodToMs(period);
  if (!span) return true;
  return Date.now() - dt <= span;
}

function pickAvatarFromProfile(p: any): string | null {
  return (p?.avatarDataUrl ?? p?.avatar ?? p?.photoDataUrl ?? p?.photo ?? null) as any;
}

// ✅ (optionnel mais utile) : bots storage pour nom/avatar si profils incomplets
function loadBotsMap(): Record<string, { avatarDataUrl?: string | null; name?: string }> {
  try {
    const raw = localStorage.getItem("dc_bots_v1");
    if (!raw) return {};
    const bots = JSON.parse(raw);
    const map: Record<string, any> = {};
    for (const b of bots || []) {
      if (!b?.id) continue;
      map[b.id] = {
        avatarDataUrl: b.avatarDataUrl ?? null,
        name: b.name,
      };
    }
    return map;
  } catch {
    return {};
  }
}

export function computeKillerRows(
  records: any[],
  profiles: Profile[],
  period: PeriodKey = "ALL"
): KillerRow[] {
  const listAll = safeArr(records).filter((r) => isKillerRecord(r));
  const list = listAll.filter((r) => inPeriod(r, period));

  const botsMap = loadBotsMap();

  // si profiles vide, on tente de deviner des participants via historiques (fallback)
  const profileList: any[] = Array.isArray(profiles) && profiles.length ? profiles : [];

  const rows: KillerRow[] = [];

  for (const p of profileList) {
    const pid = safeStr(p?.id);
    if (!pid) continue;

    const agg = computeKillerStatsAggForProfile(list, pid);

    // on n'affiche que si au moins 1 match (sinon panel affiche "aucune partie")
    if (!agg || !agg.totalMatches) continue;

    const botFallback = botsMap?.[pid] || {};

    rows.push({
      id: pid,
      name: p?.name || botFallback?.name || "—",
      avatarDataUrl: pickAvatarFromProfile(p) || botFallback?.avatarDataUrl || null,

      matches: agg.totalMatches,
      wins: agg.wins,
      winRate: (agg.winRate || 0) * 100,

      kills: agg.totalKills || 0,
      killsAvg: agg.avgKills || 0,

      darts: agg.totalDarts || 0,
      dartsAvg: agg.avgDarts || 0,

      deaths: agg.deaths || 0,
      deathsAvg: agg.avgDeaths || 0,

      favSegment: agg.favSegment ?? null,
      favNumber: agg.favNumber ?? null,

      lastPlayedAt: agg.lastPlayedAt ?? null,
    });
  }

  // fallback ultime si aucun profil seed : on tente de construire des "rows" depuis perPlayer
  if (!rows.length && list.length) {
    const byId: Record<string, any> = {};
    for (const rec of list) {
      const per = safeArr(rec?.summary?.perPlayer || rec?.payload?.summary?.perPlayer);
      for (const pp of per) {
        const pid = safeStr(pp?.playerId || pp?.profileId || pp?.id);
        if (!pid) continue;
        byId[pid] = byId[pid] || { id: pid, name: pp?.name, avatarDataUrl: pp?.avatarDataUrl };
      }
    }
    for (const pid of Object.keys(byId)) {
      const agg = computeKillerStatsAggForProfile(list, pid);
      if (!agg || !agg.totalMatches) continue;
      rows.push({
        id: pid,
        name: byId[pid]?.name || botsMap?.[pid]?.name || "—",
        avatarDataUrl: byId[pid]?.avatarDataUrl || botsMap?.[pid]?.avatarDataUrl || null,

        matches: agg.totalMatches,
        wins: agg.wins,
        winRate: (agg.winRate || 0) * 100,

        kills: agg.totalKills || 0,
        killsAvg: agg.avgKills || 0,

        darts: agg.totalDarts || 0,
        dartsAvg: agg.avgDarts || 0,

        deaths: agg.deaths || 0,
        deathsAvg: agg.avgDeaths || 0,

        favSegment: agg.favSegment ?? null,
        favNumber: agg.favNumber ?? null,

        lastPlayedAt: agg.lastPlayedAt ?? null,
      });
    }
  }

  // tri par matches desc, puis winRate desc
  rows.sort((a, b) => {
    if (b.matches !== a.matches) return b.matches - a.matches;
    return b.winRate - a.winRate;
  });

  return rows;
}
