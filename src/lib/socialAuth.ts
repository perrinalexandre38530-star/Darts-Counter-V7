import { registerPlugin } from "@capacitor/core";
import { supabase, __SUPABASE_ENV__ } from "./supabaseClient";
import { isCapacitorNativeRuntime } from "./nativePlatform";

export type SocialAuthProvider =
  | "google"
  | "apple"
  | "facebook"
  | "azure"
  | "x"
  | "discord"
  | "instagram"
  | "snapchat"
  | "tiktok"
  | "github"
  | "twitch"
  | "kakao";

type SocialAuthConfig = {
  label: string;
  oauthProvider: string;
  scopes?: string;
  custom?: boolean;
  note?: string;
  settingsKeys?: string[];
};

export const SOCIAL_AUTH_CONFIG: Record<SocialAuthProvider, SocialAuthConfig> = {
  google: { label: "Google", oauthProvider: "google", settingsKeys: ["google"] },
  apple: { label: "Apple", oauthProvider: "apple", settingsKeys: ["apple"] },
  facebook: { label: "Facebook", oauthProvider: "facebook", settingsKeys: ["facebook"] },
  azure: { label: "Microsoft", oauthProvider: "azure", scopes: "email", settingsKeys: ["azure"] },
  x: { label: "X / Twitter", oauthProvider: "x", settingsKeys: ["x", "twitter"] },
  discord: { label: "Discord", oauthProvider: "discord", settingsKeys: ["discord"] },
  // Meta ne propose pas un login Instagram grand public équivalent à Facebook Login.
  // Ce bouton est prêt pour un provider OAuth personnalisé Supabase et vise les
  // comptes Instagram professionnels (Business / Creator).
  instagram: {
    label: "Instagram Pro",
    oauthProvider: "custom:instagram",
    custom: true,
    note: "Comptes Business / Creator",
  },
  // Snapchat existe côté Supabase Auth/GoTrue mais n'est pas encore exposé dans
  // toutes les versions des types supabase-js : on le passe donc comme provider runtime.
  snapchat: { label: "Snapchat", oauthProvider: "snapchat", settingsKeys: ["snapchat"] },
  // TikTok Login Kit n'est pas un provider natif Supabase : Custom OAuth/OIDC.
  tiktok: { label: "TikTok", oauthProvider: "custom:tiktok", custom: true },
  github: { label: "GitHub", oauthProvider: "github", settingsKeys: ["github"] },
  twitch: { label: "Twitch", oauthProvider: "twitch", settingsKeys: ["twitch"] },
  kakao: { label: "Kakao", oauthProvider: "kakao", settingsKeys: ["kakao"] },
};

export const SOCIAL_AUTH_PROVIDERS: readonly SocialAuthProvider[] = [
  "google",
  "apple",
  "facebook",
  "azure",
  "x",
  "discord",
  "instagram",
  "snapchat",
  "tiktok",
  "github",
  "twitch",
  "kakao",
] as const;

export const SOCIAL_AUTH_PRIMARY_PROVIDERS: readonly SocialAuthProvider[] = [
  "facebook",
  "google",
  "azure",
  "apple",
] as const;

export const SOCIAL_AUTH_SECONDARY_PROVIDERS: readonly SocialAuthProvider[] = [
  "x",
  "discord",
  "instagram",
  "snapchat",
  "tiktok",
  "github",
  "twitch",
  "kakao",
] as const;

export const SOCIAL_AUTH_LABELS: Record<SocialAuthProvider, string> = Object.fromEntries(
  Object.entries(SOCIAL_AUTH_CONFIG).map(([key, value]) => [key, value.label])
) as Record<SocialAuthProvider, string>;

const PENDING_KEY = "msc_social_auth_pending_v1";
const CALLBACK_RESULT_KEY = "msc_social_auth_callback_v1";
const PKCE_BACKUP_KEY = "msc_social_pkce_backup_v1";
const NATIVE_CALLBACK_URL = "multisportsscoring://auth/callback";
const NATIVE_CALLBACK_PREFIX = "multisportsscoring://auth/callback";

type NativeSocialAuthPlugin = {
  openExternal(options: { url: string }): Promise<void>;
  consumeLaunchUrl(): Promise<{ url?: string | null }>;
};

