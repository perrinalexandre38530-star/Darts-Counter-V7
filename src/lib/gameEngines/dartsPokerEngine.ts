// =============================================================
// DARTS POKER — moteur pur V1
// Marché dynamique de 20 cartes + mains de poker en 5 cartes.
// =============================================================

import type { GameDart, Player } from "../types-game";

export type PokerSuit = "S" | "H" | "D" | "C";
export type PokerCategory =
  | "high_card"
  | "pair"
  | "two_pair"
  | "three_of_a_kind"
  | "straight"
  | "flush"
  | "full_house"
  | "four_of_a_kind"
  | "straight_flush"
  | "royal_flush";

export type DartsPokerBotLevel = "easy" | "normal" | "hard";
export type DartsPokerScoreInputMethod = "keypad" | "dartboard";

export type DartsPokerConfigPayload = {
  mode: "darts_poker";
  players: number;
  selectedIds: string[];
  playersList?: any[];
  playerDartSets?: Record<string, string | null>;
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: DartsPokerBotLevel;
  rounds: 3 | 5 | 7 | 10;
  dartsPerHand: 5 | 6 | 7;
  powersEnabled: boolean;
  jokerEnabled: boolean;
  autoDrawMissing: boolean;
  openHands: boolean;
  randomOrder: boolean;
  scoreInputMethod: DartsPokerScoreInputMethod;
};

export type PokerCard = {
  id: string;
  rank: number;
  suit: PokerSuit | null;
  joker?: boolean;
};

export type PokerEvaluation = {
  category: PokerCategory;
  categoryRank: number;
  label: string;
  score: number;
  tiebreak: number[];
  bestFive: PokerCard[];
};

export type DartsPokerPlayerStats = {
  darts: number;
  visits: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  cardsCollected: number;
  marketCards: number;
  autoDraws: number;
  exchangesEarned: number;
  exchangesUsed: number;
  choicesEarned: number;
  choicesUsed: number;
  jokers: number;
  handsPlayed: number;
  handsWon: number;
  handsTied: number;
  roundPoints: number;
  totalHandScore: number;
  bestHandScore: number;
  bestHandCategory: PokerCategory | null;
  bestHandLabel: string | null;
  highCardHands: number;
  pairs: number;
  twoPairs: number;
  threeOfAKinds: number;
  straights: number;
  flushes: number;
  fullHouses: number;
  fourOfAKinds: number;
  straightFlushes: number;
  royalFlushes: number;
  perfectVisits: number;
  emptyVisits: number;
  hitsBySegment: Record<string, number>;
  cardsByRank: Record<string, number>;
  cardsBySuit: Record<string, number>;
  handScores: number[];
};

export type DartsPokerHandState = {
  playerId: string;
  cards: PokerCard[];
  dartsUsed: number;
  exchangeTokens: number;
  choiceTokens: number;
  completed: boolean;
  evaluation: PokerEvaluation | null;
  bestFive: PokerCard[];
  rank: number | null;
  tied: boolean;
  roundWin: boolean;
};

export type DartsPokerVisitEvent = {
  type: "miss" | "market_card" | "exchange_token" | "choice_token" | "bull_choice" | "joker" | "joker_already_owned";
  label: string;
  sector?: number | null;
  card?: PokerCard | null;
};

export type DartsPokerVisit = {
  id: string;
  createdAt: string;
  round: number;
  visit: number;
  playerId: string;
  darts: GameDart[];
  labels: string[];
  cardsBefore: PokerCard[];
  cardsAfter: PokerCard[];
  dartsUsedBefore: number;
  dartsUsedAfter: number;
  exchangeTokensBefore: number;
  exchangeTokensAfter: number;
  choiceTokensBefore: number;
  choiceTokensAfter: number;
  events: DartsPokerVisitEvent[];
};

export type DartsPokerRoundResult = {
  round: number;
  winnerIds: string[];
  rows: Array<{
    playerId: string;
    rank: number;
    tied: boolean;
    win: boolean;
    evaluation: PokerEvaluation;
    cards: PokerCard[];
    bestFive: PokerCard[];
  }>;
};

export type DartsPokerPendingChoice = {
  playerId: string;
  cards: PokerCard[];
};

export type DartsPokerPhase = "throwing" | "powers" | "round_result" | "finished";

