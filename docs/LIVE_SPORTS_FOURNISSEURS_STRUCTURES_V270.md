# LIVE SPORTS V270 — données structurées autorisées, tous les sports

Le flux `GET /api/sports-live/:sport/standings?competition=...&country=...&season=2026` consulte **d'abord** la base de données R2 des fiches fournisseurs, puis, pour les compétitions de football reconnues, football-data.org. Le client ne reçoit jamais le jeton d'import. Si aucune donnée n'est disponible, il affiche les bilans indicatifs séparément et ne fabrique ni classement officiel ni qualification.

## Cloudflare Pages

- Secret requis pour **importer** : `LIVE_OFFICIAL_INGEST_TOKEN` (un jeton long et aléatoire dans les secrets Cloudflare Pages).
- Bucket facultatif dédié : `LIVE_OFFICIAL_BUCKET` (binding R2). À défaut, le binding existant `USER_DATA_BUCKET` est utilisé, mais **seulement** sous le préfixe isolé `sports-live-official/v1/`. Les données personnelles existantes ne sont jamais lues ni modifiées par ce flux.
- `FOOTBALL_DATA_API_KEY` reste facultatif pour l'ancien fournisseur de football.
- Pas de jeton défini = **imports impossibles**, consultation R2 existante possible.

## Import autorisé (serveur à serveur uniquement)

`POST /api/sports-live/:sport/official` avec `Authorization: Bearer <LIVE_OFFICIAL_INGEST_TOKEN>` et `Content-Type: application/json`.

**Attention :** la provenance doit être authentifiée par l'opérateur qui effectue l'import. Le jeton protège l'écriture ; il ne certifie pas à lui seul les droits de réutilisation des données. Utiliser uniquement des flux publiés avec droit d'exploitation, licences ou accords de fédération. Ne pas automatiser la copie de pages Flashscore.

Exemple de schéma **fictif** pour essais en environnement privé (aucun score réel) :

```json
{
  "sport": "darts",
  "competition": "Compétition de démonstration",
  "country": "Monde",
  "season": "2026",
  "sourceName": "Fédération de démonstration",
  "sourceUrl": "https://example.org/competition",
  "tables": [{
    "name": "Groupe A", "stage": "GROUP_STAGE", "group": "A",
    "rows": [
      {"position": 1, "name": "Participant A", "played": 2, "won": 2, "drawn": 0, "lost": 0, "points": 4},
      {"position": 2, "name": "Participant B", "played": 2, "won": 1, "drawn": 0, "lost": 1, "points": 2}
    ]
  }],
  "bracket": [{
    "id": "finals", "name": "Finale", "order": 6,
    "matches": [
      {"id": "final-1", "participantA": "Participant A", "participantB": "Participant B", "scoreA": null, "scoreB": null, "status": "scheduled", "startsAt": "2026-12-01T18:00:00Z", "nextMatchId": null}
    ]
  }]
}
```

Le champ `sport` doit être l'un de `darts`, `petanque`, `pingpong`, `babyfoot`, `molkky`, `foot`, `esports`, `tossit`, `dicegame`, `running`, `fit`. La combinaison sport + pays + compétition + saison est strictement isolée. Une saison est un millésime (`2026`) ou `current` pour l'édition courante sans année. Les champs statistiques absents sont affichés comme « – » et non remplacés par des zéros fictifs. Les références `nextMatchId` ne sont acceptées que vers des matchs réellement présents dans la même fiche.

L'accès lecture est public pour les fiches déjà importées. Les réponses sont mises en cache 60 s pour ce flux, les pages peuvent donc ne pas afficher instantanément une modification.

**Limites :** cet ajout fournit une chaîne de réception et d'affichage **effective pour les 11 sports**, mais ne prétend pas que les fédérations y envoient déjà des données. Chaque fournisseur réel nécessite encore son accord, sa configuration et son adaptateur de collecte. Les classements football-data.org restent une intégration automatique spécifique au football.
