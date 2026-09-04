# RUNNING PERF — Catalogue GPX mondial V2

## Objectif
Étendre le catalogue de parcours de MULTISPORTS SCORING depuis la base Auvergne-Rhône-Alpes vers un pipeline mondial, tout en conservant le catalogue existant Supabase/PostGIS + OpenStreetMap + Outdooractive.

## Activités prises en charge
- running
- trail
- hiking
- walking
- nordic-walking
- cycling
- mtb
- gravel
- ebike
- bmx
- roller
- snowshoe
- ski-touring
- equestrian

## Sources intégrées / enregistrées
- OpenStreetMap mondial — recherche live existante conservée.
- Geotrek régional Auvergne-Rhône-Alpes — synchronisation API v2.
- Parc national des Écrins Geotrek — synchronisation API v2.
- Natural England National Trails — ArcGIS / Open Government Licence.
- England Coast Path — ArcGIS / Open Government Licence.
- US National Park Service Public Trails — ArcGIS.
- USDA Forest Service National Forest System Trails — ArcGIS.
- New Zealand Department of Conservation Walking & Tramping Tracks — ArcGIS / CC BY 3.0 NZ.
- NSW National Parks Walking Tracks — ArcGIS / licence d'attribution Data.NSW.
- Western Australia DBCA Long Trails — référencé mais AUTO-SYNC DÉSACTIVÉ car CC BY-NC 4.0.
- Outdooractive — fournisseur licencié optionnel existant conservé, sans collecte bulk.

## Fichiers AURA intégrés
- data/running-route-catalog/aura/README_AURA_GPX.md
- data/running-route-catalog/aura/aura_catalog_seed_routes.json
- data/running-route-catalog/aura/aura_gpx_sources.json

## Nouveau synchroniseur mondial
`tools/sync-running-route-catalog-world.mjs`

Il lit `data/running-route-catalog/world-sources.json`, refuse automatiquement les sources dont `commercialReuseAllowed` n'est pas explicitement vrai, puis normalise les géométries vers le schéma du catalogue Supabase.

Exemples :

```bash
npm run routes:catalog:world:sync -- --dry-run --source aura-geotrek
npm run routes:catalog:world:sync -- --source natural-england-national-trails
npm run routes:catalog:world:sync -- --source nps-public-trails
npm run routes:catalog:world:sync
```

Pour écrire dans Supabase :

```bash
export SUPABASE_URL="https://..."
export SUPABASE_SERVICE_ROLE_KEY="..."
npm run routes:catalog:world:sync
```

## Migration Supabase
Appliquer :

`supabase/migrations/20260904173000_running_route_catalog_global_v2.sql`

Elle ajoute les métadonnées géographiques (`country_code`, `region_name`, `locality`) et élargit les sports autorisés.

## Sécurité juridique
Le registre distingue :
- source ouverte / compatible : synchronisable ;
- source nécessitant une licence contractuelle : runtime uniquement ;
- source non-commerciale ou ambiguë : auto-sync désactivé.

Les attributions et métadonnées de provenance doivent rester attachées à chaque parcours.

## Tests
- `npm run test:route-catalog:v118` : 21/21
- `npm run test:route-catalog:world` : 14/14
- `npm run typecheck` : OK

Le build Vite complet n'a pas pu être exécuté dans l'environnement d'extraction fourni car le binaire `vite` n'y est pas installé. Le garde-fou des thèmes passe avant cette étape et le TypeScript passe intégralement.
