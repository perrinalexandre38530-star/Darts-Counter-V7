import { shoveRuleSet, shoveTargets } from './shoveAPennyTargets';

/** Conseils contextuels calculés à chaque saisie, sans service externe ni fausse prédiction IA. */
export function buildShoveAdvice(state: any, playerId: string, projectedMarks: Record<string, number>, darts: readonly {v:number;mult:number}[] = []): string {
  const rule = shoveRuleSet(state?.config?.modeOptions?.ruleSet);
  const required = Math.max(2, Number(state?.config?.modeOptions?.marksPerBox || 3));
  const targets = shoveTargets(rule);
  const marks = projectedMarks || state?.special?.shoveMarksByPlayer?.[playerId] || {};
  const stats = state?.statsByPlayer?.[playerId] || {};
  const accuracy = Number(stats.darts || 0) > 0 ? Number(stats.hits || 0) / Number(stats.darts || 1) : 0;
  const remaining = targets.filter((n) => Number(marks[String(n)] || 0) < required);
  const opponents = (state?.players || []).filter((p:any) => String(p.id) !== String(playerId) && !state?.eliminated?.[p.id]);
  const endMode = String(state?.config?.modeOptions?.endMode || 'first_finish');
  const finishNote = endMode === 'full_ranking' ? 'La partie se poursuit jusqu’au dernier joueur.'
    : endMode === 'fixed_rounds' ? `Il reste ${Math.max(0, Number(state?.config?.rounds || 60) - Number(state?.roundIndex || 0))} tour(s) maximum.`
    : 'La première fermeture complète remporte la partie.';
  if (!remaining.length) return `Toutes les cases sont fermées. ${finishNote}`;
  const focus = rule === 'electronic' ? remaining[0] : [...remaining].sort((a,b)=>Number(marks[String(b)]||0)-Number(marks[String(a)]||0))[0];
  const need = Math.max(1, required - Number(marks[String(focus)] || 0));
  const opponentDanger = opponents.some((p:any) => targets.filter(n=>Number(state?.special?.shoveMarksByPlayer?.[p.id]?.[String(n)]||0)<required).length<=2);
  const last = darts.length ? darts[darts.length - 1] : null;
  if (last && Number(last.v) === 0) return `MISS sur la dernière fléchette. Sur ${focus === 25 ? 'BULL' : focus}, il reste ${need} marque(s) ; sécurise un simple avant de tenter plus risqué.`;
  if (last && Number(last.v) > 0) {
    const just = Number(last.v);
    if (targets.includes(just) && Number(marks[String(just)] || 0) >= required) {
      return remaining.length ? `Tu viens de fermer le ${just === 25 ? 'BULL' : just}. Passe sur ${focus === 25 ? 'BULL' : focus} : ${need} marque(s) à obtenir.` : `Bravo, tu as tout fermé ! ${finishNote}`;
    }
    if (targets.includes(just)) return `Tu as désormais ${Number(marks[String(just)]||0)}/${required} marque(s) sur ${just === 25 ? 'BULL' : just}. Il t’en manque ${Math.max(0,required-Number(marks[String(just)]||0))} sur cette case.`;
  }
  if (need === 1) return `Sur le ${focus === 25 ? 'BULL' : focus}, une seule marque manque : vise un SIMPLE pour fermer proprement et éviter d’offrir des surplus. ${opponentDanger?'Attention, un adversaire approche de la victoire.':''}`;
  if (accuracy > .65 && need === 3) return `Ta précision est bonne (${Math.round(accuracy*100)} %). Un TRIPLE ${focus === 25 ? 'BULL' : focus} peut fermer la case d’un coup, mais assure ton lancer. ${finishNote}`;
  if (accuracy < .35 && Number(stats.darts||0) >= 6) return `Privilégie le SIMPLE ${focus === 25 ? 'BULL' : focus} : avec ${Math.round(accuracy*100)} % de touches, la régularité fera progresser ton tableau.`;
  if (opponentDanger) return `Surveille les surplus : un adversaire est presque au bout. Priorité au ${focus === 25 ? 'BULL' : focus} (${need} marque(s) à trouver).`;
  return `Priorité au ${focus === 25 ? 'BULL' : focus} : il te manque ${need} marque(s). ${rule === 'traditional'?'Tu peux changer librement de case entre deux fléchettes.':'L’ordre des secteurs est obligatoire.'} ${finishNote}`;
}
