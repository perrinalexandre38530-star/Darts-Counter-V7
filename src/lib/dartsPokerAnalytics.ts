// DARTS POKER — analytics partagées entre fin de match, historique et centre de statistiques.
// Les fonctions restent tolérantes aux anciennes sauvegardes : chaque métrique dispose d'un fallback.

export const pokerNum = (value: any, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const pokerPct = (value: number, total: number): number => total > 0 ? (value / total) * 100 : 0;
export const pokerRound1 = (value: number): number => Math.round(value * 10) / 10;

function topEntry(map: Record<string, any> | null | undefined): { key: string; value: number } | null {
  const entries = Object.entries(map || {}).map(([key, value]) => ({ key, value: pokerNum(value) })).filter((row) => row.value > 0);
  entries.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
  return entries[0] || null;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function standardDeviation(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function bestFlagStreak(rows: any[], key: string): number {
  let current = 0;
  let best = 0;
  rows.forEach((row) => {
    if (row?.[key]) {
      current += 1;
      best = Math.max(best, current);
    } else current = 0;
  });
  return best;
}

export function deriveDartsPokerSectorHeatmap(statsOrMap: any): Array<{ sector: number; singles: number; doubles: number; triples: number; total: number }> {
  const source = statsOrMap?.hitsBySegment && typeof statsOrMap.hitsBySegment === "object" ? statsOrMap.hitsBySegment : (statsOrMap || {});
  const rows = Array.from({ length: 20 }, (_, index) => ({ sector: index + 1, singles: 0, doubles: 0, triples: 0, total: 0 }));
  Object.entries(source || {}).forEach(([key, raw]) => {
    const match = String(key).toUpperCase().match(/^([SDT])(\d{1,2})$/);
    if (!match) return;
    const sector = Number(match[2]);
    if (sector < 1 || sector > 20) return;
    const value = pokerNum(raw);
    const row = rows[sector - 1];
    if (match[1] === "S") row.singles += value;
    else if (match[1] === "D") row.doubles += value;
    else if (match[1] === "T") row.triples += value;
    row.total += value;
  });
  return rows;
}

function getPlayerRoundRows(rounds: any[], playerId: string) {
  return (Array.isArray(rounds) ? rounds : []).flatMap((round: any) =>
    (Array.isArray(round?.rows) ? round.rows : [])
      .filter((row: any) => String(row?.playerId ?? row?.id ?? "") === String(playerId))
      .map((row: any) => ({ ...row, round: pokerNum(round?.round, 0), contract: round?.contract || null }))
  );
}

function getPlayerVisits(visits: any[], playerId: string) {
  return (Array.isArray(visits) ? visits : []).filter((visit: any) => String(visit?.playerId ?? visit?.id ?? "") === String(playerId));
}

function buildPokerCumulativeRace(rounds: any[]) {
  const ordered = (Array.isArray(rounds) ? [...rounds] : []).sort((a, b) => pokerNum(a?.round) - pokerNum(b?.round));
  const points: Record<string, number> = {};
  return ordered.map((round: any, index: number) => {
    (Array.isArray(round?.rows) ? round.rows : []).forEach((row: any) => {
      const id = String(row?.playerId ?? row?.id ?? "");
      if (!id) return;
      points[id] = (points[id] || 0) + pokerNum(row?.pointsAwarded);
    });
    const entries = Object.entries(points).map(([id, value]) => ({ id, points: pokerNum(value) })).sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
    const top = entries[0]?.points || 0;
    const leaders = entries.filter((row) => row.points === top).map((row) => row.id);
    const second = entries.find((row) => !leaders.includes(row.id))?.points ?? top;
    return {
      round: pokerNum(round?.round, index + 1),
      dealerId: round?.dealerId ? String(round.dealerId) : null,
      leaders,
      leaderPoints: top,
      margin: Math.max(0, top - second),
      points: { ...points },
    };
  });
}

export function deriveDartsPokerMatchStory(rounds: any[] = []) {
  const race = buildPokerCumulativeRace(rounds);
  let leadChanges = 0;
  let previous = "";
  let largestLead = 0;
  let lastLeaderChangeRound = race[0]?.round || 0;
  const uniqueLeaders = new Set<string>();
  race.forEach((step) => {
    const key = [...step.leaders].sort().join("|");
    step.leaders.forEach((id) => uniqueLeaders.add(id));
    if (previous && key !== previous) {
      leadChanges += 1;
      lastLeaderChangeRound = step.round;
    }
    previous = key;
    largestLead = Math.max(largestLead, pokerNum(step.margin));
  });
  const finalStep = race[race.length - 1] || null;
  const finalLeaderIds = finalStep?.leaders || [];
  let biggestComeback = 0;
  finalLeaderIds.forEach((winnerId) => {
    race.forEach((step) => {
      const leaderPoints = pokerNum(step.leaderPoints);
      const winnerPoints = pokerNum(step.points?.[winnerId]);
      biggestComeback = Math.max(biggestComeback, Math.max(0, leaderPoints - winnerPoints));
    });
  });
  const tiedRounds = (Array.isArray(rounds) ? rounds : []).filter((round: any) => (round?.winnerIds || []).length > 1).length;
  const contractRounds = (Array.isArray(rounds) ? rounds : []).filter((round: any) => Boolean(round?.contract)).length;
  const contractsCompleted = (Array.isArray(rounds) ? rounds : []).reduce((sum: number, round: any) => sum + (Array.isArray(round?.rows) ? round.rows.filter((row: any) => row?.contractCompleted).length : 0), 0);
  return {
    race,
    leadChanges,
    uniqueLeaders: uniqueLeaders.size,
    largestLead,
    lastLeaderChangeRound,
    decidingRound: lastLeaderChangeRound || finalStep?.round || 0,
    biggestComeback,
    tiedRounds,
    contractRounds,
    contractsCompleted,
    finalLeaderIds,
    finalMargin: pokerNum(finalStep?.margin),
  };
}

function dartIsHit(dart: any, label?: any): boolean {
  const bed = String(dart?.bed ?? "").toUpperCase();
  const text = String(label ?? "").toUpperCase();
  if (bed === "MISS" || text === "MISS" || text.startsWith("MISS")) return false;
  return Boolean(bed || text);
}

function computeStreaks(visits: any[]) {
  let currentHit = 0;
  let currentMiss = 0;
  let bestHit = 0;
  let bestMiss = 0;
  visits.forEach((visit: any) => {
    const darts = Array.isArray(visit?.darts) ? visit.darts : [];
    const labels = Array.isArray(visit?.labels) ? visit.labels : [];
    const count = Math.max(darts.length, labels.length, 1);
    for (let index = 0; index < count; index += 1) {
      const hit = dartIsHit(darts[index], labels[index]);
      if (hit) {
        currentHit += 1;
        currentMiss = 0;
        bestHit = Math.max(bestHit, currentHit);
      } else {
        currentMiss += 1;
        currentHit = 0;
        bestMiss = Math.max(bestMiss, currentMiss);
      }
    }
  });
  return { bestHitStreak: bestHit, bestMissStreak: bestMiss };
}

function computeWinStreak(roundRows: any[]) {
  let current = 0;
  let best = 0;
  roundRows.forEach((row) => {
    if (row?.win) {
      current += 1;
      best = Math.max(best, current);
    } else current = 0;
  });
  return best;
}

export function resolveDartsPokerStateStats(record: any, playerId: string): any {
  const snapshots = [
    record?.payload?.stateSnapshot,
    record?.payload?.resume?.state,
    record?.resume?.state,
    record?.stateSnapshot,
    record?.summary?.stateSnapshot,
  ];
  for (const snapshot of snapshots) {
    const stats = snapshot?.statsByPlayer?.[String(playerId)];
    if (stats && typeof stats === "object") return stats;
  }
  return {};
}

export function resolveDartsPokerRounds(record: any): any[] {
  const candidates = [record?.payload?.rounds, record?.summary?.rounds, record?.payload?.summary?.rounds, record?.stateSnapshot?.rounds, record?.payload?.stateSnapshot?.rounds];
  return candidates.find(Array.isArray) || [];
}

export function resolveDartsPokerVisits(record: any): any[] {
  const candidates = [record?.payload?.visits, record?.payload?.visitHistory, record?.summary?.visits, record?.payload?.summary?.visits, record?.visits, record?.stateSnapshot?.visits, record?.payload?.stateSnapshot?.visits];
  return candidates.find(Array.isArray) || [];
}

export function deriveDartsPokerPlayerMetrics(input: {
  playerId: string;
  stats?: any;
  rounds?: any[];
  visits?: any[];
  contractsEnabled?: boolean;
}) {
  const playerId = String(input.playerId || "");
  const stats = input.stats || {};
  const roundRows = getPlayerRoundRows(input.rounds || [], playerId);
  const visits = getPlayerVisits(input.visits || [], playerId);
  const darts = pokerNum(stats.darts ?? stats.dartsThrown, visits.reduce((sum, visit) => sum + Math.max((visit?.darts || []).length, (visit?.labels || []).length, 1), 0));
  const hits = pokerNum(stats.hits, darts - pokerNum(stats.misses));
  const misses = pokerNum(stats.misses, Math.max(0, darts - hits));
  const singles = pokerNum(stats.singles);
  const doubles = pokerNum(stats.doubles);
  const triples = pokerNum(stats.triples);
  const bulls = pokerNum(stats.bulls);
  const dbulls = pokerNum(stats.dbulls);
  const handsPlayed = pokerNum(stats.handsPlayed, roundRows.length);
  const handsWon = pokerNum(stats.handsWon, roundRows.filter((row) => row?.win).length);
  const handsTied = pokerNum(stats.handsTied, roundRows.filter((row) => row?.tied).length);
  const points = pokerNum(stats.roundPoints, roundRows.reduce((sum, row) => sum + pokerNum(row?.pointsAwarded), 0));
  const contractHits = pokerNum(stats.contractHits, roundRows.filter((row) => row?.contractCompleted).length);
  const contractsAttempted = input.contractsEnabled === false ? 0 : Math.max(handsPlayed, roundRows.filter((row) => row?.contract).length);
  const contractBonusPoints = pokerNum(stats.contractBonusPoints, roundRows.reduce((sum, row) => sum + pokerNum(row?.contractBonus), 0));
  const cardsCollected = pokerNum(stats.cardsCollected);
  const marketCards = pokerNum(stats.marketCards);
  const autoDraws = pokerNum(stats.autoDraws);
  const jokers = pokerNum(stats.jokers);
  const choicesEarned = pokerNum(stats.choicesEarned);
  const choicesUsed = pokerNum(stats.choicesUsed);
  const exchangesEarned = pokerNum(stats.exchangesEarned);
  const exchangesUsed = pokerNum(stats.exchangesUsed);
  const powersEarned = choicesEarned + exchangesEarned;
  const powersUsed = choicesUsed + exchangesUsed;
  const powerCards = Math.max(0, cardsCollected - marketCards - autoDraws - jokers);
  const handScores = Array.isArray(stats.handScores) ? stats.handScores.map(pokerNum).filter((value) => Number.isFinite(value)) : roundRows.map((row) => pokerNum(row?.evaluation?.score)).filter((value) => value > 0);
  const categoryRanks = roundRows.map((row) => pokerNum(row?.evaluation?.categoryRank, -1)).filter((value) => value >= 0);
  const ranks = roundRows.map((row) => pokerNum(row?.rank)).filter((value) => value > 0);
  const favoriteSegment = topEntry(stats.hitsBySegment);
  const favoriteRank = topEntry(stats.cardsByRank);
  const favoriteSuit = topEntry(stats.cardsBySuit);
  const streaks = computeStreaks(visits);
  const strongHands = categoryRanks.filter((value) => value >= 3).length;
  const premiumHands = categoryRanks.filter((value) => value >= 5).length;
  const secondPlaces = ranks.filter((value) => value === 2).length;
  const thirdPlaces = ranks.filter((value) => value === 3).length;
  const podiums = ranks.filter((value) => value <= 3).length;
  const segmentMap = stats.hitsBySegment || {};
  const uniqueSegments = Object.entries(segmentMap).filter(([key, value]) => String(key).toUpperCase() !== "MISS" && pokerNum(value) > 0).length;
  const marketAttempts = singles + doubles + triples;
  const avgHandScore = handsPlayed ? pokerNum(stats.totalHandScore, handScores.reduce((a, b) => a + b, 0)) / handsPlayed : 0;
  const sectorHeatmap = deriveDartsPokerSectorHeatmap(stats);
  const touchedSectors = sectorHeatmap.filter((row) => row.total > 0);
  const favoritePhysicalSector = sectorHeatmap.slice().sort((a, b) => b.total - a.total || a.sector - b.sector)[0];
  const rankStdDev = standardDeviation(ranks);
  const handScoreStdDev = standardDeviation(handScores);
  const basePoints = Math.max(0, points - contractBonusPoints);
  const roundsWithContractWin = roundRows.filter((row) => row?.contractCompleted && row?.win).length;
  const marketAttemptsSafe = Math.max(0, marketAttempts);
  const race = buildPokerCumulativeRace(input.rounds || []);
  const leadRounds = race.filter((step) => step.leaders.includes(playerId)).length;
  const orderedRoundRows = [...roundRows].sort((a, b) => pokerNum(a?.round) - pokerNum(b?.round));
  const lastThree = orderedRoundRows.slice(-3);
  const dealerRounds = (Array.isArray(input.rounds) ? input.rounds : []).filter((round: any) => String(round?.dealerId || "") === playerId).length;
  const dealerWins = (Array.isArray(input.rounds) ? input.rounds : []).filter((round: any) => String(round?.dealerId || "") === playerId && (round?.winnerIds || []).map(String).includes(playerId)).length;
  const openingRoundWin = Boolean(orderedRoundRows[0]?.win);
  const closingRoundWin = Boolean(orderedRoundRows[orderedRoundRows.length - 1]?.win);
  const lastThreeWins = lastThree.filter((row) => row?.win).length;
  const lastThreeContracts = lastThree.filter((row) => row?.contractCompleted).length;
  const lastThreePoints = lastThree.reduce((sum, row) => sum + pokerNum(row?.pointsAwarded), 0);

  return {
    darts, visits: pokerNum(stats.visits, visits.length), hits, misses,
    accuracy: pokerPct(hits, darts), singles, doubles, triples, bulls, dbulls,
    singleRate: pokerPct(singles, darts), doubleRate: pokerPct(doubles, darts), tripleRate: pokerPct(triples, darts), bullRate: pokerPct(bulls, darts), dbullRate: pokerPct(dbulls, darts), missRate: pokerPct(misses, darts),
    bestHitStreak: Math.max(pokerNum(stats.bestHitStreak), streaks.bestHitStreak),
    bestMissStreak: Math.max(pokerNum(stats.bestMissStreak), streaks.bestMissStreak),
    uniqueSegments,
    physicalSectorsTouched: touchedSectors.length,
    physicalSectorCoverageRate: pokerPct(touchedSectors.length, 20),
    favoritePhysicalSector: favoritePhysicalSector?.total ? favoritePhysicalSector.sector : 0,
    favoritePhysicalSectorHits: favoritePhysicalSector?.total || 0,
    favoriteSegment: String(stats.favoriteSegment || favoriteSegment?.key || "—"), favoriteSegmentHits: pokerNum(stats.favoriteSegmentHits, favoriteSegment?.value || 0),
    cardsCollected, marketCards, autoDraws, powerCards, jokers,
    cardsPerHit: hits ? cardsCollected / hits : 0,
    cardsPerDart: darts ? cardsCollected / darts : 0,
    cardsPerHand: handsPlayed ? cardsCollected / handsPlayed : 0,
    marketCaptureRate: pokerPct(marketCards, marketAttemptsSafe),
    autoDrawRate: pokerPct(autoDraws, cardsCollected),
    scoringRingHitRate: pokerPct(doubles + triples, Math.max(1, hits)),
    bullHitRate: pokerPct(bulls + dbulls, Math.max(1, darts)),
    favoriteCardRank: String(stats.favoriteCardRank || favoriteRank?.key || "—"), favoriteCardRankCount: pokerNum(stats.favoriteCardRankCount, favoriteRank?.value || 0),
    favoriteCardSuit: String(stats.favoriteCardSuit || favoriteSuit?.key || "—"), favoriteCardSuitCount: pokerNum(stats.favoriteCardSuitCount, favoriteSuit?.value || 0),
    choicesEarned, choicesUsed, choiceUseRate: pokerPct(choicesUsed, choicesEarned),
    exchangesEarned, exchangesUsed, exchangeUseRate: pokerPct(exchangesUsed, exchangesEarned),
    powersEarned, powersUsed, powerUseRate: pokerPct(powersUsed, powersEarned),
    handsPlayed, handsWon, handsTied, handWinRate: pokerPct(handsWon, handsPlayed), tieRate: pokerPct(handsTied, handsPlayed),
    points, basePoints, pointsPerHand: handsPlayed ? points / handsPlayed : 0, pointsPerDart: darts ? points / darts : 0,
    contractsAttempted, contractHits, contractSuccessRate: pokerPct(contractHits, contractsAttempted), contractBonusPoints,
    contractPointShare: pokerPct(contractBonusPoints, points),
    contractWinRounds: roundsWithContractWin,
    contractWinRate: pokerPct(roundsWithContractWin, contractHits),
    bestContractStreak: bestFlagStreak(roundRows, "contractCompleted"),
    averageHandScore: avgHandScore,
    handScoreStdDev,
    handConsistencyIndex: avgHandScore > 0 ? Math.max(0, 100 - (handScoreStdDev / avgHandScore) * 100) : 0,
    medianHandScore: pokerNum(stats.medianHandScore, median(handScores)), worstHandScore: pokerNum(stats.worstHandScore, handScores.length ? Math.min(...handScores) : 0),
    bestHandScore: pokerNum(stats.bestHandScore, handScores.length ? Math.max(...handScores) : 0), bestHandLabel: String(stats.bestHandLabel || roundRows.slice().sort((a,b)=>pokerNum(b?.evaluation?.score)-pokerNum(a?.evaluation?.score))[0]?.evaluation?.label || "—"),
    averageCategoryRank: categoryRanks.length ? categoryRanks.reduce((a, b) => a + b, 0) / categoryRanks.length : 0,
    strongHands, premiumHands, strongHandRate: pokerPct(strongHands, handsPlayed), premiumHandRate: pokerPct(premiumHands, handsPlayed),
    averageRoundRank: ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0,
    roundRankStdDev: rankStdDev,
    roundRankConsistency: ranks.length ? Math.max(0, 100 - (rankStdDev / Math.max(1, input?.stats?.playersCount || 8)) * 100) : 0,
    bestRoundRank: ranks.length ? Math.min(...ranks) : 0, worstRoundRank: ranks.length ? Math.max(...ranks) : 0,
    secondPlaces, thirdPlaces, podiums, podiumRate: pokerPct(podiums, handsPlayed), bestRoundWinStreak: computeWinStreak(roundRows),
    leadRounds, leadRate: pokerPct(leadRounds, race.length),
    openingRoundWin, closingRoundWin,
    lastThreeWins, lastThreeContracts, lastThreePoints,
    dealerRounds, dealerWins, dealerWinRate: pokerPct(dealerWins, dealerRounds),
  };
}

export function deriveDartsPokerMatchMetrics(playerRows: any[], rounds: any[] = [], durationMs = 0) {
  const rows = Array.isArray(playerRows) ? playerRows : [];
  const story = deriveDartsPokerMatchStory(rounds);
  const sum = (key: string) => rows.reduce((total, row) => total + pokerNum(row?.[key]), 0);
  const totalDarts = sum("darts");
  const totalHits = sum("hits");
  const totalHands = sum("handsPlayed");
  const totalPoints = sum("points") || sum("roundPoints");
  const totalPowerEarned = sum("powersEarned");
  const totalPowerUsed = sum("powersUsed");
  const bestAccuracy = rows.reduce((best, row) => Math.max(best, pokerNum(row?.accuracy)), 0);
  const bestHitStreak = rows.reduce((best, row) => Math.max(best, pokerNum(row?.bestHitStreak)), 0);
  const bestHand = rows.slice().sort((a, b) => pokerNum(b?.bestHandScore) - pokerNum(a?.bestHandScore))[0] || null;
  return {
    analyticsVersion: 2,
    roundsPlayed: Array.isArray(rounds) ? rounds.length : 0,
    totalDarts, totalHits, totalMisses: sum("misses"), accuracy: pokerPct(totalHits, totalDarts),
    singles: sum("singles"), doubles: sum("doubles"), triples: sum("triples"), bulls: sum("bulls"), dbulls: sum("dbulls"),
    totalHands, totalHandsWon: sum("handsWon"), totalHandsTied: sum("handsTied"), handWinRate: pokerPct(sum("handsWon"), totalHands),
    totalPoints,
    pointsPerRound: rounds.length ? totalPoints / rounds.length : 0,
    pointsPerDart: totalDarts ? totalPoints / totalDarts : 0,
    cardsCollected: sum("cardsCollected"), marketCards: sum("marketCards"), autoDraws: sum("autoDraws"), powerCards: sum("powerCards"), jokers: sum("jokers"),
    cardsPerDart: totalDarts ? sum("cardsCollected") / totalDarts : 0,
    marketCaptureRate: pokerPct(sum("marketCards"), sum("singles") + sum("doubles") + sum("triples")),
    choicesEarned: sum("choicesEarned"), choicesUsed: sum("choicesUsed"), exchangesEarned: sum("exchangesEarned"), exchangesUsed: sum("exchangesUsed"),
    totalPowerEarned, totalPowerUsed, powerUseRate: pokerPct(totalPowerUsed, totalPowerEarned),
    contractsAttempted: sum("contractsAttempted"), contractsCompleted: sum("contractHits"), contractSuccessRate: pokerPct(sum("contractHits"), sum("contractsAttempted")), contractBonusPoints: sum("contractBonusPoints"),
    contractPointShare: pokerPct(sum("contractBonusPoints"), totalPoints),
    strongHands: sum("strongHands"), premiumHands: sum("premiumHands"), podiums: sum("podiums"),
    strongHandRate: pokerPct(sum("strongHands"), totalHands),
    premiumHandRate: pokerPct(sum("premiumHands"), totalHands),
    bestAccuracy, bestHitStreak, bestHandScore: pokerNum(bestHand?.bestHandScore), bestHandLabel: String(bestHand?.bestHandLabel || "—"),
    durationMs: Math.max(0, pokerNum(durationMs)),
    leadChanges: story.leadChanges,
    uniqueLeaders: story.uniqueLeaders,
    largestLead: story.largestLead,
    finalMargin: story.finalMargin,
    decidingRound: story.decidingRound,
    biggestComeback: story.biggestComeback,
    tiedRounds: story.tiedRounds,
  };
}
