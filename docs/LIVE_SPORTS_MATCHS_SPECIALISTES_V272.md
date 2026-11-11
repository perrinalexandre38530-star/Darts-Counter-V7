# LIVE SPORTS V272 — Rencontres DartsAPI et Table Tennis API

## Intégration

La route Cloudflare Pages existante `GET /api/sports-live/:sport/matches?competition=<nom>&country=<pays>&season=2026`
consulte dans cet ordre :
1. La fiche structurée de fédération importée dans R2 (prioritaire, isolée par sport/pays/compétition/saison).
2. `football-data.org` pour une compétition de football reconnue (V271).
3. **DartsAPI** pour une compétition de fléchettes avec identité exactement résolue (V272).
4. **Table Tennis API** pour un événement de ping-pong avec identité exactement résolue et une seule édition (V272).
5. Réponse `available:false` sans score inventé lorsque le fournisseur manque, refuse la requête ou ne couvre pas cette compétition.

Dans la configuration Cloudflare Pages → Settings → Variables and Secrets, ajouter **comme secrets serveur** :
- `DARTS_API_KEY` (clé DartsAPI, également utilisée par l'ancien aperçu LIVE des fléchettes).
- `TABLE_TENNIS_API_KEY` (clé Table Tennis API, également utilisée par l'ancien aperçu LIVE du ping-pong).

La fonction Pages `functions/api/sports-live/[[path]].ts` doit être déployée avec l'interface ; ajouter une variable côté navigateur ne suffit pas. Les clés ne figurent dans aucune réponse HTTP.

### Correspondance stricte et limites

- DartsAPI : recherche dans `/v1/competitions`, résolution d'un **unique** `competition_id`, puis `/v1/results` et `/v1/fixtures` limités à cette compétition et, le cas échéant, à l'année demandée. Pagination bornée à trois pages par type afin de limiter les quotas. Les résultats de tournoi sans score complet ne reçoivent pas de score fabriqué.
- Table Tennis API : recherche dans le calendrier `/v1/events`, résolution d'un **unique** `event_id` et téléchargement de `/v1/events/{id}/matches`. La saison est contrôlée avant et après le téléchargement. Les rendez-vous homonymes non distinguables sont rejetés plutôt qu'assemblés.
- Les noms très abrégés ou différents du nom du fournisseur pourront rester non raccordés : il faudra un registre d'alias **validés manuellement** ou des identifiants de compétition persistés dans une future version, pas un fuzzy match qui mélange les pays.
- La couverture est celle de l'abonnement au fournisseur. Les archives, quotas et directs dépendent de chaque offre, même si l'application accepte 50 000 résultats en cache.
- Une date `YYYY-MM-DD` sans heure ne se transforme plus artificiellement en 00:00 ; elle est affichée comme date seule.
- Phases finales : quart, demi, finale et tours normalisés. Aucune progression vers un match suivant n'est déduite à partir du résultat : les liens d'arbre ne peuvent venir que d'un tableau structuré.
- Classements officiels : restent produits par les fournisseurs structurés V270/V269, pas à partir de ces matchs (évite les classements fictifs).
- Tous les autres sports LIVE conservent le contrat d'import V270. Ce patch **n'affirme pas** disposer d'un connecteur automatique pour les autres disciplines.

Références fournisseurs : https://dartsapi.com/documentation et https://tabletennisapi.com/ . Vérifier les licences d'affichage et de redistribution commerciale avant une diffusion monétisée.

### Vérifications exécutables

`npm run typecheck -- --pretty false`

`node tools/test-live-specialist-provider-v272.mjs`

`node tools/test-live-provider-matches-v271.mjs`

`node tools/test-live-managed-competition-v270.mjs`

Les tests V272 simulent les réponses API, vérifient sélection de compétition, statut, dates, contrôle de saison, priorité des scores réels et absence de fuite des secrets. La disponibilité effective des clés et la qualité du contenu chez le fournisseur se vérifient après déploiement.
