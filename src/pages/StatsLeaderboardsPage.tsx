// @ts-nocheck
// =============================================================
// src/pages/StatsLeaderboardsPage.tsx
// Page CLASSEMENTS globale (tous profils)
// - Agrège store.history + IDB History
// - Robust: supporte multiples formats de summary (V1/V2/V3)
// - Avatars: récup depuis profiles OU history.players OU summary
// - + BotsMap: récup avatars/noms depuis localStorage dc_bots_v1
// - Metrics: wins / matches / winRate / avg3 / bestVisit / bestCheckout
// - ✅ NEW (KILLER Option A): kills / favNumberHits / favSegmentHits / totalHits
// - Filtre période D/W/M/Y/ALL/TOUT
// - ✅ Fix: pas de rows fantômes (nom/avatar vides) -> on filtre strict
// - ✅ NEW: Toggle "BOTS: ON/OFF" (par défaut ON) + OFF exclut vraiment les bots
// - ✅ Fix: plus de "isDisplayableRow" manquante, plus de crash
// =============================================================

import * as React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import { History } from "../lib/history";
import { loadTerritoriesHistory, type TerritoriesMatch } from "../lib/territories/territoriesStats";
// Optionnel (si tu l’as dans ton projet). On n’en dépend pas pour éviter de casser.
import { computeKillerAgg } from "../lib/statsKillerAgg";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type Scope = "local" | "online";

type LeaderboardMode =
  | "x01_multi"
  | "cricket"
  | "killer"
  | "shanghai"
  | "battle_royale"
  | "clock"
  | "territories";

type PeriodKey = "D" | "W" | "M" | "Y" | "ALL" | "TOUT";

type MetricKey =
  | "wins"
  | "winRate"
  | "matches"
  | "avg3"
  | "bestVisit"
  | "bestCheckout"
  // ✅ NEW (killer option A)
  | "kills"
  | "favNumberHits"
  | "favSegmentHits"
  | "totalHits"
  // ✅ NEW (territories)
  | "captures"
  | "avgDom"
  | "avgRounds"
  | "capPerRound";

type Row = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;

  wins: number;
  losses: number;
  matches: number;
  winRate: number;

  // ✅ TERRITORIES
  captures: number;
  avgDom: number;
  avgRounds: number;
  capPerRound: number;

  avg3: number;
  bestVisit: number;
  bestCheckout: number;

  // ✅ NEW
  kills: number;
  favNumber: number; // 0 si inconnu, sinon 1..20 ou 25
  favNumberHits: number;
  favSegment: string; // "S20" / "T8" / "DB" ...
  favSegmentHits: number;
  totalHits: number;

  // ✅ BATARD sums
  batardPoints: number;
  batardDarts: number;
  batardTurns: number;
  batardFails: number;
  batardValidHits: number;
  batardAdvances: number;
};

const MODE_DEFS: {
  id: LeaderboardMode;
  label: string;
  metrics: MetricKey[];
}[] = [
  {
    id: "x01_multi",
    label: "X01 MULTI",
    metrics: ["avg3", "wins", "winRate", "matches", "bestVisit", "bestCheckout"],
  },
  { id: "cricket", label: "CRICKET", metrics: ["winRate", "wins", "matches"] },
  {
    id: "killer",
    label: "KILLER",
    metrics: [
      "kills",
      "wins",
      "winRate",
      "matches",
      "favSegmentHits",
      "favNumberHits",
      "totalHits",
    ],
  },
  { id: "shanghai", label: "SHANGHAI", metrics: ["wins", "winRate", "matches"] },
  { id: "battle_royale", label: "BATTLE ROYALE", metrics: ["wins", "winRate", "matches"] },
  { id: "clock", label: "TOUR DE L’HORLOGE", metrics: ["wins", "winRate", "matches"] },
  {
    id: "territories",
    label: "TERRITORIES",
    metrics: ["wins", "winRate", "matches", "captures", "avgDom", "avgRounds", "capPerRound"],
  },
];

// ------------------------------
// Utils robustes
// ------------------------------

function safeStr(v: any): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

function numOr0(...values: any[]): number {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickAvatar(obj: any): string | null {
  if (!obj) return null;
  return (
    obj.avatarDataUrl ||
    obj.avatar_data_url ||
    obj.avatar ||
    obj.avatarUrl ||
    obj.avatarURL ||
    obj.avatarBase64 ||
    obj.avatar_b64 ||
    obj.dataUrl ||
    obj.dataURL ||
    obj.photoDataUrl ||
    obj.photo ||
    null
  );
}

function pickName(obj: any): string {
  if (!obj) return "";
  return (
    obj.name ||
    obj.playerName ||
    obj.profileName ||
    obj.label ||
    obj.nickname ||
    obj.displayName ||
    ""
  );
}

function pickId(obj: any): string {
  if (!obj) return "";
  return obj.profileId || obj.playerId || obj.pid || obj.id || obj._id || obj.uid || "";
}

function cleanName(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s === "—" || s === "-" || s.toLowerCase() === "undefined" || s.toLowerCase() === "null")
    return "";
  return s;
}

function cleanAvatar(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (s.toLowerCase() === "undefined" || s.toLowerCase() === "null") return null;
  return s;
}

// ✅ bots storage
function loadBotsMap(): Record<string, { avatarDataUrl?: string | null; name?: string }> {
  try {
    const raw = localStorage.getItem("dc_bots_v1");
    if (!raw) return {};
    const bots = JSON.parse(raw);
    const map: Record<string, any> = {};
    for (const b of bots || []) {
      if (!b?.id) continue;
      map[String(b.id)] = { avatarDataUrl: b.avatarDataUrl ?? null, name: b.name };
    }
    return map;
  } catch {
    return {};
  }
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
      rec?.createdAt,
      rec?.ts,
      rec?.date,
      rec?.summary?.updatedAt,
      rec?.summary?.createdAt,
      rec?.summary?.finishedAt,
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
  if (!dt) return true;
  const span = periodToMs(period);
  if (!span) return true;
  return Date.now() - dt <= span;
}

