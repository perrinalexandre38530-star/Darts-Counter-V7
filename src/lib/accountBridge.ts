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

// ============================================================
// ✅ Public helper
// Un "mirror" online (profil lié au compte Supabase) ne doit JAMAIS
// apparaître dans la liste "Profils locaux".
// ============================================================
export function isOnlineMirrorProfile(p: any): boolean {
  const id = String(p?.id || "");
  if (id.startsWith("online:")) return true;
  if ((p as any)?.isOnlineMirror) return true;
  const pi = (p as any)?.privateInfo || {};
  if (String(pi?.onlineUserId || "")) return true;
  return false;
}

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
export function ensureOnlineMirrorProfile(
  store: Store,
  userId: string,
  onlineProfile?: Partial<Profile> & { email?: string; displayName?: string | null },
  userEmail?: string | null
): Store {
  const mirrorId = `online:${userId}`;

  // --- Detect mirror candidates to purge (old buggy clones)
  // We only purge profiles that are clearly tied to this online account.
  const isMirrorCandidate = (p: Profile) => {
    if (!p) return false;

    // Any "online:*" that's not the correct mirror id
    if (p.id?.startsWith("online:") && p.id !== mirrorId) return true;

    const pi: any = (p as any).privateInfo || {};
    const onlineUserId = pi.onlineUserId || pi.user_id || pi.supabaseUserId;
    const onlineEmail = pi.onlineEmail || pi.email;

    if (onlineUserId && onlineUserId === userId) return p.id !== mirrorId;

    if (userEmail && onlineEmail && String(onlineEmail).toLowerCase() === String(userEmail).toLowerCase()) {
      // if it's not the real mirrorId, it's an old clone
      return p.id !== mirrorId;
    }

    return false;
  };

  const profiles = Array.isArray(store.profiles) ? store.profiles : [];
  const kept: Profile[] = [];
  let hadMirror = false;

  for (const p of profiles) {
    if (!p) continue;
    if (p.id === mirrorId) {
      kept.push(p);
      hadMirror = true;
      continue;
    }
    if (isMirrorCandidate(p)) continue;
    kept.push(p);
  }

  // Build / refresh mirror profile
  const displayName =
    (onlineProfile as any)?.displayName ||
    (onlineProfile as any)?.nickname ||
    (onlineProfile as any)?.name ||
    userEmail ||
    "Online";

  const mirrorBase: Profile = {
    id: mirrorId,
    name: String(displayName || "Online"),
    country: (onlineProfile as any)?.country || "",
    city: (onlineProfile as any)?.city || "",
    // For online profile we keep avatarUrl (public URL), never dataUrl
    avatarUrl: (onlineProfile as any)?.avatar_url || (onlineProfile as any)?.avatarUrl || "",
    avatarDataUrl: undefined,
    createdAt: (onlineProfile as any)?.createdAt || Date.now(),
    updatedAt: Date.now(),
    // Do NOT attach any local stats here (mirror is just a view of the account)
    stats: (onlineProfile as any)?.stats,
    privateInfo: {
      ...(hadMirror ? ((kept.find((p) => p.id === mirrorId) as any)?.privateInfo || {}) : {}),
      onlineUserId: userId,
      onlineEmail: userEmail || undefined,
      isOnlineMirror: true,
    },
  } as any;

  if (!hadMirror) kept.unshift(mirrorBase);
  else {
    // merge update into existing mirror without losing local-only fields (if any)
    const idx = kept.findIndex((p) => p.id === mirrorId);
    if (idx >= 0) {
      kept[idx] = {
        ...(kept[idx] as any),
        ...mirrorBase,
        privateInfo: { ...(kept[idx] as any).privateInfo, ...(mirrorBase as any).privateInfo },
      } as any;
    }
  }

  // Keep activeProfileId stable; if it points to a purged mirror clone, redirect to real mirror.
  const activeWasPurged =
    store.activeProfileId &&
    profiles.some((p) => p?.id === store.activeProfileId) &&
    !kept.some((p) => p.id === store.activeProfileId);

  const nextActiveProfileId = activeWasPurged ? mirrorId : store.activeProfileId || mirrorId;

  return {
    ...store,
    profiles: kept,
    activeProfileId: nextActiveProfileId,
  };
}
