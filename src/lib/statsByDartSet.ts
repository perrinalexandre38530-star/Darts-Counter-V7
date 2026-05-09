// @ts-nocheck
// =============================================================
// src/lib/statsByDartSet.ts
// Stats X01 agrégées par set de fléchettes (dartSetId / dartPresetId)
// ✅ Option A : rétro-compat totale
// - Utilise summary.perPlayer si dispo
// - Sinon reconstruit via turns/throws/visits/darts "brutes"
// - Ajoute :
//   - hits par segments (S20/T19/DB/...)
//   - sparkline AVG/3D (évolution sur derniers matchs par set)
//   - records (180/140/100+) via visits
// =============================================================

import { History } from "./history";

export type SegmentsMap = Record<string, number>;

export type DartSetAgg = {
  dartSetId: string;
  matches: number;
  darts: number;

  avg3SumPoints: number;
  avg3SumDarts: number;

  bestVisit: number;
  bestCheckout: number;

  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;

  bull: number;
  dBull: number;
  bust: number;

  n180: number;
  n140: number;
  n100: number;

  // ✅ NEW
  segments: SegmentsMap;

  // ✅ NEW sparkline : derniers AVG/3D (ordre ancien -> récent pour affichage)
  evoAvg3: number[];
};

export type DartSetAggOut = DartSetAgg & {
  avg3: number;
};

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

function safeLower(x: any) {
  return String(x ?? "").trim().toLowerCase();
}

function isX01Record(r: any): boolean {
  const kind = safeLower(r?.kind);
  const game = safeLower(r?.game);
  const mode = safeLower(r?.mode);
  const variant = safeLower(r?.variant);

  if (kind === "x01" || kind === "x01v3") return true;
  if (game === "x01" || game === "x01v3") return true;
  if (mode === "x01" || mode === "x01v3") return true;
  if (variant === "x01" || variant === "x01v3") return true;

  // fallback si tu logges autrement
  const k2 = safeLower(r?.type);
  if (k2 === "x01" || k2 === "x01v3") return true;

  return false;
}

function pickPerPlayer(summary: any): any[] {
  if (!summary) return [];
  if (Array.isArray(summary.perPlayer)) return summary.perPlayer;
  if (Array.isArray(summary.players)) return summary.players;

  if (summary.players && typeof summary.players === "object") {
    return Object.entries(summary.players).map(([playerId, v]) => ({
      playerId,
      ...(v as any),
    }));
  }
  if (summary.perPlayer && typeof summary.perPlayer === "object") {
    return Object.entries(summary.perPlayer).map(([playerId, v]) => ({
      playerId,
      ...(v as any),
    }));
  }
  return [];
}

function resolveProfileId(pp: any): string | null {
  return (pp?.profileId ?? null) || (pp?.playerId ?? null) || (pp?.pid ?? null) || (pp?.uid ?? null) || (pp?.id ?? null) || null;
}

function resolveDartSetId(pp: any): string | null {
  return (
    (pp?.dartSetId ?? null) ||
    (pp?.dartPresetId ?? null) ||
    (pp?.dartsetId ?? null) ||
    (pp?.presetId ?? null) ||
    null
  );
}

function pickRecordPlayers(r: any): any[] {
  const candidates = [
    r?.players,
    r?.payload?.players,
    r?.payload?.config?.players,
    r?.config?.players,
    r?.resume?.players,
    r?.resume?.config?.players,
    r?.summary?.players,
    r?.payload?.summary?.players,
  ];
  const out: any[] = [];
  for (const c of candidates) {
    if (!Array.isArray(c)) continue;
    for (const p of c) {
      if (p && typeof p === "object") out.push(p);
    }
  }
  return out;
}


function collectCandidatePlayerIds(r: any, profileId: string | null | undefined, pp?: any): Set<string> {
  const ids = new Set<string>();
  const add = (v: any) => {
    if (v !== null && v !== undefined && String(v).trim()) ids.add(String(v));
  };

  add(profileId);
  add(resolveProfileId(pp));
  add(pp?.id);
  add(pp?.profileId);
  add(pp?.playerId);
  add(pp?.pid);
  add(pp?.uid);

  for (const player of pickRecordPlayers(r)) {
    const vals = [player?.id, player?.profileId, player?.playerId, player?.pid, player?.uid];
    const hit = vals.some((v) => v !== null && v !== undefined && ids.has(String(v)));
    if (hit) vals.forEach(add);
  }

  return ids;
}

