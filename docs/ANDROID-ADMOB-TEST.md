# MULTISPORTS SCORING — Android AdMob TEST + UMP

## État de ce patch

Le code React est maintenant raccordé au plugin natif `@capacitor-community/admob` via le runtime Capacitor.

Par sécurité, les annonces Android utilisent par défaut uniquement les identifiants de démonstration Google :

- App ID Android test : `ca-app-pub-3940256099942544~3347511713`
- Bannière test : `ca-app-pub-3940256099942544/6300978111`
- Interstitiel test : `ca-app-pub-3940256099942544/1033173712`
- Rewarded test : `ca-app-pub-3940256099942544/5224354917`

Ces identifiants ne monétisent rien et sont destinés au développement.

## Création / mise à jour du shell Android

```bash
npm run android:bootstrap
```

Ce script :

1. installe Capacitor 8.4.2 ;
2. installe `@capacitor-community/admob` 8.0.0 ;
3. crée `android/` s'il n'existe pas ;
4. construit la PWA ;
5. synchronise Capacitor ;
6. ajoute l'App ID AdMob dans `AndroidManifest.xml` / `strings.xml` ;
7. resynchronise Android.

Puis :

```bash
npm run android:open
```

## Flux UMP

Au démarrage natif Android :

1. initialisation AdMob ;
2. `requestConsentInfo()` ;
3. formulaire UMP si nécessaire ;
4. vérification `canRequestAds` ;
5. seulement ensuite chargement des bannières/interstitiels/rewarded.

Dans Settings > Publicité & Premium, l'état natif AdMob/UMP peut être contrôlé et les options de confidentialité peuvent être rouvertes.

## Passage futur en production

Ne pas passer en production tant que l'application AdMob et ses vrais blocs ne sont pas créés.

Variables Vite prévues :

```env
VITE_ADMOB_TEST_MODE=0
VITE_ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXX~YYYYYYYY
VITE_ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXX/BBBBBBBB
VITE_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-XXXXXXXX/IIIIIIII
VITE_ADMOB_ANDROID_REWARDED_ID=ca-app-pub-XXXXXXXX/RRRRRRRR
```

Et pour le manifeste Android :

```bash
ADMOB_ANDROID_APP_ID="ca-app-pub-XXXXXXXX~YYYYYYYY" npm run android:configure-admob
npm run android:sync
```

Le code retombe volontairement sur les identifiants Google TEST si `VITE_ADMOB_TEST_MODE=0` mais que l'un des vrais IDs manque.
