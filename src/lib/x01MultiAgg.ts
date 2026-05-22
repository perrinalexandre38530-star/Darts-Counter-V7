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
  const nested: any = payload?.payload ?? null;
  const summary: any = (rec as any)?.summary ?? payload?.summary ?? nested?.summary ?? null;

  const findLiveForPid = () => {
    const candidates = [
      payload?.resume?.state?.liveStatsByPlayer,
      payload?.summary?.liveStatsByPlayer,
      payload?.payload?.d?.s?.livestatsbyplayer,
      payload?.payload?.d?.s?.liveStatsByPlayer,
      nested?.resume?.state?.liveStatsByPlayer,
      nested?.summary?.liveStatsByPlayer,
      (rec as any)?.resume?.state?.liveStatsByPlayer,
      (rec as any)?.summary?.liveStatsByPlayer,
    ];
    for (const map of candidates) {
      const v = x01FindMapValue(map, [String(pid || '')]);
      if (v && typeof v === 'object') return v;
    }
    return null;
  };

  const live = findLiveForPid();
  const liveDarts = live && (Array.isArray(live.dartsDetail) ? live.dartsDetail : Array.isArray(live.dartsdetail) ? live.dartsdetail : []);
  if (live && Array.isArray(liveDarts) && liveDarts.length) {
    const scores = Array.isArray(live.scorePerVisit) ? live.scorePerVisit : Array.isArray(live.scorepervisit) ? live.scorepervisit : [];
    const visits: any[] = [];
    for (let i = 0; i < liveDarts.length; i += 3) {
      const chunk = liveDarts.slice(i, i + 3).map(parseDart);
      const score = Number(scores[Math.floor(i / 3)] ?? chunk.reduce((sum: number, d: any) => sum + dartScore(d), 0)) || 0;
      const finish = Number(live.bestCheckout ?? live.bc ?? 0) > 0 && Math.floor(i / 3) === Math.max(0, scores.length - 1);
      visits.push({ bust: false, finish, score, segments: chunk });
    }
    return visits;
  }
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


function x01NormName(v: any): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function x01IdMatches(a: any, b: any): boolean {
  const aa = String(a ?? "").replace(/^online:/, "").trim();
  const bb = String(b ?? "").replace(/^online:/, "").trim();
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  return aa.length >= 12 && bb.length >= 12 && (aa.startsWith(bb) || bb.startsWith(aa));
}

function x01PlayerIds(p: any): string[] {
  return [p?.id, p?.playerId, p?.profileId, p?.sourceId, p?.sourcePlayerId, p?.sourceProfileId, p?.userId, p?.uid, ...(Array.isArray(p?.aliases) ? p.aliases : [])]
    .filter((v) => v !== undefined && v !== null)
    .map((v) => String(v).replace(/^online:/, "").trim())
    .filter(Boolean);
}

function x01FindMapValue(map: any, ids: string[]): any {
  if (!map || typeof map !== "object") return undefined;
  for (const id of ids) {
    if (map[id] !== undefined) return map[id];
    const k = Object.keys(map).find((key) => x01IdMatches(key, id));
    if (k) return map[k];
  }
  return undefined;
}

