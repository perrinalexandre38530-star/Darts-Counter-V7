# V110 — THEME CATALOG GUARD

Correction ciblée après V109.

- restaure `theme-textures` sur la version R2 validée `2026.09.03.2`;
- restaure les 110 textures dans `src/lib/contentPackCatalog.generated.ts`;
- conserve la page THÈME compacte / aperçu Accueil de V109;
- ajoute `tools/guard-theme-catalog.mjs`;
- ajoute un `prebuild` qui bloque tout futur déploiement si le catalogue retombe à 30 textures ou à une mauvaise version;
- renforce `npm run test:content-packs`.

Tests exécutés :
- THEME CATALOG GUARD : 110/110 OK
- Content packs V4 contract : OK

Aucun média lourd n'est réinjecté dans Android.
