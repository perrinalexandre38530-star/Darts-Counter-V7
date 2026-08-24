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
  | "linkedin"
  | "github"
  | "spotify"
  | "twitch"
  | "kakao";

type SocialAuthConfig = {
  label: string;
  oauthProvider: string;
  scopes?: string;
  custom?: boolean;
  note?: string;
};

export const SOCIAL_AUTH_CONFIG: Record<SocialAuthProvider, SocialAuthConfig> = {
  google: { label: "Google", oauthProvider: "google" },
  apple: { label: "Apple", oauthProvider: "apple" },
  facebook: { label: "Facebook", oauthProvider: "facebook" },
  azure: { label: "Microsoft", oauthProvider: "azure", scopes: "email" },
  x: { label: "X / Twitter", oauthProvider: "x" },
  discord: { label: "Discord", oauthProvider: "discord" },
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
  snapchat: { label: "Snapchat", oauthProvider: "snapchat" },
  // TikTok Login Kit n'est pas un provider natif Supabase : Custom OAuth/OIDC.
  tiktok: { label: "TikTok", oauthProvider: "custom:tiktok", custom: true },
  linkedin: { label: "LinkedIn", oauthProvider: "linkedin_oidc" },
  github: { label: "GitHub", oauthProvider: "github" },
  spotify: { label: "Spotify", oauthProvider: "spotify" },
  twitch: { label: "Twitch", oauthProvider: "twitch" },
  kakao: { label: "Kakao", oauthProvider: "kakao" },
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
  "linkedin",
  "github",
  "spotify",
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
  "linkedin",
  "github",
  "spotify",
  "twitch",
  "kakao",
] as const;

export const SOCIAL_AUTH_LABELS: Record<SocialAuthProvider, string> = Object.fromEntries(
  Object.entries(SOCIAL_AUTH_CONFIG).map(([key, value]) => [key, value.label])
) as Record<SocialAuthProvider, string>;

const PENDING_KEY = "msc_social_auth_pending_v1";
const CALLBACK_RESULT_KEY = "msc_social_auth_callback_v1";
const NATIVE_CALLBACK_URL = "multisportsscoring://auth/callback";
const NATIVE_CALLBACK_PREFIX = "multisportsscoring://auth/callback";

type NativeSocialAuthPlugin = {
  openExternal(options: { url: string }): Promise<void>;
  consumeLaunchUrl(): Promise<{ url?: string | null }>;
};

const NativeSocialAuth = registerPlugin<NativeSocialAuthPlugin>("SocialAuth");

function getSiteUrl(): string {
  const fromEnv =
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_SITE_URL) ||
    "";
  const site = String(fromEnv || "https://darts-counter-v7.pages.dev").trim();
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
    return parsed;
  } catch {
    return null;
  }
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

  rememberPending(provider);
  const native = isCapacitorNativeRuntime();
  const config = SOCIAL_AUTH_CONFIG[provider];

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      // Certains providers récents (X, Snapchat et providers custom) ne sont
      // pas présents dans les anciennes unions TypeScript de supabase-js,
      // alors qu'ils sont acceptés côté Supabase Auth runtime.
      provider: config.oauthProvider as any,
      options: {
        redirectTo: getSocialAuthRedirectUrl(),
        skipBrowserRedirect: native,
        ...(config.scopes ? { scopes: config.scopes } : {}),
      },
    });

    if (error) throw error;

    if (native) {
      const url = String((data as any)?.url || "").trim();
      if (!url) throw new Error(`Supabase n'a pas retourné l'URL OAuth ${SOCIAL_AUTH_LABELS[provider]}.`);
      await NativeSocialAuth.openExternal({ url });
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;

    saveCallbackResult({ ok: true, provider });
    clearPendingSocialAuth();

    if (typeof window !== "undefined") {
      window.location.hash = "#/auth/callback?social=1&native=1";
    }
    return true;
  } catch (error: any) {
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