function isRecordMatchingMode(rec: any, mode: LeaderboardMode, scope: Scope): boolean {
  void scope;

  // ✅ Robust: certains records ont game/mode/variant au top-level (StatsHub normalise aussi)
  const kind = rec?.kind ?? rec?.summary?.kind ?? rec?.payload?.kind;
  const topMode = rec?.mode;
  const topVariant = rec?.variant;
  const payloadMode = rec?.payload?.mode;
  const payloadVariant = rec?.payload?.variant;
  const game =
    rec?.game ??
    rec?.payload?.game ??
    rec?.summary?.game?.mode ??
    rec?.summary?.game?.game;

  const isX01 =
    kind === "x01" ||
    game === "x01" ||
    rec?.summary?.game?.mode === "x01" ||
    // compat variantes
    payloadVariant === "x01_v3" ||
    topVariant === "x01v3" ||
    topVariant === "x01_v3" ||
    // compat modes
    payloadMode === "x01_multi" ||
    payloadMode === "x01_teams" ||
    topMode === "x01v3" ||
    topMode === "x01_multi" ||
    topMode === "x01_teams";

  if (mode === "x01_multi") return isX01;
  if (mode === "cricket") return kind === "cricket" || game === "cricket";
  if (mode === "killer") return kind === "killer" || game === "killer" || payloadMode === "killer";
  if (mode === "shanghai") return kind === "shanghai" || game === "shanghai";
  if (mode === "battle_royale") return kind === "battle_royale" || game === "battle_royale";
  if (mode === "clock") return kind === "clock" || game === "clock";

  return true;
}

// ------------------------------
// Extraction per-player (câblage stats)
// ------------------------------

function extractPerPlayerSummary(summary: any): Record<string, any> {
  if (!summary) return {};

  if (summary.detailedByPlayer && typeof summary.detailedByPlayer === "object") {
    return summary.detailedByPlayer as Record<string, any>;
  }

  const out: Record<string, any> = {};

  if (Array.isArray(summary.perPlayer)) {
    for (const p of summary.perPlayer) {
      const pid = pickId(p) || safeStr(p?.id);
      if (!pid) continue;
      out[String(pid)] = p;
    }
    if (Object.keys(out).length) return out;
  }

  const avg3Map =
    summary.avg3ByPlayer ||
    summary.avg3_by_player ||
    summary.moy3ByPlayer ||
    summary.moy3_by_player ||
    summary.avgByPlayer ||
    null;

  const bestVisitMap =
    summary.bestVisitByPlayer ||
    summary.bestVisit_by_player ||
    summary.bvByPlayer ||
    summary.bv_by_player ||
    null;

  const bestCheckoutMap =
    summary.bestCheckoutByPlayer ||
    summary.bestCheckout_by_player ||
    summary.bestCoByPlayer ||
    summary.bestCo_by_player ||
    summary.coByPlayer ||
    null;


  const pointsMap =
    summary.pointsByPlayer ||
    summary.points_by_player ||
    summary.points ||
    null;

  const dartsMap =
    summary.dartsByPlayer ||
    summary.darts_by_player ||
    summary.darts ||
    null;

  const turnsMap =
    summary.turnsByPlayer ||
    summary.turns_by_player ||
    null;

  const failsMap =
    summary.failsByPlayer ||
    summary.fails_by_player ||
    null;

  const validHitsMap =
    summary.validHitsByPlayer ||
    summary.validHits_by_player ||
    null;

  const advancesMap =
    summary.advancesByPlayer ||
    summary.advances_by_player ||
    null;

  const hitsBySegMap =
    summary.hitsBySegmentByPlayer ||
    summary.hits_by_segment_by_player ||
    summary.hitsBySegment ||
    null;

  const nameMap = summary.nameByPlayer || summary.playerNames || null;
  const avatarMap = summary.avatarByPlayer || summary.avatarDataUrlByPlayer || null;

  const keys = new Set<string>();
  const collectKeys = (m: any) => {
    if (!m || typeof m !== "object") return;
    for (const k of Object.keys(m)) keys.add(String(k));
  };
  collectKeys(avg3Map);
  collectKeys(bestVisitMap);
  collectKeys(bestCheckoutMap);
  collectKeys(pointsMap);
  collectKeys(dartsMap);
  collectKeys(turnsMap);
  collectKeys(failsMap);
  collectKeys(validHitsMap);
  collectKeys(advancesMap);
  collectKeys(nameMap);
  collectKeys(avatarMap);
  collectKeys(hitsBySegMap);

  if (keys.size) {
    for (const pid of keys) {
      out[String(pid)] = {
        playerId: pid,
        profileId: pid,
        name: nameMap?.[pid],
        avatarDataUrl: avatarMap?.[pid],
        avg3: numOr0(avg3Map?.[pid]),
        bestVisit: numOr0(bestVisitMap?.[pid]),
        bestCheckout: numOr0(bestCheckoutMap?.[pid]),
        hitsBySegment: hitsBySegMap?.[pid] || undefined,
      };
    }
    return out;
  }

  if (summary.players && typeof summary.players === "object") {
    for (const [pid, p] of Object.entries(summary.players)) {
      if (!pid) continue;
      out[String(pid)] = p as any;
    }
    if (Object.keys(out).length) return out;
  }

  return {};
}

// ✅ helpers: fav number/segment from hitsBySegment
function parseSegmentKeyToNumber(segKey: string): number {
  const k = safeStr(segKey).toUpperCase();
  if (k === "SB" || k === "BULL") return 25;
  if (k === "DB" || k === "DBULL") return 25;
  const m = k.match(/^([SDT])(\d{1,2})$/);
  if (m) {
    const n = Number(m[2]);
    if (n >= 1 && n <= 20) return n;
  }
  return 0;
}

