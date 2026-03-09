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


function onlineDisplayNameOf(onlineProfile: any, email: string): string {
  return String(
    onlineProfile?.displayName ||
      onlineProfile?.display_name ||
      onlineProfile?.nickname ||
      onlineProfile?.username ||
      (email ? email.split("@")[0] : "") ||
      "Joueur"
  ).trim();
}

function onlineAvatarOf(onlineProfile: any): string {
  return String(
    onlineProfile?.avatarUrl ||
      onlineProfile?.avatar_url ||
      onlineProfile?.avatar ||
      onlineProfile?.photo_url ||
      ""
  ).trim();
}

function looksLikeFallbackName(name: any, email: string): boolean {
  const n = String(name || "").trim().toLowerCase();
  const local = String(email || "").trim().toLowerCase().split("@")[0] || "";
  return !n || n === "joueur" || (!!local && n === local)
}

function hasAvatarData(p: any): boolean {
  return !!String(p?.avatarDataUrl || "").trim() || !!String(p?.avatar_data_url || "").trim();
}

function hasAvatarUrl(p: any): boolean {
  return !!String(p?.avatarUrl || "").trim() || !!String(p?.avatar_url || "").trim();
}

function accountCandidateScore(p: any, ctx: { uid: string; email: string; activeId: string }): number {
  if (!p) return -1e9;
  const pi = readPrivateInfo(p);
  const pid = String(p?.id || "");
  let score = scoreProfileCompleteness(p);

  if (pid && pid === ctx.activeId) score += 120;
  if (pid && pid === ctx.uid) score += 30;
  if (String(pi?.onlineUserId || "") === ctx.uid) score += 90;
  if (ctx.email && String(pi?.onlineEmail || "").toLowerCase() === ctx.email) score += 35;
  if (hasAvatarData(p)) score += 35;
  if (hasAvatarUrl(p)) score += 20;
  if (!looksLikeFallbackName(p?.name, ctx.email)) score += 20;
  if (looksLikeFallbackName(p?.name, ctx.email) && !hasAvatarData(p) && !hasAvatarUrl(p)) score -= 25;

  return score;
}

function resolveCanonicalAccountProfile(profiles: any[], activeId: string, user: any) {
  const uid = String(user?.id || "");
  const email = safeLower(user?.email);
  const ctx = { uid, email, activeId: String(activeId || "") };

  const candidates = profiles.filter((p) => {
    const pi = readPrivateInfo(p);
    const pid = String(p?.id || "");
    return (
      pid === ctx.activeId ||
      pid === uid ||
      String(pi?.onlineUserId || "") === uid ||
      (!!email && String(pi?.onlineEmail || "").toLowerCase() === email)
    );
  });

  if (!candidates.length) return null;

  return [...candidates].sort((a, b) => accountCandidateScore(b, ctx) - accountCandidateScore(a, ctx))[0] || null;
}

function unlinkOnlineIdentity(p: any): any {
  const pi = readPrivateInfo(p);
  const nextPi: PrivateInfoRaw = { ...pi };
  delete nextPi.onlineUserId;
  delete nextPi.onlineEmail;
  delete nextPi.onlineKey;
  return writePrivateInfo(p, nextPi);
}

function mergeLinkedProfileWithOnline(current: any, user: any, onlineProfile?: any): any {
  const email = safeLower(user?.email);
  const onlineName = onlineDisplayNameOf(onlineProfile, email);
  const onlineAvatar = onlineAvatarOf(onlineProfile);
  const next: any = { ...(current || {}) };

  if (looksLikeFallbackName(next?.name, email) && onlineName) {
    next.name = onlineName;
  }

  if (onlineAvatar) {
    next.avatarUrl = onlineAvatar;
    if (!String(next?.avatarDataUrl || "").startsWith("data:")) {
      next.avatarDataUrl = undefined;
    }
  }

  if (!next?.country && onlineProfile?.country) {
    next.country = onlineProfile.country;
  }

  return next;
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

  const canonical = resolveCanonicalAccountProfile(profiles, activeId, user);

  if (canonical) {
    const related = profiles.filter((p) => {
      const pi = readPrivateInfo(p);
      const pid = String(p?.id || "");
      return (
        pid === String(canonical?.id || "") ||
        pid === uid ||
        String(pi?.onlineUserId || "") === uid ||
        (!!email && String(pi?.onlineEmail || "").toLowerCase() === email)
      );
    });

    let mergedBase: any = { ...canonical };
    for (const other of related) {
      if (!other || String(other?.id || "") === String(canonical?.id || "")) continue;
      if (!mergedBase?.name && other?.name) mergedBase.name = other.name;
      if (!mergedBase?.country && other?.country) mergedBase.country = other.country;
      if (!mergedBase?.avatarDataUrl && other?.avatarDataUrl) mergedBase.avatarDataUrl = other.avatarDataUrl;
      if (!mergedBase?.avatarUrl && other?.avatarUrl) mergedBase.avatarUrl = other.avatarUrl;
      const piBase = readPrivateInfo(mergedBase);
      const piOther = readPrivateInfo(other);
      mergedBase.privateInfo = { ...piOther, ...piBase };
    }

    const canonicalLinked = writePrivateInfo(
      mergeLinkedProfileWithOnline(mergedBase, user, onlineProfile),
      {
        ...readPrivateInfo(mergedBase),
        onlineUserId: uid,
        onlineEmail: email || readPrivateInfo(mergedBase).onlineEmail || "",
        password: "",
      }
    );

    const nextProfiles = profiles
      .filter((p) => !(String(p?.id || "") === uid && String(canonicalLinked?.id || "") !== uid && looksLikeFallbackName(p?.name, email) && !hasAvatarData(p) && !hasAvatarUrl(p)))
      .map((p) => {
        const pid = String(p?.id || "");
        if (pid === String(canonicalLinked?.id || "")) return canonicalLinked;

        const pi = readPrivateInfo(p);
        const isRelated =
          pid === uid ||
          String(pi?.onlineUserId || "") === uid ||
          (!!email && String(pi?.onlineEmail || "").toLowerCase() === email);

        if (!isRelated) return p;
        return unlinkOnlineIdentity(p);
      });

    return { ...store, profiles: nextProfiles, activeProfileId: String(canonicalLinked?.id || activeId) };
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

  // Default: do NOT hijack the current active local profile.
  // Create a dedicated local profile bound to this online account.
  const onlineName = onlineDisplayNameOf(onlineProfile, email);
  const onlineAvatar = onlineAvatarOf(onlineProfile);
  const dedicatedProfile: any = {
    id: uid,
    name: onlineName,
    avatarDataUrl: onlineAvatar || undefined,
    avatarUrl: onlineAvatar || undefined,
    country: onlineProfile?.country || active?.country || "FR",
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
    profiles: [...profiles, dedicatedProfile],
    activeProfileId: uid,
  };
}
