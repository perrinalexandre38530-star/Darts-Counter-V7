import { readNasAccessToken } from "../apiClient";
import { decodeJwtPayloadUnsafe } from "../authSessionGuard";
import {
  downloadCloudObject,
  listCloudVaultBackups,
  type CloudObjectIndexItem,
} from "../cloudStorageApi";
import { readExternalBackupSnapshotIfPermitted } from "../externalBackupTarget";
import {
  createLocalMemorySlotFromSnapshot,
  decodeMaybeCompressedNasPayloadAsync,
  listLocalMemorySlots,
  listNasMemorySlots,
  pullNasMemorySlot,
  summarizeVaultPayload,
  type MemorySlot,
  type NasSlot,
  type VaultSummary,
} from "../storageVault";
import {
  exportCloudSnapshot,
  importCloudSnapshot,
  loadStore,
  getStorageUser,
  setStorageUser,
} from "../storage";
import { getAutoBackups, type AutoBackupItem } from "./autoBackupService";
import { downloadPersonalCloudSnapshot, downloadPersonalCloudSnapshotById, getPersonalCloudBackupMeta, isPersonalCloudProvider, personalCloudProviderLabel, type PersonalCloudProvider } from "../personalCloudApi";
import { getAccountLatestBackup, registerAccountLatestBackup, type AccountLatestBackup } from "../latestBackupApi";
import { loadStoragePrefs } from "../storagePlans";
import { fetchRemoteIncrementalChanges } from "../incrementalRemoteSync";
import { applyIncrementalChanges } from "../incrementalRestore";

export type AccountBackupSource = "local" | "nas" | "r2" | "google_drive" | "onedrive" | "dropbox" | "external" | "legacy-auto";

export type AccountBackupCandidate = {
  source: AccountBackupSource;
  id: string;
  label: string;
  updatedAt: string;
  updatedAtMs: number;
  revision: number;
  summary?: Partial<VaultSummary> | null;
  /** La source elle-même garantit que la sauvegarde appartient au compte demandé. */
  accountScoped: boolean;
  load: () => Promise<any>;
};

export type AccountBackupScanResult = {
  candidates: AccountBackupCandidate[];
  errors: Array<{ source: AccountBackupSource; message: string }>;
};

const APPLIED_PREFIX = "dc_backup_coordinator_applied_v1";
const LAST_RESULT_PREFIX = "dc_backup_coordinator_last_result_v1";
const BEFORE_RESTORE_LABEL = "Sécurité avant restauration automatique";
const RUN_COOLDOWN_MS = 4_000;

const inFlightByUser = new Map<string, Promise<boolean>>();
const lastRunAtByUser = new Map<string, number>();


export type AccountSyncConflict = {
  userId: string;
  candidate: AccountBackupCandidate;
  localSummary: Partial<VaultSummary>;
  remoteSummary: Partial<VaultSummary>;
  differences: Array<{ key: string; label: string; local: number; remote: number; delta: number; lossIfRemote: number; gainIfRemote: number }>;
  details?: Array<{ key: string; label: string; onlyLocal: string[]; onlyRemote: string[]; common: number }>;
};

const pendingConflicts = new Map<string, AccountSyncConflict>();

function emitAccountSync(userId: string, phase: string, progress: number, message: string, extra: Record<string, any> = {}): void {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent("msc:account-sync", { detail: { userId, phase, progress: Math.max(0, Math.min(100, Math.round(progress))), message, ...extra } })); } catch {}
}

function buildConflict(userId: string, candidate: AccountBackupCandidate, local: Partial<VaultSummary> | null | undefined): AccountSyncConflict {
  const remote: any = candidate.summary || {};
  const here: any = local || {};
  const rows: Array<[string,string,number,number]> = [
    ["profiles", "Profils", Number(here.profiles || 0), Number(remote.profiles || 0)],
    ["matches", "Parties / historique", Math.max(Number(here.matches || 0), Number(here.historyRows || 0)), Math.max(Number(remote.matches || 0), Number(remote.historyRows || 0))],
    ["stats", "Statistiques", Number(here.statsMatches || here.statsBlocks || 0), Number(remote.statsMatches || remote.statsBlocks || 0)],
    ["media", "Médias", Number(here.mediaRefs || here.images || 0), Number(remote.mediaRefs || remote.images || 0)],
    ["teams", "Équipes", Number(here.teams || 0), Number(remote.teams || 0)],
  ];
  return { userId, candidate, localSummary: local || {}, remoteSummary: remote,
    differences: rows.map(([key,label,l,r]) => ({ key,label,local:l,remote:r,delta:r-l,lossIfRemote:Math.max(0,l-r),gainIfRemote:Math.max(0,r-l) })).filter(x => x.delta !== 0) };
}


function entityId(row: any, fallback: string): string {
  return String(row?.id ?? row?.profileId ?? row?.teamId ?? row?.matchId ?? row?.uuid ?? fallback).trim();
}

function entityLabel(row: any, fallback: string): string {
  const name = String(row?.name ?? row?.displayName ?? row?.nickname ?? row?.teamName ?? row?.title ?? row?.mode ?? row?.gameMode ?? "").trim();
  const date = String(row?.updatedAt ?? row?.playedAt ?? row?.createdAt ?? row?.date ?? "").trim();
  return name ? (date ? `${name} — ${date}` : name) : (date ? `${fallback} — ${date}` : fallback);
}

