# FIT PERF — AWENA COMPLETE / PARTIAL V113

Base stricte : `Darts-Counter-V7(43).zip`

## Objectif

V113 affine le registre V112 sans remettre en cause la règle principale : **aucun média AWENA déjà validé n'est remplacé automatiquement**.

Un exercice `APPROVED` possède maintenant aussi un niveau de complétude :

- `APPROVED COMPLETE` : vidéo + poster + au moins 4 vraies étapes pédagogiques. Aucune génération automatique n'est autorisée.
- `APPROVED PARTIAL` : au moins un média AWENA validé existe, mais un ou plusieurs composants manquent. Seuls les composants manquants peuvent être mis en file de génération.

## Règles de génération ciblée

- `APPROVED PARTIAL` avec poster/frames/steps mais sans vidéo : la queue motion crée un job `VIDEO_ONLY_SUPPLEMENT`. Le poster et les étapes validés ne sont pas régénérés ni écrasés.
- `APPROVED PARTIAL` avec vidéo mais moins de 4 étapes : la queue `fit:awena:steps:queue` crée un job `STEPS_ONLY_SUPPLEMENT`.
- `APPROVED COMPLETE` : absent de toutes les queues automatiques.
- `MISSING` : conserve le pipeline normal vidéo + poster en REVIEW, puis les 4 étapes dédiées avant première approbation.

## Approbation composant par composant

`npm run fit:awena:review -- --asset <assetKey> --approve`

Pour un pack déjà APPROVED PARTIAL, la commande copie uniquement les composants encore manquants depuis REVIEW vers le supplément generated APPROVED. Tout fichier APPROVED déjà présent provoque un refus d'écrasement, sauf `--force` explicite.

Les médias manuels restent prioritaires par composant. Un supplément généré APPROVED peut compléter une vidéo ou des étapes absentes, mais ne remplace jamais une vidéo/poster/étape manuelle existante.

## Audit V113

`npm run fit:awena:audit`

Ajoute :

- `approvedComplete`
- `approvedPartial`
- `missingVideo`
- `missingPoster`
- `missingSteps`
- `approvedGeneratedArtifacts`
- `reviewArtifacts`
- `rejectedArtifacts`

`rejectedArtifacts` compte les dossiers physiques rejetés indépendamment de l'état effectif de l'exercice. Ainsi un mauvais rendu Bench rejeté reste comptabilisé comme déchet même si le Bench manuel demeure `APPROVED COMPLETE`.

## Ordre conseillé après installation

```powershell
npm run fit:awena:registry -- --migrate-legacy
npm run fit:awena:audit
npm run fit:awena:queue -- --refresh
npm run fit:awena:steps:queue -- --refresh
npm run test:fit-awena-registry
npm run test:fit-awena-partial
```

Ne lancer aucun batch massif avant d'avoir vérifié les compteurs et les deux queues.
