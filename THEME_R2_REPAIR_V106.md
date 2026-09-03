# V106 - réparation sûre des textures R2

## Ce patch ne remet PAS les 110 textures dans Android

Les 82 textures absentes sont restaurées temporairement depuis l'historique Git dans `.mss-theme-restore/`, dossier ignoré par Git. Le pack complet est ensuite construit dans `.mss-content-packs-build/theme-textures` (temporaire et ignoré par Git), publié vers R2 sous une **nouvelle version immutable `2026.09.03.2`**, puis contrôlé via le Worker public.

## Commande unique

Dans le dépôt Git complet `Darts-Counter-V7-GIT` :

```powershell
npm run themes:repair-pack
```

La commande doit aller jusqu'à :

- 110 textures référencées ;
- 110 textures dans le pack local ;
- upload R2 `theme-textures/2026.09.03.2` ;
- vérification Worker **110/110**.

Si une étape échoue, ne commit/push pas encore. Corriger l'erreur puis relancer la même commande.

## Après succès

```powershell
npm run test:content-packs
git status
```

Le fichier `src/lib/contentPackCatalog.generated.ts` doit être modifié : c'est normal, il contient la nouvelle version et la liste complète des textures.

## Audit d'allègement suivant (lecture seule)

Après un build Android préparé :

```powershell
npm run android:externalization-audit
```

Cette commande ne supprime rien. Elle liste seulement les médias encore locaux à externaliser dans la phase suivante.
