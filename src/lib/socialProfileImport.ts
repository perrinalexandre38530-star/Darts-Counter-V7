
// ============================================
// src/lib/socialProfileImport.ts
// Normalise les informations renvoyées par les providers OAuth.
// Objectif : préremplir MON PROFIL sans écraser les données déjà choisies
// par l'utilisateur. Les providers ne transmettent pas tous les mêmes champs.
// ============================================

export type SocialProfileSeed = {
  provider: string;
  nickname: string;
  displayName: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  avatarUrl: string;
};

function clean(value: any): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function pick(...values: any[]): string {
  for (const value of values) {
    const out = clean(value);
    if (out) return out;
  }
  return "";
}

function mergeIdentityMetadata(user: any): Record<string, any> {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  const merged: Record<string, any> = {};

  // Les identity_data sont utiles pour certains providers récents/custom.
  for (const identity of identities) {
    const data = identity?.identity_data;
    if (data && typeof data === "object") Object.assign(merged, data);
  }

  // user_metadata est la vue normalisée par Supabase : priorité finale.
  const meta = user?.user_metadata;
  if (meta && typeof meta === "object") Object.assign(merged, meta);
  return merged;
}

function providerName(user: any): string {
  return pick(
    user?.app_metadata?.provider,
    user?.identities?.[0]?.provider,
    "oauth"
  ).toLowerCase();
}

function emailLocalPart(email: string): string {
  return clean(email).replace(/^mailto:/i, "").split("@")[0] || "";
}

export function extractSocialProfileSeed(user: any): SocialProfileSeed {
  const meta = mergeIdentityMetadata(user);
  const email = pick(user?.email, meta?.email);
  const fullName = pick(
    meta?.full_name,
    meta?.name,
    meta?.display_name,
    meta?.displayName
  );

  const firstName = pick(
    meta?.given_name,
    meta?.first_name,
    meta?.firstName,
    meta?.givenName
  );

  const lastName = pick(
    meta?.family_name,
    meta?.last_name,
    meta?.lastName,
    meta?.familyName
  );

  const nickname = pick(
    meta?.preferred_username,
    meta?.user_name,
    meta?.username,
    meta?.nickname,
    meta?.login,
    fullName,
    emailLocalPart(email),
    "Player"
  );

  return {
    provider: providerName(user),
    nickname,
    displayName: pick(fullName, nickname),
    firstName,
    lastName,
    birthDate: pick(meta?.birthdate, meta?.birth_date, meta?.birthday),
    country: pick(meta?.country, meta?.country_code, meta?.countryCode),
    city: pick(meta?.city, meta?.locality, meta?.location?.city),
    email,
    phone: pick(user?.phone, meta?.phone, meta?.phone_number, meta?.phoneNumber),
    avatarUrl: pick(
      meta?.avatar_url,
      meta?.avatarUrl,
      meta?.picture,
      meta?.picture_url,
      meta?.photo_url,
      meta?.photoURL,
      meta?.profile_image_url,
      meta?.image_url
    ),
  };
}

export function isGenericSocialName(value: any, user: any): boolean {
  const current = clean(value).toLowerCase();
  if (!current) return true;
  if (["player", "joueur", "user", "utilisateur"].includes(current)) return true;

  const local = emailLocalPart(pick(user?.email)).toLowerCase();
  return !!local && current === local;
}

export function buildSocialProfileCreatePayload(user: any, userId: string) {
  const seed = extractSocialProfileSeed(user);
  return {
    id: userId,
    user_id: userId,
    nickname: seed.nickname,
    display_name: seed.displayName || seed.nickname,
    avatar_url: seed.avatarUrl || null,
    country: seed.country || null,
    first_name: seed.firstName || null,
    last_name: seed.lastName || null,
    birth_date: seed.birthDate || null,
    city: seed.city || null,
    email: seed.email || null,
    phone: seed.phone || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Renvoie uniquement les informations sociales qui manquent au profil existant.
 * Un avatar, nom, prénom, etc. déjà personnalisés ne sont jamais remplacés.
 */
export function buildMissingSocialProfilePatch(row: any, user: any) {
  const seed = extractSocialProfileSeed(user);
  const patch: Record<string, any> = {};

  if (isGenericSocialName(row?.nickname, user) && seed.nickname) {
    patch.nickname = seed.nickname;
  }
  if (isGenericSocialName(row?.display_name, user) && seed.displayName) {
    patch.display_name = seed.displayName;
  }
  if (!clean(row?.avatar_url) && seed.avatarUrl) patch.avatar_url = seed.avatarUrl;
  if (!clean(row?.country) && seed.country) patch.country = seed.country;
  if (!clean(row?.first_name) && seed.firstName) patch.first_name = seed.firstName;
  if (!clean(row?.last_name) && seed.lastName) patch.last_name = seed.lastName;
  if (!clean(row?.birth_date) && seed.birthDate) patch.birth_date = seed.birthDate;
  if (!clean(row?.city) && seed.city) patch.city = seed.city;
  if (!clean(row?.email) && seed.email) patch.email = seed.email;
  if (!clean(row?.phone) && seed.phone) patch.phone = seed.phone;

  if (Object.keys(patch).length) patch.updated_at = new Date().toISOString();
  return patch;
}