const NativeSocialAuth = registerPlugin<NativeSocialAuthPlugin>("SocialAuth");

function getSiteUrl(): string {
  if (typeof window !== "undefined" && /^https?:$/i.test(window.location.protocol)) {
    return window.location.origin.replace(/\/+$/, "");
  }
  const fromEnv =
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_SITE_URL) ||
    "";
  const site = String(fromEnv || "https://multisports-scoring.pages.dev").trim();
  return site.replace(/\/+$/, "");
}

export function getSocialAuthRedirectUrl(): string {
  return isCapacitorNativeRuntime()
    ? NATIVE_CALLBACK_URL
    : `${getSiteUrl()}/auth-callback.html`;
}

function rememberPending(provider: SocialAuthProvider) {
  try {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        provider,
        startedAt: Date.now(),
        platform: isCapacitorNativeRuntime() ? "android" : "web",
      })
    );
    localStorage.removeItem(CALLBACK_RESULT_KEY);
  } catch {}
}

export function getPendingSocialAuth(): { provider?: SocialAuthProvider; startedAt?: number; platform?: string } | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!SOCIAL_AUTH_PROVIDERS.includes(parsed?.provider)) return null;
    const startedAt = Number(parsed?.startedAt || 0);
    if (startedAt > 0 && Date.now() - startedAt > 10 * 60 * 1000) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function supabasePkceVerifierKey(): string {
  return `dc-supabase-auth-v2:${__SUPABASE_ENV__.projectRef}-code-verifier`;
}

function backupPendingPkceVerifier(provider: SocialAuthProvider): boolean {
  if (typeof window === "undefined") return false;
  const key = supabasePkceVerifierKey();
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(key); } catch {}
  if (!raw) { try { raw = window.sessionStorage.getItem(key); } catch {} }
  if (!raw) return false;
  try {
    window.localStorage.setItem(PKCE_BACKUP_KEY, JSON.stringify({ provider, key, raw, at: Date.now() }));
    return true;
  } catch {
    try {
      window.sessionStorage.setItem(PKCE_BACKUP_KEY, JSON.stringify({ provider, key, raw, at: Date.now() }));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Supabase Auth peut supprimer son verifier PKCE lors d'une sauvegarde/rotation
 * de session concurrente. On conserve donc une copie exacte hors du namespace
 * Supabase et on la remet juste avant exchangeCodeForSession si nécessaire.
 */
export function restorePendingPkceVerifierIfNeeded(): boolean {
  if (typeof window === "undefined") return false;
  const key = supabasePkceVerifierKey();
  try { if (window.localStorage.getItem(key) || window.sessionStorage.getItem(key)) return true; } catch {}

  let rawBackup: string | null = null;
  try { rawBackup = window.localStorage.getItem(PKCE_BACKUP_KEY); } catch {}
  if (!rawBackup) { try { rawBackup = window.sessionStorage.getItem(PKCE_BACKUP_KEY); } catch {} }
  if (!rawBackup) return false;

  try {
    const parsed = JSON.parse(rawBackup);
    const at = Number(parsed?.at || 0);
    const raw = typeof parsed?.raw === "string" ? parsed.raw : "";
    if (!raw || (at > 0 && Date.now() - at > 10 * 60 * 1000)) {
      clearPendingPkceBackup();
      return false;
    }
    try { window.localStorage.setItem(key, raw); return true; } catch {}
    try { window.sessionStorage.setItem(key, raw); return true; } catch {}
  } catch {}
  return false;
}

export function clearPendingPkceBackup(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(PKCE_BACKUP_KEY); } catch {}
  try { window.sessionStorage.removeItem(PKCE_BACKUP_KEY); } catch {}
}

/**
 * Supprime à la fois la copie de secours MULTISPORTS et le verifier PKCE
 * détenu par supabase-js. À n'utiliser que lorsqu'un callback est certain
 * d'être ancien / déjà consommé.
 */
export function clearPendingPkceState(): void {
  if (typeof window === "undefined") return;
  const key = supabasePkceVerifierKey();
  try { window.localStorage.removeItem(key); } catch {}
  try { window.sessionStorage.removeItem(key); } catch {}
  clearPendingPkceBackup();
}

/**
 * Indique si un retour OAuth actuellement présent dans l'URL possède encore
 * un contexte consommable. Cela permet de distinguer un vrai retour provider
 * d'un ancien #/auth/callback restauré par le navigateur au prochain démarrage.
 */
export function hasActiveSocialAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  if (getPendingSocialAuth()) return true;

  const callbackResult = peekSocialAuthCallbackResult();
  if (callbackResult) {
    const at = Number((callbackResult as any)?.at || 0);
    if (!at || Date.now() - at <= 10 * 60 * 1000) return true;
  }

  // restorePendingPkceVerifierIfNeeded() est volontairement utilisé ici :
  // s'il ne reste que la sauvegarde MULTISPORTS, on restaure le verifier avant
  // que le callback ne tente l'échange.
  return restorePendingPkceVerifierIfNeeded();
}

