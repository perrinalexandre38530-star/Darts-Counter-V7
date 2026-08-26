# FIT PERF — free motion capture assets

This directory is the local/vendor target for free motion-capture assets used by FIT PERF.

## Sources accepted

### CMU Graphics Lab Motion Capture Database
- Use inside the application/project is permitted by the CMU dataset usage terms, including commercial projects.
- Do not package/resell the CMU motion database as a standalone dataset.
- Keep the original CMU sequence id in `src/fit/awenaMocapRegistry.ts`.
- Target path: `public/fit/mocap/cmu/<sequence>.bvh`.
- First verified mapping: CMU subject 22 trial 14 (`22_14`) = alternating squats, subject A.
- Runtime: FIT PERF first checks the local file, then its CacheStorage copy, then the verified raw GitHub mirror of Bruce Hahne's BVH conversion. If none is readable, the procedural 3D motion stays active.
- Developer command: `npm run fit:mocap:vendor` downloads verified runtime assets into `public/fit/mocap/cmu/` so production builds can be fully self-contained.

### MocapFlow Free Mocap Library
- Repository/license: CC0 1.0 for the free library assets.
- Target path: `public/fit/mocap/mocapflow/<asset>.glb` (or `.fbx`/`.bvh` during preprocessing).
- Add a registry entry only after the exact downloaded asset has been checked.

## Runtime rule

FIT PERF must always have a procedural fallback. Missing/invalid network or mocap assets must never prevent an exercise page from opening. The detailed exercise view may use real BVH; compact cards deliberately stay procedural to avoid unnecessary network/GPU work.
