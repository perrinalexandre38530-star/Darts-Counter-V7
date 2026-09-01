import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(p, 'utf8');
const music = read('src/lib/navigationMusicCatalog.ts');
const cards = read('src/components/profile/CollectibleCardsPanel.tsx');
const fitMedia = read('src/fit/fitAwenaMedia.ts');
const fitMocap = read('src/fit/awenaMocapRegistry.ts');
const fitModule = read('src/pages/fit/FitPerfModule.tsx');
const settings = read('src/pages/Settings.tsx');
const packUi = read('src/components/settings/ContentPacksSettingsPanel.tsx');
const packs = read('src/lib/contentPacks.ts');
const themes = read('src/theme/themePresets.ts');
const killer = read('src/lib/dartsKillerBots.ts');
const loterie = read('src/lib/dartsLoterieBots.ts');
const firefighter = read('src/lib/dartsFirefighterBots.ts');
const strip = read('tools/strip-android-content-packs.mjs');
const sw = read('public/sw.js');
const gradle = read('android/app/build.gradle');
const pkg = JSON.parse(read('package.json'));

assert.ok(music.includes('contentPackAssetUrl("navigation-music"'), 'navigation music must use the remote pack');
assert.ok(!music.includes('midnight_enigma_nav.m4a";'), 'only the two local fallback tracks may stay statically imported');
assert.ok(cards.includes('contentPackAssetUrl("collectible-cards"'), 'collectible cards must use the remote pack');
assert.ok(!cards.includes('assets/collectible-cards/'), 'collectible card static imports must be removed');
assert.ok(fitMedia.includes('contentPackAssetUrl("fit-awena"'), 'FIT AWENA media must use the remote pack');
assert.ok(fitMocap.includes('contentPackAssetUrl("fit-awena", "mocap/cmu/22_14.bvh")'), 'FIT mocap must survive Android public/fit stripping');
assert.ok(fitModule.includes('tickers/free-awena.webp'), 'FIT tickers must use compressed WebP pack assets');
assert.ok(themes.includes('contentPackAssetUrl("theme-textures"'), 'theme textures must resolve through a content pack');
for (const source of [killer, loterie, firefighter]) {
  assert.ok(source.includes('contentPackAssetUrl("character-portraits"'), 'official character portraits must resolve through a content pack');
  assert.ok(!source.includes('assets/avatars/'), 'official character portraits must not be statically imported');
}
assert.ok(packs.includes('CONTENT_PACK_CATALOG[packId].version'), 'content pack URLs must be versioned');
assert.ok(packUi.includes('CONTENT_PACK_IDS.map'), 'pack manager must render generated packs dynamically');
assert.ok(packUi.includes('TOUT INSTALLER'), 'pack manager must support one-tap offline install');
assert.ok(settings.includes('ContentPacksSettingsPanel'), 'settings must expose the pack manager');
assert.ok(strip.includes("removeDir('fit')"), 'Android sync must strip embedded FIT media');
assert.ok(strip.includes("removeDir('theme-textures')"), 'Android sync must strip embedded theme textures');
assert.ok(sw.includes('CONTENT_PACK_CACHE_PREFIX'), 'service worker must preserve content packs');
assert.ok(pkg.scripts['android:sync'].includes('android:strip-content-packs'), 'Android sync must strip remote content before Capacitor sync');
assert.ok(gradle.includes('abiFilters "arm64-v8a", "armeabi-v7a"'), 'Play build must exclude x86/x86_64 native payloads');
console.log('✅ Content packs V2 contract OK');