export type DartsPokerState = {
  sport: "darts";
  mode: "darts_poker";
  config: DartsPokerConfigPayload;
  players: Player[];
  market: Record<number, PokerCard | null>;
  deck: PokerCard[];
  discard: PokerCard[];
  roundIndex: number;
  activePlayerIndex: number;
  phase: DartsPokerPhase;
  handsByPlayer: Record<string, DartsPokerHandState>;
  statsByPlayer: Record<string, DartsPokerPlayerStats>;
  visits: DartsPokerVisit[];
  rounds: DartsPokerRoundResult[];
  pendingChoice: DartsPokerPendingChoice | null;
  winnerIds: string[];
  standings: Array<{
    id: string;
    name: string;
    rank: number;
    tied: boolean;
    wins: number;
    ties: number;
    bestHandScore: number;
    bestHandLabel: string | null;
    averageHandScore: number;
    darts: number;
    hits: number;
  }>;
  startedAt: number;
  finishedAt?: number;
};

const SUITS: PokerSuit[] = ["S", "H", "D", "C"];
const CATEGORY_RANK: Record<PokerCategory, number> = {
  high_card: 0,
  pair: 1,
  two_pair: 2,
  three_of_a_kind: 3,
  straight: 4,
  flush: 5,
  full_house: 6,
  four_of_a_kind: 7,
  straight_flush: 8,
  royal_flush: 9,
};

const CATEGORY_LABEL: Record<PokerCategory, string> = {
  high_card: "Carte haute",
  pair: "Paire",
  two_pair: "Double paire",
  three_of_a_kind: "Brelan",
  straight: "Suite",
  flush: "Couleur",
  full_house: "Full",
  four_of_a_kind: "Carré",
  straight_flush: "Quinte flush",
  royal_flush: "Quinte flush royale",
};

export function createPokerDeck(): PokerCard[] {
  const cards: PokerCard[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank += 1) cards.push({ id: `${suit}${rank}`, rank, suit });
  }
  return cards;
}

export function shufflePokerCards(cards: PokerCard[], rng: () => number = Math.random): PokerCard[] {
  const out = cards.map((card) => ({ ...card }));
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.max(0, Math.min(.999999999, rng())) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pokerRankLabel(rank: number): string {
  if (rank === 14) return "A";
  if (rank === 13) return "K";
  if (rank === 12) return "Q";
  if (rank === 11) return "J";
  return String(rank);
}

export function pokerSuitSymbol(suit: PokerSuit | null): string {
  if (suit === "S") return "♠";
  if (suit === "H") return "♥";
  if (suit === "D") return "♦";
  if (suit === "C") return "♣";
  return "★";
}

export function pokerCardLabel(card: PokerCard | null | undefined): string {
  if (!card) return "—";
  if (card.joker) return "JOKER";
  return `${pokerRankLabel(card.rank)}${pokerSuitSymbol(card.suit)}`;
}

export function dartsPokerDartLabel(dart: GameDart): string {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "IB") return "DBULL";
  return `${dart.bed}${dart.number || ""}`;
}

function combinations<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  function walk(start: number, picked: T[]) {
    if (picked.length === size) { out.push([...picked]); return; }
    for (let i = start; i <= items.length - (size - picked.length); i += 1) {
      picked.push(items[i]); walk(i + 1, picked); picked.pop();
    }
  }
  walk(0, []);
  return out;
}

function encodeScore(categoryRank: number, tiebreak: number[]): number {
  let value = categoryRank;
  for (let i = 0; i < 5; i += 1) value = value * 15 + Number(tiebreak[i] || 0);
  return value;
}

