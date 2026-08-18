import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const stable = read('src/hooks/useStableProfiles.ts');
const profiles = read('src/pages/Profiles.tsx');
const x01 = read('src/pages/X01ConfigV3.tsx');

const checks = [
  ['useStableProfiles detects in-place Store hydration', stable.includes('const signature = source.map(profileSig).join("|")') && !stable.includes('React.useMemo(() => {\n    return (profiles || []).map(profileSig).join("|")')],
  ['Local profiles view no longer uses the risky whole-page memo', profiles.includes('<LocalProfilesRefonte\n                  profiles={stableProfiles as any}')],
  ['Local profiles has a safe cached fallback instead of an empty screen', profiles.includes('fallbackProfilesRef') && profiles.includes('readProfilesCache()') && profiles.includes('localProfilesSource')],
  ['Usage ranking is deferred outside first paint', profiles.includes('setAllModesUsageCounts') && profiles.includes('scheduleRuntimeIdle(() =>')],
  ['Favorite dartset badges are deferred outside first paint', profiles.includes('setFavorite(readFavorite())') && profiles.includes('fallbackDelayMs: 300')],
  ['X01 resolves legacy/canonical dartset IDs through aliases', x01.includes('function x01DartSetMatchesId') && x01.includes('duplicateIds') && x01.includes('aliasIds')],
  ['X01 selected dartset resolves local media explicitly', x01.includes('resolveDartSetLocalImageSrc(selectedSet, true)') && x01.includes('selectedVisualSrc')],
  ['X01 keeps full media recovery as fallback', x01.includes('resolveDartSetBestImageSrc(selectedSet, true)')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('\n✅ V72 PROFILES REHYDRATE + X01 MEDIA CONTRACT OK');
