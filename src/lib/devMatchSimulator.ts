import { History, type SavedMatch } from "./history";

type SimGame =
  | "x01"
  | "cricket"
  | "killer"
  | "shanghai"
  | "golf"
  | "petanque"
  | "babyfoot"
  | "pingpong"
  | "molkky"
  | "dicegame";

export type DevMatchSimulationResult = {
  created: number;
  games: Record<string, number>;
  startedAt: number;
  finishedAt: number;
};

const DEV_SIM_MARK = "dev-match-simulator-v1";

const GAMES: SimGame[] = [
  "x01",
  "cricket",
  "killer",
  "shanghai",
  "golf",
  "petanque",
  "babyfoot",
  "pingpong",
  "molkky",
  "dicegame",
];

const PLAYERS = [
  { id: "dev_p1", name: "DEV Alex" },
  { id: "dev_p2", name: "DEV Sam" },
  { id: "dev_p3", name: "DEV Nico" },
  { id: "dev_p4", name: "DEV Jade" },
];

function n(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 999.91) * 10000;
  const r = x - Math.floor(x);
  return Math.round(min + r * (max - min));
}

function pickPlayers(count: number) {
  return PLAYERS.slice(0, Math.max(2, Math.min(count, PLAYERS.length))).map((p) => ({ ...p }));
}

function base(game: SimGame, index: number, createdAt: number, players = pickPlayers(2)): SavedMatch {
  const id = `devsim_${game}_${createdAt}_${index}`;
  const winner = players[n(index + createdAt, 0, players.length - 1)] || players[0];
  return {
    id,
    matchId: id,
    kind: game,
    mode: game,
    status: "finished",
    players,
    winnerId: winner.id,
    createdAt: createdAt - index * 60_000,
    updatedAt: createdAt - index * 60_000 + 20_000,
    source: DEV_SIM_MARK,
    devSim: true,
    summary: {
      finished: true,
      winnerId: winner.id,
      players,
    },
    payload: {
      source: DEV_SIM_MARK,
      game,
      players,
      winnerId: winner.id,
      summary: { finished: true, winnerId: winner.id, players },
    },
  } as SavedMatch;
}

function makeX01(index: number, now: number): SavedMatch {
  const players = pickPlayers(2);
  const rec = base("x01", index, now, players);
  const avg1 = n(index + 1, 42, 78);
  const avg2 = n(index + 2, 35, 70);
  rec.game = { mode: "x01", startScore: index % 2 ? 301 : 501, doubleOut: index % 3 === 0 };
  rec.summary = {
    ...rec.summary,
    legs: 1,
    darts: n(index, 38, 88),
    co: n(index + 3, 18, 118),
    avg3ByPlayer: { [players[0].id]: avg1, [players[1].id]: avg2 },
  };
  rec.payload = {
    ...rec.payload,
    config: rec.game,
    stats: {
      players: [
        { playerId: players[0].id, name: players[0].name, avg3: avg1, darts: n(index + 4, 36, 72), checkout: n(index + 5, 20, 120) },
        { playerId: players[1].id, name: players[1].name, avg3: avg2, darts: n(index + 6, 42, 90), checkout: n(index + 7, 0, 80) },
      ],
    },
    turns: Array.from({ length: 12 }, (_, i) => ({ round: i + 1, scores: players.map((p, pIdx) => ({ playerId: p.id, score: n(index + i + pIdx, 11, 140) })) })),
  };
  return rec;
}

function makeCricket(index: number, now: number): SavedMatch {
  const players = pickPlayers(2);
  const rec = base("cricket", index, now, players);
  const marks1 = n(index + 10, 24, 55);
  const marks2 = n(index + 11, 18, 49);
  rec.summary = { ...rec.summary, marksByPlayer: { [players[0].id]: marks1, [players[1].id]: marks2 }, mprByPlayer: { [players[0].id]: 2.7, [players[1].id]: 2.1 } };
  rec.payload = {
    ...rec.payload,
    stats: {
      players: [
        { playerId: players[0].id, marks: marks1, darts: 54, mpr: Number(((marks1 / 54) * 3).toFixed(2)) },
        { playerId: players[1].id, marks: marks2, darts: 57, mpr: Number(((marks2 / 57) * 3).toFixed(2)) },
      ],
    },
    hits: Array.from({ length: 38 }, (_, i) => ({ playerId: players[i % 2].id, target: [20, 19, 18, 17, 16, 15, 25][i % 7], marks: n(index + i, 0, 3) })),
  };
  return rec;
}

function makeKiller(index: number, now: number): SavedMatch {
  const players = pickPlayers(4);
  const rec = base("killer", index, now, players);
  rec.summary = { ...rec.summary, rounds: n(index, 5, 14), kills: n(index + 1, 2, 9), survivors: n(index + 2, 1, 2) };
  rec.payload = {
    ...rec.payload,
    config: { lives: 5, becomeRule: "double", shieldOnDBull: true },
    stats: {
      players: players.map((p, i) => ({ playerId: p.id, kills: n(index + i, 0, 4), damage: n(index + i + 4, 2, 12), shields: n(index + i + 8, 0, 3) })),
    },
  };
  return rec;
}

function makeRoundsGame(game: SimGame, index: number, now: number): SavedMatch {
  const players = pickPlayers(game === "petanque" || game === "babyfoot" ? 2 : 3);
  const rec = base(game, index, now, players);
  rec.summary = {
    ...rec.summary,
    rounds: n(index, 4, 13),
    scoreByPlayer: Object.fromEntries(players.map((p, i) => [p.id, n(index + i, 4, game === "petanque" ? 13 : 25)])),
  };
  rec.payload = {
    ...rec.payload,
    rounds: Array.from({ length: n(index, 4, 10) }, (_, r) => ({
      round: r + 1,
      scores: players.map((p, i) => ({ playerId: p.id, score: n(index + r + i, 0, 5) })),
    })),
  };
  return rec;
}

function makeRecord(game: SimGame, index: number, now: number): SavedMatch {
  if (game === "x01") return makeX01(index, now);
  if (game === "cricket") return makeCricket(index, now);
  if (game === "killer") return makeKiller(index, now);
  return makeRoundsGame(game, index, now);
}

export async function simulateDevMatchesAllGames(options?: { perGame?: number }): Promise<DevMatchSimulationResult> {
  const perGame = Math.max(1, Math.min(20, Number(options?.perGame || 3)));
  const startedAt = Date.now();
  const games: Record<string, number> = {};
  let created = 0;

  for (const game of GAMES) {
    games[game] = 0;
    for (let i = 0; i < perGame; i += 1) {
      const rec = makeRecord(game, i + created + 1, startedAt - created * 15_000);
      await History.upsert(rec);
      games[game] += 1;
      created += 1;
    }
  }

  try {
    localStorage.setItem("dc-history-refresh", String(Date.now()));
    window.dispatchEvent(new Event("dc-history-updated"));
  } catch {}

  return { created, games, startedAt, finishedAt: Date.now() };
}
