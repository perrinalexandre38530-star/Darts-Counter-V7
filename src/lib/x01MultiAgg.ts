// ============================================================
// x01MultiAgg.ts — Agrégation complète X01 Multi
// Source fiable : historique X01 + replay de fléchettes/volées
// ============================================================

import type { SavedMatch, PlayerLite } from "./types";

const N = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);

function lower(v: any) { return String(v ?? "").toLowerCase().trim(); }

export function isX01Match(rec: SavedMatch): boolean {
  const payload: any = (rec as any)?.payload ?? null;
  const nested: any = payload?.payload ?? null;
  const summary: any = (rec as any)?.summary ?? payload?.summary ?? nested?.summary ?? null;
  const cfg: any = (rec as any)?.config ?? payload?.config ?? nested?.config ?? null;
  const values = [
    (rec as any)?.kind, (rec as any)?.mode, (rec as any)?.variant, (rec as any)?.game,
    payload?.kind, payload?.mode, payload?.variant, payload?.game, payload?.gameMode,
    nested?.kind, nested?.mode, nested?.variant, nested?.game, nested?.gameMode,
    summary?.kind, summary?.mode, summary?.variant, summary?.game?.mode,
    cfg?.kind, cfg?.mode, cfg?.variant, cfg?.gameMode,
  ].map(lower);
  return values.some((k) => k === "x01" || k === "x01v3" || k.includes("x01"));
}

function pickPlayers(rec: any): PlayerLite[] {
  const payload = rec?.payload ?? null;
  const nested = payload?.payload ?? null;
  const arr = rec?.players || rec?.summary?.players || payload?.players || payload?.config?.players || nested?.players || nested?.config?.players || [];
  return Array.isArray(arr) ? arr : [];
}

function parseDart(raw: any): { value: number; mult: number } {
  const label = String(raw?.label ?? raw?.segmentLabel ?? raw?.dart ?? raw?.hit ?? "").trim().toUpperCase();
  let value = Number(raw?.segment ?? raw?.v ?? raw?.value ?? raw?.num ?? raw?.number ?? 0) || 0;
  let mult = Number(raw?.multiplier ?? raw?.mult ?? raw?.m ?? raw?.multi ?? 0) || 0;
  if (!value && label) {
    if (label === "MISS" || label === "M" || label === "0") { value = 0; mult = 0; }
    else if (label === "BULL" || label === "SBULL" || label === "OB") { value = 25; mult = 1; }
    else if (label === "DBULL" || label === "IB" || label === "D-BULL" || label === "DOUBLEBULL") { value = 25; mult = 2; }
    else {
      const m = label.match(/^([SDT])?(\d{1,2})$/);
      if (m) { value = Number(m[2]) || 0; mult = m[1] === "T" ? 3 : m[1] === "D" ? 2 : 1; }
    }
  }
  if (value > 25) {
    const rawScore = Number(raw?.score ?? raw?.points ?? raw?.total ?? raw?.value);
    if (rawScore === 50) { value = 25; mult = 2; }
    else value = 0;
  }
  if (!mult) mult = value > 0 ? 1 : 0;
  if (value === 25 && mult > 2) mult = 2;
  if (![0,1,2,3].includes(mult)) mult = value > 0 ? 1 : 0;
  return { value, mult };
}

function dartScore(d: { value: number; mult: number }) {
  if (!d.value || !d.mult) return 0;
  return d.value === 25 && d.mult === 2 ? 50 : d.value * d.mult;
}

function extractRawDarts(rec: any): any[] {
  const payload = rec?.payload ?? null;
  const nested = payload?.payload ?? null;
  const arr =
    payload?.replayDarts || payload?.darts || payload?.allDarts || payload?.summary?.replayDarts ||
    rec?.summary?.replayDarts || rec?.summary?.dartsReplay || rec?.resume?.darts || rec?.darts ||
    nested?.replayDarts || nested?.darts || [];
  return Array.isArray(arr) ? arr : [];
}

