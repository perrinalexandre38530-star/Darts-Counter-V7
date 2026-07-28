import { isNasProviderEnabled } from "./serverConfig";
import { supabase } from "./supabaseClient";
import {
  clearSupabaseBrowserAuthStorage,
  isInvalidRefreshSessionError,
} from "./authSessionGuard";

let rehydrateInFlight: Promise<void> | null = null;
let warnedInvalidSession = false;

async function invalidateBrokenSupabaseSession(error: any): Promise<void> {
  if (!isInvalidRefreshSessionError(error)) return;
  clearSupabaseBrowserAuthStorage({ includeCompatSession: true });
  try { await (supabase.auth as any).signOut?.({ scope: "local" }); } catch {}
  if (!warnedInvalidSession) {
    warnedInvalidSession = true;
    console.warn("[rehydrate] session Supabase expirée/invalide supprimée ; une reconnexion est nécessaire.");
  }
}

export async function rehydrateSupabaseSession(): Promise<void> {
  if (isNasProviderEnabled()) return;
  if (rehydrateInFlight) return rehydrateInFlight;

  rehydrateInFlight = (async () => {
    try {
      const raw = localStorage.getItem("dc_online_auth_supabase_v1");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const access_token = String(parsed?.token || "").trim();
      const refresh_token = String(parsed?.refreshToken || "").trim();
      if (!access_token || !refresh_token) return;

      const existing = await supabase.auth.getSession();
      if (existing?.error) {
        await invalidateBrokenSupabaseSession(existing.error);
        if (isInvalidRefreshSessionError(existing.error)) return;
      }
      if (existing?.data?.session?.user) return;

      const result = await supabase.auth.setSession({ access_token, refresh_token });
      if (result?.error) {
        await invalidateBrokenSupabaseSession(result.error);
        return;
      }

      if (result?.data?.session?.user) {
        warnedInvalidSession = false;
        console.log("[rehydrate] Supabase session restored");
      }
    } catch (error) {
      await invalidateBrokenSupabaseSession(error);
      if (!isInvalidRefreshSessionError(error)) {
        console.warn("[rehydrate] failed", error);
      }
    }
  })().finally(() => {
    rehydrateInFlight = null;
  });

  return rehydrateInFlight;
}
