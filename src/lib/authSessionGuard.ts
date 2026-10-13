// Centralise les règles de sécurité des sessions navigateur.
// Les sauvegardes/restaurations ne doivent jamais transporter des JWT ou refresh tokens.

export function decodeJwtPayloadUnsafe(tokenInput: string): any {
  try {
    const token = String(tokenInput || "").trim();
    const part = token.split(".")[1] || "";
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function jwtExpiresAtMs(tokenInput: string): number {
  const payload = decodeJwtPayloadUnsafe(tokenInput);
  const expMs = Number(payload?.exp || 0) * 1000;
  return Number.isFinite(expMs) && expMs > 0 ? expMs : 0;
}

export function isJwtFresh(tokenInput: string, skewMs = 30_000): boolean {
  const payload = decodeJwtPayloadUnsafe(tokenInput);
  if (!payload?.sub) return false;
  const expMs = Number(payload?.exp || 0) * 1000;
  if (!Number.isFinite(expMs) || expMs <= 0) return false;
  return expMs > Date.now() + Math.max(0, Number(skewMs) || 0);
}

export function isFreshSupabaseAccessToken(tokenInput: string, skewMs = 30_000): boolean {
  const token = String(tokenInput || "").trim();
  if (!token || !isJwtFresh(token, skewMs)) return false;
  const payload = decodeJwtPayloadUnsafe(token);
  const issuer = String(payload?.iss || "").toLowerCase();
  return issuer.includes("supabase.co/auth/v1") || String(payload?.role || "") === "authenticated";
}

/**
 * Retourne toujours le jeton Supabase de la session courante, avec une marge de
 * validité suffisante pour les appels Cloudflare/R2. Si le jeton arrive à
 * expiration, Supabase renouvelle d'abord la session. Cette fonction ne lit
 * jamais les anciens JWT NAS/Google Drive.
 */
export async function ensureFreshSupabaseAccessToken(
  client: any,
  options: { minValidityMs?: number; forceRefresh?: boolean } = {},
): Promise<string | null> {
  const minValidityMs = Math.max(5_000, Number(options.minValidityMs ?? 90_000) || 90_000);

  if (!options.forceRefresh) {
    try {
      const { data, error } = await client.auth.getSession();
      if (!error) {
        const token = String(data?.session?.access_token || "").trim();
        if (token && isFreshSupabaseAccessToken(token, minValidityMs)) return token;
      }
    } catch {}
  }

  try {
    const { data, error } = await client.auth.refreshSession();
    if (!error) {
      const token = String(data?.session?.access_token || "").trim();
      if (token && isFreshSupabaseAccessToken(token, 5_000)) return token;
    }
  } catch {}

  try {
    const { data, error } = await client.auth.getSession();
    if (!error) {
      const token = String(data?.session?.access_token || "").trim();
      if (token && isFreshSupabaseAccessToken(token, 5_000)) return token;
    }
  } catch {}

  return null;
}

export function isSensitiveAuthStorageKey(keyInput: string): boolean {
  const key = String(keyInput || "").trim();
  const lower = key.toLowerCase();
  if (!key) return false;

  if (
    lower === "dc_online_auth_supabase_v1" ||
    lower === "dc_nas_access_token_v1" ||
    lower === "dc_nas_refresh_token_v1" ||
    lower === "supabase.auth.token" ||
    lower === "sb-auth-token" ||
    lower === "auth_token" ||
    lower === "auth_session"
  ) return true;

  if (/^dc-supabase-auth-v2:/i.test(key)) return true;
  if (/^sb-.*-auth-token$/i.test(key)) return true;
  return false;
}

export function isInvalidRefreshSessionError(error: any): boolean {
  const text = [
    error?.message,
    error?.code,
    error?.name,
    error?.error_description,
  ].filter(Boolean).join(" ").toLowerCase();

  return /invalid refresh token|refresh token not found|refresh_token_not_found|invalid_grant|refresh_token.*invalid/.test(text);
}

export function clearSupabaseBrowserAuthStorage(opts: { includeCompatSession?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  const includeCompat = opts.includeCompatSession !== false;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i) || "";
        if (!key) continue;
        if (
          /^dc-supabase-auth-v2:/i.test(key) ||
          /^sb-.*-auth-token$/i.test(key) ||
          key === "supabase.auth.token" ||
          key === "sb-auth-token" ||
          (includeCompat && key === "dc_online_auth_supabase_v1")
        ) {
          keys.push(key);
        }
      }
      for (const key of keys) storage.removeItem(key);
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// V121 — Account Media doit être indépendant du mode de sauvegarde choisi.
//
// Le bug observé après V119/V120 venait d'un jeton Supabase arrivé à expiration
// entre deux appels : la Pages Function répondait 401, puis directR2BackupApi
// mettait CE jeton en quarantaine pendant 60 s. Le compte restait pourtant
// connecté et Supabase savait renouveler sa session.
//
// Ce garde-fou est volontairement ultra ciblé sur /account-media :
// - aucune modification du pipeline Google Drive / NAS / SD / R2 Backup ;
// - un 401/403 déclenche UN refresh Supabase puis UN retry ;
// - le retry transporte uniquement le JWT fraîchement émis pour le compte.
// ---------------------------------------------------------------------------
const ACCOUNT_MEDIA_PATH_FRAGMENT = "/api/storage/backups/account-media";
let accountMediaRefreshInFlight: Promise<string | null> | null = null;
let accountMediaFetchGuardInstalled = false;

function accountMediaRequestUrl(input: RequestInfo | URL): string {
  try {
    if (typeof input === "string") return input;
    if (typeof URL !== "undefined" && input instanceof URL) return input.toString();
    if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  } catch {}
  return "";
}

function isAccountMediaRequest(input: RequestInfo | URL): boolean {
  return accountMediaRequestUrl(input).includes(ACCOUNT_MEDIA_PATH_FRAGMENT);
}

async function refreshAccountMediaJwt(): Promise<string | null> {
  if (accountMediaRefreshInFlight) return accountMediaRefreshInFlight;
  accountMediaRefreshInFlight = (async () => {
    try {
      // Import dynamique pour éviter toute dépendance circulaire au boot.
      const mod = await import("./supabaseClient");
      const token = await ensureFreshSupabaseAccessToken(mod.supabase, {
        forceRefresh: true,
        minValidityMs: 120_000,
      });
      try {
        (window as any).__mscAccountMediaAuthDiag = {
          ok: !!token,
          refreshedAt: Date.now(),
          expiresAt: token ? jwtExpiresAtMs(token) : 0,
          source: "supabase-refresh",
        };
      } catch {}
      return token;
    } catch (error: any) {
      try {
        (window as any).__mscAccountMediaAuthDiag = {
          ok: false,
          refreshedAt: Date.now(),
          error: String(error?.message || error || "refresh_failed"),
          source: "supabase-refresh",
        };
      } catch {}
      return null;
    }
  })();
  try {
    return await accountMediaRefreshInFlight;
  } finally {
    accountMediaRefreshInFlight = null;
  }
}

function installAccountMediaFetchAuthGuard(): void {
  if (typeof window === "undefined" || typeof window.fetch !== "function" || accountMediaFetchGuardInstalled) return;
  accountMediaFetchGuardInstalled = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isAccountMediaRequest(input)) return nativeFetch(input as any, init);

    // directR2BackupApi appelle actuellement fetch avec URL + init. Le clone
    // garde aussi la voie Request sûre si cela change plus tard.
    let firstInput: any = input;
    let retryInput: any = input;
    try {
      if (typeof Request !== "undefined" && input instanceof Request) {
        firstInput = input.clone();
        retryInput = input.clone();
      }
    } catch {}

    const response = await nativeFetch(firstInput, init);
    if (response.status !== 401 && response.status !== 403) return response;

    const token = await refreshAccountMediaJwt();
    if (!token) return response;

    const retryHeaders = new Headers(
      init?.headers || (typeof Request !== "undefined" && retryInput instanceof Request ? retryInput.headers : undefined),
    );
    retryHeaders.set("Authorization", `Bearer ${token}`);
    retryHeaders.set("X-MSS-Auth-Retry", "supabase-refresh");

    try {
      const retryResponse = await nativeFetch(retryInput, { ...(init || {}), headers: retryHeaders });
      try {
        (window as any).__mscAccountMediaAuthDiag = {
          ...((window as any).__mscAccountMediaAuthDiag || {}),
          retryAt: Date.now(),
          retryStatus: retryResponse.status,
          ok: retryResponse.ok,
        };
      } catch {}
      return retryResponse;
    } catch {
      return response;
    }
  }) as typeof window.fetch;
}

try { installAccountMediaFetchAuthGuard(); } catch {}