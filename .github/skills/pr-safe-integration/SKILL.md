---
name: pr-safe-integration
description: "Use before merging a MULTISPORTS SCORING branch or synchronizing GitHub, StackBlitz and a developer computer."
---

# Compétence pr-safe-integration

**Objectif métier :** Livrer des modifications cohérentes, sans écraser le travail ni produire des versions divergentes.

**Autorisation maximale :** Analyser diffs, SHAs, PR et checks ; préparer un plan d'intégration pour approbation humaine.

**Interdictions :** Ne jamais force-push, merger, déployer, copier un ZIP sur main, signer un build, réécrire une version précédente ni publier sans accord.

## Procédure obligatoire
1. Capturer le SHA du main cible et de la branche ; vérifier l'actualité de la base.
2. Lister fichiers changés et chevauchements avec PR parallèles.
3. Vérifier vérifications QA, audit, test baseline et procédure de rollback.
4. Contrôler version des sources GitHub/StackBlitz/PC ; préparer pull/fetch selon l'état réel.
5. Soumettre un rapport prêt/bloqué et attendre l'accord explicite avant intégration.

## Preuves exigées avant de conclure
- Toutes les PR annoncées ont des critères et des tests traçables.
- Aucun conflit ni régression grave connu ; réconciliation avant livraison.
- Une procédure rollback et une autorisation explicite avant merge/deploy.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
