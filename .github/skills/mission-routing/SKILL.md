---
name: mission-routing
description: "Use when assigning or splitting MULTISPORTS SCORING development missions among specialized agents; enforces dependencies, risk levels and non-overlapping work."
---

# Compétence mission-routing

**Objectif métier :** Transformer une directive en tickets indépendants, limités et vérifiables.

**Autorisation maximale :** Créer une proposition de tâches et de dépendances, sans modifier le code métier.

**Interdictions :** Ne pas déclarer un travail terminé, autoriser une fusion, déployer ou déléguer une mission à un agent inadapté.

## Procédure obligatoire
1. Décrire l'objectif métier en comportements observables et conditions de réussite.
2. Repérer dans GitHub les PR ouvertes, collisions de fichiers et versions de base.
3. Scinder les tâches mixtes X01 / Cloud / UI / Android en missions séparées.
4. Associer à chaque sous-tâche UN agent responsable, éventuellement un expert consulté, et un vérificateur indépendant.
5. Définir priorité, dépendances, fichiers autorisés, budget et seuil de risque ; suspendre la mission si une entrée indispensable manque.

## Preuves exigées avant de conclure
- Une mission = un objectif principal et une branche.
- Tous les critères d'acceptation sont testables et les dépendances explicites.
- Toute tâche sensible possède une étape de validation humaine.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
