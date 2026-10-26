/**
 * WAVE 2 — registre canonique des identités joueur.
 *
 * Principes :
 * - accountUserId (Supabase) != profileId (joueur local) ;
 * - un ancien id peut être un alias d'un profileId canonique ;
 * - aucun rapprochement par nom seul ;
 * - un alias déjà affecté à un autre profil n'est jamais déplacé silencieusement ;
 * - le registre est sauvegardé avec les autres données utilisateur.
 */

export const IDENTITY_ALIAS_REGISTRY_VERSION = 1 as const;
export const IDENTITY_ALIAS_KEY_PREFIX = "dc_identity_aliases_v1";
export const IDENTITY_ALIASES_UPDATED_EVENT = "dc-identity-aliases-updated";

export type IdentityAliasKind =
  | "profile"
  | "legacy_profile"
  | "account"
  | "online_mirror"
  | "technical";

export type IdentityEvidence =
  | "canonical_self"
  | "account_binding"
  | "explicit_linked_local_id"
  | "legacy_profile_id"
  | "technical_account_profile"
  | "online_mirror"
  | "remote_canonical_profile";

export type IdentityConfidence = "authoritative" | "strong" | "legacy";

export type IdentityAliasRecord = {
  id: string;
  kind: IdentityAliasKind;
  evidence: IdentityEvidence;
  confidence: IdentityConfidence;
  firstSeenAt: number;
  lastSeenAt: number;
};

export type CanonicalIdentityRecord = {
  canonicalProfileId: string;
  aliases: IdentityAliasRecord[];
  accountUserIds: string[];
  observedNames: string[];
  createdAt: number;
  updatedAt: number;
};

export type IdentityAliasConflict = {
  aliasId: string;
  existingCanonicalProfileId: string;
  attemptedCanonicalProfileId: string;
  evidence: IdentityEvidence;
  detectedAt: number;
};

export type IdentityAliasRegistry = {
  _v: typeof IDENTITY_ALIAS_REGISTRY_VERSION;
  accountUserId: string | null;
  profiles: Record<string, CanonicalIdentityRecord>;
  conflicts: IdentityAliasConflict[];
  updatedAt: number;
};

export type RegisterCanonicalIdentityInput = {
  accountUserId?: string | null;
  canonicalProfileId: string;
  profile?: any;
  accountIds?: string[];
  legacyProfileIds?: string[];
  remoteCanonicalProfileId?: string | null;
};

function cleanId(value: any): string {
  return String(value || "").trim();
}

function cleanName(value: any): string {
  return String(value || "").trim();
}

function unique(values: any[]): string[] {
  return Array.from(new Set(values.map(cleanId).filter(Boolean)));
}

function now(): number {
  return Date.now();
}

export function identityAliasStorageKey(accountUserId?: any): string {
  const uid = cleanId(accountUserId);
  return uid ? `${IDENTITY_ALIAS_KEY_PREFIX}:${uid}` : IDENTITY_ALIAS_KEY_PREFIX;
}

function emptyRegistry(accountUserId?: any): IdentityAliasRegistry {
  return {
    _v: IDENTITY_ALIAS_REGISTRY_VERSION,
    accountUserId: cleanId(accountUserId) || null,
    profiles: {},
    conflicts: [],
    updatedAt: now(),
  };
}

function normalizeAlias(raw: any): IdentityAliasRecord | null {
  const id = cleanId(raw?.id);
  if (!id) return null;
  const firstSeenAt = Number(raw?.firstSeenAt || 0) || now();
  const lastSeenAt = Number(raw?.lastSeenAt || 0) || firstSeenAt;
  return {
    id,
    kind: (raw?.kind || "legacy_profile") as IdentityAliasKind,
    evidence: (raw?.evidence || "legacy_profile_id") as IdentityEvidence,
    confidence: (raw?.confidence || "legacy") as IdentityConfidence,
    firstSeenAt,
    lastSeenAt,
  };
}

