# MSS LIVE Darts — V254 · archives continues et recherche vérifiable

## Objectif et limites

Ce patch **ne contient aucun score artificiel**. Il prépare un véritable stockage de scores vérifiés, source par source et mois par mois, accessible dans LIVE > Fléchettes > RÉSULTATS. Les résultats ne commencent à affluer **qu'après déploiement des fonctions et configuration d'accès réels**. L'installation du ZIP seule ne démarre pas de collecte. L'exhaustivité mondiale n'est pas garantie : elle dépend du catalogue effectif, des compétitions couvertes, des licences, des quotas et des accords des fournisseurs.

## Modifications (sur Darts-Counter-V7(15).zip)

- `src/sportsLive/dartsArchiveV254.ts` : partitions R2 par année/mois/source (`sports-live-results/v2/darts/YYYY/MM/SOURCE.json`), dédoublonnage par identité, corrections de scores, écritures conditionnelles ETag anti-perte, pagination entre mois et sources, recherche par joueur/compétition/année/pays/niveau/source.
- `functions/api/sports-live/[[path]].ts` : nouvel endpoint POST sécurisé `/api/sports-live/darts/results-sync`, collecte DartsAPI par pages avec curseur de reprise, rattrapage historique, intégration des archives V2 à l'endpoint `results-search`, ajout des imports partenaires autorisés à V2. L'archive V1 et les anciennes API restent compatibles.
- `src/sportsLive/dartsResultsSearch.ts` et `DartsResultsExplorer.tsx` : pagination dédiée V2 + état des archives et des synchronisations dans la page de résultats MSS, sans sur-vendre les sources de l'annuaire.
- `cloudflare/mss-live-darts-sync-worker.mjs` + `wrangler.live-darts-sync.toml` : Worker **distinct** déclenché par deux Cron Triggers UTC : toutes les 6 heures pour les résultats récents, puis 15 min plus tard pour le rattrapage historique.
- `tools/test-live-darts-archive-v254.mjs` et `tools/test-live-darts-sync-route-v254.mjs` : tests hors ligne sur scores factices explicitement marqués comme fixtures.

## Infrastructure à activer (obligatoire)

1. Vérifier que le projet Cloudflare Pages `multisports-scoring` déploie bien **les Pages Functions du dossier `functions/`** avec le ZIP mis à jour. Attention : une simple publication de `dist/` sans Functions peut ne pas activer l'API.
2. Dans les secrets/environnements du projet **Pages**, définir :
   - `DARTS_API_KEY` = clé réelle DartsAPI. Selon les forfaits, les résultats peuvent être différés ou les archives anciennes indisponibles. Le plan *Archive* (ou supérieur) est normalement requis pour l'historique intégral du fournisseur. Il ne couvre pas nécessairement les tournois de toutes les fédérations.
   - `LIVE_OFFICIAL_INGEST_TOKEN` = secret aléatoire robuste, identique à celui du Worker séparé ; ne jamais le placer dans l'application cliente, le ZIP, Git ni les variables publiques Vite.
   - `USER_DATA_BUCKET` = binding R2 **déjà existant** dans `wrangler.toml`, bucket `multisports-user-data`. Le nouveau préfixe `sports-live-results/v2/` ne touche pas aux sauvegardes personnelles.
   - Optionnel `LIVE_DARTS_BACKFILL_FROM_YEAR` = année minimale de recherche (par défaut `1994`). Une limite de forfait ne peut pas être contournée.
   - Optionnel `DARTUP_PARTNER_FEED_URL` et `DARTUP_PARTNER_FEED_TOKEN` **uniquement si DartUP a officiellement autorisé le flux JSON partenaire**. Ne pas renseigner une URL publique HTML ou créer un collecteur non autorisé.
3. À la racine du projet (PowerShell ou terminal), une fois connecté à Cloudflare :

   ```bash
   npx wrangler deploy --config wrangler.live-darts-sync.toml
   npx wrangler secret put LIVE_SYNC_TARGET --config wrangler.live-darts-sync.toml
   npx wrangler secret put LIVE_OFFICIAL_INGEST_TOKEN --config wrangler.live-darts-sync.toml
   ```

   `LIVE_SYNC_TARGET` doit être l'origine **HTTPS** exacte du site Pages qui sert `functions/` (p. ex. `https://votre-domaine.fr/`), **sans chemin**. Les secrets se saisissent à l'invite, pas dans une commande contenant les valeurs.
