# MULTISPORTS SCORING — Pack sources GPX Auvergne-Rhône-Alpes

Ce dossier sert de base au catalogue cartographique de MULTISPORTS SCORING.

## Contenu
- `aura_gpx_sources.json` : registre des grandes sources officielles / open data.
- `aura_catalog_seed_routes.json` : première sélection de routes déjà identifiées, multi-sports.
- `aura_geotrek_sync.mjs` : synchroniseur automatique du hub Geotrek régional.
- Le script crée à l'exécution un dossier `aura-geotrek-export/gpx/` et un manifeste.

## Stratégie recommandée
1. **Geotrek régional AURA** en source principale : API v2 + GPX.
2. **PDIPR open data** départementaux : conversion vers GPX puis ingestion.
3. **E-Rando63 / Isère Outdoor / La Région du Vélo** en compléments.
4. Déduplication par empreinte de géométrie + nom normalisé + distance.
5. Ne pas recopier en masse les GPX de plateformes privées (Komoot, AllTrails,
   Wikiloc, Visorando, etc.) sans accord explicite.

## Modèle de données conseillé
`id`, `provider`, `provider_route_id`, `sport`, `name`, `department`, `region`,
`distance_km`, `elevation_gain_m`, `difficulty`, `route_type`, `gpx_url`,
`source_page`, `license`, `attribution`, `last_synced_at`, `is_active`.

## Lancer la synchro Geotrek
Node.js 18+ :
```bash
node aura_geotrek_sync.mjs
```

Le script n'enregistre un fichier que si la réponse contient réellement un document GPX.
Il peut donc être relancé périodiquement pour rafraîchir le catalogue.

## Attribution
Conserver systématiquement le fournisseur / producteur et la licence de chaque
source. Les jeux PDIPR marqués Licence Ouverte peuvent être réutilisés en
respectant les conditions d'attribution de la licence.
