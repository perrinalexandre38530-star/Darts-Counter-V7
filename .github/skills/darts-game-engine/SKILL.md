---
name: darts-game-engine
description: "Use when implementing or changing MULTISPORTS SCORING darts game modes, dart-hit scoring, round flow, player turns, X01 sets or legs."
---

# Compétence darts-game-engine

**Objectif métier :** Développer une règle de jeu cohérente et déterministe sans modifier les modes voisins.

**Autorisation maximale :** Modifier uniquement les fichiers du mode désigné et ses tests, sur branche de mission.

**Interdictions :** Ne pas modifier History V4, sauvegardes, monétisation, données d'autres modes, ni créer des valeurs par défaut silencieuses.

## Procédure obligatoire
1. Reconstituer les règles exactes du mode : segments, doubles/triples, bull 25/50, MISS, nombre de tours et joueurs.
2. Spécifier sous forme de table transitions de jeu : état avant, touche, état après, score et joueur actif.
3. Couvrir des cas limites : MISS, dart invalid, fin de tour, joueur éliminé, annulation, reprise, ex aequo, session interrompue.
4. Implémenter dans le moteur du mode existant, sans duplication de logique partagée non justifiée.
5. Faire valider l'intégration dans Games/config/play, tickers FR/EN et paysages/portraits quand requis.

## Preuves exigées avant de conclure
- npm run typecheck
- npm run build
- npm run test:regressions (ou test ciblé du mode documenté)
- Scénarios de jeu écrits, résultat de chaque cas vérifié ; aucun mode existant régressé.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
