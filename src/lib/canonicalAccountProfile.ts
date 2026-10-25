// ============================================
// src/lib/canonicalAccountProfile.ts
// Contrat canonique COMPTE -> MON PROFIL.
//
// Règles :
// - MON PROFIL est l'unique source UI pour identité / avatar / préférences.
// - L'UID Supabase identifie le COMPTE ; le profileId local identifie le JOUEUR.
// - Le mapping compte -> profileId est persistant et ne change jamais parce qu'un
//   bridge NAS, une projection ou un ancien alias se réhydrate quelques secondes.
// - Les stats ne sont pas lues ici : elles proviennent de History / statsBridge.
// ============================================

import type { Profile } from "./types";
import { registerCanonicalIdentity, resolveCanonicalProfileIdFromAlias } from "../data/identityAliases";

const ACCOUNT_PROFILE_BINDING_PREFIX = "dc_account_profile_binding_v16:";
const AUTH_SESSION_KEY = "dc_online_auth_supabase_v1";

function cleanId(value: any): string {
  return String(value || "").trim();
}

function profileList(store: any): any[] {
  return (Array.isArray(store?.profiles) ? store.profiles : []).filter(Boolean);
}

function isHumanProfile(profile: any): boolean {
  return !!profile && !profile?.isBot && !String(profile?.id || "").startsWith("online:");
}

/**
 * Retourne uniquement l'identité Supabase stable. Les alias NAS `usr_*` ne sont
 * volontairement jamais considérés comme identité primaire ici.
 */
export function getRuntimeSupabaseAccountUserId(): string {
  try {
    const runtime = cleanId((window as any)?.__dc_primary_auth_user_id);
    if (runtime) return runtime;
  } catch {}

  if (typeof localStorage === "undefined") return "";
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY) || "";
    if (!raw || !(raw.startsWith("{") || raw.startsWith("["))) return "";
    const parsed = JSON.parse(raw);
    return cleanId(
      parsed?.supabaseUserId ||
      parsed?.user?.user_metadata?.supabase_user_id ||
      parsed?.session?.user?.id ||
      (String(parsed?.authProvider || "").toLowerCase().startsWith("supabase")
        ? (parsed?.user?.id || parsed?.userId)
        : "")
    );
  } catch {
    return "";
  }
}

function bindingKey(accountUserId: any): string {
  const uid = cleanId(accountUserId);
  return uid ? `${ACCOUNT_PROFILE_BINDING_PREFIX}${uid}` : "";
}

export function getBoundAccountProfileId(accountUserId?: any): string {
  const uid = cleanId(accountUserId) || getRuntimeSupabaseAccountUserId();
  const key = bindingKey(uid);
  if (!key || typeof localStorage === "undefined") return "";
  try {
    return cleanId(localStorage.getItem(key));
  } catch {
    return "";
  }
}

export function bindCanonicalAccountProfileId(accountUserId: any, profileId: any): string {
  const uid = cleanId(accountUserId) || getRuntimeSupabaseAccountUserId();
  const pid = cleanId(profileId);
  const key = bindingKey(uid);
  if (!key || !pid || typeof localStorage === "undefined") return pid;
  try {
    if (cleanId(localStorage.getItem(key)) !== pid) localStorage.setItem(key, pid);
  } catch {}
  // WAVE 2 : le binding historique compte -> joueur alimente aussi le registre
  // d'alias. Cela ne fusionne aucun profil et ne modifie jamais un alias déjà
  // rattaché à un autre profil canonique.
  try {
    registerCanonicalIdentity({
      accountUserId: uid,
      canonicalProfileId: pid,
      accountIds: [uid],
    });
  } catch {}
  return pid;
}

export function clearCanonicalAccountProfileBinding(accountUserId?: any): void {
  const uid = cleanId(accountUserId) || getRuntimeSupabaseAccountUserId();
  const key = bindingKey(uid);
  if (!key || typeof localStorage === "undefined") return;
  try { localStorage.removeItem(key); } catch {}
}

function profileHasExactAccountBinding(profile: any, accountUserId: string): boolean {
  const uid = cleanId(accountUserId);
  if (!uid || !profile) return false;
  const pi = profile?.privateInfo || profile?.private_info || {};
  const values = [
    profile?.onlineUserId,
    profile?.online_user_id,
    profile?.accountUserId,
    profile?.account_user_id,
    pi?.onlineUserId,
    pi?.online_user_id,
    pi?.accountUserId,
    pi?.account_user_id,
    ...(Array.isArray(pi?.linkedAccountIds) ? pi.linkedAccountIds : []),
  ];
  return values.some((value) => cleanId(value) === uid);
}

/**
 * Résolution de lecture. Si un compte est connecté, le binding persistant gagne
 * sur activeProfileId. Cela empêche un ancien profil doublon de remplacer MON
 * PROFIL pendant une réhydratation / un refresh auth.
 */
