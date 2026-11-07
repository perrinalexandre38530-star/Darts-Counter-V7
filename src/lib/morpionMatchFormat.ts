/**
 * Format canonique d'une partie Morpion.
 * Utilisé par l'écran et la restauration History V4 afin qu'un écran rouvert
 * n'applique jamais sa valeur par défaut à la place des règles enregistrées.
 */
export function resolveMorpionFormat(config: unknown): { maxRounds: number; requiredWins: number } {
  const source = config && typeof config === "object" ? config as Record<string, unknown> : {};
  const raw = source.bestOf ?? source.rounds;
  const parsed = Number(raw);
  // Les anciennes parties sans configuration restent à 3 manches.
  const maxRounds = raw === undefined || raw === null || parsed === 0 || !Number.isInteger(parsed)
    ? 3 : Math.max(1, Math.min(25, parsed));
  return { maxRounds, requiredWins: Math.floor(maxRounds / 2) + 1 };
}