function rankName(rank: number): string {
  const names: Record<number, string> = { 14: "As", 13: "Rois", 12: "Dames", 11: "Valets", 10: "10", 9: "9", 8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2" };
  return names[rank] || String(rank);
}

function evaluateFiveWithoutJoker(cards: PokerCard[]): PokerEvaluation {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((card) => card.rank);
  const countMap = new Map<number, number>();
  ranks.forEach((rank) => countMap.set(rank, (countMap.get(rank) || 0) + 1));
  const groups = [...countMap.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = sorted.every((card) => card.suit === sorted[0].suit);
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) straightHigh = uniqueRanks[0];
    else if (uniqueRanks.join(",") === "14,5,4,3,2") straightHigh = 5;
  }

  let category: PokerCategory = "high_card";
  let tiebreak = [...ranks];
  let detail = rankName(ranks[0]);

  if (flush && straightHigh) {
    category = straightHigh === 14 ? "royal_flush" : "straight_flush";
    tiebreak = [straightHigh];
    detail = straightHigh === 14 ? "à l’As" : `au ${rankName(straightHigh)}`;
  } else if (groups[0]?.[1] === 4) {
    category = "four_of_a_kind";
    const quad = groups[0][0];
    const kicker = groups.find((group) => group[1] === 1)?.[0] || 0;
    tiebreak = [quad, kicker]; detail = `de ${rankName(quad)}`;
  } else if (groups[0]?.[1] === 3 && groups[1]?.[1] === 2) {
    category = "full_house";
    tiebreak = [groups[0][0], groups[1][0]]; detail = `${rankName(groups[0][0])} par ${rankName(groups[1][0])}`;
  } else if (flush) {
    category = "flush"; tiebreak = [...ranks]; detail = `à l’${rankName(ranks[0])}`;
  } else if (straightHigh) {
    category = "straight"; tiebreak = [straightHigh]; detail = `au ${rankName(straightHigh)}`;
  } else if (groups[0]?.[1] === 3) {
    category = "three_of_a_kind";
    const trip = groups[0][0]; const kickers = groups.filter((group) => group[1] === 1).map((group) => group[0]).sort((a, b) => b - a);
    tiebreak = [trip, ...kickers]; detail = `de ${rankName(trip)}`;
  } else if (groups[0]?.[1] === 2 && groups[1]?.[1] === 2) {
    category = "two_pair";
    const pairs = groups.filter((group) => group[1] === 2).map((group) => group[0]).sort((a, b) => b - a);
    const kicker = groups.find((group) => group[1] === 1)?.[0] || 0;
    tiebreak = [...pairs, kicker]; detail = `${rankName(pairs[0])} et ${rankName(pairs[1])}`;
  } else if (groups[0]?.[1] === 2) {
    category = "pair";
    const pair = groups[0][0]; const kickers = groups.filter((group) => group[1] === 1).map((group) => group[0]).sort((a, b) => b - a);
    tiebreak = [pair, ...kickers]; detail = `de ${rankName(pair)}`;
  }

  const categoryRank = CATEGORY_RANK[category];
  return {
    category,
    categoryRank,
    label: `${CATEGORY_LABEL[category]}${detail ? ` ${detail}` : ""}`,
    score: encodeScore(categoryRank, tiebreak),
    tiebreak,
    bestFive: sorted,
  };
}

function evaluateFive(cards: PokerCard[]): PokerEvaluation {
  const jokerIndexes = cards.map((card, index) => card.joker ? index : -1).filter((index) => index >= 0);
  if (!jokerIndexes.length) return evaluateFiveWithoutJoker(cards);
  const jokerIndex = jokerIndexes[0];
  const occupied = new Set(cards.filter((card) => !card.joker).map((card) => card.id));
  let best: PokerEvaluation | null = null;
  for (const candidate of createPokerDeck()) {
    if (occupied.has(candidate.id)) continue;
    const replaced = cards.map((card, index) => index === jokerIndex ? candidate : card);
    const evaluated = evaluateFiveWithoutJoker(replaced);
    if (!best || evaluated.score > best.score) best = { ...evaluated, bestFive: cards.map((card, index) => index === jokerIndex ? { ...candidate, id: "JOKER", joker: true } : card) };
  }
  return best || evaluateFiveWithoutJoker(cards.filter((card) => !card.joker).slice(0, 5));
}

export function evaluateBestPokerHand(cards: PokerCard[]): PokerEvaluation | null {
  if (!Array.isArray(cards) || cards.length < 5) return null;
  let best: PokerEvaluation | null = null;
  for (const combo of combinations(cards, 5)) {
    const evaluated = evaluateFive(combo);
    if (!best || evaluated.score > best.score) best = evaluated;
  }
  return best;
}

export function comparePokerEvaluations(a: PokerEvaluation | null, b: PokerEvaluation | null): number {
  return Number(a?.score || 0) - Number(b?.score || 0);
}

