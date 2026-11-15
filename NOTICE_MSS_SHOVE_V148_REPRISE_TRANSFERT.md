# MULTISPORTS SCORING — SHOVE A PENNY V148

**Base requise : `Darts-Counter-V7(100).zip` transmis dans cette conversation.**
Ce ZIP est un correctif différentiel, non une application complète. Extraire à la racine du projet en conservant les dossiers.

## Objectif
Stabiliser le contrat de reprise et le classement de SHOVE A PENNY après un transfert de l'Historique V4 entre PC et Android, sans changer l'interface validée ni les règles de jeu.

## Corrections
1. Reprise History V4 : après lecture de l'enregistrement complet, vérifier que le moteur Wave61, la phase, les joueurs, le joueur actif, les marques et au moins une volée sont exploitables. Une archive incomplète n'est plus ouverte comme une partie vierge sous son ancien identifiant : l'historique n'est pas supprimé.
2. Repli de récupération : si `resume.state` est corrompu mais `payload.stateSnapshot` ou `decoded.stateSnapshot` est valide, utiliser le checkpoint sain, sa configuration et **ses propres fléchettes brouillon**.
3. Identité de match : refuser un checkpoint dont `startedAt` contredit le `createdAt` enregistré (lorsqu'ils sont tous deux disponibles).
4. Rapport SHOVE : lorsque l'ordre réel de fermeture `summary.shoveAPenny.finishOrder` existe, il passe avant un classement générique incomplet ou périmé. Les IDs inconnus ne créent pas de joueurs fantômes. En l'absence de cet ordre, le classement sauvegardé reste la source de référence.

## Tests
- `npm run test:shove:integrity` : suites V136/V140/V145/V146/V147 et nouveaux tests V148.
- `node --experimental-strip-types tools/test-shove-v148-resume-transfer-guard.mjs`
- `node --experimental-strip-types tools/test-shove-v148-archive-finish-order.mjs`
- Contrôle syntaxique des fichiers TypeScript/TSX modifiés.

## Limites des validations
Les tests de transfert sont **des sérialisations JSON en environnement local**. Aucun accès réel NAS/Cloud n'a été utilisé. La synchronisation PC ↔ Android, les exports natifs PDF/PNG, le partage Android et le rendu sur téléphone **ne sont pas validés** par ces tests.

## Essais manuels recommandés avant publication
1. Lancer une partie SHOVE, enregistrer une volée, quitter et reprendre sur le même appareil.
2. Sauvegarder l'Historique V4, restaurer sur un second appareil et reprendre le match : même joueur actif et mêmes marques.
3. Terminer les deux variantes 1–9 et 15–BULL ; comparer le classement affiché, l'Historique et le PDF/PNG.
4. Essayer la sauvegarde incomplète (sur un appareil de test seulement) : le message de refus doit préserver la ligne d'historique.
5. Vérifier les exports/partages depuis Android et le retour NAS/Cloud.
