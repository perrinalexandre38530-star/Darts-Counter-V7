---
name: x01-history-stats
description: "Use when working on X01 match history, profile identity, 301 SO, 501 DO, AVG3D, dashboards or statistics consistency."
---

# Compétence x01-history-stats

**Objectif métier :** Assurer l'unicité des parties et la cohérence des statistiques dérivées de History V4.

**Autorisation maximale :** Analyse et patch sur copies de fixtures anonymisées, sans migration destructive.

**Interdictions :** Ne jamais changer l'historique source en fonction d'une statistique attendue, fusionner des identités sans preuve, inventer des manches gagnées ou reconstruire depuis une vue tronquée.

## Procédure obligatoire
1. Identifier la version d'historique et l'origine des données, conserver un original immuable et son empreinte.
2. Documenter identités profil/alias, IDs, parties et modes ; ne pas confondre 301 SO et 501 DO.
3. Calculer résultats X01 à partir des sets gagnés et legs gagnés par set, jamais du score restant sur la dernière manche.
4. Vérifier AVG3D profil étoilé sur les dix dernières parties 501 DO et variantes SO/DO/MO selon les règles validées.
5. Comparer History, Home, Dashboard, StatHub et X01Multi sur le même corpus ; signaler écarts justifiés/non justifiés.
6. Tester non-régression historique ancien, profils doublons, partie incomplète/corrompue et reprise de partie.

## Preuves exigées avant de conclure
- npm run test:x01v3
- npm run test:history-integrity
- npm run test:legacy-backup-stats-realignment
- npm run test:stats-backup-architecture-lock
- Aucun changement non tracé sur historiques ; mêmes comptes et AVG sur les vues concernées.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
