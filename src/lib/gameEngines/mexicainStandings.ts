/**
 * LE MEXICAIN — reconstruction déterministe du classement après chaque manche.
 * Le classement de survie dépend des vies restantes AVANT les points cumulés.
 * Recalculé exclusivement depuis mexicainHistory : aucune statistique fictive.
 */
export type MexicainStanding = {
  playerId: string;
  rank: number;
  lives: number;
  totalPoints: number;
  roundPoints: number;
  eliminated: boolean;
};

export type MexicainRoundStanding = { round: number; target: number | null; standings: MexicainStanding[] };

export function buildMexicainRoundStandings(
  players: Array<{ id: string }>,
  history: Array<{ round?: number; target?: number; scores?: Array<{ id: string; score: number }>; losers?: string[]; lifeLoss?: number }>,
  initialLives: number,
): MexicainRoundStanding[] {
  const orderedIds = players.map(p => String(p.id));
  const startingLives = Math.max(0, Number(initialLives) || 0);
  const remaining = new Map(orderedIds.map(id => [id, startingLives]));
  const totals = new Map(orderedIds.map(id => [id, 0]));
  return history.map((entry, index) => {
    const scores = new Map((entry.scores || []).map(s => [String(s.id), Number(s.score) || 0]));
    for (const id of orderedIds) totals.set(id, (totals.get(id) || 0) + (scores.get(id) || 0));
    for (const loserId of entry.losers || []) {
      const id = String(loserId);
      if (remaining.has(id)) remaining.set(id, Math.max(0, (remaining.get(id) || 0) - Math.max(0, Number(entry.lifeLoss) || 0)));
    }
    const standings = orderedIds.map((id, order) => ({
      playerId: id, order, lives: remaining.get(id) || 0,
      totalPoints: totals.get(id) || 0, roundPoints: scores.get(id) || 0,
    })).sort((a, b) => b.lives - a.lives || b.totalPoints - a.totalPoints || a.order - b.order)
      .map(({ order, ...s }, rank) => ({ ...s, rank: rank + 1, eliminated: s.lives === 0 }));
    return { round: Number(entry.round) || index + 1, target: entry.target == null ? null : Number(entry.target), standings };
  });
}
