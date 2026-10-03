# Challenge Online — Cloudflare D1 + R2 V1

## Objectif

Le classement Challenge ne doit plus dépendre de PostgreSQL/Supabase pour les données lourdes.

- **Supabase** : authentification + Organisations/équipes officielles pendant la transition.
- **D1** : une seule ligne légère par joueur / configuration / scope avec son meilleur score.
- **R2 (`USER_DATA_BUCKET`)** : détail complet de la meilleure performance uniquement.
- **IndexedDB / History** : offline, reprise, historique personnel et backfill des anciennes parties.

Le backend est une Pages Function : `/api/challenge/leaderboard`.

## 1. Créer D1

Depuis la racine du projet :

```bash
npx wrangler d1 create multisports-challenge
```

Cloudflare renvoie un `database_id`. Dans **Workers & Pages > multisports-scoring > Settings > Bindings**, ajouter :

- Type : **D1 database**
- Variable : `CHALLENGE_DB`
- Database : `multisports-challenge`

Le bucket R2 existant `USER_DATA_BUCKET -> multisports-user-data` est réutilisé. Aucune seconde facturation/bucket spécifique n'est nécessaire.

## 2. Installer le schéma

```bash
npx wrangler d1 execute multisports-challenge --remote --file=./cloudflare/challenge-leaderboard-d1.sql
```

Puis redéployer Cloudflare Pages.

## 3. Vérification

Après déploiement :

`GET /api/challenge/leaderboard/status`

doit renvoyer `d1Ready: true` et `r2Ready: true`.

## Migration automatique

La migration est progressive et ne nécessite pas de recopier manuellement tous les utilisateurs :

1. Une nouvelle partie terminée est envoyée en priorité vers D1/R2.
2. L'historique local du compte connecté continue de backfiller ses anciennes parties.
3. À la première consultation d'un classement encore vide dans D1, la Pages Function importe une fois le Top Supabase V3 puis crée un marqueur `challenge_migration_marks`.
4. Lorsqu'une ancienne ligne importée est ouverte via **STATS**, son détail Supabase est récupéré une seule fois, copié dans R2, puis la ligne D1 est marquée `available` ou `missing`.
5. Quand D1 est opérationnel, les nouvelles performances n'écrivent plus leurs stats dans Supabase.

## R2

Clés utilisées :

`challenge-online/v1/<scope>/<objective>/<user>/<match>.json`

Seule la meilleure performance du joueur pour ce scope/configuration est conservée par le flux normal.

## Coût / lecture

Le leaderboard lit uniquement l'index D1 grâce à `idx_challenge_best_rank`. Le détail R2 n'est lu que lorsqu'un utilisateur ouvre **STATS**.
