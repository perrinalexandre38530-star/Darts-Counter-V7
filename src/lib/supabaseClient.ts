// ============================================
// src/lib/supabaseClient.ts
// Client Supabase unique pour toute l'app
// ✅ En mode NAS: client NO-OP pour couper totalement
// les fetch/realtime/storage Supabase au runtime.
// ============================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { purgeLegacyLocalStorageIfNeeded } from "./storageQuota";
import { isSupabaseHardDisabledInNasMode } from "./serverConfig";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";
const isDev = !!import.meta.env.DEV;

export const __SUPABASE_ENV__ = {
  url: SUPABASE_URL,
  hasEnv: !!SUPABASE_URL && !!SUPABASE_ANON_KEY,
  disabledInNasMode: isSupabaseHardDisabledInNasMode(),
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
if (canUseWindow) purgeLegacyLocalStorageIfNeeded({ force: false });

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
    auth: {
      persistSession: true,
      autoRefreshToken: true,
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
