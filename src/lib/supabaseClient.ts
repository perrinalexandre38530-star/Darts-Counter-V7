// ============================================
// src/lib/supabaseClient.ts
// Client Supabase unique pour toute l'app
// ✅ En mode NAS: client NO-OP pour couper totalement
// les fetch/realtime/storage Supabase au runtime.
// ============================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { purgeLegacyLocalStorageIfNeeded } from "./storageQuota";
import { isSupabaseHardDisabledInNasMode } from "./serverConfig";

const RAW_SUPABASE_URL = String((import.meta.env.VITE_SUPABASE_URL as string) || "").trim();
const RAW_SUPABASE_ANON_KEY = String((import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "").trim();

// Projet Supabase officiel de Multisports Scoring.
// Certains anciens builds Cloudflare ont conservé un ancien project-ref
// (hkyqtgnhuqgciixmepcnbw) désormais introuvable : la connexion échouait
// alors avant même d'atteindre Supabase. On refuse donc toute URL provenant
// d'un autre projet pour cette application et on utilise la configuration
// publique canonique fournie avec le projet actuel.
const CANONICAL_SUPABASE_PROJECT_REF = "rckbdaqksujehszafior";
const CANONICAL_SUPABASE_URL = `https://${CANONICAL_SUPABASE_PROJECT_REF}.supabase.co`;
const CANONICAL_SUPABASE_ANON_KEY = "sb_publishable_QlOTwTh-mKNLxQM9-dmIiw_EDegyTtU";

function resolveSupabaseRuntimeConfig() {
  try {
    const parsed = new URL(RAW_SUPABASE_URL);
    const projectRef = String(parsed.hostname || "").split(".")[0] || "";
    if (parsed.protocol === "https:" && projectRef === CANONICAL_SUPABASE_PROJECT_REF && RAW_SUPABASE_ANON_KEY) {
      return {
        url: RAW_SUPABASE_URL.replace(/\/+$/, ""),
        anonKey: RAW_SUPABASE_ANON_KEY,
        repairedLegacyConfig: false,
      };
    }
  } catch {}
  return {
    url: CANONICAL_SUPABASE_URL,
    anonKey: CANONICAL_SUPABASE_ANON_KEY,
    repairedLegacyConfig: true,
  };
}

const RESOLVED_SUPABASE_CONFIG = resolveSupabaseRuntimeConfig();
const SUPABASE_URL = RESOLVED_SUPABASE_CONFIG.url;
const SUPABASE_ANON_KEY = RESOLVED_SUPABASE_CONFIG.anonKey;
const isDev = !!import.meta.env.DEV;


// -----------------------------------------------------------------------------
// SUPABASE DATA-PLANE CIRCUIT BREAKER
// -----------------------------------------------------------------------------
// PGRST002 = PostgREST n'arrive plus a charger le schema depuis PostgreSQL.
// Quand cela arrive, relancer profils + sync + organisations + messages en
// parallele empire la panne et transforme la console en rafale de 503.
//
// On limite donc la concurrence REST, puis on ouvre un circuit global pendant
// une courte periode apres un 502/503/504 de la data-plane. Auth reste disponible
// car /auth/v1 n'est volontairement jamais bloque ici.
const SUPABASE_REST_MAX_CONCURRENCY = 4;
const SUPABASE_REST_BASE_COOLDOWN_MS = 20_000;
const SUPABASE_REST_MAX_COOLDOWN_MS = 3 * 60_000;
let supabaseRestActive = 0;
let supabaseRestCircuitUntil = 0;
let supabaseRestFailureCount = 0;
let supabaseRestNeedsProbe = false;
let supabaseRestProbeInFlight = false;
let supabaseRestLastNoticeAt = 0;
const supabaseRestWaiters: Array<() => void> = [];

function supabaseRequestUrl(input: any): string {
  try {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    if (input && typeof input.url === "string") return String(input.url);
  } catch {}
  return String(input || "");
}

function isSupabaseRestRequest(input: any): boolean {
  const url = supabaseRequestUrl(input);
  return !!url && url.startsWith(SUPABASE_URL) && /\/rest\/v1(?:\/|\?|$)/i.test(url);
}

function transientErrorText(error: any): string {
  return [
    error?.message,
    error?.details,
    error?.hint,
    error?.error,
    error?.payload?.message,
    error?.payload?.error,
  ].filter(Boolean).join(" ").toLowerCase();
}

export function isSupabaseTransientUnavailableError(error: any): boolean {
  const code = String(error?.code || error?.payload?.code || "").toUpperCase();
  const status = Number(error?.status || error?.statusCode || error?.status_code || 0);
  const text = transientErrorText(error);
  return code === "PGRST002" ||
    code === "PGRST001" ||
    text.includes("schema cache") ||
    text.includes("could not query the database") ||
    text.includes("database is unavailable") ||
    text.includes("connection terminated unexpectedly") ||
    text.includes("too many connections") ||
    ([502, 503, 504].includes(status) && (text.includes("supabase") || text.includes("database") || text.includes("schema") || !text));
}

export function isSupabaseRestCircuitOpen(): boolean {
  return Date.now() < supabaseRestCircuitUntil || (supabaseRestNeedsProbe && supabaseRestProbeInFlight);
}

export function supabaseRestRetryAfterMs(): number {
  if (Date.now() < supabaseRestCircuitUntil) return Math.max(0, supabaseRestCircuitUntil - Date.now());
  return supabaseRestNeedsProbe ? 2_000 : 0;
}

function announceSupabaseRestState(state: "paused" | "ready", detail: any = {}): void {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent("msc:supabase-rest-health", { detail: { state, ...detail } })); } catch {}
}

