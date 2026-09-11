# AWENA image-first pilot — one-time ComfyUI setup

The V118 pilot no longer sends the full exercise catalogue directly to WAN video.
It first produces four AWENA stills per exercise from a two-panel guide image:

- LEFT = authoritative AWENA identity/outfit reference
- RIGHT = exercise pose/equipment reference extracted automatically from catalogue video/photos

## One-time ComfyUI action

1. In ComfyUI, open the official **fast / distilled 4B image editing** template for FLUX.2 Klein (not the base 20-step template).
2. Use the installed local models already detected on this machine (the runner also forces these names at API execution):
   - diffusion model: `flux-2-klein-4b-fp8.safetensors`
   - text encoder: `qwen_3_4b_fp4_flux2.safetensors`
   - VAE: `flux2-vae.safetensors`
3. Connect the template IMAGE output to one **Save Image / Enregistrer l'image** node.
4. `Graphe > Exporter (API)` and save exactly as:
   `tools/comfyui/awena-image-api.json`

No placeholders have to be edited manually. The runner also forces the distilled scheduler to 4 steps when a `Flux2Scheduler` node is visible in the API export. The V118 runner auto-detects the image input, prompt input, seed, model loaders and SaveImage prefix in the API export.

## Production gate

Stills are generated one at a time with retry + technical framing checks. A video job is never created until the four stills have passed technical QA **and** human visual review.