export function clearPendingSocialAuth() {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
}

function saveCallbackResult(result: { ok: boolean; provider?: string; message?: string }) {
  try {
    localStorage.setItem(CALLBACK_RESULT_KEY, JSON.stringify({ ...result, at: Date.now() }));
  } catch {}
}

export function peekSocialAuthCallbackResult(): { ok: boolean; provider?: string; message?: string } | null {
  try {
    const raw = localStorage.getItem(CALLBACK_RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function consumeSocialAuthCallbackResult(): { ok: boolean; provider?: string; message?: string } | null {
  const result = peekSocialAuthCallbackResult();
  try { localStorage.removeItem(CALLBACK_RESULT_KEY); } catch {}
  return result;
}

export type SocialProviderAvailability = "enabled" | "disabled" | "unknown";

let providerSettingsCache: { at: number; external: Record<string, unknown> } | null = null;

async function loadPublicAuthSettings(force = false): Promise<Record<string, unknown>> {
  if (!force && providerSettingsCache && Date.now() - providerSettingsCache.at < 60_000) {
    return providerSettingsCache.external;
  }
  const response = await fetch(`${__SUPABASE_ENV__.url}/auth/v1/settings`, {
    headers: { apikey: __SUPABASE_ENV__.anonKey },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase Auth settings HTTP ${response.status}`);
  const json = await response.json();
  const external = (json?.external && typeof json.external === "object") ? json.external : {};
  providerSettingsCache = { at: Date.now(), external };
  return external;
}

export async function getSocialProviderAvailabilityMap(force = false): Promise<Partial<Record<SocialAuthProvider, SocialProviderAvailability>>> {
  const result: Partial<Record<SocialAuthProvider, SocialProviderAvailability>> = {};
  let external: Record<string, unknown>;
  try {
    external = await loadPublicAuthSettings(force);
  } catch {
    for (const provider of SOCIAL_AUTH_PROVIDERS) result[provider] = "unknown";
    return result;
  }
  for (const provider of SOCIAL_AUTH_PROVIDERS) {
    const config = SOCIAL_AUTH_CONFIG[provider];
    if (config.custom || !config.settingsKeys?.length) {
      result[provider] = "unknown";
      continue;
    }
    const found = config.settingsKeys.filter((key) => Object.prototype.hasOwnProperty.call(external, key));
    result[provider] = found.length ? (found.some((key) => external[key] === true) ? "enabled" : "disabled") : "unknown";
  }
  return result;
}

export async function getSocialProviderAvailability(provider: SocialAuthProvider): Promise<SocialProviderAvailability> {
  const map = await getSocialProviderAvailabilityMap();
  return map[provider] || "unknown";
}

function providerNotEnabledError(provider: SocialAuthProvider): Error {
  const config = SOCIAL_AUTH_CONFIG[provider];
  const suffix = config.custom
    ? "Crée puis active son provider OAuth personnalisé dans Supabase Authentication."
    : "Active ce provider et renseigne son Client ID / secret dans Supabase Authentication > Providers.";
  return new Error(`${SOCIAL_AUTH_LABELS[provider]} n'est pas encore activé pour MULTISPORTS SCORING. ${suffix}`);
}

async function preflightOAuthUrl(url: string, provider: SocialAuthProvider): Promise<void> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { apikey: __SUPABASE_ENV__.anonKey },
      redirect: "manual",
      cache: "no-store",
    });
    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400) || response.status === 0) return;
    if (response.ok) return;
    let raw = "";
    try {
      const json = await response.clone().json();
      raw = String(json?.msg || json?.error_description || json?.error || "");
    } catch {
      try { raw = await response.text(); } catch {}
    }
    if (/provider.*not enabled|unsupported provider|provider is not enabled|provider not found/i.test(raw)) {
      throw providerNotEnabledError(provider);
    }
    throw new Error(raw || `OAuth ${SOCIAL_AUTH_LABELS[provider]} indisponible (HTTP ${response.status}).`);
  } catch (error: any) {
    if (/n'est pas encore activé|oauth .* indisponible/i.test(String(error?.message || error))) throw error;
    // Si le navigateur interdit la pré-vérification CORS, les providers natifs
    // déjà marqués "enabled" par /settings peuvent quand même continuer.
    const availability = await getSocialProviderAvailability(provider).catch(() => "unknown" as const);
    if (availability === "enabled") return;
    if (availability === "disabled") throw providerNotEnabledError(provider);
    throw new Error(`Impossible de vérifier la configuration ${SOCIAL_AUTH_LABELS[provider]}. Vérifie son activation dans Supabase avant de réessayer.`);
  }
}

