# FIT PERF · AWENA-WAN batch

Le workflow API fourni dans ce dossier est maintenant adapté directement depuis le workflow ComfyUI AWENA push-up validé.

Fichier prêt à utiliser :

`tools/comfyui/awena-exercise-api.json`

## Ce que le batch remplace automatiquement

Pour chaque exercice :

- l'image d'identité du node `LoadImage` devient la référence AWENA ;
- la vidéo du node `LoadVideo` devient la vidéo de mouvement propre à l'exercice ;
- le prompt positif et le prompt négatif sont générés depuis le catalogue ;
- les seeds sont déterministes ;
- le nom de sortie est rattaché à l'ID de l'exercice.

Le workflow conserve Wan Animate + DWPose + SAM2. Une seconde segmentation SAM2 est ajoutée sur les frames AWENA finales. Le runner récupère ensuite séparément les frames RGB et leurs mattes, puis fabrique lui-même :

- `awena-preview.webm` en VP9 avec véritable alpha ;
- `awena-poster.webp` transparent ;
- `awena-step-01.webp` à `awena-step-04.webp`, extraits de quatre instants du mouvement AWENA afin qu'ils correspondent exactement à la vidéo.

Cela évite de générer quatre séries d'images indépendantes et garantit la cohérence visage / tenue / position entre la vidéo et les étapes.

## Point essentiel : vidéo de mouvement

Le workflow fourni n'est pas un workflow text-to-video. Il reproduit le mouvement d'une vidéo guide avec DWPose. Dans le workflow push-up original, cette entrée était `Pompes à main large - Guide vidéo Lyfta.mp4`.

Le runner cherche automatiquement un driver dans cet ordre :

1. `--driver <fichier>` pour un test manuel ;
2. `var/fit-awena/drivers/<assetKey>.mp4|webm|mov|mkv` ;
3. les vidéos déjà connues dans le catalogue FIT PERF / wger.

Les vidéos distantes sont téléchargées puis envoyées automatiquement à ComfyUI via son API. Il n'y a plus besoin de modifier le node `LoadVideo` à la main.

Les exercices sans aucune vidéo de mouvement sont placés dans :

`var/fit-awena/blocked-no-motion-driver.json`

Ils ne reçoivent volontairement pas un mouvement approximatif. Ils constitueront le second lot à traiter avec un générateur automatique de driver I2V/T2V avant de repasser dans ce workflow AWENA-WAN.

## Test recommandé

ComfyUI doit être lancé et accessible sur `http://127.0.0.1:8188`.

```bash
npm run fit:awena:queue -- --refresh
npm run fit:awena:run -- --match "push" --limit 1 --driver "C:/chemin/Pompes à main large - Guide vidéo Lyfta.mp4" --overwrite
```

Aucun chemin vers le dossier output ComfyUI n'est obligatoire : le runner sait récupérer les frames via `/view`.

Si le détourage est inversé (AWENA transparente et fond visible), relancer avec :

```bash
npm run fit:awena:run -- --match "push" --limit 1 --driver "C:/chemin/video.mp4" --overwrite --invert-mask
```

Puis :

```bash
npm run fit:awena:index
npm run fit:awena:audit
```
