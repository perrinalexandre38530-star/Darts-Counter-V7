// ============================================================
// src/lib/accountScope.ts
// Scope léger et sans dépendance pour les petits stores localStorage.
// Objectif : 1 compte Supabase = 1 namespace local, sans cycle avec storage.ts.
// ============================================================

import { cleanCanonicalAccountScopeId, getCanonicalAccountScopeId, sanitizeCanonicalAccountScopePart } from "./canonicalAccountScope";

const LEGACY_CLAIMS_KEY = "dc_account_legacy_key_claims_v1";

function cleanId(value: unknown): string {
  return cleanCanonicalAccountScopeId(value);
}

export function getAccountScopeId(): string | null {
  return getCanonicalAccountScopeId();
}

export function sanitizeAccountScopePart(value: unknown): string {
  return sanitizeCanonicalAccountScopePart(value);
}

export function accountScopedLocalStorageKey(baseKey: string, userId?: string | null): string {
  const uid = cleanId(userId) || getAccountScopeId() || "";
  // Préfixe volontairement hors dc_ / dc- : les namespaces privés de plusieurs
  // comptes présents sur le même appareil ne doivent pas être aspirés ensemble
  // par l'ancien snapshot localStorage/NAS. Leur source multi-appareils est
  // désormais Supabase account_sync_documents.
  return uid ? `mss_account_v1:${sanitizeAccountScopePart(uid)}:${baseKey}` : baseKey;
}

function readLegacyClaims(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_CLAIMS_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLegacyClaims(value: Record<string, string>): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(LEGACY_CLAIMS_KEY, JSON.stringify(value)); } catch {}
}

/**
 * Adopte une ancienne clé non scopée UNE seule fois pour le premier compte qui
 * la revendique. Cela préserve les données historiques sans les recopier ensuite
 * vers un second compte utilisé sur le même appareil.
 */
export function adoptLegacyLocalStorageKey(baseKey: string, userId?: string | null): boolean {
  if (typeof localStorage === "undefined") return false;
  const uid = cleanId(userId) || getAccountScopeId() || "";
  if (!uid) return false;
  const scoped = accountScopedLocalStorageKey(baseKey, uid);
  try {
    if (localStorage.getItem(scoped) != null) return false;
    const legacy = localStorage.getItem(baseKey);
    if (legacy == null) return false;
    const claims = readLegacyClaims();
    const owner = cleanId(claims[baseKey]);
    if (owner && owner !== uid) return false;
    localStorage.setItem(scoped, legacy);
    claims[baseKey] = uid;
    writeLegacyClaims(claims);
    return true;
  } catch {
    return false;
  }
}

export function getAccountLocalStorageItem(baseKey: string, userId?: string | null): string | null {
  if (typeof localStorage === "undefined") return null;
  const uid = cleanId(userId) || getAccountScopeId();
  if (uid) adoptLegacyLocalStorageKey(baseKey, uid);
  try { return localStorage.getItem(accountScopedLocalStorageKey(baseKey, uid)); } catch { return null; }
}

export function setAccountLocalStorageItem(baseKey: string, value: string, userId?: string | null): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(accountScopedLocalStorageKey(baseKey, userId), value); } catch {}
}

export function removeAccountLocalStorageItem(baseKey: string, userId?: string | null): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(accountScopedLocalStorageKey(baseKey, userId)); } catch {}
}
