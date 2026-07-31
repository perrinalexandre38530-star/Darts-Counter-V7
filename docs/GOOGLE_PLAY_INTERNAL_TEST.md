# MULTISPORTS SCORING — Google Play test interne

## Identité Android figée

- Application : **MULTISPORTS SCORING**
- Package : `com.multisportsscoring.app`
- Première version Play : `versionCode 1`, `versionName 1.0.0-rc1`
- Artefact : Android App Bundle (`.aab`)

Dès le premier artefact importé dans Play Console, le package ID est fixé pour cette application.

## 1. Créer UNE FOIS la clé d'upload

Dans PowerShell à la racine du projet :

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\create-android-upload-key.ps1
```

Le script crée localement :

- `android/upload-keystore.jks`
- `android/key.properties`

Ces deux fichiers sont ignorés par Git. Ne jamais les envoyer dans un ZIP public, GitHub, Slack ou un ticket. Sauvegarder la clé et son mot de passe séparément et durablement.

## 2. Construire l'AAB signé

```powershell
npm run android:play:aab
```

Le résultat attendu est :

`android/app/build/outputs/bundle/release/app-release.aab`

La commande vérifie TypeScript, la whitelist Store V1, AdMob, Billing, la signature et le certificat de l'AAB.

## 3. Importer dans Google Play Console

Créer l'application **MULTISPORTS SCORING**, puis :

`Tester et publier > Tests > Tests internes > Créer une version`

Importer `app-release.aab`, ajouter la liste de testeurs et lancer le déploiement interne. Google Play App Signing doit rester activé (recommandé).

## 4. Version suivante

Chaque nouvel AAB destiné à Google Play doit avoir un `versionCode` supérieur. Exemple :

```powershell
npm run android:version -- 2 1.0.0-rc2
npm run android:play:aab
```

Puis RC3 :

```powershell
npm run android:version -- 3 1.0.0-rc3
npm run android:play:aab
```

Ne jamais recréer une nouvelle clé d'upload à chaque version.
