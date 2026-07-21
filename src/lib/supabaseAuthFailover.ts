import type { Session, User } from "@supabase/supabase-js";
import { supabase, __SUPABASE_ENV__ } from "./supabaseClient";
import { getNasApiUrl } from "./serverConfig";

const STATUS_KEY = "dc_supabase_auth_failover_status_v1";
const MAP_KEY = "dc_supabase_auth_failover_map_v1";

export type SupabaseAuthFailoverState = {
  version: 1;
  email: string;
  canonicalUserId: string;
  supabaseUserId?: string | null;
  status: "ready" | "pending_confirmation" | "unavailable" | "error";
  updatedAt: string;
  message?: string;
};

type CanonicalMap = Record<string, { canonicalUserId: string; supabaseUserId?: string | null; updatedAt: string }>;

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function saveState(state: SupabaseAuthFailoverState): SupabaseAuthFailoverState {
  safeWriteJson(STATUS_KEY, state);
  try {
    window.dispatchEvent(new CustomEvent("dc-supabase-failover-status", { detail: state }));
  } catch {}
  return state;
}

export function getSupabaseAuthFailoverState(): SupabaseAuthFailoverState | null {
  return safeReadJson<SupabaseAuthFailoverState | null>(STATUS_KEY, null);
}

export function rememberCanonicalUserMapping(args: {
  email?: string | null;
  canonicalUserId?: string | null;
  supabaseUserId?: string | null;
}): void {
  const email = normalizeEmail(args.email);
  const canonicalUserId = String(args.canonicalUserId || "").trim();
  if (!email || !canonicalUserId) return;
  const current = safeReadJson<CanonicalMap>(MAP_KEY, {});
  current[email] = {
    canonicalUserId,
    supabaseUserId: String(args.supabaseUserId || "").trim() || null,
    updatedAt: new Date().toISOString(),
  };
  safeWriteJson(MAP_KEY, current);
}

export function resolveCanonicalUserId(user: User | null | undefined): string {
  const metadata: any = user?.user_metadata || {};
  const fromMetadata = String(
    metadata.canonical_user_id || metadata.nas_user_id || metadata.multisports_user_id || ""
  ).trim();
  if (fromMetadata) return fromMetadata;

  const email = normalizeEmail(user?.email);
  const map = safeReadJson<CanonicalMap>(MAP_KEY, {});
  const fromLocal = email ? String(map[email]?.canonicalUserId || "").trim() : "";
  return fromLocal || String(user?.id || "").trim();
}

export function isSupabaseFailoverSession(value: any): boolean {
  return String(value?.authProvider || value?.auth_provider || "") === "supabase_failover" || value?.degradedMode === true;
}

async function updateSignedInUserMetadata(canonicalUserId: string, nickname?: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;
    await supabase.auth.updateUser({
      data: {
        ...(user.user_metadata || {}),
        canonical_user_id: canonicalUserId,
        nas_user_id: canonicalUserId,
        auth_backup_enabled: true,
        auth_backup_updated_at: new Date().toISOString(),
        ...(nickname ? { nickname } : {}),
      },
    });
  } catch {}
}

