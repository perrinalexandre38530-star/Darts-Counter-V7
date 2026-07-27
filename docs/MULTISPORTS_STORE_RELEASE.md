# MULTISPORTS SCORING — Store release foundation

## Release channels

The application has three explicit publication channels driven by `src/config/release-features.json`.

- `dev`: stable + beta + development. Keeps the current internal application experience.
- `beta`: stable + beta. Hides work-in-progress entries.
- `store`: stable only. Hides everything not explicitly approved for public release.

Commands:

```bash
npm run test:release
npm run build:beta
npm run build:store
```

A beta/store build fails deliberately if the build-time gate can no longer recognize the Darts registry or sport selector. This prevents an accidental unfiltered Store artifact after a future refactor.

## User-approved V1 Store scope

Sports marked `stable` for the first public version:

- Darts
- Baby-foot
- Pétanque

Darts modes marked `stable`:

- X01
- Killer
- Shanghai
- Les 5 vies
- Golf
- Territories
- Capital
- Loterie
- Attrape-moi si tu peux
- Killer Progressif
- Baseball

Everything else remains available to development and can be promoted later after validation. In particular, Ping-Pong and Cricket are not part of the initial Store whitelist at this stage.

Global surfaces currently kept out of the Store channel include Online, competitions, Camera Scoring, Cast/Viewer and the future TV Viewer until they pass their own audit.

## Native identity

`capacitor.config.json` reserves the working native identity:

- App name: `MULTISPORTS SCORING`
- App id: `com.multisportsscoring.app`
- Web output: `dist`

The application id must be treated as permanent once the first production application is published. Confirm it before the first Google Play/App Store production upload.

## Target distribution

Planned targets:

1. Web/PWA
2. Google Play — Android phone/tablet
3. Samsung Galaxy Store
4. Amazon Appstore
5. Google TV / Android TV
6. Amazon Fire TV
7. Apple App Store — iPhone/iPad
8. Apple TV / tvOS
9. Samsung Smart TV / Tizen
10. LG Smart TV / webOS
11. VIDAA / Roku later if worthwhile

The TV application should be a scoreboard/viewer experience paired to the mobile controller rather than a copy of the complete mobile UI.

## Next native step

Capacitor packages are intentionally not added in this foundation commit because `package-lock.json` must be updated together with the dependency versions. The next native patch should install the current Capacitor major consistently, regenerate the lockfile, create `android/` and `ios/`, then run Web/PWA regression checks before committing native projects.
