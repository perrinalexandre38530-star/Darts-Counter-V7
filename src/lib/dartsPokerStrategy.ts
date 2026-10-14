import {
  evaluateBestPokerHand,
  isDartsPokerContractCompleted,
  pokerCardLabel,
  pokerRankLabel,
  pokerSuitSymbol,
  type DartsPokerRoundContract,
  type DartsPokerState,
  type PokerCard,
  type PokerEvaluation,
} from "./gameEngines/dartsPokerEngine";

export type DartsPokerMarketTier = "priority" | "strong" | "useful" | "neutral";

export type DartsPokerMarketStrategyItem = {
  sector: number;
  card: PokerCard;
  score: number;
  tier: DartsPokerMarketTier;
  tierLabel: "PRIORITÉ" | "BONNE" | "UTILE" | "FAIBLE";
  tierSymbol: "★" | "↑" | "+" | "·";
  tag: string;
  reason: string;
  contractMatch: boolean;
  contractProgress: boolean;
  contractProgressWeight: number;
  categoryGain: number;
  scoreImproves: boolean;
  futureCategoryRank: number;
  sameRankBefore: number;
  pairsBefore: number;
  pairsAfter: number;
  suitBefore: number;
  suitAfter: number;
  straightBefore: number;
  straightAfter: number;
};

export type DartsPokerMarketStrategySummary = {
  total: number;
  priority: number;
  strong: number;
  useful: number;
  neutral: number;
  improving: number;
  contractOuts: number;
  premiumOuts: number;
  rankOuts: number;
  suitOuts: number;
  label: "TRÈS OUVERT" | "FAVORABLE" | "SERRÉ" | "FERMÉ";
  tone: "green" | "blue" | "gold" | "red";
  description: string;
};

const STRAIGHT_WINDOWS: number[][] = [
  [14, 2, 3, 4, 5],
  [2, 3, 4, 5, 6],
  [3, 4, 5, 6, 7],
  [4, 5, 6, 7, 8],
  [5, 6, 7, 8, 9],
  [6, 7, 8, 9, 10],
  [7, 8, 9, 10, 11],
  [8, 9, 10, 11, 12],
  [9, 10, 11, 12, 13],
  [10, 11, 12, 13, 14],
];

const CATEGORY_SHORT: Record<string, string> = {
  high_card: "CARTE HAUTE",
  pair: "PAIRE",
  two_pair: "DOUBLE PAIRE",
  three_of_a_kind: "BRELAN",
  straight: "SUITE",
  flush: "COULEUR",
  full_house: "FULL",
  four_of_a_kind: "CARRÉ",
  straight_flush: "QUINTE FLUSH",
  royal_flush: "ROYALE",
};

function cleanCards(cards: PokerCard[] = []): PokerCard[] {
  return cards.filter((card) => card && !card.joker && Number.isFinite(Number(card.rank)));
}

function jokerCount(cards: PokerCard[] = []): number {
  return cards.some((card) => Boolean(card?.joker)) ? 1 : 0;
}

function countRanks(cards: PokerCard[] = []): Map<number, number> {
  const map = new Map<number, number>();
  cleanCards(cards).forEach((card) => map.set(card.rank, (map.get(card.rank) || 0) + 1));
  return map;
}

function countSuits(cards: PokerCard[] = []): Map<string, number> {
  const map = new Map<string, number>();
  cleanCards(cards).forEach((card) => map.set(String(card.suit), (map.get(String(card.suit)) || 0) + 1));
  return map;
}

function pairCount(cards: PokerCard[] = []): number {
  return [...countRanks(cards).values()].filter((value) => value >= 2).length;
}

export function dartsPokerStraightPotential(cards: PokerCard[] = []): number {
  const ranks = new Set(cleanCards(cards).map((card) => Number(card.rank)));
  const joker = jokerCount(cards);
  let best = 0;
  for (const window of STRAIGHT_WINDOWS) {
    const present = window.reduce((sum, rank) => sum + (ranks.has(rank) ? 1 : 0), 0);
    best = Math.max(best, Math.min(5, present + joker));
  }
  return best;
}

function bestSuitPotential(cards: PokerCard[] = [], suit?: string | null): number {
  const suits = countSuits(cards);
  const joker = jokerCount(cards);
  if (suit) return Math.min(5, (suits.get(String(suit)) || 0) + joker);
  return Math.min(5, Math.max(0, ...suits.values()) + joker);
}

