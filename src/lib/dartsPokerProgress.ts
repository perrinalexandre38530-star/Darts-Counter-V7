// Persistent Darts Poker achievement progression.
// The finished History record remains the auditable source for each match;
// this small local cache exists only to detect one-time unlocks immediately.

export type DartsPokerProgressBadgeId =
  | "first_deal"
  | "table_regular"
  | "shark"
  | "sniper"
  | "contract_master"
  | "power_player"
  | "joker_master"
  | "premium_hand"
  | "table_leader"
  | "winning_dealer"
  | "closer"
  | "royal";

export type DartsPokerProgressUnlock = {
  type: "badge";
  badgeId: DartsPokerProgressBadgeId;
  playerId: string;
  playerName: string;
  unlockedAt: number;
  current: number;
  target: number;
  detail: string;
};

export type DartsPokerProgressPlayer = {
  id: string;
  name: string;
  matches: number;
  wins: number;
  darts: number;
  hits: number;
  contracts: number;
  powersUsed: number;
  jokers: number;
  premiumHands: number;
  leadRounds: number;
  handsPlayed: number;
  dealerWins: number;
  closingWins: number;
  royalFlushes: number;
  badges: Partial<Record<DartsPokerProgressBadgeId, { unlockedAt: number; matchId: string }>>;
  processedMatchIds: string[];
  updatedAt: number;
};

export type DartsPokerProgressResult = {
  version: 1;
  mode: "darts_poker";
  matchId: string;
  createdAt: number;
  unlocks: DartsPokerProgressUnlock[];
  byPlayer: Record<string, DartsPokerProgressPlayer>;
};

const STORAGE_KEY = "mss_darts_poker_progress_v1";
const STORE_VERSION = 1;

function n(value: any) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeReadStore(): any {
  try {
    if (typeof window === "undefined" || !window.localStorage) return { version: STORE_VERSION, players: {} };
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { version: STORE_VERSION, players: {} };
    return { version: STORE_VERSION, players: parsed.players && typeof parsed.players === "object" ? parsed.players : {} };
  } catch {
    return { version: STORE_VERSION, players: {} };
  }
}

function safeWriteStore(store: any) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Non-blocking: the match History record still contains the progression snapshot.
  }
}

function freshPlayer(id: string, name: string): DartsPokerProgressPlayer {
  return {
    id,
    name,
    matches: 0,
    wins: 0,
    darts: 0,
    hits: 0,
    contracts: 0,
    powersUsed: 0,
    jokers: 0,
    premiumHands: 0,
    leadRounds: 0,
    handsPlayed: 0,
    dealerWins: 0,
    closingWins: 0,
    royalFlushes: 0,
    badges: {},
    processedMatchIds: [],
    updatedAt: 0,
  };
}

type BadgeRule = {
  id: DartsPokerProgressBadgeId;
  target: number;
  current: (career: DartsPokerProgressPlayer) => number;
  eligible: (career: DartsPokerProgressPlayer) => boolean;
  detail: string;
};

const BADGE_RULES: BadgeRule[] = [
  { id: "first_deal", target: 1, current: (c) => c.matches, eligible: (c) => c.matches >= 1, detail: "Première partie Darts Poker terminée" },
  { id: "table_regular", target: 10, current: (c) => c.matches, eligible: (c) => c.matches >= 10, detail: "10 parties Darts Poker terminées" },
  { id: "shark", target: 10, current: (c) => c.wins, eligible: (c) => c.wins >= 10, detail: "10 victoires cumulées" },
  { id: "sniper", target: 75, current: (c) => c.darts > 0 ? (c.hits / c.darts) * 100 : 0, eligible: (c) => c.darts >= 60 && (c.hits / Math.max(1, c.darts)) * 100 >= 75, detail: "75 % de précision minimum après 60 fléchettes" },
  { id: "contract_master", target: 25, current: (c) => c.contracts, eligible: (c) => c.contracts >= 25, detail: "25 contrats réussis" },
  { id: "power_player", target: 25, current: (c) => c.powersUsed, eligible: (c) => c.powersUsed >= 25, detail: "25 pouvoirs utilisés" },
  { id: "joker_master", target: 10, current: (c) => c.jokers, eligible: (c) => c.jokers >= 10, detail: "10 Jokers obtenus" },
  { id: "premium_hand", target: 10, current: (c) => c.premiumHands, eligible: (c) => c.premiumHands >= 10, detail: "10 mains Couleur ou mieux" },
  { id: "table_leader", target: 50, current: (c) => c.handsPlayed > 0 ? (c.leadRounds / c.handsPlayed) * 100 : 0, eligible: (c) => c.handsPlayed > 0 && (c.leadRounds / c.handsPlayed) * 100 >= 50, detail: "Leader sur au moins 50 % des manches" },
  { id: "winning_dealer", target: 5, current: (c) => c.dealerWins, eligible: (c) => c.dealerWins >= 5, detail: "5 manches gagnées en tant que dealer" },
  { id: "closer", target: 5, current: (c) => c.closingWins, eligible: (c) => c.closingWins >= 5, detail: "Dernière manche gagnée dans 5 parties" },
  { id: "royal", target: 1, current: (c) => c.royalFlushes, eligible: (c) => c.royalFlushes >= 1, detail: "Une quinte flush royale obtenue" },
];