function rowMatchesProfile(r: any, profileId: string | null | undefined, pp: any): boolean {
  if (!profileId) return true;
  const ids = collectCandidatePlayerIds(r, profileId, pp);
  const vals = [resolveProfileId(pp), pp?.id, pp?.profileId, pp?.playerId, pp?.pid, pp?.uid];
  return vals.some((v) => v !== null && v !== undefined && ids.has(String(v)));
}

function readDartSetMapFromRecord(r: any): Record<string, any> | null {
  const map =
    r?.payload?.meta?.dartSetIdsByPlayer ??
    r?.meta?.dartSetIdsByPlayer ??
    r?.resume?.meta?.dartSetIdsByPlayer ??
    r?.resume?.payload?.meta?.dartSetIdsByPlayer ??
    r?.payload?.dartSetIdsByPlayer ??
    r?.dartSetIdsByPlayer ??
    null;
  return map && typeof map === "object" ? map : null;
}

function resolveDartSetIdFromRecord(r: any, profileId: string | null | undefined, pp?: any): string | null {
  const direct = resolveDartSetId(pp);
  if (direct) return String(direct);

  const ids = collectCandidatePlayerIds(r, profileId, pp);

  const map = readDartSetMapFromRecord(r);
  if (map) {
    for (const id of ids) {
      const v = map[id];
      if (v) return String(v);
    }
  }

  for (const player of pickRecordPlayers(r)) {
    const pid = resolveProfileId(player);
    const rawId = player?.id ?? player?.profileId ?? player?.playerId ?? player?.pid ?? null;
    if ((pid && ids.has(String(pid))) || (rawId && ids.has(String(rawId)))) {
      const ds = resolveDartSetId(player);
      if (ds) return String(ds);
    }
  }

  const global =
    r?.dartSetId ??
    r?.payload?.dartSetId ??
    r?.payload?.meta?.dartSetId ??
    r?.meta?.dartSetId ??
    r?.summary?.dartSetId ??
    r?.payload?.summary?.dartSetId ??
    r?.payload?.config?.dartSetId ??
    r?.config?.dartSetId ??
    null;

  return global ? String(global) : null;
}

function resolveAvg3(pp: any): number {
  return N(pp?.avg3 ?? pp?.avg3d ?? pp?.avgPer3 ?? pp?.avgPerThree ?? pp?.average3 ?? pp?.avg, 0);
}

function resolveDarts(pp: any): number {
  if (pp?.darts !== undefined) return N(pp.darts, 0);
  if (pp?._sumDarts !== undefined) return N(pp._sumDarts, 0);
  if (pp?.sumDarts !== undefined) return N(pp.sumDarts, 0);
  if (pp?.totalDarts !== undefined) return N(pp.totalDarts, 0);
  if (pp?.nbDarts !== undefined) return N(pp.nbDarts, 0);
  if (pp?.thrownDarts !== undefined) return N(pp.thrownDarts, 0);
  if (pp?.dartsThrown !== undefined) return N(pp.dartsThrown, 0);
  if (pp?.dartsUsed !== undefined) return N(pp.dartsUsed, 0);
  return 0;
}

function resolvePoints(pp: any): number {
  if (pp?._sumPoints !== undefined) return N(pp._sumPoints, 0);
  if (pp?.sumPoints !== undefined) return N(pp.sumPoints, 0);
  if (pp?.points !== undefined) return N(pp.points, 0);
  if (pp?.scoredPoints !== undefined) return N(pp.scoredPoints, 0);
  if (pp?.totalPoints !== undefined) return N(pp.totalPoints, 0);
  const avg3 = resolveAvg3(pp);
  const darts = resolveDarts(pp);
  if (avg3 > 0 && darts > 0) return (avg3 * darts) / 3;
  return 0;
}

function countNestedSegments(obj: any): number {
  if (!obj || typeof obj !== "object") return 0;
  return Object.values(obj).reduce((sum: number, v: any) => sum + N(v, 0), 0);
}

