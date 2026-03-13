// ============================================================
// src/lib/serverConfig.ts
// NAS / backend provider selection
// - ONLINE_PROVIDER=nas | supabase | auto
// - VITE_NAS_API_URL=http://api.multisports-api.fr:3000
// ============================================================

const rawProvider = String((import.meta as any)?.env?.VITE_ONLINE_PROVIDER || "auto").trim().toLowerCase();
const rawNasApiUrl = String((import.meta as any)?.env?.VITE_NAS_API_URL || "").trim().replace(/\/+$/, "");

export const ONLINE_PROVIDER = (["nas", "supabase", "auto"].includes(rawProvider) ? rawProvider : "auto") as
  | "nas"
  | "supabase"
  | "auto";

export const NAS_API_URL = rawNasApiUrl;

export function isNasProviderEnabled(): boolean {
  if (ONLINE_PROVIDER === "nas") return !!NAS_API_URL;
  if (ONLINE_PROVIDER === "supabase") return false;
  return !!NAS_API_URL;
}

export function getOnlineProviderLabel(): string {
  return isNasProviderEnabled() ? "nas" : "supabase";
}
