// ============================================
// src/lib/accountBridge.ts
// Pont COMPTE ONLINE ↔ PROFIL LOCAL ACTIF
// ✅ V6 FIX: Online mirror profile (anti-duplication)
// - 1 seul profil local lié au compte Supabase
// - ID stable: online:<user.id>
// - Nettoie les doublons déjà présents dans le store (cloud ou local)
// - Force store.activeProfileId sur ce mirror
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

/* ============================================================
   ✅ Online mirror profile (anti-duplication)
   - ID stable: online:<user.id>
   - Nettoyage doublons + migration douce
============================================================ */
export function ensureOnlineMirrorProfile(store: any, user: any, onlineProfile?: any) {
  if (!store || !user?.id) return store;

  const mirrorId = `online:${user.id}`;
  const email = (user.email || "").toLowerCase();

  const profiles: any[] = Array.isArray(store.profiles) ? store.profiles : [];

  const isSameAccount = (p: any) => {
    const pi = p?.privateInfo || {};
    const pid = String(p?.id || "");
    const piUid = String(pi?.onlineUserId || "");
    const piEmail = String(pi?.onlineEmail || "").toLowerCase();
    return pid === mirrorId || (piUid && piUid === user.id) || (!!email && piEmail === email);
  };

  const matches = profiles.filter(isSameAccount);
  let primary = matches.find((p) => p?.id === mirrorId) || matches[0];

  // 1) Si aucun -> création UNE FOIS
  if (!primary) {
    const now = Date.now();
    const name = onlineProfile?.nickname || user.email || "Player";
    const mirror = {
      id: mirrorId,
      name,
      createdAt: now,
      updatedAt: now,
      avatarUrl: onlineProfile?.avatarUrl || "",
      country: onlineProfile?.country || "",
      privateInfo: { onlineUserId: user.id, onlineEmail: email || user.email || "" },
      isOnlineMirror: true,
    };

    return {
      ...store,
      profiles: [...profiles, mirror],
      activeProfileId: mirrorId,
    };
  }

  // 2) Migration douce : force l'ID stable sur le primaire
  if (primary.id !== mirrorId) {
    primary = { ...primary, id: mirrorId };
  }

  // 3) Update léger du primaire (sans toucher aux autres)
  const updatedPrimary = {
    ...primary,
    name: onlineProfile?.nickname || primary.name,
    avatarUrl: onlineProfile?.avatarUrl || primary.avatarUrl,
    country: onlineProfile?.country || primary.country,
    privateInfo: {
      ...(primary.privateInfo || {}),
      onlineUserId: user.id,
      onlineEmail: email || user.email || "",
    },
    isOnlineMirror: true,
    updatedAt: Date.now(),
  };

  // 4) Nettoyage doublons : on garde 1 seul profil lié au compte
  const cleaned = profiles
    .filter((p) => !isSameAccount(p) || String(p.id) === mirrorId)
    .map((p) => (String(p.id) === mirrorId ? updatedPrimary : p));

  return {
    ...store,
    profiles: cleaned,
    activeProfileId: mirrorId,
  };
}

/**
 * Lie l'identité online à un profil local :
 * ✅ V6: utilise le mirror stable online:<user.id> + nettoyage doublons
 *
 * Retourne le nouveau store + éventuellement le profil créé (mirror) si besoin.
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

  const user = identity.user as any;
  const onlineProfile = (identity.profile || null) as any;

  const beforeIds = new Set((store.profiles || []).map((p) => String((p as any)?.id || "")));

  // ✅ applique mirror + cleanup
  const mirrored = ensureOnlineMirrorProfile(store as any, user, onlineProfile) as Store;

  // On déduit si le profil mirror a été créé (best-effort)
  const afterIds = new Set((mirrored.profiles || []).map((p) => String((p as any)?.id || "")));
  const mirrorId = `online:${user.id}`;
  const created =
    !beforeIds.has(mirrorId) && afterIds.has(mirrorId)
      ? ((mirrored.profiles || []).find((p) => String((p as any).id) === mirrorId) as Profile) || null
      : null;

  const nextStore: Store = {
    ...mirrored,
    // Si l'utilisateur est connecté et qu'aucun statut n'est défini,
    // on force "online" (mais on ne touche pas à "away" manuellement choisi).
    selfStatus:
      mirrored.selfStatus === "online" || mirrored.selfStatus === "away"
        ? mirrored.selfStatus
        : "online",
  };

  return { store: nextStore, createdProfile: created };
}
