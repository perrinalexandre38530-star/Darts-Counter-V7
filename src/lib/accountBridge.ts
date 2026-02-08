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

  // ✅ V7 "ACCOUNT CORE CLEAN":
  // Un compte Supabase = un profil local stable = id === uid.
  // On NE lie PAS un profil local existant "au hasard" (différent selon l'appareil),
  // sinon on obtient exactement le bug que tu décris (2 appareils -> 2 profils différents).
  //
  // Règle:
  // - Si un profil id==uid existe: on l'actualise (nom/avatar/pays + privateInfo) et on le rend actif.
  // - Sinon: on crée un profil id==uid en plus des profils locaux existants.

  const existing = profiles.find((p) => String(p?.id || "") === uid);

  const nickname = String(onlineProfile?.nickname || "").trim();
  const fallbackName = nickname || (email ? email.split("@")[0] : "Joueur");

  const baseProfile: any = existing
    ? { ...existing }
    : {
        id: uid,
        name: fallbackName,
        avatarDataUrl: onlineProfile?.avatarUrl || undefined,
        avatarUrl: onlineProfile?.avatarUrl || undefined,
        country: onlineProfile?.country || "FR",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

  // sync visuel depuis Supabase (si dispo)
  if (onlineProfile) {
    baseProfile.name = onlineProfile?.nickname || baseProfile.name || fallbackName;
    baseProfile.avatarUrl = onlineProfile?.avatarUrl || baseProfile.avatarUrl;
    baseProfile.country = onlineProfile?.country || baseProfile.country;
  } else {
    baseProfile.name = baseProfile.name || fallbackName;
  }

  const pi = readPrivateInfo(baseProfile);
  baseProfile.privateInfo = {
    ...pi,
    onlineUserId: uid,
    onlineEmail: email || pi.onlineEmail || "",
    password: "",
  };
  baseProfile.updatedAt = Date.now();

  const nextProfiles = existing
    ? profiles.map((p) => (String(p?.id || "") === uid ? baseProfile : p))
    : [baseProfile, ...profiles];

  return {
    ...store,
    profiles: nextProfiles,
    activeProfileId: uid,
  };
}