function computeFavsFromHitsMap(hitsBySegment: any) {
  const segCounts: Record<string, number> = {};
  const numCounts: Record<string, number> = {};
  let totalHits = 0;

  if (hitsBySegment && typeof hitsBySegment === "object") {
    for (const [k0, v0] of Object.entries(hitsBySegment)) {
      const k = safeStr(k0).toUpperCase();
      const c = numOr0(v0);
      if (c <= 0) continue;

      segCounts[k] = (segCounts[k] || 0) + c;
      totalHits += c;

      const n = parseSegmentKeyToNumber(k);
      if (n > 0) {
        const nk = String(n);
        numCounts[nk] = (numCounts[nk] || 0) + c;
      }
    }
  }

  let favSegment = "";
  let favSegmentHits = 0;
  for (const [k, c] of Object.entries(segCounts)) {
    if (c > favSegmentHits) {
      favSegmentHits = c;
      favSegment = k;
    }
  }

  let favNumber = 0;
  let favNumberHits = 0;
  for (const [nk, c] of Object.entries(numCounts)) {
    const n = Number(nk);
    if (c > favNumberHits) {
      favNumberHits = c;
      favNumber = n;
    }
  }

  return { favSegment, favSegmentHits, favNumber, favNumberHits, totalHits };
}

type Agg = {
  wins: number;
  matches: number;

  avg3Sum: number;
  avg3Count: number;
  bestVisit: number;
  bestCheckout: number;

  kills: number;
  hitsBySegmentAgg: Record<string, number>;
  totalHits: number;

  // ✅ BATARD sums
  batardPoints: number;
  batardDarts: number;
  batardTurns: number;
  batardFails: number;
  batardValidHits: number;
  batardAdvances: number;
};

type ExtraInfo = {
  name?: string;
  avatarDataUrl?: string | null;
};

