// ============================================
// src/lib/accountBridge.ts
// Pont COMPTE ONLINE ↔ PROFIL LOCAL ACTIF
//
// ✅ V7 FINAL — COMPTE UNIQUE / PROFIL JOUEUR UNIQUE
// - ❌ aucun mirror `online:<uid>`
// - ❌ aucun profil joueur dédié supplémentaire `id === uid` si un profil local existe déjà
// - ✅ le profil joueur actif est lié au compte via `privateInfo.onlineUserId`
// - ✅ migration automatique des anciens doublons compte/local sans perdre leurs alias
// - ✅ compatible multi-appareils : l’identité réseau reste l’UID Supabase, pas l’id joueur local
// ============================================

import type { Profile } from "./types";
import { bindCanonicalAccountProfileId, getBoundAccountProfileId } from "./canonicalAccountProfile";

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

function hasMeaningfulValue(v: any): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

function withDefinedEntries<T extends Record<string, any>>(input: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (hasMeaningfulValue(v)) out[k] = v;
  }
  return out as Partial<T>;
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

function bridgeProfileSignature(p: any): string {
  if (!p) return "";
  const pi = readPrivateInfo(p);
  const avatarData = String(p?.avatarDataUrl || "");
  return JSON.stringify({
    id: String(p?.id || ""),
    name: p?.name || "",
    surname: p?.surname || "",
    firstName: p?.firstName || "",
    lastName: p?.lastName || "",
    birthDate: p?.birthDate || "",
    city: p?.city || "",
    phone: p?.phone || "",
    country: p?.country || "",
    avatarUrl: p?.avatarUrl || "",
    avatarPath: p?.avatarPath || "",
    avatarUpdatedAt: Number(p?.avatarUpdatedAt || 0),
    avatarDataLen: avatarData.length,
    avatarDataHead: avatarData.slice(0, 48),
    favoriteDartSetId: p?.favoriteDartSetId ?? null,
    preferences: p?.preferences || {},
    privateInfo: {
      onlineUserId: pi?.onlineUserId || "",
      onlineEmail: pi?.onlineEmail || "",
      accountUserId: (pi as any)?.accountUserId || "",
      linkedAccountIds: Array.isArray((pi as any)?.linkedAccountIds) ? (pi as any).linkedAccountIds : [],
      linkedLocalProfileIds: Array.isArray((pi as any)?.linkedLocalProfileIds) ? (pi as any).linkedLocalProfileIds : [],
      nickname: (pi as any)?.nickname || "",
      firstName: (pi as any)?.firstName || "",
      lastName: (pi as any)?.lastName || "",
      birthDate: (pi as any)?.birthDate || "",
      city: (pi as any)?.city || "",
      phone: (pi as any)?.phone || "",
      country: (pi as any)?.country || "",
    },
  });
}

function profilesEquivalentForBridge(before: any[], after: any[]): boolean {
  if (before.length !== after.length) return false;
  for (let i = 0; i < before.length; i += 1) {
    if (String(before[i]?.id || "") !== String(after[i]?.id || "")) return false;
    if (before[i] === after[i]) continue;
    if (bridgeProfileSignature(before[i]) !== bridgeProfileSignature(after[i])) return false;
  }
  return true;
}

