# MSS — Centre d'entraînement — Vague 9 (base V7(134))

Ce patch différentiel se pose **sur Darts-Counter-V7(134).zip uniquement**. Il ne réintroduit pas les anciennes versions V129/V111, et ne remplace aucun moteur de Challenge, de sauvegarde ou d'Historique.

## Nouveautés

1. **Brouillons à l'interruption et à la rotation** : la séance Training Lab individuelle enregistre son état lors du passage en arrière-plan (`visibilitychange`), du départ de page (`pagehide`) et d'un changement d'orientation (`orientationchange`). Il s'agit d'une sécurité supplémentaire aux sauvegardes après chaque volée déjà existantes.
2. **Chronomètre Training Lab personnalisé** : arrêt de la décrémentation lorsque l'application est masquée, reprise du temps restant au retour ; checkpoint toutes les 5 secondes pour limiter les pertes si Android coupe brutalement le processus. Le chrono reste volontairement en pause pendant l'interruption.
3. **Bilan Awena actionnable** : sélection d'un **véritable exercice déjà présent** dans le catalogue Training selon la famille (scoring, doubles, checkout, précision, bull, régularité) ; en cas de données non mesurées, le conseil privilégie la saisie individuelle des impacts. Un résultat réussi et mesuré propose une confirmation du même exercice.
4. **Lancement direct** du correctif depuis le bilan : nouvelle séance Training privée du profil courant, propre configuration, sans écraser le résultat terminé ni quitter l'écran Training. Les programmes et certifications ne sont pas détournés de leur parcours par ce bouton.
5. **Bouton compact et responsive** dans le panneau du bilan, sans impacter le clavier.

## Fichiers (6 sources + 1 test + notice)

- `src/training/profile/trainingCorrectiveRoute.ts` (nouveau)
- `src/training/profile/trainingExerciseDraft.ts` (inchangé ; utilisé pour la reprise)
- `src/training/ui/TrainingResultModal.tsx`
- `src/training/modes/lab/TrainingLabPlay.tsx`
- `src/training/modes/lab/TrainingCustomExercisePlay.tsx`
- `src/pages/TrainingModePage.tsx`
- `src/training/ui/trainingResponsive.css`
- `tools/test-training-v134-wave9.mjs` (nouveau)

> `trainingExerciseDraft.ts` est **inchangé** et n'est pas inclus dans l'archive.

## Vérifications exécutées

- `npm run typecheck` : **OK** (global V134).
- `node tools/test-training-v134-wave9.mjs` : **OK** ; routage, réels IDs du catalogue, séparation par profil, sauvegardes et reprise, syntaxe TSX.
- `node --experimental-strip-types tools/test-training-v129-wave8.mjs` : **OK**.
- 9 autres suites ciblées Training (`v269`, `v216`, `v259`, `v267`, `v268`, `v265`, `v266`, `v264`, `v262`) : **OK**.
- `npm run build` : contrôles prébuild, Cloud personnels, verrou History V4 et synchronisation cloud : **OK**. Étape finale `vite build` **non exécutée**, car `vite` est absent de cet environnement (`sh: vite: not found`).

## Installation et test réel

Extraire les fichiers du ZIP à la racine de **V7(134)** ; ne pas réappliquer les anciens patches après. Puis sur le PC :

```bash
npm install
npm run typecheck
node tools/test-training-v134-wave9.mjs
npm run build
```

Sur Android : démarrer un exercice chronométré, enregistrer quelques fléchettes, basculer vers une autre application, revenir et vérifier le chrono ; tourner l'écran, quitter et reprendre le brouillon dans le Centre ; terminer une séance et tester le bouton d'exercice correctif d'Awena. Ce contrôle sur appareil physique **n'a pas été réalisé** ici.
