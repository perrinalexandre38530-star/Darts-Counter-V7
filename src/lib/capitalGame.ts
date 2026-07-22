export type CapitalContractId =
  | "capital"
  | "n20"
  | "triple_any"
  | "n19"
  | "double_any"
  | "n18"
  | "side"
  | "n17"
  | "suite"
  | "n16"
  | "colors_3"
  | "n15"
  | "exact_57"
  | "n14"
  | "center";

export type CapitalDart = { v: number; mult: 1 | 2 | 3 };
export type CapitalParticipantMode = "players" | "teams";
export type CapitalTeamsSourceMode = "manual" | "saved" | "auto";
export type CapitalStartOrderMode = "fixed" | "random";
export type CapitalModeKind = "official" | "custom";

export type CapitalPlayer = {
  id: string;
  profileId?: string | null;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  isBot?: boolean;
  botLevel?: string | number | null;
  teamId?: string | null;
  teamIndex?: number;
};

export type CapitalTeam = {
  id: string;
  name: string;
  color?: string | null;
  logoDataUrl?: string | null;
  avatarUrl?: string | null;
  players: string[];
};

export type CapitalConfigPayload = {
  id?: string;
  mode: CapitalModeKind;
  participantMode: CapitalParticipantMode;
  teamsSourceMode?: CapitalTeamsSourceMode;
  players: CapitalPlayer[] | number;
  selectedIds: string[];
  teams?: CapitalTeam[];
  teamSize?: number;
  startOrderMode: CapitalStartOrderMode;
  startOrderApplied?: boolean;
  contracts: CapitalContractId[];
  customContracts?: CapitalContractId[];
  includeCapital: boolean;
  failDivideBy2: boolean;
  startingCapital?: number;
  victoryMode: "best_after_contracts" | "first_to_target";
  targetScore?: number;
  tieBreaker: "none" | "last_contract_total";
  inputMethod?: "keypad" | "dartboard" | "presets" | "visit" | "voice";
  turnTimerSec?: number;
  botsEnabled?: boolean;
  botLevel?: "easy" | "normal" | "hard";
  botsAutoPlay?: boolean;
  botTurnDelayMs?: number;
  botRisk?: "safe" | "normal" | "aggressive";
  createdAt?: number;
};

export type CapitalVisit = {
  id: string;
  contractId: CapitalContractId;
  contractIndex: number;
  playerId: string;
  playerIndex: number;
  playerName: string;
  teamId?: string | null;
  darts: CapitalDart[];
  visitScore: number;
  success: boolean;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  penaltyLost: number;
  createdAt: number;
};

export const CAPITAL_BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const RED_NUMBERS = new Set([20, 12, 14, 8, 7, 3, 2, 10, 13, 18]);

export const CAPITAL_OFFICIAL_CONTRACTS: CapitalContractId[] = [
  "capital",
  "n20",
  "triple_any",
  "n19",
  "double_any",
  "n18",
  "side",
  "n17",
  "suite",
  "n16",
  "colors_3",
  "n15",
  "exact_57",
  "n14",
  "center",
];

export const CAPITAL_SELECTABLE_CONTRACTS: CapitalContractId[] = CAPITAL_OFFICIAL_CONTRACTS.filter((id) => id !== "capital");