function getOnlineNickname(user: any, onlineProfile?: any): string {
  const raw = String(
    onlineProfile?.privateInfo?.nickname ||
      onlineProfile?.private_info?.nickname ||
      onlineProfile?.surname ||
      onlineProfile?.nickname ||
      user?.nickname ||
      ""
  ).trim();
  const lower = raw.toLowerCase();
  if (!raw) return "";
  if (lower === "joueur" || lower === "player" || lower === "user") return "";
  return raw;
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

function getRemoteCanonicalLocalProfileId(onlineProfile?: any): string {
  const pi = ((onlineProfile as any)?.privateInfo || (onlineProfile as any)?.private_info || {}) as Record<string, any>;
  return String(
    pi?.canonicalLocalProfileId ||
    pi?.canonicalProfileId ||
    (onlineProfile as any)?.canonicalLocalProfileId ||
    ""
  ).trim();
}

function buildPrivateInfoPatch(user: any, onlineProfile?: any): PrivateInfoRaw {
  const email = safeLower(user?.email);
  const prefs = (onlineProfile as any)?.preferences || {};
  const pi = ((onlineProfile as any)?.privateInfo || (onlineProfile as any)?.private_info || {}) as Record<string, any>;

  const patch = withDefinedEntries({
    ...pi,
    onlineUserId: String(user?.id || ""),
    onlineEmail: email || String(pi?.onlineEmail || pi?.email || "").trim().toLowerCase(),
    nickname: pi?.nickname ?? getOnlineNickname(user, onlineProfile),
    firstName: onlineProfile?.firstName ?? onlineProfile?.first_name ?? pi?.firstName,
    lastName: onlineProfile?.lastName ?? onlineProfile?.last_name ?? pi?.lastName,
    birthDate: onlineProfile?.birthDate ?? onlineProfile?.birth_date ?? pi?.birthDate,
    city: onlineProfile?.city ?? pi?.city,
    country: onlineProfile?.country ?? pi?.country,
    email: onlineProfile?.email ?? user?.email ?? pi?.email,
    phone: onlineProfile?.phone ?? pi?.phone,
    appLang: prefs?.appLang ?? pi?.appLang,
    appTheme: prefs?.appTheme ?? pi?.appTheme,
    favX01: prefs?.favX01 ?? pi?.favX01,
    favDoubleOut: prefs?.favDoubleOut ?? pi?.favDoubleOut,
    ttsVoice: prefs?.ttsVoice ?? pi?.ttsVoice,
    sfxVolume: prefs?.sfxVolume ?? pi?.sfxVolume,
    canonicalLocalProfileId: getRemoteCanonicalLocalProfileId(onlineProfile) || pi?.canonicalLocalProfileId,
  }) as PrivateInfoRaw;

  return {
    ...patch,
    // sécurité: ne jamais persister password
    password: "",
  };
}

function stripOnlineBinding(p: any): any {
  const pi = { ...readPrivateInfo(p) };
  delete (pi as any).onlineUserId;
  delete (pi as any).online_user_id;
  delete (pi as any).onlineEmail;
  delete (pi as any).accountUserId;
  delete (pi as any).account_user_id;
  delete (pi as any).linkedAccountIds;
  const out: any = { ...(p || {}) };
  delete out.onlineUserId;
  delete out.online_user_id;
  delete out.accountUserId;
  delete out.account_user_id;
  return writePrivateInfo(out, { ...pi, password: "" });
}

function buildDedicatedAccountProfile(user: any, onlineProfile?: any, previous?: any): any {
  const uid = String(user?.id || "");
  const prevPI = readPrivateInfo(previous);
  const nickname =
    String(prevPI?.nickname || previous?.surname || "").trim() ||
    getOnlineNickname(user, onlineProfile) ||
    "";
  const avatar = getOnlineAvatar(onlineProfile);
  const nextPI = {
    ...prevPI,
    ...buildPrivateInfoPatch(user, onlineProfile),
  };
  const nextPrefs = {
    ...((previous as any)?.preferences || {}),
    ...(((onlineProfile as any)?.preferences || {}) as Record<string, any>),
  };

  return writePrivateInfo(
    {
      ...(previous || {}),
      id: uid,
      name: nickname || previous?.name || "",
      surname: onlineProfile?.surname ?? previous?.surname ?? nickname ?? "",
      firstName: onlineProfile?.firstName ?? onlineProfile?.first_name ?? previous?.firstName ?? prevPI?.firstName ?? "",
      lastName: onlineProfile?.lastName ?? onlineProfile?.last_name ?? previous?.lastName ?? prevPI?.lastName ?? "",
      birthDate: onlineProfile?.birthDate ?? onlineProfile?.birth_date ?? previous?.birthDate ?? prevPI?.birthDate ?? "",
      city: onlineProfile?.city ?? previous?.city ?? prevPI?.city ?? "",
      phone: onlineProfile?.phone ?? previous?.phone ?? prevPI?.phone ?? "",
      country: onlineProfile?.country || previous?.country || prevPI?.country || "FR",
      avatarDataUrl: previous?.avatarDataUrl || avatar || previous?.avatarUrl,
      avatarUrl: previous?.avatarUrl || avatar || previous?.avatarDataUrl,
      preferences: nextPrefs,
      createdAt: previous?.createdAt || Date.now(),
      updatedAt: Date.now(),
      // Compat legacy uniquement : les statistiques affichées sont dérivées de History.
      stats: { ...(previous?.stats || {}) },
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
// ✅ COMPTE ONLINE ↔ UN SEUL PROFIL JOUEUR LOCAL
// ============================================================
// Le compte authentifié n'est PAS un joueur supplémentaire.
// Le profil joueur déjà présent devient le profil du compte via
// privateInfo.onlineUserId. Cela évite les doublons dans tous les sélecteurs.
//
// Migration automatique des builds qui créaient un profil dédié id==uid :
// - on retrouve le profil local d'origine (binding, alias, createdAt, nom/avatar),
// - on fusionne les données utiles du profil compte dans ce profil local,
// - on supprime uniquement le clone compte devenu redondant,
// - on conserve uid + anciens ids en alias pour l'Historique / classements.
// ============================================================

function identityLabel(profile: any): string {
  const pi = readPrivateInfo(profile);
  return safeLower(
    profile?.name ||
    profile?.displayName ||
    profile?.nickname ||
    profile?.surname ||
    pi?.nickname ||
    pi?.displayName ||
    ""
  );
}

function identityAvatar(profile: any): string {
  return String(
    profile?.avatarDataUrl ||
    profile?.avatarUrl ||
    profile?.photoDataUrl ||
    profile?.photoUrl ||
    ""
  ).trim();
}

function profileAliasIds(profile: any): string[] {
  const pi = readPrivateInfo(profile);
  const values = [
    ...(Array.isArray((pi as any)?.linkedLocalProfileIds) ? (pi as any).linkedLocalProfileIds : []),
    ...(Array.isArray((pi as any)?.legacyProfileIds) ? (pi as any).legacyProfileIds : []),
    ...(Array.isArray((profile as any)?.linkedLocalProfileIds) ? (profile as any).linkedLocalProfileIds : []),
    ...(Array.isArray((profile as any)?.legacyProfileIds) ? (profile as any).legacyProfileIds : []),
    (pi as any)?.legacyProfileId,
    (profile as any)?.legacyProfileId,
  ];
  return Array.from(new Set(values.map((v) => String(v || "").trim()).filter(Boolean)));
}

function hasOnlineBindingTo(profile: any, uid: string): boolean {
  const pi = readPrivateInfo(profile);
  return [
    pi?.onlineUserId,
    (pi as any)?.online_user_id,
    (pi as any)?.accountUserId,
    (profile as any)?.onlineUserId,
    (profile as any)?.online_user_id,
    (profile as any)?.accountUserId,
    (profile as any)?.account_user_id,
  ].some((value) => String(value || "").trim() === uid);
}


function accountIdentityIds(user: any): string[] {
  const meta = (user?.user_metadata || {}) as Record<string, any>;
  return Array.from(new Set([
    user?.id,
    meta?.supabase_user_id,
    meta?.canonical_user_id,
    meta?.nas_user_id,
    meta?.multisports_user_id,
  ].map((value) => String(value || "").trim()).filter(Boolean)));
}

function hasOnlineBindingToAny(profile: any, ids: string[]): boolean {
  return ids.some((id) => hasOnlineBindingTo(profile, id));
}

function pickCanonicalLocalAccountProfile(
  profiles: any[],
  uid: string,
  accountIds: string[],
  dedicated: any,
  activeId: string,
  onlineProfile?: any,
): any | null {
  const accountIdSet = new Set(accountIds);
  const mirrorIds = new Set(accountIds.map((id) => `online:${id}`));
  const locals = profiles.filter((profile) => {
    const id = String(profile?.id || "").trim();
    return !!id && !profile?.isBot && !accountIdSet.has(id) && !mirrorIds.has(id);
  });
  if (!locals.length) return null;

  // V19 : le mapping porté par le profil ONLINE est l'autorité multi-appareils.
  // Contrairement au binding localStorage, il accompagne le compte sur un nouveau
  // téléphone/PC et permet de conserver le même profile.id historique.
  const remoteCanonicalId = getRemoteCanonicalLocalProfileId(onlineProfile);
  if (remoteCanonicalId) {
    const remoteBound = locals.find((profile) => String(profile?.id || "").trim() === remoteCanonicalId);
    if (remoteBound) return remoteBound;
  }

  // V16 : un mapping déjà validé COMPTE -> MON PROFIL est l'autorité absolue.
  // Il survit aux rechargements de scope et empêche un vieux profil doublon de
  // redevenir actif simplement parce qu'il apparaît plus tôt dans le tableau.
  const boundId = getBoundAccountProfileId(uid);
  if (boundId) {
    const bound = locals.find((profile) => String(profile?.id || "").trim() === boundId);
    if (bound) return bound;
  }

  const dedicatedAliases = new Set(profileAliasIds(dedicated));
  const dedicatedLabel = identityLabel(dedicated);
  const dedicatedAvatar = identityAvatar(dedicated);
  const onlineLabel = safeLower(getOnlineNickname({ id: uid }, onlineProfile));
  const dedicatedCreatedAt = Number(dedicated?.createdAt || 0);

  // Les anciens correctifs ont parfois lié plusieurs profils humains au même
  // compte. On ne peut donc plus faire un simple Array.find(binding). On score
  // les preuves d'identité ; les alias historiques / nom du compte / UID
  // Supabase exact gagnent sur le simple "profil actif du moment".
  const scored = locals.map((profile, index) => {
    const id = String(profile?.id || "").trim();
    const label = identityLabel(profile);
    const avatar = identityAvatar(profile);
    let score = 0;
    if (dedicatedAliases.has(id)) score += 1200;
    if (dedicatedCreatedAt > 0 && Number(profile?.createdAt || 0) === dedicatedCreatedAt) score += 900;
    if (dedicatedLabel && label && label === dedicatedLabel) score += 850;
    if (onlineLabel && label && label === onlineLabel) score += 800;
    if (dedicatedAvatar && avatar && avatar === dedicatedAvatar) score += 700;
    if (hasOnlineBindingTo(profile, uid)) score += 600;
    if (hasOnlineBindingToAny(profile, accountIds)) score += 220;
    if (id === activeId) score += 300;
    score += Math.min(100, scoreProfileCompleteness(profile) * 4);
    // ordre stable uniquement comme dernier départage
    score -= index * 0.001;
    return { profile, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best && best.score > 0) return best.profile;
  return pickOriginalLocalProfile(profiles, uid, dedicated, activeId, accountIds);
}

function avatarTimestamp(profile: any): number {
  const pi = readPrivateInfo(profile);
  const direct = profile?.avatarUpdatedAt ?? profile?.avatar_updated_at ?? profile?.updatedAvatarAt
    ?? (pi as any)?.avatarUpdatedAt ?? (pi as any)?.avatar_updated_at ?? null;
  const raw = Number(direct ?? 0);
  if (Number.isFinite(raw) && raw > 0) return raw;
  const iso = profile?.updatedAt ?? profile?.updated_at ?? null;
  if (iso) {
    const parsed = typeof iso === "number" ? Number(iso) : Date.parse(String(iso));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function explicitAvatarTimestamp(profile: any): number {
  // IMPORTANT : updated_at du profil Supabase change pour le nom, le pays,
  // les préférences, etc. Il ne prouve PAS que l'avatar a changé. Utiliser ce
  // timestamp générique rendait une ancienne avatar_url artificiellement
  // "plus récente" et lui permettait d'écraser l'image choisie localement.
  // V18 : la révision avatar est aussi conservée dans private_info afin qu'un
  // autre appareil puisse comparer deux photos sans détourner updated_at.
  const pi = readPrivateInfo(profile);
  const direct = profile?.avatarUpdatedAt ?? profile?.avatar_updated_at ?? profile?.updatedAvatarAt
    ?? (pi as any)?.avatarUpdatedAt ?? (pi as any)?.avatar_updated_at ?? null;
  const raw = Number(direct ?? 0);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function hasAvatarMedia(profile: any): boolean {
  return [
    profile?.avatarDataUrl,
    profile?.avatarThumbDataUrl,
    profile?.avatarFullDataUrl,
    profile?.avatarCastDataUrl,
    profile?.avatarUrl,
    profile?.avatarPath,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
}

function pickFreshestAvatarProfile(localProfile: any, accountProfile: any): any {
  const localHas = hasAvatarMedia(localProfile);
  const accountHas = hasAvatarMedia(accountProfile);
  if (!localHas) return accountHas ? accountProfile : localProfile;
  if (!accountHas) return localProfile;

  const localTs = avatarTimestamp(localProfile);
  const accountTs = avatarTimestamp(accountProfile);
  // La modification utilisateur la plus récente gagne. C'est indispensable
  // pendant la migration d'un ancien profil compte usr_* vers le profil local :
  // sans ce test l'ancien avatar du profil local pouvait écraser la photo que
  // l'utilisateur venait juste de sélectionner sur le clone compte.
  if (accountTs > localTs) return accountProfile;
  return localProfile;
}

function pickOriginalLocalProfile(profiles: any[], uid: string, dedicated: any, activeId: string, accountIdsInput?: string[]): any | null {
  const accountIds = new Set((accountIdsInput?.length ? accountIdsInput : [uid]).map((id) => String(id || "").trim()).filter(Boolean));
  const mirrorIds = new Set(Array.from(accountIds).map((id) => `online:${id}`));
  const locals = profiles.filter((profile) => {
    const id = String(profile?.id || "").trim();
    return !!id && !accountIds.has(id) && !mirrorIds.has(id) && !profile?.isBot;
  });
  if (!locals.length) return null;

  // 1) Binding explicite : preuve la plus forte.
  const explicitlyLinked = locals.find((profile) => hasOnlineBindingToAny(profile, Array.from(accountIds)));
  if (explicitlyLinked) return explicitlyLinked;

  // 2) Alias écrit par les correctifs précédents.
  const dedicatedAliases = new Set(profileAliasIds(dedicated));
  const byAlias = locals.find((profile) => dedicatedAliases.has(String(profile?.id || "").trim()));
  if (byAlias) return byAlias;

  // 3) Le profil dédié V7 était cloné depuis le profil actif, en conservant
  // notamment createdAt. C'est un marqueur très fiable pour réparer l'existant.
  const createdAt = Number(dedicated?.createdAt || 0);
  if (createdAt > 0) {
    const sameCreated = locals.filter((profile) => Number(profile?.createdAt || 0) === createdAt);
    if (sameCreated.length === 1) return sameCreated[0];
  }

  // 4) Nom + avatar identiques : autre signature forte du clone.
  const label = identityLabel(dedicated);
  const avatar = identityAvatar(dedicated);
  if (label && avatar) {
    const exact = locals.filter((profile) => identityLabel(profile) === label && identityAvatar(profile) === avatar);
    if (exact.length === 1) return exact[0];
  }

  // 5) Nom identique et unique. Les anciens clones reprenaient systématiquement
  // le nom du profil source, même lorsque l'avatar distant avait changé.
  if (label) {
    const byName = locals.filter((profile) => identityLabel(profile) === label);
    if (byName.length === 1) return byName[0];
  }

  // 6) Lors d'une première liaison (pas encore de profil dédié), le profil actif
  // est le choix explicite de l'utilisateur.
  if (!dedicated && activeId) {
    const active = locals.find((profile) => String(profile?.id || "") === activeId);
    if (active) return active;
  }

  // 7) Un seul profil humain local : aucune ambiguïté possible.
  if (locals.length === 1) return locals[0];
  return null;
}

function mergeAccountIntoLocalProfile(localProfile: any, accountProfile: any, user: any, onlineProfile?: any): any {
  const uid = String(user?.id || "").trim();
  const accountIds = accountIdentityIds(user);
  const local = localProfile || {};
  const account = accountProfile || {};
  const localPI = readPrivateInfo(local);
  const accountPI = readPrivateInfo(account);
  const onlineAvatar = getOnlineAvatar(onlineProfile);
  const localOrAccountAvatarSource = pickFreshestAvatarProfile(local, account);
  const onlineAvatarTs = onlineAvatar ? explicitAvatarTimestamp(onlineProfile) : 0;
  const localAvatarTs = avatarTimestamp(localOrAccountAvatarSource);
  // Avatar compte multi-appareils : Supabase Storage + profiles.avatar_url est la
  // source durable. Elle gagne seulement lorsqu'elle est plus récente que le
  // changement local courant ; ainsi une preview choisie à l'instant T n'est
  // jamais écrasée pendant son upload, mais un autre appareil récupère bien la
  // dernière photo du compte.
  const onlineAvatarIsFresher = !!onlineAvatar && (!hasAvatarMedia(localOrAccountAvatarSource) || (onlineAvatarTs > 0 && onlineAvatarTs > localAvatarTs));
  const avatarSource = onlineAvatarIsFresher
    ? { avatarUrl: onlineAvatar, avatarUpdatedAt: onlineAvatarTs }
    : localOrAccountAvatarSource;
  const avatarSourceHasMedia = hasAvatarMedia(avatarSource);
  const avatarUpdatedAt = Math.max(avatarTimestamp(local), avatarTimestamp(account), onlineAvatarTs);

  const aliasIds = Array.from(new Set([
    ...profileAliasIds(local),
    ...profileAliasIds(account),
    String(account?.id || "").trim(),
    ...accountIds,
  ].filter(Boolean))).filter((id) => id !== String(local?.id || "").trim());

  const merged: any = {
    ...account,
    ...local,
    id: String(local?.id || uid),
    name: local?.name || account?.name || getOnlineNickname(user, onlineProfile) || "",
    surname: local?.surname ?? account?.surname ?? onlineProfile?.surname ?? "",
    firstName: local?.firstName ?? account?.firstName ?? onlineProfile?.firstName ?? onlineProfile?.first_name ?? "",
    lastName: local?.lastName ?? account?.lastName ?? onlineProfile?.lastName ?? onlineProfile?.last_name ?? "",
    birthDate: local?.birthDate ?? account?.birthDate ?? onlineProfile?.birthDate ?? onlineProfile?.birth_date ?? "",
    city: local?.city ?? account?.city ?? onlineProfile?.city ?? "",
    phone: local?.phone ?? account?.phone ?? onlineProfile?.phone ?? "",
    country: local?.country || account?.country || onlineProfile?.country || localPI?.country || accountPI?.country || "FR",
    // L'avatar est le seul champ où la fraîcheur doit primer sur "local gagne".
    // Pendant les migrations historiques, le profil compte usr_* peut contenir
    // la photo sélectionnée il y a 2 secondes et le profil local canonique une
    // photo vieille de plusieurs mois. On conserve donc la source la plus récente.
    avatarDataUrl: avatarSourceHasMedia
      ? (avatarSource?.avatarDataUrl || avatarSource?.avatarThumbDataUrl || avatarSource?.avatarUrl || undefined)
      : (onlineAvatar || undefined),
    avatarThumbDataUrl: avatarSourceHasMedia
      ? (avatarSource?.avatarThumbDataUrl || avatarSource?.avatarDataUrl || undefined)
      : undefined,
    avatarFullDataUrl: avatarSourceHasMedia
      ? (avatarSource?.avatarFullDataUrl || avatarSource?.avatarDataUrl || undefined)
      : undefined,
    avatarCastDataUrl: avatarSourceHasMedia
      ? (avatarSource?.avatarCastDataUrl || avatarSource?.avatarFullDataUrl || avatarSource?.avatarDataUrl || undefined)
      : undefined,
    avatarUrl: avatarSourceHasMedia
      ? (avatarSource?.avatarUrl || undefined)
      : (onlineAvatar || undefined),
    avatarPath: avatarSourceHasMedia ? (avatarSource?.avatarPath || undefined) : undefined,
    avatarUpdatedAt: avatarUpdatedAt || avatarSource?.avatarUpdatedAt || undefined,
    favoriteDartSetId: local?.favoriteDartSetId ?? account?.favoriteDartSetId ?? null,
    preferences: {
      ...(account?.preferences || {}),
      ...(((onlineProfile as any)?.preferences || {}) as Record<string, any>),
      ...(local?.preferences || {}),
    },
    // MON PROFIL reste l’identité locale ; History reste la source des statistiques.
    stats: { ...(local?.stats || {}) },
    createdAt: local?.createdAt || account?.createdAt || Date.now(),
    // Le bridge d'identité doit être idempotent : il ne doit pas modifier
    // updatedAt à chaque passage, sinon App relance une persistance/re-render
    // en boucle alors qu'aucune donnée utilisateur n'a changé.
    updatedAt: local?.updatedAt ?? account?.updatedAt ?? Date.now(),
  };

  return writePrivateInfo(merged, {
    // Le compte distant initialise les champs manquants ; MON PROFIL local gagne ensuite.
    ...buildPrivateInfoPatch(user, onlineProfile),
    ...accountPI,
    ...localPI,
    onlineUserId: uid,
    onlineEmail: safeLower(user?.email) || localPI?.onlineEmail || accountPI?.onlineEmail || "",
    accountUserId: uid,
    canonicalLocalProfileId: String(merged?.id || local?.id || uid),
    linkedLocalProfileIds: aliasIds,
    linkedAccountIds: accountIds,
    password: "",
  });
}

export function ensureLocalProfileForOnlineUser(store: any, user: any, onlineProfile?: any) {
  if (!store || !user?.id) return store;

  const uid = String(user.id).trim();
  const accountIds = accountIdentityIds(user);
  const accountIdSet = new Set(accountIds);
  const mirrorIds = new Set(accountIds.map((id) => `online:${id}`));
  const inputProfiles: any[] = Array.isArray(store.profiles) ? store.profiles.filter(Boolean) : [];
  const activeId = String(store.activeProfileId || inputProfiles[0]?.id || "").trim();

  const accountProfiles = inputProfiles.filter((profile) => {
    const id = String(profile?.id || "").trim();
    return accountIdSet.has(id) || mirrorIds.has(id);
  });

  // Si plusieurs anciens profils compte coexistent (UUID Supabase + usr_* +
  // online:<id>), on prend comme source celui qui porte l'avatar le plus récent,
  // puis le profil le plus complet. Les autres seront supprimés après fusion.
  const dedicated = accountProfiles
    .slice()
    .sort((a, b) => {
      const avatarDelta = avatarTimestamp(b) - avatarTimestamp(a);
      if (avatarDelta) return avatarDelta;
      return scoreProfileCompleteness(b) - scoreProfileCompleteness(a);
    })[0] || null;

  const explicitlyLinked = inputProfiles.find((profile) => {
    const id = String(profile?.id || "").trim();
    return !accountIdSet.has(id) && !mirrorIds.has(id) && hasOnlineBindingToAny(profile, accountIds);
  }) || null;

  // Aucun profil joueur sur cet appareil : le compte devient naturellement le
  // premier profil joueur. Il n'y a donc pas de doublon.
  if (!inputProfiles.length) {
    const remoteCanonicalId = getRemoteCanonicalLocalProfileId(onlineProfile);
    const canonicalId = remoteCanonicalId || uid;
    const built = buildDedicatedAccountProfile(user, onlineProfile, undefined);
    const only = writePrivateInfo(
      { ...built, id: canonicalId },
      {
        ...readPrivateInfo(built),
        onlineUserId: uid,
        accountUserId: uid,
        canonicalLocalProfileId: canonicalId,
      },
    );
    bindCanonicalAccountProfileId(uid, canonicalId);
    return { ...store, profiles: [only], activeProfileId: canonicalId };
  }

  // SOURCE CANONIQUE V16 : ne plus décider avec un simple find() ni avec le
  // premier profil marqué online. Le mapping persistant + les preuves d'identité
  // historiques choisissent une seule fois MON PROFIL et le gardent stable.
  const originalLocal = pickCanonicalLocalAccountProfile(
    inputProfiles,
    uid,
    accountIds,
    dedicated,
    activeId,
    onlineProfile,
  ) || explicitlyLinked || pickOriginalLocalProfile(inputProfiles, uid, dedicated, activeId, accountIds);

  if (originalLocal) {
    const merged = mergeAccountIntoLocalProfile(originalLocal, dedicated, user, onlineProfile);
    const canonicalId = String(merged?.id || originalLocal?.id || "").trim();
    bindCanonicalAccountProfileId(uid, canonicalId);

    const nextProfiles: any[] = [];
    let inserted = false;
    for (const profile of inputProfiles) {
      const id = String(profile?.id || "").trim();
      // Tous les anciens profils techniques du compte sont absorbés dans le
      // profil local canonique. Ils ne doivent plus redevenir profil actif.
      if ((accountIdSet.has(id) || mirrorIds.has(id)) && id !== canonicalId) continue;
      if (id === canonicalId) {
        if (!inserted) nextProfiles.push(merged);
        inserted = true;
        continue;
      }
      // Un compte ne peut être lié qu'à UN profil joueur local. Si un ancien
      // patch a laissé le même UID/email sur un autre profil humain, on garde
      // ce profil comme profil local mais on retire uniquement son binding compte.
      // Cela évite qu'il redevienne plus tard MON PROFIL par simple find().
      if (!profile?.isBot && hasOnlineBindingToAny(profile, accountIds)) {
        nextProfiles.push(stripOnlineBinding(profile));
      } else {
        nextProfiles.push(profile);
      }
    }
    if (!inserted) nextProfiles.push(merged);

    if (String(store?.activeProfileId || "") === canonicalId && profilesEquivalentForBridge(inputProfiles, nextProfiles)) {
      return store;
    }
    return {
      ...store,
      profiles: nextProfiles,
      activeProfileId: canonicalId,
    };
  }

  // Pas de profil local distinct détectable : on conserve le meilleur profil
  // compte existant, mais on stabilise son id sur l'identité Supabase exposée à
  // l'application. Les alias usr_* restent seulement dans privateInfo.
  if (dedicated) {
    const next = buildDedicatedAccountProfile(user, onlineProfile, dedicated);
    const aliases = Array.from(new Set([
      ...profileAliasIds(dedicated),
      ...accountIds,
    ].filter(Boolean)));
    const pi = {
      ...readPrivateInfo(next),
      onlineUserId: uid,
      accountUserId: uid,
      canonicalLocalProfileId: uid,
      linkedLocalProfileIds: aliases,
      linkedAccountIds: accountIds,
      password: "",
    };
    const refreshed = writePrivateInfo({ ...next, id: uid }, pi);
    bindCanonicalAccountProfileId(uid, uid);

    const nextProfiles = inputProfiles.filter((profile) => {
      const id = String(profile?.id || "").trim();
      return !accountIdSet.has(id) && !mirrorIds.has(id);
    });
    nextProfiles.push(refreshed);

    if (String(store?.activeProfileId || "") === uid && profilesEquivalentForBridge(inputProfiles, nextProfiles)) {
      return store;
    }
    return {
      ...store,
      profiles: nextProfiles,
      activeProfileId: uid,
    };
  }

  // Plusieurs profils locaux mais aucun clone/alias ne permet de savoir lequel
  // appartient au compte : on ne supprime rien arbitrairement. On lie le profil
  // actif (ou le premier humain) au compte, ce qui évite toute création future
  // de profil supplémentaire.
  const active = inputProfiles.find((profile) => String(profile?.id || "").trim() === activeId && !profile?.isBot)
    || inputProfiles.find((profile) => !profile?.isBot)
    || inputProfiles[0];
  const merged = mergeAccountIntoLocalProfile(active, null, user, onlineProfile);
  const canonicalId = String(merged?.id || active?.id || "").trim();
  bindCanonicalAccountProfileId(uid, canonicalId);
  const nextProfiles = inputProfiles.map((profile) => String(profile?.id || "").trim() === canonicalId ? merged : profile)
    .filter((profile) => {
      const id = String(profile?.id || "").trim();
      return id === canonicalId || (!accountIdSet.has(id) && !mirrorIds.has(id));
    })
    .map((profile) => {
      if (String(profile?.id || "").trim() === canonicalId || profile?.isBot) return profile;
      return hasOnlineBindingToAny(profile, accountIds) ? stripOnlineBinding(profile) : profile;
    });
  if (String(store?.activeProfileId || "") === canonicalId && profilesEquivalentForBridge(inputProfiles, nextProfiles)) {
    return store;
  }
  return {
    ...store,
    profiles: nextProfiles,
    activeProfileId: canonicalId,
  };
}
