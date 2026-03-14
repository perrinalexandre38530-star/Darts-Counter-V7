// ============================================================
// src/lib/serverConfig.ts
// Architecture cible stable
// - Auth compte utilisateur = Supabase
// - Sauvegarde / restauration des données = NAS si URL présente
// ============================================================

const LEGACY_BAD_HOSTS = [
  "sustainability-accordingly-steven-investments.trycloudflare.com",
];

function sanitizeUrl(raw: unknown): string {
  const value = String(raw || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  if (LEGACY_BAD_HOSTS.some((host) => value.includes(host))) return "";
  return value;
}

export const NAS_API_URL = sanitizeUrl((import.meta as any)?.env?.VITE_NAS_API_URL) || "http://api.multisports-api.fr:3000";

/**
 * Compat legacy :
 * l'auth ne doit plus jamais basculer sur le NAS.
 */
export function isNasProviderEnabled(): boolean {
  return false;
}

/**
 * NAS actif uniquement pour la sync data (snapshot / backup / restore).
 */
export function isNasDataSyncEnabled(): boolean {
  return !!NAS_API_URL;
}

export function getNasApiUrl(): string {
  return NAS_API_URL;
}

export function getOnlineProviderLabel(): string {
  return isNasDataSyncEnabled() ? "supabase+nas" : "supabase";
}
