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
  getStorageUser,
  setStorageUser,
} from "../storage";
import { getAutoBackups, type AutoBackupItem } from "./autoBackupService";

export type AccountBackupSource = "local" | "nas" | "r2" | "external" | "legacy-auto";

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
  if (source === "r2") return 3;
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
  try { return String(getStorageUser() || localStorage.getItem("dc_storage_user_id_v1") || localStorage.getItem("dc_user_id") || "").trim(); }
  catch { return String(getStorageUser() || "").trim(); }
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

async function scanExternal(userId: string): Promise<AccountBackupCandidate[]> {
  const payload = await readExternalBackupSnapshotIfPermitted();
  if (!payload || !payloadHasExplicitOwner(payload) || !payloadOwnerCompatible(payload, userId, false)) return [];
  const candidate = externalCandidate(payload);
  return candidate ? [candidate] : [];
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
    { source: "external", run: () => scanExternal(uid) },
  ];

  const settled = await Promise.all(jobs.map(async (job) => {
    try {
      return { source: job.source, items: await job.run(), error: "" };
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

export function pickLatestBackupCandidate(candidates: AccountBackupCandidate[]): AccountBackupCandidate | null {
  const sorted = [...(candidates || [])].sort((a, b) => {
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
      const scan = await scanAccountBackups(uid);
      if (!accountStillActive(uid)) return false;

      const latest = pickLatestBackupCandidate(scan.candidates);
      if (!latest) {
        saveDiagnostic(uid, { ok: true, restored: false, reason: "no-backup", scanErrors: scan.errors });
        return false;
      }

      const signature = candidateSignature(latest);
      const alreadyApplied = readAppliedSignature(uid) === signature;
      if (alreadyApplied) {
        const local = await summarizeCurrentLocal().catch(() => null);
        if (!accountStillActive(uid)) return false;
        if (local && localLooksAtLeastAsComplete(local, latest.summary)) {
          saveDiagnostic(uid, { ok: true, restored: false, reason: "already-current", candidate: { ...latest, load: undefined }, scanErrors: scan.errors });
          return false;
        }
      }

      await restoreCandidate(uid, latest);
      if (!accountStillActive(uid)) return false;
      writeAppliedSignature(uid, signature);
      saveDiagnostic(uid, {
        ok: true,
        restored: true,
        source: latest.source,
        id: latest.id,
        updatedAt: latest.updatedAt,
        candidates: scan.candidates.map((c) => ({ source: c.source, id: c.id, updatedAt: c.updatedAt, revision: c.revision, quality: summaryQuality(c.summary) })),
        scanErrors: scan.errors,
      });

      // Reload uniquement si le compte restauré est TOUJOURS le compte actif.
      window.setTimeout(() => {
        if (!accountStillActive(uid)) return;
        try { window.location.reload(); } catch {}
      }, 220);
      return true;
    } catch (error: any) {
      saveDiagnostic(uid, { ok: false, restored: false, error: String(error?.message || error || "Restauration impossible") });
      console.warn("[backupCoordinator] automatic latest-backup restore skipped", error);
      return false;
    } finally {
      if (inFlightByUser.get(uid) === task) inFlightByUser.delete(uid);
    }
  })();

  inFlightByUser.set(uid, task);
  return task;
}
