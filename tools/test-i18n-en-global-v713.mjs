import assert from 'node:assert/strict';
import { createUiLiteralTranslator, looksFrenchUiText } from '../src/i18n/uiLiteralSafety.ts';

const tr = createUiLiteralTranslator({}, 'en');
const cases = new Map([
  ['Résumé', 'Summary'],
  ['FIN DU MATCH', 'END OF MATCH'],
  ['Afficher tous les jeux', 'Show all games'],
  ['Afficher seulement', 'Show only'],
  ['Changer la couverture', 'Change cover'],
  ['Nouveau nom du groupe', 'New group name'],
  ['Comparer les stats', 'Compare stats'],
  ['Simuler le tournoi', 'Simulate tournament'],
  ['Les prochains matchs jouables.', 'Next playable matches.'],
  ['Affiner la main', 'Refine hand'],
  ['Valide le showdown', 'Confirm showdown'],
  ['Difficulté IA', 'AI difficulty'],
  ['Équipe A', 'Team A'],
  ['ÉQUIPE B', 'TEAM B'],
  ['Équipe ${index + 1}', 'Team ${index + 1}'],
  ['Nouvelle partie', 'New match'],
  ['Adresse email', 'Email address'],
  ['Score de départ', 'Starting score'],
  ['Meilleur score', 'Best score'],
  ['Aléatoire', 'Random'],
  ['Éliminé', 'Eliminated'],
  ['Réinitialiser', 'Reset'],
  ['Connecté', 'Connected'],
  ['Rafraîchir', 'Refresh'],
  ['Sécurité', 'Safety'],
  ['Récapitulatif', 'Summary'],
  ['Répondre', 'Reply'],
  ['Télécharger', 'Download'],
  ['Match nul', 'Draw'],
  ['Tous matchs', 'All matches'],
  ['Autres jeux', 'Other games'],
  ['Tournoi', 'Tournament'],
  ['Amis', 'Friends'],
  ['Envoyer', 'Send'],
  ['Ouvrir', 'Open'],
  ['Les mots de passe ne correspondent pas.', 'Passwords do not match.'],
  ['Nom de la ligue', 'League name'],
  ['Score restant', 'Remaining score'],
  ['Confirmer le score', 'Confirm score'],
  ['Valide ou corrige le score', 'Confirm or correct the score'],
  ['Nouvelle-Aquitaine', 'Nouvelle-Aquitaine'],
  ['Pétanque', 'Pétanque'],
  ['Mölkky', 'Mölkky'],
]);
const properNames = new Set(['Nouvelle-Aquitaine', 'Pétanque', 'Mölkky']);
for (const [source, expected] of cases) {
  const actual = tr(source);
  assert.equal(actual, expected, `${source} => ${actual}`);
  if (!properNames.has(source)) {
    assert.equal(looksFrenchUiText(actual), false, `French residue after translation: ${source} => ${actual}`);
  }
}
console.log(`[i18n-en] ${cases.size} critical regression cases OK`);
