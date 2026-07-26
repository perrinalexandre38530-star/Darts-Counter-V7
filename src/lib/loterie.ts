export type LoterieVariant = "classic" | "express";
export type LoterieLevel = "auto" | "beginner" | "leisure" | "intermediate" | "confirmed" | "expert";
export type LoterieAutoMode = "balanced" | "common";
export type LoterieVolleyMode = "free" | "strict3";
export type LoterieExpressTarget = "simple" | "double" | "triple";

export type LoterieDart = {
  v: number;
  mult: 0 | 1 | 2 | 3;
  label?: string;
};

export type LoterieCell = {
  key: string;
  value: number;
  label: string;
  revealed: boolean;
};

export type LoterieCard = {
  id: string;
  cells: LoterieCell[];
};

export type LoteriePlayerInput = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  avg3?: number | null;
  isBot?: boolean;
  [key: string]: any;
};

export type LoteriePlayerStats = {
  visits: number;
  dartsThrown: number;
  successfulVisits: number;
  emptyVisits: number;
  cellsRevealed: number;
  multiHits: number;
  maxCellsInVisit: number;
  currentStreak: number;
  bestStreak: number;
  totalVolleyScore: number;
  maxVolley: number;
  cardsCompleted: number;
  completedOnVisit: number | null;
};

export type LoteriePlayerState = LoteriePlayerInput & {
  cards: LoterieCard[];
  targetMin: number;
  targetMax: number;
  stats: LoteriePlayerStats;
};

export type LoterieConfig = {
  participantMode?: "players" | "teams";
  variant: LoterieVariant;
  level: LoterieLevel;
  autoMode: LoterieAutoMode;
  volleyMode: LoterieVolleyMode;
  expressTarget: LoterieExpressTarget;
  cardsPerPlayer: 1 | 2 | 3 | 4;
  cellsPerCard: 5 | 10 | 15;
  startOrderMode: "random" | "fixed";
};

export const LOTERIE_LEVELS: Record<Exclude<LoterieLevel, "auto">, { min: number; max: number; label: string }> = {
  beginner: { min: 10, max: 45, label: "DÉBUTANT" },
  leisure: { min: 10, max: 60, label: "LOISIR" },
  intermediate: { min: 10, max: 80, label: "INTERMÉDIAIRE" },
  confirmed: { min: 10, max: 100, label: "CONFIRMÉ" },
  expert: { min: 10, max: 120, label: "EXPERT" },
};

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