function openSupabaseRestCircuit(reason: string, status = 503): void {
  const now = Date.now();
  // Plusieurs requetes deja parties peuvent toutes revenir 503 en meme temps.
  // Elles appartiennent a la meme panne : ne pas multiplier le backoff pour
  // chaque reponse concurrente. Le backoff augmente seulement si un vrai probe
  // apres expiration echoue de nouveau.
  if (now >= supabaseRestCircuitUntil) {
    supabaseRestFailureCount = Math.min(8, supabaseRestFailureCount + 1);
  }
  const cooldown = Math.min(
    SUPABASE_REST_MAX_COOLDOWN_MS,
    SUPABASE_REST_BASE_COOLDOWN_MS * Math.max(1, 2 ** (supabaseRestFailureCount - 1)),
  );
  supabaseRestCircuitUntil = Math.max(supabaseRestCircuitUntil, now + cooldown);
  supabaseRestNeedsProbe = true;
  if (Date.now() - supabaseRestLastNoticeAt > 30_000) {
    supabaseRestLastNoticeAt = Date.now();
    console.warn(`[supabase] data-plane suspendue ${Math.ceil(cooldown / 1000)}s (${status}) : ${reason || "service indisponible"}`);
  }
  announceSupabaseRestState("paused", { retryAt: supabaseRestCircuitUntil, status, reason });
}

function closeSupabaseRestCircuit(): void {
  const wasPaused = supabaseRestFailureCount > 0 || supabaseRestNeedsProbe || supabaseRestCircuitUntil > 0;
  supabaseRestFailureCount = 0;
  supabaseRestCircuitUntil = 0;
  supabaseRestNeedsProbe = false;
  supabaseRestProbeInFlight = false;
  if (wasPaused) announceSupabaseRestState("ready", { at: Date.now() });
}

function syntheticSupabaseCooldownResponse(): Response {
  const retryMs = Math.max(1_000, supabaseRestRetryAfterMs());
  return new Response(JSON.stringify({
    code: "PGRST002",
    message: "Supabase data-plane temporairement suspendue par le circuit de protection.",
    hint: `Nouvel essai automatique dans ${Math.ceil(retryMs / 1000)} s.`,
    mssCircuitOpen: true,
  }), {
    status: 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": String(Math.ceil(retryMs / 1000)),
      "x-mss-supabase-circuit": "open",
    },
  });
}

async function acquireSupabaseRestSlot(): Promise<void> {
  if (supabaseRestActive < SUPABASE_REST_MAX_CONCURRENCY) {
    supabaseRestActive += 1;
    return;
  }
  await new Promise<void>((resolve) => supabaseRestWaiters.push(resolve));
  supabaseRestActive += 1;
}

function releaseSupabaseRestSlot(): void {
  supabaseRestActive = Math.max(0, supabaseRestActive - 1);
  const next = supabaseRestWaiters.shift();
  if (next) next();
}

const nativeFetch = globalThis.fetch.bind(globalThis);

