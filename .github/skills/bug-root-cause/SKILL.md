---
name: bug-root-cause
description: "Use when diagnosing crashes, slowdowns, ReferenceError, bad renders or regressions in MULTISPORTS SCORING and preparing a minimal safe patch."
---

# Compétence bug-root-cause

**Objectif métier :** Prouver la cause d'un bug puis réaliser le plus petit correctif possible.

**Autorisation maximale :** Modifier les fichiers indispensables au bug et ajouter un test de non-régression.

**Interdictions :** Ne pas supprimer des données, masquer les erreurs, neutraliser des fonctionnalités ni modifier toute une architecture pour un bug local.

## Procédure obligatoire
1. Obtenir la reproduction précise : version, plateforme, navigateur/appareil, étapes, avant/après.
2. Établir un échec reproductible sur la branche de base, en notant les autres échecs préexistants.
3. Localiser la cause avec traces, dépendances et analyse d'états plutôt qu'une hypothèse non prouvée.
4. Créer un test qui échoue avant correctif si possible, puis modifier le minimum de code.
5. Relancer le test ciblé ET les tests connexes ; vérifier absence de nouvelles boucles, freeze ou erreurs.

## Preuves exigées avant de conclure
- npm run typecheck
- npm run build
- Test de non-régression vert ou limitation explicitée
- Diff réduit et preuve de cause racine.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
