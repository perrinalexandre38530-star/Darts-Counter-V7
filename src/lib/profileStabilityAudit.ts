// ============================================
// Profil / avatar / stats stability audit
// Lightweight and opt-in. It records only fingerprints/metadata, never image bytes.
// ============================================

export type ProfileStabilityAuditEvent = {
  id: string;
  at: number;
  kind: string;
  source?: string;
  route?: string;
  activeProfileId?: string | null;
  storageUser?: string | null;
  profilesLen?: number;
  historyLen?: number;
  dartSetsLen?: number;
  profile?: any;
  meta?: any;
};

const ENABLED_KEY = "dc_profile_stability_audit_enabled_v1";
const EVENTS_KEY = "dc_profile_stability_audit_events_v1";
const MAX_EVENTS = 240;

function safeLsGet(key: string): string | null {
  try { return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null; } catch { return null; }
}
function safeLsSet(key: string, value: string) {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(key, value); } catch {}
}
function safeLsRemove(key: string) {
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(key); } catch {}
}

export function isProfileStabilityAuditEnabled(): boolean {
  return safeLsGet(ENABLED_KEY) === "1";
}

export function setProfileStabilityAuditEnabled(enabled: boolean): void {
  safeLsSet(ENABLED_KEY, enabled ? "1" : "0");
  if (enabled) {
    logProfileStabilityAudit("audit-enabled", undefined, { source: "diagnostics" });
  }
}

function avatarFingerprint(profile: any) {
  const raw = String(
    profile?.avatarDataUrl ||
    profile?.avatarThumbDataUrl ||
    profile?.avatarUrl ||
    profile?.avatar ||
    profile?.photoUrl ||
    ""
  ).trim();
  const kind = !raw ? "none" : raw.startsWith("data:image/") ? "data" : raw.startsWith("blob:") ? "blob" : /^https?:/i.test(raw) ? "http" : "other";
  return {
    kind,
    present: !!raw,
    length: raw.length,
    tail: raw ? raw.slice(-36) : "",
    avatarUpdatedAt: Number(profile?.avatarUpdatedAt || 0) || 0,
    hasAvatarUrl: !!String(profile?.avatarUrl || "").trim(),
    hasAvatarDataUrl: !!String(profile?.avatarDataUrl || "").trim(),
    hasAvatarPath: !!String(profile?.avatarPath || "").trim(),
  };
}

function statsFingerprint(profile: any) {
  const s = profile?.stats && typeof profile.stats === "object" ? profile.stats : {};
  const x = s?.x01 && typeof s.x01 === "object" ? s.x01 : {};
  const n = (...vals: any[]) => {
    for (const value of vals) {
      const num = Number(value);
      if (Number.isFinite(num)) return num;
    }
    return 0;
  };
  return {
    avg3: n(s?.avg3, s?.avg3d, s?.avg3D, x?.avg3, x?.avg3d, x?.avg3D),
    bestVisit: n(s?.bestVisit, s?.best_visit, x?.bestVisit, x?.best_visit),
    bestCheckout: n(s?.bestCheckout, s?.bestCo, x?.bestCheckout, x?.bestCo),
    winRate: n(s?.winRate, s?.winRatePct, x?.winRate, x?.winRatePct),
    wins: n(s?.wins, x?.wins),
    games: n(s?.games, s?.sessions, x?.games, x?.sessions),
  };
}

export function profileStabilityFingerprint(profile: any) {
  if (!profile) return null;
  const pi = profile?.privateInfo && typeof profile.privateInfo === "object" ? profile.privateInfo : {};
  return {
    id: String(profile?.id || ""),
    name: String(profile?.name || profile?.displayName || profile?.nickname || ""),
    updatedAt: Number(profile?.updatedAt || 0) || 0,
    onlineUserId: String(pi?.onlineUserId || profile?.onlineUserId || ""),
    accountUserId: String(pi?.accountUserId || profile?.accountUserId || ""),
    avatar: avatarFingerprint(profile),
    stats: statsFingerprint(profile),
  };
}

function getRuntimeStore(explicitStore?: any) {
  if (explicitStore && typeof explicitStore === "object") return explicitStore;
  try { return (globalThis as any)?.__appStore?.store || null; } catch { return null; }
}

function readStorageUserHint(): string | null {
  try {
    const candidates = [
      safeLsGet("dc_storage_user_v1"),
      safeLsGet("dc_storage_user"),
      safeLsGet("dc_online_user_id"),
    ].filter(Boolean);
    return candidates[0] || null;
  } catch { return null; }
}

export function getProfileStabilityAuditEvents(): ProfileStabilityAuditEvent[] {
  try {
    const raw = safeLsGet(EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function clearProfileStabilityAuditEvents(): void {
  safeLsRemove(EVENTS_KEY);
}

export function logProfileStabilityAudit(kind: string, storeInput?: any, meta?: any): void {
  if (!isProfileStabilityAuditEnabled()) return;
  try {
    const store = getRuntimeStore(storeInput);
    const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
    const activeProfileId = String(store?.activeProfileId || "").trim() || null;
    const active = activeProfileId
      ? profiles.find((p: any) => String(p?.id || "") === activeProfileId) || null
      : profiles[0] || null;
    const evt: ProfileStabilityAuditEvent = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      at: Date.now(),
      kind: String(kind || "event"),
      source: meta?.source ? String(meta.source) : undefined,
      route: (() => { try { return String((globalThis as any)?.__mscActiveTab || location?.hash || ""); } catch { return ""; } })(),
      activeProfileId,
      storageUser: meta?.storageUser != null ? String(meta.storageUser || "") : readStorageUserHint(),
      profilesLen: profiles.length,
      historyLen: Array.isArray(store?.history) ? store.history.length : undefined,
      dartSetsLen: Array.isArray(store?.dartSets) ? store.dartSets.length : undefined,
      profile: profileStabilityFingerprint(active),
      meta: meta && typeof meta === "object" ? { ...meta, source: undefined } : meta,
    };
    const events = getProfileStabilityAuditEvents();
    events.push(evt);
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    safeLsSet(EVENTS_KEY, JSON.stringify(events));
  } catch {}
}

export function buildProfileStabilityAuditReport(storeInput?: any) {
  const store = getRuntimeStore(storeInput);
  const events = getProfileStabilityAuditEvents();
  const recent = events.slice(-80);
  const regressions = recent.filter((e) => /regression|wipe|stale|overwrite|identity-change|avatar-lost|stats-zero/i.test(String(e?.kind || "")));
  return {
    enabled: isProfileStabilityAuditEnabled(),
    generatedAt: new Date().toISOString(),
    current: (() => {
      const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
      const activeId = String(store?.activeProfileId || "");
      const active = profiles.find((p: any) => String(p?.id || "") === activeId) || profiles[0] || null;
      return {
        activeProfileId: activeId || null,
        profilesLen: profiles.length,
        historyLen: Array.isArray(store?.history) ? store.history.length : 0,
        dartSetsLen: Array.isArray(store?.dartSets) ? store.dartSets.length : 0,
        profile: profileStabilityFingerprint(active),
      };
    })(),
    regressions,
    events: recent,
  };
}
