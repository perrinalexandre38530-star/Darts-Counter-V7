# MULTISPORTS SCORING — Google Play test

Version de référence : **1.0.0-rc2**  
Code Google Play : **3**

## Source unique de version

La référence officielle du projet est :

`config/release-version.json`

Elle alimente automatiquement :

- `package.json` ;
- `package-lock.json` ;
- `android/app/build.gradle` ;
- le template Android `android/app/src/build.gradle` ;
- la documentation de version.

Pour réaligner le projet à tout moment :

```powershell
npm run version:sync
npm run version:check
```

## Identité Android figée

- Application : **MULTISPORTS SCORING**
- Package : `com.multisportsscoring.app`
- Version actuellement présente sur Google Play : `versionCode 3`, `versionName 1.0.0-rc2`
- Artefact : Android App Bundle (`.aab`)

## Construire l’AAB signé

```powershell
npm run android:play:aab
```

Le résultat attendu est :

`android/app/build/outputs/bundle/release/app-release.aab`

Les `.aab`, `.apk`, dossiers `releases/` et clés de signature restent locaux et sont ignorés par Git.

## Prochaine Release Candidate

Le prochain bundle Google Play devra utiliser un `versionCode` strictement supérieur à 3. Pour RC3 :

```powershell
npm run android:version -- 4 1.0.0-rc3
npm run version:check
npm run android:play:aab
```

La commande `android:version` met désormais à jour la source unique puis synchronise toutes les copies. Ne plus modifier `versionCode`, `versionName` ou `package.json` séparément.

## Clé d’upload

Conserver localement :

- `android/upload-keystore.jks` ;
- `android/key.properties`.

Ne jamais envoyer ces fichiers sur GitHub ou dans un ZIP public. Ne jamais recréer une nouvelle clé d’upload à chaque version.
