# Patch V73 — Callback OAuth rapide et écran de progression

Base stricte : `Darts-Counter-V7(73).zip`.

## Objectif

Supprimer les attentes OAuth de plusieurs minutes et remplacer l'ancien écran noir minimal par un écran MULTISPORTS SCORING lisible.

## Changements

- Logo officiel `public/app-512.png` affiché sur le callback.
- Barre de progression et pourcentage par étapes réelles du callback.
- Affichage du provider en cours quand il est connu.
- `exchangeCodeForSession()` borné à 7,5 s.
- `setSession()` borné à 5 s.
- `getSession()` borné à 2,5 s.
- Watchdog global : 11 s maximum sur l'écran de finalisation.
- Utilisation immédiate de la session retournée par `exchangeCodeForSession()` : suppression d'un aller-retour `getSession()` inutile sur le chemin normal.
- Fenêtre `onAuthStateChange` de secours limitée à 1,8 s.
- Aucune restauration NAS/R2/sauvegarde dans le callback OAuth.
- En cas d'échec : message explicite + bouton de nouvelle tentative au lieu d'un spinner infini.

## Contrôles

- TypeScript `tsc --noEmit` : OK.
- Social Auth : 48/48.
- PKCE resilience : 11/11.
- Reconnexion après logout : 10/10.
- Callback rapide V73 : 8/8.