function computeRowsFromHistory(
  history: any[],
  profiles: Profile[],
  mode: LeaderboardMode,
  scope: Scope,
  period: PeriodKey,
  opts?: { includeBots?: boolean }
): Row[] {
  const includeBots = opts?.includeBots !== false;
  const botsMap0 = includeBots ? loadBotsMap() : {};

  const aggByPlayer: Record<string, Agg> = {};
  const infoByPlayer: Record<string, ExtraInfo> = {};
  const profileById: Record<string, Profile> = {};

  // seed profils locaux
  for (const p of profiles || []) {
    if (!p?.id) continue;
    profileById[p.id] = p;
    aggByPlayer[p.id] = {
      wins: 0,
      matches: 0,
      avg3Sum: 0,
      avg3Count: 0,
      bestVisit: 0,
      bestCheckout: 0,
      kills: 0,
      hitsBySegmentAgg: {},
      totalHits: 0,
      batardPoints: 0,
      batardDarts: 0,
      batardTurns: 0,
      batardFails: 0,
      batardValidHits: 0,
      batardAdvances: 0,
    };
    infoByPlayer[p.id] = {
      name: p.name,
      avatarDataUrl: (p as any).avatarDataUrl ?? (p as any).avatar ?? null,
    };
  }

  for (const rec of history || []) {
    if (!rec) continue;
    if (!inPeriod(rec, period)) continue;
    if (!isRecordMatchingMode(rec, mode, scope)) continue;

    const winnerId =
      rec.winnerId ||
      rec.payload?.winnerId ||
      rec.summary?.winnerId ||
      rec.payload?.summary?.winnerId ||
      null;

    const summary = rec.summary || rec.payload?.summary || null;
    const per = extractPerPlayerSummary(summary);
    const summaryPlayersArr: any[] = Array.isArray(summary?.players) ? summary.players : [];

    // 1) per-player
    if (per && Object.keys(per).length > 0) {
      for (const key of Object.keys(per)) {
        const det: any = per[key] || {};
        const pid: string = String(pickId(det) || key || "");
        if (!pid) continue;

        if (!aggByPlayer[pid]) {
          aggByPlayer[pid] = {
            wins: 0,
            matches: 0,
            avg3Sum: 0,
            avg3Count: 0,
            bestVisit: 0,
            bestCheckout: 0,
            kills: 0,
            hitsBySegmentAgg: {},
            totalHits: 0,
      batardPoints: 0,
      batardDarts: 0,
      batardTurns: 0,
      batardFails: 0,
      batardValidHits: 0,
      batardAdvances: 0,
          };
        }
        if (!infoByPlayer[pid]) infoByPlayer[pid] = {};

        if (!infoByPlayer[pid].name) {
          infoByPlayer[pid].name =
            pickName(det) || (includeBots ? botsMap0?.[pid]?.name : "") || infoByPlayer[pid].name || "";
        }
        if (!infoByPlayer[pid].avatarDataUrl) {
          infoByPlayer[pid].avatarDataUrl =
            pickAvatar(det) ||
            (includeBots ? botsMap0?.[pid]?.avatarDataUrl : null) ||
            infoByPlayer[pid].avatarDataUrl ||
            null;
        }

        const agg = aggByPlayer[pid];

        agg.matches += 1;
        if (winnerId && String(winnerId) === String(pid)) agg.wins += 1;

        const avg3Candidate = numOr0(det.avg3, det.moy3, det.avg, det.avg3d, det.avg_3);
        if (avg3Candidate > 0) {
          agg.avg3Sum += avg3Candidate;
          agg.avg3Count += 1;
        }

        const bvCandidate = numOr0(det.bestVisit, det.bv, det.bestVisit3, det.bv3, det.best_visit);
        if (bvCandidate > 0) agg.bestVisit = Math.max(agg.bestVisit, bvCandidate);

        const coCandidate = numOr0(det.bestCheckout, det.bestCo, det.coBest, det.co, det.best_co);
        if (coCandidate > 0) agg.bestCheckout = Math.max(agg.bestCheckout, coCandidate);

        // ✅ BATARD sums (if present in summary maps)
        const ptsCandidate = numOr0(det.points, det.pointsAdded, det.points_by_player);
        const dartsCandidate = numOr0(det.darts, det.dartsThrown, det.darts_by_player);
        const turnsCandidate = numOr0(det.turns, det.turnsByPlayer, det.turns_by_player);
        const failsCandidate = numOr0(det.fails, det.fail, det.failsByPlayer);
        const vhCandidate = numOr0(det.validHits, det.valid_hits, det.validHitsByPlayer);
        const advCandidate = numOr0(det.advances, det.advance, det.advancesByPlayer);
        if (ptsCandidate) agg.batardPoints += ptsCandidate;
        if (dartsCandidate) agg.batardDarts += dartsCandidate;
        if (turnsCandidate) agg.batardTurns += turnsCandidate;
        if (failsCandidate) agg.batardFails += failsCandidate;
        if (vhCandidate) agg.batardValidHits += vhCandidate;
        if (advCandidate) agg.batardAdvances += advCandidate;

        if (mode === "killer") {
          // kills: prefer summary.players
          if (summaryPlayersArr.length) {
            const sp = summaryPlayersArr.find((x) => String(pickId(x) || x?.id) === String(pid));
            if (sp) {
              const k = numOr0(sp.kills, sp.killCount, sp.k);
              if (k > 0) agg.kills += k;
            }
          } else {
            const k = numOr0(det.kills, det.killCount, det.k);
            if (k > 0) agg.kills += k;
          }

          // hitsBySegment
          const hbs = det.hitsBySegment || det.hits_by_segment || det.hits || null;
          if (hbs && typeof hbs === "object") {
            for (const [seg, c0] of Object.entries(hbs)) {
              const c = numOr0(c0);
              if (c <= 0) continue;
              const s = safeStr(seg).toUpperCase();
              agg.hitsBySegmentAgg[s] = (agg.hitsBySegmentAgg[s] || 0) + c;
              agg.totalHits += c;
            }
          }
        }
      }
      continue;
    }

    // 2) fallback via players array
    const playersArr: any[] = Array.isArray(rec.players)
      ? rec.players
      : Array.isArray(rec.payload?.players)
      ? rec.payload.players
      : Array.isArray(rec.payload?.summary?.players)
      ? rec.payload.summary.players
      : [];

    if (!playersArr.length) continue;

    for (const pl of playersArr) {
      const pid0 = pickId(pl);
      const name = pickName(pl);
      const avatar = pickAvatar(pl);

      const key = pid0 ? String(pid0) : `name:${safeStr(name).trim().toLowerCase()}`;
      if (!key) continue;

      if (!aggByPlayer[key]) {
        aggByPlayer[key] = {
          wins: 0,
          matches: 0,
          avg3Sum: 0,
          avg3Count: 0,
          bestVisit: 0,
          bestCheckout: 0,
          kills: 0,
          hitsBySegmentAgg: {},
          totalHits: 0,
      batardPoints: 0,
      batardDarts: 0,
      batardTurns: 0,
      batardFails: 0,
      batardValidHits: 0,
      batardAdvances: 0,
        };
      }

      if (!infoByPlayer[key]) infoByPlayer[key] = {};

      if (!infoByPlayer[key].name) {
        infoByPlayer[key].name = name || (includeBots && pid0 ? botsMap0?.[String(pid0)]?.name : "") || "—";
      }

      if (!infoByPlayer[key].avatarDataUrl) {
        infoByPlayer[key].avatarDataUrl =
          avatar || (includeBots && pid0 ? botsMap0?.[String(pid0)]?.avatarDataUrl : null) || null;
      }

      const agg = aggByPlayer[key];
      agg.matches += 1;
      if (winnerId && pid0 && String(winnerId) === String(pid0)) agg.wins += 1;

      const avg3Candidate = numOr0(pl.avg3, pl.moy3, pl.avg3d);
      if (avg3Candidate > 0) {
        agg.avg3Sum += avg3Candidate;
        agg.avg3Count += 1;
      }
      const bvCandidate = numOr0(pl.bestVisit, pl.bv, pl.bestVisit3);
      if (bvCandidate > 0) agg.bestVisit = Math.max(agg.bestVisit, bvCandidate);
      const coCandidate = numOr0(pl.bestCheckout, pl.bestCo, pl.coBest);
      if (coCandidate > 0) agg.bestCheckout = Math.max(agg.bestCheckout, coCandidate);

      // ✅ BATARD fallback fields
      agg.batardPoints += numOr0(pl.points, pl.pointsAdded);
      agg.batardDarts += numOr0(pl.darts, pl.dartsThrown);
      agg.batardTurns += numOr0(pl.turns);
      agg.batardFails += numOr0(pl.fails);
      agg.batardValidHits += numOr0(pl.validHits);
      agg.batardAdvances += numOr0(pl.advances);

      if (mode === "killer") {
        const k = numOr0(pl.kills, pl.killCount, pl.k);
        if (k > 0) agg.kills += k;
      }
    }
  }

  const rows: Row[] = Object.keys(aggByPlayer).map((pid) => {
    const agg = aggByPlayer[pid];
    const prof = profileById[pid];
    const extra = infoByPlayer[pid] || {};

    const matches = agg.matches || 0;
    const wins = agg.wins || 0;
    const winRate = matches > 0 ? (wins / matches) * 100 : 0;
    const avg3 = agg.avg3Count > 0 ? agg.avg3Sum / agg.avg3Count : 0;

    const fav =
      mode === "killer"
        ? computeFavsFromHitsMap(agg.hitsBySegmentAgg)
        : { favSegment: "", favSegmentHits: 0, favNumber: 0, favNumberHits: 0, totalHits: 0 };

    const botFallbackAvatar = includeBots ? botsMap0?.[pid]?.avatarDataUrl || null : null;
    const botFallbackName = includeBots ? botsMap0?.[pid]?.name || undefined : undefined;

    const failsPerMatch = matches > 0 ? agg.batardFails / matches : 0;
    const validHitsPerDart = agg.batardDarts > 0 ? agg.batardValidHits / agg.batardDarts : 0;
    const ptsPerTurn = agg.batardTurns > 0 ? agg.batardPoints / agg.batardTurns : 0;

    return {
      id: pid,
      name: prof?.name || extra.name || botFallbackName || "—",
      avatarDataUrl:
        (prof as any)?.avatarDataUrl ??
        (prof as any)?.avatar ??
        extra.avatarDataUrl ??
        botFallbackAvatar ??
        null,

      wins,
      losses: Math.max(0, matches - wins),
      matches,
      winRate,

      avg3,
      bestVisit: agg.bestVisit || 0,
      bestCheckout: agg.bestCheckout || 0,

      kills: agg.kills || 0,
      favNumber: fav.favNumber || 0,
      favNumberHits: fav.favNumberHits || 0,
      favSegment: fav.favSegment || "",
      favSegmentHits: fav.favSegmentHits || 0,
      totalHits: fav.totalHits || agg.totalHits || 0,
    };
  });

  return rows;
}

