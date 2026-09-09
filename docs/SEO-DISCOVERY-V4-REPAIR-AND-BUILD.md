# MULTISPORTS SCORING — SEO Discovery V4

## Corrections

- ajoute `public/sitemap.xsl`, qui manquait alors que `sitemap.xml` le référence ;
- régénère toutes les pages publiques déclarées dans le sitemap ;
- restaure notamment les pages suédoises `running`, `table-football` et `table-tennis` ;
- ajoute `tools/build-seo-public-pages.mjs` pour reconstruire automatiquement les pages SEO à partir de `public/seo/catalog-v2.json` ;
- améliore les textes visibles des pages dans les 22 langues, y compris le rendu RTL arabe ;
- conserve les 254 URL du sitemap ;
- garde IndexNow tel quel : la soumission de 254 URL est désormais acceptée.

## Commandes

```bash
npm run seo:build
npm run test:seo
npm run seo:check
npm run seo:indexnow
```

`seo:check` exécute d'abord la génération puis l'audit local.

## Résultat attendu

```text
Sitemap URLs found      : 254
Local sitemap pages ok  : 254
Pages using seo.css     : 254
llms.txt present        : yes
sitemap.xsl present     : yes
OK: SEO public pages look structurally consistent.
```

## Après déploiement Cloudflare

Vérifier :

- `/sitemap.xml` : le sitemap doit désormais afficher une page sombre lisible et non une page blanche ;
- `/ar/darts/` : titres et texte principal doivent être en arabe ;
- `/sv/running/` ;
- `/sv/table-football/` ;
- `/sv/table-tennis/`.
