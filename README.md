# MULTISPORTS SCORING

**MULTISPORTS SCORING** is an Android and Web sports scoring, statistics and performance-tracking application.

- Official Web app: https://darts-counter-v7.pages.dev/
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

- Français: https://darts-counter-v7.pages.dev/fr/
- English: https://darts-counter-v7.pages.dev/en/
- Español: https://darts-counter-v7.pages.dev/es/
- Fléchettes: https://darts-counter-v7.pages.dev/fr/flechettes/
- Darts: https://darts-counter-v7.pages.dev/en/darts/
- Running: https://darts-counter-v7.pages.dev/en/running/

The public site exposes a sitemap, structured `SoftwareApplication` metadata and crawler rules for Google, Bing and OpenAI Search discovery.

---

## Current release

Version de référence : **1.0.0-rc13**  
Code Google Play : **14**  
Package Android : `com.multisportsscoring.app`

La source unique de version est `config/release-version.json`.

```powershell
npm run version:sync
npm run version:check
```

## Development stack

React + TypeScript + Vite, with Capacitor for the Android application.
