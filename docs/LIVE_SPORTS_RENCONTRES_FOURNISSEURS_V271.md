# LIVE SPORTS V271 — Rencontres vérifiées / programmes / phases finales

Base d'intégration : `Darts-Counter-V7(141).zip` provenant du Google Drive utilisateur.

## Données automatiques (football)

La fiche d'une compétition **strictement identifiée** par `footballCompetitionCode` peut lire :

`GET /api/sports-live/foot/matches?competition=Ligue%201&country=France&season=2026`

Le serveur (Cloudflare Pages Function) contacte le sous-endpoint officiel `https://api.football-data.org/v4/competitions/{code}/matches?season=YYYY` si `FOOTBALL_DATA_API_KEY` est disponible. La clé reste sur Cloudflare. Les réponses sont mises en cache à l'edge (15 minutes pour les données disponibles). L'accès historique dépend de l'offre du fournisseur.

Les statuts sont différenciés : `scheduled`, `live`, `finished`, `postponed`, `cancelled`, `unknown`. Un match sans score complet ne produit pas un score ou un vainqueur fictif. Les tours sont affichés dans l'ordre, mais aucun raccord vers un tour suivant n'est inventé : pour cela, il faut une donnée explicite `nextMatchId` dans l'import fournisseur.

## Les 11 disciplines — fédérations / fournisseurs autorisés

L'API managée V270 `POST /api/sports-live/<sport>/official` accepte désormais un tableau facultatif `matches` en plus de `tables` et `bracket`, y compris un flux uniquement composé de rencontres.

Exemple de corps JSON **fictif destiné aux tests de développement** :

```json
{
  "sport": "pingpong",
  "competition": "Tournoi régional",
  "country": "France",
  "season": "2026",
  "sourceName": "Fédération ou fournisseur autorisé",
  "sourceUrl": "https://example.org/competition",
  "tables": [],
  "bracket": [],
  "matches": [
    {
      "id": "supplier-match-001",
      "participantA": "Club A",
      "participantB": "Club B",
      "scoreA": 3,
      "scoreB": 2,
      "status": "finished",
      "startsAt": "2026-11-11T10:00:00Z",
      "stage": "FINAL",
      "group": null,
      "matchday": null
    }
  ]
}
```

Envoyer ce JSON dans la requête `POST` avec `Authorization: Bearer <LIVE_OFFICIAL_INGEST_TOKEN>`. Le jeton doit rester secret et ne doit jamais être intégré au code du navigateur. Les enregistrements sont isolés en R2 par **sport, pays, compétition et saison**. L'API publique de lecture est :

`GET /api/sports-live/<sport>/matches?competition=...&country=...&season=...`

Un compte/contrat de fournisseur est requis pour alimenter réellement ces fiches. Le simple référencement de Flashscore ou d'une fédération ne donne pas les droits d'importer automatiquement tous ses résultats.

## Affichage et priorités

- Les rencontres fournisseur connues sont prioritaires dans Résumé, Résultats et À venir ; si la source n'a aucun résultat terminé ou programmé, les données existantes restent consultables.
- Les phases finales de fournisseurs sont présentées en colonnes horizontales lisibles au tactile, sans fausses lignes de qualification.
- Une saison précise est requise pour présenter un tableau multi-éditions comme officiel.
- Résultats et affiches proviennent du fournisseur ; le moteur n'extrapole pas de scores.
- Rien n'est ajouté au calendrier interne : les événements existants restent liés à l'Agenda principal.

## Tests

`npm run typecheck`

`node tools/test-live-provider-matches-v271.mjs`

`node tools/test-live-managed-competition-v270.mjs`

`node tools/test-live-official-route-v269.mjs`
