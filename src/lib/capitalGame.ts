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
  return players.map((player, index) => {
    const rows = (visits || []).filter((visit) => String(visit.playerId) === String(player.id));
    const scoringRows = rows.filter((visit) => visit.contractId !== "capital");
    const opening = rows.find((visit) => visit.contractId === "capital");
    const darts = rows.flatMap((visit) => visit.darts || []);
    const visitsPlayed = rows.length;
    const successfulVisits = scoringRows.filter((visit) => visit.success).length;
    const failedVisits = scoringRows.length - successfulVisits;
    const pointsWon = scoringRows.filter((visit) => visit.success).reduce((sum, visit) => sum + visit.visitScore, 0);
    const capitalLost = scoringRows.reduce((sum, visit) => sum + visit.penaltyLost, 0);
    const scored = rows.reduce((sum, visit) => sum + visit.visitScore, 0);
    const bestVisit = rows.reduce((best, visit) => Math.max(best, visit.visitScore), 0);
    const bestGain = rows.reduce((best, visit) => Math.max(best, visit.delta), 0);
    const biggestLoss = rows.reduce((best, visit) => Math.max(best, visit.penaltyLost), 0);
    const count = (predicate: (dart: CapitalDart) => boolean) => darts.filter(predicate).length;
    const dartsThrown = darts.length;
    return {
      ...player,
      playerId: player.id,
      profileId: player.profileId ?? player.id,
      capital: Number(finalScores[index] || 0),
      finalCapital: Number(finalScores[index] || 0),
      score: Number(finalScores[index] || 0),
      startingCapital: Number(opening?.scoreAfter || 0),
      points: pointsWon,
      pointsWon,
      capitalLost,
      penaltyLost: capitalLost,
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
      successRate: scoringRows.length ? Math.round((successfulVisits / scoringRows.length) * 1000) / 10 : 0,
      darts: dartsThrown,
      dartsThrown,
      totalThrows: dartsThrown,
      totalScore: scored,
      averageVisit: visitsPlayed ? Math.round((scored / visitsPlayed) * 10) / 10 : 0,
      avgVisit: visitsPlayed ? Math.round((scored / visitsPlayed) * 10) / 10 : 0,
      avg3: dartsThrown ? Math.round((scored / dartsThrown) * 30) / 10 : 0,
      bestVisit,
      bestGain,
      biggestLoss,
      exact57: scoringRows.some((visit) => visit.contractId === "exact_57" && visit.success) ? 1 : 0,
      singles: count((dart) => dart.v > 0 && dart.mult === 1 && dart.v !== 25),
      doubles: count((dart) => dart.v > 0 && dart.mult === 2 && dart.v !== 25),
      triples: count((dart) => dart.v > 0 && dart.mult === 3 && dart.v !== 25),
      bulls: count((dart) => dart.v === 25 && dart.mult === 1),
      dbulls: count((dart) => dart.v === 25 && dart.mult === 2),
      misses: count((dart) => dart.v === 0),
    };
  });
}

export function buildCapitalTeamStats(teams: CapitalTeam[], playerStats: any[]) {
  return (teams || []).map((team, index) => {
    const members = playerStats.filter((player) => (team.players || []).map(String).includes(String(player.id || player.playerId)));
    return {
      ...team,
      teamIndex: index,
      score: members.reduce((sum, player) => sum + Number(player.finalCapital || 0), 0),
      capital: members.reduce((sum, player) => sum + Number(player.finalCapital || 0), 0),
      pointsWon: members.reduce((sum, player) => sum + Number(player.pointsWon || 0), 0),
      capitalLost: members.reduce((sum, player) => sum + Number(player.capitalLost || 0), 0),
      successfulContracts: members.reduce((sum, player) => sum + Number(player.successfulContracts || 0), 0),
      failedContracts: members.reduce((sum, player) => sum + Number(player.failedContracts || 0), 0),
      members,
    };
  });
}

export function rankCapitalPlayers(playerStats: any[], winnerIds: string[] = []) {
  const winners = new Set(winnerIds.map(String));
  return [...(playerStats || [])]
    .sort((a, b) => Number(b.finalCapital || 0) - Number(a.finalCapital || 0) || Number(b.pointsWon || 0) - Number(a.pointsWon || 0))
    .map((player, index) => ({ ...player, rank: index + 1, position: index + 1, isWinner: winners.has(String(player.id || player.playerId)) }));
}

