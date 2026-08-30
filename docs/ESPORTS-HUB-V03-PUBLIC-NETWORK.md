# E-SPORTS HUB V0.3 — PUBLIC NETWORK

Base de référence : `Darts-Counter-V7(37).zip`.

## Objectif

Faire évoluer E-SPORTS HUB d'un module local/social privé vers une première couche communautaire publique sans dépendre des API éditeurs de jeux.

## Fonctionnalités V0.3

- découverte des salons E-SPORTS Online marqués `public` ;
- invitations E-SPORTS reçues dans la messagerie MULTISPORTS avec bouton **REJOINDRE** ;
- profil gamer public synchronisable : jeux favoris, plateformes, niveaux/rangs, disponibilité et activité ;
- recherche de gamers par pseudo, jeu, plateforme et niveau ;
- LFG mondial : jeu, plateforme, mode, niveau, message, places recherchées ;
- expiration automatique des annonces LFG après 24 h ;
- contact d'un joueur LFG via la demande d'ami MULTISPORTS existante ;
- équipes/clans synchronisés entre appareils et option de visibilité publique ;
- conservation du cache/local-first V0.2 comme secours hors-ligne ;
- activité gaming publiée lors de la création/rejoindre d'un salon et au lancement d'un match ;
- E-SPORTS reste masqué dans Android Store V1.

## Backend Supabase

Appliquer la migration :

`supabase/migrations/20260830_esports_public_network_v3.sql`

Elle crée :

- `ms_esports_profiles`
- `ms_esports_lfg_posts`
- `ms_esports_teams`

avec RLS et RPC authentifiées.

Tant que la migration n'est pas appliquée, l'interface conserve le fonctionnement local et affiche un message indiquant que la synchro publique n'est pas encore disponible.

## Suite prévue

V0.4 : adhésion/invitation réelle aux clans, rôles capitaine/co-capitaine/membre, challenges, files de matchmaking, notifications temps réel et saisons/leaderboards communautaires.
