# PATCH CARGO — UI FINALISÉE V2

Base de référence : `Darts-Counter-V7 (72).zip`

Ce patch remplace directement `src/pages/CargoPlay.tsx` et inclut la refonte d'aération précédente.

## Objectif visuel
Aligner l'écran de jeu CARGO sur le niveau de finition déjà utilisé dans les modes LOTERIE, DARTS FIREFIGHTER et TERRITORIES : hiérarchie plus nette, cartes premium, avatar en watermark, accents lumineux maîtrisés, header ticker cohérent et keypad proche du langage visuel commun de l'application.

## Changements principaux
- Header CARGO remis au format des modes finalisés : ticker 92 px, marges latérales et respiration homogènes.
- Carte joueur entièrement retravaillée : avatar principal, grand watermark d'avatar, nom, variante, tour, série et score mieux hiérarchisés.
- Ajout d'une vraie tuile thématique `CHARGEMENT / LIVRAISON` à droite de la carte joueur avec icône camion, pourcentage de remplissage et progression sur l'objectif.
- Objectif actuel placé dans un bandeau inférieur clair avec compteur de fléchettes `x/3`.
- Barre `MANIFESTE / CLASSEMENT / STATS / JOURNAL` transformée en 4 cartes compactes de même famille visuelle que les KPI/actions des modes finalisés.
- Le keypad CARGO reste spécifique au mode afin de ne toucher à aucun autre jeu, mais reprend désormais le langage visuel du keypad commun :
  - 3 aperçus de fléchettes sur fond sombre ;
  - boutons DOUBLE / TRIPLE colorés ;
  - ANNULER en or ;
  - touches 0–20 sobres et régulières ;
  - BULL vert ;
  - score central ;
  - VALIDER en or sur la même rangée finale.
- Suppression du gros bouton SIMPLE : le mode SIMPLE redevient l'état par défaut comme dans les modes finalisés.
- DOUBLE/TRIPLE sont désormais appliqués à la prochaine fléchette puis le multiplicateur revient automatiquement à SIMPLE.
- Responsive ajusté pour écrans courts et grands écrans afin de conserver de l'air sans écraser le contenu.
- Saisie via dartboard harmonisée avec la même ligne finale ANNULER / SCORE / VALIDER.

## Portée
- Fichier modifié : `src/pages/CargoPlay.tsx`
- Moteur CARGO, sauvegarde, historique, statistiques, contrats et overlays fonctionnels non modifiés.

## Vérifications effectuées
- `npm run typecheck` : OK
- `npm run test:cargo` : OK
- `npm run build` : non exécutable dans cet environnement car le binaire Vite n'est pas présent dans les dépendances embarquées de l'archive de travail (`vite: not found`).