function snapshotCollections(snapshot: any): Record<string, Map<string,string>> {
  const root = unwrapPayload(snapshot) || snapshot || {};
  const portable = root?.portableAccountData || root?.portable_account_data || {};
  const store = root?.store || root?.data?.store || root?.data || {};
  const profiles = Array.isArray(portable?.profiles) ? portable.profiles : (Array.isArray(store?.profiles) ? store.profiles : []);
  const teams = Array.isArray(portable?.teams) ? portable.teams : (Array.isArray(store?.teams) ? store.teams : []);
  const historyRows = root?.history?.rows && typeof root.history.rows === "object" ? root.history.rows : {};
  const matchesArray = Array.isArray(store?.matches) ? store.matches : [];
  const make = (rows: any[], prefix: string) => {
    const out = new Map<string,string>();
    rows.forEach((row, i) => { const id = entityId(row, `${prefix}-${i+1}`); if (id) out.set(id, entityLabel(row, id)); });
    return out;
  };
  const matches = make(matchesArray, "partie");
  Object.entries(historyRows).forEach(([id,row]: any) => { const key = entityId(row, id); if (key) matches.set(key, entityLabel(row, key)); });
  return { profiles: make(profiles, "profil"), teams: make(teams, "équipe"), matches };
}

async function buildDetailedDifferences(remoteSnapshot: any, localStore?: any): Promise<AccountSyncConflict["details"]> {
  // V42 FIX : ne JAMAIS reconstruire exportCloudSnapshot() pendant le boot.
  // Sur mobile/IndexedDB cette opération peut monopoliser le thread JS ; même un
  // Promise.race ne peut alors pas faire avancer le timeout et la barre reste à 88 %.
  // Le store courant suffit pour les IDs de profils/équipes et les parties qui y sont
  // indexées. Si sa lecture échoue, on garde le comparatif de compteurs déjà calculé.
  const currentStore = localStore ?? await withSyncTimeout(
    loadStore<any>().catch(() => null),
    3_000,
    "Lecture détaillée locale",
  ).catch(() => null);
  if (!currentStore || !remoteSnapshot) return [];
  const local = snapshotCollections({ store: currentStore });
  const remote = snapshotCollections(remoteSnapshot);
  const defs: Array<[string,string]> = [["profiles","Profils"],["matches","Parties"],["teams","Équipes"]];
  return defs.map(([key,label]) => {
    const l = local[key] || new Map<string,string>(); const r = remote[key] || new Map<string,string>();
    const onlyLocal = [...l.entries()].filter(([id]) => !r.has(id)).map(([,name]) => name);
    const onlyRemote = [...r.entries()].filter(([id]) => !l.has(id)).map(([,name]) => name);
    const common = [...l.keys()].filter(id => r.has(id)).length;
    return { key,label,onlyLocal,onlyRemote,common };
  }).filter(x => x.onlyLocal.length || x.onlyRemote.length);
}

function emitConflict(conflict: AccountSyncConflict): void {
  pendingConflicts.set(conflict.userId, conflict);
  emitAccountSync(conflict.userId, "conflict", 100, "Différences détectées entre vos appareils", { conflict: {
    source: conflict.candidate.source, label: conflict.candidate.label, updatedAt: conflict.candidate.updatedAt,
    localSummary: conflict.localSummary, remoteSummary: conflict.remoteSummary, differences: conflict.differences, details: conflict.details || [],
  }});
}

export async function resolveAccountSyncConflict(userId: string, action: "remote" | "local"): Promise<boolean> {
  const uid = String(userId || "").trim();
  const conflict = pendingConflicts.get(uid);

  // Un clic utilisateur ne doit jamais rester sans réaction.
  if (!conflict) {
    emitAccountSync(uid, "error", 100, "La proposition de synchronisation a expiré. Relance la synchronisation.", { restored:false });
    throw new Error("Conflit de synchronisation introuvable ou expiré.");
  }

  // Garder l'appareil est toujours une décision sûre : aucune donnée n'est importée.
  if (action === "local") {
    writeAppliedSignature(uid, candidateSignature(conflict.candidate));
    pendingConflicts.delete(uid);
    emitAccountSync(uid, "done", 100, "Données de cet appareil conservées", { restored:false });
    return false;
  }

  if (!accountStillActive(uid)) {
    emitAccountSync(uid, "error", 100, "Le compte actif a changé. Synchronisation annulée.", { restored:false });
    throw new Error("Le compte actif a changé : synchronisation annulée.");
  }

  try {
    emitAccountSync(uid, "download", 56, `Synchronisation depuis ${conflict.candidate.label}…`, { source: conflict.candidate.source });
    await restoreCandidate(uid, conflict.candidate);
    writeAppliedSignature(uid, candidateSignature(conflict.candidate));
    pendingConflicts.delete(uid);
    emitAccountSync(uid, "done", 100, "Compte synchronisé ✓", { restored:true, source: conflict.candidate.source });
    return true;
  } catch (error: any) {
    emitAccountSync(uid, "error", 100, String(error?.message || "Synchronisation impossible"), { restored:false });
    throw error;
  }
}

