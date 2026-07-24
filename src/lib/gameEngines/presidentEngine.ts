// =============================================================
// PRÉSIDENT — moteur pur
// Adaptation du jeu de cartes au dartboard :
// S = carte simple, D = paire, T = brelan.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type PresidentScoreInputMethod = "keypad" | "dartboard";
export type PresidentBotLevel = "easy" | "normal" | "hard";
export type PresidentVariant = "classic" | "chaos";
export type PresidentComboSize = 1 | 2 | 3;

export type PresidentConfigPayload = {
  mode: "president";
  players: number;
  selectedIds: string[];
  playersList?: any[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: PresidentBotLevel;
  rounds: 1 | 3 | 5 | 7 | 10;
  handSize: number;
  deckCopies: 3 | 4 | 5;
  variant: PresidentVariant;
  randomOrder: boolean;
  bullJoker: boolean;
  coupEtat: boolean;
  revolution: boolean;
  scoreInputMethod: PresidentScoreInputMethod;
};

export type PresidentRules = Pick<
  PresidentConfigPayload,
  "rounds" | "handSize" | "deckCopies" | "variant" | "bullJoker" | "coupEtat" | "revolution"
>;

export type PresidentTarget = {
  value: number;
  size: PresidentComboSize;
};

export type PresidentTurnEvent = {
  id: string;
  roundNo: number;
  trickNo: number;
  playerId: string;
  target: PresidentTarget | null;
  darts: GameDart[];
  labels: string[];
  success: boolean;
  passed: boolean;
  automaticPass?: boolean;
  coupEtat?: boolean;
  revolutionTriggered?: boolean;
  cardsBefore: number;
  cardsAfter: number;
  createdAt: number;
};

export type PresidentRoundResult = {
  roundNo: number;
  ranking: string[];
  roles: Record<string, string>;
  powerPoints: Record<string, number>;
  taxes: PresidentTaxEvent[];
  startedAt: number;
  finishedAt: number;
};

export type PresidentTaxEvent = {
  fromPlayerId: string;
  toPlayerId: string;
  given: number[];
  returned: number[];
  kind: "president" | "vice";
};

export type PresidentPlayerStats = {
  darts: number;
  visits: number;
  successfulPlays: number;
  failedPlays: number;
  voluntaryPasses: number;
  automaticPasses: number;
  cardsPlayed: number;
  singlesPlayed: number;
  pairsPlayed: number;
  triplesPlayed: number;
  tricksWon: number;
  president: number;
  vicePresident: number;
  citizen: number;
  viceTrouDuCul: number;
  trouDuCul: number;
  powerPoints: number;
  taxesGiven: number;
  taxesReceived: number;
  coupEtats: number;
  revolutions: number;
  bestFinishRank: number | null;
  worstFinishRank: number | null;
  rankTotal: number;
  roundsPlayed: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
};

export type PresidentState = {
  sport: "darts";
  mode: "president";
  rules: PresidentRules;
  players: Player[];
  order: string[];
  hands: Record<string, number[]>;
  roundNo: number;
  trickNo: number;
  activePlayerId: string;
  currentTarget: PresidentTarget | null;
  lastSuccessfulPlayerId: string | null;
  passedPlayerIds: string[];
  finishedPlayerIds: string[];
  currentRoundRanking: string[];
  previousRoundRanking: string[];
  previousRoles: Record<string, string>;
  taxesThisRound: PresidentTaxEvent[];
  revolutionActive: boolean;
  history: PresidentTurnEvent[];
  roundResults: PresidentRoundResult[];
  statsByPlayer: Record<string, PresidentPlayerStats>;
  finished: boolean;
  winnerId: string | null;
  standings: string[];
  startedAt: number;
  roundStartedAt: number;
  finishedAt?: number;
};

function clampInt(value: any, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function normalizePlayers(input: Player[]): Player[] {
  const seen = new Set<string>();
  const out: Player[] = [];
  (input || []).forEach((p: any, index) => {
    const id = String(p?.id || p?.profileId || `p${index + 1}`);
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ id, name: String(p?.name || p?.displayName || `Joueur ${index + 1}`) });
  });
  return out.slice(0, 8);
}