function computeRowsFromTerritories(
  profiles: ProfileLite[],
  metric: MetricKey
): Row[] {
  const matches = loadTerritoriesHistory();

  const byId = new Map<string, ProfileLite>();
  for (const p of profiles) byId.set(p.id, p);

  type Agg = {
    id: string;
    name: string;
    avatar?: string;
    matches: number;
    wins: number;
    captures: number;
    dom: number;
    rounds: number;
  };

  const agg = new Map<string, Agg>();

  const ensure = (id: string, fallbackName?: string, fallbackAvatar?: string) => {
    const p = byId.get(id);
    const name = p?.name || fallbackName || "—";
    const avatar = p?.avatar || fallbackAvatar;
    let a = agg.get(id);
    if (!a) {
      a = { id, name, avatar, matches: 0, wins: 0, captures: 0, dom: 0, rounds: 0 };
      agg.set(id, a);
    } else {
      // refresh name/avatar if needed
      if (a.name === "—" && name !== "—") a.name = name;
      if (!a.avatar && avatar) a.avatar = avatar;
    }
    return a;
  };

  for (const m of matches) {
    const players = Array.isArray((m as any).players) ? (m as any).players : [];
    if (!players.length) continue;

    const winnerTeam = typeof (m as any).winnerTeam === "number" ? (m as any).winnerTeam : 0;
    const caps: number[] = Array.isArray((m as any).captured)
      ? (m as any).captured.map((x: any) => Number(x) || 0)
      : [];
    const doms: number[] = Array.isArray((m as any).domination)
      ? (m as any).domination.map((x: any) => Number(x) || 0)
      : [];
    const rounds = Number((m as any).rounds) || 0;

    for (const pl of players) {
      const pid = String(pl.profileId || "").trim();
      if (!pid) continue;
      const a = ensure(pid, pl.name, pl.avatar);
      a.matches += 1;
      const ti = typeof pl.teamIndex === "number" ? pl.teamIndex : 0;
      if (ti === winnerTeam) a.wins += 1;

      // Per-team stats
      a.captures += Number(caps[ti] ?? 0) || 0;
      a.dom += Number(doms[ti] ?? 0) || 0;
      a.rounds += rounds;
    }
  }

  const rows: Row[] = Array.from(agg.values()).map((a) => {
    const winRate = a.matches > 0 ? Math.round((a.wins / a.matches) * 1000) / 10 : 0;
    const avgDom = a.matches > 0 ? Math.round((a.dom / a.matches) * 10) / 10 : 0;
    const avgRounds = a.matches > 0 ? Math.round((a.rounds / a.matches) * 10) / 10 : 0;
    const capPerRound = a.rounds > 0 ? Math.round((a.captures / a.rounds) * 100) / 100 : 0;
    return {
      id: a.id,
      profileId: a.id,
      name: a.name,
      avatar: a.avatar,
      avatarDataUrl: a.avatar,
      wins: a.wins,
      losses: Math.max(0, a.matches - a.wins),
      winRate,
      matches: a.matches,
      captures: a.captures,
      avgDom,
      avgRounds,
      capPerRound,
      avg3: 0,
      bestVisit: 0,
      bestCheckout: 0,
      kills: 0,
      favNumberHits: 0,
      favSegmentHits: 0,
      totalHits: 0,
      batardPoints: 0,
      batardDarts: 0,
      batardTurns: 0,
      batardFails: 0,
      batardValidHits: 0,
      batardAdvances: 0,
    };
  });

  rows.sort((a, b) => (b[metric] - a[metric]) || (b.matches - a.matches));
  return rows;
}

function metricLabel(m: MetricKey) {
  switch (m) {
    case "wins":
      return "Victoires";
    case "winRate":
      return "% Win";
    case "matches":
      return "Matchs joués";
    case "avg3":
      return "Moy. 3 darts";
    case "bestVisit":
      return "Best visit";
    case "bestCheckout":
      return "Best CO";
    case "kills":
      return "Kills";
    case "favNumberHits":
      return "Numéro favori";
    case "favSegmentHits":
      return "Segment favori";
    case "totalHits":
      return "Hits total";
    case "captures":
      return "Captures";
    case "avgDom":
      return "Domination (moy.)";
    case "avgRounds":
      return "Tours (moy.)";
    case "capPerRound":
      return "Captures / tour";
    case "failsPerMatch":
      return "Fails / match";
    case "validHitsPerDart":
      return "Valid hits / dart";
    case "advances":
      return "Avancées";
    case "ptsPerTurn":
      return "Pts / tour";
    default:
      return "Stat";
  }
}

function periodLabel(p: PeriodKey) {
  switch (p) {
    case "D":
      return "J";
    case "W":
      return "S";
    case "M":
      return "M";
    case "Y":
      return "A";
    case "ALL":
      return "All";
    case "TOUT":
      return "Tout";
    default:
      return "All";
  }
}

function isDisplayableRowStrict(r: any): boolean {
  const nameOk = !!cleanName(r?.name);
  const avatarOk = !!cleanAvatar(r?.avatarDataUrl);
  const matches = numOr0(r?.matches, r?.played);
  // ✅ on affiche seulement si entrée “complète” + au moins 1 match
  return nameOk && avatarOk && matches > 0;
}

function isBotRow(row: any, botsMap: Record<string, any>, profileIds: Set<string>) {
  const id = safeStr(row?.id);
  // bot si son id est dans botsMap ET que ce n’est PAS un profil local
  return !!(id && botsMap?.[id] && !profileIds.has(id));
}

// =============================================================

