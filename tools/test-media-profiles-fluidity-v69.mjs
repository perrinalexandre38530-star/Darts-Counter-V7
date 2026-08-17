import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
function check(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
}

const avatar = read('src/components/ProfileAvatar.tsx');
const resilient = read('src/components/ResilientUserImage.tsx');
const avatarFallback = read('src/lib/avatarR2Fallback.ts');
const stats = read('src/lib/statsNormalized.ts');
const profiles = read('src/pages/Profiles.tsx');
const dartStore = read('src/lib/dartSetsStore.ts');
const dartImage = read('src/components/DartSetImage.tsx');
const dartPanel = read('src/components/DartSetsPanel.tsx');
const starRing = read('src/components/ProfileStarRing.tsx');
const linked = read('src/lib/linkedProfileSync.ts');

check('ProfileAvatar privilégie la miniature locale sur les petits médaillons', avatar.includes('size <= 180 && cachedThumbFresh'));
check('ProfileAvatar ne lance le fallback lourd qu’après échec primaire', avatar.includes('if (primaryImg && !primaryBroken) return'));
check('ProfileAvatar décale les copies de sécurité au temps mort', avatar.includes('scheduleAvatarSafetyMirror') && avatar.includes('scheduleRuntimeIdle'));
check('Le badge dartset profil utilise le resolver DartSetImage', avatar.includes('<DartSetImage') && !avatar.includes('<ResilientUserImage'));
check('ResilientUserImage n’interroge plus R2 quand la primaire fonctionne', resilient.includes('if (primary && !primaryBroken) return'));
check('ResilientUserImage capture les médias hors du paint', resilient.includes('scheduleSafetyCapture') && resilient.includes('scheduleRuntimeIdle'));
check('Le miroir avatar est sérialisé à un worker et exécuté en idle', avatarFallback.includes('mirrorWorkers >= 1') && avatarFallback.includes('scheduleMirrorQueue') && avatarFallback.includes('isGameplayRuntime'));
check('L’historique normalisé est mutualisé entre les cartes profil', stats.includes('normalizedHistoryPending') && stats.includes('NORMALIZED_HISTORY_CACHE_MS'));
check('Les 600 History.get X01 ne sont plus lancés par carte', profiles.includes('loadProfilesX01FullRows') && profiles.includes('Math.min(4, Math.max(1, limited.length))'));
check('Les stats profondes des profils passent par une file séquentielle idle', profiles.includes('queueProfileDeepStats') && profiles.includes('profileDeepStatsRunning'));
check('La galerie avatar ne se synchronise que lorsqu’elle est ouverte', profiles.includes('view !== "avatarGallery" || !avatarGalleryHeavyReady || restoreBusy'));
check('Le badge set préféré utilise DartSetImage sans icône navigateur cassée', profiles.includes('<DartSetImage') && !profiles.includes('resolveDartSetBestImageSrc(next, true)'));
check('Les photos dartset inline gagnent sur les anciennes URL cassées', dartStore.includes('if (raw?.kind === "photo")') && dartStore.includes('/^data:image\\//i.test(inline)'));
check('Les data/assets dartset sont rendus sans détour IDB/R2', dartStore.includes('/^(data:image\\/|blob:|\\/assets\\/|\\/images\\/|\\.\\.?\\/)/i.test(primary)'));
check('DartSetImage ne relance pas le resolver pour une data image prête', dartImage.includes('if (immediate) return'));
check('L’import dartset écrit le coffre local avant de terminer', dartPanel.includes('await persistDartSetPhotoLocally') && dartPanel.includes('mirrorR2: false'));
check('La réplication R2 des dartsets est différée', dartPanel.includes('scheduleRuntimeIdle') && dartPanel.includes('mirrorR2: true'));
check('La projection de profils liés quitte le chemin critique', linked.includes('scheduleLinkedProjectionSideEffects') && linked.includes('scheduleRuntimeIdle'));
check('La matérialisation liée rend régulièrement la main', linked.includes('createCooperativeYielder(8)') && linked.includes('await yieldIfNeeded()'));
check('Les couronnes étoiles n’utilisent plus un GaussianBlur SVG par étoile', !starRing.includes('<feGaussianBlur') && starRing.includes('dc-profile-star-ring-css'));

let failed = 0;
for (const row of checks) {
  console.log(`${row.ok ? '✅' : '❌'} ${row.label}`);
  if (!row.ok) failed += 1;
}
if (failed) {
  console.error(`\n${failed} contrat(s) V69 en échec.`);
  process.exit(1);
}
console.log('\n✅ MEDIA + PROFILES FLUIDITY V69 CONTRACT OK');
