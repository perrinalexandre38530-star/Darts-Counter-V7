# MULTISPORTS SCORING — Content Packs Cloudflare V2

Cette architecture garde le coeur Android léger et place les médias optionnels lourds dans Cloudflare R2.

## Packs V2

- `fit-awena` : médias FIT PERF / AWENA et motion capture.
- `navigation-music` : musiques de navigation compressées en Opus/WebM 48 kb/s.
- `collectible-cards` : cartes à débloquer HD.
- `theme-textures` : textures de thèmes et packs visuels.
- `character-portraits` : personnages Killer, Loterie et Firefighter.

Les URLs sont versionnées :

`.../mss-content-packs/v1/<pack>/<version>/<fichier>`

Cela évite qu'un ancien cache hors ligne remplace une nouvelle version d'un média.

## Préparer les packs

Depuis la racine du projet :

```powershell
npm run content-packs:prepare
npm run content-packs:audit
```

Le résultat est écrit dans `content-packs-dist/`.

## Vérifier sans envoyer

```powershell
npm run content-packs:upload:dry
```

## Envoyer vers Cloudflare R2

Par défaut le bucket utilisé est `dart-scans` et le préfixe est `mss-content-packs/v1`.

```powershell
npm run content-packs:upload
```

Ou en une seule commande :

```powershell
npm run content-packs:publish
```

Pour un autre bucket ou préfixe PowerShell :

```powershell
$env:MSS_CONTENT_PACK_BUCKET="MON_BUCKET"
$env:MSS_CONTENT_PACK_PREFIX="mss-content-packs/v1"
npm run content-packs:publish
```

## URL publique utilisée par l'application

La valeur peut être changée au build avec :

```powershell
$env:VITE_CONTENT_PACK_BASE_URL="https://VOTRE-DOMAINE-R2/mss-content-packs/v1"
```

Sans variable, l'application utilise la valeur par défaut définie dans `src/lib/contentPacks.ts`.

## Build Android

`npm run android:sync` exécute automatiquement `android:strip-content-packs` après le build web et avant `npx cap sync android`.

Le build Android retire donc du `dist` :

- `fit/`
- `theme-textures/`

Les autres packs ne sont plus importés statiquement par Vite.

## Principe pour les futurs sports

Ne pas ajouter de gros médias directement au bundle Android. Ajouter un nouveau content pack, le charger depuis Cloudflare et ne conserver dans l'application que les ressources indispensables au démarrage et les petits fallbacks.

## Phase 3 — compression systématique + garde-fous Android

La préparation V3 (`2026.09.01.3`) recompresse aussi les WebP déjà existants au lieu de les recopier tels quels. La règle est **smaller-wins** : si le média recompressé est plus lourd, l'original est conservé.

Les vidéos FIT sont également réencodées lorsque FFmpeg est disponible :

- MP4 : H.264 CRF 30, `faststart` ;
- WebM : VP9 CRF 36 ;
- un résultat plus lourd que l'original est automatiquement rejeté.

Le build Android applique ensuite une deuxième passe uniquement sur `dist/` :

```powershell
npm run android:optimize-local-media
npm run android:media-budget
```

Cette passe ne touche jamais aux sources du projet. Elle compresse les médias qui doivent réellement rester dans le coeur Android, puis refuse le build si le poids local remonte au-dessus du budget.

Budgets par défaut :

- médias locaux `dist/` : 28 MB max ;
- un média local individuel : 6 MB max ;
- AAB final : garde-fou 450 MB (sous la limite Play de 500 MB, avec une marge de sécurité).

Ils restent surchargeables par variables d'environnement :

```powershell
$env:MSS_ANDROID_LOCAL_MEDIA_MAX_MB="28"
$env:MSS_ANDROID_LOCAL_MEDIA_FILE_MAX_MB="6"
$env:MSS_AAB_MAX_MB="450"
```

Le module Android exclut en plus les ressources natives desktop (`osx-*`, `win-*`, `linux-*`) qui peuvent être apportées transitivement dans `META-INF/native`. Les bibliothèques JNI Android `.so` restent conservées.

### Règle définitive pour les futurs sports

Un nouveau média sportif lourd ne doit pas être importé dans le bundle de base. Il doit entrer dans un Content Pack. Le build Android échoue volontairement si un futur ajout fait dépasser les budgets ci-dessus : cela évite de découvrir le problème au moment de l'upload Google Play.
