/** Présentation du Mexicain, dérivée de l'état du moteur (aucune règle modifiée).
 * Garder les libellés CLASSIQUE / MEXICO / MARIACHI / FIESTA cohérents dans
 * l'écran de jeu et le bilan de fin, y compris après restauration Historique V4.
 */
export function mexicainVariantName(modeOptions: Record<string, any> | null | undefined): string {
  if (modeOptions?.mariachiEnabled === 'yes') {
    return (modeOptions?.mariachiMode === 'fiesta' || modeOptions?.mariachiRotation === 'families') ? 'FIESTA' : 'MARIACHI';
  }
  return modeOptions?.targetMode === 'mexico' ? 'MEXICO' : 'LE MEXICAIN';
}

/** Aucune élimination n'est décidée avant la dernière volée de la RONDA.
 * Les places annoncées pendant la saisie sont donc uniquement provisoires.
 */
export function mexicainLiveRoundStatus(state: any, playerId: string): string {
  const id = String(playerId);
  if (state?.eliminated?.[id]) return 'ÉLIMINÉ';
  const roundScores = state?.special?.mexicainRoundScores || {};
  if (roundScores[id] == null) return 'EN ATTENTE';
  const living = (state?.players || []).filter((p: any) => !state?.eliminated?.[p.id]);
  const scores = living
    .filter((p: any) => roundScores[p.id] != null)
    .map((p: any) => Number(roundScores[p.id]));
  if (scores.length < 2) return 'PTS VALIDÉS';
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (Number(roundScores[id]) === min && min < max) return 'DERNIER PROVISOIRE';
  if (min === max) return 'ÉGALITÉ PROVISOIRE';
  return 'PTS VALIDÉS';
}