export const CAPITAL_CONTRACT_META: Record<CapitalContractId, { short: string; label: string; rule: string }> = {
  capital: { short: "CAP", label: "Capital", rule: "Les 3 fléchettes constituent le capital de départ." },
  n20: { short: "20", label: "20", rule: "Toucher au moins une fois le secteur 20." },
  triple_any: { short: "T", label: "Triple", rule: "Toucher au moins un triple, quel que soit le numéro." },
  n19: { short: "19", label: "19", rule: "Toucher au moins une fois le secteur 19." },
  double_any: { short: "D", label: "Double", rule: "Toucher au moins un double, DBULL compris." },
  n18: { short: "18", label: "18", rule: "Toucher au moins une fois le secteur 18." },
  side: { short: "SIDE", label: "Side", rule: "Toucher trois secteurs voisins sur la cible, dans n’importe quel ordre." },
  n17: { short: "17", label: "17", rule: "Toucher au moins une fois le secteur 17." },
  suite: { short: "SUITE", label: "Suite", rule: "Toucher trois numéros consécutifs, dans n’importe quel ordre." },
  n16: { short: "16", label: "16", rule: "Toucher au moins une fois le secteur 16." },
  colors_3: { short: "3C", label: "Couleur", rule: "Toucher trois couleurs différentes parmi noir, blanc, rouge et vert." },
  n15: { short: "15", label: "15", rule: "Toucher au moins une fois le secteur 15." },
  exact_57: { short: "57", label: "57 exact", rule: "Obtenir exactement 57 points avec la volée." },
  n14: { short: "14", label: "14", rule: "Toucher au moins une fois le secteur 14." },
  center: { short: "BULL", label: "Centre", rule: "Toucher le BULL (25) ou le DBULL (50)." },
};

export function clampCapitalNumber(value: any, min: number, max: number, fallback = min): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function capitalDartScore(dart: CapitalDart): number {
  const value = Number(dart?.v || 0);
  const rawMultiplier = Number(dart?.mult || 1);
  const multiplier = rawMultiplier === 3 ? 3 : rawMultiplier === 2 ? 2 : 1;
  if (value === 25) return value * (multiplier === 2 ? 2 : 1);
  if (value < 1 || value > 20) return 0;
  return value * multiplier;
}

export function capitalVisitScore(darts: CapitalDart[]): number {
  return (Array.isArray(darts) ? darts : []).reduce((sum, dart) => sum + capitalDartScore(dart), 0);
}

export function normalizeCapitalDarts(darts: CapitalDart[]): CapitalDart[] {
  const normalized = (Array.isArray(darts) ? darts : []).slice(0, 3).map((dart: any) => {
    const v = clampCapitalNumber(dart?.v, 0, 25, 0);
    const rawMultiplier = Number(dart?.mult || 1);
    const mult = v === 25 ? (rawMultiplier === 2 ? 2 : 1) : rawMultiplier === 3 ? 3 : rawMultiplier === 2 ? 2 : 1;
    return { v, mult } as CapitalDart;
  });
  while (normalized.length < 3) normalized.push({ v: 0, mult: 1 });
  return normalized;
}

function validBoardNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 20;
}

function dartColor(dart: CapitalDart): "black" | "white" | "red" | "green" | "none" {
  const value = Number(dart?.v || 0);
  const multiplier = Number(dart?.mult || 1);
  if (value === 25) return multiplier === 2 ? "red" : "green";
  if (!validBoardNumber(value)) return "none";
  if (multiplier === 1) {
    const index = CAPITAL_BOARD_ORDER.indexOf(value);
    return index >= 0 && index % 2 === 0 ? "black" : "white";
  }
  return RED_NUMBERS.has(value) ? "red" : "green";
}

export function capitalContractSuccess(contract: CapitalContractId, rawDarts: CapitalDart[]): boolean {
  const darts = normalizeCapitalDarts(rawDarts);
  const values = darts.map((dart) => dart.v).filter(validBoardNumber);
  const uniqueValues = Array.from(new Set(values));

  switch (contract) {
    case "capital":
      return true;
    case "n20":
      return darts.some((dart) => dart.v === 20);
    case "triple_any":
      return darts.some((dart) => dart.mult === 3 && validBoardNumber(dart.v));
    case "n19":
      return darts.some((dart) => dart.v === 19);
    case "double_any":
      return darts.some((dart) => dart.mult === 2 && (validBoardNumber(dart.v) || dart.v === 25));
    case "n18":
      return darts.some((dart) => dart.v === 18);
    case "side": {
      if (uniqueValues.length !== 3) return false;
      const indexes = uniqueValues.map((value) => CAPITAL_BOARD_ORDER.indexOf(value));
      if (indexes.some((index) => index < 0)) return false;
      return CAPITAL_BOARD_ORDER.some((_, start) => {
        const triplet = new Set([start, (start + 1) % 20, (start + 2) % 20]);
        return indexes.every((index) => triplet.has(index));
      });
    }
    case "n17":
      return darts.some((dart) => dart.v === 17);
    case "suite": {
      if (uniqueValues.length !== 3) return false;
      const sorted = [...uniqueValues].sort((a, b) => a - b);
      return sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
    }
    case "n16":
      return darts.some((dart) => dart.v === 16);
    case "colors_3": {
      const colors = darts.map(dartColor).filter((color) => color !== "none");
      return colors.length === 3 && new Set(colors).size === 3;
    }
    case "n15":
      return darts.some((dart) => dart.v === 15);
    case "exact_57":
      return capitalVisitScore(darts) === 57;
    case "n14":
      return darts.some((dart) => dart.v === 14);
    case "center":
      return darts.some((dart) => dart.v === 25);
    default:
      return false;
  }
}