function emptyStats(): PresidentPlayerStats {
  return {
    darts: 0, visits: 0, successfulPlays: 0, failedPlays: 0,
    voluntaryPasses: 0, automaticPasses: 0, cardsPlayed: 0,
    singlesPlayed: 0, pairsPlayed: 0, triplesPlayed: 0, tricksWon: 0,
    president: 0, vicePresident: 0, citizen: 0, viceTrouDuCul: 0, trouDuCul: 0,
    powerPoints: 0, taxesGiven: 0, taxesReceived: 0, coupEtats: 0, revolutions: 0,
    bestFinishRank: null, worstFinishRank: null, rankTotal: 0, roundsPlayed: 0,
    singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0,
  };
}

function makeDeck(copies: number): number[] {
  const deck: number[] = [];
  for (let copy = 0; copy < copies; copy += 1) {
    for (let value = 1; value <= 20; value += 1) deck.push(value);
  }
  return shuffle(deck);
}

function dealHands(playerIds: string[], handSize: number, copies: number): Record<string, number[]> {
  let deck = makeDeck(copies);
  const needed = playerIds.length * handSize;
  while (deck.length < needed) deck = [...deck, ...makeDeck(copies)];
  const hands: Record<string, number[]> = Object.fromEntries(playerIds.map((id) => [id, []]));
  let cursor = 0;
  for (let card = 0; card < handSize; card += 1) {
    for (const id of playerIds) hands[id].push(deck[cursor++]);
  }
  for (const id of playerIds) hands[id].sort((a, b) => a - b);
  return hands;
}

function roleForRank(rank: number, count: number): string {
  if (rank === 1) return "Président";
  if (rank === count) return "Trou du cul";
  if (count >= 4 && rank === 2) return "Vice-Président";
  if (count >= 4 && rank === count - 1) return "Vice-Trou du cul";
  return "Citoyen";
}

export function presidentRoleForRank(rank: number, count: number) {
  return roleForRank(rank, count);
}

function roleMap(ranking: string[]): Record<string, string> {
  return Object.fromEntries(ranking.map((id, index) => [id, roleForRank(index + 1, ranking.length)]));
}

function countValue(hand: number[], value: number) {
  return hand.reduce((n, card) => n + (card === value ? 1 : 0), 0);
}

export function presidentLegalTargets(hand: number[], current: PresidentTarget | null, revolutionActive = false): PresidentTarget[] {
  const counts = new Map<number, number>();
  (hand || []).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  const out: PresidentTarget[] = [];
  for (const [value, count] of counts) {
    for (const size of [1, 2, 3] as PresidentComboSize[]) {
      if (count < size) continue;
      if (current && size !== current.size) continue;
      if (current) {
        const beats = revolutionActive ? value < current.value : value > current.value;
        if (!beats) continue;
      }
      out.push({ value, size });
    }
  }
  out.sort((a, b) => {
    if (a.size !== b.size) return a.size - b.size;
    return revolutionActive ? b.value - a.value : a.value - b.value;
  });
  return out;
}

export function presidentTargetLabel(target: PresidentTarget | null): string {
  if (!target) return "OUVERTURE LIBRE";
  const prefix = target.size === 3 ? "T" : target.size === 2 ? "D" : "S";
  return `${prefix}${target.value}`;
}

export function presidentTargetDescription(target: PresidentTarget | null): string {
  if (!target) return "Choisis une combinaison dans ta main";
  return target.size === 3 ? `BRELAN DE ${target.value}` : target.size === 2 ? `PAIRE DE ${target.value}` : `CARTE ${target.value}`;
}

export function presidentDartLabel(dart: GameDart): string {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "IB") return "DBULL";
  return `${dart.bed}${dart.number || ""}`;
}

function dartMatchesTarget(dart: GameDart, target: PresidentTarget, state: PresidentState): { ok: boolean; coupEtat: boolean } {
  if (!dart) return { ok: false, coupEtat: false };
  if (state.rules.variant === "chaos") {
    if (state.rules.coupEtat && dart.bed === "IB") return { ok: true, coupEtat: true };
    if (state.rules.bullJoker && target.size === 1 && dart.bed === "OB") return { ok: true, coupEtat: false };
  }
  const expectedBed = target.size === 3 ? "T" : target.size === 2 ? "D" : "S";
  return { ok: dart.bed === expectedBed && Number(dart.number) === target.value, coupEtat: false };
}

