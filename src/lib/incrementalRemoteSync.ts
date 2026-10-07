import { apiGet, apiPost } from './apiClient';
import { getPersonalCloudStatus } from './personalCloudApi';
import { downloadCloudObject, listCloudObjects, uploadCloudObject } from './cloudStorageApi';
import { loadStoragePrefs } from './storagePlans';
import {
  listIncrementalChanges,
  markIncrementalProviderSynced,
  listUnsyncedIncrementalChanges,
  type IncrementalChange,
} from './incrementalBackupJournal';

const R2_OBJECT_TYPE = 'incremental_journal_v1';
const R2_OBJECT_KEY = 'backups/incremental_v1/latest.json';
const REMOTE_DEBOUNCE_MS = 1400;

let started = false;
let timer: number | null = null;
let inFlight: Promise<void> | null = null;
let rerun = false;

const personalCloudIncrementalSupport = new Map<string, boolean>();

async function personalCloudSupportsIncremental(provider: 'google_drive' | 'onedrive' | 'dropbox'): Promise<boolean> {
  if (personalCloudIncrementalSupport.has(provider)) return personalCloudIncrementalSupport.get(provider) === true;
  try {
    const status: any = await getPersonalCloudStatus(provider);
    // Un backend ancien sait gérer les sauvegardes complètes mais ne connaît pas
    // encore /incremental. Dans ce cas on n'envoie surtout pas une requête vouée
    // au 404 : le checkpoint manuel/automatique reste le filet de sécurité.
    const supported = status?.capabilities?.incremental === true || status?.incrementalSupported === true;
    personalCloudIncrementalSupport.set(provider, supported);
    return supported;
  } catch {
    return false;
  }
}


function selectedProvider(): string {
  try { return String(loadStoragePrefs().selectedDestination || 'app_local'); } catch { return 'app_local'; }
}

function isRemoteProvider(provider: string): boolean {
  return ['founder_nas', 'cloud_r2', 'google_drive', 'onedrive', 'dropbox'].includes(provider);
}

async function uploadBundle(provider: string, changes: IncrementalChange[]): Promise<boolean> {
  if (!changes.length) return true;
  const bundle = {
    version: 1,
    kind: 'multisports_incremental_bundle',
    provider,
    updatedAt: new Date().toISOString(),
    changes,
  };

  if (provider === 'founder_nas') {
    await apiPost('/account/incremental-changes', { changes }, { timeoutMs: 15_000 });
    return true;
  }

  if (provider === 'cloud_r2') {
    await uploadCloudObject({
      objectType: R2_OBJECT_TYPE,
      sport: 'system',
      title: 'Journal incrémental MULTISPORTS',
      objectKey: R2_OBJECT_KEY,
      mimeType: 'application/json',
      content: JSON.stringify(bundle),
      gzip: true,
      metadata: { backupKind: 'incremental_journal', updatedAt: bundle.updatedAt },
    });
    return true;
  }

  if (provider === 'google_drive' || provider === 'onedrive' || provider === 'dropbox') {
    if (!(await personalCloudSupportsIncremental(provider))) return false;
    await apiPost(`/account/personal-cloud/${provider}/incremental`, { changes }, { timeoutMs: 30_000, manual: true });
    return true;
  }
  return false;
}

export type IncrementalSyncResult = {
  provider: string;
  attempted: number;
  synced: number;
  supported: boolean;
  error?: string | null;
};

export async function flushIncrementalRemoteSync(): Promise<IncrementalSyncResult> {
  if (inFlight) {
    rerun = true;
    await inFlight;
    return { provider: selectedProvider(), attempted: 0, synced: 0, supported: true };
  }
  let result: IncrementalSyncResult = { provider: selectedProvider(), attempted: 0, synced: 0, supported: true };
  inFlight = (async () => {
    const provider = selectedProvider();
    result.provider = provider;
    if (!isRemoteProvider(provider)) return;
    const changes = await listUnsyncedIncrementalChanges(provider);
    result.attempted = changes.length;
    if (!changes.length) return;
    const uploaded = await uploadBundle(provider, changes);
    result.supported = uploaded;
    if (!uploaded) return;
    await markIncrementalProviderSynced(provider, changes);
    result.synced = changes.length;
  })().catch((error) => {
    result.error = error?.message || String(error);
    try {
      localStorage.setItem('dc_incremental_remote_last_error_v1', JSON.stringify({
        at: new Date().toISOString(), provider: selectedProvider(), message: result.error,
      }));
    } catch {}
  }).finally(() => {
    inFlight = null;
    if (rerun) {
      rerun = false;
      scheduleIncrementalRemoteSync();
    }
  });
  await inFlight;
  return result;
}

export function scheduleIncrementalRemoteSync(): void {
  if (typeof window === 'undefined') return;
  if (timer != null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void flushIncrementalRemoteSync();
  }, REMOTE_DEBOUNCE_MS);
}

export function initIncrementalRemoteSync(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('dc:incremental-backup-change', scheduleIncrementalRemoteSync as EventListener, { passive: true });
  window.addEventListener('online', scheduleIncrementalRemoteSync, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushIncrementalRemoteSync();
  }, { passive: true });
  window.setTimeout(scheduleIncrementalRemoteSync, 2500);
}

export async function fetchRemoteIncrementalChanges(provider = selectedProvider()): Promise<IncrementalChange[]> {
  if (provider === 'founder_nas') {
    const res: any = await apiGet('/account/incremental-changes?limit=200', { timeoutMs: 15_000 }).catch(() => null);
    return Array.isArray(res?.changes) ? res.changes : [];
  }

  if (provider === 'cloud_r2') {
    const rows = await listCloudObjects({ objectType: R2_OBJECT_TYPE, sport: 'system', limit: 5 }).catch(() => []);
    const latest: any = [...rows].sort((a: any, b: any) => Date.parse(String(b?.updated_at || b?.updatedAt || 0)) - Date.parse(String(a?.updated_at || a?.updatedAt || 0)))[0];
    if (!latest?.id) return [];
    const downloaded: any = await downloadCloudObject(String(latest.id)).catch(() => null);
    const content = downloaded?.content ?? (downloaded?.text ? JSON.parse(downloaded.text) : null);
    return Array.isArray(content?.changes) ? content.changes : [];
  }

  if (provider === 'google_drive' || provider === 'onedrive' || provider === 'dropbox') {
    if (!(await personalCloudSupportsIncremental(provider))) return [];
    const res: any = await apiGet(`/account/personal-cloud/${provider}/incremental`, { timeoutMs: 30_000, manual: true }).catch(() => null);
    return Array.isArray(res?.changes) ? res.changes : [];
  }

  return [];
}

export async function exportIncrementalRemoteBundle(): Promise<{ version: 1; changes: IncrementalChange[] }> {
  return { version: 1, changes: await listIncrementalChanges() };
}
