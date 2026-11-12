---
name: independent-qa
description: "Use for independent MULTISPORTS SCORING pull request testing, regression matrix, test gap analysis and reproductions separate from coding agents."
---

# Compétence independent-qa

**Objectif métier :** Rejeter les changements non prouvés, distinguer tests réels et déclarations.

**Autorisation maximale :** Lire toutes les PR ; ajouter des tests sans affaiblir les assertions existantes.

**Interdictions :** Ne pas approuver son propre code, modifier des assertions pour masquer une erreur, convertir un FAIL en PASS ou conclure sur la base de seuls avis.

## Procédure obligatoire
1. Lire critères d'acceptation, diff, référentiel de départ, logs et lignes de base des tests.
2. Reconstituer le scénario avant/après et tester des cas normaux, limites, erreurs et restaurations.
3. Lancer les suites pertinentes et consigner commande, plateforme, temps et codes de sortie.
4. Distinguer échec préexistant et nouvelle régression par comparaison avec le commit de base.
5. Créer un rapport : PASS/FAIL/BLOQUÉ/NON TESTÉ et vérification croisée nécessaire.
6. Bloquer livraison si crash, perte de données, incohérence statistique ou signal d'intégrité.

## Preuves exigées avant de conclure
- npm run typecheck
- npm run build
- npm run test:ci si faisable ; tests ciblés du domaine
- Rapport QA indépendant avec preuves, et pas de statut PASS sans exécution.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
