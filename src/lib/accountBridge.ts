// ============================================
// src/lib/accountBridge.ts
// Pont COMPTE ONLINE ↔ PROFIL LOCAL ACTIF
//
// ✅ V7 FINAL — COMPTE UNIQUE
// - ❌ SUPPRIME le concept de "mirror profile" online:<uid>
// - ✅ Un seul profil local actif, lié à Supabase via privateInfo.onlineUserId / onlineEmail
// - ✅ Migration douce: si un ancien profil "online:<uid>" existe, on le fusionne dans le profil actif
// ============================================

import type { Profile } from "./types";

// ------------------------------------------------------------
// Helpers privateInfo
// ------------------------------------------------------------
type PrivateInfoRaw = {
  onlineUserId?: string;
  onlineEmail?: string;
  onlineKey?: string; // legacy (email hash)
  password?: string;  // legacy (doit rester vide)
  [k: string]: any;
};

function readPrivateInfo(p: any): PrivateInfoRaw {
  return ((p as any)?.privateInfo || {}) as PrivateInfoRaw;
}

function writePrivateInfo(p: any, pi: PrivateInfoRaw): any {
  return { ...(p || {}), privateInfo: pi };
}

function safeLower(s: any): string {
  return String(s || "").toLowerCase();
}

/**
 * ✅ Assure la liaison COMPTE ONLINE ↔ PROFIL LOCAL (SANS mirror)
 *
 * Règles :
 * - Le profil actif local reste la source UI (id local)
 * - On écrit `privateInfo.onlineUserId = user.id`
 * - Si un ancien profil `online:<uid>` existe, on fusionne ses infos (name/avatar/country/privateInfo) puis on le supprime
 */
export function ensureOnlineMirrorProfile(store: any, user: any, onlineProfile?: any) {
  if (!store || !user?.id) return store;

  const uid = String(user.id);
  const email = safeLower(user.email);

  const profiles: any[] = Array.isArray(store.profiles) ? store.profiles : [];
  if (profiles.length === 0) return store;

  const activeId = String(store.activeProfileId || profiles[0]?.id || "");
  if (!activeId) return store;

  const mirrorId = `online:${uid}`; // legacy id — on le supprime / migre si présent

  const byId = new Map<string, any>();
  for (const p of profiles) byId.set(String(p?.id || ""), p);

  const active = byId.get(activeId) || profiles[0];

  // 1) Lire un ancien mirror si présent
  const oldMirror = byId.get(mirrorId);

  // 2) Préparer fusion
  const merged: any = { ...active };

  // fusion "Mon profil" depuis onlineProfile
  if (onlineProfile) {
    merged.name = onlineProfile?.nickname || merged.name;
    merged.avatarUrl = onlineProfile?.avatarUrl || merged.avatarUrl;
    merged.country = onlineProfile?.country || merged.country;
  }

  // fusion depuis oldMirror (si existait)
  if (oldMirror) {
    merged.name = merged.name || oldMirror?.name;
    merged.avatarUrl = merged.avatarUrl || oldMirror?.avatarUrl;
    merged.country = merged.country || oldMirror?.country;

    const piActive = readPrivateInfo(merged);
    const piMirror = readPrivateInfo(oldMirror);
    merged.privateInfo = {
      ...piMirror,
      ...piActive,
    };
  }

  // 3) Écrire liaison Supabase dans privateInfo
  const pi = readPrivateInfo(merged);
  const nextPI: PrivateInfoRaw = {
    ...pi,
    onlineUserId: uid,
    onlineEmail: email || pi.onlineEmail || "",
    // sécurité: ne jamais persister password
    password: "",
  };
  const linked = writePrivateInfo(merged, nextPI);

  // 4) Rebuild profiles list en supprimant le mirror legacy
  const cleaned = profiles
    .filter((p) => String(p?.id || "") !== mirrorId)
    .map((p) => (String(p?.id || "") === String(active?.id || "") ? linked : p));

  return {
    ...store,
    profiles: cleaned,
    activeProfileId: String(active?.id || activeId),
  };
}

// ============================================================
// ✅ NEW: Auto-create / link a local profile for a signed-in user
//
// Problème réel constaté (mobile / nouvel utilisateur):
// - Session Supabase persistée OK
// - MAIS aucun profil local n'existe => l'app repasse par "Compte" et
//   l'utilisateur a l'impression de devoir se reconnecter à chaque démarrage.
//
// Stratégie:
// - Si un profil local est déjà lié au uid => on le rend actif.
// - Sinon, si aucun profil local n'existe => on crée un profil minimal id=uid.
// - Sinon, on lie le profil actif existant au uid (migration douce).
//
// Important: on ne crée PAS de mirror "online:<uid>".
export function ensureLocalProfileForOnlineUser(store: any, user: any, onlineProfile?: any) {
  if (!store || !user?.id) return store;

  const uid = String(user.id);
  const email = safeLower(user.email);

  const profiles: any[] = Array.isArray(store.profiles) ? store.profiles : [];

  // 1) Déjà lié ? (par privateInfo.onlineUserId ou par id==uid)
  const linked = profiles.find((p) => {
    const id = String(p?.id || "");
    if (id === uid) return true;
    const pi = readPrivateInfo(p);
    return String(pi?.onlineUserId || "") === uid;
  });

  if (linked) {
    // S'assure que le privateInfo est bien rempli
    const pi = readPrivateInfo(linked);
    const next = writePrivateInfo(
      {
        ...linked,
        ...(onlineProfile
          ? {
              name: onlineProfile?.nickname || linked?.name,
              avatarUrl: onlineProfile?.avatarUrl || linked?.avatarUrl,
              country: onlineProfile?.country || linked?.country,
            }
          : null),
      },
      {
        ...pi,
        onlineUserId: uid,
        onlineEmail: email || pi.onlineEmail || "",
        password: "",
      }
    );

    const nextProfiles = profiles.map((p) => (String(p?.id || "") === String(linked?.id || "") ? next : p));
    return { ...store, profiles: nextProfiles, activeProfileId: String(linked?.id || uid) };
  }

  // 2) Aucun profil local => on crée un profil minimal id=uid
  if (profiles.length === 0) {
    const nickname = String(onlineProfile?.nickname || "").trim();
    const fallbackName = nickname || (email ? email.split("@")[0] : "Joueur");
    const newProfile: any = {
      id: uid,
      name: fallbackName,
      avatarDataUrl: onlineProfile?.avatarUrl || undefined,
      avatarUrl: onlineProfile?.avatarUrl || undefined,
      country: onlineProfile?.country || "FR",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    newProfile.privateInfo = {
      onlineUserId: uid,
      onlineEmail: email || "",
      password: "",
    };

    return {
      ...store,
      profiles: [newProfile],
      activeProfileId: uid,
    };
  }

  // 3) Profils existants mais aucun lié: on lie le profil actif actuel
  const activeId = String(store.activeProfileId || profiles[0]?.id || "");
  const active = profiles.find((p) => String(p?.id || "") === activeId) || profiles[0];
  if (!active) return store;

  return ensureOnlineMirrorProfile(store, user, onlineProfile);
}
