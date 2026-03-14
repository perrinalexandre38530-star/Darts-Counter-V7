// ============================================================
// src/lib/serverConfig.ts
// Architecture cible stable
// - Auth compte utilisateur = Supabase
// - Sauvegarde / restauration des données = NAS si URL présente
// ============================================================

const rawNasApiUrl = String((import.meta as any)?.env?.VITE_NAS_API_URL || "").trim().replace(/\/+$/, "");

export const NAS_API_URL = rawNasApiUrl;

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

export function getOnlineProviderLabel(): string {
  return isNasDataSyncEnabled() ? "supabase+nas" : "supabase";
}
