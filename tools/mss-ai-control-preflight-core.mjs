/** MSS AI CONTROL V2 — deterministic planning, no git mutations. */
import { assessMain } from './mss-main-guard-core.mjs';

export function evaluatePreflight({ branch, localSha, remoteSha, dirty, statusKnown = true, gitKnown = true }) {
  if (!gitKnown) return { ok: false, checks: false, errors: ['Git natif indisponible : exécuter le contrôle sur le PC (VS Code) ; ne pas interpréter git status de StackBlitz comme une preuve de commit.'], actions: ['Vérifier le commit de StackBlitz dans son interface GitHub.'], branch, localSha, remoteSha };
  const verdict = assessMain({ branch, localSha, remoteSha, dirty: dirty || !statusKnown });
  const errors = [...verdict.errors];
  const actions = [];
  if (!statusKnown) errors.push('Impossible de déterminer les modifications locales.');
  if (branch !== 'main') actions.push('Ne pas changer de branche automatiquement : vérifier le dossier ouvert.');
  if (!localSha || !remoteSha) actions.push('Contrôler la connexion GitHub puis relancer cette commande sur le PC.');
  else if (localSha !== remoteSha) actions.push('Si le dossier est propre et main est seulement en retard : git pull --ff-only origin main (sur le PC).');
  if (dirty) actions.push('Sauvegarder les modifications locales dans un ZIP avant toute mise à jour ; ne pas utiliser git reset --hard.');
  return { ok: errors.length === 0, checks: errors.length === 0, errors, actions, branch, localSha, remoteSha };
}

export function qaVerdict(preflight, results) {
  if (!preflight.ok) return { status: 'BLOQUÉ', tests: [], errors: preflight.errors };
  const failures = results.filter(r => r.exitCode !== 0 || r.error);
  return { status: failures.length ? 'FAIL' : 'PASS', tests: results, errors: failures.map(r => `${r.name} : ${r.error || 'code ' + r.exitCode}`) };
}
