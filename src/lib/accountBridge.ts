// ============================================
// src/lib/accountBridge.ts
// Pont COMPTE ONLINE ↔ PROFIL LOCAL ACTIF
//
// ✅ V7 FINAL — COMPTE UNIQUE (FIX DUPLICATE UID PROFILE)
// - ❌ SUPPRIME le concept de "mirror profile" online:<uid>
// - ✅ Un seul profil local actif, lié à Supabase via privateInfo.onlineUserId / onlineEmail
// - ✅ Anti-duplication: si un profil id==uid existe déjà mais qu'un profil actif/local
//   est plus riche, on LIE le profil actif au uid et on SUPPRIME le profil id==uid.
//
// ✅ PATCH NAS/AUDIT
// - on attend maintenant que le cloud ait fini d’hydrater avant d’appeler ce bridge (App.tsx)
// - on évite de détourner un profil local arbitraire pour le compte connecté
// - si nécessaire, on crée un profil compte dédié `id === uid`
// - on conserve les profils locaux et on réinjecte les infos online sur le profil compte
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
  return String(s || "").trim().toLowerCase();
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

function getOnlineNickname(user: any, onlineProfile?: any): string {
  const email = safeLower(user?.email);
  return String(
    onlineProfile?.surname ||
      onlineProfile?.nickname ||
      onlineProfile?.displayName ||
      onlineProfile?.display_name ||
      user?.nickname ||
      (email ? email.split("@")[0] : "Joueur") ||
      "Joueur"
  ).trim();
}

function getOnlineAvatar(onlineProfile?: any): string | undefined {
  const avatar =
    onlineProfile?.avatarDataUrl ||
    onlineProfile?.avatar_data_url ||
    onlineProfile?.avatarUrl ||
    onlineProfile?.avatar_url ||
    onlineProfile?.avatar ||
    "";
  const out = String(avatar || "").trim();
  return out || undefined;
}

function buildPrivateInfoPatch(user: any, onlineProfile?: any): PrivateInfoRaw {
  const email = safeLower(user?.email);
  const prefs = (onlineProfile as any)?.preferences || {};
  const pi = ((onlineProfile as any)?.privateInfo || (onlineProfile as any)?.private_info || {}) as Record<string, any>;

  return {
    ...pi,
    onlineUserId: String(user?.id || ""),
    onlineEmail: email || String(pi?.onlineEmail || pi?.email || "").trim().toLowerCase(),
    nickname: getOnlineNickname(user, onlineProfile) || pi?.nickname || "",
    firstName: onlineProfile?.firstName ?? onlineProfile?.first_name ?? pi?.firstName ?? "",
    lastName: onlineProfile?.lastName ?? onlineProfile?.last_name ?? pi?.lastName ?? "",
    birthDate: onlineProfile?.birthDate ?? onlineProfile?.birth_date ?? pi?.birthDate ?? "",
    city: onlineProfile?.city ?? pi?.city ?? "",
    country: onlineProfile?.country ?? pi?.country ?? "",
    email: onlineProfile?.email ?? user?.email ?? pi?.email ?? "",
    phone: onlineProfile?.phone ?? pi?.phone ?? "",
    appLang: prefs?.appLang ?? pi?.appLang,
    appTheme: prefs?.appTheme ?? pi?.appTheme,
    favX01: prefs?.favX01 ?? pi?.favX01,
    favDoubleOut: prefs?.favDoubleOut ?? pi?.favDoubleOut,
    ttsVoice: prefs?.ttsVoice ?? pi?.ttsVoice,
    sfxVolume: prefs?.sfxVolume ?? pi?.sfxVolume,
    // sécurité: ne jamais persister password
    password: "",
  };
}

function stripOnlineBinding(p: any): any {
  const pi = { ...readPrivateInfo(p) };
  delete (pi as any).onlineUserId;
  delete (pi as any).onlineEmail;
  return writePrivateInfo(p, { ...pi, password: "" });
}

function buildDedicatedAccountProfile(user: any, onlineProfile?: any, previous?: any): any {
  const uid = String(user?.id || "");
  const nickname = getOnlineNickname(user, onlineProfile);
  const avatar = getOnlineAvatar(onlineProfile);
  const prevPI = readPrivateInfo(previous);
  const nextPI = {
    ...prevPI,
    ...buildPrivateInfoPatch(user, onlineProfile),
  };

  return writePrivateInfo(
    {
      ...(previous || {}),
      id: uid,
      name: nickname || previous?.name || "Joueur",
      surname: onlineProfile?.surname ?? previous?.surname ?? nickname ?? "",
      firstName: onlineProfile?.firstName ?? onlineProfile?.first_name ?? previous?.firstName ?? prevPI?.firstName ?? "",
      lastName: onlineProfile?.lastName ?? onlineProfile?.last_name ?? previous?.lastName ?? prevPI?.lastName ?? "",
      birthDate: onlineProfile?.birthDate ?? onlineProfile?.birth_date ?? previous?.birthDate ?? prevPI?.birthDate ?? "",
      city: onlineProfile?.city ?? previous?.city ?? prevPI?.city ?? "",
      phone: onlineProfile?.phone ?? previous?.phone ?? prevPI?.phone ?? "",
      country: onlineProfile?.country || previous?.country || prevPI?.country || "FR",
      avatarDataUrl: avatar || previous?.avatarDataUrl || previous?.avatarUrl,
      avatarUrl: avatar || previous?.avatarUrl || previous?.avatarDataUrl,
      createdAt: previous?.createdAt || Date.now(),
      updatedAt: Date.now(),
      stats: {
        ...(previous?.stats || {}),
        ...(onlineProfile?.stats || {}),
      },
    },
    nextPI
  );
}