function contractProgressWeight(
  contract: DartsPokerRoundContract | null | undefined,
  beforeCards: PokerCard[],
  afterCards: PokerCard[],
  card: PokerCard,
): number {
  if (!contract || contract.key === "joker") return 0;

  const beforeRanks = countRanks(beforeCards);
  const afterRanks = countRanks(afterCards);
  const sameRankBefore = beforeRanks.get(Number(card.rank)) || 0;
  const pairsBefore = pairCount(beforeCards);
  const pairsAfter = pairCount(afterCards);
  const straightBefore = dartsPokerStraightPotential(beforeCards);
  const straightAfter = dartsPokerStraightPotential(afterCards);
  const suitBefore = bestSuitPotential(beforeCards, card.suit);
  const suitAfter = bestSuitPotential(afterCards, card.suit);
  const maxAfterRank = Math.max(0, ...afterRanks.values());

  if (contract.key === "pair") return sameRankBefore >= 1 ? 3 : 0;
  if (contract.key === "two_pair") {
    if (pairsAfter >= 2 && pairsAfter > pairsBefore) return 3;
    return sameRankBefore >= 1 ? 2 : 0;
  }
  if (contract.key === "three_of_a_kind") {
    if (sameRankBefore >= 2) return 3;
    return sameRankBefore >= 1 ? 2 : 0;
  }
  if (contract.key === "straight") {
    if (straightAfter >= 4 && straightAfter > straightBefore) return 3;
    return straightAfter > straightBefore ? 1 : 0;
  }
  if (contract.key === "flush") {
    if (suitAfter >= 4 && suitAfter > suitBefore) return 3;
    if (suitAfter >= 3 && suitAfter > suitBefore) return 2;
    return suitAfter > suitBefore ? 1 : 0;
  }
  if (contract.key === "full_house") {
    if (maxAfterRank >= 3 && pairsAfter >= 1) return 3;
    if (sameRankBefore >= 2 || pairsAfter >= 2) return 2;
    return sameRankBefore >= 1 ? 1 : 0;
  }
  return 0;
}

function tierMeta(tier: DartsPokerMarketTier) {
  if (tier === "priority") return { tierLabel: "PRIORITÉ" as const, tierSymbol: "★" as const };
  if (tier === "strong") return { tierLabel: "BONNE" as const, tierSymbol: "↑" as const };
  if (tier === "useful") return { tierLabel: "UTILE" as const, tierSymbol: "+" as const };
  return { tierLabel: "FAIBLE" as const, tierSymbol: "·" as const };
}

function categoryShort(evaluation: PokerEvaluation | null | undefined): string {
  return evaluation ? CATEGORY_SHORT[evaluation.category] || evaluation.label.toUpperCase() : "";
}

function buildReason(input: {
  contract: DartsPokerRoundContract | null | undefined;
  contractMatch: boolean;
  contractProgress: boolean;
  currentEval: PokerEvaluation | null;
  futureEval: PokerEvaluation | null;
  categoryGain: number;
  card: PokerCard;
  sameRankBefore: number;
  pairsBefore: number;
  pairsAfter: number;
  suitAfter: number;
  straightAfter: number;
  straightProgress: boolean;
}) {
  const {
    contract, contractMatch, contractProgress, currentEval, futureEval, categoryGain, card,
    sameRankBefore, pairsBefore, pairsAfter, suitAfter, straightAfter, straightProgress,
  } = input;

  if (contractMatch && contract) {
    return `Valide immédiatement le contrat « ${contract.label} »${futureEval ? ` avec ${futureEval.label}` : ""}.`;
  }
  if (currentEval && futureEval && categoryGain > 0) {
    return `Améliore directement ta combinaison : ${currentEval.label} → ${futureEval.label}.`;
  }
  if (!currentEval && futureEval && Number(futureEval.categoryRank || 0) >= 4) {
    return `Complète immédiatement une main forte : ${futureEval.label}.`;
  }
  if (sameRankBefore >= 3) return `Complète un carré de ${pokerRankLabel(card.rank)}.`;
  if (sameRankBefore >= 2) return `Complète un brelan de ${pokerRankLabel(card.rank)}.`;
  if (pairsAfter > pairsBefore && pairsAfter >= 2) return `Crée une double paire avec les ${pokerRankLabel(card.rank)}.`;
  if (sameRankBefore >= 1) return `Crée ou renforce une paire de ${pokerRankLabel(card.rank)}.`;
  if (suitAfter >= 4) return `Place ${suitAfter}/5 cartes potentielles en ${pokerSuitSymbol(card.suit)} pour viser une couleur.`;
  if (straightAfter >= 4 && straightProgress) return `Place ${straightAfter}/5 rangs utiles pour construire une suite.`;
  if (contractProgress && contract) return `Rapproche directement le contrat « ${contract.label} ».`;
  if (straightAfter >= 3 && straightProgress) return `Ajoute un rang connecté : une suite devient plus accessible.`;
  if (suitAfter >= 3) return `Renforce la couleur ${pokerSuitSymbol(card.suit)} avec ${suitAfter}/5 cartes potentielles.`;
  if (Number(card.rank || 0) >= 11) return `${pokerCardLabel(card)} est une haute carte utile comme kicker et pour la valeur de la main.`;
  return `${pokerCardLabel(card)} apporte peu de synergie immédiate avec la main actuelle.`;
}

