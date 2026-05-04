import { History, type SavedMatch } from "./history";

type SimGame = "x01" | "cricket" | "killer" | "shanghai" | "golf";

export type DevMatchSimulationResult = {
  created: number;
  games: Record<string, number>;
  startedAt: number;
  finishedAt: number;
};

const DEV_SIM_MARK = "dev-match-simulator-v1";
const GAMES: SimGame[] = ["x01", "cricket", "killer", "shanghai", "golf"];

const PLAYERS = [
  { id: "dev_p1", playerId: "dev_p1", profileId: "dev_p1", name: "DEV Alex", displayName: "DEV Alex" },
  { id: "dev_p2", playerId: "dev_p2", profileId: "dev_p2", name: "DEV Sam", displayName: "DEV Sam" },
  { id: "dev_p3", playerId: "dev_p3", profileId: "dev_p3", name: "DEV Nico", displayName: "DEV Nico" },
  { id: "dev_p4", playerId: "dev_p4", profileId: "dev_p4", name: "DEV Jade", displayName: "DEV Jade" },
];

function n(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 999.91) * 10000;
  const r = x - Math.floor(x);
  return Math.round(min + r * (max - min));
}

function pickPlayers(count: number) {
  return PLAYERS.slice(0, Math.max(2, Math.min(count, PLAYERS.length))).map((p) => ({ ...p }));
}

function winnerOf(players: any[], index: number, createdAt: number) {
  return players[n(index + createdAt, 0, players.length - 1)] || players[0];
}

function base(game: SimGame, index: number, createdAt: number, players = pickPlayers(2)): SavedMatch {
  const id = `devsim_${game}_${index}`;
  const winner = winnerOf(players, index, createdAt);
  const ts = createdAt - index * 60_000;
  return {
    id,
    matchId: id,
    kind: game,
    mode: game,
    sport: "darts",
    status: "finished",
    players,
    winnerId: winner.id,
    createdAt: ts,
    updatedAt: ts + 20_000,
    source: DEV_SIM_MARK,
    origin: "local",
    devSim: true,
    summary: {
      source: DEV_SIM_MARK,
      game,
      mode: game,
      sport: "darts",
      finished: true,
      winnerId: winner.id,
      players,
      result: { finished: true, winnerId: winner.id },
    },
    payload: {
      source: DEV_SIM_MARK,
      game,
      mode: game,
      sport: "darts",
      matchId: id,
      players,
      winnerId: winner.id,
      result: { finished: true, winnerId: winner.id },
      summary: { finished: true, winnerId: winner.id, players, game, mode: game, sport: "darts" },
    },
  } as SavedMatch;
}

function makeVisit(pid: string, score: number, seed: number, isCheckout = false) {
  const darts = score === 0 ? 3 : 3;
  const segs = Array.from({ length: darts }, (_, i) => {
    const mult = (i === 2 && score >= 100 ? 3 : n(seed + i, 1, 3)) as 1 | 2 | 3;
    const value = score === 0 ? 0 : Math.max(1, Math.min(20, Math.round(score / (darts * mult))));
    return { v: value, mult };
  });
  return { p: pid, playerId: pid, score, segments: segs, bust: false, isCheckout, remainingAfter: isCheckout ? 0 : undefined, ts: Date.now() + seed };
}