function parseMs(value: any): number {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function isoFromMs(value: number): string {
  return value > 0 ? new Date(value).toISOString() : "";
}

function candidateTime(...values: any[]): number {
  for (const value of values) {
    const ms = parseMs(value);
    if (ms > 0) return ms;
  }
  return 0;
}

function summaryQuality(summary?: Partial<VaultSummary> | null): number {
  if (!summary) return 0;
  const profiles = Number(summary.profiles || 0);
  const matches = Number(summary.matches || summary.historyRows || 0);
  const stats = Number(summary.statsMatches || 0);
  const media = Number(summary.mediaRefs || summary.images || 0);
  const keys = Number(summary.keys || 0);
  return profiles * 1_000_000 + matches * 10_000 + stats * 1_000 + media * 10 + keys;
}

function sourcePriority(source: AccountBackupSource): number {
  // En cas d'égalité quasi parfaite, on préfère la copie locale complète :
  // restauration plus rapide et aucune dépendance réseau.
  if (source === "local") return 5;
  if (source === "nas") return 4;
  if (source === "r2") return 4;
  if (source === "google_drive" || source === "onedrive" || source === "dropbox") return 4;
  if (source === "external") return 2;
  return 1;
}

function candidateRevision(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function unwrapPayload(input: any): any {
  if (input == null) return input;
  if (typeof input === "string") {
    try { return unwrapPayload(JSON.parse(input)); } catch { return input; }
  }
  if (input?.snapshotJson && typeof input.snapshotJson === "string") {
    try { return unwrapPayload(JSON.parse(input.snapshotJson)); } catch {}
  }
  if (input?.payload && typeof input.payload === "object" && !input?._v && !input?.history && !input?.idb) {
    return unwrapPayload(input.payload);
  }
  if (input?.data?.payload && typeof input.data.payload === "object") return unwrapPayload(input.data.payload);
  if (input?.snapshot && typeof input.snapshot === "object") return unwrapPayload(input.snapshot);
  return input;
}

function snapshotTimestamp(payload: any): number {
  const p = unwrapPayload(payload) || {};
  return candidateTime(
    p?.backupManifest?.createdAt,
    p?.backupManifest?.updatedAt,
    p?.externalBackup?.exportedAt,
    p?.portableAccountData?.exportedAt,
    p?.exportedAt,
    p?.updatedAt,
    p?.createdAt,
    p?.meta?.exportedAt,
    p?._meta?.exportedAt,
  );
}

function snapshotOwnerIds(payload: any): string[] {
  const p = unwrapPayload(payload) || {};
  const ids = new Set<string>();
  const add = (value: any) => {
    const id = String(value || "").trim();
    if (id) ids.add(id);
  };

  add(p?.backupManifest?.userId);
  add(p?.userId);
  add(p?.user?.id);
  add(p?.session?.user?.id);
  add(p?.portableAccountData?.userId);

  const portableProfiles = Array.isArray(p?.portableAccountData?.profiles)
    ? p.portableAccountData.profiles
    : [];
  for (const profile of portableProfiles.slice(0, 250)) {
    add(profile?.onlineUserId);
    add(profile?.userId);
    add(profile?.privateInfo?.onlineUserId);
    add(profile?.privateInfo?.userId);
  }

  const ls = p?.localStorage && typeof p.localStorage === "object" ? p.localStorage : {};
  for (const key of ["dc_user_id", "dc_storage_user_id_v1"]) add(ls?.[key]);
  try {
    const raw = ls?.dc_online_auth_supabase_v1;
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw);
      add(parsed?.userId);
      add(parsed?.user?.id);
      add(parsed?.session?.user?.id);
    }
  } catch {}

  return Array.from(ids);
}

function payloadHasExplicitOwner(payload: any): boolean {
  return snapshotOwnerIds(payload).length > 0;
}

function payloadOwnerCompatible(payload: any, userId: string, accountScoped = false): boolean {
  const ids = snapshotOwnerIds(payload);
  if (ids.length) return ids.includes(userId);
  // Une vieille sauvegarde sans manifeste n'est autorisée en restauration AUTO
  // que si le provider lui-même est déjà cloisonné par compte (NAS/R2/slot local).
  return accountScoped;
}

function currentAccountScope(): string {
  // La session d'authentification est la source de vérité. `getStorageUser()` est
  // volontairement mis en cache et peut rester quelques ms sur l'ancien compte
  // pendant un login/switch : c'était suffisant pour annuler une synchro valide.
  try {
    const raw = localStorage.getItem("dc_online_auth_supabase_v1") || "";
    if (raw) {
      const parsed = JSON.parse(raw);
      const live = String(parsed?.userId || parsed?.user?.id || parsed?.session?.user?.id || "").trim();
      if (live) return live;
    }
  } catch {}
  try {
    const direct = String(localStorage.getItem("dc_user_id") || localStorage.getItem("dc_storage_user_id_v1") || getStorageUser() || "").trim();
    return direct;
  } catch { return String(getStorageUser() || "").trim(); }
}

function accountStillActive(userId: string): boolean {
  return !!userId && currentAccountScope() === userId;
}

function meaningfulSummary(summary: Partial<VaultSummary> | null | undefined): boolean {
  if (!summary) return false;
  return Number(summary.keys || 0) > 0 ||
    Number(summary.profiles || 0) > 0 ||
    Number(summary.matches || 0) > 0 ||
    Number(summary.historyRows || 0) > 0 ||
    Number(summary.statsBlocks || 0) > 0 ||
    Number(summary.mediaRefs || 0) > 0;
}

function candidateSignature(candidate: AccountBackupCandidate): string {
  return `${candidate.source}|${candidate.id}|${candidate.updatedAtMs}|${candidate.revision}`;
}

function readAppliedSignature(userId: string): string {
  try { return localStorage.getItem(`${APPLIED_PREFIX}:${userId}`) || ""; } catch { return ""; }
}

function writeAppliedSignature(userId: string, signature: string): void {
  try { localStorage.setItem(`${APPLIED_PREFIX}:${userId}`, signature); } catch {}
}

function saveDiagnostic(userId: string, value: any): void {
  try {
    localStorage.setItem(`${LAST_RESULT_PREFIX}:${userId}`, JSON.stringify({
      at: new Date().toISOString(),
      ...value,
    }));
  } catch {}
}