async function provisionConfirmedSupabaseBackupViaNas(args: {
  email: string;
  password: string;
  nickname?: string;
  canonicalUserId?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const baseUrl = String(getNasApiUrl() || "").replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, message: "API NAS non configurée." };

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), 8000) : null;
  try {
    const response = await fetch(`${baseUrl}/auth/supabase/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: args.email,
        password: args.password,
        nickname: args.nickname || args.email.split("@")[0] || "Player",
        canonicalUserId: args.canonicalUserId || undefined,
      }),
      signal: controller?.signal,
    });
    const text = await response.text().catch(() => "");
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      return {
        ok: false,
        message: String(json?.message || json?.error || text || `Provision Supabase HTTP ${response.status}`),
      };
    }
    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.name === "AbortError"
        ? "Le NAS n’a pas répondu assez vite pendant la création de la copie Supabase."
        : String(error?.message || error || "Provision Supabase impossible."),
    };
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

/**
 * Après une connexion NAS réussie, crée ou vérifie la copie d'authentification
 * Supabase avec les mêmes identifiants. Cette opération est best-effort et ne
 * bloque jamais la connexion principale.
 */
export async function ensureSupabaseAuthBackup(args: {
  email?: string | null;
  password?: string | null;
  nickname?: string | null;
  canonicalUserId?: string | null;
}): Promise<SupabaseAuthFailoverState> {
  const email = normalizeEmail(args.email);
  const password = String(args.password || "");
  const nickname = String(args.nickname || "").trim();
  const canonicalUserId = String(args.canonicalUserId || "").trim();
  const base = {
    version: 1 as const,
    email,
    canonicalUserId,
    updatedAt: new Date().toISOString(),
  };

  if (!__SUPABASE_ENV__.hasEnv || !email || !password || !canonicalUserId) {
    return saveState({
      ...base,
      status: "unavailable",
      message: "Copie Supabase impossible : configuration ou identifiants incomplets.",
    });
  }

  try {
    // 1) Le compte existe déjà : connexion directe et mise à jour du lien canonique.
    let signedIn = await supabase.auth.signInWithPassword({ email, password });

    // 2) Après un login NAS réussi, le backend actuel peut créer un utilisateur
    // Supabase déjà confirmé via sa service role. C'est plus fiable que signUp()
    // côté navigateur et évite de bloquer le secours sur un email à confirmer.
    if (signedIn.error || !signedIn.data?.user) {
      const provisioned = await provisionConfirmedSupabaseBackupViaNas({ email, password, nickname, canonicalUserId });
      if (provisioned.ok) {
        signedIn = await supabase.auth.signInWithPassword({ email, password });
      }
    }

    if (!signedIn.error && signedIn.data?.user) {
      const supabaseUserId = String(signedIn.data.user.id || "");
      rememberCanonicalUserMapping({ email, canonicalUserId, supabaseUserId });
      await updateSignedInUserMetadata(canonicalUserId, nickname);
      return saveState({
        ...base,
        supabaseUserId,
        status: "ready",
        message: "Connexion de secours Supabase opérationnelle.",
      });
    }

    // 3) Compatibilité si le backend ne propose pas encore le provisioning admin.
    const signup = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname || email.split("@")[0] || "Player",
          canonical_user_id: canonicalUserId,
          nas_user_id: canonicalUserId,
          auth_backup_enabled: true,
          auth_backup_created_at: new Date().toISOString(),
        },
      },
    });

    if (signup.error) throw signup.error;
    const identities = Array.isArray((signup.data?.user as any)?.identities) ? (signup.data?.user as any).identities : null;
    if (identities && identities.length === 0 && !signup.data?.session) {
      return saveState({
        ...base,
        supabaseUserId: String(signup.data?.user?.id || "").trim() || null,
        status: "error",
        message: "Un compte Supabase existe déjà avec cet email mais son mot de passe ne correspond pas au compte NAS. Réinitialise le mot de passe Supabase puis reconnecte-toi au NAS.",
      });
    }

    const supabaseUserId = String(signup.data?.user?.id || "").trim() || null;
    rememberCanonicalUserMapping({ email, canonicalUserId, supabaseUserId });

    if (signup.data?.session) {
      await updateSignedInUserMetadata(canonicalUserId, nickname);
      return saveState({
        ...base,
        supabaseUserId,
        status: "ready",
        message: "Connexion de secours Supabase créée et active.",
      });
    }

    return saveState({
      ...base,
      supabaseUserId,
      status: "pending_confirmation",
      message: "Compte de secours créé : confirme l'email Supabase une fois pour l'activer.",
    });
  } catch (error: any) {
    return saveState({
      ...base,
      status: "error",
      message: String(error?.message || error || "Échec de la copie Supabase."),
    });
  }
}

export async function getLiveSupabaseSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session || null;
  } catch {
    return null;
  }
}
