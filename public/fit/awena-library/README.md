# FIT PERF — AWENA generated exercise library

Each generated exercise owns one deterministic directory:

`/fit/awena-library/<exercise-id-sanitized>/`

Expected files:

- `awena-preview.webm` — AWENA demonstration loop with a real alpha channel.
- `awena-poster.webp` — library/detail poster.
- `awena-step-01.webp` … `awena-step-04.webp` — detailed instructional positions.
- `metadata.json` — exercise ID, generation timestamp and provenance of preserved reference media.

Generate the catalogue queue with `npm run fit:awena:queue`, run ComfyUI with `npm run fit:awena:run -- ...`, then rebuild the media index with `npm run fit:awena:index` and verify coverage with `npm run fit:awena:audit`.