function resolveHitsFromSummary(pp: any): { S: number; D: number; T: number; M: number } {
  const h = pp?.hits ?? pp?.hit ?? null;
  const seg = pp?.segments ?? null;
  return {
    S: N(pp?.hitsS ?? pp?.singles ?? pp?.single ?? h?.S ?? h?.s, 0) || countNestedSegments(seg?.S ?? pp?.bySegmentS),
    D: N(pp?.hitsD ?? pp?.doubles ?? pp?.double ?? h?.D ?? h?.d, 0) || countNestedSegments(seg?.D ?? pp?.bySegmentD),
    T: N(pp?.hitsT ?? pp?.triples ?? pp?.triple ?? h?.T ?? h?.t, 0) || countNestedSegments(seg?.T ?? pp?.bySegmentT),
    M: N(pp?.miss ?? pp?.misses ?? h?.M ?? h?.miss ?? h?.misses, 0),
  };
}

function resolveBullsFromSummary(pp: any): { bull: number; dbull: number } {
  return {
    bull: N(pp?.bull ?? pp?.sbull ?? pp?.singleBull, 0),
    dbull: N(pp?.dBull ?? pp?.dbull ?? pp?.doubleBull, 0),
  };
}

function resolveBustFromSummary(pp: any): number {
  return N(pp?.bust ?? pp?.busted ?? pp?.busts, 0);
}

function resolveBestVisit(pp: any): number {
  return Math.max(
    N(pp?.bestVisit, 0),
    N(pp?.bestTurn, 0),
    N(pp?.bestVolley, 0)
  );
}

function resolveBestCheckout(pp: any): number {
  return Math.max(N(pp?.bestCheckout, 0), N(pp?.bestCO, 0));
}

function resolveRecordsFromSummary(pp: any): { n180: number; n140: number; n100: number } {
  const rec = pp?.records ?? pp?.tops ?? pp?.visits ?? null;

  const buckets = pp?.buckets && typeof pp.buckets === "object" ? pp.buckets : null;
  const n180 = pp?.n180 ?? pp?.count180 ?? pp?.h180 ?? rec?.n180 ?? rec?.["180"] ?? rec?.top180 ?? buckets?.["180"] ?? 0;
  const n140 = pp?.n140 ?? pp?.count140 ?? pp?.h140 ?? rec?.n140 ?? rec?.["140"] ?? rec?.top140 ?? buckets?.["140+"] ?? 0;
  const n100 = pp?.n100 ?? pp?.count100 ?? pp?.h100 ?? rec?.n100 ?? rec?.["100"] ?? rec?.top100 ?? rec?.top100Plus ?? buckets?.["100+"] ?? 0;

  return { n180: N(n180, 0), n140: N(n140, 0), n100: N(n100, 0) };
}

// ------------------------------------------------------------
// ✅ Option A : Extraction "darts brutes" ultra tolérante
// ------------------------------------------------------------

function getRecordTimestamp(r: any): number {
  return (
    N(r?.ts, 0) ||
    N(r?.endedAt, 0) ||
    N(r?.finishedAt, 0) ||
    N(r?.date, 0) ||
    N(r?.createdAt, 0) ||
    0
  );
}

function pickAnyArray(...candidates: any[]): any[] | null {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c;
  }
  return null;
}

function getRawTurns(r: any): any[] {
  // souvent : r.payload.turns / r.payload.state.turns / r.state.turns / r.turns
  const p = r?.payload ?? r?.data ?? null;
  const s = r?.state ?? p?.state ?? p?.match ?? null;

  return (
    pickAnyArray(
      r?.turns,
      r?.visits,
      p?.turns,
      p?.visits,
      s?.turns,
      s?.visits,
      s?.history,
      p?.history
    ) || []
  );
}

function getRawDartsFromTurn(turn: any): any[] {
  // patterns : turn.darts / turn.throws / turn.shots / turn.items ...
  return (
    pickAnyArray(
      turn?.darts,
      turn?.throws,
      turn?.shots,
      turn?.items,
      turn?.hits
    ) || []
  );
}

