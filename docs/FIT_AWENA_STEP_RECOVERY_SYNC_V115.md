# FIT AWENA V115 — Local step recovery + synchronized catalogue snapshot

## Why V115 exists

V114 correctly canonicalized aliases (for example `fedb:Barbell_Curl` and native `curl` share the same AWENA `curl` pack), but two operational gaps remained:

1. `fit:awena:steps:run` required `tools/comfyui/awena-step-api.json` even when an APPROVED manual AWENA pack already contained enough trusted visual material to prepare pedagogical steps without generating anything new.
2. Running `registry/audit` from cache and then `queue -- --refresh` could fetch newer wger rows and produce different catalogue counts in the same operator session.

## V115 policies

- APPROVED manual media remains authoritative.
- For APPROVED PARTIAL packs missing steps:
  - `APPROVED_MANUAL_FRAMES`: reuse four phase-spaced frames from the existing APPROVED curated frame sequence. Output goes to REVIEW.
  - `APPROVED_VIDEO_PHASE_FRAMES`: extract four phase checkpoints from the existing APPROVED manual motion video. Output goes to REVIEW.
  - `COMFYUI_DEDICATED_STILLS`: only this strategy requires `tools/comfyui/awena-step-api.json`.
- No locally prepared step is auto-published. Human review is still mandatory.
- REVIEW and REJECTED remain non-renderable.

## Commands

Refresh once and rebuild all AWENA state from the exact same cached catalogue snapshot:

```powershell
npm run fit:awena:sync
```

Prepare current step jobs:

```powershell
npm run fit:awena:steps:run -- --overwrite
```

For V63's known manual partial packs this prepares REVIEW candidates for `curl` and `squat` without requiring a ComfyUI image workflow.

The dedicated image workflow is still required later for jobs whose strategy is `COMFYUI_DEDICATED_STILLS`.
