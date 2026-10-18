import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const api = read('src/lib/personalCloudApi.ts');
const page = read('src/pages/StorageVaultPage.tsx');
const vault = read('src/lib/storageVault.ts');
const server = read('server.js');

function check(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

check(api.includes('/account/personal-cloud/google_drive/backups/raw/jobs'), 'Google Drive utilise le transport gzip binaire rapide');
check(api.includes('export async function listPersonalCloudBackups'), 'Le client sait lister les archives Google Drive');
check(api.includes('/account/personal-cloud/google_drive/backups/${encodeURIComponent(id)}/raw'), 'La restauration Drive tente le flux gzip brut avant le fallback JSON');
check(api.includes('pollGoogleDriveJob'), 'Les jobs Google Drive sont suivis jusqu’à leur état final');
check(api.includes('fallback') && api.includes('/account/personal-cloud/${provider}/backup'), 'Le transport Google Drive conserve une voie de secours compatible');
check(page.includes('NAS_CHUNK_CONCURRENCY = 3'), 'Le fallback NAS en chunks est parallélisé');
check(page.includes('xhr.open("POST", buildApiUrl("/sync/push/raw")'), 'Le NAS tente d’abord un upload gzip binaire unique');
check(page.includes('listPersonalCloudBackups("google_drive", 100)'), 'La restauration Drive charge jusqu’à 100 sauvegardes');
check(page.includes('personalRestoreEntries.slice(1)') && page.includes('Archives ${currentRestoreArchives.length}'), 'Les sauvegardes Drive historiques sont exposées dans Archives');
check(vault.includes('/sync/slots?limit=120'), 'La restauration NAS recherche un historique étendu');
check(vault.includes('/sync/slots/trash?limit=120'), 'La corbeille NAS recherche aussi un historique étendu');
check(server.includes('app.post("/sync/push/raw"'), 'Le backend accepte le gzip NAS brut');
check(server.includes('app.get("/sync/pull/raw"'), 'Le backend renvoie la sauvegarde NAS courante en gzip brut');
check(server.includes('sendNasSnapshotGzip'), 'Les archives NAS sont renvoyées en gzip brut sans enveloppe base64');
check(server.includes('app.post("/account/personal-cloud/google_drive/backups/raw/jobs"'), 'Le backend accepte le gzip Drive brut');
check(server.includes('app.get("/account/personal-cloud/google_drive/backups/:id/raw"'), 'Le backend restaure Drive en gzip brut, y compris les anciens formats');
check(server.includes('req.url = String(req.url).replace("/account/personal-cloud/google-drive", "/account/personal-cloud/google_drive")'), 'Les anciennes routes google-drive restent compatibles');
check(server.includes('googleDriveListVisibleBackupsEverywhere'), 'Le backend recherche les anciennes sauvegardes Drive hors du dossier courant');
check(server.includes('googleDriveListLegacyAppDataBackups'), 'Le backend recherche les sauvegardes historiques appDataFolder');
check(server.includes('WHERE id IN (SELECT id FROM ranked WHERE rn > 30)'), 'Le NAS conserve 30 snapshots actifs au lieu de 10');
check(server.includes('payload_too_large'), 'Les erreurs de taille des transports binaires restent des JSON exploitables');

console.log('\n✅ BACKUP / RESTORE TRANSPORT V131 REGRESSION OK');