export function applyCapitalVisit(
  scoreBefore: number,
  contract: CapitalContractId,
  rawDarts: CapitalDart[],
  failDivideBy2 = true
): { scoreAfter: number; visitScore: number; success: boolean; delta: number; penaltyLost: number } {
  const darts = normalizeCapitalDarts(rawDarts);
  const visitScore = capitalVisitScore(darts);
  const success = capitalContractSuccess(contract, darts);
  const scoreAfter = contract === "capital"
    ? visitScore
    : success
      ? scoreBefore + visitScore
      : failDivideBy2
        ? Math.floor(scoreBefore / 2)
        : scoreBefore;
  return {
    scoreAfter,
    visitScore,
    success,
    delta: scoreAfter - scoreBefore,
    penaltyLost: Math.max(0, scoreBefore - scoreAfter),
  };
}

export function replayCapitalScores(
  players: CapitalPlayer[],
  visits: CapitalVisit[],
  includeCapital: boolean,
  startingCapital = 0
): number[] {
  const byId = new Map(players.map((player, index) => [String(player.id), index]));
  const scores = Array.from({ length: players.length }, () => includeCapital ? 0 : startingCapital);
  for (const visit of visits || []) {
    const index = byId.get(String(visit.playerId));
    if (index == null) continue;
    scores[index] = Number(visit.scoreAfter || 0);
  }
  return scores;
}

function randomHit(probability: number): boolean {
  return Math.random() < probability;
}

export function makeCapitalBotVisit(
  contract: CapitalContractId,
  level: "easy" | "normal" | "hard" = "normal",
  risk: "safe" | "normal" | "aggressive" = "normal"
): CapitalDart[] {
  const baseAccuracy = level === "easy" ? 0.42 : level === "hard" ? 0.79 : 0.62;
  const riskDelta = risk === "aggressive" ? 0.08 : risk === "safe" ? -0.06 : 0;
  const accuracy = Math.max(0.15, Math.min(0.94, baseAccuracy + riskDelta));
  const miss = (): CapitalDart => ({ v: 0, mult: 1 });
  const dart = (v: number, mult: 1 | 2 | 3 = 1): CapitalDart => ({ v, mult });
  const tryDart = (v: number, mult: 1 | 2 | 3 = 1) => randomHit(accuracy) ? dart(v, mult) : miss();

  switch (contract) {
    case "capital":
      return [tryDart(20, randomHit(accuracy * 0.55) ? 3 : 1), tryDart(19, randomHit(accuracy * 0.45) ? 3 : 1), tryDart(18, randomHit(accuracy * 0.35) ? 3 : 1)];
    case "n20": return [tryDart(20), tryDart(20), tryDart(20)];
    case "n19": return [tryDart(19), tryDart(19), tryDart(19)];
    case "n18": return [tryDart(18), tryDart(18), tryDart(18)];
    case "n17": return [tryDart(17), tryDart(17), tryDart(17)];
    case "n16": return [tryDart(16), tryDart(16), tryDart(16)];
    case "n15": return [tryDart(15), tryDart(15), tryDart(15)];
    case "n14": return [tryDart(14), tryDart(14), tryDart(14)];
    case "double_any": return [tryDart(20, 2), tryDart(16, 2), tryDart(12, 2)];
    case "triple_any": return [tryDart(20, 3), tryDart(19, 3), tryDart(18, 3)];
    case "center": return [randomHit(accuracy) ? dart(25, randomHit(accuracy * 0.5) ? 2 : 1) : miss(), miss(), miss()];
    case "exact_57": return randomHit(accuracy) ? [dart(19, 3), miss(), miss()] : [dart(20), dart(19), dart(18)];
    case "suite": return randomHit(accuracy) ? [dart(18), dart(19), dart(20)] : [tryDart(10), tryDart(11), tryDart(12)];
    case "side": return randomHit(accuracy) ? [dart(20), dart(1), dart(18)] : [tryDart(6), tryDart(10), tryDart(15)];
    case "colors_3": return randomHit(accuracy) ? [dart(25), dart(20, 2), dart(19)] : [tryDart(20), tryDart(5), miss()];
    default: return [miss(), miss(), miss()];
  }
}

