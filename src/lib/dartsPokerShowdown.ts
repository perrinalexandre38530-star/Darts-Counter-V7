import {
  pokerRankLabel,
  type DartsPokerRoundResult,
  type PokerEvaluation,
} from "./gameEngines/dartsPokerEngine";

export type DartsPokerShowdownExplanation = {
  title: string;
  detail: string;
  comparison: string | null;
  tie: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
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

function categoryLabel(evaluation: PokerEvaluation | null | undefined): string {
  if (!evaluation) return "Main non évaluée";
  return CATEGORY_LABELS[evaluation.category] || evaluation.label || "Main";
}

function firstTiebreakDifference(
  winner: PokerEvaluation,
  runner: PokerEvaluation,
): { winner: number; runner: number; index: number } | null {
  const length = Math.max(winner.tiebreak?.length || 0, runner.tiebreak?.length || 0);
  for (let index = 0; index < length; index += 1) {
    const left = Number(winner.tiebreak?.[index] || 0);
    const right = Number(runner.tiebreak?.[index] || 0);
    if (left !== right) return { winner: left, runner: right, index };
  }
  return null;
}

function rankText(value: number): string {
  if (value >= 2 && value <= 14) return pokerRankLabel(value);
  return String(value);
}

export function explainDartsPokerShowdown(
  round: DartsPokerRoundResult | null | undefined,
): DartsPokerShowdownExplanation {
  if (!round?.rows?.length) {
    return {
      title: "Showdown",
      detail: "Aucune main validée.",
      comparison: null,
      tie: false,
    };
  }

  const winners = round.rows.filter((row) => row.win);
  if (winners.length > 1) {
    const label = winners[0]?.evaluation?.label || categoryLabel(winners[0]?.evaluation);
    return {
      title: "Égalité parfaite",
      detail: `${winners.length} joueurs terminent avec exactement le même score poker : ${label}.`,
      comparison: "Le point de victoire est attribué à chacun des joueurs à égalité.",
      tie: true,
    };
  }

  const winner = winners[0] || [...round.rows].sort((a, b) => a.rank - b.rank)[0];
  const runner = [...round.rows]
    .filter((row) => row.playerId !== winner?.playerId)
    .sort((a, b) => a.rank - b.rank)[0];

  if (!winner || !runner) {
    return {
      title: winner?.evaluation?.label || "Main gagnante",
      detail: "Cette main remporte la manche.",
      comparison: null,
      tie: false,
    };
  }

  const winnerCategory = Number(winner.evaluation?.categoryRank || 0);
  const runnerCategory = Number(runner.evaluation?.categoryRank || 0);

  if (winnerCategory > runnerCategory) {
    return {
      title: winner.evaluation.label,
      detail: `${categoryLabel(winner.evaluation)} bat ${categoryLabel(runner.evaluation)}.`,
      comparison: `${winner.evaluation.label} > ${runner.evaluation.label}`,
      tie: false,
    };
  }

  const difference = firstTiebreakDifference(winner.evaluation, runner.evaluation);
  if (difference) {
    return {
      title: winner.evaluation.label,
      detail: `Même catégorie de main : le départage se fait sur la première valeur poker différente.`,
      comparison: `${rankText(difference.winner)} bat ${rankText(difference.runner)} au départage.`,
      tie: false,
    };
  }

  return {
    title: winner.evaluation.label,
    detail: "La main gagnante possède le meilleur score poker calculé.",
    comparison: `${winner.evaluation.label} > ${runner.evaluation.label}`,
    tie: false,
  };
}

export function getDartsPokerRoundPoints(row: DartsPokerRoundResult["rows"][number]) {
  const winPoints = row.win ? 1 : 0;
  const contractPoints = row.contractCompleted ? Number(row.contractBonus || 1) : 0;
  const total = Number(row.pointsAwarded ?? (winPoints + contractPoints));
  return { winPoints, contractPoints, total };
}

export function getDartsPokerBestFiveIds(row: DartsPokerRoundResult["rows"][number]): Set<string> {
  return new Set((row.bestFive || []).map((card) => String(card?.id || "")));
}
