// ============================================================
// src/lib/accountProfileOutbox.ts
// File locale légère pour les mutations de MON PROFIL.
//
// Le gameplay reste local-first. Une modification d'identité/préférences faite
// sans réseau est donc conservée jusqu'à ce que Supabase redevienne joignable.
// Ce fichier ne fait AUCUN appel réseau et ne dépend pas d'onlineApi afin
// d'éviter les dépendances circulaires.
// ============================================================

export type QueuedAccountProfileUpdate = {
  version: 1;
  userId: string;
  patch: Record<string, any>;
  queuedAt: number;
  attempts: number;
  lastError?: string | null;
};

const PREFIX = "dc_account_profile_outbox_v1:";
const EVENT = "dc:account-profile-outbox-changed";

function cleanId(value: any): string {
  return String(value || "").trim();
}

function storageKey(userId: string): string {
  return `${PREFIX}${cleanId(userId)}`;
}

function meaningful(value: any): boolean {
  return value !== undefined;
}

function mergeDefined(base: any, patch: any): any {
  const out: Record<string, any> = base && typeof base === "object" && !Array.isArray(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(patch && typeof patch === "object" ? patch : {})) {
    if (!meaningful(value)) continue;
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      out[key] && typeof out[key] === "object" && !Array.isArray(out[key])
    ) {
      out[key] = mergeDefined(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function emit(userId: string, pending: boolean): void {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { userId, pending, at: Date.now() } }));
    }
  } catch {}
}

export function readQueuedAccountProfileUpdate(userId: string): QueuedAccountProfileUpdate | null {
  const uid = cleanId(userId);
  if (!uid || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || cleanId(parsed.userId) !== uid || !parsed.patch || typeof parsed.patch !== "object") return null;
    return {
      version: 1,
      userId: uid,
      patch: parsed.patch,
      queuedAt: Number(parsed.queuedAt || 0) || Date.now(),
      attempts: Number(parsed.attempts || 0) || 0,
      lastError: parsed.lastError ? String(parsed.lastError) : null,
    };
  } catch {
    return null;
  }
}

export function queueAccountProfileUpdate(
  userId: string,
  patch: Record<string, any>,
  options: { error?: any; attempted?: boolean } = {},
): QueuedAccountProfileUpdate | null {
  const uid = cleanId(userId);
  if (!uid || !patch || typeof patch !== "object" || typeof localStorage === "undefined") return null;
  const previous = readQueuedAccountProfileUpdate(uid);
  const next: QueuedAccountProfileUpdate = {
    version: 1,
    userId: uid,
    patch: mergeDefined(previous?.patch || {}, patch),
    // queuedAt représente la DERNIÈRE mutation locale, pas le premier échec.
    queuedAt: Date.now(),
    attempts: (previous?.attempts || 0) + (options.attempted ? 1 : 0),
    lastError: options.error ? String(options.error?.message || options.error) : previous?.lastError || null,
  };
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(next));
    emit(uid, true);
  } catch {}
  return next;
}

export function clearQueuedAccountProfileUpdate(userId: string): void {
  const uid = cleanId(userId);
  if (!uid || typeof localStorage === "undefined") return;
  try { localStorage.removeItem(storageKey(uid)); } catch {}
  emit(uid, false);
}

export function markQueuedAccountProfileAttempt(userId: string, error?: any): void {
  const pending = readQueuedAccountProfileUpdate(userId);
  if (!pending || typeof localStorage === "undefined") return;
  const next: QueuedAccountProfileUpdate = {
    ...pending,
    attempts: pending.attempts + 1,
    lastError: error ? String(error?.message || error) : pending.lastError || null,
  };
  try { localStorage.setItem(storageKey(pending.userId), JSON.stringify(next)); } catch {}
  emit(pending.userId, true);
}

export function mergeAccountProfilePatches(base: Record<string, any> | null | undefined, patch: Record<string, any> | null | undefined): Record<string, any> {
  return mergeDefined(base || {}, patch || {});
}

export const ACCOUNT_PROFILE_OUTBOX_EVENT = EVENT;