function x01ReadNum(...vals: any[]): number {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function computeX01MultiAgg(records: SavedMatch[], playerId: string, playerName?: string) {
  const out = {
    sessions: 0,
    darts: 0,
    sumAvg3D: 0,
    bestVisit: 0,
    bestCheckout: 0,
    best9Score: 0,
    legsWin: 0,
    setsWin: 0,
    hitsSingle: 0,
    hitsDouble: 0,
    hitsTriple: 0,
    hitsBull: 0,
    hitsDBull: 0,
    miss: 0,
    bust: 0,
    byNumber: Array(21).fill(0),
    visitBuckets: { "50+": 0, "60+": 0, "80+": 0, "100+": 0, "120+": 0, "140+": 0, "180": 0 } as Record<string, number>,
    checkoutAttempts: 0,
    checkoutHits: 0,
    dartsCo: 0,
    first9_100: 0,
    first9_120: 0,
    first9_140: 0,
    progression: [] as { avg3D: number; ts: number }[],
  };

  const seen = new Set<string>();
  for (const rec of records) {
    if (!isX01Match(rec)) continue;
    if ((rec as any).status && (rec as any).status !== "finished") continue;
    if ((rec as any).id && seen.has((rec as any).id)) continue;
    if ((rec as any).id) seen.add((rec as any).id);

    const players = pickPlayers(rec);
    const pname = x01NormName(playerName);
    const matched = players.find((p: any) => x01PlayerIds(p).some((id) => x01IdMatches(id, playerId))) || (pname ? players.find((p: any) => x01NormName(p?.name || p?.displayName || p?.nickname) === pname) : undefined);
    if (!matched?.id && !matched?.playerId && !matched?.profileId) continue;

    const matchedIds = Array.from(new Set([...x01PlayerIds(matched), String(playerId || "")].filter(Boolean)));
    const canonicalMatchedId = String(matched.id || matched.playerId || matched.profileId || matchedIds[0] || "");
    const order = players.map((p: any) => String(p?.id || p?.playerId || p?.profileId || "")).filter(Boolean);
    const visits = extractVisits(rec, canonicalMatchedId, order);

    out.sessions++;
    let darts = 0;
    let scored = 0;
    let bestVisit = 0;
    let bestCO = 0;
    const flatScores: number[] = [];

    for (const v of visits) {
      darts += v.segments.length;
      if (!v.bust) {
        scored += v.score;
        bestVisit = Math.max(bestVisit, v.score);
        // Seuils cumulés demandés pour la répartition des vraies volées X01.
        if (v.score >= 50) out.visitBuckets["50+"] += 1;
        if (v.score >= 60) out.visitBuckets["60+"] += 1;
        if (v.score >= 80) out.visitBuckets["80+"] += 1;
        if (v.score >= 100) out.visitBuckets["100+"] += 1;
        if (v.score >= 120) out.visitBuckets["120+"] += 1;
        if (v.score >= 140) out.visitBuckets["140+"] += 1;
        if (v.score >= 180) out.visitBuckets["180"] += 1;
        if (v.finish) { bestCO = Math.max(bestCO, v.score); out.checkoutHits += 1; out.dartsCo += Math.max(1, v.segments.length); }
      } else {
        out.bust += 1;
      }
      for (const s of v.segments) {
        flatScores.push(v.bust ? 0 : dartScore(s));
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

    if (flatScores.length >= 9) {
      const first9 = flatScores.slice(0, 9).reduce((a, b) => a + (Number(b) || 0), 0);
      out.best9Score = Math.max(out.best9Score, first9);
      if (first9 >= 100) out.first9_100 += 1;
      if (first9 >= 120) out.first9_120 += 1;
      if (first9 >= 140) out.first9_140 += 1;
    }

    const anyRec: any = rec as any;
    const payload: any = anyRec?.payload ?? null;
    const summary: any = anyRec?.summary ?? payload?.summary ?? null;
    const pickMapValue = (...maps: any[]) => {
      for (const map of maps) {
        const val = x01FindMapValue(map, matchedIds);
        if (Number.isFinite(Number(val))) return Number(val);
      }
      return 0;
    };
    const rankings = Array.isArray(summary?.rankings) ? summary.rankings : Array.isArray(payload?.summary?.rankings) ? payload.summary.rankings : [];
    const rankHit = rankings.find((rr: any) => x01PlayerIds(rr).some((id) => matchedIds.some((a) => x01IdMatches(id, a))) || (pname && x01NormName(rr?.name) === pname));
    const legsFromSummary = pickMapValue(summary?.legsWonByPlayer, summary?.legsWinByPlayer, summary?.legsByPlayer, payload?.summary?.legsWonByPlayer) || x01ReadNum(rankHit?.legsWon, rankHit?.lw);
    const setsFromSummary = pickMapValue(summary?.setsWonByPlayer, summary?.setsWinByPlayer, summary?.setsByPlayer, payload?.summary?.setsWonByPlayer) || x01ReadNum(rankHit?.setsWon, rankHit?.sw);
    out.legsWin += legsFromSummary;
    out.setsWin += setsFromSummary;
    const winnerId = String(anyRec?.winnerId ?? summary?.winnerId ?? payload?.winnerId ?? payload?.summary?.winnerId ?? "");
    if (legsFromSummary <= 0 && matchedIds.some((id) => x01IdMatches(winnerId, id))) out.legsWin += 1;

    const detailed = x01FindMapValue(summary?.detailedByPlayer, matchedIds) || x01FindMapValue(summary?.detailedbyplayer, matchedIds) || null;
    if (visits.length) {
      const detailedForAttempts = detailed && typeof detailed === "object" ? detailed : null;
      const attemptsFromDetail = x01ReadNum(detailedForAttempts?.checkoutAttempts, detailedForAttempts?.checkoutattempts, detailedForAttempts?.co, detailedForAttempts?.checkouts);
      out.checkoutAttempts += attemptsFromDetail || (bestCO > 0 ? 1 : 0);
      out.darts += darts;
      const avg3 = darts > 0 ? (scored / darts) * 3 : 0;
      out.sumAvg3D += avg3;
      out.bestVisit = Math.max(out.bestVisit, bestVisit);
      out.bestCheckout = Math.max(out.bestCheckout, bestCO);
      out.progression.push({ avg3D: avg3, ts: (rec as any).updatedAt ?? (rec as any).createdAt ?? Date.now() });
    } else if (detailed && typeof detailed === "object") {
      const d = x01ReadNum(detailed.darts, detailed.dt, detailed.dartsThrown);
      const avg3 = x01ReadNum(detailed.avg3, detailed.avg3D, detailed.avg3d);
      out.darts += d;
      out.sumAvg3D += avg3;
      out.bestVisit = Math.max(out.bestVisit, x01ReadNum(detailed.bestVisit, detailed.bv));
      out.bestCheckout = Math.max(out.bestCheckout, x01ReadNum(detailed.bestCheckout, detailed.bc));
      out.hitsSingle += x01ReadNum(detailed.hits?.S, detailed.hits?.s, detailed.hitsSingle, detailed.hitssingle);
      out.hitsDouble += x01ReadNum(detailed.hits?.D, detailed.hits?.d, detailed.hitsDouble, detailed.hitsdouble);
      out.hitsTriple += x01ReadNum(detailed.hits?.T, detailed.hits?.t, detailed.hitsTriple, detailed.hitstriple);
      out.miss += x01ReadNum(detailed.hits?.M, detailed.hits?.m, detailed.miss);
      out.bust += x01ReadNum(detailed.bust);
      out.hitsBull += x01ReadNum(detailed.bull, detailed.hits?.Bull, detailed.hits?.bull);
      out.hitsDBull += x01ReadNum(detailed.dBull, detailed.dbull, detailed.hits?.DBull, detailed.hits?.dbull);
      const spv = Array.isArray(detailed.scorePerVisit) ? detailed.scorePerVisit : Array.isArray(detailed.scorepervisit) ? detailed.scorepervisit : [];
      for (const score of spv) {
        const sc = Number(score || 0);
        if (sc >= 50) out.visitBuckets["50+"] += 1;
        if (sc >= 60) out.visitBuckets["60+"] += 1;
        if (sc >= 80) out.visitBuckets["80+"] += 1;
        if (sc >= 100) out.visitBuckets["100+"] += 1;
        if (sc >= 120) out.visitBuckets["120+"] += 1;
        if (sc >= 140) out.visitBuckets["140+"] += 1;
        if (sc >= 180) out.visitBuckets["180"] += 1;
      }
      const coAttempts = x01ReadNum(detailed.checkoutAttempts, detailed.checkoutattempts, detailed.co, detailed.checkouts);
      const coHits = x01ReadNum(detailed.checkoutHits, detailed.checkoutSuccess, detailed.checkoutsuccess, detailed.coHits, detailed.cohits) || (x01ReadNum(detailed.bestCheckout, detailed.bc) > 0 ? 1 : 0);
      out.checkoutAttempts += coAttempts || (coHits > 0 ? 1 : 0);
      out.checkoutHits += coHits;
      out.dartsCo += x01ReadNum(detailed.dartsCo, detailed.checkoutDarts, detailed.checkoutdarts) || (coHits > 0 ? 1 : 0);

      const dd = Array.isArray(detailed.dartsDetail) ? detailed.dartsDetail : Array.isArray(detailed.dartsdetail) ? detailed.dartsdetail : [];
      if (dd.length >= 9) {
        const first9 = dd.slice(0, 9).map(parseDart).reduce((sum: number, d: any) => sum + dartScore(d), 0);
        out.best9Score = Math.max(out.best9Score, first9);
        if (first9 >= 100) out.first9_100 += 1;
        if (first9 >= 120) out.first9_120 += 1;
        if (first9 >= 140) out.first9_140 += 1;
      } else if (spv.length >= 3) {
        const first9 = spv.slice(0, 3).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
        out.best9Score = Math.max(out.best9Score, first9);
        if (first9 >= 100) out.first9_100 += 1;
        if (first9 >= 120) out.first9_120 += 1;
        if (first9 >= 140) out.first9_140 += 1;
      }

      const hbs = detailed.hitsBySegment || detailed.hitsbysegment || detailed.bySegment || detailed.bysegment || {};
      if (hbs && typeof hbs === "object") {
        Object.entries(hbs).forEach(([seg, val]: any) => {
          const k = Number(seg);
          if (k >= 1 && k <= 20) out.byNumber[k] += x01ReadNum(val?.S, val?.s) + x01ReadNum(val?.D, val?.d) + x01ReadNum(val?.T, val?.t);
        });
      }
      out.progression.push({ avg3D: avg3, ts: (rec as any).updatedAt ?? (rec as any).createdAt ?? Date.now() });
    }
  }

  out.progression.sort((a, b) => a.ts - b.ts);
  return out;
}
