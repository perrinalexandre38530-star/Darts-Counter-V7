# MULTISPORTS SCORING — AdMob Android : TEST SÛR + UMP

## Modes disponibles

La configuration ne repose plus sur un simple interrupteur ambigu. Trois modes sont prévus :

```env
VITE_ADMOB_MODE=google_test
```

- `google_test` : App ID et blocs de démonstration Google. Aucun revenu, aucun risque de trafic invalide.
- `real_test` : vrais IDs AdMob, mais uniquement sur les téléphones déclarés comme appareils de test.
- `production` : vrais IDs, sans appareils de test injectés dans le build public.

Si un mode réel est incomplet ou incohérent, le runtime retombe sur `google_test`. Le contrôle de release bloque néanmoins une publication production incomplète.

## Test initial — IDs Google

```env
VITE_ADMOB_MODE=google_test
VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY=DISABLED
```

IDs utilisés automatiquement :

- App ID : `ca-app-pub-3940256099942544~3347511713`
- Bannière adaptive/inline : `ca-app-pub-3940256099942544/9214589741`
- Interstitiel : `ca-app-pub-3940256099942544/1033173712`
- Rewarded : `ca-app-pub-3940256099942544/5224354917`

## Tester les vrais blocs sans générer de trafic réel

Après création de l'application et des blocs dans AdMob :

```env
VITE_ADMOB_MODE=real_test
VITE_ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY
VITE_ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB
VITE_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII
VITE_ADMOB_ANDROID_REWARDED_ID=ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR
VITE_ADMOB_ANDROID_TEST_DEVICE_IDS=33BE2250B43518CCDA7DE426D04EE231
VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY=EEA
```

Pour récupérer l'ID du téléphone :

1. lancer une première requête publicitaire ;
2. ouvrir Logcat dans Android Studio ;
3. rechercher `setTestDeviceIds` ;
4. copier l'identifiant affiché ;
5. reconstruire l'application avec cet ID.

Le pont React et le plugin Android inline utilisent la même liste d'appareils de test. Les vrais blocs peuvent donc être testés en conservant le libellé `Annonce test`.

## Consentement UMP

À chaque démarrage Android :

1. initialisation du SDK AdMob ;
2. actualisation du statut UMP ;
3. affichage du formulaire si nécessaire ;
4. vérification `canRequestAds` ;
5. chargement des annonces seulement ensuite.

Dans `Réglages > Publicité & Boutique`, le bouton **Confidentialité** s'active lorsque Google exige un point d'entrée permettant de modifier les choix.

`VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY=EEA` fonctionne dans `google_test` et `real_test` lorsqu’un ID de téléphone est fourni. Il est automatiquement désactivé par le runtime en production.

## Commandes

```bash
npm run android:sync
npm run test:admob-native
npm run android:release-check
```

`android:sync` génère aussi `app-ads.txt` lorsque le Publisher ID est disponible, construit la PWA, synchronise Capacitor, injecte l'App ID Android puis exécute les contrôles de release.


## Appareil de test SDK — Samsung de développement

Le mode `real_test` inclut explicitement l’identifiant Google Mobile Ads SDK suivant :

```text
AD2A12F3E08C12ABDD574BC06097D62C
```

Il est transmis à `RequestConfiguration.setTestDeviceIds(...)` en plus de l’enregistrement dans la console AdMob. Cette protection doit rester absente du mode `production`.
