# MULTISPORTS SCORING — Content Packs Cloudflare V3

## Architecture validée

Les médias lourds ne doivent plus gonfler le module Android de base.

Flux public :

`MULTISPORTS SCORING -> https://mss-content-packs.perrin-alexandre38530.workers.dev -> binding CONTENT_PACKS -> R2 dart-scans -> mss-content-packs/v1/...`

Le bucket reste privé. Le Worker ne sert que le préfixe public `mss-content-packs/v1/`.

## Passerelle runtime

URL par défaut :

`https://mss-content-packs.perrin-alexandre38530.workers.dev/mss-content-packs/v1`

Override facultatif :

`VITE_CONTENT_PACK_BASE_URL`

Le changement du gateway R2 direct vers le Worker déclenche une nouvelle génération d'état/cache (`v3`) afin qu'un pack précédemment marqué installé ne soit jamais considéré hors ligne alors que ses anciennes URLs ne correspondent plus.

## Cache hors ligne

- CacheStorage : `mss-content-packs-v3`
- Etat local : `mss_content_packs_v3`
- Le service worker sert les URLs de packs en cache-first.
- Une nouvelle version de pack produit une URL immutable différente.
- L'installation d'un pack télécharge jusqu'à 4 fichiers en parallèle.
- L'interface Réglages affiche l'état de la passerelle Cloudflare.

## Android

`npm run android:sync` :

1. synchronise la version ;
2. construit le frontend ;
3. retire les médias FIT PERF embarqués ;
4. retire les grosses textures de thème embarquées ;
5. conserve seulement les deux SVG CSS de quelques Ko requis avant le montage React :
   - `postapoc-cracks-overlay.svg`
   - `postapoc-panel-concrete.svg`
6. optimise les médias locaux restants ;
7. vérifie le budget média ;
8. synchronise Capacitor.

## Contrôles

```powershell
npm run test:content-packs
npm run content-packs:audit
npm run android:sync
npm run android:media-budget
```

Pour produire ensuite l'AAB Play :

```powershell
npm run android:play:aab
```

Le garde-fou AAB reste volontairement sous la limite Google Play afin de conserver de la marge pour les futurs sports.
