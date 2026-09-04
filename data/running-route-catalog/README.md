# MULTISPORTS SCORING — Worldwide Route Catalog V2

This directory contains the provider registry used to grow the RUNNING PERF / outdoor route catalogue without copying closed commercial catalogues.

## Included now

- OpenStreetMap worldwide route relations (live + opportunistic persistence)
- Auvergne-Rhône-Alpes Geotrek regional hub
- Natural England National Trails
- US National Park Service public trails
- USDA Forest Service National Forest System trails
- New Zealand Department of Conservation walking/tramping tracks
- Western Australia DBCA Long Trails is **registered but auto-sync is disabled** because its CC BY-NC licence is not compatible with a monetized catalogue without separate permission.
- Outdooractive remains an optional licensed runtime provider.

## Ingestion

`tools/sync-running-route-catalog-world.mjs` reads `world-sources.json`, downloads open sources, normalizes geometries, de-duplicates/group segments and upserts them into `ms_running_route_catalog`.

```bash
# inspect sources only
npm run routes:catalog:world:sync -- --dry-run --source aura-geotrek

# ingest all auto-sync sources
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run routes:catalog:world:sync

# ingest one source
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run routes:catalog:world:sync -- --source nps-public-trails
```

The world sync deliberately refuses sources marked `commercialReuseAllowed: false`.
