# PATCH FIT PERF — AWENA 3D MOTION V72

## Objectif
Remplacer la silhouette placeholder par une représentation beaucoup plus fidèle d'AWENA, en gardant une architecture légère et modulaire.

## Ce patch fait
- améliore le renderer `FitAwenaMotionStage` avec une **AWENA beaucoup plus reconnaissable** ;
- ajoute une tenue sport noire à liserés néon, une coiffure ponytail, des gants et chaussures pour rappeler l'identité visuelle ;
- conserve les **18 exercices animés** déjà couverts ;
- affiche une **consigne de mouvement** (POUSSE, TIRE, CONTRÔLE, etc.) selon la phase de la boucle ;
- prépare le composant `FitExerciseMotion` à accepter plus tard des **médias 3D réels par exercice** (`image` ou `video`) via `MEDIA_OVERRIDES`.

## Fichiers modifiés
- `src/pages/fit/FitAwenaMotionStage.tsx`
- `src/pages/fit/FitExerciseMotion.tsx`

## Étape suivante recommandée
Introduire progressivement de vrais assets par exercice dans `MEDIA_OVERRIDES` (par exemple `webm` ou `mp4` en boucle, muets, `playsInline`) sans toucher au reste de l'interface.
