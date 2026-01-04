// ============================================
// src/lib/accountBridge.ts
// Pont COMPTE ONLINE ↔ PROFIL LOCAL ACTIF
//
// ✅ Online mirror profile (anti-duplication)
// - 1 seul profil local lié au compte Supabase
// - ID stable: online:<user.id>
// - Nettoie les doublons déjà présents dans le store (cloud ou local)
//
// ⚠️ NOTE:
// - On garde aussi linkOnlineIdentityToLocalProfile() pour compat legacy,
//   mais elle délègue au mirror stable (pour stopper les clones).
// ============================================

import type { Store, Profile } from "./types";
import type { UserAuth, OnlineProfile } from "./onlineTypes";

/**
 * Identité online minimale dont on a besoin pour faire le pont.
 * (On ne s'occupe pas du token ici, seulement de qui est connecté.)
 */
export type OnlineIdentity = {
  user: UserAuth | null;
  profile: OnlineProfile | null;
};

/* ---------- Helpers internes ---------- */

type PrivateInfoRaw = {
  email?: string;
  password?: string;
  onlineUserId?: string;
  onlineEmail?: string;
  [k: string]: any;
};

function getPrivateInfo(p: Profile): PrivateInfoRaw {
  return ((p as any).privateInfo || {}) as PrivateInfoRaw;
}

function withPrivateInfo(p: Profile, pi: PrivateInfoRaw): Profile {
  return {
    ...(p as any),
    privateInfo: pi,
  } as Profile;
}

/**
 * ✅ Online mirror profile (anti-duplication)
 * - 1 seul profil local lié au compte Supabase
 * - ID stable: online:<user.id>
 * - Nettoie les doublons déjà présents dans le store (cloud ou local)
 */
export function ensureOnlineMirrorProfile(store: Store, user: any, onlineProfile?: any): Store {
  if (!store || !user?.id) return store;

  const mirrorId = `online:${user.id}`;
  const email = String(user.email || "").toLowerCase();

  const profiles: any[] = Array.isArray((store as any).profiles) ? ((store as any).profiles as any[]) : [];

  const isSameAccount = (p: any) => {
    const pi = (p?.privateInfo || {}) as any;
    const pid = String(p?.id || "");
    const piUid = String(pi?.onlineUserId || "");
    const piEmail = String(pi?.onlineEmail || pi?.email || "").toLowerCase();

    return pid === mirrorId || (piUid && piUid === user.id) || (!!email && piEmail === email);
  };

  const matches = profiles.filter(isSameAccount);
  let primary = matches.find((p) => String(p?.id || "") === mirrorId) || matches[0];

  // 1) Si aucun -> création UNE FOIS
  if (!primary) {
    const now = Date.now();
    const name = (onlineProfile?.nickname || onlineProfile?.displayName || user.email || "Player").trim();

    const mirror: any = {
      id: mirrorId,
      name,
      createdAt: now,
      updatedAt: now,
      avatarUrl: onlineProfile?.avatarUrl || "",
      country: onlineProfile?.country || "",
      privateInfo: {
        onlineUserId: user.id,
        onlineEmail: email || String(user.email || ""),
      },
      isOnlineMirror: true,
    };

    return {
      ...(store as any),
      profiles: [...profiles, mirror],
      activeProfileId: mirrorId,
    } as Store;
  }

  // 2) Migration douce : force l'ID stable sur le primaire
  if (String(primary.id) !== mirrorId) {
    primary = { ...primary, id: mirrorId };
  }

  // 3) Update léger du primaire
  const updatedPrimary: any = {
    ...primary,
    name: (onlineProfile?.nickname || onlineProfile?.displayName || primary.name || "").trim() || primary.name,
    avatarUrl: onlineProfile?.avatarUrl || primary.avatarUrl,
    country: onlineProfile?.country || primary.country,
    privateInfo: {
      ...(primary.privateInfo || {}),
      onlineUserId: user.id,
      onlineEmail: email || String(user.email || ""),
    },
    isOnlineMirror: true,
    updatedAt: Date.now(),
  };

  // 4) Nettoyage doublons : on garde 1 seul profil lié au compte
  const cleaned = profiles
    .filter((p) => !isSameAccount(p) || String(p?.id || "") === mirrorId)
    .map((p) => (String(p?.id || "") === mirrorId ? updatedPrimary : p));

  return {
    ...(store as any),
    profiles: cleaned,
    activeProfileId: mirrorId,
  } as Store;
}

/**
 * Compat legacy :
 * Lie l'identité online à un profil local.
 *
 * ✅ Maintenant : délègue au mirror stable pour stopper les clones.
 */
export function linkOnlineIdentityToLocalProfile(
  identity: OnlineIdentity | null,
  store: Store
): { store: Store; createdProfile: Profile | null } {
  if (!identity || !identity.user) {
    return { store, createdProfile: null };
  }

  const user = identity.user as any;
  const onlineProfile = identity.profile || null;

  const beforeIds = new Set<string>((store.profiles || []).map((p) => String((p as any)?.id || "")));

  const nextStore = ensureOnlineMirrorProfile(store, user, onlineProfile);

  const after = (nextStore.profiles || []).find((p: any) => String(p?.id || "") === `online:${user.id}`) || null;
  const created = after && !beforeIds.has(String(after.id)) ? (after as any as Profile) : null;

  // On force aussi selfStatus -> online si besoin (comme avant)
  const finalStore: Store = {
    ...(nextStore as any),
    selfStatus:
      (nextStore as any).selfStatus === "online" || (nextStore as any).selfStatus === "away"
        ? (nextStore as any).selfStatus
        : ("online" as any),
  };

  return { store: finalStore, createdProfile: created };
}
