# Workflow ComfyUI — contrat FIT PERF AWENA FULL LIBRARY

Le runner `tools/run-comfyui-awena-batch.mjs` pilote un workflow ComfyUI exporté en **API format**.

Place le workflow validé ici :

`tools/comfyui/awena-exercise-api.json`

Le workflow doit utiliser la référence d'identité AWENA et produire, pour chaque exercice :

- `awena-preview.webm` avec **vrai canal alpha** ;
- `awena-poster.webp` ;
- `awena-step-01.webp` à `awena-step-04.webp`.

## Placeholders reconnus

Dans les inputs des nodes du workflow API, remplace les valeurs variables par :

- `__AWENA_REFERENCE__`
- `__POSITIVE_PROMPT__`
- `__NEGATIVE_PROMPT__`
- `__MOTION_PROMPT__`
- `__STEP_1_PROMPT__` … `__STEP_4_PROMPT__`
- `__SEED__`
- `__EXERCISE_NAME__`
- `__ASSET_KEY__`
- `__VIDEO_PREFIX__`
- `__POSTER_PREFIX__`
- `__STEP_1_PREFIX__` … `__STEP_4_PREFIX__`

Le runner refuse d'intégrer une vidéo qui ne possède pas d'alpha vérifiable. Si le workflow produit plutôt une séquence PNG RGBA nommée `awena-frame-0001.png`, `awena-frame-0002.png`, etc., le runner l'encode automatiquement en VP9 WebM `yuva420p`.

## Workflow conseillé

1. Load Image `__AWENA_REFERENCE__`.
2. Identity / reference adapter pour verrouiller AWENA.
3. Génération des 4 poses avec les `__STEP_X_PROMPT__`.
4. Image-to-video / motion model piloté par `__MOTION_PROMPT__`.
5. Background removal / alpha matting **dans ComfyUI**.
6. Sortie vidéo alpha ou séquence PNG RGBA.
7. Save Image des 4 étapes avec les préfixes fournis.
8. Save Image du poster avec `__POSTER_PREFIX__`.

Le workflow exact dépend des modèles et custom nodes installés dans ton ComfyUI : le runner est volontairement indépendant de Wan/Kling/LTX/etc. et réutilise ton workflow AWENA déjà validé.
