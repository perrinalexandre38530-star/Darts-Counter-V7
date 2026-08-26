# FIT PERF — V1 avancée visuelle

Module intégré à MULTISPORTS SCORING à partir de Darts-Counter-V7(35).

## Inclus
- Sport FIT PERF dans le sélecteur principal et le switch rapide.
- Logo FIT PERF dédié.
- BottomNav dédiée : Accueil / Séance / Plan / Stats / Profil / Réglages.
- Dashboard avancé : FIT Score, objectif hebdomadaire, volume 7 jours, répartition PUSH/PULL/LEGS, records, historique, synthèse globale.
- Centre de séance : séance libre, Push, Pull, Legs, Full Body.
- Bibliothèque initiale de 18 exercices.
- Saisie individuelle des séries, charges et répétitions.
- Validation série par série.
- Chronomètre de récupération automatique configurable.
- Ajout/suppression d'exercices et de séries pendant la séance.
- Persistance locale des séances.
- Calcul du volume d'entraînement.
- Records automatiques par exercice et estimation 1RM (formule d'Epley).
- Centre de programmes visuel.
- Page Stats FIT PERF avec volume 28 jours, tendance 8 semaines, PR/1RM et historique.

## Vérifications
- `tsc -p tsconfig.json --noEmit` : OK
- `node tools/test-fit-perf-integration.mjs` : OK
- `node tools/test-android-store-v1.mjs` : OK

Note : le build Vite n'a pas été relancé dans l'environnement de génération car le ZIP source ne contient pas `node_modules` et l'installation des dépendances a dépassé la fenêtre d'exécution. Le contrôle TypeScript complet et les tests statiques d'intégration passent.