export function resumeSupabaseAuthRuntime(): void {
  try {
    const authAny: any = (supabase as any)?.auth;
    if (typeof authAny?.startAutoRefresh === "function") authAny.startAutoRefresh();
  } catch {}
}

function friendlyOAuthError(error: any, provider: SocialAuthProvider): Error {
  const raw = String(error?.message || error || "Connexion sociale impossible.");
  const label = SOCIAL_AUTH_LABELS[provider];
  const config = SOCIAL_AUTH_CONFIG[provider];

  if (/provider.*not enabled|unsupported provider|provider is not enabled|provider not found/i.test(raw)) {
    const suffix = config.custom
      ? " Crée et active d'abord son provider OAuth personnalisé dans Supabase Auth."
      : " Active d'abord ce provider dans Supabase Auth.";
    return new Error(`${label} n'est pas encore configuré.${suffix}`);
  }
  if (/redirect/i.test(raw) && /allow|not allowed|invalid/i.test(raw)) {
    return new Error(`L'URL de retour ${label} n'est pas autorisée dans Supabase.`);
  }
  return error instanceof Error ? error : new Error(raw);
}

/**
 * Lance le même flux Supabase OAuth sur le web et sur Android.
 * - Web/PWA : redirection navigateur standard.
 * - Android Capacitor : URL OAuth ouverte dans le navigateur système, puis
 *   retour dans l'application via multisportsscoring://auth/callback.
 *
 * PKCE reste géré par supabase-js ; le verifier est conservé dans le stockage
 * de la WebView et le code retourné est échangé au retour dans l'application.
 */
export async function startSocialSignIn(provider: SocialAuthProvider): Promise<void> {
  if (!SOCIAL_AUTH_PROVIDERS.includes(provider)) throw new Error("Fournisseur de connexion inconnu.");
  if (!__SUPABASE_ENV__.hasEnv) throw new Error("Supabase Auth n'est pas configuré sur cette version de l'application.");

  // Une déconnexion locale peut avoir stoppé le scheduler Supabase dans la SPA.
  // Toute nouvelle connexion sociale explicite le réarme avant de lancer OAuth.
  resumeSupabaseAuthRuntime();

  const availability = await getSocialProviderAvailability(provider);
  if (availability === "disabled") throw providerNotEnabledError(provider);

  const config = SOCIAL_AUTH_CONFIG[provider];
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: config.oauthProvider as any,
      options: {
        redirectTo: getSocialAuthRedirectUrl(),
        // Toujours récupérer l'URL d'abord : cela permet d'intercepter une
        // mauvaise configuration au lieu d'envoyer l'utilisateur sur du JSON brut.
        skipBrowserRedirect: true,
        ...(config.scopes ? { scopes: config.scopes } : {}),
      },
    });
    if (error) throw error;

    const url = String((data as any)?.url || "").trim();
    if (!url) throw new Error(`Supabase n'a pas retourné l'URL OAuth ${SOCIAL_AUTH_LABELS[provider]}.`);

    // Sauvegarde le verifier PKCE immédiatement après sa création par supabase-js.
    // Il reste ainsi récupérable même si une ancienne session est sauvegardée/
    // rafraîchie pendant le détour chez le provider OAuth.
    backupPendingPkceVerifier(provider);
    await preflightOAuthUrl(url, provider);

    try { localStorage.removeItem("dc_explicit_logout_v1"); } catch {}
    rememberPending(provider);

    if (isCapacitorNativeRuntime()) {
      await NativeSocialAuth.openExternal({ url });
    } else if (typeof window !== "undefined") {
      window.location.assign(url);
    } else {
      throw new Error("Navigateur indisponible pour ouvrir la connexion sociale.");
    }
  } catch (error) {
    clearPendingSocialAuth();
    throw friendlyOAuthError(error, provider);
  }
}

