// MULTISPORTS SCORING — Social OAuth Adapter V7
// Cloudflare Worker : TikTok + Snapchat + Instagram Pro
//
// Bindings/secrets attendus :
//   TIKTOK_CLIENT_KEY          (text)
//   TIKTOK_CLIENT_SECRET       (secret)
//   SNAPCHAT_CLIENT_ID         (text)
//   SNAPCHAT_CLIENT_SECRET     (secret)
//   INSTAGRAM_CLIENT_ID        (text)
//   INSTAGRAM_CLIENT_SECRET    (secret)
// Optionnel :
//   SUPABASE_CALLBACK_URL      (text)

const DEFAULT_SUPABASE_CALLBACK =
  "https://rckbdaqksujehszafior.supabase.co/auth/v1/callback";

const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";

const SNAPCHAT_AUTHORIZE_URL = "https://accounts.snapchat.com/accounts/oauth2/auth";
const SNAPCHAT_TOKEN_URL = "https://accounts.snapchat.com/accounts/oauth2/token";
const SNAPCHAT_USERINFO_URL = "https://kit.snapchat.com/v1/me";
const SNAPCHAT_DEFAULT_SCOPE = [
  "https://auth.snapchat.com/oauth2/api/user.external_id",
  "https://auth.snapchat.com/oauth2/api/user.display_name",
  "https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar",
].join(" ");

const INSTAGRAM_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_USERINFO_URL = "https://graph.instagram.com/me";
const INSTAGRAM_DEFAULT_SCOPE = "instagram_business_basic";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        ok: true,
        service: "MULTISPORTS SCORING Social OAuth",
        version: "WEB-V7-TIKTOK-SNAPCHAT-INSTAGRAM",
        providers: ["tiktok", "snapchat", "instagram"],
      });
    }

    // Compatibilité avec le provider TikTok déjà configuré dans Supabase.
    if ((url.pathname === "/authorize" || url.pathname === "/tiktok/authorize") && request.method === "GET") {
      return tiktokAuthorize(url, env);
    }
    if ((url.pathname === "/token" || url.pathname === "/tiktok/token") && request.method === "POST") {
      return tiktokToken(request, env);
    }
    if ((url.pathname === "/userinfo" || url.pathname === "/tiktok/userinfo") && request.method === "GET") {
      return tiktokUserinfo(request);
    }

    if (url.pathname === "/snapchat/authorize" && request.method === "GET") {
      return snapchatAuthorize(url, env);
    }
    if (url.pathname === "/snapchat/token" && request.method === "POST") {
      return snapchatToken(request, env);
    }
    if (url.pathname === "/snapchat/userinfo" && request.method === "GET") {
      return snapchatUserinfo(request);
    }

    if (url.pathname === "/instagram/authorize" && request.method === "GET") {
      return instagramAuthorize(url, env);
    }
    if (url.pathname === "/instagram/token" && request.method === "POST") {
      return instagramToken(request, env);
    }
    if (url.pathname === "/instagram/userinfo" && request.method === "GET") {
      return instagramUserinfo(request);
    }

    return json({ error: "not_found", error_description: "Route OAuth inconnue" }, 404);
  },
};

function callbackUrl(env) {
  return clean(env?.SUPABASE_CALLBACK_URL) || DEFAULT_SUPABASE_CALLBACK;
}

// -----------------------------------------------------------------------------
// TikTok
// -----------------------------------------------------------------------------
function tiktokAuthorize(url, env) {
  const clientKey = clean(env?.TIKTOK_CLIENT_KEY) || clean(url.searchParams.get("client_id"));
  const state = clean(url.searchParams.get("state"));
  const scope = clean(url.searchParams.get("scope")) || "user.info.basic";
  if (!clientKey) return oauthError("invalid_request", "Missing TikTok client key");
  if (!state) return oauthError("invalid_request", "Missing OAuth state");

  const target = new URL(TIKTOK_AUTHORIZE_URL);
  target.searchParams.set("client_key", clientKey);
  target.searchParams.set("response_type", "code");
  target.searchParams.set("scope", scope);
  target.searchParams.set("redirect_uri", callbackUrl(env));
  target.searchParams.set("state", state);

  console.log("[tiktok][authorize]", JSON.stringify({ scope, redirect_uri: callbackUrl(env), has_state: true }));
  return Response.redirect(target.toString(), 302);
}

