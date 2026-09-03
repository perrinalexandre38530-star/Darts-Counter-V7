# V107 — upload R2 S3 sécurisé

V107 ne modifie ni les thèmes, ni Android, ni le catalogue. Il remplace seulement le transport d'upload des content packs.

Si les variables suivantes existent, `tools/upload-content-packs.mjs` utilise directement l'API S3 Cloudflare R2 :

- `MSS_R2_ACCESS_KEY_ID`
- `MSS_R2_SECRET_ACCESS_KEY`
- `MSS_R2_ACCOUNT_ID` (facultatif : sinon lu depuis `wrangler.online.toml`)

Le fallback Wrangler reste disponible si aucune clé S3 n'est définie.

Pour le pack thème V106 :

```powershell
$env:MSS_R2_ACCESS_KEY_ID="VOTRE_ACCESS_KEY_ID"
$env:MSS_R2_SECRET_ACCESS_KEY="VOTRE_SECRET_ACCESS_KEY"
npm run themes:repair-pack
```

Ne jamais committer les clés et ne jamais les envoyer dans un chat.
