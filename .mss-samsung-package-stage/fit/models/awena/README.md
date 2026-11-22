# AWENA 3D model slot

The current FIT PERF 3D renderer uses an original procedural AWENA-style mannequin so the feature works with no paid asset and no new npm dependency.

The final character can later replace the mannequin by dropping a rigged model here:

- `awena.glb`
- humanoid skeleton / neutral bind pose
- meters as scene unit (or documented scale)
- optimized textures (WebP/KTX2 preferred)
- target under ~5 MB for mobile/PWA if possible
- no animation baked into the mesh is required: motions are retargeted separately

Do not add a third-party model unless its commercial redistribution/use rights have been verified.