function removeCards(hand: number[], value: number, count: number): number[] {
  const next = [...hand];
  let left = count;
  for (let i = next.length - 1; i >= 0 && left > 0; i -= 1) {
    if (next[i] !== value) continue;
    next.splice(i, 1);
    left -= 1;
  }
  return next.sort((a, b) => a - b);
}

function nextEligiblePlayer(state: PresidentState, fromId: string): string {
  const alive = state.order.filter((id) => !state.finishedPlayerIds.includes(id));
  if (!alive.length) return fromId;
  const eligible = state.currentTarget
    ? alive.filter((id) => !state.passedPlayerIds.includes(id))
    : alive;
  const pool = eligible.length ? eligible : alive;
  const start = state.order.indexOf(fromId);
  for (let step = 1; step <= state.order.length; step += 1) {
    const id = state.order[(start + step + state.order.length) % state.order.length];
    if (!pool.includes(id)) continue;
    return id;
  }
  return pool[0];
}

function activeRoundPlayers(state: PresidentState): string[] {
  return state.order.filter((id) => !state.finishedPlayerIds.includes(id));
}

function trickShouldReset(state: PresidentState): boolean {
  if (!state.currentTarget || !state.lastSuccessfulPlayerId) return false;
  const alive = activeRoundPlayers(state);
  const opponents = alive.filter((id) => id !== state.lastSuccessfulPlayerId);
  return opponents.length > 0 && opponents.every((id) => state.passedPlayerIds.includes(id));
}

function chooseLeaderAfterTrick(state: PresidentState): string {
  if (state.lastSuccessfulPlayerId && !state.finishedPlayerIds.includes(state.lastSuccessfulPlayerId)) return state.lastSuccessfulPlayerId;
  return nextEligiblePlayer(state, state.lastSuccessfulPlayerId || state.activePlayerId);
}

function applyTaxSwap(hands: Record<string, number[]>, ranking: string[]): { hands: Record<string, number[]>; events: PresidentTaxEvent[] } {
  const next: Record<string, number[]> = Object.fromEntries(Object.entries(hands).map(([id, hand]) => [id, [...hand].sort((a, b) => a - b)]));
  const events: PresidentTaxEvent[] = [];
  if (ranking.length < 3) return { hands: next, events };

  function swap(highId: string, lowId: string, count: number, kind: PresidentTaxEvent["kind"]) {
    const highHand = [...(next[highId] || [])].sort((a, b) => a - b);
    const lowHand = [...(next[lowId] || [])].sort((a, b) => a - b);
    if (highHand.length < count || lowHand.length < count) return;
    const returned = highHand.slice(0, count); // Président rend ses plus basses
    const given = lowHand.slice(-count);       // dernier donne ses plus hautes
    let h = [...highHand];
    let l = [...lowHand];
    for (const card of returned) h.splice(h.indexOf(card), 1);
    for (const card of given) l.splice(l.lastIndexOf(card), 1);
    h.push(...given); l.push(...returned);
    next[highId] = h.sort((a, b) => a - b);
    next[lowId] = l.sort((a, b) => a - b);
    events.push({ fromPlayerId: lowId, toPlayerId: highId, given, returned, kind });
  }

  swap(ranking[0], ranking[ranking.length - 1], 2, "president");
  if (ranking.length >= 4) swap(ranking[1], ranking[ranking.length - 2], 1, "vice");
  return { hands: next, events };
}

function updateImpactStats(stats: PresidentPlayerStats, darts: GameDart[]) {
  for (const dart of darts) {
    stats.darts += 1;
    if (!dart || dart.bed === "MISS") stats.misses += 1;
    else if (dart.bed === "S") stats.singles += 1;
    else if (dart.bed === "D") stats.doubles += 1;
    else if (dart.bed === "T") stats.triples += 1;
    else if (dart.bed === "OB") stats.bulls += 1;
    else if (dart.bed === "IB") stats.dbulls += 1;
  }
}