function guessOwnerId(turn: any): string | null {
  return (
    turn?.profileId ??
    turn?.playerId ??
    turn?.pid ??
    turn?.id ??
    turn?.ownerId ??
    null
  );
}

function guessDartSetIdFromTurn(turn: any): string | null {
  return (
    turn?.dartSetId ??
    turn?.dartPresetId ??
    turn?.presetId ??
    turn?.dartsetId ??
    null
  );
}

function guessBustFromTurn(turn: any): boolean {
  return (
    turn?.bust === true ||
    turn?.isBust === true ||
    turn?.busted === true ||
    false
  );
}

function dartToSegmentLabel(d: any): { label: string; mult: number; num: number | null; points: number } {
  // essaye de comprendre le tir : bull / miss / number + multiplier
  const raw = d ?? {};
  const mult =
    N(raw.multiplier, 0) ||
    N(raw.mult, 0) ||
    N(raw.m, 0) ||
    (safeLower(raw.ring) === "double" ? 2 : safeLower(raw.ring) === "triple" ? 3 : 1) ||
    1;

  // bull/miss flags
  const isMiss =
    raw.miss === true ||
    safeLower(raw.kind) === "miss" ||
    safeLower(raw.segment) === "miss" ||
    safeLower(raw.label) === "miss";

  const isBull =
    raw.bull === true ||
    safeLower(raw.segment) === "bull" ||
    safeLower(raw.segment) === "sbull" ||
    safeLower(raw.label) === "sb" ||
    safeLower(raw.label) === "bull";

  const isDBull =
    raw.dBull === true ||
    raw.dbull === true ||
    safeLower(raw.segment) === "dbull" ||
    safeLower(raw.label) === "db" ||
    safeLower(raw.label) === "dbull";

  const num =
    (Number.isFinite(Number(raw.number)) ? Number(raw.number) : null) ??
    (Number.isFinite(Number(raw.value)) ? Number(raw.value) : null) ??
    (Number.isFinite(Number(raw.n)) ? Number(raw.n) : null) ??
    null;

  // points (si déjà fourni)
  const points =
    N(raw.points, 0) ||
    N(raw.score, 0) ||
    N(raw.scored, 0) ||
    (isMiss ? 0 : isDBull ? 50 : isBull ? 25 : num ? num * mult : 0);

  if (isMiss) return { label: "MISS", mult: 0, num: null, points };
  if (isDBull) return { label: "DB", mult: 2, num: 25, points: points || 50 };
  if (isBull) return { label: "SB", mult: 1, num: 25, points: points || 25 };

  // si on a un segment string style "T20" / "D16"
  const seg = safeLower(raw.segment || raw.seg || raw.hit || "");
  if (seg) {
    const m = seg.match(/^([sdt])\s*([0-9]{1,2})$/i);
    if (m) {
      const mm = m[1].toUpperCase();
      const nn = Number(m[2]);
      const mul = mm === "T" ? 3 : mm === "D" ? 2 : 1;
      return { label: `${mm}${nn}`, mult: mul, num: nn, points: nn * mul };
    }
    if (seg === "sb" || seg === "bull") return { label: "SB", mult: 1, num: 25, points: 25 };
    if (seg === "db" || seg === "dbull") return { label: "DB", mult: 2, num: 25, points: 50 };
    if (seg === "miss") return { label: "MISS", mult: 0, num: null, points: 0 };
  }

  // sinon : on reconstruit depuis num/mult
  if (num != null && num >= 0) {
    const mm = mult === 3 ? "T" : mult === 2 ? "D" : "S";
    return { label: `${mm}${num}`, mult, num, points: num * mult };
  }

  return { label: "MISS", mult: 0, num: null, points: 0 };
}

function addSeg(map: SegmentsMap, key: string, inc = 1) {
  if (!key) return;
  map[key] = (map[key] || 0) + inc;
}

