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
  deckCopies: 1;
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
  playedSuits?: number[];
};

export type PresidentRoundResult = {
  roundNo: number;
  ranking: string[];
  roles: Record<string, string>;
  powerPoints: Record<string, number>;
  kilos: Record<string, number>;
  remainingCards: Record<string, number[]>;
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
  givenSuits?: number[];
  returnedSuits?: number[];
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
  kilos: number;
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
  suitsByPlayer: Record<string, number[]>;
  currentTableSuits: number[];
  pendingTaxes: Array<{ highId: string; lowId: string; count: number; kind: "president" | "vice" }>;
  roundNo: number;
  trickNo: number;
  activePlayerId: string;
  currentTarget: PresidentTarget | null;
  lastSuccessfulPlayerId: string | null;
  passedPlayerIds: string[];
  finishedPlayerIds: string[];
  twoFinishIds?: string[]; // Joueurs ayant terminé avec un 2 : obligatoirement classés derniers.
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
    powerPoints: 0, kilos: 0, taxesGiven: 0, taxesReceived: 0, coupEtats: 0, revolutions: 0,
    bestFinishRank: null, worstFinishRank: null, rankTotal: 0, roundsPlayed: 0,
    singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0,
  };
}

// Ordre conventionnel du Président : 3 < ... < Roi < As < 2.
// Les valeurs 11–14 se jouent sur les segments S/D/T 11–14.
const CARD_RANKS = [3,4,5,6,7,8,9,10,11,12,13,14,2];
export function presidentCardRank(value: number): string {
  return ({ 11:"V",12:"D",13:"R",14:"A",25:"JOKER BULL",50:"JOKER DBULL" } as Record<number,string>)[value] || String(value);
}
// Paquet physique MSS : 52 cartes (13 rangs × 4 enseignes) + 2 Jokers uniques.
// Les jokers ne sont jamais des copies : HAWAII 501 = BULL25, KING OF BLING = DBULL50.
export const PRESIDENT_DECK_SIZE = 54;
export const PRESIDENT_CLASSIC_DECK_SIZE = 52;
export function presidentCardsPerPlayer(playerCount: number, requested: number): number {
  const count = Math.max(3, Math.min(8, Math.floor(Number(playerCount) || 3)));
  return Math.min(Math.max(1, Math.floor(Number(requested) || 10)), Math.floor(PRESIDENT_DECK_SIZE / count));
}
function cardPower(value: number): number { return value === 2 ? 15 : value === 25 ? 16 : value === 50 ? 17 : value; }
const sortCards = (a:number,b:number) => cardPower(a)-cardPower(b);
/** Barème maison MSS, pénalité des cartes restant en main en fin de manche. */
export function presidentCardKilos(value: number): number {
  if (value === 25) return 20; // Joker BULL
  if (value === 50) return 25; // Joker DBULL
  if (value === 2) return 15;
  if (value >= 3 && value <= 14) return value;
  return 0;
}
export function presidentHandKilos(hand: number[]): number {
  return (hand || []).reduce((total, value) => total + presidentCardKilos(value), 0);
}
type PhysicalCard = { value: number; suit: number };
function makeDeck(includeJokers = true): PhysicalCard[] {
  const deck: PhysicalCard[] = [];
  // Exactement une carte de chaque valeur pour chaque enseigne, sans duplication.
  for (let suit = 0; suit < 4; suit += 1) {
    for (const value of CARD_RANKS) deck.push({ value, suit });
  }
  if (includeJokers) deck.push({ value: 25, suit: 4 }, { value: 50, suit: 5 });
  return shuffle(deck);
}