export function capitalDartLabel(dart: CapitalDart): string {
  if (!dart || dart.v === 0) return "MISS";
  if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}

export function buildCapitalPlayerStats(players: CapitalPlayer[], visits: CapitalVisit[], finalScores: number[]) {
  const round1 = (value: number) => Math.round(value * 10) / 10;
  const ratio = (num: number, den: number) => den ? round1((num / den) * 100) : 0;

  return players.map((player, index) => {
    const rows = (visits || []).filter((visit) => String(visit.playerId) === String(player.id));
    const scoringRows = rows.filter((visit) => visit.contractId !== "capital");
    const opening = rows.find((visit) => visit.contractId === "capital");
    const darts = rows.flatMap((visit) => visit.darts || []);
    const successfulRows = scoringRows.filter((visit) => visit.success);
    const failedRows = scoringRows.filter((visit) => !visit.success);
    const visitsPlayed = rows.length;
    const successfulVisits = successfulRows.length;
    const failedVisits = failedRows.length;
    const pointsWon = successfulRows.reduce((sum, visit) => sum + Number(visit.visitScore || 0), 0);
    const capitalLost = scoringRows.reduce((sum, visit) => sum + Number(visit.penaltyLost || 0), 0);
    const scored = rows.reduce((sum, visit) => sum + Number(visit.visitScore || 0), 0);
    const failedRawPoints = failedRows.reduce((sum, visit) => sum + Number(visit.visitScore || 0), 0);
    const bestVisit = rows.reduce((best, visit) => Math.max(best, Number(visit.visitScore || 0)), 0);
    const lowestVisit = rows.length ? rows.reduce((low, visit) => Math.min(low, Number(visit.visitScore || 0)), Number.POSITIVE_INFINITY) : 0;
    const bestGain = rows.reduce((best, visit) => Math.max(best, Number(visit.delta || 0)), 0);
    const biggestLoss = rows.reduce((best, visit) => Math.max(best, Number(visit.penaltyLost || 0)), 0);
    const count = (predicate: (dart: CapitalDart) => boolean) => darts.filter(predicate).length;
    const dartsThrown = darts.length;
    const hitCount = count((dart) => Number(dart?.v || 0) > 0);
    const misses = dartsThrown - hitCount;
    const singles = count((dart) => dart.v > 0 && dart.mult === 1 && dart.v !== 25);
    const doubles = count((dart) => dart.v > 0 && dart.mult === 2 && dart.v !== 25);
    const triples = count((dart) => dart.v > 0 && dart.mult === 3 && dart.v !== 25);
    const bulls = count((dart) => dart.v === 25 && dart.mult === 1);
    const dbulls = count((dart) => dart.v === 25 && dart.mult === 2);
    const finalCapital = Number(finalScores[index] || 0);
    const startingCapital = Number(opening?.scoreAfter || 0);
    const scoreAfterValues = rows.map((visit) => Number(visit.scoreAfter || 0));
    const peakCapital = scoreAfterValues.length ? Math.max(...scoreAfterValues) : finalCapital;
    const lowestCapital = scoreAfterValues.length ? Math.min(...scoreAfterValues) : finalCapital;
    const averageCapitalAfterVisit = scoreAfterValues.length ? round1(scoreAfterValues.reduce((a, b) => a + b, 0) / scoreAfterValues.length) : finalCapital;
    const grossCapital = startingCapital + pointsWon;
    const netCapitalChange = finalCapital - startingCapital;
    const penaltyEvents = failedRows.filter((visit) => Number(visit.penaltyLost || 0) > 0).length;
    const avgPenalty = penaltyEvents ? round1(capitalLost / penaltyEvents) : 0;

    let successStreak = 0;
    let failStreak = 0;
    let successStreakMax = 0;
    let failStreakMax = 0;
    for (const visit of scoringRows) {
      if (visit.success) {
        successStreak += 1;
        failStreak = 0;
        successStreakMax = Math.max(successStreakMax, successStreak);
      } else {
        failStreak += 1;
        successStreak = 0;
        failStreakMax = Math.max(failStreakMax, failStreak);
      }
    }

    const contractStats: Record<string, {
      attempts: number;
      successes: number;
      failures: number;
      successRate: number;
      pointsWon: number;
      rawPoints: number;
      capitalLost: number;
      bestVisit: number;
      averageVisit: number;
    }> = {};
    for (const visit of scoringRows) {
      const key = String(visit.contractId || "unknown");
      const current = contractStats[key] || { attempts: 0, successes: 0, failures: 0, successRate: 0, pointsWon: 0, rawPoints: 0, capitalLost: 0, bestVisit: 0, averageVisit: 0 };
      current.attempts += 1;
      current.successes += visit.success ? 1 : 0;
      current.failures += visit.success ? 0 : 1;
      current.pointsWon += visit.success ? Number(visit.visitScore || 0) : 0;
      current.rawPoints += Number(visit.visitScore || 0);
      current.capitalLost += Number(visit.penaltyLost || 0);
      current.bestVisit = Math.max(current.bestVisit, Number(visit.visitScore || 0));
      current.successRate = ratio(current.successes, current.attempts);
      current.averageVisit = round1(current.rawPoints / current.attempts);
      contractStats[key] = current;
    }

    const sectorHits: Record<string, number> = {};
    const sectorPoints: Record<string, number> = {};
    for (const dart of darts) {
      const v = Number(dart?.v || 0);
      if (v <= 0) continue;
      const key = String(v);
      sectorHits[key] = (sectorHits[key] || 0) + 1;
      sectorPoints[key] = (sectorPoints[key] || 0) + capitalDartScore(dart);
    }
    const topSectorEntry = Object.entries(sectorHits).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))[0];
    const topScoringSectorEntry = Object.entries(sectorPoints).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))[0];
    const visitScores = rows.map((visit) => Number(visit.visitScore || 0));
    const buckets = {
      zero: visitScores.filter((score) => score === 0).length,
      under20: visitScores.filter((score) => score > 0 && score < 20).length,
      h20: visitScores.filter((score) => score >= 20 && score < 40).length,
      h40: visitScores.filter((score) => score >= 40 && score < 60).length,
      h60: visitScores.filter((score) => score >= 60 && score < 100).length,
      h100: visitScores.filter((score) => score >= 100 && score < 140).length,
      h140: visitScores.filter((score) => score >= 140 && score < 180).length,
      h180: visitScores.filter((score) => score === 180).length,
    };
    const visits60Plus = visitScores.filter((score) => score >= 60).length;
    const visits100Plus = visitScores.filter((score) => score >= 100).length;
    const visits140Plus = visitScores.filter((score) => score >= 140).length;
    const maxDart = darts.reduce((best, dart) => Math.max(best, capitalDartScore(dart)), 0);
    const rawDartAverage = dartsThrown ? round1(scored / dartsThrown) : 0;

    const contractSuccess = (contractId: CapitalContractId) => scoringRows.filter((visit) => visit.contractId === contractId && visit.success).length;

    return {
      ...player,
      playerId: player.id,
      profileId: player.profileId ?? player.id,
      capital: finalCapital,
      finalCapital,
      score: finalCapital,
      startingCapital,
      peakCapital,
      lowestCapital,
      averageCapital: averageCapitalAfterVisit,
      averageCapitalAfterVisit,
      grossCapital,
      netCapitalChange,
      capitalRetentionRate: ratio(finalCapital, grossCapital),
      points: pointsWon,
      pointsWon,
      rawPointsScored: scored,
      failedRawPoints,
      capitalLost,
      penaltyLost: capitalLost,
      penaltyEvents,
      avgPenalty,
      visits: visitsPlayed,
      turns: visitsPlayed,
      rounds: visitsPlayed,
      contractsPlayed: scoringRows.length,
      targetsFaced: scoringRows.length,
      successfulContracts: successfulVisits,
      successfulVisits,
      validHits: successfulVisits,
      failedContracts: failedVisits,
      failedVisits,
      fails: failedVisits,
      successRate: ratio(successfulVisits, scoringRows.length),
      successStreakMax,
      failStreakMax,
      darts: dartsThrown,
      dartsThrown,
      totalThrows: dartsThrown,
      hitCount,
      misses,
      hitRate: ratio(hitCount, dartsThrown),
      missRate: ratio(misses, dartsThrown),
      totalScore: scored,
      averageVisit: visitsPlayed ? round1(scored / visitsPlayed) : 0,
      avgVisit: visitsPlayed ? round1(scored / visitsPlayed) : 0,
      avg3: dartsThrown ? round1((scored / dartsThrown) * 3) : 0,
      rawDartAverage,
      averageSuccessfulVisit: successfulRows.length ? round1(successfulRows.reduce((sum, visit) => sum + Number(visit.visitScore || 0), 0) / successfulRows.length) : 0,
      averageFailedVisit: failedRows.length ? round1(failedRows.reduce((sum, visit) => sum + Number(visit.visitScore || 0), 0) / failedRows.length) : 0,
      bestVisit,
      lowestVisit: Number.isFinite(lowestVisit) ? lowestVisit : 0,
      bestGain,
      biggestLoss,
      maxDart,
      exact57: contractSuccess("exact_57"),
      centerSuccess: contractSuccess("center"),
      tripleContractSuccess: contractSuccess("triple_any"),
      doubleContractSuccess: contractSuccess("double_any"),
      sideSuccess: contractSuccess("side"),
      suiteSuccess: contractSuccess("suite"),
      colorsSuccess: contractSuccess("colors_3"),
      singles,
      doubles,
      triples,
      bulls,
      dbulls,
      singleRate: ratio(singles, dartsThrown),
      doubleRate: ratio(doubles, dartsThrown),
      tripleRate: ratio(triples, dartsThrown),
      bullRate: ratio(bulls + dbulls, dartsThrown),
      zeroVisits: buckets.zero,
      visits60Plus,
      visits100Plus,
      visits140Plus,
      visits180: buckets.h180,
      h60: buckets.h60,
      h100: buckets.h100,
      h140: buckets.h140,
      h180: buckets.h180,
      buckets,
      sectorHits,
      sectorPoints,
      topSector: topSectorEntry ? Number(topSectorEntry[0]) : null,
      topSectorHits: topSectorEntry ? topSectorEntry[1] : 0,
      topScoringSector: topScoringSectorEntry ? Number(topScoringSectorEntry[0]) : null,
      topScoringSectorPoints: topScoringSectorEntry ? topScoringSectorEntry[1] : 0,
      successfulContractIds: scoringRows.filter((visit) => visit.success).map((visit) => visit.contractId),
      failedContractIds: scoringRows.filter((visit) => !visit.success).map((visit) => visit.contractId),
      contractStats,
      lastContractScore: scoringRows.length ? Number(scoringRows[scoringRows.length - 1].visitScore || 0) : 0,
      lastContractSuccess: scoringRows.length ? Boolean(scoringRows[scoringRows.length - 1].success) : false,
    };
  });
}

