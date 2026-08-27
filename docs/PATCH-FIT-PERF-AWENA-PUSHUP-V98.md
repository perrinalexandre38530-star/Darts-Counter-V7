# PATCH FIT PERF — AWENA PUSH UP WEBM V98

Base de référence : **Darts-Counter-V7(97).zip**.

## Modifications
- ajoute `public/fit/motions/awena/premium/pushup/motion.webm` ;
- ajoute le poster local du Push Up ;
- déclare le slot premium `pushup` dans `awenaPremiumMotions.ts` ;
- prépare le slot `burpee` pour la prochaine animation ;
- mappe `Push Up`, `Push Ups`, `Pushup`, `Pushups` vers `motionKey=pushup` ;
- mappe `Burpee/Burpees` vers `motionKey=burpee` ;
- `FitExerciseMotion` résout désormais le média premium via `exercise.motionKey || exercise.id`, afin que les exercices Free Exercise DB réutilisent le média AWENA correspondant ;
- incrémente le cache catalogue Free Exercise DB afin que les nouveaux `motionKey` soient recalculés ;
- ajoute les assertions de non-régression correspondantes.

## Média Push Up
- WebM VP9 local ;
- audio supprimé ;
- 512x288 ;
- 15 fps ;
- environ 157 Ko.

Aucune autre logique de V97 n'est remplacée.
