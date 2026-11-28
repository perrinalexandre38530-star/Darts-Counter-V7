# MSS CRICKET — HIDDEN KEYPAD + BACKDOT

Source : Darts-Counter-V7(23).zip

Fichiers modifiés :
- src/pages/CricketPlay.tsx
- src/pages/EnglishCricketPlay.tsx

## HIDDEN CRICKET
- Keypad intégral compact : secteurs 1 à 20 disposés en 7 colonnes, sans scroll vertical inutile lié à 20 touches sur 3 colonnes.
- Conservation des multiplicateurs SIMPLE / DOUBLE / TRIPLE, BULL25 / BULL50 et MISS.
- Aucun objectif secret n'est révélé par les intitulés de touches ; le tableau des marques garde ses '?' jusqu'à la découverte.
- Aucun changement apporté aux règles de scoring ou au tirage des cibles cachées.

## BACKDOT
- CRICKET standard et variantes de la famille : remplace les flèches de la page Play qui ouvraient la fin de partie par le composant BackDot MSS. Retour au configurateur via handleQuitInternal.
- TACTICS, MICKEY MOUSE et WILD MOUSE : BackDot sur le header Play étendu.
- ENGLISH CRICKET : BackDot dans le ticker, retour Play -> configuration, puis configuration -> GAMES.
- SCRAM dispose déjà du vrai composant BackDot dans V7(23) : non modifié.

Contrôles : transpilation syntaxique TSX réussie avec TypeScript ; archive vérifiée. Essai manuel StackBlitz/téléphone encore nécessaire.