function makeX01(index: number, now: number): SavedMatch {
  const players = pickPlayers(2);
  const rec = base("x01", index, now, players);
  const startScore = index % 2 ? 301 : 501;
  const p1Visits = [100, 60, 81, 45, 140, 76, n(index + 30, 24, 96)];
  const p2Visits = [60, 41, 95, 26, 100, 45, n(index + 31, 16, 82)];
  const visits = [
    ...p1Visits.map((score, i) => makeVisit(players[0].id, score, index * 100 + i, i === p1Visits.length - 1)),
    ...p2Visits.map((score, i) => makeVisit(players[1].id, score, index * 200 + i, false)),
  ].sort((a, b) => (a.ts || 0) - (b.ts || 0));

  const buildStats = (p: any, scores: number[], win: boolean) => {
    const darts = scores.length * 3;
    const points = scores.reduce((a, b) => a + b, 0);
    const bestVisit = Math.max(...scores);
    const bestCheckout = win ? scores[scores.length - 1] : 0;
    return {
      id: p.id,
      playerId: p.id,
      profileId: p.id,
      name: p.name,
      displayName: p.name,
      darts,
      dartsThrown: darts,
      points,
      pointsScored: points,
      scored: points,
      avg3: Number(((points / darts) * 3).toFixed(2)),
      bestVisit,
      bestCheckout,
      bestFinish: bestCheckout,
      h60: scores.filter((s) => s >= 60).length,
      h100: scores.filter((s) => s >= 100).length,
      h140: scores.filter((s) => s >= 140).length,
      h180: scores.filter((s) => s === 180).length,
      bust: 0,
      miss: n(index + points, 0, 3),
      doubles: n(index + points + 1, 1, 8),
      triples: n(index + points + 2, 1, 10),
      bulls: n(index + points + 3, 0, 2),
      dbull: n(index + points + 4, 0, 1),
      visits: scores.map((score, i) => ({ score, bust: false, isCheckout: win && i === scores.length - 1 })),
    };
  };

  const perPlayer = [buildStats(players[0], p1Visits, true), buildStats(players[1], p2Visits, false)];
  rec.game = { mode: "x01", startScore, doubleOut: index % 3 === 0 };
  rec.liveStatsByPlayer = Object.fromEntries(perPlayer.map((p: any) => [p.id, p]));
  rec.stats = { players: perPlayer, detailedByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p])) };
  rec.summary = {
    ...rec.summary,
    mode: "x01",
    game: { mode: "x01", startScore },
    legs: 1,
    darts: perPlayer.reduce((a: number, p: any) => a + p.darts, 0),
    co: Math.max(...perPlayer.map((p: any) => p.bestCheckout || 0)),
    avg3ByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p.avg3])),
    bestVisitByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p.bestVisit])),
    bestCheckoutByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p.bestCheckout])),
    perPlayer,
    players: perPlayer,
    detailedByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p])),
    stats: { players: perPlayer },
  };
  rec.payload = {
    ...rec.payload,
    variant: "x01_v3",
    config: { mode: "x01", startScore, doubleOut: index % 3 === 0, players },
    players: perPlayer,
    stats: { players: perPlayer },
    summary: rec.summary,
    visits,
    darts: visits,
    turns: visits.map((v, i) => ({ round: i + 1, playerId: v.playerId, score: v.score, segments: v.segments })),
  };
  return rec;
}

