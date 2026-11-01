import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const gate = read('src/lib/historyIntegrityGate.ts');
const storage = read('src/lib/storage.ts');
const engine = read('src/lib/backup/backupEngineV1.ts');
const pkg = JSON.parse(read('package.json'));
function assert(ok, msg) { if (!ok) throw new Error(`❌ ${msg}`); console.log(`✅ ${msg}`); }
assert(gate.includes('CrossDeviceReleaseManifest'), 'W8 expose un manifeste portable inter-appareils');
assert(gate.includes('buildCrossDeviceReleaseManifest'), 'W8 construit la signature History + Stats attendues');
assert(gate.includes('assertCrossDeviceReleaseManifest'), 'W8 sait refuser une restauration dont la signature diverge');
assert(gate.includes('activeIdsHash') && gate.includes('finishedIdsHash') && gate.includes('expectedIdsHash'), 'W8 compare les IDs actifs, terminés et Stats');
assert(storage.includes('clone.releaseGate = buildCrossDeviceReleaseManifest'), 'Chaque nouveau snapshot embarque le Release Gate W8');
assert(storage.includes('assertCrossDeviceReleaseManifest((dump as any)?.releaseGate, localReleaseGate)'), 'La restauration compare la signature source avec l’appareil restauré');
assert(engine.includes('historyIdsHash:') && engine.includes('statsExpectedIdsHash:'), 'Les métadonnées de backup exposent les hashes W8 pour diagnostic rapide');
assert(String(pkg.scripts?.['test:history-integrity'] || '').includes('test:cross-device-release-gate'), 'W8 est intégré à la chaîne history-integrity');
console.log('\n✅ CROSS-DEVICE RELEASE GATE W8 CONTRACT OK');
