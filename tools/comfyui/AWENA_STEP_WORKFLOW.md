# AWENA dedicated pedagogical step workflow (V114)

Export a ComfyUI **image** workflow in API format to `tools/comfyui/awena-step-api.json`.
The workflow must create ONE clean instructional still per run and save it with a SaveImage-like output.

Supported tokens:
- `__AWENA_REFERENCE__` : uploaded AWENA identity reference image
- `__MOTION_REFERENCE__` : optional authoritative exercise video/reference uploaded by the runner
- `__STEP_PROMPT__` : dedicated pedagogical pose prompt
- `__STEP_INDEX__` : 1..4
- `__STEP_SEED__` : deterministic seed
- `__STEP_OUTPUT_PREFIX__` : unique SaveImage filename prefix
- `__ASSET_KEY__` : canonical AWENA pack key

The output is always written to REVIEW. `npm run fit:awena:steps:ready -- --asset <key>` is an explicit human checkpoint after visual inspection; only then may `fit:awena:review -- --asset <key> --approve` promote the missing steps.