4. Vérifier les Cron Events Cloudflare du Worker `mss-live-darts-sync` et les réponses de `POST /api/sports-live/darts/results-sync` (réservé au Worker et aux administrateurs munis du bearer). Une erreur 401 indique une divergence de jeton. Une erreur 503 indique une clé API manquante, une fenêtre fournisseur refusée, un quota ou un stockage indisponible. Ne pas contourner les refus 402 ou 429.
5. Dans LIVE > Fléchettes > Résultats : contrôler les **archives mensuelles réellement enregistrées** et les dernières collectes. Une ligne « non démarré » signifie qu'aucune preuve de collecte n'existe, même si des liens de sources sont référencés.

## Cycle d'archivage

- **Récent :** deux mois (mois courant et précédent), jusqu'à deux pages de 200 lignes/mois, toutes les 6 heures. Le `to` est borné à la date actuelle et respecte le délai du forfait gratuit lorsque la détection du plan est disponible. Des événements absents du plan ne sont pas fabriqués.
- **Historique :** le mois précédent puis les mois plus anciens, jusqu'à trois pages de 200 par passage, avec curseur `meta.next_cursor` sauvegardé après **chaque écriture R2 réussie**. Après la dernière page d'un mois, le prochain passage prend le mois antérieur. Des erreurs de quota/fenêtre sont explicites et ne font pas avancer le curseur.
- **Partitions :** `YYYY/MM/dartsapi.json` ou `YYYY/MM/dartup.json` si flux partenaire autorisé, ainsi que `partner-<sourceId>.json` pour les imports officiels. Les docs V2 n'imposent pas la limite globale de 50 000 matchs du V1. Une partition dépassant 25 000 lignes échoue explicitement, sans tronquer silencieusement.
- **Synchronisations :** `sports-live-results/v2/jobs/dartsapi/{recent,backfill}.json`, visibles de façon synthétique côté résultats. Le Worker n'offre aucun endpoint HTTP public de déclenchement.
- **Recherche :** l'écran interroge V2 + les résultats V1 présents + les résultats DartsAPI autorisés par le plan, puis pagine par mois et par fournisseur. Les compteurs V2 affichent des partitions et pages **visitées**, pas un total mondial inventé. Les filtres peuvent continuer vers les archives plus anciennes.

## Tests locaux (sans appel à des données réelles)

```bash
npx tsc --noEmit -p tsconfig.json
node --experimental-strip-types tools/test-live-darts-archive-v254.mjs
node tools/test-live-darts-sync-route-v254.mjs
```

## Précautions

- Ne pas lancer plusieurs systèmes de collecte concurrents sans le contrôle d'ETag R2 ; V254 refuse une écriture conflictuelle après 4 tentatives.
- Les imports JSON sont réservés aux détenteurs du token `LIVE_OFFICIAL_INGEST_TOKEN` et doivent contenir `schemaVersion=1`, `rightsConfirmed=true`, `sourceId`, `sourceName`, `sourceUrl` en HTTPS et des résultats datés/terminés vérifiables.
- Les compétitions WDF, PDC, MODUS, DartUP, ADC, DartConnect et autres **ne sont pas toutes couvertes** par la clé DartsAPI. Un site inscrit dans `SOURCES` ne vaut ni licence de données ni connexion de résultats.
- Les collectes et tests inclus sont prêts à déployer, **mais aucune synchronisation Cloudflare réelle ni import de vrais résultats n'a été effectué depuis cet environnement**. Pour mesurer la couverture, il faut lire les Cron Events et vérifier les comptes par mois après mise en service.

Docs vérifiées le 22/11/2026 : `https://dartsapi.com/documentation/endpoints/results`, `https://dartsapi.com/documentation/agent-skill`, `https://developers.cloudflare.com/workers/configuration/cron-triggers/`, `https://developers.cloudflare.com/r2/api/workers/workers-api-reference/`.