export function normalizeAvg3(raw: any): number {
  const candidates = [
    raw?.avg3,
    raw?.avg3D,
    raw?.average3,
    raw?.stats?.avg3,
    raw?.stats?.avg3D,
    raw?.stats?.x01?.avg3,
    raw?.stats?.x01?.avg3D,
    raw?.quickStats?.avg3,
    raw?.summary?.avg3,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function autoLevelFromAvg3(avg3: number): Exclude<LoterieLevel, "auto"> {
  const n = Number(avg3) || 0;
  if (n < 30) return "beginner";
  if (n < 45) return "leisure";
  if (n < 60) return "intermediate";
  if (n < 80) return "confirmed";
  return "expert";
}

export function rangeForLevel(level: LoterieLevel, avg3 = 0): { min: number; max: number; label: string } {
  const resolved = level === "auto" ? autoLevelFromAvg3(avg3) : level;
  return LOTERIE_LEVELS[resolved];
}

export function resolvePlayerRanges(players: LoteriePlayerInput[], config: LoterieConfig): Record<string, { min: number; max: number; label: string }> {
  const out: Record<string, { min: number; max: number; label: string }> = {};
  if (config.variant === "express") {
    for (const p of players) {
      if (config.expressTarget === "simple") out[p.id] = { min: 1, max: 25, label: "SIMPLE S1–S20 + BULL" };
      else if (config.expressTarget === "double") out[p.id] = { min: 2, max: 50, label: "DOUBLES D1–D20 + DBULL" };
      else out[p.id] = { min: 3, max: 60, label: "TRIPLES T1–T20" };
    }
    return out;
  }

  if (config.level !== "auto") {
    const range = rangeForLevel(config.level, 0);
    for (const p of players) out[p.id] = { ...range };
    return out;
  }

  if (config.autoMode === "common") {
    const avgs = players.map((p) => normalizeAvg3(p)).filter((n) => n > 0);
    const groupAvg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 20;
    const range = rangeForLevel("auto", groupAvg);
    for (const p of players) out[p.id] = { ...range, label: `AUTO COMMUN · ${range.label}` };
    return out;
  }

  for (const p of players) {
    const range = rangeForLevel("auto", normalizeAvg3(p));
    out[p.id] = { ...range, label: `AUTO · ${range.label}` };
  }
  return out;
}

function sampleUnique<T>(pool: T[], count: number, rng: () => number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function classicPool(min: number, max: number): LoterieCell[] {
  const lo = clamp(Math.round(min), 0, 180);
  const hi = clamp(Math.round(max), lo, 180);
  const out: LoterieCell[] = [];
  for (let n = lo; n <= hi; n++) out.push({ key: `N${n}`, value: n, label: String(n), revealed: false });
  return out;
}

export function expressPool(target: LoterieExpressTarget): LoterieCell[] {
  if (target === "simple") {
    const singles = Array.from({ length: 20 }, (_, i) => ({ key: `S${i + 1}`, value: i + 1, label: String(i + 1), revealed: false }));
    singles.push({ key: "BULL", value: 25, label: "25", revealed: false });
    return singles;
  }
  if (target === "double") {
    const doubles = Array.from({ length: 20 }, (_, i) => ({ key: `D${i + 1}`, value: (i + 1) * 2, label: `D${i + 1}`, revealed: false }));
    doubles.push({ key: "DBULL", value: 50, label: "DBULL", revealed: false });
    return doubles;
  }
  return Array.from({ length: 20 }, (_, i) => ({ key: `T${i + 1}`, value: (i + 1) * 3, label: `T${i + 1}`, revealed: false }));
}

export function generateCards(config: LoterieConfig, range: { min: number; max: number }, seed = Date.now()): LoterieCard[] {
  const pool = config.variant === "express" ? expressPool(config.expressTarget) : classicPool(range.min, range.max);
  const rng = mulberry32(seed);
  const cardCount = clamp(config.cardsPerPlayer, 1, 4);
  const cells = clamp(config.cellsPerCard, 5, Math.min(15, pool.length));
  return Array.from({ length: cardCount }, (_, i) => {
    const picked = sampleUnique(pool, cells, rng).map((c) => ({ ...c, revealed: false }));
    const positioned = picked.map((cell) => ({ cell, sort: rng() })).sort((a, b) => a.sort - b.sort).map((x) => x.cell);
    return {
      id: `card_${i + 1}`,
      // Chaque carton échantillonne indépendamment : aucun doublon DANS le carton,
      // mais le même numéro peut apparaître sur plusieurs cartons comme à la loterie.
      // On remélange ensuite les positions pour éviter une impression de suite trop linéaire.
      cells: positioned,
    };
  });
}

export function makeInitialStats(): LoteriePlayerStats {
  return {
    visits: 0,
    dartsThrown: 0,
    successfulVisits: 0,
    emptyVisits: 0,
    cellsRevealed: 0,
    multiHits: 0,
    maxCellsInVisit: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalVolleyScore: 0,
    maxVolley: 0,
    cardsCompleted: 0,
    completedOnVisit: null,
  };
}

export function buildPlayerStates(players: LoteriePlayerInput[], config: LoterieConfig, seed = Date.now()): LoteriePlayerState[] {
  const ranges = resolvePlayerRanges(players, config);
  return players.map((p, i) => {
    const range = ranges[p.id] || { min: 10, max: 60, label: "LOISIR" };
    return {
      ...p,
      targetMin: range.min,
      targetMax: range.max,
      cards: generateCards(config, range, seed + i * 9973),
      stats: makeInitialStats(),
    };
  });
}

export function dartScore(d: LoterieDart): number {
  if (!d || !d.v || !d.mult) return 0;
  if (d.v === 25 && d.mult === 3) return 0;
  return d.v * d.mult;
}

export function volleyScore(darts: LoterieDart[]): number {
  return (Array.isArray(darts) ? darts : []).reduce((sum, d) => sum + dartScore(d), 0);
}

export function dartLabel(d: LoterieDart): string {
  if (!d || !d.v || !d.mult) return "MISS";
  if (d.v === 25 && d.mult === 2) return "DBULL";
  if (d.v === 25) return "BULL";
  return `${d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S"}${d.v}`;
}

export function resultKey(config: LoterieConfig, darts: LoterieDart[]): { key: string | null; value: number; label: string } {
  if (config.variant === "classic") {
    const total = volleyScore(darts);
    return { key: total > 0 ? `N${total}` : null, value: total, label: String(total) };
  }
  const d = darts[0];
  if (!d || !d.v || !d.mult) return { key: null, value: 0, label: "MISS" };
  if (config.expressTarget === "simple") {
    if (d.v === 25 && d.mult === 1) return { key: "BULL", value: 25, label: "25" };
    if (d.mult !== 1 || d.v < 1 || d.v > 20) return { key: null, value: dartScore(d), label: dartLabel(d) };
    return { key: `S${d.v}`, value: d.v, label: String(d.v) };
  }
  if (config.expressTarget === "double") {
    if (d.v === 25 && d.mult === 2) return { key: "DBULL", value: 50, label: "DBULL" };
    if (d.mult !== 2 || d.v < 1 || d.v > 20) return { key: null, value: dartScore(d), label: dartLabel(d) };
    return { key: `D${d.v}`, value: d.v * 2, label: `D${d.v}` };
  }
  if (d.mult !== 3 || d.v < 1 || d.v > 20) return { key: null, value: dartScore(d), label: dartLabel(d) };
  return { key: `T${d.v}`, value: d.v * 3, label: `T${d.v}` };
}

export function revealResult(player: LoteriePlayerState, config: LoterieConfig, darts: LoterieDart[]): { player: LoteriePlayerState; revealed: number; completedCardIds: string[]; result: ReturnType<typeof resultKey> } {
  const result = resultKey(config, darts);
  let revealed = 0;
  const cards = player.cards.map((card) => ({
    ...card,
    cells: card.cells.map((cell) => {
      if (!cell.revealed && result.key && cell.key === result.key) {
        revealed++;
        return { ...cell, revealed: true };
      }
      return cell;
    }),
  }));
  const completedCardIds = cards.filter((c) => c.cells.length > 0 && c.cells.every((x) => x.revealed)).map((c) => c.id);
  const score = config.variant === "classic" ? result.value : volleyScore(darts);
  const visits = player.stats.visits + 1;
  const nextStreak = revealed > 0 ? player.stats.currentStreak + 1 : 0;
  const stats: LoteriePlayerStats = {
    ...player.stats,
    visits,
    dartsThrown: player.stats.dartsThrown + darts.length,
    successfulVisits: player.stats.successfulVisits + (revealed > 0 ? 1 : 0),
    emptyVisits: player.stats.emptyVisits + (revealed > 0 ? 0 : 1),
    cellsRevealed: player.stats.cellsRevealed + revealed,
    multiHits: player.stats.multiHits + (revealed >= 2 ? 1 : 0),
    maxCellsInVisit: Math.max(player.stats.maxCellsInVisit, revealed),
    currentStreak: nextStreak,
    bestStreak: Math.max(player.stats.bestStreak, nextStreak),
    totalVolleyScore: player.stats.totalVolleyScore + score,
    maxVolley: Math.max(player.stats.maxVolley, score),
    cardsCompleted: Math.max(player.stats.cardsCompleted, completedCardIds.length),
    completedOnVisit: completedCardIds.length && player.stats.completedOnVisit == null ? visits : player.stats.completedOnVisit,
  };
  return { player: { ...player, cards, stats }, revealed, completedCardIds, result };
}

export function cardProgress(card: LoterieCard): number {
  return card.cells.reduce((n, c) => n + (c.revealed ? 1 : 0), 0);
}

export function bestCardProgress(player: LoteriePlayerState): number {
  return player.cards.reduce((best, c) => Math.max(best, cardProgress(c)), 0);
}

export function hasWon(player: LoteriePlayerState): boolean {
  return player.cards.some((c) => c.cells.length > 0 && c.cells.every((x) => x.revealed));
}