function makeCricket(index: number, now: number): SavedMatch {
  const players = pickPlayers(2);
  const rec = base("cricket", index, now, players);

  const buildCricketPlayer = (p: any, offset: number, win: boolean) => {
    const darts = n(index + offset, 42, 72);
    const marks = n(index + offset + 1, 26, 62);
    const score = n(index + offset + 2, 80, 320);
    const hitsCount = n(index + offset + 3, 18, Math.min(36, darts));
    const marksBySegment = {
      20: n(index + offset + 4, 3, 9),
      19: n(index + offset + 5, 3, 9),
      18: n(index + offset + 6, 3, 9),
      17: n(index + offset + 7, 3, 9),
      16: n(index + offset + 8, 3, 9),
      15: n(index + offset + 9, 3, 9),
      25: n(index + offset + 10, 1, 6),
    };
    const perSegment = Object.fromEntries(Object.entries(marksBySegment).map(([segment, mv]) => [segment, { segment: Number(segment), marks: mv, closes: Number(mv) >= 3 ? 1 : 0, pointsScored: Number(segment) === 25 ? n(index + offset + 11, 0, 50) : n(index + offset + Number(segment), 0, 60) }]));
    const hits = Array.from({ length: darts }, (_, i) => ({ playerId: p.id, segment: [20, 19, 18, 17, 16, 15, 25][i % 7], ring: i < hitsCount ? (i % 3 === 0 ? "TRIPLE" : i % 3 === 1 ? "DOUBLE" : "SINGLE") : "MISS", marks: i < hitsCount ? n(index + offset + i, 1, 3) : 0 }));
    return {
      ...p,
      darts,
      dartsThrown: darts,
      totalMarks: marks,
      marksTotal: marks,
      totalMarks: marks,
      score,
      points: score,
      hitCount: hitsCount,
      hitsCount,
      hits,
      marks: marksBySegment,
      bestRoundMarks: Math.min(9, n(index + offset + 12, 3, 9)),
      mpr: Number(((marks / darts) * 3).toFixed(2)),
      win,
      legStats: {
        matchId: rec.id,
        legId: `${rec.id}:${p.id}:0`,
        playerId: p.id,
        mode: "solo",
        scoringVariant: "points",
        darts,
        visits: Math.max(1, Math.ceil(darts / 3)),
        totalMarks: marks,
        totalPoints: score,
        totalInflictedPoints: 0,
        mpr: marks / Math.max(1, Math.ceil(darts / 3)),
        hitRate: darts ? hitsCount / darts : 0,
        scoringRate: darts ? hitsCount / darts : 0,
        won: win,
        winningDartIndex: win ? darts - 1 : -1,
        winningVisitIndex: win ? Math.ceil(darts / 3) - 1 : -1,
        opponentTotalPoints: 0,
        perSegment,
        bestVisitMarks: Math.min(9, marks),
        avgMarksWhenScoring: hitsCount ? marks / hitsCount : 0,
        closeOrder: Object.keys(perSegment).map(Number),
        startedAt: rec.createdAt,
        endedAt: rec.updatedAt,
        durationMs: Math.max(0, Number(rec.updatedAt || 0) - Number(rec.createdAt || 0)),
      },
    };
  };

  const winnerId = String(rec.winnerId || players[0].id);
  const perPlayer = players.map((p, i) => buildCricketPlayer(p, 10 + i * 20, p.id === winnerId));
  rec.stats = { players: perPlayer, detailedByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p])), cricketLegs: perPlayer.map((p: any) => p.legStats) };
  rec.summary = {
    ...rec.summary,
    mode: "cricket",
    marksByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p.marksTotal])),
    mprByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p.mpr])),
    scoreByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p.score])),
    perPlayer,
    players: perPlayer,
    detailedByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p])),
    stats: { players: perPlayer },
    cricketLegs: perPlayer.map((p: any) => p.legStats),
  };
  rec.payload = { ...rec.payload, mode: "cricket", players: perPlayer, stats: { players: perPlayer }, summary: rec.summary, cricketLegs: rec.summary.cricketLegs };
  return rec;
}

function makeKiller(index: number, now: number): SavedMatch {
  const players = pickPlayers(4);
  const rec = base("killer", index, now, players);
  const winnerId = String(rec.winnerId || players[0].id);
  const perPlayer = players.map((p, i) => {
    const kills = n(index + i, 0, 4);
    const damage = n(index + i + 4, 2, 14);
    const killerHits = n(index + i + 8, 1, 9);
    return {
      ...p,
      kills,
      damage,
      shields: n(index + i + 12, 0, 3),
      shieldBreaks: n(index + i + 16, 0, 2),
      killerHits,
      hitsOnSelf: n(index + i + 20, 0, 2),
      hitsTotal: killerHits + n(index + i + 24, 0, 4),
      offensiveThrows: n(index + i + 28, 6, 25),
      win: p.id === winnerId,
      rank: p.id === winnerId ? 1 : i + 2,
      livesLeft: p.id === winnerId ? n(index + i + 32, 1, 4) : 0,
    };
  });
  rec.stats = { players: perPlayer, detailedByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p])) };
  rec.summary = {
    ...rec.summary,
    mode: "killer",
    rounds: n(index, 5, 14),
    kills: perPlayer.reduce((a: number, p: any) => a + p.kills, 0),
    survivors: perPlayer.filter((p: any) => p.livesLeft > 0).length,
    perPlayer,
    players: perPlayer,
    detailedByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p])),
    rankings: perPlayer.slice().sort((a: any, b: any) => a.rank - b.rank),
    stats: { players: perPlayer },
  };
  rec.payload = { ...rec.payload, mode: "killer", config: { lives: 5, becomeRule: "double", shieldOnDBull: true }, players: perPlayer, stats: { players: perPlayer }, summary: rec.summary };
  return rec;
}