function finishRound(state: PresidentState): PresidentState {
  const next = clonePresidentState(state);
  const remaining = next.order.filter((id) => !next.currentRoundRanking.includes(id));
  const ranking = [...next.currentRoundRanking, ...remaining];
  const roles = roleMap(ranking);
  const points: Record<string, number> = {};
  ranking.forEach((id, index) => {
    const rank = index + 1;
    const power = ranking.length - index;
    points[id] = power;
    const s = next.statsByPlayer[id];
    s.roundsPlayed += 1;
    s.rankTotal += rank;
    s.powerPoints += power;
    s.bestFinishRank = s.bestFinishRank == null ? rank : Math.min(s.bestFinishRank, rank);
    s.worstFinishRank = s.worstFinishRank == null ? rank : Math.max(s.worstFinishRank, rank);
    const role = roles[id];
    if (role === "Président") s.president += 1;
    else if (role === "Vice-Président") s.vicePresident += 1;
    else if (role === "Vice-Trou du cul") s.viceTrouDuCul += 1;
    else if (role === "Trou du cul") s.trouDuCul += 1;
    else s.citizen += 1;
  });
  next.roundResults.push({
    roundNo: next.roundNo,
    ranking,
    roles,
    powerPoints: points,
    taxes: [...next.taxesThisRound],
    startedAt: next.roundStartedAt,
    finishedAt: Date.now(),
  });
  next.previousRoundRanking = ranking;
  next.previousRoles = roles;

  if (next.roundNo >= next.rules.rounds) {
    const standings = [...next.order].sort((a, b) => {
      const sa = next.statsByPlayer[a], sb = next.statsByPlayer[b];
      if (sb.powerPoints !== sa.powerPoints) return sb.powerPoints - sa.powerPoints;
      if (sb.president !== sa.president) return sb.president - sa.president;
      const aa = sa.roundsPlayed ? sa.rankTotal / sa.roundsPlayed : 999;
      const ab = sb.roundsPlayed ? sb.rankTotal / sb.roundsPlayed : 999;
      return aa - ab;
    });
    next.finished = true;
    next.winnerId = standings[0] || null;
    next.standings = standings;
    next.finishedAt = Date.now();
    return next;
  }
  return startNextPresidentRound(next);
}

function maybeCompleteRound(state: PresidentState): PresidentState {
  const alive = activeRoundPlayers(state);
  if (alive.length <= 1) return finishRound(state);
  return state;
}

export function createPresidentState(
  inputPlayers: Player[],
  inputRules: Partial<PresidentRules>,
  orderedIds: string[] = [],
): PresidentState {
  const all = normalizePlayers(inputPlayers);
  const byId = new Map(all.map((p) => [p.id, p]));
  let players = (orderedIds.length ? orderedIds.map(String).map((id) => byId.get(id)).filter(Boolean) : all) as Player[];
  players = players.slice(0, 8);
  if (players.length < 3) throw new Error("PRÉSIDENT nécessite au moins 3 joueurs.");

  const rounds = ([1, 3, 5, 7, 10].includes(Number(inputRules.rounds)) ? Number(inputRules.rounds) : 5) as 1 | 3 | 5 | 7 | 10;
  const rules: PresidentRules = {
    rounds,
    handSize: clampInt(inputRules.handSize, 5, 16, 10),
    deckCopies: ([3, 4, 5].includes(Number(inputRules.deckCopies)) ? Number(inputRules.deckCopies) : 4) as 3 | 4 | 5,
    variant: inputRules.variant === "chaos" ? "chaos" : "classic",
    bullJoker: inputRules.variant === "chaos" && inputRules.bullJoker !== false,
    coupEtat: inputRules.variant === "chaos" && inputRules.coupEtat !== false,
    revolution: inputRules.variant === "chaos" && inputRules.revolution !== false,
  };
  const order = players.map((p) => p.id);
  const statsByPlayer: Record<string, PresidentPlayerStats> = {};
  order.forEach((id) => { statsByPlayer[id] = emptyStats(); });
  const hands = dealHands(order, rules.handSize, rules.deckCopies);
  const now = Date.now();
  return {
    sport: "darts", mode: "president", rules, players, order, hands,
    roundNo: 1, trickNo: 1, activePlayerId: order[0], currentTarget: null,
    lastSuccessfulPlayerId: null, passedPlayerIds: [], finishedPlayerIds: [], currentRoundRanking: [],
    previousRoundRanking: [], previousRoles: {}, taxesThisRound: [], revolutionActive: false,
    history: [], roundResults: [], statsByPlayer, finished: false, winnerId: null, standings: [],
    startedAt: now, roundStartedAt: now,
  };
}

