/**
 * Décision déterministe d'une manche BO/FT Wave61.
 * Séparée de React pour tester les séries réelles, y compris après restauration JSON.
 */
export type Wave61SeriesDecisionInput = {
  format: string;
  teamMode: boolean;
  teamByPlayer?: Record<string, string>;
  winnerId?: string | null;
  winnerTeamId?: string | null;
  previousWins?: Record<string, number>;
  gameIndex?: number;
};

export function decideWave61SeriesLeg(input: Wave61SeriesDecisionInput) {
  const format = String(input.format || "single").trim().toLowerCase();
  const amount = Math.max(1, Math.min(99, Number(format.replace(/\D/g, "")) || 1));
  const winsTo = format.startsWith("bo") ? Math.floor(amount / 2) + 1
    : format.startsWith("ft") ? amount : 1;
  const winnerId = String(input.winnerId || "");
  // L'équipe peut être déduite de sa composition lorsque le moteur ne fournit
  // que l'ID du joueur gagnant (notamment dans les vieilles sauvegardes).
  const winnerTeamId = input.teamMode
    ? String(input.winnerTeamId || input.teamByPlayer?.[winnerId] || "")
    : "";
  const winnerKey = input.teamMode ? (winnerTeamId ? `team:${winnerTeamId}` : "") : winnerId;
  const wins: Record<string, number> = { ...(input.previousWins || {}) };
  const completedGameIndex = Math.max(1, Math.floor(Number(input.gameIndex) || 1));
  if (winnerKey) wins[winnerKey] = Math.max(0, Number(wins[winnerKey]) || 0) + 1;
  return {
    winnerKey,
    winnerTeamId: winnerTeamId || null,
    wins,
    winsTo,
    completedGameIndex,
    nextGameIndex: completedGameIndex + 1,
    // Pas de gagnant identifiable : ne jamais déclencher une intermission
    // infinie où CONTINUER conduirait vers une série impossible à achever.
    matchWon: !winnerKey || Number(wins[winnerKey] || 0) >= winsTo,
  };
}
