// @ts-nocheck
import { History } from "./history";
import { loadStore } from "./storage";

export type X01Scope = "local" | "online" | "training";
export type X01PlayerSample = {
  id: string;
  matchId: string;
  createdAt: number;
  scope: X01Scope;
  playerId: string;
  playerName: string;
  winnerId?: string | null;
  winnerName?: string | null;
  matchesPlayed: number;
  matchesWon: number;
  legsWon: number;
  setsWon: number;
  darts: number;
  totalScore: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  best9Score: number;
  scorePerVisit: number[];
  h50: number;
  h60: number;
  h80: number;
  h100: number;
  h120: number;
  h140: number;
  h180: number;
  miss: number;
  singleHits: number;
  doubleHits: number;
  tripleHits: number;
  bull25: number;
  bull50: number;
  bust: number;
  coAttempts: number;
  coSuccess: number;
};

export type X01Agg = {
  count: number;
  matchesPlayed: number;
  matchesWon: number;
  legsWon: number;
  setsWon: number;
  darts: number;
  totalScore: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  best9Score: number;
  h50: number;
  h60: number;
  h80: number;
  h100: number;
  h120: number;
  h140: number;
  h180: number;
  miss: number;
  singleHits: number;
  doubleHits: number;
  tripleHits: number;
  bull25: number;
  bull50: number;
  bust: number;
  coAttempts: number;
  coSuccess: number;
};

const num = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function walkObjects(root: any, maxDepth = 5): any[] {
  const out: any[] = [];
  const seen = new WeakSet<object>();
  const walk = (x: any, depth: number) => {
    if (!x || typeof x !== "object" || Array.isArray(x) || depth > maxDepth) return;
    if (seen.has(x)) return;
    seen.add(x);
    out.push(x);
    for (const key of ["payload", "summary", "state", "state_json", "finalState", "data", "resume", "compact", "d", "s", "config", "game", "stats", "meta"]) {
      const v = x?.[key];
      if (v && typeof v === "object" && !Array.isArray(v)) walk(v, depth + 1);
    }
  };
  walk(root, 0);
  return out;
}

function deepStringBag(root: any): string {
  const vals: string[] = [];
  for (const obj of walkObjects(root, 5)) {
    for (const [k, v] of Object.entries(obj)) {
      const lk = String(k).toLowerCase();
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        if (/mode|kind|source|online|lobby|room|sport|variant|status|type|game|start/.test(lk)) vals.push(String(v));
      }
    }
  }
  return vals.map((v) => String(v ?? "").trim().toLowerCase()).filter(Boolean).join("|");
}

function deepFirst(root: any, keys: string[]): any {
  const want = new Set(keys.map((k) => k.toLowerCase()));
  for (const obj of walkObjects(root, 5)) {
    for (const [k, v] of Object.entries(obj)) {
      if (want.has(String(k).toLowerCase()) && v !== undefined && v !== null && v !== "") return v;
    }
  }
  return undefined;
}

function looksLikeStatsMap(x: any): boolean {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const vals = Object.values(x);
  if (!vals.length) return false;
  return vals.some((v: any) => v && typeof v === "object" && (
    "darts" in v || "dt" in v || "dartsThrown" in v || "totalScore" in v || "totalscore" in v || "hits" in v || "scorePerVisit" in v || "scorepervisit" in v
  ));
}

export function normText(v: any): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function idLooseMatch(a: any, b: any): boolean {
  const aa = String(a ?? "").trim();
  const bb = String(b ?? "").trim();
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  if (aa.length >= 14 && bb.length >= 14 && (aa.startsWith(bb) || bb.startsWith(aa))) return true;
  return false;
}

export function profileMatchesPlayer(profile: any, playerLike: any, key?: any): boolean {
  if (!profile) return false;
  const ids = [profile.id, profile.profileId, profile.playerId, profile.uid, profile._id].filter(Boolean);
  const pNames = [profile.name, profile.displayName, profile.nickname, profile.surname].map(normText).filter(Boolean);
  const candidates = [key, playerLike?.id, playerLike?.profileId, playerLike?.playerId, playerLike?.pid, playerLike?.uid, playerLike?._id].filter(Boolean);
  for (const a of ids) for (const b of candidates) if (idLooseMatch(a, b)) return true;
  const n = normText(playerLike?.name ?? playerLike?.playerName ?? playerLike?.profileName ?? playerLike?.displayName ?? key);
  if (n && pNames.includes(n)) return true;
  return false;
}

