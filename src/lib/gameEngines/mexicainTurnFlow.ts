/**
 * LE MEXICAIN : le résultat d'un bot est déjà visible dans le tableau RONDA.
 * Il ne doit jamais verrouiller la saisie du joueur humain suivant.
 * Les autres jeux Wave61 gardent leur récapitulatif avec CONTINUER.
 */
export function shouldShowWave61VisitRecap(modeId: string): boolean {
  return modeId !== "mexicain";
}

export function isWave61VisitRecapBlocking(modeId: string, recap: unknown, pending: unknown): boolean {
  return shouldShowWave61VisitRecap(modeId) && Boolean(recap || pending);
}

/** Répare également les parties du Mexicain déjà coincées dans Historique V4. */
export function releaseMexicainPendingBotRecap<T extends { modeId: string; special?: Record<string, any> }>(state: T): T {
  if (state.modeId !== "mexicain" || !state.special?.pendingBotVisitRecap) return state;
  const special = { ...state.special };
  delete special.pendingBotVisitRecap;
  return { ...state, special };
}
