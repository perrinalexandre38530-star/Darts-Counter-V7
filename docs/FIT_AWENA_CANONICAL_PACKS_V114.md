# FIT AWENA V114 — canonical packs + dedicated step runner

Base: Darts-Counter-V7(62).zip

## Canonical AWENA packs
Multiple catalogue exercises may represent the same AWENA media pack. V114 maps aliases to one canonical pack key.

Example:
- `curl` / `Curl biceps`
- `fedb:Barbell_Curl` / `Barbell Curl`

Both resolve to canonical pack `curl`. Queue builders deduplicate by canonical key and preserve the catalogue aliases in each job.

## Queue policy
- APPROVED COMPLETE: never queued.
- APPROVED PARTIAL: only missing components are queued.
- REVIEW: never queued automatically.
- REJECTED: retry only with the explicit retry flag.
- Generated motion output always goes to REVIEW.
- Dedicated step output always goes to REVIEW.

## Dedicated pedagogical steps
`fit:awena:steps:run` is a separate ComfyUI image pipeline. It does not extract arbitrary frames from a motion video.

The user must export an image workflow in API format to:
`tools/comfyui/awena-step-api.json`

See `tools/comfyui/AWENA_STEP_WORKFLOW.md` for supported placeholders.

After visually reviewing the four generated images:
1. `npm run fit:awena:steps:ready -- --asset <canonicalKey>`
2. `npm run fit:awena:review -- --asset <canonicalKey> --approve`
