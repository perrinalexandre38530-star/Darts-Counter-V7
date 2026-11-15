# PRÉSIDENT — V8 — depuis Darts-Counter-V7(118).zip

## Installation
Extraire les deux fichiers `src/...` dans le projet basé sur V7(118), en conservant l'arborescence. Ne pas appliquer ce patch sur une autre base sans vérifier les différences.

## Modifications
- `src/lib/gameEngines/presidentEngine.ts` : les événements de poses réussies enregistrent `playedSuits`, la véritable enseigne de chaque carte retirée de la main. Le clonage d'état préserve ces enseignes pour l'annulation.
- `src/pages/PresidentPlay.tsx` : archive visuelle des plis groupée par manche et numéro, accessible depuis le tapis et la fenêtre « Table / Pli » ; avatar, combinaisons posées, PASS, progression de chaque pli. Les anciens événements sans enseignes sont montrés par leur rang seul. Classement de fin de manche : pictogrammes différenciés pour les rôles, légende d'échanges.

## Contrôles
- Transpilation syntaxique TypeScript des deux fichiers : OK.
- 25 parties simulées de 4 joueurs : 1 928 combinaisons jouées et 100 échanges, sans perte d'enseigne pour les actions validées : OK.
- Tests en navigateur et Android : non réalisés.

Le patch ne contient que les 2 fichiers modifiés et cette notice. Aucun fichier des autres modes n'est inclus.
