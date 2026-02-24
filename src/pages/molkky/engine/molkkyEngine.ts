// =============================================================
// src/pages/molkky/engine/molkkyEngine.ts
// Engine MÖLKKY — Premium (sans bots)
// - Score: 1 quille -> valeur (1..12)
// - Multi quilles -> nombre de quilles (2..12)
// - Cible: targetScore (50 officiel)
// - Dépassement: retour à 25 (option)
// - 3 MISS consécutifs: élimination (option)
// - Undo support (via journal turns)
// =============================================================

export type MolkkyConfig = {
  targetScore: number;
  bounceBackTo25: boolean;
  eliminationOnThreeMiss: boolean;
};

export type MolkkyPlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  score: number;
  throws: number;
  consecutiveMisses: number;
  eliminated: boolean;
};

export type MolkkyTurn = {
  at: number;
  playerId: string;
  value: number; // 0..12
  beforeScore: number;
  afterScore: number;
  beforeMisses: number;
  afterMisses: number;
  eliminatedBefore: boolean;
  eliminatedAfter: boolean;
};

export type MolkkyState = {
  id: string;
  config: MolkkyConfig;
  players: MolkkyPlayer[];
  currentIndex: number;
  startedAt: number;
  finishedAt?: number;
  winnerPlayerId?: string | null;
  turns: MolkkyTurn[];
};

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function createMolkkyState(input: {
  id?: string;
  config?: Partial<MolkkyConfig>;
  players: Array<{ id: string; name: string; avatarDataUrl?: string | null }>;
}): MolkkyState {
  const now = Date.now();
  const cfg: MolkkyConfig = {
    targetScore: clampInt(input?.config?.targetScore, 10, 200, 50),
    bounceBackTo25: Boolean(input?.config?.bounceBackTo25 ?? true),
    eliminationOnThreeMiss: Boolean(input?.config?.eliminationOnThreeMiss ?? true),
  };

  const players: MolkkyPlayer[] = (input.players || []).map((p) => ({
    id: String(p.id),
    name: String(p.name || "").trim() || "Joueur",
    avatarDataUrl: p.avatarDataUrl ?? null,
    score: 0,
    throws: 0,
    consecutiveMisses: 0,
    eliminated: false,
  }));

  return {
    id: input.id || `molkky-${now}-${Math.random().toString(36).slice(2, 8)}`,
    config: cfg,
    players,
    currentIndex: 0,
    startedAt: now,
    winnerPlayerId: null,
    turns: [],
  };
}

export function isFinished(st: MolkkyState) {
  return Boolean(st.finishedAt || st.winnerPlayerId);
}

function nextAliveIndex(players: MolkkyPlayer[], fromIndex: number): number {
  const n = players.length;
  if (n <= 0) return 0;
  for (let step = 1; step <= n; step++) {
    const i = (fromIndex + step) % n;
    if (!players[i].eliminated) return i;
  }
  return fromIndex;
}

export function applyTurn(st: MolkkyState, valueRaw: number): MolkkyState {
  if (!st || isFinished(st)) return st;
  const value = clampInt(valueRaw, 0, 12, 0);

  const players = st.players.map((p) => ({ ...p }));
  const cur = players[st.currentIndex];
  if (!cur || cur.eliminated) {
    const idx = nextAliveIndex(players, st.currentIndex);
    return { ...st, players, currentIndex: idx };
  }

  const beforeScore = cur.score;
  const beforeMisses = cur.consecutiveMisses;
  const eliminatedBefore = cur.eliminated;

  cur.throws += 1;

  if (value === 0) {
    cur.consecutiveMisses += 1;
    if (st.config.eliminationOnThreeMiss && cur.consecutiveMisses >= 3) {
      cur.eliminated = true;
    }
  } else {
    cur.consecutiveMisses = 0;
    cur.score += value;

    if (st.config.bounceBackTo25 && cur.score > st.config.targetScore) {
      cur.score = 25;
    }
  }

  const winner = cur.score === st.config.targetScore ? cur.id : null;

  const now = Date.now();
  const turn: MolkkyTurn = {
    at: now,
    playerId: cur.id,
    value,
    beforeScore,
    afterScore: cur.score,
    beforeMisses,
    afterMisses: cur.consecutiveMisses,
    eliminatedBefore,
    eliminatedAfter: cur.eliminated,
  };

  const nextIndex = nextAliveIndex(players, st.currentIndex);

  const finishedAt = winner ? now : undefined;

  return {
    ...st,
    players,
    turns: [...st.turns, turn],
    currentIndex: nextIndex,
    winnerPlayerId: winner,
    finishedAt,
  };
}

export function undo(st: MolkkyState): MolkkyState {
  const turns = Array.isArray(st?.turns) ? st.turns.slice() : [];
  if (turns.length === 0) return st;

  const last = turns.pop() as MolkkyTurn;
  const players = st.players.map((p) => ({ ...p }));
  const idx = players.findIndex((p) => p.id === last.playerId);
  if (idx >= 0) {
    const p = players[idx];
    p.score = last.beforeScore;
    p.consecutiveMisses = last.beforeMisses;
    p.eliminated = last.eliminatedBefore;
    p.throws = Math.max(0, (p.throws || 0) - 1);
  }

  return {
    ...st,
    players,
    turns,
    currentIndex: Math.max(0, idx >= 0 ? idx : st.currentIndex),
    winnerPlayerId: null,
    finishedAt: undefined,
  };
}

export function buildSummary(st: MolkkyState) {
  const winner = st.players.find((p) => p.id === st.winnerPlayerId) || null;
  const durationMs = (st.finishedAt || Date.now()) - (st.startedAt || Date.now());

  const byPlayer = st.players.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    throws: p.throws,
    eliminated: p.eliminated,
  }));

  return {
    title: "Mölkky",
    targetScore: st.config.targetScore,
    bounceBackTo25: st.config.bounceBackTo25,
    eliminationOnThreeMiss: st.config.eliminationOnThreeMiss,
    turns: st.turns.length,
    durationMs,
    winnerPlayerId: winner?.id ?? null,
    winnerName: winner?.name ?? null,
    players: byPlayer,
  };
}