async function tiktokToken(request, env) {
  const incoming = await readFormAndCredentials(request);
  const clientKey = clean(env?.TIKTOK_CLIENT_KEY) || incoming.clientId;
  const clientSecret = clean(env?.TIKTOK_CLIENT_SECRET) || incoming.clientSecret;
  const grantType = clean(incoming.form.get("grant_type")) || "authorization_code";
  if (!clientKey || !clientSecret) return oauthError("invalid_client", "TikTok credentials missing", 401);

  const out = new URLSearchParams();
  out.set("client_key", clientKey);
  out.set("client_secret", clientSecret);
  out.set("grant_type", grantType);

  if (grantType === "authorization_code") {
    const code = clean(incoming.form.get("code"));
    if (!code) return oauthError("invalid_request", "Missing TikTok authorization code");
    out.set("code", code);
    out.set("redirect_uri", callbackUrl(env));
  } else if (grantType === "refresh_token") {
    const refreshToken = clean(incoming.form.get("refresh_token"));
    if (!refreshToken) return oauthError("invalid_request", "Missing TikTok refresh token");
    out.set("refresh_token", refreshToken);
  } else {
    return oauthError("unsupported_grant_type", "Unsupported TikTok grant_type");
  }

  console.log("[tiktok][token] START", JSON.stringify({ grant_type: grantType, credential_source: incoming.source }));
  const upstream = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: out.toString(),
  });
  const text = await upstream.text();
  console.log("[tiktok][token] RESPONSE", JSON.stringify({ status: upstream.status, body: safeUpstreamSummary(text) }));
  return passthroughJson(text, upstream.status);
}

async function tiktokUserinfo(request) {
  const accessToken = bearerToken(request);
  if (!accessToken) return oauthError("invalid_token", "Missing TikTok bearer token", 401);

  const target = new URL(TIKTOK_USERINFO_URL);
  target.searchParams.set("fields", "open_id,union_id,avatar_url,display_name");
  const upstream = await fetch(target.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const text = await upstream.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch {}

  // TikTok V2 renvoie error.code="ok" même quand l'appel est un succès.
  // L'ancien V6 traitait toute valeur truthy comme une erreur => profil toujours refusé.
  const rawCode = payload?.error?.code;
  const code = String(rawCode ?? "").trim().toLowerCase();
  const hasApiError = !!code && code !== "ok" && code !== "0";
  if (!upstream.ok || hasApiError) {
    console.log("[tiktok][userinfo] ERROR", JSON.stringify({ status: upstream.status, body: safeUpstreamSummary(text) }));
    return oauthError("userinfo_failed", payload?.error?.message || "TikTok user profile unavailable", upstream.ok ? 502 : upstream.status);
  }

  const u = payload?.data?.user || {};
  const providerId = clean(u.open_id) || clean(u.union_id);
  if (!providerId) return oauthError("invalid_userinfo", "TikTok did not return open_id", 502);

  console.log("[tiktok][userinfo] OK", JSON.stringify({ has_id: true, has_name: !!u.display_name, has_avatar: !!u.avatar_url }));
  return json({
    sub: providerId,
    id: providerId,
    open_id: clean(u.open_id) || providerId,
    union_id: clean(u.union_id) || undefined,
    name: clean(u.display_name) || "TikTok",
    display_name: clean(u.display_name) || "TikTok",
    preferred_username: clean(u.display_name) || undefined,
    picture: clean(u.avatar_url) || undefined,
    avatar_url: clean(u.avatar_url) || undefined,
  });
}

// -----------------------------------------------------------------------------
// Snapchat
// -----------------------------------------------------------------------------
function snapchatAuthorize(url, env) {
  const clientId = clean(env?.SNAPCHAT_CLIENT_ID) || clean(url.searchParams.get("client_id"));
  const state = clean(url.searchParams.get("state"));
  const scope = clean(url.searchParams.get("scope")) || SNAPCHAT_DEFAULT_SCOPE;
  if (!clientId) return oauthError("invalid_request", "Missing Snapchat client id");
  if (!state) return oauthError("invalid_request", "Missing OAuth state");

  const target = new URL(SNAPCHAT_AUTHORIZE_URL);
  target.searchParams.set("client_id", clientId);
  target.searchParams.set("redirect_uri", callbackUrl(env));
  target.searchParams.set("response_type", "code");
  target.searchParams.set("scope", scope);
  target.searchParams.set("state", state);

  const challenge = clean(url.searchParams.get("code_challenge"));
  const challengeMethod = clean(url.searchParams.get("code_challenge_method"));
  if (challenge) target.searchParams.set("code_challenge", challenge);
  if (challengeMethod) target.searchParams.set("code_challenge_method", challengeMethod);

  console.log("[snapchat][authorize]", JSON.stringify({ scope, redirect_uri: callbackUrl(env), pkce: !!challenge }));
  return Response.redirect(target.toString(), 302);
}

async function snapchatToken(request, env) {
  const incoming = await readFormAndCredentials(request);
  const clientId = clean(env?.SNAPCHAT_CLIENT_ID) || incoming.clientId;
  const clientSecret = clean(env?.SNAPCHAT_CLIENT_SECRET) || incoming.clientSecret;
  const grantType = clean(incoming.form.get("grant_type")) || "authorization_code";
  if (!clientId) return oauthError("invalid_client", "Snapchat client id missing", 401);

  const out = new URLSearchParams();
  out.set("client_id", clientId);
  if (clientSecret) out.set("client_secret", clientSecret);
  out.set("grant_type", grantType);

  if (grantType === "authorization_code") {
    const code = clean(incoming.form.get("code"));
    if (!code) return oauthError("invalid_request", "Missing Snapchat authorization code");
    out.set("code", code);
    out.set("redirect_uri", callbackUrl(env));
    const verifier = clean(incoming.form.get("code_verifier"));
    if (verifier) out.set("code_verifier", verifier);
  } else if (grantType === "refresh_token") {
    const refreshToken = clean(incoming.form.get("refresh_token"));
    if (!refreshToken) return oauthError("invalid_request", "Missing Snapchat refresh token");
    out.set("refresh_token", refreshToken);
  } else {
    return oauthError("unsupported_grant_type", "Unsupported Snapchat grant_type");
  }

  console.log("[snapchat][token] START", JSON.stringify({ grant_type: grantType, credential_source: incoming.source, pkce: !!out.get("code_verifier") }));
  const upstream = await fetch(SNAPCHAT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: out.toString(),
  });
  const text = await upstream.text();
  console.log("[snapchat][token] RESPONSE", JSON.stringify({ status: upstream.status, body: safeUpstreamSummary(text) }));
  return passthroughJson(text, upstream.status);
}