export default function StatsLeaderboardsPage({ store }: Props) {
  const { theme } = useTheme();
  const langAny: any = useLang();

  // ✅ Fix "t is not a function"
  const t = React.useCallback(
    (key: string, fallback: string) => {
      const fn = langAny?.t;
      if (typeof fn === "function") return fn(key, fallback);
      return fallback ?? key;
    },
    [langAny]
  );

  const profiles: Profile[] = (store as any)?.profiles ?? [];
  const profileIds = React.useMemo(
    () => new Set((profiles || []).map((p: any) => String(p?.id || "")).filter(Boolean)),
    [profiles]
  );

  const [scope, setScope] = React.useState<Scope>("local");
  const [mode, setMode] = React.useState<LeaderboardMode>("x01_multi");
  const [period, setPeriod] = React.useState<PeriodKey>("ALL");

  // ✅ NEW: toggle bots (par défaut ON)
  const [includeBots, setIncludeBots] = React.useState<boolean>(true);

  // ✅ BATARD filters (derived from History payload.config)
  const [batardPreset, setBatardPreset] = React.useState<string>("all");
  const [batardWinMode, setBatardWinMode] = React.useState<string>("all");
  const [batardFailPolicy, setBatardFailPolicy] = React.useState<string>("all");
  const [batardScoreOnlyValid, setBatardScoreOnlyValid] = React.useState<string>("all"); // all|true|false
  const [historySource, setHistorySource] = React.useState<any[]>(
    (((store as any)?.history as any[]) || []) as any[]
  );


  const batardFilterOptions = React.useMemo(() => {
    const presets = new Set<string>();
    const winModes = new Set<string>();
    const failPolicies = new Set<string>();
    const scoreOnlyVals = new Set<string>();
    for (const r of historySource || []) {
      const kind = String(r?.kind || r?.payload?.kind || r?.summary?.mode || r?.payload?.mode || "").toLowerCase();
      if (!(kind.includes("batard") || kind.includes("bastard"))) continue;
      const c = r?.payload?.config || r?.decoded?.config || r?.config || null;
      const b = c?.batard || c?.rules || null;
      if (b?.presetId) presets.add(String(b.presetId));
      if (b?.winMode) winModes.add(String(b.winMode));
      if (b?.failPolicy) failPolicies.add(String(b.failPolicy));
      if (typeof b?.scoreOnlyValid === "boolean") scoreOnlyVals.add(String(b.scoreOnlyValid));
    }
    return {
      presets: Array.from(presets).sort(),
      winModes: Array.from(winModes).sort(),
      failPolicies: Array.from(failPolicies).sort(),
      scoreOnlyVals: Array.from(scoreOnlyVals).sort(),
    };
  }, [historySource]);

  React.useEffect(() => {
    setHistorySource((((store as any)?.history as any[]) || []) as any[]);
  }, [store]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const api: any = History as any;
        let list: any[] = [];
        if (typeof api.getAll === "function") list = await api.getAll();
        else if (typeof api.list === "function") list = await api.list();
        else if (typeof api.getAllSorted === "function") list = await api.getAllSorted();

        if (alive && Array.isArray(list) && list.length) {
          if (import.meta.env.DEV) console.log("[Leaderboards] IDB history size =", list.length);
          setHistorySource(list);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.log("[Leaderboards] History IDB load error", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currentModeDef = MODE_DEFS.find((m) => m.id === mode);
  const metricList = currentModeDef?.metrics ?? [];
  const [metric, setMetric] = React.useState<MetricKey>(metricList[0] ?? "wins");

  React.useEffect(() => {
    const def = MODE_DEFS.find((m) => m.id === mode);
    if (!def) return;
    if (!def.metrics.includes(metric)) setMetric(def.metrics[0]);
  }, [mode]); // eslint-disable-line

  const currentModeIndex = MODE_DEFS.findIndex((m) => m.id === mode);
  const currentMetricIndex = Math.max(0, metricList.findIndex((m) => m === metric));

  const cycleMode = (dir: "prev" | "next") => {
    if (!MODE_DEFS.length) return;
    let idx = currentModeIndex < 0 ? 0 : currentModeIndex;
    const len = MODE_DEFS.length;
    const newIndex = dir === "prev" ? (idx - 1 + len) % len : (idx + 1) % len;
    setMode(MODE_DEFS[newIndex].id);
  };

  const cycleMetric = (dir: "prev" | "next") => {
    if (!metricList.length) return;
    let idx = currentMetricIndex;
    const len = metricList.length;
    const newIndex = dir === "prev" ? (idx - 1 + len) % len : (idx + 1) % len;
    setMetric(metricList[newIndex]);
  };

  const rows: any[] = React.useMemo(() => {
    const botsMap = loadBotsMap();

    const valueAny = (r: any): number => {
      switch (metric) {
        case "wins":
          return numOr0(r?.wins);
        case "winRate":
          return numOr0(r?.winRate);
        case "matches":
          return numOr0(r?.matches, r?.played);
        case "avg3":
          return numOr0(r?.avg3);
        case "bestVisit":
          return numOr0(r?.bestVisit);
        case "bestCheckout":
          return numOr0(r?.bestCheckout);
        case "kills":
          return numOr0(r?.kills);
        case "favSegmentHits":
          return numOr0(r?.favSegmentHits);
        case "favNumberHits":
          return numOr0(r?.favNumberHits);
        case "totalHits":
          return numOr0(r?.totalHits);
        case "captures":
          return numOr0(r?.captures);
        case "avgDom":
          return numOr0(r?.avgDom);
        case "avgRounds":
          return numOr0(r?.avgRounds);
        case "capPerRound":
          return numOr0(r?.capPerRound);
        case "failsPerMatch":
          return numOr0(r?.failsPerMatch);
        case "validHitsPerDart":
          return numOr0(r?.validHitsPerDart);
        case "advances":
          return numOr0(r?.advances);
        case "ptsPerTurn":
          return numOr0(r?.ptsPerTurn);
        default:
          return 0;
      }
    };

    const sortRows = (list: any[]) => [...(list || [])].sort((a, b) => valueAny(b) - valueAny(a));

    const sanitizeAndFilter = (list: any[]) => {
      const out = (list || [])
        .map((r: any, i: number) => {
          const name = cleanName(r?.name);
          const avatarDataUrl = cleanAvatar(r?.avatarDataUrl);
          const id =
            safeStr(r?.id || r?.playerId || r?.profileId || r?.pid || "") ||
            (name ? `name:${name.toLowerCase()}` : `row:${i}`);
          return { ...r, id, name, avatarDataUrl };
        })
        .filter(isDisplayableRowStrict);

      // ✅ OFF => on vire vraiment les bots
      const filtered = includeBots ? out : out.filter((r) => !isBotRow(r, botsMap, profileIds));
      return filtered;
    };


    // ✅ BATARD filters
    const historyFiltered =
      mode !== "batard"
        ? historySource
        : (historySource || []).filter((r: any) => {
            const c = r?.payload?.config || r?.decoded?.config || r?.config || null;
            const b = c?.batard || null;
            if (!b) return true;
            if (batardPreset !== "all" && String(b.presetId || "") !== batardPreset) return false;
            if (batardWinMode !== "all" && String(b.winMode || "") !== batardWinMode) return false;
            if (batardFailPolicy !== "all" && String(b.failPolicy || "") !== batardFailPolicy) return false;
            if (batardScoreOnlyValid !== "all" && String(!!b.scoreOnlyValid) !== batardScoreOnlyValid) return false;
            return true;
          });
    // ✅ TERRITORIES : hors History (localStorage)
    if (mode === "territories") {
      const base = computeRowsFromTerritories(profiles || [], metric);
      return sortRows(sanitizeAndFilter(base));
    }

    // ✅ KILLER : on essaie computeKillerAgg si dispo et compatible, sinon fallback sur computeRowsFromHistory
    if (mode === "killer") {
      try {
        const fn = computeKillerAgg as any;
        if (typeof fn === "function") {
          let agg: any = null;
          const botsArg = includeBots ? botsMap : {};
          try {
            agg = fn(historySource || [], profiles || [], botsArg);
          } catch {
            agg = fn(historySource || [], profiles || []);
          }
          const base = Array.isArray(agg) ? agg : Object.values(agg || {});
          return sortRows(sanitizeAndFilter(base));
        }
      } catch {
        // ignore → fallback
      }
    }

    // ✅ autres modes
    const baseRows = computeRowsFromHistory(historyFiltered, profiles, mode, scope, period, { includeBots });
    return sortRows(sanitizeAndFilter(baseRows));
  }, [historySource, profiles, mode, scope, metric, period, includeBots, profileIds, batardPreset, batardWinMode, batardFailPolicy, batardScoreOnlyValid]);

  const hasData = rows.length > 0;
  const currentMetricLabel = metricLabel(metric) || t("stats.leaderboards.metric", "Stat");

  return (
    <div
      className="stats-leaderboards-page"
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 12,
        paddingTop: 20,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* HEADER (sans bouton retour) */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 900,
              letterSpacing: 0.9,
              textTransform: "uppercase",
              color: theme.primary,
              fontSize: 20,
              textShadow: `0 0 14px ${theme.primary}66`,
              marginBottom: 4,
            }}
          >
            {t("stats.leaderboards.titleMain", "CLASSEMENTS")}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.3, color: theme.textSoft }}>
            Classements globaux par mode de jeu et par stat.
          </div>
        </div>
      </div>

      {/* CARD : SCOPE + MODE */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 20,
          padding: 10,
          marginBottom: 14,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 16px 32px rgba(0,0,0,.65), 0 0 20px ${theme.primary}33`,
        }}
      >
        {/* Scope */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {(["local", "online"] as Scope[]).map((s) => {
            const active = s === scope;
            return (
              <button
                key={s}
                onClick={() => setScope(s)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                  padding: "6px 8px",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  background: active ? `linear-gradient(135deg, ${theme.primary}, #ffea9a)` : "transparent",
                  color: active ? "#000" : theme.textSoft,
                  boxShadow: active ? `0 0 14px ${theme.primary}77` : "none",
                  cursor: "pointer",
                }}
              >
                {s === "local" ? "LOCAL" : "ONLINE"}
              </button>
            );
          })}
        </div>

        {/* ✅ Toggle BOTS */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <button
            onClick={() => setIncludeBots((v) => !v)}
            style={{
              borderRadius: 999,
              border: `1px solid ${includeBots ? theme.primary : theme.borderSoft}`,
              padding: "5px 10px",
              fontSize: 10,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              background: includeBots ? `linear-gradient(135deg, ${theme.primary}, #ffea9a)` : "rgba(0,0,0,0.25)",
              color: includeBots ? "#000" : theme.textSoft,
              boxShadow: includeBots ? `0 0 14px ${theme.primary}55` : "none",
              cursor: "pointer",
              minWidth: 120,
              textAlign: "center",
            }}
          >
            BOTS : {includeBots ? "ON" : "OFF"}
          </button>
        </div>

        {/* Mode carousel */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <button
            onClick={() => cycleMode("prev")}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {"<"}
          </button>

          <div
            style={{
              flex: 1,
              borderRadius: 999,
              padding: "6px 10px",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.95))",
              color: theme.primary,
              boxShadow: `0 0 14px ${theme.primary}33`,
            }}
          >
            {currentModeDef?.label ?? ""}
          </div>

          <button
            onClick={() => cycleMode("next")}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {">"}
          </button>
        </div>
      </div>

      {/* PÉRIODE + STAT */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 18,
          padding: 12,
          marginBottom: 10,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 12px 26px rgba(0,0,0,.7)`,
        }}
      >
        {/* Période */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              color: theme.primary,
            }}
          >
            {t("stats.leaderboards.period", "Période")}
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            {(["D", "W", "M", "Y", "ALL", "TOUT"] as PeriodKey[]).map((p) => {
              const active = p === period;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    borderRadius: 999,
                    border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                    padding: "3px 7px",
                    fontSize: 9,
                    fontWeight: 700,
                    background: active ? theme.primary : "transparent",
                    color: active ? "#000" : theme.textSoft,
                    cursor: "pointer",
                  }}
                >
                  {periodLabel(p)}
                </button>
              );
            })}
          </div>
        </div>


        {/* ✅ BATARD filters */}
        {mode === "batard" ? (
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select value={batardPreset} onChange={(e) => setBatardPreset(e.target.value)} style={S.select(theme)}>
              <option value="all">Preset: Tous</option>
              {batardFilterOptions.presets.map((x) => (
                <option key={x} value={x}>
                  Preset: {x}
                </option>
              ))}
            </select>

            <select value={batardWinMode} onChange={(e) => setBatardWinMode(e.target.value)} style={S.select(theme)}>
              <option value="all">WinMode: Tous</option>
              {batardFilterOptions.winModes.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <select value={batardFailPolicy} onChange={(e) => setBatardFailPolicy(e.target.value)} style={S.select(theme)}>
              <option value="all">FailPolicy: Tous</option>
              {batardFilterOptions.failPolicies.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <select
              value={batardScoreOnlyValid}
              onChange={(e) => setBatardScoreOnlyValid(e.target.value)}
              style={S.select(theme)}
            >
              <option value="all">ScoreOnlyValid: Tous</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        ) : null}

        {/* Tri */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.7,
            color: theme.primary,
            marginBottom: 4,
          }}
        >
          {t("stats.leaderboards.sortBy", "Classement par")}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => cycleMetric("prev")}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {"<"}
          </button>

          <div
            style={{
              flex: 1,
              borderRadius: 999,
              padding: "5px 10px",
              textAlign: "center",
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.95))",
              color: theme.primary,
              boxShadow: `0 0 10px ${theme.primary}33`,
            }}
          >
            {currentMetricLabel}
          </div>

          <button
            onClick={() => cycleMetric("next")}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {">"}
          </button>
        </div>
      </div>

      {/* LISTE */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 18,
          padding: 10,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 14px 30px rgba(0,0,0,.8)`,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: theme.textSoft,
            marginBottom: 6,
          }}
        >
          {t("stats.leaderboards.titleList", "Classements")}
        </div>

        {!hasData ? (
          <div style={{ padding: 16, textAlign: "center", fontSize: 11.5, color: theme.textSoft }}>
            {t("stats.leaderboards.empty", "Aucune donnée de classement.")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((row: any, index: number) => {
              const rank = index + 1;

              // ✅ Sécurité ultime (au cas où)
              if (!isDisplayableRowStrict(row)) return null;

              let rankColor = theme.textSoft;
              if (rank === 1) rankColor = "#ffd700";
              else if (rank === 2) rankColor = "#c0c0c0";
              else if (rank === 3) rankColor = "#cd7f32";

              let metricValue: string;
              let metricSub: string | null = null;

              const rMatches = numOr0(row.matches, row.played);

              switch (metric) {
                case "wins":
                  metricValue = `${numOr0(row.wins)}`;
                  metricSub = `${rMatches} matchs`;
                  break;
                case "winRate":
                  metricValue = `${numOr0(row.winRate).toFixed(1)}%`;
                  metricSub = `${numOr0(row.wins)}/${rMatches}`;
                  break;
                case "matches":
                  metricValue = `${rMatches}`;
                  metricSub = `${numOr0(row.wins)} win`;
                  break;
                case "avg3":
                  metricValue = row.avg3 ? Number(row.avg3).toFixed(1) : "0.0";
                  metricSub = `${numOr0(row.matches)} matchs`;
                  break;
                case "bestVisit":
                  metricValue = `${numOr0(row.bestVisit)}`;
                  metricSub = `${numOr0(row.matches)} matchs`;
                  break;
                case "bestCheckout":
                  metricValue = `${numOr0(row.bestCheckout)}`;
                  metricSub = `${numOr0(row.matches)} matchs`;
                  break;

                case "kills":
                  metricValue = `${numOr0(row.kills)}`;
                  metricSub = `${rMatches} matchs`;
                  break;
                case "favNumberHits":
                  metricValue = row.favNumber ? `#${row.favNumber}` : "—";
                  metricSub = row.favNumberHits ? `${row.favNumberHits} hit(s)` : `${numOr0(row.totalHits)} hit(s)`;
                  break;
                case "favSegmentHits":
                  metricValue = row.favSegment ? `${row.favSegment}` : "—";
                  metricSub = row.favSegmentHits ? `${row.favSegmentHits} hit(s)` : `${numOr0(row.totalHits)} hit(s)`;
                  break;
                case "totalHits":
                  metricValue = `${numOr0(row.totalHits)}`;
                  metricSub = row.favSegment ? `fav: ${row.favSegment}` : null;
                  break;

                default:
                  metricValue = "0";
                  metricSub = `${rMatches} matchs`;
              }

              const label = row.name || "—";
              const letter = label?.[0]?.toUpperCase() || "🤖";

              return (
                <div
                  key={row.id || `${label}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderRadius: 12,
                    background: rank <= 3 ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.45)",
                    border: rank <= 3 ? `1px solid ${theme.primary}55` : `1px solid ${theme.borderSoft}`,
                  }}
                >
                  {/* Rang */}
                  <div style={{ width: 26, textAlign: "center", fontWeight: 900, fontSize: 13, color: rankColor }}>
                    {rank}
                  </div>

                  {/* Avatar + nom */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        overflow: "hidden",
                        boxShadow: `0 0 8px ${theme.primary}33`,
                        border: `1px solid ${theme.borderSoft}`,
                        background: "#000",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {row.avatarDataUrl ? (
                        <img
                          src={row.avatarDataUrl}
                          alt={label}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          draggable={false}
                        />
                      ) : (
                        <ProfileAvatar size={30} dataUrl={null} label={letter || "🤖"} showStars={false} isBot={true} />
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: theme.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {label}
                    </div>
                  </div>

                  {/* Valeur */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 11 }}>
                    <div style={{ fontWeight: 800, color: theme.primary }}>{metricValue}</div>
                    <div style={{ fontSize: 9.5, color: theme.textSoft }}>{metricSub ?? `${rMatches} matchs`}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}
