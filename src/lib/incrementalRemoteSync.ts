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
const runtimeUnsupportedProviders = new Set<string>();

function nasIncrementalKnownSupported(): boolean {
  try { return localStorage.getItem('dc_incremental_nas_supported_v1') === '1'; } catch { return false; }
}


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
  if (runtimeUnsupportedProviders.has(provider)) return false;
  const bundle = {
    version: 1,
    kind: 'multisports_incremental_bundle',
    provider,
    updatedAt: new Date().toISOString(),
    changes,
  };

  if (provider === 'founder_nas') {
    // Un NAS ancien répond 404 sur cette route. Ne plus générer une erreur réseau
    // visible à chaque chargement : le mode incrémental NAS n'est activé que
    // lorsqu'une version compatible l'a explicitement validé une première fois.
    if (!nasIncrementalKnownSupported()) return false;
    try {
      await apiPost('/account/incremental-changes', { changes }, { timeoutMs: 15_000 });
      return true;
    } catch (error: any) {
      const msg = String(error?.message || error || '');
      const status = Number(error?.status || error?.statusCode || 0);
      if (status === 404 || /404|not found|cannot post \/account\/incremental-changes/i.test(msg)) {
        runtimeUnsupportedProviders.add(provider);
        try { localStorage.setItem('dc_incremental_nas_unsupported_v1', '1'); } catch {}
        return false;
      }
      throw error;
    }
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
    if (runtimeUnsupportedProviders.has(provider) || !nasIncrementalKnownSupported()) return [];
    const res: any = await apiGet('/account/incremental-changes?limit=200', { timeoutMs: 15_000 }).catch((error: any) => {
      const msg = String(error?.message || error || '');
      const status = Number(error?.status || error?.statusCode || 0);
      if (status === 404 || /404|not found|cannot get \/account\/incremental-changes/i.test(msg)) {
        runtimeUnsupportedProviders.add(provider);
      }
      return null;
    });
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