function dealHands(playerIds: string[], requestedHandSize: number, classic = false): { hands: Record<string, number[]>; suitsByPlayer: Record<string, number[]> } {
  const deck = makeDeck(!classic);
  const count = classic ? Math.floor(52 / playerIds.length) : presidentCardsPerPlayer(playerIds.length, requestedHandSize);
  const dealt: Record<string, PhysicalCard[]> = Object.fromEntries(playerIds.map(id => [id, []]));
  let cursor = 0;
  for (let card = 0; card < count; card += 1) {
    for (const id of playerIds) dealt[id].push(deck[cursor++]);
  }
  if (classic) { // Toutes les cartes sont distribuées, reste éventuel aux premiers joueurs.
    let i=0; while(cursor<deck.length) { dealt[playerIds[i++ % playerIds.length]].push(deck[cursor++]); }
  }
  const hands: Record<string, number[]> = {};
  const suitsByPlayer: Record<string, number[]> = {};
  for (const id of playerIds) {
    const cards = dealt[id].sort((a,b) => sortCards(a.value,b.value) || a.suit-b.suit);
    hands[id] = cards.map(c => c.value);
    suitsByPlayer[id] = cards.map(c => c.suit);
  }
  return { hands, suitsByPlayer };
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
      if (count < size || (value >= 25 && size !== 1)) continue;
      if (current && size !== current.size) continue;
      if (current) {
        const beats = value === current.value || (revolutionActive ? cardPower(value) < cardPower(current.value) : cardPower(value) > cardPower(current.value));
        if (!beats) continue;
      }
      out.push({ value, size });
    }
  }
  out.sort((a, b) => {
    if (a.size !== b.size) return a.size - b.size;
    return revolutionActive ? cardPower(b.value) - cardPower(a.value) : cardPower(a.value) - cardPower(b.value);
  });
  return out;
}

export function presidentTargetLabel(target: PresidentTarget | null): string {
  if (!target) return "OUVERTURE LIBRE";
  if (target.value === 25) return "BULL";
  if (target.value === 50) return "DBULL";
  const prefix = target.size === 3 ? "T" : target.size === 2 ? "D" : "S";
  return `${prefix}${target.value}`;
}

