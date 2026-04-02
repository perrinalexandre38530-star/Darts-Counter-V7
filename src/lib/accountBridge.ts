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
  // ✅ IMPORTANT: ne JAMAIS écraser un profil local déjà renseigné.
  // Sinon, au reboot on se retrouve avec le dernier avatar online partout.
  if (onlineProfile) {
    merged.name = merged.name || onlineProfile?.nickname || merged.name;
    merged.avatarUrl = merged.avatarUrl || onlineProfile?.avatarUrl || merged.avatarUrl;
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

  const buildPrivateInfo = (base: any = {}) => ({
    ...(base || {}),
    onlineUserId: uid,
    onlineEmail: email || base?.onlineEmail || "",
    nickname:
      base?.nickname ||
      onlineProfile?.surname ||
      onlineProfile?.nickname ||
      onlineProfile?.displayName ||
      "",
    firstName: base?.firstName || onlineProfile?.firstName || "",
    lastName: base?.lastName || onlineProfile?.lastName || "",
    birthDate: base?.birthDate || onlineProfile?.birthDate || null,
    city: base?.city || onlineProfile?.city || "",
    country: base?.country || onlineProfile?.country || "",
    email: base?.email || user?.email || "",
    phone: base?.phone || onlineProfile?.phone || "",
    appLang: base?.appLang ?? onlineProfile?.privateInfo?.appLang ?? onlineProfile?.preferences?.appLang,
    appTheme: base?.appTheme ?? onlineProfile?.privateInfo?.appTheme ?? onlineProfile?.preferences?.appTheme,
    favX01: base?.favX01 ?? onlineProfile?.privateInfo?.favX01 ?? onlineProfile?.preferences?.favX01,
    favDoubleOut: base?.favDoubleOut ?? onlineProfile?.privateInfo?.favDoubleOut ?? onlineProfile?.preferences?.favDoubleOut,
    ttsVoice: base?.ttsVoice ?? onlineProfile?.privateInfo?.ttsVoice ?? onlineProfile?.preferences?.ttsVoice,
    sfxVolume: base?.sfxVolume ?? onlineProfile?.privateInfo?.sfxVolume ?? onlineProfile?.preferences?.sfxVolume,
    password: "",
  });

  const enrichProfile = (prof: any) => {
    const pi = readPrivateInfo(prof);
    const nickname = String(
      pi?.nickname ||
      onlineProfile?.surname ||
      onlineProfile?.nickname ||
      onlineProfile?.displayName ||
      prof?.name ||
      (email ? email.split("@")[0] : "Joueur")
    ).trim();
    const avatar = prof?.avatarUrl || prof?.avatarDataUrl || onlineProfile?.avatarUrl || onlineProfile?.avatarDataUrl || undefined;
    return writePrivateInfo(
      {
        ...(prof || {}),
        id: String(prof?.id || uid),
        name: nickname || prof?.name || "Joueur",
        avatarUrl: avatar,
        avatarDataUrl: prof?.avatarDataUrl || onlineProfile?.avatarDataUrl || undefined,
        country: prof?.country || onlineProfile?.country || "FR",
        updatedAt: Date.now(),
      },
      buildPrivateInfo(pi)
    );
  };

  // If we already have BOTH (dup), keep most complete, drop the other.
  if (byPI && byId && String(byPI.id) !== String(byId.id)) {
    const keep = scoreProfileCompleteness(byPI) >= scoreProfileCompleteness(byId) ? byPI : byId;
    const drop = keep === byPI ? byId : byPI;
    const keepLinked = enrichProfile(keep);
    const nextProfiles = profiles
      .filter((p) => String(p?.id || "") !== String(drop?.id || ""))
      .map((p) => (String(p?.id || "") === String(keep?.id || "") ? keepLinked : p));
    return { ...store, profiles: nextProfiles, activeProfileId: String(keepLinked?.id || activeId || uid) };
  }

  // Prefer an already linked profile.
  if (byPI) {
    const next = enrichProfile(byPI);
    const nextProfiles = profiles.map((p) => (String(p?.id || "") === String(byPI?.id || "") ? next : p));
    return { ...store, profiles: nextProfiles, activeProfileId: String(next?.id || activeId || uid) };
  }

  // If a dedicated uid profile already exists, enrich it and make it active.
  if (byId) {
    const next = enrichProfile(byId);
    const nextProfiles = profiles.map((p) => (String(p?.id || "") === String(byId?.id || "") ? next : p));
    return { ...store, profiles: nextProfiles, activeProfileId: uid };
  }

  // No profiles at all: create minimal uid profile.
  if (profiles.length === 0) {
    const nickname = String(
      onlineProfile?.surname || onlineProfile?.nickname || onlineProfile?.displayName || (email ? email.split("@")[0] : "Joueur")
    ).trim();
    const newProfile: any = writePrivateInfo(
      {
        id: uid,
        name: nickname || "Joueur",
        avatarDataUrl: onlineProfile?.avatarDataUrl || onlineProfile?.avatarUrl || undefined,
        avatarUrl: onlineProfile?.avatarUrl || onlineProfile?.avatarDataUrl || undefined,
        country: onlineProfile?.country || "FR",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      buildPrivateInfo({})
    );

    return {
      ...store,
      profiles: [newProfile],
      activeProfileId: uid,
    };
  }

  // IMPORTANT: if there are local profiles but none linked to this account,
  // create a dedicated account profile instead of hijacking the current active local profile.
  const nickname = String(
    onlineProfile?.surname || onlineProfile?.nickname || onlineProfile?.displayName || (email ? email.split("@")[0] : "Joueur")
  ).trim();

  const dedicatedProfile: any = writePrivateInfo(
    {
      id: uid,
      name: nickname || "Joueur",
      avatarDataUrl: onlineProfile?.avatarDataUrl || undefined,
      avatarUrl: onlineProfile?.avatarUrl || onlineProfile?.avatarDataUrl || undefined,
      country: onlineProfile?.country || "FR",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    buildPrivateInfo({})
  );

  return {
    ...store,
    profiles: [...profiles, dedicatedProfile],
    activeProfileId: uid,
  };
}