async function snapchatUserinfo(request) {
  const accessToken = bearerToken(request);
  if (!accessToken) return oauthError("invalid_token", "Missing Snapchat bearer token", 401);

  // Snapchat n'expose pas un userinfo OAuth GET standard : Login Kit utilise
  // un POST GraphQL sur /v1/me. Ce Worker le normalise pour Supabase.
  const upstream = await fetch(SNAPCHAT_USERINFO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: "{me{displayName externalId bitmoji{avatar}}}" }),
  });
  const text = await upstream.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch {}
  const me = payload?.data?.me || {};
  const providerId = clean(me.externalId);
  if (!upstream.ok || !providerId || (Array.isArray(payload?.errors) && payload.errors.length)) {
    console.log("[snapchat][userinfo] ERROR", JSON.stringify({ status: upstream.status, body: safeUpstreamSummary(text) }));
    return oauthError("userinfo_failed", "Snapchat user profile unavailable", upstream.ok ? 502 : upstream.status);
  }

  console.log("[snapchat][userinfo] OK", JSON.stringify({ has_id: true, has_name: !!me.displayName, has_avatar: !!me?.bitmoji?.avatar }));
  return json({
    sub: providerId,
    id: providerId,
    external_id: providerId,
    name: clean(me.displayName) || "Snapchat",
    display_name: clean(me.displayName) || "Snapchat",
    preferred_username: clean(me.displayName) || undefined,
    picture: clean(me?.bitmoji?.avatar) || undefined,
    avatar_url: clean(me?.bitmoji?.avatar) || undefined,
  });
}

// -----------------------------------------------------------------------------
// Instagram Pro (Business / Creator)
// -----------------------------------------------------------------------------
function instagramAuthorize(url, env) {
  const clientId = clean(env?.INSTAGRAM_CLIENT_ID) || clean(url.searchParams.get("client_id"));
  const state = clean(url.searchParams.get("state"));
  const scope = normalizeInstagramScope(clean(url.searchParams.get("scope")) || INSTAGRAM_DEFAULT_SCOPE);
  if (!clientId) return oauthError("invalid_request", "Missing Instagram client id");
  if (!state) return oauthError("invalid_request", "Missing OAuth state");

  const target = new URL(INSTAGRAM_AUTHORIZE_URL);
  target.searchParams.set("client_id", clientId);
  target.searchParams.set("redirect_uri", callbackUrl(env));
  target.searchParams.set("response_type", "code");
  target.searchParams.set("scope", scope);
  target.searchParams.set("state", state);
  target.searchParams.set("enable_fb_login", "0");
  target.searchParams.set("force_authentication", "1");

  console.log("[instagram][authorize]", JSON.stringify({ scope, redirect_uri: callbackUrl(env) }));
  return Response.redirect(target.toString(), 302);
}

