# FIT PERF — AWENA APPROVAL PIPELINE V112

Base: `Darts-Counter-V7(37).zip`

## Why V112 exists

The first automated WAN test proved that a technically valid alpha channel does not mean the generated exercise is visually valid. It also showed that a manual AWENA Bench Press pack already present in the project could be regenerated unnecessarily.

V112 changes the generation contract so no raw generated media can replace a validated AWENA asset.

## Statuses

- `APPROVED`: safe/renderable. Manual AWENA packs are authoritative. Generated packs require explicit human approval.
- `REVIEW`: generation completed and passed basic technical checks but is not visible in the app.
- `MISSING`: no validated AWENA media yet.
- `REJECTED`: failed technical QA or was explicitly rejected.

## Manual media protection

The current hand-authored premium packs are detected before generation. Bench Press, Push Up, Burpee, Squat and Curl media already present in the project are protected according to the installed video/frame assets. The queue skips APPROVED media by default.

## Generated media gate

WAN output goes to:

`public/fit/awena-library/review/<assetKey>/`

The app resolves generated media only from:

`public/fit/awena-library/approved/<assetKey>/`

Therefore REVIEW and REJECTED outputs cannot appear on exercise cards or detail pages.

## Quality checks

The batch runner now checks sampled segmentation masks and RGB frames for obvious failures including:

- subject/mask almost absent;
- mask covering almost the complete frame;
- extreme mask-size instability over time;
- subject repeatedly touching/crossing the frame edges;
- strong horizontal banding/corruption.

Technical QA still does NOT replace human visual validation. Every technically valid generation remains REVIEW.

## Step images

Video frames are no longer silently promoted to `awena-step-XX.webp`.

The video batch outputs only `review-keyframes/candidate-XX.webp` for inspection. Final pedagogical step images must be created by a dedicated image workflow using the semantic step prompts in `var/fit-awena/step-queue.json`.

A generated pack cannot be APPROVED unless four real step images exist and `stepGuide.status` has been marked `READY`.

## Long WAN jobs / resume

Default ComfyUI timeout is now 180 minutes and configurable with:

`--timeout-minutes <minutes>` or `COMFYUI_TIMEOUT_MINUTES`.

Each submitted prompt is stored in `var/fit-awena/inflight/<assetKey>.json`. Re-running the same batch command resumes/waits for the existing ComfyUI prompt when possible instead of starting the expensive WAN generation again.

Use `--no-resume` only when intentionally forcing a new prompt.
