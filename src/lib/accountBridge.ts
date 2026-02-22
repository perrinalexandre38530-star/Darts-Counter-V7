// ============================================
// src/lib/accountBridge.ts
// Pont COMPTE ONLINE ↔ PROFIL LOCAL ACTIF
//
// ✅ V7 FINAL — COMPTE UNIQUE (FIX DUPLICATE UID PROFILE)
// - ❌ SUPPRIME le concept de "mirror profile" online:<uid>
// - ✅ Un seul profil local actif, lié à Supabase via privateInfo.onlineUserId / onlineEmail
// - ✅ Anti-duplication: si un profil id==uid existe déjà mais qu'un profil actif/local
//   est plus riche, on LIE le profil actif au uid et on SUPPRIME le profil id==uid.
// ============================================

import type { Profile } from "./types";

// ------------------------------------------------------------
// Helpers privateInfo
// ------------------------------------------------------------
type PrivateInfoRaw = {
  onlineUserId?: string;
  onlineEmail?: string;
  onlineKey?: string; // legacy (email hash)
  password?: string; // legacy (doit rester vide)
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

function scoreProfileCompleteness(p: any): number {
  let s = 0;
  const keys = ["name", "country", "avatarUrl", "avatarDataUrl", "surname", "firstName", "birthDate", "city", "phone"];
  for (const k of keys) if (p?.[k]) s += 1;

  const pi = readPrivateInfo(p);
  const pik = ["nickname", "firstName", "lastName", "birthDate", "city", "phone", "country"];
  for (const k of pik) if ((pi as any)?.[k]) s += 1;
  return s;
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
// ✅ Auto-link a local profile for a signed-in user (NO DUPLICATE)
// ============================================================
export function ensureLocalProfileForOnlineUser(store: any, user: any, onlineProfile?: any) {
  if (!store || !user?.id) return store;

  const uid = String(user.id);
  const email = safeLower(user.email);

  const profiles: any[] = Array.isArray(store.profiles) ? store.profiles : [];

  const activeId = String(store.activeProfileId || profiles[0]?.id || "");
  const active = profiles.find((p) => String(p?.id || "") === activeId) || profiles[0] || null;

  const byPI = profiles.find((p) => String(readPrivateInfo(p)?.onlineUserId || "") === uid) || null;
  const byId = profiles.find((p) => String(p?.id || "") === uid) || null;

  // If we already have BOTH (dup), keep most complete, drop the other.
  if (byPI && byId && String(byPI.id) !== String(byId.id)) {
    const keep = scoreProfileCompleteness(byPI) >= scoreProfileCompleteness(byId) ? byPI : byId;
    const drop = keep === byPI ? byId : byPI;

    const piKeep = readPrivateInfo(keep);
    const keepLinked = writePrivateInfo(
      {
        ...keep,
        ...(onlineProfile
          ? {
              name: onlineProfile?.nickname || keep?.name,
              avatarUrl: onlineProfile?.avatarUrl || keep?.avatarUrl,
              country: onlineProfile?.country || keep?.country,
            }
          : null),
      },
      {
        ...piKeep,
        onlineUserId: uid,
        onlineEmail: email || piKeep.onlineEmail || "",
        password: "",
      }
    );

    const nextProfiles = profiles
      .filter((p) => String(p?.id || "") !== String(drop?.id || ""))
      .map((p) => (String(p?.id || "") === String(keep?.id || "") ? keepLinked : p));

    return { ...store, profiles: nextProfiles, activeProfileId: String(keepLinked?.id || activeId) };
  }

  // Prefer profile linked via privateInfo
  if (byPI) {
    const pi = readPrivateInfo(byPI);
    const next = writePrivateInfo(
      {
        ...byPI,
        ...(onlineProfile
          ? {
              name: onlineProfile?.nickname || byPI?.name,
              avatarUrl: onlineProfile?.avatarUrl || byPI?.avatarUrl,
              country: onlineProfile?.country || byPI?.country,
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

    const nextProfiles = profiles.map((p) => (String(p?.id || "") === String(byPI?.id || "") ? next : p));
    return { ...store, profiles: nextProfiles, activeProfileId: String(next?.id || activeId) };
  }

  // If only id==uid exists but active is different -> link active and remove uid-profile
  if (byId && active && String(active?.id || "") !== uid) {
    const piA = readPrivateInfo(active);
    const activeLinked = writePrivateInfo(
      {
        ...active,
        ...(onlineProfile
          ? {
              name: onlineProfile?.nickname || active?.name,
              avatarUrl: onlineProfile?.avatarUrl || active?.avatarUrl,
              country: onlineProfile?.country || active?.country,
            }
          : null),
      },
      {
        ...piA,
        onlineUserId: uid,
        onlineEmail: email || piA.onlineEmail || "",
        password: "",
      }
    );

    const nextProfiles = profiles
      .filter((p) => String(p?.id || "") !== uid)
      .map((p) => (String(p?.id || "") === String(active?.id || "") ? activeLinked : p));

    return { ...store, profiles: nextProfiles, activeProfileId: String(activeLinked?.id || activeId) };
  }

  // No profiles at all: create minimal uid profile
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
      privateInfo: {
        onlineUserId: uid,
        onlineEmail: email || "",
        password: "",
      },
    };

    return {
      ...store,
      profiles: [newProfile],
      activeProfileId: uid,
    };
  }

  // Default: link the ACTIVE profile (no creation)
  if (active) {
    const piA = readPrivateInfo(active);
    const activeLinked = writePrivateInfo(
      {
        ...active,
        ...(onlineProfile
          ? {
              name: onlineProfile?.nickname || active?.name,
              avatarUrl: onlineProfile?.avatarUrl || active?.avatarUrl,
              country: onlineProfile?.country || active?.country,
            }
          : null),
      },
      {
        ...piA,
        onlineUserId: uid,
        onlineEmail: email || piA.onlineEmail || "",
        password: "",
      }
    );

    const nextProfiles = profiles.map((p) => (String(p?.id || "") === String(active?.id || "") ? activeLinked : p));
    return { ...store, profiles: nextProfiles, activeProfileId: String(activeLinked?.id || activeId) };
  }

  return store;
}
