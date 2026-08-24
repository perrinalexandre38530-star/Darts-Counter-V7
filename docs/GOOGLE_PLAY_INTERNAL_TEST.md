# MULTISPORTS SCORING — Google Play test

Version de référence : **1.0.0-rc11**  
Code Google Play : **12**

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
- Version candidate préparée dans ce projet : `versionCode 10`, `versionName 1.0.0-rc9`
- Artefact : Android App Bundle (`.aab`)

## Construire l’AAB signé

```powershell
npm run android:play:aab
```

Le résultat attendu est :

`android/app/build/outputs/bundle/release/app-release.aab`

Les `.aab`, `.apk`, dossiers `releases/` et clés de signature restent locaux et sont ignorés par Git.

## Release Candidate actuelle

Cette base est préparée pour **RC9** avec `versionCode 10` (mise à jour THÈMES + AUDIO). Avant l’envoi sur Google Play, ce code doit rester strictement supérieur au plus grand `versionCode` déjà téléversé dans Play Console.

```powershell
npm run version:check
npm run android:play:aab
```

La commande `android:version` met désormais à jour la source unique puis synchronise toutes les copies. Ne plus modifier `versionCode`, `versionName` ou `package.json` séparément.

## Clé d’upload

Conserver localement :

- `android/upload-keystore.jks` ;
- `android/key.properties`.

Ne jamais envoyer ces fichiers sur GitHub ou dans un ZIP public. Ne jamais recréer une nouvelle clé d’upload à chaque version.