function preserveCurrentAuth(): () => void {
  const exactKeys = new Set([
    "dc_online_auth_supabase_v1",
    "dc_nas_access_token_v1",
    "dc_nas_refresh_token_v1",
    "dc_user_id",
    "dc_storage_user_id_v1",
    "dc_api_url",
  ]);
  const savedLocal: Record<string, string> = {};
  const savedSession: Record<string, string> = {};

  const shouldKeep = (key: string) => exactKeys.has(key) ||
    /^dc-supabase-auth-v2:/i.test(key) ||
    /^sb-.*-auth-token$/i.test(key) ||
    key === "supabase.auth.token" ||
    key === "sb-auth-token";

  const capture = (storage: Storage, target: Record<string, string>) => {
    try {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i) || "";
        if (!key || !shouldKeep(key)) continue;
        const value = storage.getItem(key);
        if (value != null) target[key] = value;
      }
    } catch {}
  };

  capture(window.localStorage, savedLocal);
  capture(window.sessionStorage, savedSession);

  return () => {
    const restore = (storage: Storage, saved: Record<string, string>) => {
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i) || "";
          if (key && shouldKeep(key) && !(key in saved)) toRemove.push(key);
        }
        for (const key of toRemove) storage.removeItem(key);
        for (const [key, value] of Object.entries(saved)) storage.setItem(key, value);
      } catch {}
    };
    restore(window.localStorage, savedLocal);
    restore(window.sessionStorage, savedSession);
  };
}

function localCandidate(slot: MemorySlot): AccountBackupCandidate | null {
  if (slot.source === "before-restore") return null;
  const ms = candidateTime(slot.updatedAt, slot.createdAt);
  return {
    source: "local",
    id: String(slot.id),
    label: slot.label || "Sauvegarde locale",
    updatedAt: slot.updatedAt || slot.createdAt || isoFromMs(ms),
    updatedAtMs: ms,
    revision: 0,
    summary: slot.summary || null,
    accountScoped: true,
    load: async () => decodeMaybeCompressedNasPayloadAsync(slot.payload),
  };
}

function nasCandidate(slot: NasSlot): AccountBackupCandidate | null {
  const id = String(slot.id || "").trim();
  if (!id) return null;
  const ms = candidateTime(slot.promotedAt, slot.updatedAt, slot.createdAt);
  return {
    source: "nas",
    id,
    label: slot.latest ? "Sauvegarde NAS courante" : `Sauvegarde NAS ${id}`,
    updatedAt: String(slot.promotedAt || slot.updatedAt || slot.createdAt || isoFromMs(ms)),
    updatedAtMs: ms,
    revision: candidateRevision(slot.version),
    summary: slot.summary || null,
    accountScoped: true,
    load: async () => {
      const pulled = await pullNasMemorySlot(id, { summaryHint: slot.summary as VaultSummary | undefined });
      return pulled.payload;
    },
  };
}

function r2Candidate(item: CloudObjectIndexItem): AccountBackupCandidate | null {
  const id = String(item.id || "").trim();
  if (!id || item.is_deleted) return null;
  const metadata: any = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const summary = metadata.summary && typeof metadata.summary === "object" ? metadata.summary : metadata;
  const ms = candidateTime(metadata.exportedAt, item.updated_at, item.created_at);
  return {
    source: "r2",
    id,
    label: String(item.title || "Sauvegarde Cloud R2"),
    updatedAt: String(metadata.exportedAt || item.updated_at || item.created_at || isoFromMs(ms)),
    updatedAtMs: ms,
    revision: candidateRevision(metadata.revision || metadata.version),
    summary,
    accountScoped: true,
    load: async () => {
      const downloaded = await downloadCloudObject(id);
      if (!downloaded?.ok) throw new Error("Téléchargement R2 impossible");
      return downloaded.content ?? downloaded.text;
    },
  };
}

function externalCandidate(payload: any): AccountBackupCandidate | null {
  if (!payload || typeof payload !== "object") return null;
  const ms = snapshotTimestamp(payload);
  const summary = summarizeVaultPayload(unwrapPayload(payload));
  return {
    source: "external",
    id: `external_${ms || "legacy"}`,
    label: "Sauvegarde fichier / SD / cloud personnel",
    updatedAt: isoFromMs(ms),
    updatedAtMs: ms,
    revision: candidateRevision(payload?.backupManifest?.revision),
    summary,
    accountScoped: false,
    load: async () => payload,
  };
}

function legacyAutoCandidate(item: AutoBackupItem, index: number, userId: string): AccountBackupCandidate | null {
  if (!item?.payload || !payloadHasExplicitOwner(item.payload) || !payloadOwnerCompatible(item.payload, userId, false)) return null;
  const ms = candidateTime(item.createdAt, snapshotTimestamp(item.payload));
  const summary = summarizeVaultPayload(unwrapPayload(item.payload));
  return {
    source: "legacy-auto",
    id: `legacy_auto_${index}_${ms}`,
    label: "Ancienne sauvegarde automatique locale",
    updatedAt: item.createdAt || isoFromMs(ms),
    updatedAtMs: ms,
    revision: 0,
    summary,
    accountScoped: false,
    load: async () => item.payload,
  };
}

async function scanLocal(userId: string): Promise<AccountBackupCandidate[]> {
  const slots = await listLocalMemorySlots().catch(() => []);
  const primary = slots.map(localCandidate).filter(Boolean) as AccountBackupCandidate[];
  const legacy = (() => {
    try {
      return getAutoBackups()
        .map((item, index) => legacyAutoCandidate(item, index, userId))
        .filter(Boolean) as AccountBackupCandidate[];
    } catch {
      return [];
    }
  })();
  return [...primary, ...legacy];
}

