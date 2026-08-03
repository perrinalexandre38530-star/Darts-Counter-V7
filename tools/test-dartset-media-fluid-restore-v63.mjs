import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ ${message}`);
  }
};

const media = read('src/lib/userMediaFallback.ts');
const darts = read('src/lib/dartSetsStore.ts');
const profiles = read('src/pages/Profiles.tsx');
const storage = read('src/lib/storage.ts');
const vault = read('src/lib/storageVault.ts');
const vaultPage = read('src/pages/StorageVaultPage.tsx');
const history = read('src/lib/historyCloud.ts');
const yieldUtil = read('src/lib/mainThreadYield.ts');

assert(yieldUtil.includes('scheduler?.yield') && yieldUtil.includes('setTimeout(resolve, 0)'), 'un vrai yield rend la main à la WebView');
assert(media.includes('readFirstLocalUserMediaFallback') && media.includes('linkedSourceDartSetId'), 'les médias de dartsets sont recherchés avec leurs alias historiques');
assert(media.includes('const count = await idbCount()') && !media.includes('trimTimer = setTimeout'), 'le nettoyage média ne recharge plus toutes les images après chaque import');
assert(media.includes('dc-user-media-restored') && media.includes('dc-dartsets-updated'), 'la restauration média réveille immédiatement les badges de dartsets');
assert(darts.includes('resolveDartSetBestImageSrc') && darts.includes('readFirstLocalUserMediaFallback'), 'le store dartsets expose une résolution locale robuste');
assert(profiles.includes('resolveDartSetBestImageSrc(next, true)') && profiles.includes('onError={() => setImageFailed(true)}'), 'Profils locaux utilise le coffre restauré et ne montre plus d’image cassée');
assert(storage.includes('createCooperativeYielder') && storage.includes('{ allowRemote: false }'), 'l’import coopère avec l’UI sans lancer de récupération réseau parasite');
assert(history.includes('await yieldIfNeeded(true)'), 'l’import historique laisse régulièrement naviguer Android');
assert(vault.includes('decodeGzipBytesOffMainThread') && vault.includes('new Worker(url)'), 'le gros backup NAS est décompressé et parsé hors du thread UI');
assert(vaultPage.includes('scheduleStatsIndexRefresh') && !vaultPage.includes('await refreshStatsIndexFromHistoryNow'), 'le rebuild des statistiques est différé au temps libre');
assert(vaultPage.includes('runtimeAlreadyRefreshed') && vaultPage.includes('!runtimeAlreadyRefreshed && restoredStore'), 'le store vivant n’est plus injecté deux fois après restauration');

if (!process.exitCode) console.log('\n✅ DARTSET MEDIA + FLUID RESTORE V63 OK');