// Reconstruit stats d’un match pour un profil (et si possible setId)
function computeFromRaw(r: any, profileId: string): {
  dartSetId: string | null;
  darts: number;
  points: number;
  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull: number;
  dBull: number;
  bust: number;
  bestVisit: number;
  segments: SegmentsMap;
  visitScores: number[]; // pour records et bestVisit
} {
  const turns = getRawTurns(r);
  const segs: SegmentsMap = {};
  let darts = 0;
  let points = 0;
  let hitsS = 0,
    hitsD = 0,
    hitsT = 0,
    miss = 0,
    bull = 0,
    dBull = 0;
  let bust = 0;
  let bestVisit = 0;
  const visitScores: number[] = [];

  let pickedSetId: string | null = null;

  for (const turn of turns) {
    const owner = guessOwnerId(turn);
    if (owner && String(owner) !== String(profileId)) continue;

    const dsid = guessDartSetIdFromTurn(turn);
    if (!pickedSetId && dsid) pickedSetId = String(dsid);

    const isBust = guessBustFromTurn(turn);
    if (isBust) bust += 1;

    const dartsArr = getRawDartsFromTurn(turn);
    if (!dartsArr.length) continue;

    let visit = 0;

    for (const d of dartsArr) {
      const s = dartToSegmentLabel(d);
      darts += 1;
      points += s.points;
      visit += s.points;

      if (s.label === "MISS") {
        miss += 1;
        addSeg(segs, "MISS", 1);
        continue;
      }
      if (s.label === "SB") {
        bull += 1;
        addSeg(segs, "SB", 1);
        continue;
      }
      if (s.label === "DB") {
        dBull += 1;
        addSeg(segs, "DB", 1);
        continue;
      }

      // S/D/T
      const m = s.label.match(/^([SDT])(\d{1,2})$/);
      if (m) {
        const mm = m[1];
        if (mm === "S") hitsS += 1;
        if (mm === "D") hitsD += 1;
        if (mm === "T") hitsT += 1;
        addSeg(segs, s.label, 1);
      } else {
        addSeg(segs, s.label, 1);
      }
    }

    if (visit > 0) {
      bestVisit = Math.max(bestVisit, visit);
      visitScores.push(visit);
    }
  }

  return {
    dartSetId: pickedSetId,
    darts,
    points,
    hitsS,
    hitsD,
    hitsT,
    miss,
    bull,
    dBull,
    bust,
    bestVisit,
    segments: segs,
    visitScores,
  };
}

function mergeSegments(a: SegmentsMap, b: SegmentsMap) {
  for (const k of Object.keys(b || {})) {
    a[k] = (a[k] || 0) + (b[k] || 0);
  }
}