async function resilientSupabaseFetch(input: any, init?: RequestInit): Promise<Response> {
  if (!isSupabaseRestRequest(input)) return nativeFetch(input, init);

  await acquireSupabaseRestSlot();
  let isHalfOpenProbe = false;
  try {
    if (Date.now() < supabaseRestCircuitUntil) return syntheticSupabaseCooldownResponse();

    if (supabaseRestNeedsProbe) {
      if (supabaseRestProbeInFlight) return syntheticSupabaseCooldownResponse();
      supabaseRestProbeInFlight = true;
      isHalfOpenProbe = true;
    }

    const response = await nativeFetch(input, init);
    if ([502, 503, 504].includes(response.status)) {
      let payload: any = null;
      let text = "";
      try {
        text = await response.clone().text();
        try { payload = text ? JSON.parse(text) : null; } catch {}
      } catch {}
      const code = String(payload?.code || "").toUpperCase();
      const message = String(payload?.message || payload?.error || text || `HTTP ${response.status}`);
      if (code === "PGRST002" || code === "PGRST001" || /schema cache|could not query the database|database.*unavailable|connection|timeout/i.test(message) || response.status === 503) {
        openSupabaseRestCircuit(message, response.status);
      }
    } else {
      // 2xx/4xx signifie que PostgREST repond de nouveau : meme une erreur RLS
      // ou RPC absente prouve que la data-plane a retrouve PostgreSQL.
      closeSupabaseRestCircuit();
    }
    return response;
  } catch (error: any) {
    // Une erreur reseau sur l'URL REST est egalement protegee, sans toucher Auth.
    openSupabaseRestCircuit(String(error?.message || error || "Erreur reseau Supabase"), 503);
    throw error;
  } finally {
    if (isHalfOpenProbe) supabaseRestProbeInFlight = false;
    releaseSupabaseRestSlot();
  }
}

export const __SUPABASE_ENV__ = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  projectRef: CANONICAL_SUPABASE_PROJECT_REF,
  hasEnv: !!SUPABASE_URL && !!SUPABASE_ANON_KEY,
  disabledInNasMode: isSupabaseHardDisabledInNasMode(),
  repairedLegacyConfig: RESOLVED_SUPABASE_CONFIG.repairedLegacyConfig,
} as const;