export function buildDartsPokerMarketStrategy(
  state: DartsPokerState,
  playerId: string,
): DartsPokerMarketStrategyItem[] {
  const hand = state?.handsByPlayer?.[playerId] || ({ cards: [] } as any);
  const currentCards: PokerCard[] = Array.isArray(hand?.cards) ? hand.cards : [];
  const currentEval = evaluateBestPokerHand(currentCards);
  const currentCategoryRank = Number(currentEval?.categoryRank ?? -1);
  const currentScore = Number(currentEval?.score || 0);
  const beforeRanks = countRanks(currentCards);
  const pairsBefore = pairCount(currentCards);
  const straightBefore = dartsPokerStraightPotential(currentCards);
  const contract = state?.roundContract || null;

  const rows: DartsPokerMarketStrategyItem[] = [];

  for (let sector = 1; sector <= 20; sector += 1) {
    const card = state?.market?.[sector];
    if (!card) continue;

    const futureCards = [...currentCards, card];
    const futureEval = evaluateBestPokerHand(futureCards);
    const futureCategoryRank = Number(futureEval?.categoryRank ?? -1);
    const categoryGain = currentEval && futureEval ? futureCategoryRank - currentCategoryRank : 0;
    const scoreImproves = Boolean(currentEval && futureEval && Number(futureEval.score || 0) > currentScore);

    const sameRankBefore = beforeRanks.get(Number(card.rank)) || 0;
    const pairsAfter = pairCount(futureCards);
    const suitBefore = bestSuitPotential(currentCards, card.suit);
    const suitAfter = bestSuitPotential(futureCards, card.suit);
    const straightAfter = dartsPokerStraightPotential(futureCards);
    const straightProgress = straightAfter > straightBefore;
    const contractMatch = Boolean(
      contract &&
      futureEval &&
      isDartsPokerContractCompleted(contract, futureEval, futureCards)
    );
    const contractProgressWeightValue = contractProgressWeight(contract, currentCards, futureCards, card);
    const contractProgress = contractProgressWeightValue > 0;

    const createsPair = sameRankBefore >= 1;
    const createsTrips = sameRankBefore >= 2;
    const createsQuad = sameRankBefore >= 3;
    const createsTwoPair = pairsAfter > pairsBefore && pairsAfter >= 2;
    const flushNear = suitAfter >= 4 && suitAfter > suitBefore;
    const straightNear = straightAfter >= 4 && straightProgress;
    const highCard = Number(card.rank || 0) >= 11;

    let tier: DartsPokerMarketTier = "neutral";
    if (
      contractMatch ||
      createsQuad ||
      (currentEval && categoryGain > 0) ||
      (!currentEval && futureEval && futureCategoryRank >= 4)
    ) {
      tier = "priority";
    } else if (
      createsTrips ||
      createsTwoPair ||
      flushNear ||
      straightNear ||
      contractProgressWeightValue >= 3
    ) {
      tier = "strong";
    } else if (
      scoreImproves ||
      createsPair ||
      contractProgress ||
      suitAfter >= 3 ||
      (straightProgress && straightAfter >= 3) ||
      highCard
    ) {
      tier = "useful";
    }

    const tierRank = tier === "priority" ? 4 : tier === "strong" ? 3 : tier === "useful" ? 2 : 1;
    const tag = contractMatch
      ? "CONTRAT ✓"
      : currentEval && futureEval && categoryGain > 0
        ? categoryShort(futureEval)
        : !currentEval && futureEval && futureCategoryRank >= 1
          ? categoryShort(futureEval)
          : createsQuad
            ? "CARRÉ"
            : createsTrips
              ? "BRELAN"
              : createsTwoPair
                ? "DOUBLE PAIRE"
                : createsPair
                  ? "PAIRE"
                  : flushNear
                    ? "COULEUR EN VUE"
                    : straightNear
                      ? "SUITE EN VUE"
                      : contractProgress
                        ? "AIDE CONTRAT"
                        : highCard
                          ? "HAUTE CARTE"
                          : "OPTION";

    const score =
      tierRank * 1_000_000_000 +
      (contractMatch ? 800_000_000 : 0) +
      Math.max(0, categoryGain) * 180_000_000 +
      contractProgressWeightValue * 35_000_000 +
      (createsQuad ? 80_000_000 : createsTrips ? 60_000_000 : createsTwoPair ? 50_000_000 : createsPair ? 25_000_000 : 0) +
      (flushNear ? 35_000_000 : suitAfter >= 3 ? 12_000_000 : 0) +
      (straightNear ? 32_000_000 : straightProgress ? 10_000_000 : 0) +
      Math.max(0, futureCategoryRank) * 2_000_000 +
      Number(card.rank || 0) * 10_000 -
      sector;

    rows.push({
      sector,
      card,
      score,
      tier,
      ...tierMeta(tier),
      tag,
      reason: buildReason({
        contract,
        contractMatch,
        contractProgress,
        currentEval,
        futureEval,
        categoryGain,
        card,
        sameRankBefore,
        pairsBefore,
        pairsAfter,
        suitAfter,
        straightAfter,
        straightProgress,
      }),
      contractMatch,
      contractProgress,
      contractProgressWeight: contractProgressWeightValue,
      categoryGain,
      scoreImproves,
      futureCategoryRank,
      sameRankBefore,
      pairsBefore,
      pairsAfter,
      suitBefore,
      suitAfter,
      straightBefore,
      straightAfter,
    });
  }

  return rows.sort((a, b) => b.score - a.score || a.sector - b.sector);
}

