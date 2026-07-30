# MULTISPORTS SCORING — Passage AdMob en production

## 1. Créer l'application AdMob

Créer l'application Android avec le package exact :

```text
com.multisportsscoring.app
```

Nom public :

```text
MULTISPORTS SCORING
```

## 2. Créer les blocs

Blocs minimum obligatoires :

- une bannière générique ;
- un interstitiel de fin de partie ;
- un rewarded.

Pour suivre précisément les revenus, créer aussi une bannière par emplacement :

- HOME ;
- MESSAGES ;
- PROFILS ;
- JEUX ;
- COMPÉTITIONS ;
- ONLINE ;
- STATS ;
- HISTORIQUE ;
- RÉGLAGES ;
- ÉCRANS.

Les blocs par emplacement sont optionnels dans le code : lorsqu'un ID manque, la bannière générique est utilisée.

## 3. Configurer d'abord `real_test`

Ne jamais passer directement aux annonces réelles sur le téléphone de développement.

```env
VITE_ADMOB_MODE=real_test
VITE_ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY
VITE_ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB
VITE_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII
VITE_ADMOB_ANDROID_REWARDED_ID=ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR
VITE_ADMOB_ANDROID_TEST_DEVICE_IDS=ID_DU_TELEPHONE
VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY=EEA
```

Ajouter ensuite les IDs spécifiques souhaités :

```env
VITE_ADMOB_ANDROID_BANNER_HOME_ID=
VITE_ADMOB_ANDROID_BANNER_MESSAGES_ID=
VITE_ADMOB_ANDROID_BANNER_PROFILES_ID=
VITE_ADMOB_ANDROID_BANNER_GAMES_ID=
VITE_ADMOB_ANDROID_BANNER_COMPETITIONS_ID=
VITE_ADMOB_ANDROID_BANNER_ONLINE_ID=
VITE_ADMOB_ANDROID_BANNER_STATS_ID=
VITE_ADMOB_ANDROID_BANNER_HISTORY_ID=
VITE_ADMOB_ANDROID_BANNER_SETTINGS_ID=
VITE_ADMOB_ANDROID_BANNER_SCREENS_ID=
```

## 4. Créer le message UMP dans AdMob

Dans `Confidentialité et messages`, publier au minimum le message destiné à l'EEE/Royaume-Uni/Suisse. Sans message correspondant à l'App ID Android, le SDK ne peut pas afficher le formulaire attendu.

Tester :

- premier lancement ;
- acceptation ;
- refus ;
- réouverture des options depuis Réglages ;
- absence de demande publicitaire tant que `canRequestAds` est faux.

## 5. Générer `app-ads.txt`

Renseigner :

```env
ADMOB_PUBLISHER_ID=pub-XXXXXXXXXXXXXXXX
```

Puis :

```bash
npm run admob:app-ads
```

Le fichier créé est :

```text
public/app-ads.txt
```

Il contiendra :

```text
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Le domaine qui héberge ce fichier doit être le même que le site développeur déclaré dans la fiche Google Play.

## 6. Basculer en production

Seulement après validation de `real_test` :

```env
VITE_ADMOB_MODE=production
VITE_ADMOB_ANDROID_TEST_DEVICE_IDS=
VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY=DISABLED
```

Puis :

```bash
npm run android:sync
npm run android:release-check
```

Le contrôle bloque la release si :

- un ID est manquant ou mal formé ;
- un bloc n'appartient pas au même Publisher ID ;
- un ID de démonstration Google reste présent ;
- un appareil de test est encore injecté ;
- l'App ID Android ne correspond pas au `.env` ;
- `public/app-ads.txt` est absent ou incohérent.
