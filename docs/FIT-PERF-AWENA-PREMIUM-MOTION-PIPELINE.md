# FIT PERF — Pipeline AWENA Premium Motion

## Architecture livrée

`FitExerciseMotion` ne connaît plus les chemins de médias. Il demande simplement si un média premium existe pour l'exercice.

- `src/fit/awenaPremiumMotions.ts` : registre des 18 slots FIT PERF.
- `src/pages/fit/FitPremiumMotionPlayer.tsx` : lecteur vidéo + frames.
- `src/pages/fit/FitAwenaMotionStage.tsx` : fallback procédural conservé.
- `public/fit/motions/awena/premium/` : assets premium.

## Ordre automatique

**VIDEO > FRAMES > AWENA PROCEDURAL > FALLBACK STATIQUE**

Cela permet de remplacer progressivement les mouvements sans réécrire les pages FIT PERF.

## Première vague intégrée

Cinq exercices possèdent déjà une séquence premium de keyframes WebP :

1. Squat
2. Développé couché
3. Soulevé de terre
4. Curl biceps
5. Tractions

Ces keyframes servent à valider toute la chaîne de lecture. Le lecteur accepte déjà des séquences beaucoup plus longues : 12, 16, 24 frames ou davantage.

## Passage en qualité finale

Pour un exercice donné :

1. produire une séquence AWENA parfaitement cohérente sur un canvas identique ;
2. exporter les frames en WebP transparent ;
3. remplacer le contenu du dossier `frames/` ;
4. ajuster `count`, `fps` et éventuellement `order` dans `awenaPremiumMotions.ts` ;
5. ou ajouter `motion.webm` + `motion.mp4` au slot : la vidéo prend alors automatiquement la priorité.

Aucun changement de `FitPerfPlan`, de la bibliothèque d'exercices ou de la navigation n'est nécessaire.

## Performance mobile / PWA

Le lecteur a été conçu pour ne pas lancer 18 animations en parallèle :

- les miniatures `compact` sont statiques ;
- le mouvement détaillé utilise `IntersectionObserver` ;
- l'animation s'arrête quand la page devient invisible ;
- `prefers-reduced-motion` affiche une preview ;
- les frames sont préchargées seulement quand elles sont réellement utiles ;
- la cadence des frames est plafonnée à 30 fps.

## Règle de production recommandée

Pour les vraies séquences finales : **16 à 24 frames**, 12 à 18 fps pour la plupart des mouvements de musculation, avec une micro-pause naturelle à l'étirement et/ou à la contraction si nécessaire. Un WebM final peut ensuite être produit à partir de la même séquence sans modifier l'application.

## Outil d'import fourni

Le projet contient maintenant `tools/build-awena-premium-motion.mjs`. Exemple :

```bash
npm run awena:motion:build -- --exercise squat --input ./incoming/squat --fps 16 --webm
```

Il normalise les frames, produit les WebP, crée le poster et peut générer un WebM VP9 si `ffmpeg` est disponible.