export function commitDartsPokerProgress(input: {
  matchId: string;
  winnerIds?: string[];
  participants: Array<{ id: string; name?: string; stats?: any; isBot?: boolean }>;
}): DartsPokerProgressResult {
  const now = Date.now();
  const store = safeReadStore();
  store.players = store.players && typeof store.players === "object" ? store.players : {};
  const winnerIds = new Set((input.winnerIds || []).map(String));
  const unlocks: DartsPokerProgressUnlock[] = [];
  const byPlayer: Record<string, DartsPokerProgressPlayer> = {};

  for (const participant of input.participants || []) {
    if (!participant?.id || participant?.isBot) continue;
    const id = String(participant.id);
    const name = String(participant.name || "Joueur");
    const stats = participant.stats || {};
    const current: DartsPokerProgressPlayer = {
      ...freshPlayer(id, name),
      ...(store.players[id] || {}),
      id,
      name,
      badges: { ...((store.players[id] || {}).badges || {}) },
      processedMatchIds: Array.isArray((store.players[id] || {}).processedMatchIds) ? (store.players[id] || {}).processedMatchIds.map(String) : [],
    };
    const alreadyProcessed = current.processedMatchIds.includes(String(input.matchId));

    if (!alreadyProcessed) {
      current.matches += 1;
      current.wins += winnerIds.has(id) ? 1 : 0;
      current.darts += n(stats.darts);
      current.hits += n(stats.hits);
      current.contracts += n(stats.contractHits);
      current.powersUsed += n(stats.choicesUsed) + n(stats.exchangesUsed);
      current.jokers += n(stats.jokers);
      current.premiumHands += n(stats.premiumHands);
      current.leadRounds += n(stats.leadRounds);
      current.handsPlayed += n(stats.handsPlayed);
      current.dealerWins += n(stats.dealerWins);
      current.closingWins += stats.closingRoundWin ? 1 : 0;
      current.royalFlushes += n(stats.royalFlushes);
      current.processedMatchIds = [...current.processedMatchIds.slice(-79), String(input.matchId)];
    }

    for (const rule of BADGE_RULES) {
      if (current.badges[rule.id]) continue;
      if (!rule.eligible(current)) continue;
      current.badges[rule.id] = { unlockedAt: now, matchId: String(input.matchId) };
      unlocks.push({
        type: "badge",
        badgeId: rule.id,
        playerId: id,
        playerName: name,
        unlockedAt: now,
        current: rule.current(current),
        target: rule.target,
        detail: rule.detail,
      });
    }

    current.updatedAt = now;
    store.players[id] = current;
    byPlayer[id] = current;
  }

  store.version = STORE_VERSION;
  store.updatedAt = now;
  safeWriteStore(store);

  return { version: 1, mode: "darts_poker", matchId: String(input.matchId), createdAt: now, unlocks, byPlayer };
}

export function readDartsPokerProgress(playerId: string): DartsPokerProgressPlayer | null {
  const store = safeReadStore();
  const row = store?.players?.[String(playerId)];
  return row ? { ...freshPlayer(String(playerId), String(row?.name || "Joueur")), ...row } : null;
}

export function readDartsPokerUnlockedBadgeIds(playerId: string): DartsPokerProgressBadgeId[] {
  const row = readDartsPokerProgress(playerId);
  return row ? Object.keys(row.badges || {}) as DartsPokerProgressBadgeId[] : [];
}