async function scanNas(userId: string): Promise<AccountBackupCandidate[]> {
  const uid = String(userId || "").trim();
  if (!uid || !accountStillActive(uid)) return [];

  const allowedIds = new Set<string>([uid]);
  try {
    const cached = JSON.parse(localStorage.getItem("dc_online_auth_supabase_v1") || "null");
    if (String(cached?.supabaseUserId || "").trim() === uid) {
      for (const id of [cached?.userId, cached?.user?.id]) {
        const value = String(id || "").trim();
        if (value) allowedIds.add(value);
      }
    }
  } catch {}

  const tokenBelongsToUser = () => {
    const token = String(readNasAccessToken() || "").trim();
    if (!token) return false;
    const sub = String(decodeJwtPayloadUnsafe(token)?.sub || "").trim();
    return !!sub && allowedIds.has(sub);
  };

  // Le bridge NAS reste best-effort et s'exécute désormais en tâche de fond.
  // Un JWT NAS de l'utilisateur précédent est explicitement ignoré.
  if (!tokenBelongsToUser()) {
    try {
      const mod = await import("../onlineApi");
      if (!accountStillActive(uid)) return [];
      const capability = await mod.onlineApi.getPrivateNasCapability?.();
      const canonical = String(capability?.canonicalUserId || "").trim();
      if (canonical) allowedIds.add(canonical);
      if (capability?.authorized === true && accountStillActive(uid)) {
        await mod.onlineApi.switchAccountInfrastructure?.("nas");
      }
    } catch {}
  }
  if (!accountStillActive(uid) || !tokenBelongsToUser()) return [];

  const slots = await listNasMemorySlots();
  if (!accountStillActive(uid)) return [];
  return slots
    .filter((slot) => !slot.ownerId || allowedIds.has(String(slot.ownerId).trim()))
    .map(nasCandidate)
    .filter(Boolean) as AccountBackupCandidate[];
}

async function scanR2(): Promise<AccountBackupCandidate[]> {
  const rows = await listCloudVaultBackups(30, false);
  return rows.map(r2Candidate).filter(Boolean) as AccountBackupCandidate[];
}

async function scanPersonalCloud(userId: string): Promise<AccountBackupCandidate[]> {
  const selected = loadStoragePrefs().selectedDestination;
  if (!isPersonalCloudProvider(selected)) return [];
  const provider = selected as PersonalCloudProvider;
  const meta = await getPersonalCloudBackupMeta(provider);
  if (!meta) return [];
  const summary = meta?.metadata?.summary || {};
  const ms = candidateTime(meta.updatedAt, meta?.metadata?.exportedAt);
  return [{
    source: provider, id: `personal_${provider}_latest`, label: `Sauvegarde ${personalCloudProviderLabel(provider)}`,
    updatedAt: String(meta.updatedAt || isoFromMs(ms)), updatedAtMs: ms, revision: 0, summary, accountScoped: true,
    load: () => downloadPersonalCloudSnapshot(provider),
  }];
}

async function scanExternal(userId: string): Promise<AccountBackupCandidate[]> {
  const payload = await readExternalBackupSnapshotIfPermitted();
  if (!payload || !payloadHasExplicitOwner(payload) || !payloadOwnerCompatible(payload, userId, false)) return [];
  const candidate = externalCandidate(payload);
  return candidate ? [candidate] : [];
}

async function candidateFromLatestPointer(userId: string, pointer: AccountLatestBackup): Promise<AccountBackupCandidate | null> {
  const provider = String(pointer?.provider || "") as AccountBackupSource;
  const id = String(pointer?.backupId || "").trim();
  if (!id || !accountStillActive(userId)) return null;
  const ms = candidateTime(pointer.createdAt, pointer.updatedAt);
  const common = {
    source: provider,
    id,
    label: `Dernière sauvegarde — ${provider}`,
    updatedAt: String(pointer.createdAt || pointer.updatedAt || isoFromMs(ms)),
    updatedAtMs: ms,
    revision: candidateRevision(pointer.revision),
    summary: (pointer.summary || {}) as Partial<VaultSummary>,
    accountScoped: true,
  };

  if (provider === "nas") return { ...common, load: async () => (await pullNasMemorySlot(id, { summaryHint: pointer.summary as VaultSummary | undefined })).payload };
  if (provider === "r2") return { ...common, load: async () => {
    const downloaded = await downloadCloudObject(id);
    if (!downloaded?.ok) throw new Error("Téléchargement R2 impossible");
    return downloaded.content ?? downloaded.text;
  }};
  if (provider === "google_drive" || provider === "onedrive" || provider === "dropbox") {
    return { ...common, load: () => downloadPersonalCloudSnapshotById(provider as PersonalCloudProvider, id) };
  }
  if (provider === "local") {
    const slots = await listLocalMemorySlots().catch(() => []);
    const slot = slots.find((row) => String(row.id) === id);
    return slot ? localCandidate(slot) : null;
  }
  if (provider === "external") {
    const payload = await readExternalBackupSnapshotIfPermitted();
    if (!payload || !payloadOwnerCompatible(payload, userId, false)) return null;
    const candidate = externalCandidate(payload);
    return candidate ? { ...candidate, id } : null;
  }
  return null;
}

async function getDirectLatestCandidate(userId: string): Promise<{ pointer: AccountLatestBackup | null; candidate: AccountBackupCandidate | null }> {
  try {
    const pointer = await getAccountLatestBackup();
    if (!pointer || !accountStillActive(userId)) return { pointer: null, candidate: null };
    return { pointer, candidate: await candidateFromLatestPointer(userId, pointer) };
  } catch {
    return { pointer: null, candidate: null };
  }
}

