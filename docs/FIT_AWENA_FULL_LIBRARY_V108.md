# FIT PERF — AWENA FULL LIBRARY V108

## Objectif

Toutes les cartes d'exercices utilisent AWENA comme média pédagogique principal. Les médias provenant de Free Exercise DB et wger restent conservés comme **médias de référence** dans la fiche détaillée.

Chaque exercice doit finir avec :

- une vidéo AWENA dédiée : `awena-preview.webm` ;
- un vrai fond transparent / canal alpha ;
- un poster AWENA : `awena-poster.webp` ;
- quatre étapes pédagogiques : `awena-step-01.webp` à `awena-step-04.webp` ;
- les photos/vidéos externes déjà disponibles conservées en complément.

## Pipeline automatique

```bash
npm run fit:awena:queue -- --refresh
npm run fit:awena:run -- --workflow tools/comfyui/awena-exercise-api.json --comfy-output "CHEMIN_VERS_COMFYUI/output"
npm run fit:awena:index
npm run fit:awena:audit
```

### 1. `fit:awena:queue`

Recharge FIT PERF + Free Exercise DB + wger, applique la même déduplication conceptuelle, puis crée :

- `var/fit-awena/catalog.json`
- `var/fit-awena/comfyui-queue.json`
- `var/fit-awena/queue-report.json`

Un job contient automatiquement : nom, muscle, matériel, niveau, instructions, angle de caméra, prompt AWENA, prompt mouvement, prompts des 4 étapes, seed et médias de référence existants.

### 2. `fit:awena:run`

Pilote l'API locale ComfyUI (`http://127.0.0.1:8188` par défaut), charge l'image de référence AWENA et injecte les variables dans le workflow API exporté.

Le runner refuse une vidéo qui n'a pas de canal alpha vérifiable. Un workflow peut soit sortir directement `awena-preview.webm`, soit des PNG RGBA `awena-frame-XXXX.png`; dans ce second cas le runner encode automatiquement le WebM VP9 alpha avec FFmpeg.

Pour tester le câblage sans générer :

```bash
npm run fit:awena:run -- --dry-run --limit 3
```

Pour ne générer que quelques exercices :

```bash
npm run fit:awena:run -- --limit 10 --workflow tools/comfyui/awena-exercise-api.json --comfy-output "C:/ComfyUI/output"
```

### 3. `fit:awena:index`

Scanne les dossiers générés sous `public/fit/awena-library/` et reconstruit `index.json`.

### 4. `fit:awena:audit`

Produit :

- `var/fit-awena/awena-media-audit.json`
- `var/fit-awena/awena-media-audit.csv`

Le rapport distingue vidéo AWENA, alpha vérifié, poster, nombre d'étapes, vraies photos existantes et vraies vidéos existantes. Un exercice n'est `awenaComplete=true` que s'il possède vidéo + alpha + poster + au moins quatre images d'étapes.

## Convention de fichiers

```text
public/fit/awena-library/
  <exercise-id>/
    awena-preview.webm
    awena-poster.webp
    awena-step-01.webp
    awena-step-02.webp
    awena-step-03.webp
    awena-step-04.webp
    metadata.json
```

Le nom de dossier est dérivé de l'ID unique de l'exercice, pas seulement du nom. Deux variantes proches ne se partagent donc pas accidentellement la même vidéo.

## ComfyUI

Le runner est indépendant du modèle vidéo choisi. Il faut exporter le workflow AWENA déjà validé en **API format** dans `tools/comfyui/awena-exercise-api.json` et utiliser les placeholders décrits dans `tools/comfyui/README-AWENA-FULL-LIBRARY.md`.

Cela permet de changer ultérieurement Wan/LTX/autre modèle ou les nodes de détourage sans modifier le catalogue FIT PERF.
