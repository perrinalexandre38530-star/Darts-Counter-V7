# MULTISPORTS SCORING

**MULTISPORTS SCORING** is an Android and Web sports scoring, statistics and performance-tracking application.

- Official Web app: https://multisports-scoring.pages.dev/
- Google Play package: `com.multisportsscoring.app`
- Google Play: https://play.google.com/store/apps/details?id=com.multisportsscoring.app
- Languages: French, English, Spanish

## Sports & features

### Darts
MULTISPORTS SCORING includes dedicated scoring experiences for **X01 (301 / 501 / 701 / 901), Cricket, Killer, Shanghai** and additional darts modes. The application also provides player profiles, match history and performance statistics.

### Running Performance
The Running Performance module supports **GPS route tracking, distance, time, pace, kilometre splits, saved sessions and performance history**.

### Multi-sport scoring
The Android release also includes scoring tools for **pétanque** and **table football / foosball**, with the platform designed to expand to additional sports.

## Public discovery pages

- Français: https://multisports-scoring.pages.dev/fr/
- English: https://multisports-scoring.pages.dev/en/
- Español: https://multisports-scoring.pages.dev/es/
- Public discovery hub (FR): https://multisports-scoring.pages.dev/fr/decouvrir/
- Public discovery hub (EN): https://multisports-scoring.pages.dev/en/discover/
- Public discovery hub (ES): https://multisports-scoring.pages.dev/es/descubrir/
- Compteur de fléchettes: https://multisports-scoring.pages.dev/fr/flechettes/compteur-flechettes/
- Dart counter: https://multisports-scoring.pages.dev/en/darts/dart-counter/
- X01: https://multisports-scoring.pages.dev/fr/flechettes/x01/
- Darts statistics: https://multisports-scoring.pages.dev/en/darts/darts-statistics/
- Online darts: https://multisports-scoring.pages.dev/en/darts/online-darts/
- Running: https://multisports-scoring.pages.dev/en/running/

The public site exposes crawlable HTML hubs, a sitemap, structured `SoftwareApplication` / `MobileApplication` metadata, OpenAI Search crawler rules and an IndexNow integration for Bing and participating search engines.

---

## Current release

Version de référence : **1.0.0-rc17**  
Code Google Play : **18**  
Package Android : `com.multisportsscoring.app`

La source unique de version est `config/release-version.json`.

```powershell
npm run version:sync
npm run version:check
```

## Development stack

React + TypeScript + Vite, with Capacitor for the Android application.
