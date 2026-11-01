// ============================================================
// src/lib/canonicalAccountScope.ts
// SINGLE SOURCE OF TRUTH for the local account/storage namespace.
//
// Rules:
// 1) the live Supabase auth uid exposed by React always wins;
// 2) otherwise use the stable Supabase uid persisted in the auth session;
// 3) otherwise keep the explicit storage namespace selected by storage.ts;
// 4) only then use a legacy auth payload fallback.
//
// IMPORTANT: dc_user_id is deliberately NOT a scope authority. It can contain
// a NAS/profile legacy id and was the main source of PC/Android namespace drift.
// ============================================================

export const CANONICAL_STORAGE_USER_KEY = "dc_storage_user_id_v1";
export const CANONICAL_AUTH_SESSION_KEY = "dc_online_auth_supabase_v1";

export function cleanCanonicalAccountScopeId(value: unknown): string {
  return String(value ?? "").trim();
}

export function sanitizeCanonicalAccountScopePart(value: unknown, maxLength = 160): string {
  return cleanCanonicalAccountScopeId(value).replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, Math.max(1, maxLength));
}

function readAuthPayload(): any | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CANONICAL_AUTH_SESSION_KEY) || "";
    if (!raw || !(raw.startsWith("{") || raw.startsWith("["))) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function runtimePrimaryAccountScopeId(): string | null {
  try {
    const id = cleanCanonicalAccountScopeId((globalThis as any)?.window?.__dc_primary_auth_user_id);
    return id || null;
  } catch {
    return null;
  }
}

export function stableSupabaseAccountScopeIdFromAuthStorage(): string | null {
  const parsed = readAuthPayload();
  if (!parsed) return null;
  const provider = String(parsed?.authProvider || "").trim().toLowerCase();
  const id = cleanCanonicalAccountScopeId(
    parsed?.supabaseUserId ||
    parsed?.user?.user_metadata?.supabase_user_id ||
    parsed?.session?.user?.id ||
    (provider.startsWith("supabase") ? (parsed?.user?.id || parsed?.userId) : null),
  );
  return id || null;
}

export function explicitStorageAccountScopeId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const id = cleanCanonicalAccountScopeId(localStorage.getItem(CANONICAL_STORAGE_USER_KEY));
    return id || null;
  } catch {
    return null;
  }
}

function legacyAuthFallbackScopeId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CANONICAL_AUTH_SESSION_KEY) || "";
    if (!raw) return null;
    if (!(raw.startsWith("{") || raw.startsWith("["))) {
      const direct = cleanCanonicalAccountScopeId(raw);
      return direct || null;
    }
    const parsed = readAuthPayload();
    const id = cleanCanonicalAccountScopeId(
      parsed?.canonicalUserId ||
      parsed?.user?.user_metadata?.canonical_user_id ||
      parsed?.userId ||
      parsed?.user?.id ||
      parsed?.session?.user?.id,
    );
    return id || null;
  } catch {
    return null;
  }
}

export function getCanonicalAccountScopeId(): string | null {
  const runtime = runtimePrimaryAccountScopeId();
  const stableSupabase = stableSupabaseAccountScopeIdFromAuthStorage();

  // PERSISTENCE LOCK V140:
  // le bridge NAS peut exposer temporairement un alias technique `usr_*` avant
  // que la session Supabase publique soit complètement réhydratée. Si on laisse
  // cet alias gagner, History V4 ouvre une autre base IndexedDB et l'utilisateur
  // a l'impression que toutes ses parties ont disparu à la reconnexion.
  //
  // Dès qu'une session persistée contient un vrai UID Supabase, cet UID reste
  // donc l'autorité de stockage face aux aliases NAS connus. Un véritable changement
  // de compte Supabase (runtime UUID différent) continue en revanche à gagner.
  if (stableSupabase) {
    if (!runtime || runtime === stableSupabase) return stableSupabase;
    const parsed = readAuthPayload();
    const canonicalAlias = cleanCanonicalAccountScopeId(
      parsed?.canonicalUserId ||
      parsed?.user?.user_metadata?.canonical_user_id ||
      parsed?.user?.user_metadata?.nas_user_id ||
      parsed?.userId,
    );
    const runtimeLooksTechnical = /^usr[_:-]/i.test(runtime) || (!!canonicalAlias && runtime === canonicalAlias);
    if (runtimeLooksTechnical) return stableSupabase;
  }

  return runtime ||
    stableSupabase ||
    explicitStorageAccountScopeId() ||
    legacyAuthFallbackScopeId();
}

/**
 * Repairs only the explicit namespace pointer. It never rewrites auth data.
 * Returns the canonical scope after repair.
 */
export function repairCanonicalAccountScopeStorage(): string | null {
  const canonical = getCanonicalAccountScopeId();
  if (typeof localStorage === "undefined") return canonical;
  try {
    const explicit = explicitStorageAccountScopeId();
    if (canonical && explicit !== canonical) {
      localStorage.setItem(CANONICAL_STORAGE_USER_KEY, canonical);
    }
  } catch {}
  return canonical;
}