function supabaseProjectRef(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname || "";
    return host.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

const PROJECT_REF = supabaseProjectRef(SUPABASE_URL);

if (isDev) {
  console.log("[supabaseClient] SUPABASE_URL =", SUPABASE_URL);
  console.log("[supabaseClient] PROJECT_REF =", PROJECT_REF);
  console.log("[supabaseClient] disabledInNasMode =", isSupabaseHardDisabledInNasMode());
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[supabaseClient] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquants. Supabase sera inactif.");
}

declare global {
  // eslint-disable-next-line no-var
  var __dc_supabase_by_ref: Record<string, SupabaseClient> | undefined;
}

const canUseWindow = typeof window !== "undefined";

function isPkceCallbackLanding(): boolean {
  if (!canUseWindow) return false;
  try {
    const href = String(window.location.href || "");
    const hash = String(window.location.hash || "");
    const url = new URL(href);
    const hasCode = !!url.searchParams.get("code") || /(?:\?|&)code=/.test(hash);
    const callbackRoute = /\/auth-callback\.html/i.test(url.pathname) || /^#\/auth\/callback/i.test(hash);
    return callbackRoute && hasCode;
  } catch {
    return false;
  }
}

const PKCE_CALLBACK_LANDING = isPkceCallbackLanding();
if (canUseWindow) {
  purgeLegacyLocalStorageIfNeeded({ force: false });
  // Supprime uniquement les sessions du projet Supabase obsolète.
  // Les autres données de l'application ne sont jamais touchées.
  try {
    const obsoleteRefs = ["hkyqtgnhuqgciixmepcnbw"];
    for (const ref of obsoleteRefs) {
      window.localStorage.removeItem(`dc-supabase-auth-v2:${ref}`);
      window.sessionStorage.removeItem(`dc-supabase-auth-v2:${ref}`);
    }
  } catch {}
}

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function safeStorage(): StorageLike | undefined {
  if (!canUseWindow) return undefined;
  const ls = window.localStorage;
  const ss = window.sessionStorage;
  const trySet = (s: StorageLike, key: string, value: string) => {
    try { s.setItem(key, value); return true; } catch { return false; }
  };
  return {
    getItem: (key: string) => {
      try { const v = ls.getItem(key); if (v != null) return v; } catch {}
      try { return ss.getItem(key); } catch { return null; }
    },
    setItem: (key: string, value: string) => {
      if (trySet(ls, key, value)) return;
      purgeLegacyLocalStorageIfNeeded({ force: true });
      if (trySet(ls, key, value)) return;
      trySet(ss, key, value);
    },
    removeItem: (key: string) => {
      try { ls.removeItem(key); } catch {}
      try { ss.removeItem(key); } catch {}
    },
  };
}

const storage = safeStorage();
const STORAGE_KEY = `dc-supabase-auth-v2:${PROJECT_REF}`;

function noopResult<T>(data: T) {
  return Promise.resolve({ data, error: null } as any);
}

function createNoopQueryBuilder(initialData: any = []) {
  const state = { mode: "read", data: initialData };
  const api: any = {};
  const chain = () => api;
  api.select = (..._args: any[]) => { state.mode = "read"; state.data = []; return api; };
  api.insert = (..._args: any[]) => { state.mode = "write"; state.data = null; return api; };
  api.update = (..._args: any[]) => { state.mode = "write"; state.data = null; return api; };
  api.upsert = (..._args: any[]) => { state.mode = "write"; state.data = null; return api; };
  api.delete = (..._args: any[]) => { state.mode = "write"; state.data = null; return api; };
  api.eq = chain; api.neq = chain; api.in = chain; api.is = chain; api.not = chain; api.or = chain;
  api.match = chain; api.contains = chain; api.order = chain; api.limit = chain; api.range = chain; api.gte = chain; api.lte = chain; api.lt = chain; api.gt = chain; api.ilike = chain; api.like = chain; api.textSearch = chain;
  api.maybeSingle = () => noopResult(null);
  api.single = () => noopResult(null);
  api.then = (resolve: any, reject: any) => Promise.resolve({ data: state.data, error: null }).then(resolve, reject);
  return api;
}

function createNoopChannel() {
  const chan: any = {};
  chan.on = () => chan;
  chan.subscribe = (cb?: any) => { try { cb?.("CLOSED"); } catch {} return chan; };
  chan.track = async () => ({ error: null });
  chan.untrack = async () => ({ error: null });
  chan.send = async () => ({ error: null });
  chan.presenceState = () => ({});
  chan.unsubscribe = async () => ({ error: null });
  return chan;
}

function createNoopSupabaseClient(): SupabaseClient {
  const noopChannel = createNoopChannel;
  const client: any = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      setSession: async () => ({ data: { session: null }, error: null }),
      refreshSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: null }),
      signUp: async () => ({ data: { session: null, user: null }, error: null }),
      onAuthStateChange: (cb?: any) => { try { cb?.("SIGNED_OUT", null); } catch {} return { data: { subscription: { unsubscribe() {} } } }; },
      resend: async () => ({ data: null, error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
      exchangeCodeForSession: async () => ({ data: { session: null }, error: null }),
      getSessionFromUrl: async () => ({ data: { session: null }, error: null }),
      stopAutoRefresh: async () => ({ error: null }),
    },
    from: (_table: string) => createNoopQueryBuilder([]),
    rpc: async (_fn: string, _args?: any) => ({ data: null, error: null }),
    channel: (_name: string, _opts?: any) => noopChannel(),
    removeChannel: async (_chan: any) => ({ data: null, error: null }),
    removeAllChannels: async () => ({ data: null, error: null }),
    storage: {
      from: (_bucket: string) => ({
        upload: async (_path: string, _blob: any, _opts?: any) => ({ data: null, error: null }),
        download: async (_path: string) => ({ data: null, error: null }),
        remove: async (_paths: string[]) => ({ data: null, error: null }),
        getPublicUrl: (_path: string) => ({ data: { publicUrl: "" } }),
      }),
    },
    functions: {
      invoke: async (_name: string, _opts?: any) => ({ data: { disabled: true }, error: null }),
    },
  };
  return client as SupabaseClient;
}

function createRealSupabaseClient(): SupabaseClient {
  const url = SUPABASE_URL || "https://invalid.supabase.co";
  const key = SUPABASE_ANON_KEY || "invalid-anon-key";
  return createClient(url, key, {
    global: { fetch: resilientSupabaseFetch as any },
    auth: {
      persistSession: true,
      // Pendant un retour OAuth PKCE, aucun refresh d'une ancienne session ne
      // doit pouvoir supprimer le code-verifier avant exchangeCodeForSession().
      autoRefreshToken: !PKCE_CALLBACK_LANDING,
      detectSessionInUrl: false,
      storage,
      storageKey: STORAGE_KEY,
      flowType: "pkce",
    },
  });
}

const byRef = (globalThis.__dc_supabase_by_ref ||= {});
const refKey = isSupabaseHardDisabledInNasMode() ? `nas-disabled:${PROJECT_REF}` : PROJECT_REF;
export const supabase: SupabaseClient = byRef[refKey] || (isSupabaseHardDisabledInNasMode() ? createNoopSupabaseClient() : createRealSupabaseClient());
byRef[refKey] = supabase;