async function instagramToken(request, env) {
  const incoming = await readFormAndCredentials(request);
  const clientId = clean(env?.INSTAGRAM_CLIENT_ID) || incoming.clientId;
  const clientSecret = clean(env?.INSTAGRAM_CLIENT_SECRET) || incoming.clientSecret;
  const grantType = clean(incoming.form.get("grant_type")) || "authorization_code";
  if (!clientId || !clientSecret) return oauthError("invalid_client", "Instagram credentials missing", 401);
  if (grantType !== "authorization_code") return oauthError("unsupported_grant_type", "Instagram login only accepts authorization_code");

  const code = clean(incoming.form.get("code"));
  if (!code) return oauthError("invalid_request", "Missing Instagram authorization code");

  const out = new URLSearchParams();
  out.set("client_id", clientId);
  out.set("client_secret", clientSecret);
  out.set("grant_type", "authorization_code");
  out.set("redirect_uri", callbackUrl(env));
  out.set("code", code);

  console.log("[instagram][token] START", JSON.stringify({ credential_source: incoming.source }));
  const upstream = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: out.toString(),
  });
  const text = await upstream.text();
  console.log("[instagram][token] RESPONSE", JSON.stringify({ status: upstream.status, body: safeUpstreamSummary(text) }));
  return passthroughJson(text, upstream.status);
}

async function instagramUserinfo(request) {
  const accessToken = bearerToken(request);
  if (!accessToken) return oauthError("invalid_token", "Missing Instagram bearer token", 401);

  const target = new URL(INSTAGRAM_USERINFO_URL);
  target.searchParams.set("fields", "id,username,name,profile_picture_url");
  // Graph API accepte le token comme paramètre; on garde aussi Bearer pour
  // compatibilité avec les variantes de l'API.
  target.searchParams.set("access_token", accessToken);
  const upstream = await fetch(target.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const text = await upstream.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch {}
  const providerId = clean(payload?.id);
  if (!upstream.ok || !providerId || payload?.error) {
    console.log("[instagram][userinfo] ERROR", JSON.stringify({ status: upstream.status, body: safeUpstreamSummary(text) }));
    return oauthError("userinfo_failed", payload?.error?.message || "Instagram user profile unavailable", upstream.ok ? 502 : upstream.status);
  }

  const display = clean(payload?.name) || clean(payload?.username) || "Instagram";
  console.log("[instagram][userinfo] OK", JSON.stringify({ has_id: true, has_name: !!display, has_avatar: !!payload?.profile_picture_url }));
  return json({
    sub: providerId,
    id: providerId,
    username: clean(payload?.username) || undefined,
    name: display,
    display_name: display,
    preferred_username: clean(payload?.username) || undefined,
    picture: clean(payload?.profile_picture_url) || undefined,
    avatar_url: clean(payload?.profile_picture_url) || undefined,
  });
}

function normalizeInstagramScope(value) {
  return clean(value)
    .replace(/\bbusiness_basic\b/g, "instagram_business_basic")
    .replace(/\bbusiness_content_publish\b/g, "instagram_business_content_publish")
    .replace(/\bbusiness_manage_comments\b/g, "instagram_business_manage_comments")
    .replace(/\bbusiness_manage_messages\b/g, "instagram_business_manage_messages")
    .replace(/\s*,\s*/g, ",");
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
async function readFormAndCredentials(request) {
  const rawBody = await request.text();
  const form = new URLSearchParams(rawBody);
  const basic = readBasicCredentials(request.headers.get("Authorization"));
  const bodyClientId = clean(form.get("client_id"));
  const bodyClientSecret = clean(form.get("client_secret"));
  const clientId = bodyClientId || basic.clientId;
  const clientSecret = bodyClientSecret || basic.clientSecret;
  const source = bodyClientSecret ? "supabase_body" : basic.clientSecret ? "supabase_basic" : "none";
  return { form, clientId, clientSecret, source };
}

function readBasicCredentials(header) {
  if (!header || !/^Basic\s+/i.test(header)) return { clientId: "", clientSecret: "" };
  try {
    const decoded = atob(header.replace(/^Basic\s+/i, "").trim());
    const idx = decoded.indexOf(":");
    if (idx < 0) return { clientId: "", clientSecret: "" };
    return { clientId: decoded.slice(0, idx), clientSecret: decoded.slice(idx + 1) };
  } catch {
    return { clientId: "", clientSecret: "" };
  }
}

function bearerToken(request) {
  const auth = request.headers.get("Authorization") || "";
  return clean(auth.match(/^Bearer\s+(.+)$/i)?.[1]);
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeUpstreamSummary(text) {
  try {
    const x = JSON.parse(text);
    return {
      error: typeof x?.error === "string" ? x.error : x?.error?.code || x?.error?.type || undefined,
      error_description: x?.error_description || x?.message || x?.error?.message || undefined,
      log_id: x?.log_id || x?.error?.log_id || undefined,
      has_access_token: !!x?.access_token,
      has_refresh_token: !!x?.refresh_token,
      has_user_id: !!(x?.user_id || x?.open_id || x?.id),
    };
  } catch {
    return String(text || "").slice(0, 500);
  }
}

function passthroughJson(text, status) {
  return new Response(text, {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function oauthError(error, errorDescription, status = 400) {
  return json({ error, error_description: errorDescription }, status);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
  };
}