function computeRecordsFromVisits(visitScores: number[]) {
  let n180 = 0,
    n140 = 0,
    n100 = 0;
  for (const v of visitScores || []) {
    if (v === 180) n180 += 1;
    if (v >= 140) n140 += 1;
    if (v >= 100) n100 += 1;
  }
  return { n180, n140, n100 };
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------
export async function getX01StatsByDartSet(profileId?: string) {
  // IMPORTANT : History.list() renvoie volontairement des headers légers.
  // Pour les stats dartsets, les vraies volées / payload X01 peuvent être dans
  // le détail IndexedDB. On enrichit donc les derniers records X01 avec
  // History.get(id), sinon l'agrégateur peut trouver les sessions mais rester à 0.
  const lightRows = (await History.list?.()) || [];
  const rows: any[] = [];
  const orderedLight = [...lightRows].sort((a: any, b: any) => getRecordTimestamp(b) - getRecordTimestamp(a));
  let fullReads = 0;
  for (const r of orderedLight) {
    if (!isX01Record(r)) {
      rows.push(r);
      continue;
    }
    const id = String(r?.id ?? r?.matchId ?? "").trim();
    if (id && fullReads < 120) {
      try {
        const full = await History.get(id);
        rows.push(full || r);
        fullReads += 1;
        continue;
      } catch {}
    }
    rows.push(r);
  }
  const agg: Record<string, DartSetAgg> = {};

  // ✅ pour sparkline : on stocke les avg3 par set en ordre chrono
  const evoMap: Record<string, Array<{ t: number; avg3: number }>> = {};

  // tri ancien -> récent (plus simple pour evo)
  const ordered = [...rows].sort((a: any, b: any) => getRecordTimestamp(a) - getRecordTimestamp(b));

  for (const r of ordered) {
    if (!isX01Record(r)) continue;

    const status = r?.status ?? r?.state ?? "";
    if (status && status !== "finished") continue;

    const ts = getRecordTimestamp(r);

    const summary = r?.summary ?? r?.payload?.summary ?? null;
    const perPlayer = pickPerPlayer(summary);

    // ✅ cas 1 : summary ok
    if (perPlayer.length) {
      for (const pp of perPlayer) {
        const pid = resolveProfileId(pp);
        if (profileId && !rowMatchesProfile(r, profileId, pp)) continue;

        const dartSetId = resolveDartSetIdFromRecord(r, String(pid || profileId || ""), pp);
        if (!dartSetId) {
          // summary existe mais pas de dartSetId → fallback raw
          if (!profileId && !pid) continue;
          const raw = computeFromRaw(r, String(pid || profileId));
          const fallbackSetId = raw.dartSetId || resolveDartSetIdFromRecord(r, String(pid || profileId || ""), pp);
          if (!fallbackSetId) continue;
          const sid = String(fallbackSetId);
          const a = (agg[sid] ||= {
            dartSetId: sid,
            matches: 0,
            darts: 0,
            avg3SumPoints: 0,
            avg3SumDarts: 0,
            bestVisit: 0,
            bestCheckout: 0,
            hitsS: 0,
            hitsD: 0,
            hitsT: 0,
            miss: 0,
            bull: 0,
            dBull: 0,
            bust: 0,
            n180: 0,
            n140: 0,
            n100: 0,
            segments: {},
            evoAvg3: [],
          });

          a.matches += 1;
          a.darts += raw.darts;
          a.avg3SumPoints += raw.points;
          a.avg3SumDarts += raw.darts;
          a.bestVisit = Math.max(a.bestVisit, raw.bestVisit);
          a.hitsS += raw.hitsS;
          a.hitsD += raw.hitsD;
          a.hitsT += raw.hitsT;
          a.miss += raw.miss;
          a.bull += raw.bull;
          a.dBull += raw.dBull;
          a.bust += raw.bust;

          const rec = computeRecordsFromVisits(raw.visitScores);
          a.n180 += rec.n180;
          a.n140 += rec.n140;
          a.n100 += rec.n100;

          mergeSegments(a.segments, raw.segments);

          const avg3 = raw.darts > 0 ? (raw.points / raw.darts) * 3 : 0;
          (evoMap[sid] ||= []).push({ t: ts || Date.now(), avg3 });
          continue;
        }

        const sid = String(dartSetId);

        const a = (agg[sid] ||= {
          dartSetId: sid,
          matches: 0,
          darts: 0,
          avg3SumPoints: 0,
          avg3SumDarts: 0,
          bestVisit: 0,
          bestCheckout: 0,
          hitsS: 0,
          hitsD: 0,
          hitsT: 0,
          miss: 0,
          bull: 0,
          dBull: 0,
          bust: 0,
          n180: 0,
          n140: 0,
          n100: 0,
          segments: {},
          evoAvg3: [],
        });

        a.matches += 1;

        const d = resolveDarts(pp);
        const p = resolvePoints(pp);
        const summaryAvg3 = resolveAvg3(pp);

        // si summary ne contient vraiment ni volume ni moyenne → raw fallback pour ce match
        if (d <= 0 || (p <= 0 && summaryAvg3 <= 0)) {
          const raw = computeFromRaw(r, String(pid || profileId));
          const fallbackSetId = raw.dartSetId || resolveDartSetIdFromRecord(r, String(pid || profileId || ""), pp);
          if (fallbackSetId) {
            a.darts += raw.darts;
            a.avg3SumPoints += raw.points;
            a.avg3SumDarts += raw.darts;
            a.bestVisit = Math.max(a.bestVisit, raw.bestVisit);
            a.hitsS += raw.hitsS;
            a.hitsD += raw.hitsD;
            a.hitsT += raw.hitsT;
            a.miss += raw.miss;
            a.bull += raw.bull;
            a.dBull += raw.dBull;
            a.bust += raw.bust;

            const rec = computeRecordsFromVisits(raw.visitScores);
            a.n180 += rec.n180;
            a.n140 += rec.n140;
            a.n100 += rec.n100;

            mergeSegments(a.segments, raw.segments);

            const avg3 = raw.darts > 0 ? (raw.points / raw.darts) * 3 : 0;
            (evoMap[sid] ||= []).push({ t: ts || Date.now(), avg3 });
          }
          continue;
        }

        a.darts += d;
        a.avg3SumPoints += p;
        a.avg3SumDarts += d;

        a.bestVisit = Math.max(a.bestVisit, resolveBestVisit(pp));
        a.bestCheckout = Math.max(a.bestCheckout, resolveBestCheckout(pp));

        const hits = resolveHitsFromSummary(pp);
        a.hitsS += hits.S;
        a.hitsD += hits.D;
        a.hitsT += hits.T;
        a.miss += hits.M;

        const bulls = resolveBullsFromSummary(pp);
        a.bull += bulls.bull;
        a.dBull += bulls.dbull;

        a.bust += resolveBustFromSummary(pp);

        const rec = resolveRecordsFromSummary(pp);
        a.n180 += rec.n180;
        a.n140 += rec.n140;
        a.n100 += rec.n100;

        // ✅ segments : si non dispo dans summary → raw fallback pour segments uniquement
        const segSummary = pp?.segmentsByHit ?? pp?.hitsBySegment ?? pp?.segmentsMap ?? null;
        if (segSummary && typeof segSummary === "object") {
          mergeSegments(a.segments, segSummary);
        } else {
          const raw = computeFromRaw(r, String(pid || profileId));
          mergeSegments(a.segments, raw.segments);
        }

        const avg3 = summaryAvg3 > 0 ? summaryAvg3 : d > 0 ? (p / d) * 3 : 0;
        (evoMap[sid] ||= []).push({ t: ts || Date.now(), avg3 });
      }

      continue;
    }

    // ✅ cas 2 : pas de summary du tout → raw obligatoire
    if (profileId) {
      const raw = computeFromRaw(r, String(profileId));
      const fallbackSetId = raw.dartSetId || resolveDartSetIdFromRecord(r, String(profileId), null);
      if (!fallbackSetId) continue;
      const sid = String(fallbackSetId);

      const a = (agg[sid] ||= {
        dartSetId: sid,
        matches: 0,
        darts: 0,
        avg3SumPoints: 0,
        avg3SumDarts: 0,
        bestVisit: 0,
        bestCheckout: 0,
        hitsS: 0,
        hitsD: 0,
        hitsT: 0,
        miss: 0,
        bull: 0,
        dBull: 0,
        bust: 0,
        n180: 0,
        n140: 0,
        n100: 0,
        segments: {},
        evoAvg3: [],
      });

      a.matches += 1;
      a.darts += raw.darts;
      a.avg3SumPoints += raw.points;
      a.avg3SumDarts += raw.darts;
      a.bestVisit = Math.max(a.bestVisit, raw.bestVisit);
      a.hitsS += raw.hitsS;
      a.hitsD += raw.hitsD;
      a.hitsT += raw.hitsT;
      a.miss += raw.miss;
      a.bull += raw.bull;
      a.dBull += raw.dBull;
      a.bust += raw.bust;

      const rec = computeRecordsFromVisits(raw.visitScores);
      a.n180 += rec.n180;
      a.n140 += rec.n140;
      a.n100 += rec.n100;

      mergeSegments(a.segments, raw.segments);

      const avg3 = raw.darts > 0 ? (raw.points / raw.darts) * 3 : 0;
      (evoMap[sid] ||= []).push({ t: getRecordTimestamp(r) || Date.now(), avg3 });
    }
  }

  // finalize
  const out: DartSetAggOut[] = Object.values(agg).map((a) => {
    const avg3 = a.avg3SumDarts > 0 ? (a.avg3SumPoints / a.avg3SumDarts) * 3 : 0;

    // sparkline : on garde 16 derniers points (ancien -> récent)
    const evo = (evoMap[a.dartSetId] || [])
      .sort((x, y) => x.t - y.t)
      .slice(-16)
      .map((x) => N(x.avg3, 0));

    return { ...a, avg3, evoAvg3: evo };
  });

  out.sort((x, y) => y.matches - x.matches || y.avg3 - x.avg3);
  return out;
}

export async function getX01StatsByDartSetForProfile(profileId: string) {
  return getX01StatsByDartSet(profileId);
}