export function collectPlayers(rec: any): any[] {
  const out: any[] = [];
  const push = (arr: any) => { if (Array.isArray(arr)) arr.forEach((p) => p && out.push(p)); };
  for (const obj of walkObjects(rec, 5)) {
    push(obj?.players);
    push(obj?.rankings);
    push(obj?.perPlayer);
    if (obj?.pn && Array.isArray(obj?.p)) {
      push(Object.entries(obj.pn).map(([i, name]) => ({ id: obj.p?.[Number(i)], name })));
    }
  }
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = String(p?.id ?? p?.profileId ?? p?.playerId ?? p?.pid ?? p?.uid ?? p?.name ?? p?.playerName ?? JSON.stringify(p));
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function findProfileForPlayer(profiles: any[], playerLike: any, key?: any): any | null {
  for (const p of profiles || []) if (profileMatchesPlayer(p, playerLike, key)) return p;
  return null;
}

export function isX01Record(rec: any): boolean {
  const bag = deepStringBag(rec);
  if (/x01|x01v3|x01_online|training_x01|training-x01/.test(bag)) return true;
  const startScore = deepFirst(rec, ["startScore", "startscore", "x01StartScore"]);
  const n = num(startScore);
  return [301, 501, 701, 901].includes(n);
}

export function isTrainingRecord(rec: any): boolean {
  const bag = deepStringBag(rec);
  return bag.includes("training_x01") || bag.includes("training-x01") || bag.includes("trainingx01");
}

export function isOnlineRecord(rec: any): boolean {
  for (const obj of walkObjects(rec, 5)) {
    if (obj?.online === true || obj?.isOnline === true || obj?.onlineV10 === true || obj?.onlineMatch === true) return true;
    const code = obj?.lobbyCode ?? obj?.onlineLobbyCode ?? obj?.lobbyId ?? obj?.roomCode ?? obj?.roomId ?? obj?.code;
    if (code && String(code).trim().length >= 3) return true;
  }
  const bag = deepStringBag(rec);
  return /online|nas-online|x01_online|online_lobby|online-match|onlinematch/.test(bag);
}



function scoreOfDart(d: any): number {
  const seg = num(d?.segment, num(d?.v, num(d?.value, 0)));
  const mult = num(d?.multiplier, num(d?.mult, num(d?.m, 1))) || 1;
  if (d?.isMiss || d?.ismiss || seg === 0 || String(d?.code || "").toUpperCase() === "MISS") return 0;
  if (seg === 25 && mult === 2) return 50;
  if (seg === 25) return 25;
  return seg * mult;
}

function findReplayDarts(root: any): any[] {
  for (const obj of walkObjects(root, 6)) {
    for (const key of ["__x01OnlineDarts", "replayDarts", "dartsDetail", "dartsdetail", "darts"]) {
      const arr = obj?.[key];
      if (Array.isArray(arr) && arr.some((d: any) => d && typeof d === "object" && ("playerId" in d || "pid" in d || "profileId" in d))) return arr;
    }
  }
  return [];
}

function buildStatsMapFromReplay(rec: any): any | null {
  const darts = findReplayDarts(rec);
  if (!darts.length) return null;
  const out: Record<string, any> = {};
  const visitAcc: Record<string, { n: number; sum: number }> = {};
  const finishVisit = (pid: string) => {
    const acc = visitAcc[pid];
    if (!acc || acc.n <= 0) return;
    out[pid].scorePerVisit.push(acc.sum);
    out[pid].bestVisit = Math.max(out[pid].bestVisit, acc.sum);
    visitAcc[pid] = { n: 0, sum: 0 };
  };
  for (const d of darts) {
    const pid = String(d?.playerId ?? d?.pid ?? d?.profileId ?? d?.id ?? "").trim();
    if (!pid) continue;
    if (!out[pid]) out[pid] = { darts: 0, totalScore: 0, bestVisit: 0, hits: { S: 0, D: 0, T: 0, M: 0, Bull: 0, DBull: 0 }, scorePerVisit: [], miss: 0, bust: 0 };
    if (!visitAcc[pid]) visitAcc[pid] = { n: 0, sum: 0 };
    const seg = num(d?.segment, num(d?.v, num(d?.value, 0)));
    const mult = num(d?.multiplier, num(d?.mult, num(d?.m, 1))) || 1;
    const sc = scoreOfDart(d);
    out[pid].darts += 1;
    out[pid].totalScore += sc;
    if (d?.isBust || d?.isbust || d?.bust) out[pid].bust += 1;
    if (sc <= 0 || seg === 0 || d?.isMiss || d?.ismiss) { out[pid].hits.M += 1; out[pid].miss += 1; }
    else if (seg === 25 && mult === 2) out[pid].hits.DBull += 1;
    else if (seg === 25) out[pid].hits.Bull += 1;
    else if (mult === 3) out[pid].hits.T += 1;
    else if (mult === 2) out[pid].hits.D += 1;
    else out[pid].hits.S += 1;
    visitAcc[pid].n += 1;
    visitAcc[pid].sum += sc;
    if (visitAcc[pid].n >= 3 || d?.endsVisit || d?.visitEnd) finishVisit(pid);
  }
  Object.keys(visitAcc).forEach(finishVisit);
  for (const [pid, st] of Object.entries(out)) {
    const thresholds = countVisitsFromScores((st as any).scorePerVisit);
    Object.assign(st as any, thresholds);
    (st as any).avg3 = (st as any).darts > 0 ? ((st as any).totalScore / (st as any).darts) * 3 : 0;
  }
  return out;
}

function mapsFromRec(rec: any): any[] {
  const out: any[] = [];
  const add = (x: any) => { if (looksLikeStatsMap(x)) out.push(x); };
  add(buildStatsMapFromReplay(rec));
  for (const obj of walkObjects(rec, 5)) {
    add(obj?.detailedByPlayer);
    add(obj?.detailedbyplayer);
    add(obj?.perPlayer && Array.isArray(obj.perPlayer) ? Object.fromEntries(obj.perPlayer.map((p: any, i: number) => [String(p?.id ?? p?.profileId ?? p?.playerId ?? p?.name ?? i), p])) : null);
    add(obj?.liveStatsByPlayer);
    add(obj?.livestatsbyplayer);
    add(obj?.players && !Array.isArray(obj.players) ? obj.players : null);
  }
  return out;
}

function playerMetaForKey(rec: any, key: string): any {
  const players = collectPlayers(rec);
  return players.find((p) => idLooseMatch(p?.id ?? p?.profileId ?? p?.playerId, key)) || null;
}

export function findStatsForProfile(rec: any, profile: any): { key: string; stats: any; player: any } | null {
  const maps = mapsFromRec(rec);
  for (const map of maps) {
    for (const [key, stats] of Object.entries(map)) {
      const meta = playerMetaForKey(rec, key) || stats;
      if (profileMatchesPlayer(profile, { ...meta, ...(stats as any) }, key)) return { key, stats, player: meta };
    }
  }
  const players = collectPlayers(rec);
  const p = players.find((pl) => profileMatchesPlayer(profile, pl));
  if (p) {
    const fallbackStats = (rec?.stats && typeof rec.stats === "object") ? rec.stats : (rec?.payload?.stats && typeof rec.payload.stats === "object") ? rec.payload.stats : {};
    return { key: String(p.id ?? p.profileId ?? p.playerId ?? p.name), stats: { ...fallbackStats, ...p }, player: p };
  }
  return null;
}

export function findStatsForPlayer(rec: any, player: any): { key: string; stats: any; player: any } | null {
  const fakeProfile = { id: player?.id ?? player?.profileId ?? player?.playerId, name: player?.name ?? player?.playerName ?? player?.displayName };
  return findStatsForProfile(rec, fakeProfile);
}

function hitsObj(stats: any): any {
  return stats?.hits || stats?.precision || stats?.details || stats?.breakdown || {};
}

function bySeg(stats: any): any {
  return stats?.hitsBySegment || stats?.hitsbysegment || stats?.bySegment || stats?.bysegment || {};
}

function countVisitsFromScores(scores: any): Record<string, number> {
  const out: Record<string, number> = { h50: 0, h60: 0, h80: 0, h100: 0, h120: 0, h140: 0, h180: 0 };
  const arr = Array.isArray(scores) ? scores : [];
  for (const v of arr) {
    const n = num(v);
    if (n >= 50) out.h50++;
    if (n >= 60) out.h60++;
    if (n >= 80) out.h80++;
    if (n >= 100) out.h100++;
    if (n >= 120) out.h120++;
    if (n >= 140) out.h140++;
    if (n >= 180) out.h180++;
  }
  return out;
}

function best9FromScores(scores: number[]): number {
  let best = 0;
  for (let i = 0; i < scores.length; i += 1) {
    const n = num(scores[i]) + num(scores[i + 1]) + num(scores[i + 2]);
    if (n > best) best = n;
  }
  return best;
}

export function sampleFromRec(rec: any, profile: any): X01PlayerSample | null {
  const found = findStatsForProfile(rec, profile);
  if (!found) return null;
  const s: any = found.stats || {};
  const h = hitsObj(s);
  const scores = (s.scorePerVisit || s.scorepervisit || s.visitsScores || s.visits || []).map((x: any) => num(x));
  const thresholds = countVisitsFromScores(scores);
  const player = found.player || s;
  const playerId = String(player?.id ?? player?.profileId ?? player?.playerId ?? found.key ?? profile?.id ?? "");
  const playerName = String(player?.name ?? player?.playerName ?? s?.name ?? profile?.name ?? "");
  const winnerId = rec?.winnerId ?? rec?.summary?.winnerId ?? rec?.payload?.winnerId ?? rec?.payload?.summary?.winnerId ?? deepFirst(rec, ["winnerId", "lastWinnerId", "lastLegWinnerId", "winner"] ) ?? null;
  const winnerName = rec?.winnerName ?? rec?.summary?.winnerName ?? rec?.payload?.winnerName ?? rec?.payload?.summary?.winnerName ?? deepFirst(rec, ["winnerName"] ) ?? null;
  const won = (winnerId && idLooseMatch(winnerId, playerId)) || (winnerName && normText(winnerName) === normText(playerName));
  const darts = num(s.darts, num(s.dartsThrown, num(s.dt, num(s.totalDarts))));
  const totalScore = num(s.totalScore, num(s.totalscore, num(s.points)));
  const avg3 = num(s.avg3, num(s.avg3D, num(s.moy3, darts ? (totalScore / darts) * 3 : 0)));
  const single = num(h.S, num(h.s, num(h.single, num(h.singles, num(s.hitsSingle, num(s.hitssingle))))));
  const dbl = num(h.D, num(h.d, num(h.double, num(h.doubles, num(s.hitsDouble, num(s.hitsdouble))))));
  const tri = num(h.T, num(h.t, num(h.triple, num(h.triples, num(s.hitsTriple, num(s.hitstriple))))));
  const bull25 = num(h.Bull, num(h.bull, num(s.bull, num(s.bull25))));
  const bull50 = num(h.DBull, num(h.dbull, num(s.dBull, num(s.bull50))));
  const miss = num(h.M, num(h.m, num(h.miss, num(s.miss, num(s.misses)))));
  const bust = num(h.bust, num(s.bust, num(s.busts)));
  const coAttempts = num(s.coAttempts, num(s.checkoutAttempts, num(s.checkoutattempts, num(h.coAttempts, num(h.checkoutAttempts)))));
  const coSuccess = num(s.coSuccess, num(s.coHits, num(s.checkoutHits, num(s.checkoutSuccess, num(h.coSuccess)))));
  return {
    id: String(rec?.id ?? rec?.matchId ?? rec?.payload?.id ?? `${playerId}-${rec?.createdAt ?? Date.now()}`),
    matchId: String(rec?.matchId ?? rec?.id ?? rec?.payload?.matchId ?? rec?.payload?.id ?? ""),
    createdAt: num(rec?.createdAt, num(rec?.updatedAt, num(rec?.summary?.finishedAt, num(rec?.payload?.createdAt, num(deepFirst(rec, ["createdAt", "updatedAt", "finishedAt", "t", "u"]), Date.now()))))),
    scope: isTrainingRecord(rec) ? "training" : isOnlineRecord(rec) ? "online" : "local",
    playerId,
    playerName,
    winnerId: winnerId ? String(winnerId) : null,
    winnerName: winnerName ? String(winnerName) : null,
    matchesPlayed: isTrainingRecord(rec) ? 0 : 1,
    matchesWon: won ? 1 : 0,
    legsWon: num(s.legsWon, num(s.lw, num(s.legs_won))),
    setsWon: num(s.setsWon, num(s.sw, num(s.sets_won))),
    darts,
    totalScore,
    avg3,
    bestVisit: num(s.bestVisit, num(s.bv, num(s.best_visit))),
    bestCheckout: num(s.bestCheckout, num(s.bc, num(s.bestCo, num(s.best_co)))) || num((rec?.summary?.bestCheckoutByPlayer || rec?.payload?.summary?.bestCheckoutByPlayer || {})[found.key]),
    best9Score: num(s.best9Score, num(s.best9, best9FromScores(scores))),
    scorePerVisit: scores,
    h50: num(s.h50, thresholds.h50),
    h60: num(s.h60, thresholds.h60),
    h80: num(s.h80, thresholds.h80),
    h100: num(s.h100, thresholds.h100),
    h120: num(s.h120, thresholds.h120),
    h140: num(s.h140, thresholds.h140),
    h180: num(s.h180, thresholds.h180),
    miss,
    singleHits: single,
    doubleHits: dbl,
    tripleHits: tri,
    bull25,
    bull50,
    bust,
    coAttempts,
    coSuccess,
  };
}

export function aggregateX01Samples(samples: X01PlayerSample[]): X01Agg {
  const out: X01Agg = { count: 0, matchesPlayed: 0, matchesWon: 0, legsWon: 0, setsWon: 0, darts: 0, totalScore: 0, avg3: 0, bestVisit: 0, bestCheckout: 0, best9Score: 0, h50: 0, h60: 0, h80: 0, h100: 0, h120: 0, h140: 0, h180: 0, miss: 0, singleHits: 0, doubleHits: 0, tripleHits: 0, bull25: 0, bull50: 0, bust: 0, coAttempts: 0, coSuccess: 0 };
  for (const s of samples || []) {
    out.count++;
    out.matchesPlayed += num(s.matchesPlayed);
    out.matchesWon += num(s.matchesWon);
    out.legsWon += num(s.legsWon);
    out.setsWon += num(s.setsWon);
    out.darts += num(s.darts);
    out.totalScore += num(s.totalScore);
    out.bestVisit = Math.max(out.bestVisit, num(s.bestVisit));
    out.bestCheckout = Math.max(out.bestCheckout, num(s.bestCheckout));
    out.best9Score = Math.max(out.best9Score, num(s.best9Score));
    out.h50 += num(s.h50); out.h60 += num(s.h60); out.h80 += num(s.h80); out.h100 += num(s.h100); out.h120 += num(s.h120); out.h140 += num(s.h140); out.h180 += num(s.h180);
    out.miss += num(s.miss); out.singleHits += num(s.singleHits); out.doubleHits += num(s.doubleHits); out.tripleHits += num(s.tripleHits); out.bull25 += num(s.bull25); out.bull50 += num(s.bull50); out.bust += num(s.bust); out.coAttempts += num(s.coAttempts); out.coSuccess += num(s.coSuccess);
  }
  out.avg3 = out.darts > 0 ? (out.totalScore / out.darts) * 3 : 0;
  return out;
}

export async function loadAllHistoryRecords(): Promise<any[]> {
  const byId = new Map<string, any>();
  const push = (rec: any, idx = 0) => {
    if (!rec || typeof rec !== "object") return;
    const id = String(rec?.matchId ?? rec?.id ?? rec?.payload?.matchId ?? rec?.payload?.id ?? deepFirst(rec, ["matchId", "id"]) ?? `rec-${idx}`).trim();
    if (!id) return;
    byId.set(id, { ...(byId.get(id) || {}), ...rec });
  };

  try {
    const rows = typeof (History as any)?.listFinished === "function"
      ? await (History as any).listFinished()
      : typeof (History as any)?.list === "function"
      ? await (History as any).list()
      : [];
    for (let i = 0; i < (Array.isArray(rows) ? rows : []).length; i++) {
      const row: any = rows[i];
      const id = String(row?.matchId ?? row?.id ?? "").trim();
      let full = row;
      try {
        if (id && typeof (History as any)?.get === "function") {
          full = (await (History as any).get(id)) || row;
        }
      } catch {}
      push(full, i);
    }
  } catch {}

  try {
    const store = loadStore();
    const hist = Array.isArray((store as any)?.history) ? (store as any).history : [];
    hist.forEach(push);
  } catch {}

  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem("dc_online_matches_v1");
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) arr.forEach((r, i) => push({ ...r, online: true, source: r?.source || "online" }, 100000 + i));
    }
  } catch {}

  return Array.from(byId.values());
}