export function emptyDartsPokerStats(): DartsPokerPlayerStats {
  return {
    darts: 0, visits: 0, hits: 0, singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0,
    cardsCollected: 0, marketCards: 0, autoDraws: 0, exchangesEarned: 0, exchangesUsed: 0,
    choicesEarned: 0, choicesUsed: 0, jokers: 0, handsPlayed: 0, handsWon: 0, handsTied: 0,
    roundPoints: 0, totalHandScore: 0, bestHandScore: 0, bestHandCategory: null, bestHandLabel: null,
    highCardHands: 0, pairs: 0, twoPairs: 0, threeOfAKinds: 0, straights: 0, flushes: 0,
    fullHouses: 0, fourOfAKinds: 0, straightFlushes: 0, royalFlushes: 0,
    perfectVisits: 0, emptyVisits: 0, hitsBySegment: {}, cardsByRank: {}, cardsBySuit: {}, handScores: [],
  };
}

function emptyHand(playerId: string): DartsPokerHandState {
  return { playerId, cards: [], dartsUsed: 0, exchangeTokens: 0, choiceTokens: 0, completed: false, evaluation: null, bestFive: [], rank: null, tied: false, roundWin: false };
}

function normalizePlayers(input: Player[]): Player[] {
  const seen = new Set<string>();
  const out: Player[] = [];
  (input || []).forEach((raw: any, index) => {
    const id = String(raw?.id || raw?.profileId || `p${index + 1}`).trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ id, name: String(raw?.name || raw?.displayName || `Joueur ${index + 1}`) });
  });
  return out.length ? out : [{ id: "p1", name: "Joueur 1" }];
}

function occupiedCardIds(state: DartsPokerState): Set<string> {
  const ids = new Set<string>();
  Object.values(state.market || {}).forEach((card) => { if (card && !card.joker) ids.add(card.id); });
  const active = state.players[state.activePlayerIndex];
  (state.handsByPlayer?.[active?.id]?.cards || []).forEach((card) => { if (!card.joker) ids.add(card.id); });
  return ids;
}

function refillDeck(state: DartsPokerState, rng: () => number) {
  if (state.deck.length) return;
  const occupied = occupiedCardIds(state);
  const pool = state.discard.filter((card) => !card.joker && !occupied.has(card.id));
  state.discard = [];
  const fallback = createPokerDeck().filter((card) => !occupied.has(card.id));
  state.deck = shufflePokerCards(pool.length >= 8 ? pool : fallback, rng);
}

function drawCard(state: DartsPokerState, rng: () => number): PokerCard | null {
  refillDeck(state, rng);
  const card = state.deck.pop() || null;
  return card ? { ...card } : null;
}

function dealMarket(state: DartsPokerState, rng: () => number) {
  Object.values(state.market || {}).forEach((card) => { if (card && !card.joker) state.discard.push(card); });
  state.market = {};
  for (let sector = 1; sector <= 20; sector += 1) state.market[sector] = drawCard(state, rng);
}

export function createDartsPokerState(playersInput: Player[], configInput: DartsPokerConfigPayload, rng: () => number = Math.random): DartsPokerState {
  const players = normalizePlayers(playersInput).slice(0, 8);
  const config: DartsPokerConfigPayload = {
    ...configInput,
    mode: "darts_poker",
    players: players.length,
    selectedIds: players.map((player) => player.id),
    rounds: ([3, 5, 7, 10].includes(Number(configInput?.rounds)) ? Number(configInput.rounds) : 5) as any,
    dartsPerHand: ([5, 6, 7].includes(Number(configInput?.dartsPerHand)) ? Number(configInput.dartsPerHand) : 6) as any,
    powersEnabled: configInput?.powersEnabled !== false,
    jokerEnabled: configInput?.jokerEnabled !== false,
    autoDrawMissing: true,
    openHands: configInput?.openHands !== false,
    randomOrder: Boolean(configInput?.randomOrder),
    scoreInputMethod: configInput?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
    botLevel: configInput?.botLevel === "easy" || configInput?.botLevel === "hard" ? configInput.botLevel : "normal",
  };
  const handsByPlayer: Record<string, DartsPokerHandState> = {};
  const statsByPlayer: Record<string, DartsPokerPlayerStats> = {};
  players.forEach((player) => { handsByPlayer[player.id] = emptyHand(player.id); statsByPlayer[player.id] = emptyDartsPokerStats(); });
  const state: DartsPokerState = {
    sport: "darts", mode: "darts_poker", config, players,
    market: {}, deck: shufflePokerCards(createPokerDeck(), rng), discard: [],
    roundIndex: 1, activePlayerIndex: 0, phase: "throwing", handsByPlayer, statsByPlayer,
    visits: [], rounds: [], pendingChoice: null, winnerIds: [], standings: [], startedAt: Date.now(),
  };
  dealMarket(state, rng);
  return state;
}

