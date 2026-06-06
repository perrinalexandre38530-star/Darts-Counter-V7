# Patch crash `voiceHitPromptActive is not defined`

Crash corrigé dans `src/pages/X01PlayV3.tsx`.

## Cause
Deux rendus des pastilles de volée utilisaient directement `voiceHitPromptActive` pendant le render. Sur la build déployée, cette référence sortait de son scope et provoquait :

`ReferenceError: voiceHitPromptActive is not defined`

Route impactée : `x01_config_v3`.

## Correction
- Ajout de deux helpers purs hors composant :
  - `isVoiceHitPromptActiveForUi(...)`
  - `getVoiceExpectedHitIndexForUi(...)`
- Remplacement des deux accès directs dans les `.map([0,1,2])` par ces helpers.
- Le clignotement de la pastille voix reste conservé, mais ne peut plus faire tomber React si l'état voix n'est pas disponible.

## Note build
Le crash voix est corrigé. Lors du contrôle `npm run build`, la compilation s'arrête ensuite sur des assets manquants déjà présents dans ce ZIP de référence, par exemple :
`src/components/SportQuickSwitch.tsx` importe `logo-pingpong.png`, `logo-babyfoot.png`, `logo-petanque.png`, absents de `src/assets/games/`.
