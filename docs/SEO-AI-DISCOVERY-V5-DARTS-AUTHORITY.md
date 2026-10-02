# MULTISPORTS SCORING — SEO / AI Discovery V5 — Darts Authority

## Objectif

Faire comprendre aux moteurs de recherche et aux moteurs IA que **MULTISPORTS SCORING** est notamment une application de **compteur de fléchettes / dart counter / darts scorer**, sans perdre son identité multisports.

## Ce que V5 ajoute ou corrige

- renforcement des métadonnées de la page racine autour de `compteur de fléchettes`, `dart counter` et `darts scorer` ;
- enrichissement JSON-LD `SoftwareApplication` + `MobileApplication` avec `SportsApplication` ;
- ajout d'une entité machine lisible : `/seo/entity.json` ;
- ajout d'un catalogue Darts machine lisible : `/seo/darts-guides-v1.json` ;
- ajout de `/llms-full.txt` et enrichissement de `/llms.txt` ;
- passage de 4 à 12 guides Darts en français, anglais et espagnol ;
- nouvelles pages longues traînes : compteur de fléchettes, Challenge, Darts Poker, Gros 6, CRADOS, entraînement X01, statistiques et X01 online ;
- correction des `hreflang` des guides Darts : chaque guide pointe désormais vers son équivalent FR/EN/ES et non vers la page Darts générique ;
- suppression du canonical dupliqué sur les guides ;
- génération automatique de `sitemap-google.txt` en même temps que `sitemap.xml` ;
- sitemap porté à 278 URL publiques ;
- audit SEO renforcé pour vérifier canonical, OAI-SearchBot, données structurées, pages Darts et cohérence des deux sitemaps.

## Commandes locales

```bash
npm run seo:check
npm run build
```

`npm run seo:check` doit afficher :

```text
Sitemap URLs found      : 278
Text sitemap URLs       : 278
Local sitemap pages ok  : 278
Pages using seo.css     : 278
Darts guides exposed    : 12
Canonical errors        : 0
OK: SEO / AI public discovery files are structurally consistent.
```

## Après déploiement Cloudflare Pages

1. Vérifier publiquement :
   - `/robots.txt`
   - `/sitemap.xml`
   - `/sitemap-google.txt`
   - `/llms.txt`
   - `/llms-full.txt`
   - `/seo/entity.json`
   - `/seo/darts-guides-v1.json`
   - `/fr/flechettes/compteur-flechettes/`
   - `/en/darts/dart-counter/`
   - `/es/dardos/contador-dardos/`
2. Soumettre `https://multisports-scoring.pages.dev/sitemap.xml` dans Google Search Console et Bing Webmaster Tools.
3. Relancer `npm run seo:indexnow` après déploiement.
4. Dans Cloudflare, vérifier que les règles anti-bot/WAF ne bloquent pas `OAI-SearchBot`, même si `robots.txt` l'autorise déjà.
5. Tester la page Darts et la page racine dans le test Google des résultats enrichis.

## Règle éditoriale

Ne pas créer des centaines de pages artificielles avec uniquement des variantes de mots-clés. Chaque nouvelle page doit correspondre à une vraie fonction ou un vrai mode de MULTISPORTS SCORING et apporter une information utile aux joueurs.
