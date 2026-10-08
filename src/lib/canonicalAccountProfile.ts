// ============================================
// src/lib/canonicalAccountProfile.ts
// Contrat canonique COMPTE -> MON PROFIL.
//
// Règles :
// - MON PROFIL (store.profiles + activeProfileId) est l'unique source UI pour
//   identité / avatar / préférences du joueur courant.
// - Les projections liées / online ne remplacent jamais ce profil en lecture.
// - Les stats ne sont pas lues ici : elles proviennent de History / statsBridge.
// ============================================

import type { Profile } from "./types";

export function getCanonicalAccountProfileFromStore(store: any): Profile | null {
  const list = Array.isArray(store?.profiles) ? store.profiles : [];
  if (!list.length) return null;
  const activeId = String(store?.activeProfileId || "").trim();
  if (activeId) {
    const exact = list.find((profile: any) => String(profile?.id || "").trim() === activeId);
    if (exact) return exact as Profile;
  }
  const firstHuman = list.find((profile: any) => !profile?.isBot);
  return (firstHuman || list[0] || null) as Profile | null;
}

export function getCanonicalAccountProfileId(store: any): string {
  return String(getCanonicalAccountProfileFromStore(store)?.id || "").trim();
}

export function isCanonicalAccountProfileId(store: any, profileId: any): boolean {
  const canonicalId = getCanonicalAccountProfileId(store);
  return !!canonicalId && canonicalId === String(profileId || "").trim();
}

/**
 * Une projection liée peut enrichir les profils d'amis, mais jamais écraser
 * l'identité du profil canonique du compte courant.
 */
export function withoutCanonicalProfileProjection(linkedProfiles: any[], canonicalProfileId: any): any[] {
  const canonicalId = String(canonicalProfileId || "").trim();
  if (!canonicalId) return Array.isArray(linkedProfiles) ? linkedProfiles : [];
  return (Array.isArray(linkedProfiles) ? linkedProfiles : []).filter((profile: any) => {
    const id = String(profile?.id ?? profile?.profileId ?? profile?.playerId ?? "").trim();
    return !id || id !== canonicalId;
  });
}

export function canonicalProfileAvatar(profile: any): string {
  const candidates = [
    profile?.avatarDataUrl,
    profile?.avatarUrl,
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
