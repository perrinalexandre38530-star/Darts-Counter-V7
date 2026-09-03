# V104 — réparation textures thèmes + heartbeat

## Cause
`themePresets.ts` référence 110 textures mais le pack publié n'en contient plus que 30. 82 textures historiques sont donc en 404.

## Réparation exacte des textures originales
Dans le dépôt Git complet :

```powershell
npm run themes:repair-pack
```

La commande récupère les images originales depuis l'historique Git dans `.mss-theme-restore/theme-textures`, reconstruit les content packs, puis republie uniquement `theme-textures` vers R2.

Ensuite commit/push les fichiers texte modifiés et `src/lib/contentPackCatalog.generated.ts` régénéré. Le dossier `.mss-theme-restore` ne doit pas être commité.

## Supabase
Le client utilise temporairement `ms_update_presence`, RPC déjà déployé, afin de supprimer le POST 404 répétitif de `ms_community_heartbeat`. La migration `supabase/migrations/20260902143000_online_community_pulse_v1.sql` reste la cible backend définitive.