function normalizeRegistry(raw: any, accountUserId?: any): IdentityAliasRegistry {
  const base = emptyRegistry(accountUserId || raw?.accountUserId);
  if (!raw || typeof raw !== "object") return base;
  const profiles: Record<string, CanonicalIdentityRecord> = {};
  for (const [key, value] of Object.entries<any>(raw?.profiles || {})) {
    const canonicalProfileId = cleanId(value?.canonicalProfileId || key);
    if (!canonicalProfileId) continue;
    const aliases = (Array.isArray(value?.aliases) ? value.aliases : [])
      .map(normalizeAlias)
      .filter(Boolean) as IdentityAliasRecord[];
    profiles[canonicalProfileId] = {
      canonicalProfileId,
      aliases,
      accountUserIds: unique(Array.isArray(value?.accountUserIds) ? value.accountUserIds : []),
      observedNames: Array.from(new Set((Array.isArray(value?.observedNames) ? value.observedNames : []).map(cleanName).filter(Boolean))).slice(0, 16),
      createdAt: Number(value?.createdAt || 0) || now(),
      updatedAt: Number(value?.updatedAt || 0) || now(),
    };
  }
  const conflicts = (Array.isArray(raw?.conflicts) ? raw.conflicts : [])
    .map((entry: any) => ({
      aliasId: cleanId(entry?.aliasId),
      existingCanonicalProfileId: cleanId(entry?.existingCanonicalProfileId),
      attemptedCanonicalProfileId: cleanId(entry?.attemptedCanonicalProfileId),
      evidence: (entry?.evidence || "legacy_profile_id") as IdentityEvidence,
      detectedAt: Number(entry?.detectedAt || 0) || now(),
    }))
    .filter((entry: IdentityAliasConflict) => entry.aliasId && entry.existingCanonicalProfileId && entry.attemptedCanonicalProfileId)
    .slice(-200);
  return {
    _v: IDENTITY_ALIAS_REGISTRY_VERSION,
    accountUserId: cleanId(accountUserId || raw?.accountUserId) || null,
    profiles,
    conflicts,
    updatedAt: Number(raw?.updatedAt || 0) || now(),
  };
}

export function readIdentityAliasRegistry(accountUserId?: any): IdentityAliasRegistry {
  if (typeof localStorage === "undefined") return emptyRegistry(accountUserId);
  const key = identityAliasStorageKey(accountUserId);
  try {
    const raw = localStorage.getItem(key);
    return raw ? normalizeRegistry(JSON.parse(raw), accountUserId) : emptyRegistry(accountUserId);
  } catch {
    return emptyRegistry(accountUserId);
  }
}

function writeIdentityAliasRegistry(registry: IdentityAliasRegistry): void {
  if (typeof localStorage === "undefined") return;
  try {
    const persisted = { ...registry, updatedAt: now() };
    localStorage.setItem(identityAliasStorageKey(registry.accountUserId), JSON.stringify(persisted));
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(IDENTITY_ALIASES_UPDATED_EVENT, {
          detail: {
            accountUserId: persisted.accountUserId,
            updatedAt: persisted.updatedAt,
            canonicalProfiles: Object.keys(persisted.profiles || {}).length,
          },
        }));
      }
    } catch {}
  } catch (error) {
    console.warn("[identity] unable to persist alias registry", error);
  }
}

function aliasOwner(registry: IdentityAliasRegistry, aliasId: string): string {
  const id = cleanId(aliasId);
  if (!id) return "";
  for (const [canonicalProfileId, record] of Object.entries(registry.profiles)) {
    if (canonicalProfileId === id || record.aliases.some((alias) => alias.id === id)) return canonicalProfileId;
  }
  return "";
}

