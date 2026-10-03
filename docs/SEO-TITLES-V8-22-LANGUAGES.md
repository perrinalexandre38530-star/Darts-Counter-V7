# MULTISPORTS SCORING — SEO Titles V8

## Objectif

Cette passe harmonise les titres SEO publics dans les 22 langues prises en charge par le générateur SEO et durcit le contrôle Bing/SEO.

## Langues contrôlées

FR, EN, ES, DE, IT, PT, NL, RU, ZH, JA, AR, HI, TR, DA, NO, SV, IS, PL, RO, SR, HR, CS.

## Règles V8

- tous les titres générés doivent faire au maximum 55 caractères ;
- les intitulés génériques score / performance / hub sont formulés dans la langue de la page ;
- suppression des résidus anglais non voulus dans les titres non anglophones (`stats`, `hub`, `tracker`) ;
- titres Darts FR/EN/ES raccourcis quand nécessaire ;
- contrôle automatique des 22 langues et des 10 modules sportifs dans `npm run seo:check` ;
- `public/seo/catalog-v2.json` est inclus afin que `npm run seo:build` soit autonome.

## Validation

Résultat attendu :

```text
Supported languages    : 22
Sitemap URLs found      : 281
Canonical errors        : 0
Titles over 55 chars    : 0
Orphan sitemap pages    : 0
```
