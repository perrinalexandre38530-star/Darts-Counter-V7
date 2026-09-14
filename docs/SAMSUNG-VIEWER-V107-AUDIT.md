# Samsung Viewer V107 — audit d'alignement

Chaîne cible :

**Téléphone Android/PWA → Worker `dc-online-v3` → KV `DC_SYNC` → Samsung TV Tizen**

## Correctifs V107 alignés

- L'entrée **Réglages > Cast / Viewer** ouvre directement l'onglet **VIEWER**.
- L'écran **Écrans** ouvre par défaut le Viewer lorsque aucun onglet explicite n'est demandé.
- La création d'une session Viewer force **Publication automatique = ON**.
- Le code Samsung TV de 6 caractères est affiché en grand et peut être copié.
- Les textes distinguent clairement :
  - **Samsung TV** = saisie du code 6 caractères ;
  - **tablette** = lien / QR code.
- En Android/Capacitor/Tizen, le QR code n'utilise plus `https://localhost`; il pointe vers l'origine Pages publique.
- X01 publie déjà les snapshots via `sendCastSnapshot`, et `googleCast.ts` les relaie au Viewer même sans session Google Cast active.
- La TV Samsung récupère les snapshots via `ViewerDisplay`.

## Vérification

```powershell
npm run test:viewer:samsung
npm run deploy:online
npm run tv:samsung:build
npm run tv:samsung:check
```

Puis sur le téléphone :

1. **Écrans**
2. **VIEWER**
3. **Créer session**
4. relever le code 6 caractères
5. saisir ce code sur la Samsung TV
6. lancer X01 et entrer quelques scores

Le diagnostic Viewer doit ensuite afficher `viewer_publish_ok`.