export function getCanonicalAccountProfileFromStore(store: any, accountUserId?: any): Profile | null {
  const list = profileList(store);
  if (!list.length) return null;

  const uid = cleanId(accountUserId) || getRuntimeSupabaseAccountUserId();
  if (uid) {
    const boundId = getBoundAccountProfileId(uid);
    if (boundId) {
      const resolvedBoundId = resolveCanonicalProfileIdFromAlias(boundId, uid) || boundId;
      const bound = list.find((profile: any) => cleanId(profile?.id) === resolvedBoundId && isHumanProfile(profile));
      if (bound) return bound as Profile;
    }

    // Une liaison explicite compte -> profil est une preuve plus forte qu'un
    // simple `activeProfileId`. Sur un nouvel appareil/restauration, le profil
    // actif peut encore être un ancien profil local alors que MON PROFIL porte
    // déjà le vrai UID Supabase dans privateInfo.
    const exactBindings = list.filter((profile: any) => isHumanProfile(profile) && profileHasExactAccountBinding(profile, uid));
    if (exactBindings.length === 1) return exactBindings[0] as Profile;

    const activeId = cleanId(store?.activeProfileId);
    if (activeId && exactBindings.length > 1) {
      const activeBound = exactBindings.find((profile: any) => cleanId(profile?.id) === activeId);
      if (activeBound) return activeBound as Profile;
    }
  }

  const activeId = cleanId(store?.activeProfileId);
  if (activeId) {
    const resolvedActiveId = resolveCanonicalProfileIdFromAlias(activeId, uid) || activeId;
    const exact = list.find((profile: any) => cleanId(profile?.id) === resolvedActiveId && isHumanProfile(profile));
    if (exact) return exact as Profile;
  }

  const firstHuman = list.find(isHumanProfile);
  return (firstHuman || list[0] || null) as Profile | null;
}

export function getCanonicalAccountProfileId(store: any, accountUserId?: any): string {
  return cleanId(getCanonicalAccountProfileFromStore(store, accountUserId)?.id);
}

/**
 * Fige le mapping COMPTE -> PROFIL une fois le bon profil identifié. Un binding
 * existant reste prioritaire tant que le profil existe encore.
 */
export function lockCanonicalAccountProfileForStore(
  store: any,
  accountUserId: any,
  preferredProfileId?: any,
): string {
  const uid = cleanId(accountUserId) || getRuntimeSupabaseAccountUserId();
  if (!uid) return "";
  const list = profileList(store).filter(isHumanProfile);
  if (!list.length) return "";

  const boundId = getBoundAccountProfileId(uid);
  if (boundId) {
    const resolvedBoundId = resolveCanonicalProfileIdFromAlias(boundId, uid) || boundId;
    if (list.some((profile: any) => cleanId(profile?.id) === resolvedBoundId)) {
      if (resolvedBoundId !== boundId) bindCanonicalAccountProfileId(uid, resolvedBoundId);
      return resolvedBoundId;
    }
  }

  const preferred = cleanId(preferredProfileId);
  if (preferred) {
    const resolvedPreferred = resolveCanonicalProfileIdFromAlias(preferred, uid) || preferred;
    if (list.some((profile: any) => cleanId(profile?.id) === resolvedPreferred)) {
      return bindCanonicalAccountProfileId(uid, resolvedPreferred);
    }
  }

  const exactBindings = list.filter((profile: any) => profileHasExactAccountBinding(profile, uid));
  if (exactBindings.length === 1) return bindCanonicalAccountProfileId(uid, exactBindings[0]?.id);

  const activeId = cleanId(store?.activeProfileId);
  if (activeId && exactBindings.length > 1 && exactBindings.some((profile: any) => cleanId(profile?.id) === activeId)) {
    return bindCanonicalAccountProfileId(uid, activeId);
  }
  if (activeId && exactBindings.length === 0 && list.some((profile: any) => cleanId(profile?.id) === activeId)) {
    return bindCanonicalAccountProfileId(uid, activeId);
  }

  if (list.length === 1) return bindCanonicalAccountProfileId(uid, list[0]?.id);
  return "";
}

export function isCanonicalAccountProfileId(store: any, profileId: any, accountUserId?: any): boolean {
  const canonicalId = getCanonicalAccountProfileId(store, accountUserId);
  return !!canonicalId && canonicalId === cleanId(profileId);
}

/**
 * Une projection liée peut enrichir les profils d'amis, mais jamais écraser
 * l'identité du profil canonique du compte courant.
 */
export function withoutCanonicalProfileProjection(linkedProfiles: any[], canonicalProfileId: any): any[] {
  const canonicalId = cleanId(canonicalProfileId);
  if (!canonicalId) return Array.isArray(linkedProfiles) ? linkedProfiles : [];
  return (Array.isArray(linkedProfiles) ? linkedProfiles : []).filter((profile: any) => {
    const id = cleanId(profile?.id ?? profile?.profileId ?? profile?.playerId);
    return !id || id !== canonicalId;
  });
}

export function canonicalProfileAvatar(profile: any): string {
  const candidates = [
    // Dès qu'une URL compte Supabase existe, elle est portable sur tous les
    // appareils et doit gagner sur une ancienne vignette locale/cache. Lors d'un
    // changement en cours `changeAvatar()` efface temporairement avatarUrl, donc
    // la preview data: reste bien prioritaire jusqu'à la fin de l'upload.
    profile?.avatarUrl,
    profile?.avatarDataUrl,
    profile?.avatar,
    profile?.photoDataUrl,
    profile?.photoUrl,
  ];
  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? candidate.trim() : "";
    if (value) return value;
  }
  return "";
}