export function startNextPresidentRound(state: PresidentState): PresidentState {
  const next = clonePresidentState(state);
  if (next.finished) return next;
  next.roundNo += 1;
  next.trickNo = 1;
  next.currentTarget = null;
  next.lastSuccessfulPlayerId = null;
  next.passedPlayerIds = [];
  next.finishedPlayerIds = [];
  next.currentRoundRanking = [];
  next.revolutionActive = false;
  next.roundStartedAt = Date.now();
  let hands = dealHands(next.order, next.rules.handSize, next.rules.deckCopies);
  const taxed = applyTaxSwap(hands, next.previousRoundRanking);
  hands = taxed.hands;
  next.hands = hands;
  next.taxesThisRound = taxed.events;
  taxed.events.forEach((ev) => {
    next.statsByPlayer[ev.fromPlayerId].taxesGiven += ev.given.length;
    next.statsByPlayer[ev.toPlayerId].taxesReceived += ev.given.length;
  });
  // Le Trou du cul ouvre la manche suivante, comme variante très lisible du jeu de cartes.
  next.activePlayerId = next.previousRoundRanking[next.previousRoundRanking.length - 1] || next.order[0];
  return next;
}

export function presidentCanPlayerPlay(state: PresidentState, playerId: string): boolean {
  return presidentLegalTargets(state.hands[playerId] || [], state.currentTarget, state.revolutionActive).length > 0;
}

export function presidentAutoTarget(state: PresidentState, playerId: string): PresidentTarget | null {
  return presidentLegalTargets(state.hands[playerId] || [], state.currentTarget, state.revolutionActive)[0] || null;
}

export function passPresidentTurn(state: PresidentState, automatic = false): PresidentState {
  if (state.finished) return state;
  const next = clonePresidentState(state);
  const playerId = next.activePlayerId;
  const stats = next.statsByPlayer[playerId];
  stats.visits += 1;
  if (automatic) stats.automaticPasses += 1; else stats.voluntaryPasses += 1;
  if (!next.passedPlayerIds.includes(playerId)) next.passedPlayerIds.push(playerId);
  next.history.push({
    id: `pres-pass-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    roundNo: next.roundNo, trickNo: next.trickNo, playerId, target: next.currentTarget ? { ...next.currentTarget } : null,
    darts: [], labels: [], success: false, passed: true, automaticPass: automatic,
    cardsBefore: next.hands[playerId]?.length || 0, cardsAfter: next.hands[playerId]?.length || 0, createdAt: Date.now(),
  });

  if (trickShouldReset(next)) {
    const leader = chooseLeaderAfterTrick(next);
    if (next.lastSuccessfulPlayerId) next.statsByPlayer[next.lastSuccessfulPlayerId].tricksWon += 1;
    next.trickNo += 1;
    next.currentTarget = null;
    next.lastSuccessfulPlayerId = null;
    next.passedPlayerIds = [];
    next.activePlayerId = leader;
    return next;
  }
  next.activePlayerId = nextEligiblePlayer(next, playerId);
  return next;
}

export function playPresidentTurn(state: PresidentState, target: PresidentTarget, darts: GameDart[]): PresidentState {
  if (state.finished) return state;
  const next = clonePresidentState(state);
  const playerId = next.activePlayerId;
  const hand = next.hands[playerId] || [];
  const legal = presidentLegalTargets(hand, next.currentTarget, next.revolutionActive)
    .some((t) => t.value === target.value && t.size === target.size);
  if (!legal) return passPresidentTurn(next, true);

  const normalizedDarts = (darts || []).slice(0, 3);
  const stats = next.statsByPlayer[playerId];
  stats.visits += 1;
  updateImpactStats(stats, normalizedDarts);

  let success = false;
  let coupEtat = false;
  for (const dart of normalizedDarts) {
    const hit = dartMatchesTarget(dart, target, next);
    if (hit.ok) success = true;
    if (hit.coupEtat) coupEtat = true;
  }
  const cardsBefore = hand.length;
  let revolutionTriggered = false;
  if (success) {
    next.hands[playerId] = removeCards(hand, target.value, target.size);
    stats.successfulPlays += 1;
    stats.cardsPlayed += target.size;
    if (target.size === 1) stats.singlesPlayed += 1;
    if (target.size === 2) stats.pairsPlayed += 1;
    if (target.size === 3) stats.triplesPlayed += 1;
    next.currentTarget = { ...target };
    next.lastSuccessfulPlayerId = playerId;
    next.passedPlayerIds = next.passedPlayerIds.filter((id) => id !== playerId);

    if (coupEtat && next.rules.variant === "chaos" && next.rules.coupEtat) {
      stats.coupEtats += 1;
    }
    if (next.rules.variant === "chaos" && next.rules.revolution && target.size === 3 && target.value === 20) {
      next.revolutionActive = !next.revolutionActive;
      stats.revolutions += 1;
      revolutionTriggered = true;
    }

    if (next.hands[playerId].length === 0 && !next.finishedPlayerIds.includes(playerId)) {
      next.finishedPlayerIds.push(playerId);
      next.currentRoundRanking.push(playerId);
    }
  } else {
    stats.failedPlays += 1;
    if (!next.passedPlayerIds.includes(playerId)) next.passedPlayerIds.push(playerId);
  }

  next.history.push({
    id: `pres-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    roundNo: next.roundNo, trickNo: next.trickNo, playerId, target: { ...target },
    darts: normalizedDarts, labels: normalizedDarts.map(presidentDartLabel), success, passed: !success,
    coupEtat, revolutionTriggered, cardsBefore, cardsAfter: next.hands[playerId]?.length || cardsBefore, createdAt: Date.now(),
  });

  const completed = maybeCompleteRound(next);
  if (completed !== next || completed.finished || completed.roundNo !== next.roundNo) return completed;

  if (coupEtat) {
    if (next.lastSuccessfulPlayerId) next.statsByPlayer[next.lastSuccessfulPlayerId].tricksWon += 1;
    next.trickNo += 1;
    next.currentTarget = null;
    next.lastSuccessfulPlayerId = null;
    next.passedPlayerIds = [];
    next.activePlayerId = next.finishedPlayerIds.includes(playerId) ? nextEligiblePlayer(next, playerId) : playerId;
    return next;
  }

  if (trickShouldReset(next)) {
    const leader = chooseLeaderAfterTrick(next);
    if (next.lastSuccessfulPlayerId) next.statsByPlayer[next.lastSuccessfulPlayerId].tricksWon += 1;
    next.trickNo += 1;
    next.currentTarget = null;
    next.lastSuccessfulPlayerId = null;
    next.passedPlayerIds = [];
    next.activePlayerId = leader;
    return next;
  }

  next.activePlayerId = nextEligiblePlayer(next, playerId);
  return next;
}

