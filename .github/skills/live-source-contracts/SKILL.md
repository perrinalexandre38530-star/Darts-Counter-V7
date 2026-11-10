---
name: live-source-contracts
description: "Use when working on live sports feeds, schedules, standings, sports results, caching or competitions hierarchy."
---

# Compétence live-source-contracts

**Objectif métier :** Assurer exactitude, traçabilité, fraîcheur et clarté des données sportives.

**Autorisation maximale :** Modifier uniquement le périmètre LIVE/ONLINE désigné.

**Interdictions :** Ne pas contourner CGU, anti-bot, licences, paywalls, ni inventer résultats ou logos ; ne pas déclencher source payante sans accord.

## Procédure obligatoire
1. Documenter licence et disponibilité de chaque fournisseur avant intégration.
2. Normaliser compétition monde/continent/pays, statut match, date/fuseau, rang et manches.
3. Tester doublons, données partielles, reports, calendrier, cache et réseau hors ligne.
4. Afficher l'origine des résultats quand nécessaire et différencier données officielles et agrégées.
5. Vérifier lisibilité des calendriers, phases finales, classements et archives.

## Preuves exigées avant de conclure
- npm run test:online-v2
- npm run test:nearby si concerné
- npm run build
- Cas fuseaux, compétitions multiples, records périmés et provenance testés.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
