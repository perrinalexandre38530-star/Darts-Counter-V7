# MULTISPORTS SCORING — état Android (référence main / RC9)

Version de référence : **1.0.0-rc11**  
Code Google Play : **12**

## Identité
- App: `MULTISPORTS SCORING`
- Package: `com.multisportsscoring.app`
- Capacitor: `8.4.2`
- Web assets: `dist`

## SDK Android
- minSdk: 24
- compileSdk: 36
- targetSdk: 36
- AGP: 8.13.0
- Gradle wrapper: 8.14.3

## Store V1 Android
Restriction uniquement dans le runtime Android Capacitor. Le Web/PWA conserve les fonctions DEV/BETA.

Sports publics V1: Darts, Baby-foot, Pétanque.

Darts publics V1: X01, Cricket, Killer, Shanghai, Training X01, Tour de l'horloge, Les 5 vies, Golf, Territories (`departements`), Capital, Loterie, Attrape-moi si tu peux, Killer Progressif, Baseball.

BottomNav Android V1: Online/Messages masqués ; Compétitions et Écrans/Cast conservés.

## Publicités Android
Le ZIP 19 possède le plugin natif `InlineAdMobPlugin`: les annonces Google restent intégrées aux surfaces React, jamais flottantes au-dessus de la BottomNav.
La branche reste volontairement sur Google Mobile Ads SDK 24.9.0 pour conserver la compatibilité du plugin déjà intégré pendant la stabilisation Android. Une migration GMA v25 sera traitée séparément après validation fonctionnelle de l'APK.

## Pipeline natif sûr
`npm run android:sync` effectue: build Vite → `cap sync android` → configuration AdMob → configuration Play Billing → release-check.

## APK de test
- local: `npm run android:build:debug`
- GitHub Actions: workflow `MULTISPORTS SCORING - Android Debug APK`

Le build release signé/AAB sera finalisé après validation de l'APK debug sur appareils réels.
