# AWENA dedicated pedagogical step workflow (V117)

This is a **one-time ComfyUI setup**, not a per-exercise manual workflow.
After `tools/comfyui/awena-step-api.json` exists, `npm run fit:awena:steps:run`
generates all queued step stills automatically.

## Non-negotiable output requirements

Each run creates ONE **new** instructional still:
- exact AWENA identity from `__AWENA_REFERENCE__`;
- full body visible from hair to soles;
- generous empty margin around body AND equipment;
- true RGBA / transparent alpha output;
- complete equipment. For paired dumbbells, BOTH full dumbbells must exist and be visible;
- no cropped hands, feet, weights, bar, bench or machine;
- no text or watermark;
- biomechanically correct pose matching `__STEP_PROMPT__`.

Existing approved frames/video may be used only as a pose/motion reference. V117 never
copies them into final `awena-step-XX.webp` files because their defects would be propagated.

## API file

Export the image workflow in API format to:
`tools/comfyui/awena-step-api.json`

Supported tokens:
- `__AWENA_REFERENCE__`
- `__MOTION_REFERENCE__`
- `__STEP_PROMPT__`
- `__STEP_INDEX__`
- `__STEP_SEED__`
- `__STEP_OUTPUT_PREFIX__`
- `__ASSET_KEY__`

The SaveImage-like output should include `__STEP_OUTPUT_PREFIX__` in its filename prefix.

## Automatic gates

V117 checks alpha, visible-subject coverage, safety margins and pose diversity. If those
checks fail, metadata gets `technicalQuality.pass=false`, `stepGuide.status` is NOT `READY`,
and `fit:awena:review -- --approve` refuses publication.

Equipment semantics still require the human REVIEW checkpoint; automatic generation is
fully batched, but approval remains intentionally guarded.