export async function scanAccountBackups(userId: string): Promise<AccountBackupScanResult> {
  const uid = String(userId || "").trim();
  if (!uid) return { candidates: [], errors: [] };

  // Scanner n'a jamais le droit de changer de compte actif. L'authentification
  // possède le scope ; si l'utilisateur a changé de compte entre-temps on annule.
  if (!accountStillActive(uid)) return { candidates: [], errors: [] };

  const jobs: Array<{ source: AccountBackupSource; run: () => Promise<AccountBackupCandidate[]> }> = [
    { source: "local", run: () => scanLocal(uid) },
    { source: "nas", run: () => scanNas(uid) },
    { source: "r2", run: scanR2 },
    { source: "google_drive", run: () => scanPersonalCloud(uid) },
    { source: "external", run: () => scanExternal(uid) },
  ];

  // IMPORTANT Android : aucune source ne peut retenir le scan global indéfiniment.
  // Promise.all sans garde était la cause principale de la barre figée à 12 % :
  // une seule source (NAS/R2/Drive/externe) pouvait ne jamais résoudre.
  const timeoutBySource: Partial<Record<AccountBackupSource, number>> = {
    local: 2_500, nas: 5_000, r2: 5_000, google_drive: 5_000,
    onedrive: 5_000, dropbox: 5_000, external: 2_000,
  };
  const settled = await Promise.all(jobs.map(async (job) => {
    try {
      const timeoutMs = timeoutBySource[job.source] || 5_000;
      const items = await withSyncTimeout(job.run(), timeoutMs, `Scan ${job.source}`);
      return { source: job.source, items, error: "" };
    } catch (error: any) {
      return { source: job.source, items: [] as AccountBackupCandidate[], error: String(error?.message || error || "Source indisponible") };
    }
  }));

  if (!accountStillActive(uid)) return { candidates: [], errors: [] };

  const candidates = settled.flatMap((row) => row.items)
    .filter((candidate) => candidate.updatedAtMs > 0 || summaryQuality(candidate.summary) > 0);
  const errors = settled
    .filter((row) => !!row.error)
    .map((row) => ({ source: row.source, message: row.error }));

  return { candidates, errors };
}

function candidateMatchCount(candidate: AccountBackupCandidate): number {
  const summary = candidate.summary || {};
  return Math.max(0, Number(summary.matches || 0), Number(summary.historyRows || 0), Number(summary.statsMatches || 0));
}

function candidateProfileCount(candidate: AccountBackupCandidate): number {
  return Math.max(0, Number(candidate.summary?.profiles || 0));
}

export function pickLatestBackupCandidate(candidates: AccountBackupCandidate[]): AccountBackupCandidate | null {
  // V62 ACCOUNT SAVE — anti-perte façon console. Un snapshot récent mais tronqué
  // ne doit jamais battre automatiquement une copie du MEME compte qui contient
  // davantage de parties. On privilégie d'abord la continuité de l'historique,
  // puis la date/révision. Les suppressions volontaires restent possibles via
  // une restauration manuelle explicite depuis le Centre de sauvegarde.
  const valid = [...(candidates || [])].filter((c) => meaningfulSummary(c.summary));
  const richestMatches = valid.reduce((m, c) => Math.max(m, candidateMatchCount(c)), 0);
  const richestProfiles = valid.reduce((m, c) => Math.max(m, candidateProfileCount(c)), 0);
  const protectedSet = valid.filter((c) => {
    const matches = candidateMatchCount(c);
    const profiles = candidateProfileCount(c);
    if (richestMatches > 0 && matches > 0 && matches < richestMatches) return false;
    if (richestMatches === 0 && richestProfiles > 0 && profiles > 0 && profiles < richestProfiles) return false;
    return true;
  });
  const sorted = (protectedSet.length ? protectedSet : valid).sort((a, b) => {
    const dt = b.updatedAtMs - a.updatedAtMs;
    if (Math.abs(dt) > 1_500) return dt;
    const rev = b.revision - a.revision;
    if (rev) return rev;
    const quality = summaryQuality(b.summary) - summaryQuality(a.summary);
    if (quality) return quality;
    return sourcePriority(b.source) - sourcePriority(a.source);
  });
  return sorted[0] || null;
}

