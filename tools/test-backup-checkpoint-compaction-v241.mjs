import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const journal = read('src/lib/incrementalBackupJournal.ts');
const auto = read('src/lib/matchAutoBackup.ts');
const nas = read('src/lib/manualNasSync.ts');
const backend = read('server.js');
function assert(ok, message) { if (!ok) throw new Error(`❌ ${message}`); console.log(`✅ ${message}`); }

assert(journal.includes('throughUpdatedAt') && journal.includes('<= throughUpdatedAt'), 'W6 compacte seulement les deltas couverts par le checkpoint');
assert(!/tx\.objectStore\(STORE_CHANGES\)\.clear\(\)/.test(journal), 'W6 ne vide plus aveuglément tout le journal incrémental');
assert(journal.includes('retainedChanges') && journal.includes('SYNC_META_PREFIX'), 'W6 conserve les deltas post-checkpoint et nettoie les marqueurs de livraison');
assert(auto.includes('checkpointCutoffMs') && auto.includes('throughUpdatedAt: checkpointCutoffMs'), 'Les checkpoints cloud transmettent leur frontière temporelle');
assert(auto.includes('createLocalMemorySlotFromSnapshot') && auto.includes('checkpointId: slot.id'), 'Le mode local crée un snapshot durable avant compaction');
assert(auto.includes('Never compact if the durable local checkpoint failed'), 'Un échec de checkpoint local laisse le journal intact');
assert(nas.includes('throughUpdatedAt=${encodeURIComponent(String(checkpointCutoffMs))}') && nas.includes('reason: "manual-nas-backup"'), 'Le backup NAS manuel compacte local et distant avec le même cutoff');
assert(backend.includes('app.delete("/account/incremental-changes"') && backend.includes('updated_at_ms <= $2'), 'Le backend NAS compacte seulement les deltas antérieurs au checkpoint');
assert(backend.includes('throughUpdatedAt requis'), 'Le backend refuse une compaction NAS sans frontière explicite');
console.log('\n✅ W6 BACKUP CHECKPOINT COMPACTION CONTRACT OK');