export function buildCapitalTeamStats(teams: CapitalTeam[], playerStats: any[]) {
  const round1 = (value: number) => Math.round(value * 10) / 10;
  const ratio = (num: number, den: number) => den ? round1((num / den) * 100) : 0;
  return (teams || []).map((team, index) => {
    const members = playerStats.filter((player) => (team.players || []).map(String).includes(String(player.id || player.playerId)));
    const sum = (key: string) => members.reduce((total, player) => total + Number(player?.[key] || 0), 0);
    const max = (key: string) => members.reduce((best, player) => Math.max(best, Number(player?.[key] || 0)), 0);
    const darts = sum("dartsThrown");
    const rawPoints = sum("rawPointsScored");
    const attempts = sum("contractsPlayed");
    const successfulContracts = sum("successfulContracts");
    const contractStats: Record<string, any> = {};
    for (const member of members) {
      for (const [contractId, row] of Object.entries(member?.contractStats || {}) as Array<[string, any]>) {
        const current = contractStats[contractId] || { attempts: 0, successes: 0, failures: 0, pointsWon: 0, rawPoints: 0, capitalLost: 0, bestVisit: 0, successRate: 0, averageVisit: 0 };
        current.attempts += Number(row?.attempts || 0);
        current.successes += Number(row?.successes || 0);
        current.failures += Number(row?.failures || 0);
        current.pointsWon += Number(row?.pointsWon || 0);
        current.rawPoints += Number(row?.rawPoints || 0);
        current.capitalLost += Number(row?.capitalLost || 0);
        current.bestVisit = Math.max(current.bestVisit, Number(row?.bestVisit || 0));
        current.successRate = ratio(current.successes, current.attempts);
        current.averageVisit = current.attempts ? round1(current.rawPoints / current.attempts) : 0;
        contractStats[contractId] = current;
      }
    }
    return {
      ...team,
      teamIndex: index,
      score: sum("finalCapital"),
      capital: sum("finalCapital"),
      finalCapital: sum("finalCapital"),
      startingCapital: sum("startingCapital"),
      peakCapital: sum("peakCapital"),
      lowestCapital: sum("lowestCapital"),
      netCapitalChange: sum("netCapitalChange"),
      pointsWon: sum("pointsWon"),
      rawPointsScored: rawPoints,
      capitalLost: sum("capitalLost"),
      penaltyEvents: sum("penaltyEvents"),
      successfulContracts,
      failedContracts: sum("failedContracts"),
      contractsPlayed: attempts,
      successRate: ratio(successfulContracts, attempts),
      dartsThrown: darts,
      visits: sum("visits"),
      avg3: darts ? round1((rawPoints / darts) * 3) : 0,
      averageVisit: sum("visits") ? round1(rawPoints / sum("visits")) : 0,
      hitCount: sum("hitCount"),
      misses: sum("misses"),
      hitRate: ratio(sum("hitCount"), darts),
      singles: sum("singles"),
      doubles: sum("doubles"),
      triples: sum("triples"),
      bulls: sum("bulls"),
      dbulls: sum("dbulls"),
      bestVisit: max("bestVisit"),
      bestGain: max("bestGain"),
      biggestLoss: max("biggestLoss"),
      successStreakMax: max("successStreakMax"),
      failStreakMax: max("failStreakMax"),
      visits60Plus: sum("visits60Plus"),
      visits100Plus: sum("visits100Plus"),
      visits140Plus: sum("visits140Plus"),
      visits180: sum("visits180"),
      exact57: sum("exact57"),
      capitalRetentionRate: ratio(sum("finalCapital"), sum("grossCapital")),
      contractStats,
      members,
    };
  });
}

