import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(p, 'utf8');
const music = read('src/lib/navigationMusicCatalog.ts');
const cards = read('src/components/profile/CollectibleCardsPanel.tsx');
const fitMedia = read('src/fit/fitAwenaMedia.ts');
const fitModule = read('src/pages/fit/FitPerfModule.tsx');
const settings = read('src/pages/Settings.tsx');
const sw = read('public/sw.js');
const pkg = JSON.parse(read('package.json'));

assert.ok(music.includes('contentPackAssetUrl("navigation-music"'), 'navigation music must use the remote pack');
assert.ok(!music.includes('midnight_enigma_nav.m4a";'), 'only the two local fallback tracks may stay statically imported');
assert.ok(cards.includes('contentPackAssetUrl("collectible-cards"'), 'collectible cards must use the remote pack');
assert.ok(!cards.includes('assets/collectible-cards/'), 'collectible card static imports must be removed');
assert.ok(fitMedia.includes('contentPackAssetUrl("fit-awena"'), 'FIT AWENA media must use the remote pack');
assert.ok(fitModule.includes('tickers/free-awena.webp'), 'FIT tickers must use compressed WebP pack assets');
assert.ok(settings.includes('ContentPacksSettingsPanel'), 'settings must expose the pack manager');
assert.ok(sw.includes('CONTENT_PACK_CACHE_PREFIX'), 'service worker must preserve content packs');
assert.ok(pkg.scripts['android:sync'].includes('android:strip-content-packs'), 'Android sync must strip embedded FIT media');
console.log('✅ Content packs V1 contract OK');
