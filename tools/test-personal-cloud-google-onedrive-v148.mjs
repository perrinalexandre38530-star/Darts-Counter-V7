import fs from 'node:fs';

const api = fs.readFileSync(new URL('../src/lib/personalCloudApi.ts', import.meta.url), 'utf8');
const vault = fs.readFileSync(new URL('../src/pages/StorageVaultPage.tsx', import.meta.url), 'utf8');
const settings = fs.readFileSync(new URL('../src/pages/Settings.tsx', import.meta.url), 'utf8');

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(api.includes('["google_drive", "onedrive", "dropbox"]'), 'Google Drive, OneDrive et Dropbox partagent le pipeline archive rapide');
assert(api.includes('/account/personal-cloud/${provider}/backups/raw/jobs'), 'Le gzip binaire est générique par fournisseur');
assert(api.includes('pollPersonalCloudJob(provider, jobId'), 'Le polling des sauvegardes est générique');
assert(api.includes('listPersonalCloudBackups(provider'), 'La liste d’archives est générique');
assert(api.includes('downloadPersonalCloudSnapshotById') && api.includes('/account/personal-cloud/${provider}/backups/${encodeURIComponent(id)}/raw'), 'La restauration rapide par ID est générique');
assert(api.includes('personalCloudProviderLabel(provider)') && !api.includes('Autorisation Google Drive refusée ou interrompue'), 'Le retour OAuth Android affiche le bon fournisseur');

assert(vault.includes('type BackupProvider = "nas" | "cloud" | PersonalCloudProvider'), 'Le coffre accepte les clouds personnels comme vrais providers');
assert(vault.includes('selectPersonalCloudRestoreSource("google_drive")'), 'Google Drive utilise le sélecteur cloud unifié');
assert(vault.includes('selectPersonalCloudRestoreSource("onedrive")'), 'OneDrive est une source de restauration visible');
assert(vault.includes('selectPersonalCloudRestoreSource("dropbox")'), 'Dropbox est une source de restauration visible');
assert(vault.includes('payload: { __lazyPersonalCloud: true, provider, backupId'), 'La restauration conserve le provider dans les métadonnées lazy');
assert(vault.includes('downloadPersonalCloudSnapshotById(provider, backupId'), 'La restauration télécharge depuis le provider sélectionné');

assert(settings.includes('getPersonalCloudStatus("onedrive")'), 'Réglages lit le statut OneDrive');
assert(settings.includes('connectPersonalCloud("onedrive")'), 'Réglages peut connecter OneDrive');
assert(settings.includes('disconnectPersonalCloud("onedrive")'), 'Réglages peut déconnecter OneDrive');
assert(settings.includes('Connecter OneDrive'), 'La carte OneDrive est visible dans Réglages');
assert(settings.includes('getPersonalCloudStatus("dropbox")'), 'Réglages lit le statut Dropbox');
assert(settings.includes('connectPersonalCloud("dropbox")'), 'Réglages peut connecter Dropbox');
assert(settings.includes('disconnectPersonalCloud("dropbox")'), 'Réglages peut déconnecter Dropbox');
assert(settings.includes('Connecter Dropbox'), 'La carte Dropbox est visible dans Réglages');

console.log('\n✅ PERSONAL CLOUD GOOGLE DRIVE + ONEDRIVE + DROPBOX V148 APP CONTRACT OK');
