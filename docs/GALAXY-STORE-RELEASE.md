# MULTISPORTS SCORING — GALAXY STORE RELEASE

## Architecture retenue

La version Galaxy Store utilise un package distinct :

`com.multisportsscoring.app.galaxy`

Cela évite qu'une mise à jour provenant d'un autre store écrase la version Galaxy. Le code Java/Capacitor conserve son namespace `com.multisportsscoring.app` ; seul `applicationId` change au moment du build.

## 1. Créer l'application Galaxy dans AdMob AVANT le build production

AdMob prend en charge Samsung Galaxy Store. Comme le package Galaxy est différent du package Google Play, crée une application AdMob Android distincte pour :

`com.multisportsscoring.app.galaxy`

Puis crée au minimum :
- 1 App ID Android AdMob ;
- 1 bloc bannière générique ;
- idéalement les 11 blocs bannière dédiés utilisés par MULTISPORTS SCORING.

Reporter les IDs dans :

`config/admob.galaxy.public.json`

Passer ensuite :

```json
"mode": "production"
```

Ne jamais inventer d'ID et ne jamais laisser les IDs Google de démonstration dans une release Galaxy.

## 2. Contrôle avant build

Depuis la racine du projet :

```powershell
npm run android:galaxy:check
```

Le contrôle doit terminer en vert.

## 3. Générer l'AAB Galaxy Store

```powershell
npm run android:galaxy:aab
```

Le fichier final est généré dans :

`android/app/build/outputs/galaxy/`

Le script produit aussi un fichier `.json` avec package, version, taille et SHA-256.

## 4. Seller Portal Samsung

Dans Galaxy Store Seller Portal :

1. Créer l'application Android.
2. Package attendu : `com.multisportsscoring.app.galaxy`.
3. Importer l'AAB généré.
4. Utiliser **Galaxy Store App Signing** pour l'AAB.
5. Vérifier dans les informations du binaire :
   - target API >= 33 ;
   - arm64 / 64 bits présent ;
   - compatibilité mémoire 16 KB affichée comme compatible.
6. Compléter fiche Store, captures, classification, confidentialité, pays/régions et publication.

## 5. Android Developer Verification (ADV)

Après que Samsung a généré/attribué la clé de signature Galaxy Store :

1. récupérer l'empreinte SHA-256 du certificat de signature Galaxy ;
2. ouvrir Android Developer Console / Android Developer Verification ;
3. enregistrer le package `com.multisportsscoring.app.galaxy` ;
4. enregistrer la clé/certificat de signature Galaxy Store ;
5. vérifier l'approbation avant distribution dans les pays concernés.

Cette étape devient critique à partir du 30 septembre 2026 au Brésil, en Indonésie, à Singapour et en Thaïlande.

## 6. AdMob après publication Galaxy

Une fois la fiche Galaxy Store publique :

1. ouvrir AdMob ;
2. sélectionner l'application Galaxy ;
3. lier la fiche Samsung Galaxy Store ;
4. attendre l'examen de préparation AdMob si nécessaire ;
5. vérifier les impressions et revenus dans AdMob.

Le panneau **Réglages > Publicité > AdMob** de MULTISPORTS SCORING expose désormais aussi les callbacks natifs `loaded`, `impression`, `click` et `paid` pour confirmer sur l'appareil que les vraies bannières travaillent.

## 7. Achats

Le build Galaxy désactive volontairement Google Play Billing. Les bannières AdMob fonctionnent indépendamment.

Les achats seront réactivés uniquement après intégration de **Samsung IAP** et de la vérification serveur correspondante.