export function summarizeDartsPokerMarketStrategy(
  strategy: DartsPokerMarketStrategyItem[] = [],
): DartsPokerMarketStrategySummary {
  const total = strategy.length;
  const priority = strategy.filter((row) => row.tier === "priority").length;
  const strong = strategy.filter((row) => row.tier === "strong").length;
  const useful = strategy.filter((row) => row.tier === "useful").length;
  const neutral = strategy.filter((row) => row.tier === "neutral").length;
  const improving = priority + strong;
  const contractOuts = strategy.filter((row) => row.contractMatch).length;
  const premiumOuts = strategy.filter((row) => row.futureCategoryRank >= 5).length;
  const rankOuts = strategy.filter((row) => row.sameRankBefore > 0).length;
  const suitOuts = strategy.filter((row) => row.suitAfter >= 4 && row.suitAfter > row.suitBefore).length;

  const ratio = total ? improving / total : 0;
  const label: DartsPokerMarketStrategySummary["label"] =
    ratio >= .45 ? "TRÈS OUVERT" :
      ratio >= .25 ? "FAVORABLE" :
        ratio >= .10 ? "SERRÉ" : "FERMÉ";
  const tone: DartsPokerMarketStrategySummary["tone"] =
    ratio >= .45 ? "green" :
      ratio >= .25 ? "blue" :
        ratio >= .10 ? "gold" : "red";

  const description = contractOuts > 0
    ? `${contractOuts} cible${contractOuts > 1 ? "s" : ""} valident immédiatement le contrat.`
    : priority > 0
      ? `${priority} cible${priority > 1 ? "s" : ""} améliorent fortement la main dès maintenant.`
      : strong > 0
        ? `${strong} bonne${strong > 1 ? "s" : ""} cible${strong > 1 ? "s" : ""} renforcent nettement la construction.`
        : useful > 0
          ? `${useful} cible${useful > 1 ? "s" : ""} restent utiles, mais aucune amélioration majeure n'est visible.`
          : "Aucune synergie évidente : privilégie un secteur que tu maîtrises et cherche les pouvoirs.";

  return {
    total, priority, strong, useful, neutral, improving, contractOuts,
    premiumOuts, rankOuts, suitOuts, label, tone, description,
  };
}
