// ============================================================
// Authoritative manual restore guard
//
// A backup explicitly selected by the user must remain the authority until
// the restored local state has been sealed back into account-owned sync.
// This prevents a stale remote document / auto-latest candidate from
// overwriting the freshly restored browser state after reload.
// ============================================================

export type AuthoritativeRestoreMarker = {
  v: 1;
  userId: string;
  at: number;
  provider?: string;
  reason?: string;
  label?: string;
  matches?: number;
  profiles?: number;
};

const PENDING_PREFIX = "dc_authoritative_restore_pending_v1:";
const AUTO_GUARD_PREFIX = "dc_authoritative_restore_auto_guard_v1:";
const MAX_PENDING_AGE_MS = 6 * 60 * 60_000;
const POST_SEAL_GUARD_MS = 20 * 60_000;

function clean(value: any): string {
  return String(value || "").trim();
}

function pendingKey(userId: string): string {
  return `${PENDING_PREFIX}${clean(userId)}`;
}

function guardKey(userId: string): string {
  return `${AUTO_GUARD_PREFIX}${clean(userId)}`;
}

export function writeAuthoritativeRestorePending(input: Omit<AuthoritativeRestoreMarker, "v" | "at"> & { at?: number }): AuthoritativeRestoreMarker | null {
  if (typeof window === "undefined") return null;
  const userId = clean(input?.userId);
  if (!userId) return null;
  const marker: AuthoritativeRestoreMarker = {
    v: 1,
    userId,
    at: Number(input?.at || Date.now()) || Date.now(),
    provider: clean(input?.provider) || undefined,
    reason: clean(input?.reason) || undefined,
    label: clean(input?.label) || undefined,
    matches: Number.isFinite(Number(input?.matches)) ? Number(input?.matches) : undefined,
    profiles: Number.isFinite(Number(input?.profiles)) ? Number(input?.profiles) : undefined,
  };
  try {
    localStorage.setItem(pendingKey(userId), JSON.stringify(marker));
    localStorage.setItem(guardKey(userId), String(marker.at + MAX_PENDING_AGE_MS));
  } catch {}
  return marker;
}

export function readAuthoritativeRestorePending(userIdInput: string): AuthoritativeRestoreMarker | null {
  if (typeof window === "undefined") return null;
  const userId = clean(userIdInput);
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(pendingKey(userId));
    if (!raw) return null;
    const marker = JSON.parse(raw) as AuthoritativeRestoreMarker;
    if (!marker || marker.v !== 1 || clean(marker.userId) !== userId) {
      localStorage.removeItem(pendingKey(userId));
      return null;
    }
    if (!Number(marker.at) || Date.now() - Number(marker.at) > MAX_PENDING_AGE_MS) {
      localStorage.removeItem(pendingKey(userId));
      return null;
    }
    return marker;
  } catch {
    return null;
  }
}

export function sealAuthoritativeRestore(userIdInput: string): void {
  if (typeof window === "undefined") return;
  const userId = clean(userIdInput);
  if (!userId) return;
  try {
    localStorage.removeItem(pendingKey(userId));
    localStorage.setItem(guardKey(userId), String(Date.now() + POST_SEAL_GUARD_MS));
  } catch {}
}

export function clearAuthoritativeRestorePending(userIdInput: string): void {
  if (typeof window === "undefined") return;
  const userId = clean(userIdInput);
  if (!userId) return;
  try { localStorage.removeItem(pendingKey(userId)); } catch {}
}

export function shouldSuppressAutomaticRestore(userIdInput: string): boolean {
  if (typeof window === "undefined") return false;
  const userId = clean(userIdInput);
  if (!userId) return false;
  if (readAuthoritativeRestorePending(userId)) return true;
  try {
    const until = Number(localStorage.getItem(guardKey(userId)) || 0) || 0;
    if (until > Date.now()) return true;
    if (until) localStorage.removeItem(guardKey(userId));
  } catch {}
  return false;
}