function makeShanghai(index: number, now: number): SavedMatch {
  const players = pickPlayers(3);
  const rec = base("shanghai", index, now, players);
  const maxRounds = 10;
  const targetOrder = Array.from({ length: maxRounds }, (_, i) => i + 1);
  const hitsById: Record<string, any[]> = {};
  const scoreTimelineById: Record<string, number[]> = {};

  const perPlayer = players.map((p, pi) => {
    let total = 0;
    hitsById[p.id] = [];
    scoreTimelineById[p.id] = [];

    for (let r = 0; r < maxRounds; r += 1) {
      const target = targetOrder[r];
      const sHits = n(index + pi * 100 + r * 7 + 1, 0, 1);
      const dHits = n(index + pi * 100 + r * 7 + 2, 0, 1);
      const tHits = n(index + pi * 100 + r * 7 + 3, 0, 1);
      const miss = Math.max(0, 3 - sHits - dHits - tHits);
      const score = target * (sHits + dHits * 2 + tHits * 3);
      total += score;
      hitsById[p.id].push({
        playerId: p.id,
        id: p.id,
        name: p.name,
        round: r + 1,
        target,
        score,
        S: sHits,
        D: dHits,
        T: tHits,
        M: miss,
        miss,
        hits: sHits + dHits + tHits,
        shanghai: sHits > 0 && dHits > 0 && tHits > 0,
      });
      scoreTimelineById[p.id].push(total);
    }

    const allHits = hitsById[p.id];
    return {
      ...p,
      playerId: p.id,
      profileId: p.id,
      score: total,
      totalScore: total,
      hitsTotal: allHits.reduce((a, h) => a + Number(h.hits || 0), 0),
      singles: allHits.reduce((a, h) => a + Number(h.S || 0), 0),
      doubles: allHits.reduce((a, h) => a + Number(h.D || 0), 0),
      triples: allHits.reduce((a, h) => a + Number(h.T || 0), 0),
      misses: allHits.reduce((a, h) => a + Number(h.M || h.miss || 0), 0),
      dartsThrown: maxRounds * 3,
      rounds: maxRounds,
    };
  });

  const ranked = perPlayer.slice().sort((a: any, b: any) => b.score - a.score);
  rec.winnerId = ranked[0]?.id || rec.winnerId;

  const scores = perPlayer.map((p: any) => ({ id: p.id, name: p.name, score: p.score }));
  const statsShanghai = {
    hitsById,
    scoreTimelineById,
    targetOrder,
    maxRounds,
    winRule: "points",
    rounds: Object.values(hitsById).flat(),
    players: perPlayer,
  };

  rec.stats = { players: perPlayer, statsShanghai, detailedByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p])) };
  rec.summary = {
    ...rec.summary,
    winnerId: rec.winnerId,
    kind: "shanghai",
    mode: "shanghai",
    gameId: "shanghai",
    finished: true,
    isTie: false,
    winRule: "points",
    maxRounds,
    scores,
    byId: Object.fromEntries(perPlayer.map((p: any) => [p.id, { score: p.score }])),
    perPlayer,
    players: perPlayer,
    detailedByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p])),
    scoreByPlayer: Object.fromEntries(perPlayer.map((p: any) => [p.id, p.score])),
    statsShanghai,
    stats: { players: perPlayer },
  };

  rec.payload = {
    ...rec.payload,
    winnerId: rec.winnerId,
    kind: "shanghai",
    mode: "shanghai",
    players: perPlayer,
    summary: rec.summary,
    statsShanghai,
    stats: { players: perPlayer, statsShanghai },
  };
  return rec;
}