export function clonePresidentState(state: PresidentState): PresidentState {
  return {
    ...state,
    rules: { ...state.rules },
    players: state.players.map((p) => ({ ...p })),
    order: [...state.order],
    hands: Object.fromEntries(Object.entries(state.hands).map(([id, hand]) => [id, [...hand]])),
    currentTarget: state.currentTarget ? { ...state.currentTarget } : null,
    passedPlayerIds: [...state.passedPlayerIds],
    finishedPlayerIds: [...state.finishedPlayerIds],
    currentRoundRanking: [...state.currentRoundRanking],
    previousRoundRanking: [...state.previousRoundRanking],
    previousRoles: { ...state.previousRoles },
    taxesThisRound: state.taxesThisRound.map((x) => ({ ...x, given: [...x.given], returned: [...x.returned] })),
    history: state.history.map((x) => ({ ...x, target: x.target ? { ...x.target } : null, darts: x.darts.map((d) => ({ ...d })), labels: [...x.labels] })),
    roundResults: state.roundResults.map((r) => ({ ...r, ranking: [...r.ranking], roles: { ...r.roles }, powerPoints: { ...r.powerPoints }, taxes: r.taxes.map((x) => ({ ...x, given: [...x.given], returned: [...x.returned] })) })),
    statsByPlayer: Object.fromEntries(Object.entries(state.statsByPlayer).map(([id, s]) => [id, { ...s }])),
    standings: [...state.standings],
  };
}

export function getPresidentStandings(state: PresidentState): Array<{ id: string; name: string; powerPoints: number; presidents: number; avgRank: number; hand: number }> {
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const ids = state.finished && state.standings.length ? state.standings : [...state.order].sort((a, b) => state.statsByPlayer[b].powerPoints - state.statsByPlayer[a].powerPoints);
  return ids.map((id) => {
    const s = state.statsByPlayer[id];
    return { id, name: byId.get(id)?.name || id, powerPoints: s.powerPoints, presidents: s.president, avgRank: s.roundsPlayed ? s.rankTotal / s.roundsPlayed : 0, hand: state.hands[id]?.length || 0 };
  });
}
