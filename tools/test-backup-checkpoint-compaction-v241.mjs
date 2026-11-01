import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const journal = read('src/lib/incrementalBackupJournal.ts');
const auto = read('src/lib/matchAutoBackup.ts');
const nas = read('src/lib/manualNasSync.ts');
const pkg = JSON.parse(read('package.json'));
function assert(ok, message) { if (!ok) throw new Error(`❌ ${message}`); console.log(`✅ ${message}`); }

assert(journal.includes('throughUpdatedAt') && journal.includes('<= throughUpdatedAt'), 'W6 compacte seulement les deltas couverts par le checkpoint');
assert(!/tx\.objectStore\(STORE_CHANGES\)\.clear\(\)/.test(journal), 'W6 ne vide plus aveuglément tout le journal incrémental');
assert(journal.includes('retainedChanges') && journal.includes('SYNC_META_PREFIX'), 'W6 conserve les deltas post-checkpoint et nettoie les marqueurs de livraison');
assert(auto.includes('checkpointCutoffMs') && auto.includes('throughUpdatedAt: checkpointCutoffMs'), 'Les checkpoints cloud transmettent leur frontière temporelle');
assert(auto.includes('createLocalMemorySlotFromSnapshot') && auto.includes('checkpointId: slot.id'), 'Le mode local crée un snapshot durable avant compaction');
assert(auto.includes('Never compact if the durable local checkpoint failed'), 'Un échec de checkpoint local laisse le journal intact');

assert(nas.includes('export async function pushNasPreparedArtifact'), 'Le transport NAS canonique utilise pushNasPreparedArtifact');
assert(nas.includes('reason: "canonical-backup-artifact-v1"') && nas.includes('throughUpdatedAt: checkpointCutoffMs'), 'Le chemin NAS canonique compacte le journal local avec la frontière du snapshot');
assert(nas.includes('health?.capabilities?.incrementalCompaction === true'), 'La compaction NAS distante dépend de la capability annoncée par le vrai backend');
assert(nas.includes('/account/incremental-changes?throughUpdatedAt=${encodeURIComponent(String(checkpointCutoffMs))}'), 'Le client appelle la route de compaction distante uniquement après snapshot durable');

assert(String(pkg?.scripts?.dev || '').includes('vite') && String(pkg?.scripts?.start || '').includes('vite'), 'Le package application lance Vite, pas le server.js racine');
assert(!String(pkg?.scripts?.start || '').includes('server.js'), 'Le server.js racine du projet n’est pas considéré comme backend NAS déployé');

console.log('\n✅ W6B APP / NAS BOUNDARY + CHECKPOINT COMPACTION CONTRACT OK');