function makeGolf(index: number, now: number): SavedMatch {
  const players = pickPlayers(3);
  const rec = base("golf", index, now, players);
  const statsByPlayer: Record<string, any> = {};
  const totals = players.map((p, i) => {
    const total = n(index + i, 18, 72);
    const stat = { total, score: total, darts: n(index + i + 10, 18, 54), s: n(index + i + 11, 2, 10), d: n(index + i + 12, 0, 6), t: n(index + i + 13, 0, 4), b: n(index + i + 14, 0, 3), db: n(index + i + 15, 0, 2), miss: n(index + i + 16, 0, 8), turns: 18, hit1: n(index + i + 17, 3, 12), hit2: n(index + i + 18, 1, 8), hit3: n(index + i + 19, 0, 5) };
    statsByPlayer[p.id] = stat;
    return { ...p, ...stat };
  });
  const rankings = totals.slice().sort((a: any, b: any) => a.total - b.total).map((p: any, i) => ({ id: p.id, playerId: p.id, name: p.name, total: p.total, rank: i + 1 }));
  rec.winnerId = rankings[0]?.id || rec.winnerId;
  rec.stats = { players: totals, detailedByPlayer: Object.fromEntries(totals.map((p: any) => [p.id, p])), playerStats: statsByPlayer };
  rec.summary = { ...rec.summary, winnerId: rec.winnerId, mode: "golf", players: totals, perPlayer: totals, detailedByPlayer: Object.fromEntries(totals.map((p: any) => [p.id, p])), rankings, playerStats: statsByPlayer, scoreByPlayer: Object.fromEntries(totals.map((p: any) => [p.id, p.total])), stats: { players: totals } };
  rec.payload = { ...rec.payload, winnerId: rec.winnerId, mode: "golf", players: totals, state: { statsByPlayer }, statsByPlayer, playerStats: statsByPlayer, summary: rec.summary, stats: { players: totals } };
  return rec;
}

function makeRecord(game: SimGame, index: number, now: number): SavedMatch {
  if (game === "x01") return makeX01(index, now);
  if (game === "cricket") return makeCricket(index, now);
  if (game === "killer") return makeKiller(index, now);
  if (game === "shanghai") return makeShanghai(index, now);
  return makeGolf(index, now);
}

async function removePreviousDevSimulations() {
  const all = await History.list().catch(() => [] as SavedMatch[]);
  const rows = Array.isArray(all) ? all : [];
  for (const row of rows) {
    if ((row as any)?.devSim === true || String((row as any)?.source || "") === DEV_SIM_MARK || String((row as any)?.payload?.source || "") === DEV_SIM_MARK) {
      const id = String((row as any)?.id || (row as any)?.matchId || "").trim();
      if (id) await History.remove(id).catch(() => undefined);
    }
  }
}

async function refreshStatsAfterSimulation() {
  try {
    const mod = await import("./statsBridge");
    if (typeof mod.clearStatsIndexCache === "function") mod.clearStatsIndexCache();
    if (typeof mod.refreshStatsIndexFromHistoryNow === "function") {
      await mod.refreshStatsIndexFromHistoryNow({ includeNonFinished: true, persist: true, reason: "dev-match-simulation" });
    }
  } catch {}
  try {
    const mod = await import("./stats/rebuildStatsFromHistory");
    if (typeof mod.rebuildStatsFromHistory === "function") {
      await mod.rebuildStatsFromHistory({ includeNonFinished: true, persist: true });
    }
  } catch {}
  try {
    localStorage.setItem("dc-history-refresh", String(Date.now()));
    localStorage.setItem("dc-stats-refresh", String(Date.now()));
    window.dispatchEvent(new Event("dc-history-updated"));
    window.dispatchEvent(new Event("history:updated"));
    window.dispatchEvent(new Event("dc-stats-index-updated"));
    window.dispatchEvent(new Event("stats:recompute"));
  } catch {}
}

export async function simulateDevMatchesAllGames(options?: { perGame?: number }): Promise<DevMatchSimulationResult> {
  const perGame = Math.max(1, Math.min(20, Number(options?.perGame || 1)));
  const startedAt = Date.now();
  const games: Record<string, number> = {};
  let created = 0;

  await removePreviousDevSimulations();

  for (const game of GAMES) {
    games[game] = 0;
    for (let i = 0; i < perGame; i += 1) {
      const rec = makeRecord(game, i + 1, startedAt - created * 15_000);
      await History.upsert(rec);
      games[game] += 1;
      created += 1;
    }
  }

  await refreshStatsAfterSimulation();
  return { created, games, startedAt, finishedAt: Date.now() };
}
