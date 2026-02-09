import { supabase } from "./supabaseClient";

export async function rehydrateSupabaseSession() {
  try {
    const raw = localStorage.getItem("dc_online_auth_supabase_v1");
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const access_token = parsed?.token;
    const refresh_token = parsed?.refreshToken;

    if (!access_token || !refresh_token) return;

    const { data } = await supabase.auth.getSession();
    if (data?.session) return;

    await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    console.log("[rehydrate] Supabase session restored");
  } catch (e) {
    console.warn("[rehydrate] failed", e);
  }
}
