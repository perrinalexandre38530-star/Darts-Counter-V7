# E-SPORTS HUB V0.4 · Competitive Network

Base de référence : `Darts-Counter-V7(38).zip`.

## Ajouts

- Candidatures LFG persistantes avec accepter / refuser / retirer.
- Décrément automatique des places LFG lorsqu'une candidature est acceptée.
- Clans avec vrais membres et rôles `OWNER`, `CAPTAIN`, `OFFICER`, `MEMBER`.
- Demandes d'adhésion et invitations de clan.
- Notifications E-SPORTS temps réel.
- File de matchmaking par jeu, plateforme, mode, région, taille d'équipe et rang déclaré.
- Remise en file automatique du partenaire si un match trouvé est abandonné.
- Saison `E-SPORTS PRESEASON 2026` et leaderboard `Community XP` calculé côté serveur.
- Community XP V0.4 : LFG accepté +10, clan rejoint +5, match trouvé +8.

## Important

Le leaderboard V0.4 mesure l'activité communautaire, pas encore le niveau compétitif. Un futur classement de skill devra reposer sur des résultats confirmés / fiables afin d'éviter un classement facilement falsifiable.

## Backend

Appliquer après la migration V0.3 :

`supabase/migrations/20260830231400_esports_competitive_network_v4.sql`

Sans cette migration, les fonctions V0.1 à V0.3 restent disponibles ; l'interface V0.4 affiche que la migration réseau est requise.

## Android

E-SPORTS reste masqué par défaut dans la whitelist Android Store V1. Aucun changement de politique de publication dans cette V0.4.
