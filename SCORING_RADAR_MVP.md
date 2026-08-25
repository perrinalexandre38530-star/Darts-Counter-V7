# SCORING RADAR — intégré à cette base

Le service autonome est dans `scoring-radar/`. Il ne modifie aucun moteur de jeu.

Commandes depuis la racine :

```bash
npm run test:scoring-radar
npm run radar:install
npm run radar:typecheck
npm run radar:dev
npm run radar:deploy
```

Avant déploiement, suivre `scoring-radar/README.md` pour créer D1, les Queues, renseigner le `database_id`, puis ajouter `BRAVE_SEARCH_API_KEY` et `RADAR_ADMIN_TOKEN` avec Wrangler Secrets.

Destination officielle configurée : `https://multisports-scoring.pages.dev/`.

Dashboard après déploiement : `https://<worker-host>/admin`.