async function withSyncTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} : délai dépassé`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Résumé local RAPIDE : ne reconstruit jamais le snapshot complet au démarrage.
 * On exploite uniquement les métadonnées des sauvegardes locales déjà indexées.
 * Cela évite le gel observé à 78 % sur Android avec un coffre de plusieurs dizaines de Mo.
 */
async function summarizeCurrentLocalFast(): Promise<Partial<VaultSummary>> {
  // V127 : comparer la sauvegarde distante avec les DONNÉES ACTUELLES de l'appareil,
  // pas avec la dernière sauvegarde locale. Une sauvegarde locale peut être ancienne
  // et masquer précisément les changements que la synchro doit détecter.
  const liveStore = await withSyncTimeout(
    loadStore<any>().catch(() => null),
    3_000,
    "Lecture des données locales",
  ).catch(() => null);
  if (liveStore) {
    const liveSummary = summarizeVaultPayload({ store: liveStore });
    if (meaningfulSummary(liveSummary)) return liveSummary;
  }

  // Fallback uniquement si IndexedDB n'est momentanément pas lisible.
  const slots = await withSyncTimeout(listLocalMemorySlots().catch(() => []), 1500, "Lecture du résumé local").catch(() => []);
  const candidates = slots.map(localCandidate).filter(Boolean) as AccountBackupCandidate[];
  const latest = pickLatestBackupCandidate(candidates);
  return latest?.summary && meaningfulSummary(latest.summary) ? latest.summary : {};
}

async function summarizeCurrentLocal(): Promise<VaultSummary> {
  const snapshot = await exportCloudSnapshot({
    mediaMirror: "skip",
    includeEmbeddedMedia: false,
    includeAvatarFallbacks: false,
  });
  return summarizeVaultPayload(snapshot);
}

function localLooksAtLeastAsComplete(local: VaultSummary, expected?: Partial<VaultSummary> | null): boolean {
  if (!expected || !meaningfulSummary(expected)) return Number(local.keys || 0) > 0;
  const expectedProfiles = Number(expected.profiles || 0);
  const expectedMatches = Number(expected.matches || expected.historyRows || 0);
  const localMatches = Number(local.matches || local.historyRows || 0);
  if (expectedProfiles > 0 && Number(local.profiles || 0) < expectedProfiles) return false;
  if (expectedMatches > 0 && localMatches < expectedMatches) return false;
  return Number(local.keys || 0) > 0 || Number(local.profiles || 0) > 0 || localMatches > 0;
}

async function restoreCandidate(userId: string, candidate: AccountBackupCandidate): Promise<void> {
  const restoreAuth = preserveCurrentAuth();
  let safetySnapshot: any = null;

  try {
    if (!accountStillActive(userId)) throw new Error("Le compte actif a changé : restauration annulée.");

    // Filet anti-régression : cette copie est explicitement exclue du choix automatique
    // au prochain boot, donc elle ne peut pas "gagner" parce qu'elle vient d'être créée.
    safetySnapshot = await exportCloudSnapshot({ mediaMirror: "skip" }).catch(() => null);
    if (safetySnapshot) {
      const summary = summarizeVaultPayload(safetySnapshot);
      await createLocalMemorySlotFromSnapshot(
        safetySnapshot,
        `${BEFORE_RESTORE_LABEL} — ${new Date().toLocaleString("fr-FR")}`,
        "before-restore",
        summary,
      ).catch(() => null);
    }

    if (!accountStillActive(userId)) throw new Error("Le compte actif a changé : restauration annulée.");
    const loaded = await candidate.load();
    if (!accountStillActive(userId)) throw new Error("Le compte actif a changé pendant le téléchargement : restauration annulée.");
    const payload = unwrapPayload(loaded);
    if (!payload || typeof payload !== "object") throw new Error("Sauvegarde vide ou illisible.");
    if (!payloadOwnerCompatible(payload, userId, candidate.accountScoped)) throw new Error("Cette sauvegarde appartient à un autre compte ou son propriétaire n'est pas vérifiable.");

    const loadedSummary = summarizeVaultPayload(payload);
    if (!meaningfulSummary(loadedSummary)) throw new Error("Sauvegarde invalide : aucune donnée restaurable détectée.");

    if (!accountStillActive(userId)) throw new Error("Le compte actif a changé avant import : restauration annulée.");
    await importCloudSnapshot(payload, { mode: "replace" });

    // Rejoue uniquement les changements postérieurs au checkpoint complet.
    // Le transport manuel Google Drive/NAS reste intact : le journal incrémental
    // utilise ses propres objets/endpoints et ne remplace jamais le snapshot.
    try {
      const deltaProvider = candidate.source === "nas" ? "founder_nas"
        : candidate.source === "r2" ? "cloud_r2"
        : candidate.source;
      if (["founder_nas", "cloud_r2", "google_drive", "onedrive", "dropbox"].includes(deltaProvider)) {
        const deltas = await fetchRemoteIncrementalChanges(deltaProvider);
        await applyIncrementalChanges(deltas, { since: candidate.updatedAtMs });
      }
    } catch (deltaError) {
      console.warn("[backupCoordinator] incremental replay skipped", deltaError);
    }

    restoreAuth();
    if (!accountStillActive(userId)) throw new Error("Le compte actif a changé pendant l'import : rollback.");
    try { setStorageUser(userId); } catch {}
    try { localStorage.setItem("dc_user_id", userId); } catch {}

    const localAfter = await summarizeCurrentLocal();
    if (!localLooksAtLeastAsComplete(localAfter, loadedSummary)) {
      throw new Error("Vérification après restauration échouée : l'état local est incomplet.");
    }

    try { window.dispatchEvent(new CustomEvent("dc-history-updated", { detail: { reason: "latest-backup-auto-restore", source: candidate.source } })); } catch {}
    try { window.dispatchEvent(new CustomEvent("dc-store-updated", { detail: { reason: "latest-backup-auto-restore", source: candidate.source } })); } catch {}
  } catch (error) {
    restoreAuth();
    if (safetySnapshot) {
      try {
        const authAgain = preserveCurrentAuth();
        // Ne rollback que si ce même compte est toujours actif. Une ancienne tâche
        // n'a jamais le droit d'écraser le nouveau compte après un switch.
        if (accountStillActive(userId)) {
          await importCloudSnapshot(safetySnapshot, { mode: "replace" });
          authAgain();
          try { setStorageUser(userId); } catch {}
        }
      } catch (rollbackError) {
        console.error("[backupCoordinator] rollback failed", rollbackError);
      }
    }
    throw error;
  }
}

/**
 * Après connexion, cherche la sauvegarde complète la plus récente parmi TOUTES
 * les sources réellement disponibles (local, NAS, R2, fichier/SD/cloud perso),
 * puis applique une seule source de manière atomique avec rollback local.
 *
 * Retourne true uniquement lorsqu'une restauration a réellement été appliquée.
 */
export async function restoreLatestBackupForSignedInUser(
  userId?: string | null,
  opts?: { force?: boolean },
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const uid = String(userId || "").trim();
  if (!uid || !accountStillActive(uid)) return false;

  const existing = inFlightByUser.get(uid);
  if (existing) return existing;
  const now = Date.now();
  const lastRunAt = lastRunAtByUser.get(uid) || 0;
  if (!opts?.force && now - lastRunAt < RUN_COOLDOWN_MS) return false;
  lastRunAtByUser.set(uid, now);

  const task = (async () => {
    try {
      if (!accountStillActive(uid)) return false;
      emitAccountSync(uid, "search", 12, "Recherche de la dernière sauvegarde du compte…");
      // V126 FIX : le pointeur serveur est une simple lecture de métadonnées.
      // Il ne doit jamais immobiliser le téléphone plusieurs secondes à 12 %.
      // On fait progresser immédiatement l'UI puis on borne très court cette lecture.
      emitAccountSync(uid, "search", 24, "Lecture de l’index de sauvegarde…");
      // V115 : chemin rapide. Le compte possède un pointeur serveur vers SA dernière
      // sauvegarde réussie. Aucun scan NAS/R2/Drive n'est lancé lorsqu'il existe.
      const direct = await withSyncTimeout(
        getDirectLatestCandidate(uid),
        3_200,
        "Lecture du pointeur de sauvegarde",
      ).catch(() => ({ pointer: null, candidate: null }));
      if (!accountStillActive(uid)) {
        emitAccountSync(uid, "done", 100, "Synchronisation annulée — compte changé", { restored:false });
        return false;
      }

      let scan: AccountBackupScanResult = { candidates: [], errors: [] };
      let latest = direct.candidate;

      // Migration des anciens comptes uniquement : s'il n'existe encore aucun
      // pointeur, on effectue UNE découverte historique, puis on mémorise le gagnant.
      if (!direct.pointer) {
        // Ancien compte / backend sans pointeur : on informe l'UI que la première
        // étape est terminée. La barre ne doit jamais sembler gelée à 12 %.
        emitAccountSync(uid, "search", 36, "Recherche des sauvegardes disponibles…");
        scan = await withSyncTimeout(scanAccountBackups(uid), 7_000, "Recherche des sauvegardes").catch((error: any) => ({
          candidates: [],
          errors: [{ source: "external" as AccountBackupSource, message: String(error?.message || error || "Scan interrompu") }],
        }));
        if (!accountStillActive(uid)) {
          emitAccountSync(uid, "done", 100, "Synchronisation annulée — compte changé", { restored:false });
          return false;
        }
        latest = pickLatestBackupCandidate(scan.candidates);
        if (latest) {
          void registerAccountLatestBackup({
            provider: latest.source === "legacy-auto" ? "local" : latest.source as any,
            backupId: latest.id, createdAt: latest.updatedAt, revision: latest.revision,
            summary: (latest.summary || {}) as Record<string, any>,
          } as any).catch(() => null);
        }
      }

      if (!latest) {
        saveDiagnostic(uid, { ok: true, restored: false, reason: direct.pointer ? "latest-pointer-unavailable" : "no-backup", pointer: direct.pointer, scanErrors: scan.errors });
        // Etat terminal indispensable : sans lui l'UI restait figée à 12 %.
        emitAccountSync(uid, "done", 100, direct.pointer ? "Synchronisation vérifiée" : "Aucune sauvegarde à synchroniser", { restored:false });
        return false;
      }

      const signature = candidateSignature(latest);
      const alreadyApplied = readAppliedSignature(uid) === signature;
      if (alreadyApplied) {
        // La signature du dernier backup serveur a déjà été appliquée : surtout ne pas
        // réexporter les dizaines de Mo du stockage local juste pour le revalider.
        saveDiagnostic(uid, { ok: true, restored: false, reason: "already-current-signature", candidate: { ...latest, load: undefined }, scanErrors: scan.errors });
        emitAccountSync(uid, "done", 100, "Compte déjà à jour", { restored:false });
        return false;
      }

      emitAccountSync(uid, "compare", 78, "Comparaison des appareils…", { source: latest.source });
      // IMPORTANT : comparaison metadata-only. Aucun exportCloudSnapshot ici.
      // Le snapshot complet n'est chargé qu'après un choix explicite de restauration.
      const localBefore = await withSyncTimeout(
        summarizeCurrentLocalFast(),
        3_000,
        "Comparaison locale",
      ).catch(() => ({} as Partial<VaultSummary>));
      if (!accountStillActive(uid)) {
        emitAccountSync(uid, "done", 100, "Synchronisation annulée — compte changé", { restored:false });
        return false;
      }
      const conflict = buildConflict(uid, latest, localBefore || {});
      if (!conflict.differences.length && meaningfulSummary(localBefore) && localLooksAtLeastAsComplete(localBefore as VaultSummary, latest.summary)) {
        writeAppliedSignature(uid, signature);
        saveDiagnostic(uid, { ok: true, restored: false, reason: "same-summary-fast", candidate: { source: latest.source, id: latest.id } });
        emitAccountSync(uid, "done", 100, "Compte déjà à jour", { restored:false });
        return false;
      }
      // P0 V10: au boot/login, la comparaison reste STRICTEMENT metadata-only.
      // Télécharger un snapshot complet + loadStore() uniquement pour détailler une
      // différence pouvait tomber 30-90 s plus tard et figer Android. Les détails
      // complets restent disponibles lors d'une action manuelle explicite (force).
      if (!opts?.force) {
        conflict.details = [];
        emitConflict(conflict);
        saveDiagnostic(uid, { ok:true, restored:false, reason:"user-choice-required-metadata-only", candidate:{source:latest.source,id:latest.id}, differences:conflict.differences, details:[] });
        emitAccountSync(uid, "done", 100, "Synchronisation vérifiée — choix utilisateur requis", { restored:false });
        return false;
      }

      emitAccountSync(uid, "compare-details", 88, "Analyse détaillée des différences…", { source: latest.source });
      const remoteForDiff = await withSyncTimeout(latest.load(), 6_000, "Lecture détaillée de la sauvegarde").catch(() => null);
      const localStoreForDiff = await withSyncTimeout(loadStore<any>().catch(() => null), 3_000, "Lecture détaillée locale").catch(() => null);
      conflict.details = await buildDetailedDifferences(remoteForDiff, localStoreForDiff).catch(() => []);
      emitConflict(conflict);
      saveDiagnostic(uid, { ok:true, restored:false, reason:"user-choice-required", candidate:{source:latest.source,id:latest.id}, differences:conflict.differences, details:conflict.details });
      return false;
    } catch (error: any) {
      saveDiagnostic(uid, { ok: false, restored: false, error: String(error?.message || error || "Restauration impossible") });
      // Ne jamais laisser la barre dans un état intermédiaire (12/78 %) si une source échoue.
      emitAccountSync(uid, "error", 100, "Synchronisation interrompue", { restored:false });
      console.warn("[backupCoordinator] automatic latest-backup restore skipped", error);
      return false;
    } finally {
      if (inFlightByUser.get(uid) === task) inFlightByUser.delete(uid);
    }
  })();

  inFlightByUser.set(uid, task);
  return task;
}
