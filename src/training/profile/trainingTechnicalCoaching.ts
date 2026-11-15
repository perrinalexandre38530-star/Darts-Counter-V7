/**
 * Conseils factuels de fin de séance : aucune précision n'est déduite d'une
 * volée saisie seulement par son total. Ce module ne modifie ni score ni record.
 */
export type TrainingTechnicalAdvice = {
  title: string;
  observation: string;
  correction: string;
  nextStep: string;
};

export function buildTrainingTechnicalAdvice(input: {
  focus?: string;
  success: boolean;
  darts: number;
  hits: number;
  score: number;
  precisionAvailable?: boolean;
}): TrainingTechnicalAdvice {
  const darts = Math.max(0, Math.floor(Number(input.darts) || 0));
  const score = Math.max(0, Number(input.score) || 0);
  const hits = Math.max(0, Math.min(darts, Math.floor(Number(input.hits) || 0)));
  const focus = String(input.focus || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const doubles = /double|checkout|finish|sortie|d[1-9]\b/.test(focus);
  const bull = /bull|centre/.test(focus);
  const scoring = /score|501|301|triple|t20/.test(focus);

  if (darts === 0) {
    return { title: 'Reprendre les bases', observation: 'Aucune fléchette enregistrée pour cette séance.',
      correction: 'Démarre par une volée de trois fléchettes, en gardant le même repère de visée.',
      nextStep: 'Rejouer le même objectif avec une saisie validée.' };
  }
  if (!input.precisionAvailable) {
    return { title: 'Mesurer avant de corriger',
      observation: `${darts} fléchette${darts > 1 ? 's' : ''} et ${Math.round(score)} point${score > 1 ? 's' : ''} comptabilisés. La précision par cible n’est pas disponible pour cette saisie.`,
      correction: 'Utilise le clavier fléchette par fléchette ou la cible interactive lors de la prochaine tentative, sans modifier le score actuel.',
      nextStep: 'Comparer ensuite deux essais avec les mêmes règles et le même mode de saisie.' };
  }
  const rate = darts ? hits / darts : 0;
  const pct = Math.round(rate * 100);
  const base = doubles ? 'le double ciblé' : bull ? 'le Bull ciblé' : scoring ? 'le segment visé' : 'la même cible';
  if (rate < 0.35) {
    return { title: 'Précision à stabiliser', observation: `${hits}/${darts} touches validées (${pct} %) sur les fléchettes enregistrées.`,
      correction: `Conserve ${base} pendant trois volées, sans accélérer ton geste. Note chaque impact pour identifier la dérive.`,
      nextStep: 'Refaire le même exercice avant d’augmenter la difficulté.' };
  }
  if (!input.success) {
    return { title: 'Objectif à consolider', observation: `${hits}/${darts} touches validées (${pct} %), mais l’objectif de l’exercice n’est pas encore atteint.`,
      correction: `Concentre-toi sur ${base} lors de deux volées de trois fléchettes. Garde la même position et le même rythme.`,
      nextStep: 'Rejouer l’exercice avec les mêmes paramètres pour comparer.' };
  }
  return { title: 'Objectif atteint : confirmer', observation: `Objectif validé avec ${hits}/${darts} touches (${pct} %).`,
    correction: `Répète deux volées sur ${base} en conservant ton geste actuel. La répétabilité passe avant la vitesse.`,
    nextStep: 'Confirmer le résultat sur une seconde séance de même configuration.' };
}
