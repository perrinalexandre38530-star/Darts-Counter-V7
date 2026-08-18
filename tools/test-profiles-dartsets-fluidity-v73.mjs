import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const profiles = read('src/pages/Profiles.tsx');
const store = read('src/lib/dartSetsStore.ts');
const dartImage = read('src/components/DartSetImage.tsx');
const x01 = read('src/pages/X01ConfigV3.tsx');

const checks = [
  ['Local profile avatars are throttled to two workers', profiles.includes('LOCAL_GRID_AVATAR_MAX_WORKERS = 2') && profiles.includes('localGridAvatarQueue') && profiles.includes('requestAnimationFrame(() => pumpLocalGridAvatarQueue())')],
  ['Large inline avatars are excluded from the first paint', profiles.includes('LOCAL_GRID_INLINE_FAST_MAX_CHARS') && profiles.includes('isLocalGridFastInline') && profiles.includes('const heavyCandidates = [profile?.avatarDataUrl, profile?.photoDataUrl]')],
  ['Local profile cards render initials before heavy media', profiles.includes('const initials = String(profile?.name || "P")') && profiles.includes('opacity: loaded ? 1 : 0')],
  ['Visible favorite dartsets are loaded in one cooperative batch', profiles.includes('gridFavoriteByProfile') && profiles.includes('createCooperativeYielder(5)') && profiles.includes('LocalGridFavoriteDartSetBadge')],
  ['Profile navigation reuses the same ad slot', !profiles.includes('page-profiles-menu-under-header') && profiles.includes('slotKey="page-profiles-under-header"')],
  ['Local dartset resolver no longer treats stale remote URLs as local', store.includes('cette fonction s\'appelle LOCAL') && store.includes('return null;') && store.includes('remoteDartSetId') && store.includes('originalId')],
  ['Dartset recovery excludes the failed source and tries local/R2 aliases', store.includes('export async function resolveDartSetRecoveryImageSrc') && store.includes('failedSrcInput') && store.includes('allowR2: true') && store.includes('duplicateIds') && store.includes('aliasIds')],
  ['DartSetImage retries media recovery after a real image error', dartImage.includes('resolveDartSetRecoveryImageSrc') && dartImage.includes('recoveryAttemptedRef') && dartImage.includes('if (set && recovery === "full" && failed')],
  ['X01 uses one DartSetImage full-recovery pipeline', x01.includes('recovery="full"') && !x01.includes('selectedVisualSrc') && !x01.includes('resolveDartSetLocalImageSrc(selectedSet, true)')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('\n✅ V73 PROFILES + DARTSETS FLUIDITY CONTRACT OK');