function extractVisits(rec: SavedMatch, pid: string, order: string[] = []) {
  const payload: any = (rec as any).payload ?? null;
  const summary: any = (rec as any)?.summary ?? payload?.summary ?? null;
  const explicit =
    payload?.visitHistory ?? payload?.visitsHistory ?? payload?.__legStats?.visits ??
    summary?.visitHistory ?? summary?.visitsHistory ?? summary?.__legStats?.visits ?? summary?.legacy?.visitHistory ??
    payload?.visits ?? (rec as any).engineState?.visits ?? (rec as any).visits ?? [];
  if (Array.isArray(explicit) && explicit.length) {
    return explicit
      .filter((v: any) => String(v?.p ?? v?.playerId ?? v?.pid ?? "") === String(pid))
      .map((v: any) => {
        const segments = Array.isArray(v.segments) ? v.segments.map(parseDart) : (Array.isArray(v.darts) ? v.darts.map(parseDart) : []);
        const before = N(v.scoreBefore ?? v.before ?? 0);
        const after = N(v.scoreAfter ?? v.after ?? 0);
        const bust = !!(v.bust ?? v.isBust);
        const rawScore = N(v.score ?? v.total ?? (!bust && before ? Math.max(0, before - after) : 0) ?? segments.reduce((s: number, d: any) => s + dartScore(d), 0));
        return { bust, finish: !!(v.finish ?? v.isFinish ?? v.checkout) || (!bust && before > 0 && after === 0), score: rawScore, segments };
      });
  }

  const rawDarts = extractRawDarts(rec);
  if (!rawDarts.length) return [];

  const dartPid = (r: any) => String(r?.playerId ?? r?.pid ?? r?.p ?? r?.profileId ?? "").trim();
  const hasTagged = rawDarts.some((d) => dartPid(d));
  const startScore = N((rec as any)?.config?.startScore ?? payload?.config?.startScore ?? payload?.startScore ?? (rec as any)?.summary?.game?.startScore ?? 501) || 501;
  const scores: Record<string, number> = {};
  const safeOrder = order.filter(Boolean);
  for (const id of safeOrder) scores[id] = startScore;
  if (scores[pid] == null) scores[pid] = startScore;

  const visits: Array<{ bust: boolean; finish: boolean; score: number; segments: Array<{ value: number; mult: number }> }> = [];
  let currentPid = "";
  let current: Array<{ value: number; mult: number }> = [];
  let fallbackVisit = 0;
  let fallbackDartInVisit = 0;

  const flush = () => {
    if (!currentPid || !current.length) { currentPid = ""; current = []; return; }
    const before = N(scores[currentPid] ?? startScore) || startScore;
    let after = before;
    let rawTotal = 0;
    let bust = false;
    let finish = false;
    for (const d of current) {
      const sc = dartScore(d);
      rawTotal += sc;
      const tentative = after - sc;
      if (tentative < 0 || tentative === 1) { bust = true; after = before; break; }
      after = tentative;
      if (after === 0) { finish = true; break; }
    }
    const score = bust ? 0 : Math.max(0, before - after || rawTotal);
    scores[currentPid] = after;
    if (currentPid === String(pid)) visits.push({ bust, finish, score, segments: current });
    currentPid = "";
    current = [];
  };

  for (const raw of rawDarts) {
    let p = dartPid(raw);
    if (!p && !hasTagged && safeOrder.length) {
      p = safeOrder[fallbackVisit % safeOrder.length] || "";
      fallbackDartInVisit += 1;
      if (fallbackDartInVisit >= 3) { fallbackDartInVisit = 0; fallbackVisit += 1; }
    }
    if (!p) continue;
    if (currentPid !== p || current.length >= 3) { flush(); currentPid = p; }
    current.push(parseDart(raw));
  }
  flush();
  return visits;
}

export function computeX01MultiAgg(records: SavedMatch[], playerId: string, playerName?: string) {
  const out = {
    sessions: 0,
    darts: 0,
    sumAvg3D: 0,
    bestVisit: 0,
    bestCheckout: 0,
    hitsSingle: 0,
    hitsDouble: 0,
    hitsTriple: 0,
    hitsBull: 0,
    hitsDBull: 0,
    miss: 0,
    bust: 0,
    byNumber: Array(21).fill(0),
    visitBuckets: { "0-59": 0, "60-99": 0, "100+": 0, "140+": 0, "180": 0 } as Record<string, number>,
    progression: [] as { avg3D: number; ts: number }[],
  };

  const seen = new Set<string>();
  for (const rec of records) {
    if (!isX01Match(rec)) continue;
    if ((rec as any).status && (rec as any).status !== "finished") continue;
    if ((rec as any).id && seen.has((rec as any).id)) continue;
    if ((rec as any).id) seen.add((rec as any).id);

    const players = pickPlayers(rec);
    const pname = (playerName || "").trim().toLowerCase();
    const matched = players.find((p: any) => String(p?.id) === String(playerId)) || (pname ? players.find((p: any) => String(p?.name || "").trim().toLowerCase() === pname) : undefined);
    if (!matched?.id) continue;

    const order = players.map((p: any) => String(p?.id || "")).filter(Boolean);
    const visits = extractVisits(rec, String(matched.id), order);
    if (!visits.length) continue;

    out.sessions++;
    let darts = 0;
    let scored = 0;
    let bestVisit = 0;
    let bestCO = 0;

    for (const v of visits) {
      darts += v.segments.length;
      if (!v.bust) {
        scored += v.score;
        bestVisit = Math.max(bestVisit, v.score);
        if (v.score >= 180) out.visitBuckets["180"] += 1;
        else if (v.score >= 140) out.visitBuckets["140+"] += 1;
        else if (v.score >= 100) out.visitBuckets["100+"] += 1;
        else if (v.score >= 60) out.visitBuckets["60-99"] += 1;
        else out.visitBuckets["0-59"] += 1;
        if (v.finish) bestCO = Math.max(bestCO, v.score);
      } else {
        out.bust += 1;
      }
      for (const s of v.segments) {
        if (s.value === 25 && s.mult === 1) out.hitsBull++;
        else if (s.value === 25 && s.mult === 2) out.hitsDBull++;
        else if (s.value === 0 || s.mult === 0) out.miss++;
        else {
          if (s.value >= 1 && s.value <= 20) out.byNumber[s.value] += 1;
          if (s.mult === 1) out.hitsSingle++;
          else if (s.mult === 2) out.hitsDouble++;
          else if (s.mult === 3) out.hitsTriple++;
        }
      }
    }

    out.darts += darts;
    const avg3 = darts > 0 ? (scored / darts) * 3 : 0;
    out.sumAvg3D += avg3;
    out.bestVisit = Math.max(out.bestVisit, bestVisit);
    out.bestCheckout = Math.max(out.bestCheckout, bestCO);
    out.progression.push({ avg3D: avg3, ts: (rec as any).updatedAt ?? (rec as any).createdAt ?? Date.now() });
  }

  out.progression.sort((a, b) => a.ts - b.ts);
  return out;
}