export function cloneDartsPokerState(state: DartsPokerState): DartsPokerState {
  return JSON.parse(JSON.stringify(state));
}

export function getDartsPokerActivePlayer(state: DartsPokerState): Player | null {
  return state.players[state.activePlayerIndex] || null;
}

export function getDartsPokerActiveHand(state: DartsPokerState): DartsPokerHandState | null {
  const player = getDartsPokerActivePlayer(state);
  return player ? state.handsByPlayer[player.id] || null : null;
}

function addCardStats(stats: DartsPokerPlayerStats, card: PokerCard, source: "market" | "auto" | "choice" | "exchange" | "joker") {
  stats.cardsCollected += 1;
  if (source === "market") stats.marketCards += 1;
  if (source === "auto") stats.autoDraws += 1;
  if (source === "joker") stats.jokers += 1;
  if (!card.joker) {
    const rank = pokerRankLabel(card.rank); stats.cardsByRank[rank] = (stats.cardsByRank[rank] || 0) + 1;
    const suit = pokerSuitSymbol(card.suit); stats.cardsBySuit[suit] = (stats.cardsBySuit[suit] || 0) + 1;
  }
}

function registerDart(stats: DartsPokerPlayerStats, dart: GameDart) {
  stats.darts += 1;
  const label = dartsPokerDartLabel(dart);
  stats.hitsBySegment[label] = (stats.hitsBySegment[label] || 0) + 1;
  if (!dart || dart.bed === "MISS") { stats.misses += 1; return; }
  stats.hits += 1;
  if (dart.bed === "S") stats.singles += 1;
  else if (dart.bed === "D") stats.doubles += 1;
  else if (dart.bed === "T") stats.triples += 1;
  else if (dart.bed === "OB") stats.bulls += 1;
  else if (dart.bed === "IB") stats.dbulls += 1;
}