export async function loadX01SamplesForProfile(profile: any, opts?: { scope?: X01Scope | "all" }): Promise<X01PlayerSample[]> {
  const all = await loadAllHistoryRecords();
  const out: X01PlayerSample[] = [];
  for (const rec of all || []) {
    if (!isX01Record(rec) && !isTrainingRecord(rec)) continue;
    const smp = sampleFromRec(rec, profile);
    if (!smp) continue;
    if (opts?.scope && opts.scope !== "all" && smp.scope !== opts.scope) continue;
    out.push(smp);
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

export async function loadOnlineX01SamplesForActiveProfile(): Promise<X01PlayerSample[]> {
  const store = loadStore();
  const profiles = store?.profiles || [];
  const active = profiles.find((p: any) => p.id === store?.activeProfileId) || profiles[0] || null;
  if (!active) return [];
  return loadX01SamplesForProfile(active, { scope: "online" });
}

export async function loadAllOnlineX01Samples(profiles: any[] = []): Promise<X01PlayerSample[]> {
  const all = await loadAllHistoryRecords();
  const out: X01PlayerSample[] = [];
  for (const rec of all || []) {
    if ((!isX01Record(rec) && !isTrainingRecord(rec)) || !isOnlineRecord(rec)) continue;
    const players = collectPlayers(rec);
    const targets = players.length ? players : Object.keys(Object.assign({}, ...mapsFromRec(rec))).map((id) => ({ id }));
    for (const p of targets) {
      const profile = findProfileForPlayer(profiles || [], p) || { id: p?.id ?? p?.profileId ?? p?.playerId, name: p?.name ?? p?.playerName ?? p?.displayName, avatarDataUrl: p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar };
      const smp = sampleFromRec(rec, profile);
      if (smp && smp.scope === "online") out.push(smp);
    }
  }
  const seen = new Set<string>();
  return out.filter((s) => {
    const k = `${s.matchId}|${s.playerId}|${s.createdAt}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((a, b) => a.createdAt - b.createdAt);
}

export async function buildOnlineX01Leaderboard(profiles: any[] = []): Promise<any[]> {
  const all = await loadAllHistoryRecords();
  const map = new Map<string, any>();
  const ensure = (id: string, name: string, avatar?: string | null) => {
    const existing = map.get(id) || { playerId: id, name, avatarDataUrl: avatar || null, matches: 0, wins: 0, darts: 0, totalScore: 0, avg3: 0, bestVisit: 0, bestCheckout: 0 };
    if (name && (!existing.name || existing.name === "Player")) existing.name = name;
    if (avatar && !existing.avatarDataUrl) existing.avatarDataUrl = avatar;
    map.set(id, existing);
    return existing;
  };
  for (const rec of all || []) {
    if (!isX01Record(rec) || !isOnlineRecord(rec)) continue;
    const players = collectPlayers(rec);
    for (const p of players) {
      const profile = findProfileForPlayer(profiles, p) || p;
      const smp = sampleFromRec(rec, profile);
      if (!smp) continue;
      const id = String(profile?.id ?? smp.playerId ?? smp.playerName);
      const row = ensure(id, String(profile?.name ?? smp.playerName ?? "Player"), profile?.avatarDataUrl ?? profile?.avatar ?? p?.avatarDataUrl ?? p?.avatarUrl ?? null);
      row.matches += 1;
      row.wins += smp.matchesWon;
      row.darts += smp.darts;
      row.totalScore += smp.totalScore;
      row.bestVisit = Math.max(row.bestVisit, smp.bestVisit);
      row.bestCheckout = Math.max(row.bestCheckout, smp.bestCheckout);
    }
  }
  return Array.from(map.values()).map((r) => ({ ...r, avg3: r.darts > 0 ? (r.totalScore / r.darts) * 3 : 0, winRate: r.matches ? (r.wins / r.matches) * 100 : 0 })).sort((a, b) => b.wins - a.wins || b.avg3 - a.avg3 || b.bestVisit - a.bestVisit);
}