export function buildCapitalMatchStats(playerStats: any[], teamStats: any[], visits: CapitalVisit[]) {
  const round1 = (value: number) => Math.round(value * 10) / 10;
  const ratio = (num: number, den: number) => den ? round1((num / den) * 100) : 0;
  const rows = Array.isArray(playerStats) ? playerStats : [];
  const sum = (key: string) => rows.reduce((total, row) => total + Number(row?.[key] || 0), 0);
  const max = (key: string) => rows.reduce((best, row) => Math.max(best, Number(row?.[key] || 0)), 0);
  const darts = sum("dartsThrown");
  const totalVisits = sum("visits");
  const rawPoints = sum("rawPointsScored");
  const attempts = sum("contractsPlayed");
  const successfulContracts = sum("successfulContracts");
  const times = (visits || []).map((visit) => Number(visit?.createdAt || 0)).filter((value) => value > 0);
  const durationMs = times.length > 1 ? Math.max(...times) - Math.min(...times) : 0;
  const contractStats: Record<string, any> = {};
  for (const player of rows) {
    for (const [contractId, row] of Object.entries(player?.contractStats || {}) as Array<[string, any]>) {
      const current = contractStats[contractId] || { attempts: 0, successes: 0, failures: 0, pointsWon: 0, rawPoints: 0, capitalLost: 0, bestVisit: 0, successRate: 0, averageVisit: 0 };
      current.attempts += Number(row?.attempts || 0);
      current.successes += Number(row?.successes || 0);
      current.failures += Number(row?.failures || 0);
      current.pointsWon += Number(row?.pointsWon || 0);
      current.rawPoints += Number(row?.rawPoints || 0);
      current.capitalLost += Number(row?.capitalLost || 0);
      current.bestVisit = Math.max(current.bestVisit, Number(row?.bestVisit || 0));
      current.successRate = ratio(current.successes, current.attempts);
      current.averageVisit = current.attempts ? round1(current.rawPoints / current.attempts) : 0;
      contractStats[contractId] = current;
    }
  }
  return {
    players: rows.length,
    teams: Array.isArray(teamStats) ? teamStats.length : 0,
    totalVisits,
    totalDarts: darts,
    rawPointsScored: rawPoints,
    averageVisit: totalVisits ? round1(rawPoints / totalVisits) : 0,
    avg3: darts ? round1((rawPoints / darts) * 3) : 0,
    totalStartingCapital: sum("startingCapital"),
    totalFinalCapital: sum("finalCapital"),
    averageFinalCapital: rows.length ? round1(sum("finalCapital") / rows.length) : 0,
    bestFinalCapital: max("finalCapital"),
    totalPointsWon: sum("pointsWon"),
    totalCapitalLost: sum("capitalLost"),
    netCapitalChange: sum("netCapitalChange"),
    capitalRetentionRate: ratio(sum("finalCapital"), sum("grossCapital")),
    contractsPlayed: attempts,
    successfulContracts,
    failedContracts: sum("failedContracts"),
    successRate: ratio(successfulContracts, attempts),
    penaltyEvents: sum("penaltyEvents"),
    averagePenalty: sum("penaltyEvents") ? round1(sum("capitalLost") / sum("penaltyEvents")) : 0,
    bestVisit: max("bestVisit"),
    bestGain: max("bestGain"),
    biggestLoss: max("biggestLoss"),
    successStreakMax: max("successStreakMax"),
    failStreakMax: max("failStreakMax"),
    hitCount: sum("hitCount"),
    misses: sum("misses"),
    hitRate: ratio(sum("hitCount"), darts),
    singles: sum("singles"),
    doubles: sum("doubles"),
    triples: sum("triples"),
    bulls: sum("bulls"),
    dbulls: sum("dbulls"),
    visits60Plus: sum("visits60Plus"),
    visits100Plus: sum("visits100Plus"),
    visits140Plus: sum("visits140Plus"),
    visits180: sum("visits180"),
    exact57: sum("exact57"),
    durationMs,
    contractStats,
  };
}

export function rankCapitalPlayers(playerStats: any[], winnerIds: string[] = []) {
  const winners = new Set(winnerIds.map(String));
  return [...(playerStats || [])]
    .sort((a, b) => Number(b.finalCapital || 0) - Number(a.finalCapital || 0) || Number(b.pointsWon || 0) - Number(a.pointsWon || 0))
    .map((player, index) => ({ ...player, rank: index + 1, position: index + 1, isWinner: winners.has(String(player.id || player.playerId)) }));
}

