// ============================================
// src/lib/accountBridge.ts
// Pont COMPTE ONLINE ↔ PROFIL LOCAL ACTIF
// - Garantit qu'un compte online est toujours lié à
//   un profil local unique dans store.profiles
// - Met à jour store.activeProfileId en conséquence
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
 * Lie l'identité online à un profil local :
 * - cherche d'abord par onlineUserId
 * - puis par email
 * - puis par displayName / nickname
 * - sinon crée un nouveau profil local minimal
 *
 * Retourne le nouveau store + éventuellement le profil créé.
 */
export function linkOnlineIdentityToLocalProfile(
  identity: OnlineIdentity | null,
  store: Store
): { store: Store; createdProfile: Profile | null } {
  // Pas d'utilisateur online => on ne touche pas aux profils ici.
  // (Le logout complet est géré ailleurs.)
  if (!identity || !identity.user) {
    return { store, createdProfile: null };
  }

  const user = identity.user;
  const onlineProfile = identity.profile || null;

  const email = (user.email || "").trim().toLowerCase();
  const displayName =
    onlineProfile?.displayName?.trim() ||
    user.nickname?.trim() ||
    email ||
    "Joueur";

  const profiles = store.profiles || [];

  // 1) Recherche par onlineUserId (liage déjà existant)
  let match: Profile | undefined = profiles.find((p) => {
    const pi = getPrivateInfo(p);
    return !!pi.onlineUserId && pi.onlineUserId === user.id;
  });

  // 2) Sinon, recherche par email
  if (!match && email) {
    match = profiles.find((p) => {
      const pi = getPrivateInfo(p);
      const pe = (pi.email || "").trim().toLowerCase();
      return pe && pe === email;
    });
  }

  // 3) Sinon, recherche par nom affiché
  if (!match && displayName) {
    match = profiles.find((p) => (p.name || "").trim() === displayName);
  }

  let nextProfiles = profiles;
  let createdProfile: Profile | null = null;
  let activeProfileId = store.activeProfileId || null;

  if (!match) {
    // 4) Aucun profil ne correspond -> on en crée un nouveau minimal
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `online-${user.id}-${Date.now()}`;

    const pi: PrivateInfoRaw = {
      email: email || undefined,
      onlineUserId: user.id,
    };

    const newProfile: Profile = withPrivateInfo(
      {
        id,
        name: displayName,
        avatarDataUrl: undefined,
      } as Profile,
      pi
    );

    nextProfiles = [...profiles, newProfile];
    createdProfile = newProfile;
    activeProfileId = id;
  } else {
    // 5) Profil trouvé -> on s'assure que privateInfo est bien aligné
    const matchId = match.id;
    nextProfiles = profiles.map((p) => {
      if (p.id !== matchId) return p;
      const pi = { ...getPrivateInfo(p) };
      let changed = false;

      if (pi.onlineUserId !== user.id) {
        pi.onlineUserId = user.id;
        changed = true;
      }

      if (email && (pi.email || "").trim().toLowerCase() !== email) {
        pi.email = email;
        changed = true;
      }

      return changed ? withPrivateInfo(p, pi) : p;
    });

    if (!activeProfileId || activeProfileId !== matchId) {
      activeProfileId = matchId;
    }
  }

  const nextStore: Store = {
    ...store,
    profiles: nextProfiles,
    activeProfileId,
    // Si l'utilisateur est connecté et qu'aucun statut n'est défini,
    // on force "online" (mais on ne touche pas à "away" manuellement choisi).
    selfStatus:
      store.selfStatus === "online" || store.selfStatus === "away"
        ? store.selfStatus
        : "online",
  };

  return { store: nextStore, createdProfile };
}