/**
 * ✅ Assure la liaison COMPTE ONLINE ↔ PROFIL LOCAL (SANS mirror)
 *
 * Règles :
 * - Le profil actif local reste la source UI tant qu’aucun profil compte dédié n’existe
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
  // ✅ IMPORTANT: ne JAMAIS écraser un profil local déjà renseigné.
  // Sinon, au reboot on se retrouve avec le dernier avatar online partout.
  if (onlineProfile) {
    merged.name = merged.name || getOnlineNickname(user, onlineProfile) || merged.name;
    merged.avatarUrl = merged.avatarUrl || getOnlineAvatar(onlineProfile) || merged.avatarUrl;
    merged.country = merged.country || onlineProfile?.country || merged.country;
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

  // 3) Écrire liaison online dans privateInfo
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

  // If we already have BOTH (dup), keep the dedicated id==uid profile for the account
  // and strip the binding from the local profile so it remains a true local profile.
  if (byPI && byId && String(byPI.id) !== String(byId.id)) {
    const keep = buildDedicatedAccountProfile(user, onlineProfile, byId);
    const nextProfiles = profiles.map((p) => {
      const pid = String(p?.id || "");
      if (pid === String(byId?.id || "")) return keep;
      if (pid === String(byPI?.id || "")) return stripOnlineBinding(p);
      return p;
    });
    return { ...store, profiles: nextProfiles, activeProfileId: String(keep?.id || activeId) };
  }

  // Prefer profile linked via privateInfo — but if it is not the dedicated uid profile,
  // create the dedicated account profile and keep the linked one as a normal local profile.
  if (byPI) {
    if (String(byPI?.id || "") !== uid) {
      const accountProfile = buildDedicatedAccountProfile(user, onlineProfile, byId || undefined);
      const nextProfiles = [
        ...profiles.map((p) => (String(p?.id || "") === String(byPI?.id || "") ? stripOnlineBinding(p) : p)).filter(Boolean),
      ];
      const already = nextProfiles.findIndex((p) => String(p?.id || "") === uid);
      if (already >= 0) nextProfiles[already] = accountProfile;
      else nextProfiles.push(accountProfile);
      return { ...store, profiles: nextProfiles, activeProfileId: uid };
    }

    const pi = readPrivateInfo(byPI);
    const next = writePrivateInfo(
      {
        ...byPI,
        name: getOnlineNickname(user, onlineProfile) || byPI?.name,
        surname: onlineProfile?.surname ?? byPI?.surname,
        firstName: onlineProfile?.firstName ?? onlineProfile?.first_name ?? byPI?.firstName,
        lastName: onlineProfile?.lastName ?? onlineProfile?.last_name ?? byPI?.lastName,
        birthDate: onlineProfile?.birthDate ?? onlineProfile?.birth_date ?? byPI?.birthDate,
        city: onlineProfile?.city ?? byPI?.city,
        phone: onlineProfile?.phone ?? byPI?.phone,
        avatarDataUrl: getOnlineAvatar(onlineProfile) || byPI?.avatarDataUrl || byPI?.avatarUrl,
        avatarUrl: getOnlineAvatar(onlineProfile) || byPI?.avatarUrl || byPI?.avatarDataUrl,
        country: onlineProfile?.country || byPI?.country,
        updatedAt: Date.now(),
      },
      {
        ...pi,
        ...buildPrivateInfoPatch(user, onlineProfile),
        onlineUserId: uid,
        onlineEmail: email || pi.onlineEmail || "",
        password: "",
      }
    );

    const nextProfiles = profiles.map((p) => (String(p?.id || "") === String(byPI?.id || "") ? next : p));
    return { ...store, profiles: nextProfiles, activeProfileId: String(next?.id || activeId) };
  }

  // If only id==uid exists, refresh it from online and keep all locals intact.
  if (byId) {
    const next = buildDedicatedAccountProfile(user, onlineProfile, byId);
    const nextProfiles = profiles.map((p) => (String(p?.id || "") === uid ? next : p));
    return { ...store, profiles: nextProfiles, activeProfileId: String(next?.id || activeId || uid) };
  }

  // No profiles at all: create minimal uid profile
  if (profiles.length === 0) {
    const newProfile: any = buildDedicatedAccountProfile(user, onlineProfile, undefined);

    return {
      ...store,
      profiles: [newProfile],
      activeProfileId: uid,
    };
  }

  // Default: DO NOT hijack the active local profile anymore.
  // Create a dedicated account profile id==uid and keep locals unchanged.
  const dedicated = buildDedicatedAccountProfile(user, onlineProfile, undefined);
  return {
    ...store,
    profiles: [...profiles, dedicated],
    activeProfileId: uid,
  };
}
