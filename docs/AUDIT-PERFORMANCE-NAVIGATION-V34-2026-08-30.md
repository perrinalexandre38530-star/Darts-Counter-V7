# Rebase audit performance navigation — V34 — 30/08/2026

Base de référence : `Darts-Counter-V7(34).zip`.

Le patch performance initial V19 a été réappliqué par fusion ciblée sur la V34. Aucun fichier complet V19 n'a remplacé son équivalent V34 : les évolutions récentes (notamment FIT PERF, ESPORTS, authentification, audio/Awena et navigation) sont conservées.

## Corrections réappliquées

- code-splitting massif des pages de `App.tsx` avec `React.lazy()` ;
- tunnel d'authentification + `GameSelect` conservés en chargement immédiat ;
- préchargement idle des écrans de navigation courants, hors gameplay ;
- préchauffage statistiques limité à une fois par profil hors vraie mise à jour d'historique ;
- interruption du préchauffage si une route PLAY devient active ;
- `MutationObserver` de traduction désactivé pour la navigation normale en français et batché par frame dans les autres langues ;
- moteur lourd Awena (Core/Knowledge/LiveScreen/Records) chargé à la demande, en conservant les commandes musique présentes en V34 ;
- marqueur `data-msc-navigating` pendant les deux premières frames d'une transition ;
- pause temporaire des animations décoratives pendant la transition et suppression du fond fixe coûteux sur mobile ;
- garde-fou `npm run test:navigation-performance` ajouté à la CI.

## État du code-splitting V34

Après rebase, `App.tsx` conserve seulement 6 imports de pages statiques et 193 pages lazy.