export function playDartsPokerVisit(stateInput: DartsPokerState, dartsInput: GameDart[], rng: () => number = Math.random): DartsPokerState {
  const state = cloneDartsPokerState(stateInput);
  if (state.phase !== "throwing" || state.pendingChoice) return state;
  const player = getDartsPokerActivePlayer(state);
  const hand = getDartsPokerActiveHand(state);
  if (!player || !hand) return state;
  const stats = state.statsByPlayer[player.id] || (state.statsByPlayer[player.id] = emptyDartsPokerStats());
  const remaining = Math.max(0, state.config.dartsPerHand - hand.dartsUsed);
  const darts = (Array.isArray(dartsInput) ? dartsInput : []).slice(0, Math.min(3, remaining));
  if (!darts.length) return state;
  const beforeCards = hand.cards.map((card) => ({ ...card }));
  const exchangeBefore = hand.exchangeTokens;
  const choiceBefore = hand.choiceTokens;
  const events: DartsPokerVisitEvent[] = [];
  let visitHits = 0;

  darts.forEach((dart) => {
    registerDart(stats, dart);
    hand.dartsUsed += 1;
    if (!dart || dart.bed === "MISS") {
      events.push({ type: "miss", label: "MISS · aucune carte" });
      return;
    }
    visitHits += 1;
    if (dart.bed === "OB") {
      if (state.config.powersEnabled) {
        hand.choiceTokens += 1; stats.choicesEarned += 1;
        events.push({ type: "bull_choice", label: "BULL · Choix de 2 cartes gagné" });
      } else {
        const card = drawCard(state, rng); if (card) { hand.cards.push(card); addCardStats(stats, card, "choice"); }
        events.push({ type: "bull_choice", label: card ? `BULL · ${pokerCardLabel(card)}` : "BULL" , card });
      }
      return;
    }
    if (dart.bed === "IB") {
      const hasJoker = hand.cards.some((card) => card.joker);
      if (state.config.jokerEnabled && !hasJoker) {
        const joker: PokerCard = { id: "JOKER", rank: 15, suit: null, joker: true };
        hand.cards.push(joker); addCardStats(stats, joker, "joker");
        events.push({ type: "joker", label: "DBULL · JOKER obtenu", card: joker });
      } else if (state.config.powersEnabled) {
        hand.choiceTokens += 1; stats.choicesEarned += 1;
        events.push({ type: "joker_already_owned", label: "DBULL · Choix bonus gagné" });
      }
      return;
    }
    const sector = Math.max(1, Math.min(20, Number(dart.number || 0)));
    const card = state.market[sector] || null;
    if (card) {
      hand.cards.push(card); addCardStats(stats, card, "market");
      state.market[sector] = drawCard(state, rng);
      events.push({ type: "market_card", label: `${dartsPokerDartLabel(dart)} · ${pokerCardLabel(card)}`, sector, card });
    }
    if (state.config.powersEnabled && dart.bed === "D") {
      hand.exchangeTokens += 1; stats.exchangesEarned += 1;
      events.push({ type: "exchange_token", label: "DOUBLE · Échange gagné", sector });
    }
    if (state.config.powersEnabled && dart.bed === "T") {
      hand.choiceTokens += 1; stats.choicesEarned += 1;
      events.push({ type: "choice_token", label: "TRIPLE · Choix gagné", sector });
    }
  });

  stats.visits += 1;
  if (visitHits === darts.length && darts.length === 3) stats.perfectVisits += 1;
  if (visitHits === 0) stats.emptyVisits += 1;
  const visit: DartsPokerVisit = {
    id: `poker-visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(), round: state.roundIndex,
    visit: state.visits.filter((row) => String(row.playerId) === String(player.id) && Number(row.round) === state.roundIndex).length + 1,
    playerId: player.id, darts, labels: darts.map(dartsPokerDartLabel), cardsBefore: beforeCards,
    cardsAfter: hand.cards.map((card) => ({ ...card })), dartsUsedBefore: hand.dartsUsed - darts.length, dartsUsedAfter: hand.dartsUsed,
    exchangeTokensBefore: exchangeBefore, exchangeTokensAfter: hand.exchangeTokens,
    choiceTokensBefore: choiceBefore, choiceTokensAfter: hand.choiceTokens, events,
  };
  state.visits.push(visit);
  if (hand.dartsUsed >= state.config.dartsPerHand) state.phase = "powers";
  return state;
}

export function openDartsPokerChoice(stateInput: DartsPokerState, rng: () => number = Math.random): DartsPokerState {
  const state = cloneDartsPokerState(stateInput);
  if (state.phase !== "powers" || state.pendingChoice) return state;
  const player = getDartsPokerActivePlayer(state); const hand = getDartsPokerActiveHand(state);
  if (!player || !hand || hand.choiceTokens <= 0) return state;
  const cards = [drawCard(state, rng), drawCard(state, rng)].filter(Boolean) as PokerCard[];
  if (!cards.length) return state;
  state.pendingChoice = { playerId: player.id, cards };
  return state;
}

export function resolveDartsPokerChoice(stateInput: DartsPokerState, selectedIndex: number): DartsPokerState {
  const state = cloneDartsPokerState(stateInput);
  const pending = state.pendingChoice; const player = getDartsPokerActivePlayer(state); const hand = getDartsPokerActiveHand(state);
  if (!pending || !player || !hand || String(pending.playerId) !== String(player.id)) return state;
  const index = Math.max(0, Math.min(pending.cards.length - 1, Number(selectedIndex) || 0));
  const selected = pending.cards[index];
  pending.cards.forEach((card, cardIndex) => { if (cardIndex !== index) state.discard.push(card); });
  if (selected) {
    hand.cards.push(selected);
    const stats = state.statsByPlayer[player.id]; stats.choicesUsed += 1; addCardStats(stats, selected, "choice");
  }
  hand.choiceTokens = Math.max(0, hand.choiceTokens - 1);
  state.pendingChoice = null;
  return state;
}

export function useDartsPokerExchange(stateInput: DartsPokerState, cardIndex: number, rng: () => number = Math.random): DartsPokerState {
  const state = cloneDartsPokerState(stateInput);
  if (state.phase !== "powers" || state.pendingChoice) return state;
  const player = getDartsPokerActivePlayer(state); const hand = getDartsPokerActiveHand(state);
  if (!player || !hand || hand.exchangeTokens <= 0 || !hand.cards.length) return state;
  const index = Math.max(0, Math.min(hand.cards.length - 1, Number(cardIndex) || 0));
  if (hand.cards[index]?.joker) return state;
  const replacement = drawCard(state, rng); if (!replacement) return state;
  const old = hand.cards[index]; state.discard.push(old); hand.cards[index] = replacement;
  hand.exchangeTokens -= 1;
  const stats = state.statsByPlayer[player.id]; stats.exchangesUsed += 1; addCardStats(stats, replacement, "exchange");
  return state;
}

function incrementCategory(stats: DartsPokerPlayerStats, category: PokerCategory) {
  if (category === "high_card") stats.highCardHands += 1;
  else if (category === "pair") stats.pairs += 1;
  else if (category === "two_pair") stats.twoPairs += 1;
  else if (category === "three_of_a_kind") stats.threeOfAKinds += 1;
  else if (category === "straight") stats.straights += 1;
  else if (category === "flush") stats.flushes += 1;
  else if (category === "full_house") stats.fullHouses += 1;
  else if (category === "four_of_a_kind") stats.fourOfAKinds += 1;
  else if (category === "straight_flush") stats.straightFlushes += 1;
  else if (category === "royal_flush") stats.royalFlushes += 1;
}

function finalizeRound(state: DartsPokerState) {
  const rows = state.players.map((player) => {
    const hand = state.handsByPlayer[player.id];
    return { playerId: player.id, evaluation: hand.evaluation as PokerEvaluation, cards: hand.cards.map((card) => ({ ...card })), bestFive: hand.bestFive.map((card) => ({ ...card })) };
  }).sort((a, b) => b.evaluation.score - a.evaluation.score);
  const bestScore = rows[0]?.evaluation?.score || 0;
  const winnerIds = rows.filter((row) => row.evaluation.score === bestScore).map((row) => row.playerId);
  let rank = 0; let previousScore: number | null = null;
  const roundRows = rows.map((row, index) => {
    if (previousScore !== row.evaluation.score) rank = index + 1;
    previousScore = row.evaluation.score;
    const tied = rows.filter((candidate) => candidate.evaluation.score === row.evaluation.score).length > 1;
    const win = winnerIds.includes(row.playerId);
    const hand = state.handsByPlayer[row.playerId]; hand.rank = rank; hand.tied = tied; hand.roundWin = win;
    const stats = state.statsByPlayer[row.playerId];
    if (win) { stats.handsWon += 1; stats.roundPoints += 1; }
    if (win && winnerIds.length > 1) stats.handsTied += 1;
    return { playerId: row.playerId, rank, tied, win, evaluation: row.evaluation, cards: row.cards, bestFive: row.bestFive };
  });
  state.rounds.push({ round: state.roundIndex, winnerIds, rows: roundRows });
  state.phase = "round_result";
}

export function finishDartsPokerHand(stateInput: DartsPokerState, rng: () => number = Math.random): DartsPokerState {
  const state = cloneDartsPokerState(stateInput);
  if (state.phase !== "powers" || state.pendingChoice) return state;
  const player = getDartsPokerActivePlayer(state); const hand = getDartsPokerActiveHand(state);
  if (!player || !hand) return state;
  // Une main de poker doit toujours contenir cinq cartes : les cartes manquantes
  // sont complétées depuis le sabot, conformément à la règle EXPRESS validée.
  while (hand.cards.length < 5) {
    const card = drawCard(state, rng); if (!card) break;
    hand.cards.push(card); addCardStats(state.statsByPlayer[player.id], card, "auto");
  }
  const evaluation = evaluateBestPokerHand(hand.cards);
  if (!evaluation) return state;
  hand.completed = true; hand.evaluation = evaluation; hand.bestFive = evaluation.bestFive;
  const stats = state.statsByPlayer[player.id];
  stats.handsPlayed += 1; stats.totalHandScore += evaluation.score; stats.handScores.push(evaluation.score); incrementCategory(stats, evaluation.category);
  if (evaluation.score > stats.bestHandScore) { stats.bestHandScore = evaluation.score; stats.bestHandCategory = evaluation.category; stats.bestHandLabel = evaluation.label; }
  hand.cards.filter((card) => !card.joker).forEach((card) => state.discard.push(card));
  hand.exchangeTokens = 0; hand.choiceTokens = 0;

  const nextIndex = state.players.findIndex((candidate, index) => index > state.activePlayerIndex && !state.handsByPlayer[candidate.id].completed);
  if (nextIndex >= 0) {
    state.activePlayerIndex = nextIndex; state.phase = "throwing";
  } else {
    finalizeRound(state);
  }
  return state;
}

function buildStandings(state: DartsPokerState) {
  const rows = state.players.map((player) => {
    const stats = state.statsByPlayer[player.id];
    return {
      id: player.id, name: player.name, wins: stats.handsWon, ties: stats.handsTied,
      bestHandScore: stats.bestHandScore, bestHandLabel: stats.bestHandLabel,
      averageHandScore: stats.handsPlayed ? stats.totalHandScore / stats.handsPlayed : 0,
      darts: stats.darts, hits: stats.hits,
    };
  }).sort((a, b) => b.wins - a.wins || b.bestHandScore - a.bestHandScore || b.averageHandScore - a.averageHandScore || b.hits - a.hits);
  let rank = 0; let previousKey = "";
  return rows.map((row, index) => {
    const key = `${row.wins}|${row.bestHandScore}|${row.averageHandScore}|${row.hits}`;
    if (key !== previousKey) rank = index + 1;
    previousKey = key;
    const tied = rows.filter((candidate) => `${candidate.wins}|${candidate.bestHandScore}|${candidate.averageHandScore}|${candidate.hits}` === key).length > 1;
    return { ...row, rank, tied };
  });
}

export function advanceDartsPokerRound(stateInput: DartsPokerState, rng: () => number = Math.random): DartsPokerState {
  const state = cloneDartsPokerState(stateInput);
  if (state.phase !== "round_result") return state;
  if (state.roundIndex >= state.config.rounds) {
    state.standings = buildStandings(state);
    const topRank = state.standings[0]?.rank || 1;
    state.winnerIds = state.standings.filter((row) => row.rank === topRank).map((row) => row.id);
    state.phase = "finished"; state.finishedAt = Date.now();
    return state;
  }
  state.roundIndex += 1; state.activePlayerIndex = 0; state.pendingChoice = null;
  state.players.forEach((player) => { state.handsByPlayer[player.id] = emptyHand(player.id); });
  dealMarket(state, rng);
  state.phase = "throwing";
  return state;
}

export function forceFinishDartsPokerMatch(stateInput: DartsPokerState): DartsPokerState {
  const state = cloneDartsPokerState(stateInput);
  state.standings = buildStandings(state);
  state.winnerIds = state.standings.filter((row) => row.rank === 1).map((row) => row.id);
  state.phase = "finished"; state.finishedAt = Date.now();
  return state;
}

export function pickBestPokerMarketSector(state: DartsPokerState, playerId: string): number {
  const hand = state.handsByPlayer[playerId] || emptyHand(playerId);
  let bestSector = 20; let bestScore = -1;
  for (let sector = 1; sector <= 20; sector += 1) {
    const card = state.market[sector]; if (!card) continue;
    const cards = [...hand.cards, card];
    const evaluation = cards.length >= 5 ? evaluateBestPokerHand(cards) : null;
    const rankCounts = new Map<number, number>(); cards.filter((c) => !c.joker).forEach((c) => rankCounts.set(c.rank, (rankCounts.get(c.rank) || 0) + 1));
    const suitCounts = new Map<string, number>(); cards.filter((c) => !c.joker).forEach((c) => suitCounts.set(String(c.suit), (suitCounts.get(String(c.suit)) || 0) + 1));
    const heuristic = Number(evaluation?.score || 0) + Math.max(0, ...(rankCounts.values())) * 100000 + Math.max(0, ...(suitCounts.values())) * 1000 + card.rank;
    if (heuristic > bestScore) { bestScore = heuristic; bestSector = sector; }
  }
  return bestSector;
}

export function chooseBestPokerOption(handCards: PokerCard[], options: PokerCard[]): number {
  let bestIndex = 0; let bestScore = -1;
  options.forEach((card, index) => {
    const evaluation = evaluateBestPokerHand([...handCards, card]);
    const score = Number(evaluation?.score || card.rank);
    if (score > bestScore) { bestScore = score; bestIndex = index; }
  });
  return bestIndex;
}
