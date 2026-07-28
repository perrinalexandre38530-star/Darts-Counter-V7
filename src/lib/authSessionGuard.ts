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
