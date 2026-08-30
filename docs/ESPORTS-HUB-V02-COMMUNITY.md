# E-SPORTS HUB V0.2 — Community layer

## Objectif
Faire évoluer le socle V0.1 vers une couche communautaire gaming sans dépendre encore des API de chaque éditeur de jeu.

## Réutilisation du social MULTISPORTS SCORING
La V0.2 ne crée pas un second graphe social. Elle réutilise directement les briques déjà existantes :
- amis et recherche de joueurs (`friendsApi`),
- présence Online,
- messages privés pour les invitations,
- `online_messages` / `chatApi` pour le chat d'un salon.

## Salons Online
Un salon E-SPORTS Online peut maintenant :
- copier son code,
- charger les amis du compte,
- envoyer une invitation privée contenant `roomCode`, `gameId`, `formatLabel` et `bestOf`,
- afficher et envoyer les messages du salon en temps réel.

## Communauté
L'ancien tab Profil devient **Communauté** avec quatre vues internes :
1. Profil gamer et identifiants de plateformes,
2. Amis / présence / recherche de joueurs,
3. Équipes & clans persistants,
4. LFG (Looking For Group) local-first.

Le LFG est volontairement stocké localement en V0.2. Le modèle est prêt pour une future table/RPC publique afin d'éviter de bloquer cette itération sur une migration backend.

## Tournois
Les brackets ne sont plus seulement visuels :
- saisie du score directement dans chaque rencontre,
- interdiction du nul pour un match de tournoi,
- propagation automatique du vainqueur,
- gestion correcte des BYE pour un nombre non puissance de deux,
- détection du champion,
- historique de match généré depuis les résultats de tournoi,
- classement Round Robin (P/W/L/diff/points).

## Migration
Le state passe à `version: 2`, mais conserve la clé `ms-esports-hub-v1` afin de migrer sans perdre les salons, matchs, tournois et préférences V0.1.

## Android public
Aucun changement : `esports` reste absent de `ANDROID_STORE_V1_SPORT_IDS`. La preview Android reste opt-in via `VITE_ENABLE_ESPORTS_ANDROID_PREVIEW=true`.
