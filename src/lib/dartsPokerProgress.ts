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

export type DartsPokerBadgeRule = {
  id: DartsPokerProgressBadgeId;
  target: number;
  current: (career: DartsPokerProgressPlayer) => number;
  eligible: (career: DartsPokerProgressPlayer) => boolean;
  detail: string;
};

export const DARTS_POKER_BADGE_RULES: DartsPokerBadgeRule[] = [
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
  occurredAt?: number;
}): DartsPokerProgressResult {
  const now = n(input.occurredAt) || Date.now();
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
      current.processedMatchIds = [...current.processedMatchIds, String(input.matchId)];
    }

    for (const rule of DARTS_POKER_BADGE_RULES) {
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

export function getDartsPokerBadgeRule(id: DartsPokerProgressBadgeId): DartsPokerBadgeRule | null {
  return DARTS_POKER_BADGE_RULES.find((rule) => rule.id === id) || null;
}

export function getDartsPokerBadgeCareerValue(id: DartsPokerProgressBadgeId, career: DartsPokerProgressPlayer | null | undefined): number {
  if (!career) return 0;
  const rule = getDartsPokerBadgeRule(id);
  return rule ? n(rule.current(career)) : 0;
}

export function getDartsPokerBadgeLockedReason(id: DartsPokerProgressBadgeId, career: DartsPokerProgressPlayer | null | undefined): string | null {
  if (!career) return null;
  if (career.badges?.[id]) return null;
  if (id === "sniper" && n(career.darts) < 60) return `${n(career.darts)}/60 darts`;
  if (id === "table_leader" && n(career.handsPlayed) <= 0) return "Aucune manche analysée";
  return null;
}

export function getDartsPokerBadgeProgress(playerId: string, id: DartsPokerProgressBadgeId) {
  const career = readDartsPokerProgress(playerId);
  const rule = getDartsPokerBadgeRule(id);
  const current = getDartsPokerBadgeCareerValue(id, career);
  const target = n(rule?.target);
  const unlocked = Boolean(career?.badges?.[id]);
  return {
    id,
    career,
    current,
    target,
    unlocked,
    unlockedAt: n(career?.badges?.[id]?.unlockedAt),
    percent: target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0,
    lockedReason: getDartsPokerBadgeLockedReason(id, career),
    detail: rule?.detail || "",
  };
}


export type DartsPokerProgressReconcileResult = {
  inspectedMatches: number;
  processedMatches: number;
  recoveredUnlocks: DartsPokerProgressUnlock[];
  byPlayer: Record<string, DartsPokerProgressPlayer>;
};

function progressRecordMode(record: any): string {
  return [record?.kind, record?.mode, record?.gameId, record?.summary?.kind, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.stats?.mode]
    .map((value) => String(value || "").toLowerCase())
    .join("|");
}

function progressRecordFinished(record: any): boolean {
  const status = String(record?.status || record?.summary?.status || record?.payload?.status || "").toLowerCase();
  return status === "finished" || status === "completed" || record?.summary?.finished === true || Boolean(record?.finishedAt || record?.endedAt);
}

function progressRecordId(record: any): string {
  return String(record?.matchId || record?.id || record?.resumeId || record?.summary?.matchId || record?.payload?.matchId || "");
}

function progressRecordAt(record: any): number {
  return n(record?.finishedAt || record?.endedAt || record?.updatedAt || record?.createdAt || record?.startedAt) || Date.now();
}

function progressWinnerIds(record: any): string[] {
  const values = [
    record?.winnerIds,
    record?.summary?.winnerIds,
    record?.payload?.winnerIds,
    record?.payload?.summary?.winnerIds,
    record?.winnerId,
    record?.summary?.winnerId,
    record?.payload?.winnerId,
  ];
  return Array.from(new Set(values.flatMap((value: any) => Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean)));
}

function progressPlayerPools(record: any): any[][] {
  return [
    record?.summary?.perPlayer,
    record?.payload?.summary?.perPlayer,
    record?.payload?.stats?.players,
    record?.summary?.rankings,
    record?.payload?.players,
    record?.summary?.players,
    record?.players,
  ].filter(Array.isArray);
}

function progressPlayerId(row: any): string {
  return String(row?.id || row?.playerId || row?.profileId || "");
}

function progressPlayerName(row: any): string {
  return String(row?.name || row?.playerName || row?.displayName || "Joueur");
}

function progressIsBot(row: any): boolean {
  return Boolean(row?.isBot || row?.bot || row?.type === "bot" || row?.kind === "bot" || row?.botLevel || row?.cpu === true);
}

function progressParticipantsFromRecord(record: any): Array<{ id: string; name: string; stats: any; isBot: boolean }> {
  const merged = new Map<string, any>();
  for (const pool of progressPlayerPools(record)) {
    for (const row of pool) {
      const id = progressPlayerId(row);
      if (!id) continue;
      merged.set(id, { ...(merged.get(id) || {}), ...(row || {}) });
    }
  }
  const rounds = [record?.summary?.rounds, record?.payload?.summary?.rounds, record?.payload?.rounds, record?.resume?.state?.rounds, record?.payload?.stateSnapshot?.rounds].find(Array.isArray) || [];
  const configuredBotIds = new Set<string>([
    ...(Array.isArray(record?.summary?.config?.botIds) ? record.summary.config.botIds : []),
    ...(Array.isArray(record?.payload?.config?.botIds) ? record.payload.config.botIds : []),
    ...(Array.isArray(record?.resume?.config?.botIds) ? record.resume.config.botIds : []),
    ...(Array.isArray(record?.game?.botIds) ? record.game.botIds : []),
  ].map(String));
  const dealerByRound = new Map<number, string>();
  for (const round of rounds) {
    const roundNumber = n(round?.round);
    const dealerId = String(round?.dealerId || round?.dealerPlayerId || "");
    if (roundNumber > 0 && dealerId) dealerByRound.set(roundNumber, dealerId);
  }
  return Array.from(merged.entries()).map(([id, row]) => {
    const playerRounds = rounds.flatMap((round: any, index: number) => (Array.isArray(round?.rows) ? round.rows : []).filter((item: any) => String(item?.playerId || item?.id || "") === id).map((item: any) => ({ round, index, item })));
    const completedContracts = playerRounds.filter(({ item }: any) => item?.contractCompleted).length;
    const premiumRoundHands = playerRounds.filter(({ item }: any) => {
      const rank = item?.evaluation?.categoryRank == null ? -1 : n(item?.evaluation?.categoryRank);
      const label = String(item?.evaluation?.label || "").toLowerCase();
      return rank >= 5 || /flush|couleur|full|carr[eé]|four|royal|royale/.test(label);
    }).length;
    const royalRounds = playerRounds.filter(({ item }: any) => /royal|royale/.test(String(item?.evaluation?.label || "").toLowerCase()) || (item?.evaluation?.categoryRank == null ? -1 : n(item?.evaluation?.categoryRank)) >= 9).length;
    const dealerWins = playerRounds.filter(({ round, item }: any) => {
      const roundNumber = n(round?.round);
      const dealerId = String(round?.dealerId || round?.dealerPlayerId || dealerByRound.get(roundNumber) || "");
      return dealerId === id && (item?.win === true || n(item?.rank) === 1);
    }).length;
    const orderedPlayerRounds = playerRounds.slice().sort((a: any, b: any) => (a?.round?.round == null ? a.index + 1 : n(a?.round?.round)) - (b?.round?.round == null ? b.index + 1 : n(b?.round?.round)));
    const closingRound = orderedPlayerRounds.length ? orderedPlayerRounds[orderedPlayerRounds.length - 1] : null;
    return {
      id,
      name: progressPlayerName(row),
      isBot: progressIsBot(row) || configuredBotIds.has(id),
      stats: {
        ...row,
        contractHits: row?.contractHits == null ? completedContracts : n(row?.contractHits),
        premiumHands: row?.premiumHands == null ? premiumRoundHands : n(row?.premiumHands),
        handsPlayed: row?.handsPlayed == null ? playerRounds.length : n(row?.handsPlayed),
        dealerWins: row?.dealerWins == null ? dealerWins : n(row?.dealerWins),
        closingRoundWin: row?.closingRoundWin ?? Boolean(closingRound?.item?.win === true || n(closingRound?.item?.rank) === 1),
        royalFlushes: row?.royalFlushes == null ? royalRounds : n(row?.royalFlushes),
      },
    };
  });
}

/**
 * Reconcile the small local badge cache against finished Darts Poker History rows.
 * This is intentionally additive: it never erases local progress when a device only
 * has a partial History window. Missing matches are replayed once via processedMatchIds.
 * This makes badge progression survive cache clears/restores and lets a synced History
 * rebuild the collection on another device without changing the global backup pipeline.
 */
export function reconcileDartsPokerProgressFromHistory(records: any[] = []): DartsPokerProgressReconcileResult {
  const pokerRecords = (Array.isArray(records) ? records : [])
    .filter((record) => {
      const mode = progressRecordMode(record);
      return (mode.includes("darts_poker") || mode.includes("darts poker") || mode.includes("dartspoker")) && progressRecordFinished(record);
    })
    .sort((a, b) => progressRecordAt(a) - progressRecordAt(b));

  const recoveredUnlocks: DartsPokerProgressUnlock[] = [];
  const byPlayer: Record<string, DartsPokerProgressPlayer> = {};
  let processedMatches = 0;

  for (const record of pokerRecords) {
    const matchId = progressRecordId(record);
    if (!matchId) continue;
    const participants = progressParticipantsFromRecord(record);
    const humanParticipants = participants.filter((participant) => !participant.isBot);
    if (!humanParticipants.length) continue;
    const alreadyProcessedForAll = humanParticipants.every((participant) => readDartsPokerProgress(participant.id)?.processedMatchIds?.includes(matchId));
    const result = commitDartsPokerProgress({
      matchId,
      winnerIds: progressWinnerIds(record),
      participants,
      occurredAt: progressRecordAt(record),
    });
    if (!alreadyProcessedForAll) processedMatches += 1;
    recoveredUnlocks.push(...(result.unlocks || []));
    Object.assign(byPlayer, result.byPlayer || {});
  }

  return { inspectedMatches: pokerRecords.length, processedMatches, recoveredUnlocks, byPlayer };
}
