# Patch Awéna V8.4 Expert Reference — Base V78

Base stricte : `Darts-Counter-V7 (78).zip`.

## Rebase

Ce patch a été reconstruit depuis la V78 afin de ne pas réinjecter des fichiers de configuration plus anciens.

### package.json

Le `package.json` provient directement de V78. Toutes les évolutions V78 sont conservées, notamment les scripts AdMob récents. Une seule commande est ajoutée :

`test:awena:v84`

Elle exécute :

- `tools/test-awena-v84-expert-reference.mjs`
- `tools/test-awena-v83-max-knowledge.mjs`

## Fichiers Awéna

- `src/awena/AwenaExpertReference.ts`
- `src/awena/AwenaCore.ts`
- `src/awena/components/AwenaOverlay.tsx`
- `tools/test-awena-v83-max-knowledge.mjs`
- `tools/test-awena-v84-expert-reference.mjs`

Ces fichiers sont alignés sur l'état V78 et conservent la couche V8.4.