function recordConflict(
  registry: IdentityAliasRegistry,
  aliasId: string,
  existingCanonicalProfileId: string,
  attemptedCanonicalProfileId: string,
  evidence: IdentityEvidence,
): void {
  if (existingCanonicalProfileId === attemptedCanonicalProfileId) return;
  const duplicate = registry.conflicts.some((entry) =>
    entry.aliasId === aliasId &&
    entry.existingCanonicalProfileId === existingCanonicalProfileId &&
    entry.attemptedCanonicalProfileId === attemptedCanonicalProfileId
  );
  if (!duplicate) {
    registry.conflicts.push({ aliasId, existingCanonicalProfileId, attemptedCanonicalProfileId, evidence, detectedAt: now() });
    registry.conflicts = registry.conflicts.slice(-200);
  }
}

function addAlias(
  registry: IdentityAliasRegistry,
  canonicalProfileId: string,
  aliasId: string,
  kind: IdentityAliasKind,
  evidence: IdentityEvidence,
  confidence: IdentityConfidence,
): boolean {
  const canonicalId = cleanId(canonicalProfileId);
  const id = cleanId(aliasId);
  if (!canonicalId || !id) return false;

  const owner = aliasOwner(registry, id);
  if (owner && owner !== canonicalId) {
    recordConflict(registry, id, owner, canonicalId, evidence);
    return false;
  }

  const timestamp = now();
  const record = registry.profiles[canonicalId] || {
    canonicalProfileId: canonicalId,
    aliases: [],
    accountUserIds: [],
    observedNames: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const previous = record.aliases.find((alias) => alias.id === id);
  if (previous) {
    // Ne jamais dégrader une preuve déjà plus forte. Surtout, ne pas réécrire
    // lastSeenAt à chaque refresh auth : cela transformerait le registre en
    // source permanente de dirty-backups.
    const rank: Record<IdentityConfidence, number> = { legacy: 1, strong: 2, authoritative: 3 };
    if (rank[confidence] > rank[previous.confidence]) {
      previous.kind = kind;
      previous.evidence = evidence;
      previous.confidence = confidence;
      previous.lastSeenAt = timestamp;
      record.updatedAt = timestamp;
    }
  } else {
    record.aliases.push({ id, kind, evidence, confidence, firstSeenAt: timestamp, lastSeenAt: timestamp });
    record.updatedAt = timestamp;
  }
  registry.profiles[canonicalId] = record;
  return true;
}

function profilePrivateInfo(profile: any): Record<string, any> {
  return (profile?.privateInfo || profile?.private_info || {}) as Record<string, any>;
}

function absorbTechnicalAccountCanonical(
  registry: IdentityAliasRegistry,
  technicalId: string,
  canonicalProfileId: string,
): void {
  const oldId = cleanId(technicalId);
  const canonicalId = cleanId(canonicalProfileId);
  if (!oldId || !canonicalId || oldId === canonicalId) return;
  const old = registry.profiles[oldId];
  if (!old) return;
  // Seul un ancien profil technique dont l'id EST un id de compte peut être
  // absorbé automatiquement. On ne déplace jamais un vrai profileId humain.
  const isAccountTechnical = old.accountUserIds.includes(oldId) || registry.accountUserId === oldId;
  if (!isAccountTechnical) return;

  const timestamp = now();
  const target = registry.profiles[canonicalId] || {
    canonicalProfileId: canonicalId,
    aliases: [],
    accountUserIds: [],
    observedNames: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  registry.profiles[canonicalId] = target;
  delete registry.profiles[oldId];

  addAlias(registry, canonicalId, oldId, "technical", "technical_account_profile", "authoritative");
  for (const accountId of old.accountUserIds) {
    const accepted = addAlias(registry, canonicalId, accountId, "account", "account_binding", "authoritative");
    if (accepted && !target.accountUserIds.includes(accountId)) target.accountUserIds.push(accountId);
  }
  for (const alias of old.aliases) {
    if (alias.id === oldId) continue;
    addAlias(registry, canonicalId, alias.id, alias.kind, alias.evidence, alias.confidence);
  }
  target.observedNames = Array.from(new Set([...target.observedNames, ...old.observedNames])).slice(-16);
  target.updatedAt = timestamp;
}

export function registerCanonicalIdentity(input: RegisterCanonicalIdentityInput): IdentityAliasRegistry {
  const canonicalProfileId = cleanId(input?.canonicalProfileId);
  const accountUserId = cleanId(input?.accountUserId);
  const registry = readIdentityAliasRegistry(accountUserId);
  if (!canonicalProfileId) return registry;
  const before = JSON.stringify(registry);

  const canonicalSelfRegistered = addAlias(registry, canonicalProfileId, canonicalProfileId, "profile", "canonical_self", "authoritative");
  if (!canonicalSelfRegistered) {
    if (JSON.stringify(registry) !== before) {
      registry.updatedAt = now();
      writeIdentityAliasRegistry(registry);
    }
    return registry;
  }

  const record = registry.profiles[canonicalProfileId];
  const observedName = cleanName(input?.profile?.name || input?.profile?.nickname || "");
  if (observedName && !record.observedNames.includes(observedName)) {
    record.observedNames.push(observedName);
    record.observedNames = record.observedNames.slice(-16);
  }

  const pi = profilePrivateInfo(input?.profile);
  const accountIds = unique([
    accountUserId,
    ...(input?.accountIds || []),
    input?.profile?.onlineUserId,
    input?.profile?.online_user_id,
    input?.profile?.accountUserId,
    input?.profile?.account_user_id,
    pi?.onlineUserId,
    pi?.online_user_id,
    pi?.accountUserId,
    pi?.account_user_id,
    ...(Array.isArray(pi?.linkedAccountIds) ? pi.linkedAccountIds : []),
  ]);
  for (const id of accountIds) {
    if (id !== canonicalProfileId) absorbTechnicalAccountCanonical(registry, id, canonicalProfileId);
  }
  for (const id of accountIds) {
    const accepted = addAlias(registry, canonicalProfileId, id, "account", "account_binding", "authoritative");
    if (accepted && !record.accountUserIds.includes(id)) record.accountUserIds.push(id);
  }

  const linkedLocalIds = unique([
    ...(input?.legacyProfileIds || []),
    ...(Array.isArray(pi?.linkedLocalProfileIds) ? pi.linkedLocalProfileIds : []),
    ...(Array.isArray(input?.profile?.linkedLocalProfileIds) ? input.profile.linkedLocalProfileIds : []),
  ]).filter((id) => id !== canonicalProfileId && !accountIds.includes(id));
  for (const id of linkedLocalIds) {
    addAlias(registry, canonicalProfileId, id, id.startsWith("online:") ? "online_mirror" : "legacy_profile", "explicit_linked_local_id", "strong");
  }

  const legacyIds = unique([
    ...(Array.isArray(pi?.legacyProfileIds) ? pi.legacyProfileIds : []),
    ...(Array.isArray(input?.profile?.legacyProfileIds) ? input.profile.legacyProfileIds : []),
    pi?.legacyProfileId,
    input?.profile?.legacyProfileId,
  ]).filter((id) => id !== canonicalProfileId && !accountIds.includes(id));
  for (const id of legacyIds) {
    addAlias(registry, canonicalProfileId, id, "legacy_profile", "legacy_profile_id", "legacy");
  }

  const remoteCanonical = cleanId(input?.remoteCanonicalProfileId);
  if (remoteCanonical && remoteCanonical !== canonicalProfileId) {
    // Le remoteCanonicalProfileId est une preuve forte, mais s'il entre en
    // conflit avec un autre profil déjà enregistré on conserve le conflit au
    // lieu de déplacer l'alias automatiquement.
    addAlias(registry, canonicalProfileId, remoteCanonical, "legacy_profile", "remote_canonical_profile", "strong");
  }

  if (JSON.stringify(registry) !== before) {
    registry.updatedAt = now();
    writeIdentityAliasRegistry(registry);
  }
  return registry;
}

export function resolveCanonicalProfileIdFromAlias(aliasId: any, accountUserId?: any): string {
  const id = cleanId(aliasId);
  if (!id) return "";
  const registry = readIdentityAliasRegistry(accountUserId);
  return aliasOwner(registry, id) || "";
}

export function listIdentityIdsForCanonicalProfile(profileOrAliasId: any, accountUserId?: any): string[] {
  const id = cleanId(profileOrAliasId);
  if (!id) return [];

  const registries: IdentityAliasRegistry[] = [];
  const seenKeys = new Set<string>();
  const addRegistry = (uid?: any) => {
    const key = identityAliasStorageKey(uid);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    registries.push(readIdentityAliasRegistry(uid));
  };

  if (cleanId(accountUserId)) {
    addRegistry(accountUserId);
  } else {
    // Certains écrans (notamment Home/X01) ne connaissent pas encore l'UID du
    // compte au premier render. On peut néanmoins résoudre l'identité de manière
    // exacte en inspectant uniquement les registres WAVE 2 présents localement.
    // Aucun rapprochement par nom n'est effectué.
    addRegistry(undefined);
    try {
      if (typeof localStorage !== "undefined") {
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = String(localStorage.key(i) || "");
          if (!key.startsWith(`${IDENTITY_ALIAS_KEY_PREFIX}:`)) continue;
          const uid = key.slice(IDENTITY_ALIAS_KEY_PREFIX.length + 1);
          if (uid) addRegistry(uid);
        }
      }
    } catch {}
  }

  for (const registry of registries) {
    const canonical = aliasOwner(registry, id) || (registry.profiles[id] ? id : "");
    if (!canonical) continue;
    const record = registry.profiles[canonical];
    return unique([
      canonical,
      ...(record?.aliases || []).map((alias) => alias.id),
      ...(record?.accountUserIds || []),
    ]);
  }

  return [id];
}

export function canonicalizeProfileIdExact(aliasId: any, profileIds: any[], accountUserId?: any): string {
  const id = cleanId(aliasId);
  if (!id) return "";
  const knownProfiles = new Set((Array.isArray(profileIds) ? profileIds : []).map(cleanId).filter(Boolean));
  if (knownProfiles.has(id)) return id;
  const resolved = resolveCanonicalProfileIdFromAlias(id, accountUserId);
  return resolved && knownProfiles.has(resolved) ? resolved : id;
}

export type IdentityDiagnostics = {
  registryVersion: number;
  canonicalProfiles: number;
  aliases: number;
  conflicts: number;
  duplicateNames: Array<{ name: string; profileIds: string[] }>;
  unresolvedActiveProfileId: string | null;
};

export function buildIdentityDiagnostics(store: any, accountUserId?: any): IdentityDiagnostics {
  const profiles = (Array.isArray(store?.profiles) ? store.profiles : []).filter(Boolean);
  const registry = readIdentityAliasRegistry(accountUserId);
  const nameMap = new Map<string, string[]>();
  for (const profile of profiles) {
    const name = cleanName(profile?.name).toLocaleLowerCase();
    const id = cleanId(profile?.id);
    if (!name || !id) continue;
    const ids = nameMap.get(name) || [];
    ids.push(id);
    nameMap.set(name, ids);
  }
  const duplicateNames = Array.from(nameMap.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([name, profileIds]) => ({ name, profileIds }));
  const activeId = cleanId(store?.activeProfileId);
  const profileIds = new Set(profiles.map((profile: any) => cleanId(profile?.id)).filter(Boolean));
  return {
    registryVersion: IDENTITY_ALIAS_REGISTRY_VERSION,
    canonicalProfiles: Object.keys(registry.profiles).length,
    aliases: Object.values(registry.profiles).reduce((sum, record) => sum + record.aliases.length, 0),
    conflicts: registry.conflicts.length,
    duplicateNames,
    unresolvedActiveProfileId: activeId && !profileIds.has(activeId) ? activeId : null,
  };
}