export function presidentTargetDescription(target: PresidentTarget | null): string {
  if (!target) return "Choisis une combinaison dans ta main";
  if (target.value === 25) return "JOKER HAWAII 501 · BULL25";
  if (target.value === 50) return "JOKER KING OF BLING · BULL50";
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
  if (state.rules.variant === "chaos" && state.rules.coupEtat && dart.bed === "IB") return { ok: true, coupEtat: true };
  if (target.value === 25) return { ok: dart.bed === "OB", coupEtat: false };
  if (target.value === 50) return { ok: dart.bed === "IB", coupEtat: false };
  if (state.rules.variant === "chaos" && state.rules.bullJoker && target.size === 1 && dart.bed === "OB") return { ok: true, coupEtat: false };
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
  return next.sort(sortCards);
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
  const twoLast = new Set(next.twoFinishIds || []);
  const ranking = [...next.currentRoundRanking, ...remaining.filter(id=>!twoLast.has(id)), ...remaining.filter(id=>twoLast.has(id))];
  const roles = roleMap(ranking);
  const points: Record<string, number> = {};
  const kilos: Record<string, number> = {};
  const remainingCards: Record<string, number[]> = {};
  ranking.forEach((id, index) => {
    const rank = index + 1;
    const power = ranking.length - index - 1; // Président : N−1 points au premier, 0 au dernier.
    points[id] = power;
    remainingCards[id] = [...(next.hands[id] || [])];
    kilos[id] = 0; // PRÉSIDENT : aucune pénalité en kilos. Réservée à KILO DE MERDE.
    const s = next.statsByPlayer[id];
    s.roundsPlayed += 1;
    s.rankTotal += rank;
    s.powerPoints += power;
    s.kilos = 0; // Compatibilité statistique des anciens enregistrements uniquement.
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
    kilos,
    remainingCards,
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
    handSize: inputRules.variant === "chaos" ? presidentCardsPerPlayer(players.length, clampInt(inputRules.handSize, 5, 16, 10)) : Math.ceil(52/players.length),
    deckCopies: 1,
    variant: inputRules.variant === "chaos" ? "chaos" : "classic",
    bullJoker: inputRules.variant === "chaos" && inputRules.bullJoker !== false,
    coupEtat: inputRules.variant === "chaos" && inputRules.coupEtat !== false,
    revolution: inputRules.variant === "chaos" && inputRules.revolution !== false,
  };
  const order = players.map((p) => p.id);
  const statsByPlayer: Record<string, PresidentPlayerStats> = {};
  order.forEach((id) => { statsByPlayer[id] = emptyStats(); });
  const { hands, suitsByPlayer } = dealHands(order, rules.handSize, rules.variant === "classic");
  const now = Date.now();
  return {
    sport: "darts", mode: "president", rules, players, order, hands, suitsByPlayer, currentTableSuits: [], pendingTaxes: [],
    roundNo: 1, trickNo: 1, activePlayerId: order[0], currentTarget: null,
    lastSuccessfulPlayerId: null, passedPlayerIds: [], finishedPlayerIds: [], currentRoundRanking: [],
    previousRoundRanking: [], previousRoles: {}, taxesThisRound: [], revolutionActive: false, twoFinishIds: [],
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
  next.currentTableSuits = [];
  next.lastSuccessfulPlayerId = null;
  next.passedPlayerIds = [];
  next.finishedPlayerIds = [];
  next.twoFinishIds = [];
  next.currentRoundRanking = [];
  next.revolutionActive = false;
  next.roundStartedAt = Date.now();
  const { hands, suitsByPlayer } = dealHands(next.order, next.rules.handSize, next.rules.variant === "classic");
  next.hands = hands;
  next.suitsByPlayer = suitsByPlayer;
  next.taxesThisRound = [];
  const ranking = next.previousRoundRanking;
  next.pendingTaxes = ranking.length >= 3 ? [
    {highId:ranking[0],lowId:ranking[ranking.length-1],count:2,kind:"president" as const},
    ...(ranking.length >= 4 ? [{highId:ranking[1],lowId:ranking[ranking.length-2],count:1,kind:"vice" as const}] : []),
  ] : [];
  // Le Trou du cul ouvre la manche suivante, comme variante très lisible du jeu de cartes.
  next.activePlayerId = next.previousRoundRanking[next.previousRoundRanking.length - 1] || next.order[0];
  return next;
}

/** Suggested weak cards to return; confirmation may override these indexes. */
export function presidentDefaultTaxIndices(state: PresidentState): number[] {
  const tax = state.pendingTaxes?.[0];
  if (!tax) return [];
  return (state.hands[tax.highId] || []).map((v,i)=>({v,i}))
    .sort((a,b)=>sortCards(a.v,b.v)).slice(0,tax.count).map(x=>x.i);
}

/** Apply one exchange without losing physical suits or altering the number of cards. */
export function resolvePresidentTax(state: PresidentState, chosenIndices: number[]): PresidentState {
  if (!state.pendingTaxes?.length) return state;
  const task = state.pendingTaxes[0];
  const next = clonePresidentState(state);
  const high = next.hands[task.highId] || [];
  const low = next.hands[task.lowId] || [];
  const hiSuits = next.suitsByPlayer[task.highId] || [];
  const loSuits = next.suitsByPlayer[task.lowId] || [];
  const chosen = Array.from(new Set(chosenIndices)).filter(i=>Number.isInteger(i) && i>=0 && i<high.length);
  if (chosen.length !== task.count || low.length < task.count) return state;
  const givenIndices = low.map((v,i)=>({v,i})).sort((a,b)=>sortCards(b.v,a.v))
    .slice(0,task.count).map(x=>x.i);
  const returned = chosen.map(i=>high[i]);
  const returnedSuits = chosen.map(i=>hiSuits[i] ?? 0);
  const given = givenIndices.map(i=>low[i]);
  const givenSuits = givenIndices.map(i=>loSuits[i] ?? 0);
  const highCards = high.map((v,i)=>({v,suit:hiSuits[i]??0})).filter((_,i)=>!chosen.includes(i));
  const lowCards = low.map((v,i)=>({v,suit:loSuits[i]??0})).filter((_,i)=>!givenIndices.includes(i));
  highCards.push(...given.map((v,i)=>({v,suit:givenSuits[i]})));
  lowCards.push(...returned.map((v,i)=>({v,suit:returnedSuits[i]})));
  highCards.sort((a,b)=>sortCards(a.v,b.v)); lowCards.sort((a,b)=>sortCards(a.v,b.v));
  next.hands[task.highId] = highCards.map(x=>x.v);
  next.hands[task.lowId] = lowCards.map(x=>x.v);
  next.suitsByPlayer[task.highId] = highCards.map(x=>x.suit);
  next.suitsByPlayer[task.lowId] = lowCards.map(x=>x.suit);
  next.taxesThisRound.push({fromPlayerId:task.lowId,toPlayerId:task.highId,given,returned,kind:task.kind,
    givenSuits, returnedSuits});
  next.statsByPlayer[task.lowId].taxesGiven += task.count;
  next.statsByPlayer[task.highId].taxesReceived += task.count;
  next.pendingTaxes.shift();
  return next;
}

export function presidentCanPlayerPlay(state: PresidentState, playerId: string): boolean {
  return presidentLegalTargets(state.hands[playerId] || [], state.currentTarget, state.revolutionActive).length > 0;
}

export function presidentAutoTarget(state: PresidentState, playerId: string): PresidentTarget | null {
  return presidentLegalTargets(state.hands[playerId] || [], state.currentTarget, state.revolutionActive)[0] || null;
}

export function passPresidentTurn(state: PresidentState, automatic = false): PresidentState {
  if (state.finished || state.pendingTaxes?.length) return state;
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
    next.currentTableSuits = [];
    next.lastSuccessfulPlayerId = null;
    next.passedPlayerIds = [];
    next.activePlayerId = leader;
    return next;
  }
  next.activePlayerId = nextEligiblePlayer(next, playerId);
  return next;
}

export function playPresidentTurn(state: PresidentState, target: PresidentTarget, darts: GameDart[]): PresidentState {
  if (state.finished || state.pendingTaxes?.length) return state;
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
  let playedSuits: number[] = [];
  if (success) {
    const suits = next.suitsByPlayer[playerId] || [];
    const removed = hand.map((v,i)=>({v,suit:suits[i]??0,i})).filter(x=>x.v===target.value).slice(-target.size);
    const removedIndex = new Set(removed.map(x=>x.i));
    const kept = hand.map((v,i)=>({v,suit:suits[i]??0,i})).filter(x=>!removedIndex.has(x.i));
    next.hands[playerId] = kept.map(x=>x.v);
    next.suitsByPlayer[playerId] = kept.map(x=>x.suit);
    next.currentTableSuits = removed.map(x=>x.suit);
    playedSuits = removed.map(x=>x.suit);
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
    if (next.rules.variant === "chaos" && next.rules.revolution && target.size === 3 && target.value === 14) {
      next.revolutionActive = !next.revolutionActive;
      stats.revolutions += 1;
      revolutionTriggered = true;
    }

    if (next.hands[playerId].length === 0 && !next.finishedPlayerIds.includes(playerId)) {
      next.finishedPlayerIds.push(playerId);
      if (target.value === 2 && next.rules.variant === 'classic') {
        next.twoFinishIds = [...(next.twoFinishIds || []), playerId]; // 2 en dernière carte => dernier selon la fiche.
      } else next.currentRoundRanking.push(playerId);
    }
  } else {
    stats.failedPlays += 1;
    if (!next.passedPlayerIds.includes(playerId)) next.passedPlayerIds.push(playerId);
  }

  next.history.push({
    id: `pres-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    roundNo: next.roundNo, trickNo: next.trickNo, playerId, target: { ...target },
    darts: normalizedDarts, labels: normalizedDarts.map(presidentDartLabel), success, passed: !success,
    coupEtat, revolutionTriggered, playedSuits: success ? playedSuits : undefined, cardsBefore, cardsAfter: next.hands[playerId]?.length ?? cardsBefore, createdAt: Date.now(),
  });

  const completed = maybeCompleteRound(next);
  if (completed !== next || completed.finished || completed.roundNo !== next.roundNo) return completed;

  if (coupEtat) {
    if (next.lastSuccessfulPlayerId) next.statsByPlayer[next.lastSuccessfulPlayerId].tricksWon += 1;
    next.trickNo += 1;
    next.currentTarget = null;
    next.currentTableSuits = [];
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
    next.currentTableSuits = [];
    next.lastSuccessfulPlayerId = null;
    next.passedPlayerIds = [];
    next.activePlayerId = leader;
    return next;
  }

  next.activePlayerId = nextEligiblePlayer(next, playerId);
  // Valeur identique et même nombre de cartes : on saute le joueur suivant (classique).
  if (success && state.rules.variant === 'classic' && state.currentTarget && target.value === state.currentTarget.value && target.size === state.currentTarget.size) {
    next.activePlayerId = nextEligiblePlayer(next, next.activePlayerId);
  }
  return next;
}

export function clonePresidentState(state: PresidentState): PresidentState {
  return {
    ...state,
    rules: { ...state.rules },
    players: state.players.map((p) => ({ ...p })),
    order: [...state.order],
    hands: Object.fromEntries(Object.entries(state.hands).map(([id, hand]) => [id, [...hand]])),
    suitsByPlayer: Object.fromEntries(Object.entries(state.suitsByPlayer || {}).map(([id, suits]) => [id, [...suits]])),
    currentTableSuits: [...(state.currentTableSuits || [])],
    pendingTaxes: (state.pendingTaxes || []).map(task=>({...task})),
    currentTarget: state.currentTarget ? { ...state.currentTarget } : null,
    passedPlayerIds: [...state.passedPlayerIds],
    finishedPlayerIds: [...state.finishedPlayerIds],
    currentRoundRanking: [...state.currentRoundRanking],
    previousRoundRanking: [...state.previousRoundRanking],
    previousRoles: { ...state.previousRoles },
    taxesThisRound: state.taxesThisRound.map((x) => ({ ...x, given: [...x.given], returned: [...x.returned], givenSuits: x.givenSuits ? [...x.givenSuits] : undefined, returnedSuits: x.returnedSuits ? [...x.returnedSuits] : undefined })),
    twoFinishIds: [...(state.twoFinishIds || [])],
    history: state.history.map((x) => ({ ...x, playedSuits: x.playedSuits ? [...x.playedSuits] : undefined, target: x.target ? { ...x.target } : null, darts: x.darts.map((d) => ({ ...d })), labels: [...x.labels] })),
    roundResults: state.roundResults.map((r) => ({ ...r, ranking: [...r.ranking], roles: { ...r.roles }, powerPoints: { ...r.powerPoints }, kilos: { ...(r.kilos || {}) }, remainingCards: Object.fromEntries(Object.entries(r.remainingCards || {}).map(([id, cards]) => [id, [...cards]])), taxes: r.taxes.map((x) => ({ ...x, given: [...x.given], returned: [...x.returned] })) })),
    statsByPlayer: Object.fromEntries(Object.entries(state.statsByPlayer).map(([id, s]) => [id, { ...s }])),
    standings: [...state.standings],
  };
}

export function getPresidentStandings(state: PresidentState): Array<{ id: string; name: string; powerPoints: number; kilos: number; presidents: number; avgRank: number; hand: number }> {
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const ids = state.finished && state.standings.length ? state.standings : [...state.order].sort((a, b) =>
    state.statsByPlayer[b].powerPoints - state.statsByPlayer[a].powerPoints || state.statsByPlayer[b].president - state.statsByPlayer[a].president);
  return ids.map((id) => {
    const s = state.statsByPlayer[id];
    return { id, name: byId.get(id)?.name || id, powerPoints: s.powerPoints, kilos: s.kilos || 0, presidents: s.president, avgRank: s.roundsPlayed ? s.rankTotal / s.roundsPlayed : 0, hand: state.hands[id]?.length || 0 };
  });
}