function isNativeSocialCallback(url: string): boolean {
  return String(url || "").toLowerCase().startsWith(NATIVE_CALLBACK_PREFIX);
}

async function exchangeNativeCallbackUrl(url: string): Promise<boolean> {
  if (!isNativeSocialCallback(url)) return false;

  const pending = getPendingSocialAuth();
  const provider = pending?.provider;

  try {
    const parsed = new URL(url);
    const oauthError = parsed.searchParams.get("error_description") || parsed.searchParams.get("error");
    if (oauthError) throw new Error(decodeURIComponent(oauthError));

    const code = parsed.searchParams.get("code");
    if (!code) throw new Error("Retour OAuth reçu sans code de connexion.");

    restorePendingPkceVerifierIfNeeded();
    const exchangeResult: any = await Promise.race([
      supabase.auth.exchangeCodeForSession(code),
      new Promise((_, reject) => {
        window.setTimeout(
          () => reject(new Error("Le retour OAuth Supabase n'a pas pu finaliser la session en 15 secondes.")),
          15_000,
        );
      }),
    ]);
    const { error } = exchangeResult || {};
    if (error) throw error;

    clearPendingPkceBackup();
    resumeSupabaseAuthRuntime();
    saveCallbackResult({ ok: true, provider });
    clearPendingSocialAuth();

    if (typeof window !== "undefined") {
      window.location.hash = "#/auth/callback?social=1&native=1";
    }
    return true;
  } catch (error: any) {
    resumeSupabaseAuthRuntime();
    saveCallbackResult({
      ok: false,
      provider,
      message: String(error?.message || error || "Erreur OAuth Android."),
    });
    clearPendingSocialAuth();
    if (typeof window !== "undefined") {
      window.location.hash = "#/auth/callback?social=1&native=1&error=1";
    }
    return true;
  }
}

let nativeBridgeStarted = false;
let nativePollTimer: number | null = null;
let nativeConsumeBusy = false;

async function pollNativeSocialCallback() {
  if (nativeConsumeBusy || !getPendingSocialAuth()) return;
  nativeConsumeBusy = true;
  try {
    const { url } = await NativeSocialAuth.consumeLaunchUrl();
    if (url) await exchangeNativeCallbackUrl(String(url));
  } catch (error) {
    console.warn("[socialAuth] native callback poll failed", error);
  } finally {
    nativeConsumeBusy = false;
  }
}

/** Initialise une fois le pont de retour OAuth Android. */
export function initNativeSocialAuthBridge() {
  if (nativeBridgeStarted || !isCapacitorNativeRuntime() || typeof window === "undefined") return;
  nativeBridgeStarted = true;

  const poll = () => { void pollNativeSocialCallback(); };
  window.addEventListener("focus", poll);
  window.addEventListener("pageshow", poll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") poll();
  });

  nativePollTimer = window.setInterval(() => {
    if (getPendingSocialAuth()) poll();
  }, 900);

  // Gère aussi le cold start directement depuis le deep link.
  poll();
}

export function stopNativeSocialAuthBridgeForTests() {
  if (nativePollTimer != null && typeof window !== "undefined") window.clearInterval(nativePollTimer);
  nativePollTimer = null;
  nativeBridgeStarted = false;
}
