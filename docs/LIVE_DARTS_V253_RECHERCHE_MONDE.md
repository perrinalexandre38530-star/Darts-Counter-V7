# MULTISPORTS SCORING — LIVE V253 : recherche mondiale de résultats

Référence source du patch : `Darts-Counter-V7(5).zip` (22 novembre 2026). Livraison différentielle, **pas** de `package.json` remplacé, aucune branche Git créée et aucun fichier du projet non concerné modifié.

## Ce qui change réellement

La page **LIVE → Résultats**, pour chacun des sports disposant de LIVE, comporte désormais un explorateur avec recherche joueur / compétition, année (1975–année courante), pays, niveau, source et pagination. La recherche ne s'arrête plus aux 120 derniers matchs chargés dans l'onglet LIVE : elle appelle le nouveau point d'accès backend `GET /api/sports-live/{sport}/results-search` et peut consulter :

1. L'archive centrale R2 MSS déjà alimentée par les collecteurs et des imports autorisés (jusqu'à 50 000 résultats dans l'archive existante).
2. **DartsAPI** via sa vraie API `/v1/results`, filtres `from`/`to` et `cursor`. Les recherches libres utilisent `/v1/players?q=` et `/v1/competitions?q=` pour retrouver leurs identifiants, puis `/v1/results?player_id=` ou `competition_id=`. Cela n'invente aucun résultat et respecte les quotas/forfaits.
3. L'export partenaire DartUP lorsqu'un accord et les paramètres privés `DARTUP_PARTNER_FEED_URL` et `DARTUP_PARTNER_FEED_TOKEN` sont fournis.
4. Les archives déjà collectées par les **autres sports de LIVE** (football, tennis de table, pétanque, baby-foot, Mölkky, etc.), via la même page de recherche. Pour ces sports, la recherche porte sur les matchs structurés présents dans R2 et le flux de la page ; elle ne débloque pas une API tierce absente.
5. Les résultats saisis ou transmis par une fédération, une ligue ou un fournisseur autorisé via la nouvelle route authentifiée d'import MSS (voir ci-dessous).

Chaque match montre ses adversaires, scores, compétition, date, phase et provenance. La page indique distinctement les connecteurs opérationnels, non configurés, limités, et les **annuaires sans flux de scores**. Le moteur de classement/filtrage existant par continent → pays → compétition → saison reste accessible dans une section repliable, sans dégrader l'interface des autres sports.

Les flux rapides et profonds de Darts sont maintenant conservés en R2 de manière non bloquante quand un bucket est configuré ; les résultats trouvés par recherche DartsAPI alimentent aussi l'archive. Les données R2 sont dédupliquées, et les objets `raw` DartsAPI sont éliminés avant l'archivage pour limiter la taille. Le cache frontend passe à la version 16 pour recharger les réponses actualisées.

## Conditions pour obtenir réellement des scores

Sur le déploiement **Cloudflare Pages**, vérifier les variables secrètes de projet :

- `DARTS_API_KEY` : clé obtenue directement auprès de DartsAPI. Les plans gratuits, LIVE et archives ont des fenêtres et des quotas distincts. Sans clé, MSS n'a pas accès à cette base historique.
- `USER_DATA_BUCKET` : liaison R2 (déjà indiquée dans `wrangler.toml`). Sans bucket les résultats consultés ne deviennent pas un catalogue serveur persistant.
- `DARTUP_PARTNER_FEED_URL` et `DARTUP_PARTNER_FEED_TOKEN` : uniquement un flux officiel négocié auprès de DartUP, qui interdit toute extraction automatisée de son site public sans accord.
- `DARTCONNECT_API_KEY` : utilisable pour certaines métadonnées de calendriers et de rencontres UKDA ; **ne constitue pas** un accès aux scores complets de tous les matchs DartConnect.
- `LIVE_OFFICIAL_INGEST_TOKEN` : jeton serveur privé pour autoriser l'import de résultats provenant de partenaires (ne jamais le mettre dans les fichiers client).

Un catalogue de 61 liens de fédérations, ligues et médias **n'est pas égal à 61 flux de résultats**. Ni les livres d'archives mondiaux, ni la complétude de toutes les compétitions amateurs, ni la collecte passive 24 h/24 ne sont garantis par ce patch. La collecte continue indépendante de l'utilisation de MSS requiert une tâche planifiée côté infrastructure et une politique d'accords avec les détenteurs de données.

## API de recherche

```http
GET /api/sports-live/darts/results-search?q=Luke%20Littler&year=2025
GET /api/sports-live/darts/results-search?competition=World%20Championship&country=GB
GET /api/sports-live/darts/results-search?source=DartsAPI&cursor=<curseur fournisseur>
GET /api/sports-live/foot/results-search?q=Marseille&lang=fr
```

Paramètres facultatifs : `lang` (langue de l’archive, avec repli en français), `q`, `year`, `country` (ISO 2 lettres), `competition`, `level` (`elite`, `pro`, `semi_pro`, `amateur`, `grassroots`, `mixed`), `source`, `offset` (pagination R2), `cursor` (pagination fournisseur). Réponse JSON : `results`, `archiveMatches`, `archivePersistent`, `nextArchiveOffset`, `nextProviderCursor`, `providers`, `partial`, `warnings` et `updatedAt`. Des recherches textuelles très larges ne peuvent pas garantir l'exhaustivité des résultats : la résolution initiale est volontairement limitée en requêtes fournisseurs.

## Import de scores avec accord de diffusion

```http
POST /api/sports-live/darts/results-import
Authorization: Bearer <LIVE_OFFICIAL_INGEST_TOKEN>
Content-Type: application/json
```

Exemple de contrat de test **fictif, sans résultat réel** :

```json
{
  "schemaVersion": 1,
  "rightsConfirmed": true,
  "sourceId": "fed-demo",
  "sourceName": "Partenaire autorisé",
  "sourceUrl": "https://federation.example/results",
  "countryCode": "FR",
  "level": "amateur",
  "results": [
    {
      "id": "demo-match-1",
      "playedOn": "2026-10-01",
      "competition": "Tournoi exemple",
      "round": "Finale",
      "winner": { "name": "Joueur A", "score": 4 },
      "loser": { "name": "Joueur B", "score": 2 }
    }
  ]
}
```

Au maximum 1000 scores validés par requête, corps inférieur à 512 Ko. L'import exige une déclaration explicite des droits de diffusion, des noms de joueurs, un score numérique final cohérent et une date valide. Les résultats sont stockés dans R2 ; ils sont recherchables par tous les utilisateurs de MSS, sous réserve des droits que l'importateur a certifiés. Ne jamais utiliser cet import pour copier des données DartUP ou DartConnect sans autorisation écrite.

## Tests réalisés

- Vérification des types backend avec TypeScript (`tsc --noEmit` sur la Pages Function et ses dépendances TypeScript non-React).
- Contrôle de syntaxe des composants TSX via le compilateur TypeScript.
- Tests unitaires hors-ligne avec fausses réponses d'API (aucun score fictif ajouté au catalogue) : navigation de recherche, filtrage année/pays, pagination, refus d'import sans autorisation, stockage R2 et réponse sans clé.

**Non testé ici :** authentification aux vrais fournisseurs, déploiement Cloudflare, test visuel en navigateur ou sur Android (dépendances npm et secrets non disponibles dans la session). Vérifier ces éléments après application du patch avant de considérer les nouveaux flux opérationnels.
