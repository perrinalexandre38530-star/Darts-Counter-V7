# DARTS FIREFIGHTER — Implémentation V1

## Positionnement

DARTS FIREFIGHTER est un mode coopératif original de MULTISPORTS SCORING. Il reprend la cartographie de TERRITORIES mais utilise un moteur autonome : les joueurs constituent une brigade et doivent maîtriser des foyers qui grandissent et se propagent entre les territoires.

## Boucle de jeu

- Une carte contient 12, 16 ou 20 territoires actifs, chacun associé à un secteur unique de 1 à 20.
- Chaque territoire peut être sain, protégé, enfumé, en feu de niveau 1 à 3 ou détruit.
- Un simple applique 1 unité d'eau, un double 2 et un triple 3.
- Le surplus d'eau devient une protection qui peut bloquer une future propagation.
- Le Bull déclenche un appui aérien ciblé.
- Le Double Bull déclenche un Canadair sur le territoire sélectionné et son voisinage.
- À la fin des volées, le feu grandit, produit de la fumée et se propage selon le vent et la difficulté.
- La brigade gagne quand tous les incidents sont supprimés. Elle perd à la limite de rounds, à la perte d'une zone critique ou au seuil de destruction prévu par la difficulté.

## Difficultés

- **Recrue** : croissance lente, prévision claire et protections durables.
- **Pompier** : rythme standard.
- **Commandant** : vent et propagation plus agressifs.
- **Enfer** : plusieurs fronts, destruction rapide et tolérance minimale.

## Parcours intégré

1. Carte DARTS FIREFIGHTER dans le menu Games avec ticker 800 × 230.
2. Configuration complète : joueurs, bots, sets de fléchettes, carte, difficulté, foyers, zones critiques, vent, prévision, Canadair, règle MISS et méthode de saisie.
3. Partie : carte interactive, ciblage, jauge de brigade, vent, prévision, journal, KPIs, bots, annulation et remise à zéro.
4. Sauvegarde automatique d'une intervention en cours après chaque volée.
5. Reprise depuis l'Historique avec restauration de la carte, du tour, du vent, des protections, des foyers et de la télémétrie.
6. Écran de fin en quatre onglets : mission, brigade, carte finale et chronologie.
7. Carte Historique enrichie et page de résumé détaillée.
8. Onglet de statistiques dédié dans le centre de statistiques.
9. Raccordement aux stats HOME, au normaliseur global, à l'index History, au codec compact et au tri d'utilisation des profils.

## Télémétrie enregistrée

Chaque fléchette conserve son segment, son secteur, son libellé, sa volée, son round et les événements qu'elle a déclenchés. Les statistiques comprennent notamment :

- fléchettes, touches, MISS, simples, doubles, triples, Bulls et Double Bulls ;
- eau appliquée et niveaux de feu supprimés ;
- fumées dissipées, feux éteints et protections posées ;
- propagations bloquées ;
- Canadairs ;
- score, meilleur score de volée, séries et volées parfaites ;
- territoires détruits, incidents restants et état final de chaque territoire ;
- contributions individuelles de chaque membre de la brigade.

## Principaux fichiers ajoutés

- `src/lib/gameEngines/dartsFirefighterEngine.ts`
- `src/pages/DartsFirefighterConfig.tsx`
- `src/pages/DartsFirefighterPlay.tsx`
- `src/pages/DartsFirefighterEnd.tsx`
- `src/pages/StatsDartsFirefighter.tsx`
- `src/lib/dartsFirefighterStats.ts`
- `src/assets/tickers/ticker_darts_firefighter.png`
- `tools/test-darts-firefighter-regression.ts`
- `tools/test-darts-firefighter-integration.mjs`

## Contrôles effectués

- `npm run typecheck` : validé.
- Test de régression du moteur : validé.
- Vérification des règles critiques : secteurs uniques, extinction par triple, protection par surplus, Canadair, MISS immédiat, prévision et statuts cartographiques.
- La compilation Vite n'a pas pu être exécutée dans l'environnement de génération, car les dépendances du projet n'étaient pas présentes et le registre npm interne n'a pas fourni `zustand`. Ce blocage est externe aux sources ; le contrôle TypeScript complet passe.
