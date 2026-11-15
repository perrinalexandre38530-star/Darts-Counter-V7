# MULTISPORTS SCORING — Centre d'entraînement — Vague 8

**Base exacte : `Darts-Counter-V7(129).zip`**. Décompresser ce ZIP différentiel **à la racine de V7(129)**. Ne pas réappliquer les ZIP précédents.

## Contenu

- Interface commune `TrainingPlayLayout` / `trainingResponsive.css` : réserve de hauteur pour le clavier en portrait, protection des zones de saisie et des panneaux en paysage, prise en compte des encoches et zones de sécurité Android.
- `TrainingResultModal` : correction technique Awena en fin de séance, texte accessible et lecture **à la demande** via le moteur vocal Awena déjà existant. Aucun démarrage automatique de micro/voix.
- `trainingTechnicalCoaching.ts` : conseils calculés à partir des résultats existants, sans appels réseau ni écriture dans l'Historique.
- `TrainingLabPlay`, `TrainingCustomExercisePlay` : protection des statistiques pour les saisies score-volée (y compris les séances mixtes). Aucun taux global inventé à partir d'une précision partielle.
- `ChallengesPlay` : libellé de l'exercice transmis au conseil et taux de touches seulement sur saisie fléchette par fléchette.
- `TrainingDartPad` : accessibilité `aria-expanded` pour le sélecteur et repli sur le clavier lorsque la reconnaissance vocale est indisponible.

## Contrôles exécutés sur cette base

- `npm run typecheck` : **OK**.
- `node --experimental-strip-types tools/test-training-v129-wave8.mjs` : **OK**.
- `node tools/test-training-v216-responsive-contract.mjs` : **OK**.
- `node tools/test-training-v269-active-play.mjs` : **OK**.
- Tests `test-training-session-details-v268`, `test-training-skill-trend-v265`, `test-training-daily-summary-v263`, `test-training-private-session-cards-v267`, `test-training-daily-review-v264`, `test-training-daily-queue-v262` : **OK**.
- `node --experimental-strip-types tools/test-challenge-exercises-v48.ts` : **OK**.

**Non exécutés :** compilation Vite de production et essais UI sur appareil Android réel (différentes résolutions, rotation, encoches, saisie caméra/appareils externes). Ils restent impératifs avant publication. Le patch ne prétend pas régler les interfaces propres au moteur Challenge compétitif, distinctes de `TrainingPlayLayout`.

## Installation

1. Extraire **uniquement** les fichiers du patch dans le dossier de V7(129) en conservant les chemins.
2. Exécuter `npm run typecheck`, puis `npm run build` sur le poste de développement équipé des dépendances.
3. Vérifier sur Android un téléphone étroit portrait, un téléphone paysage (hauteur <= 420px), les modes clavier / cible / score volée, et l'ouverture des bilans.

Aucun changement de moteurs de règles, de calcul de score, d'Historique V4, de sauvegardes NAS/Cloud ou de schéma SQL.
