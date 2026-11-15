# PRÉSIDENT V13 — base Darts-Counter-V7(142).zip

Copier les deux fichiers dans le projet en respectant les chemins :
- src/pages/PresidentPlay.tsx
- src/lib/gameEngines/presidentEngine.ts

Changements : suivi visuel des 3 fléchettes (touché / hors cible / à lancer), bilan du dernier coup effectivement enregistré (cartes retirées ou conservées), correction du compteur cardsAfter lorsque la main arrive à zéro. Les données sont lues dans l’historique réel du moteur, sans modifier les règles ni les autres modes.

Vérifications : syntaxe TSX/TS via transpilation TypeScript et intégrité ZIP. Tests complets PC/Android non exécutés.
