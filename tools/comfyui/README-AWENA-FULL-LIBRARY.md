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

## V110 — drivers automatiques depuis les photos

Le catalogue Free Exercise DB contient surtout des photos de début/fin et peu de vidéos. C'était le principal blocage du batch précédent : sans vidéo guide, Wan Animate n'avait aucun mouvement à transférer.

V110 ajoute une étape automatique :

1. si une vraie vidéo guide existe, elle reste prioritaire ;
2. sinon, si au moins deux photos de l'exercice existent, FIT PERF télécharge les deux poses ;
3. FFmpeg construit automatiquement un clip A -> B -> A avec interpolation de mouvement ;
4. DWPose extrait le mouvement de ce clip ;
5. Wan Animate applique ce mouvement à AWENA ;
6. SAM2 détoure AWENA ;
7. le runner produit le WebM alpha + le poster + quatre étapes WebP.

Préparer les drivers à l'avance :

```bash
npm run fit:awena:queue -- --refresh
npm run fit:awena:drivers
```

Cette commande génère `var/fit-awena/driver-report.json`.

Elle est optionnelle : `npm run fit:awena:run` sait désormais fabriquer le driver photo automatiquement si aucun driver vidéo n'est disponible.

Pipeline recommandé :

```bash
npm run fit:awena:queue -- --refresh
npm run fit:awena:drivers
npm run fit:awena:run -- --limit 3 --overwrite
npm run fit:awena:index
npm run fit:awena:audit
```

Une fois les trois premiers rendus validés visuellement :

```bash
npm run fit:awena:run -- --overwrite
npm run fit:awena:index
npm run fit:awena:audit
```

Les exercices qui n'ont ni vidéo ni au moins deux photos restent volontairement dans `var/fit-awena/blocked-no-motion-driver.json`. Ils nécessiteront le dernier étage T2V/I2V de génération de mouvement, mais ils ne bloquent plus tous les exercices documentés par deux poses.

### Affichage transitoire dans l'application

Tant que le fichier AWENA d'un exercice n'a pas encore été produit, la bibliothèque réutilise temporairement sa meilleure vidéo/photo source au lieu d'afficher une carte vide. Dès que `public/fit/awena-library/<assetKey>/awena-preview.webm` existe, AWENA reprend automatiquement la priorité.
