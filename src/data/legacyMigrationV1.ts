/**
 * WAVE 9 — analyse/migration legacy non destructive.
 *
 * Ce module est volontairement pur : il ne lit ni IndexedDB ni localStorage.
 * Il transforme un ancien backup en plan déterministe qui pourra ensuite être
 * appliqué par legacyMigrationRuntime.ts en mode merge.
 *
 * Règles de sûreté :
 * - aucun rapprochement par nom seul ;
 * - seuls les liens d'identité explicites (canonicalLocalProfileId,
 *   linkedLocalProfileIds, linkedAccountIds, accountIdentityAliases) créent un alias ;
 * - les tombstones History V4 gagnent toujours ;
 * - aucune ligne legacy ne remplace une partie canonique existante ;
 * - les lignes ambiguës restent migrables en statut incomplete ou sont mises en
 *   quarantaine lorsqu'une incohérence structurelle est détectée.
 */

export const LEGACY_MIGRATION_VERSION = 1 as const;
export const LEGACY_MIGRATION_JOURNAL_KEY_PREFIX = "dc_legacy_migration_v1";
export const LEGACY_MIGRATION_QUARANTINE_KEY = "dc_legacy_quarantine_v1";

export type LegacyMatchDisposition = "migrate" | "duplicate" | "repaired" | "incomplete" | "quarantined";

export type LegacyIdentityLink = {
  canonicalProfileId: string;
  aliasIds: string[];
  accountIds: string[];
  sourceProfileId: string;
  evidence: "explicit_canonical_profile";
};

export type LegacyProfileAction = {
  profileId: string;
  action: "import" | "canonical" | "alias-skip" | "quarantine";
  canonicalProfileId?: string;
  reason: string;
};

export type LegacyMatchAction = {
  matchId: string;
  disposition: LegacyMatchDisposition;
  reason: string;
  source: "history" | "stats-index";
  repairedPlayerIds?: Array<{ from: string; to: string }>;
  unresolvedPlayerIds?: string[];
  fingerprint?: string;
};

export type LegacyAgendaPlan = {
  sourceKeys: string[];
  recursiveKeys: string[];
  events: any[];
  duplicatesCollapsed: number;
};

export type LegacyMigrationPlan = {
  _v: typeof LEGACY_MIGRATION_VERSION;
  source: {
    format: "cloud-snapshot" | "cloud-backup" | "unknown";
    exportedAt: string | null;
    ownerUserId: string | null;
    fingerprint: string;
  };
  identityLinks: LegacyIdentityLink[];
  aliasMap: Record<string, string>;
  aliasConflicts: Array<{ aliasId: string; canonicalProfileIds: string[] }>;
  profiles: {
    importable: any[];
    actions: LegacyProfileAction[];
  };
  history: {
    acceptedRows: Record<string, any>;
    actions: LegacyMatchAction[];
    quarantinedRows: Record<string, any>;
  };
  agenda: LegacyAgendaPlan;
  portableLocalStorage: Record<string, string>;
  passthrough: {
    bots: any[];
    dartSets: any[];
    teams: any[];
    teamMedia: Record<string, any>;
    avatarGalleries: Record<string, any>;
    legacyAiGallery: any[];
    tournaments: any | null;
    running: any | null;
    userMediaFallbacks: any | null;
    avatarFallbacks: any | null;
  };
  summary: {
    profilesTotal: number;
    profilesImportable: number;
    profileAliasesSkipped: number;
    matchesTotal: number;
    migrate: number;
    duplicate: number;
    repaired: number;
    incomplete: number;
    quarantined: number;
    agendaSourceKeys: number;
    agendaRecursiveKeys: number;
    agendaEvents: number;
    agendaDuplicatesCollapsed: number;
  };
  warnings: string[];
};

export type LegacyMigrationAnalysisOptions = {
  currentAccountUserId?: string | null;
  currentProfileIds?: Iterable<any>;
  currentMatchIds?: Iterable<any>;
  currentMatchFingerprints?: Iterable<any>;
  currentTombstoneIds?: Iterable<any>;
  portableLocalStoragePredicate?: (key: string) => boolean;
};

function clean(value: any): string {
  return String(value ?? "").trim();
}

function unique(values: Iterable<any>): string[] {
  return Array.from(new Set(Array.from(values || []).map(clean).filter(Boolean)));
}

function safeObject(value: any): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function normalizeInput(input: any): { payload: any; format: LegacyMigrationPlan["source"]["format"] } {
  let raw = input;
  if (raw?.slot && raw?.payload) raw = raw.payload;
  if (raw?.payload && raw?.payload?._v != null && !raw?._v) raw = raw.payload;
  if (
    raw && typeof raw === "object" && typeof raw.version === "number" &&
    Array.isArray(raw.history) && Array.isArray(raw.localProfiles) && Array.isArray(raw.dartsets)
  ) {
    const rows: Record<string, any> = {};
    for (const row of raw.history) {
      const id = clean(row?.id || row?.matchId);
      if (id) rows[id] = row;
    }
    return {
      format: "cloud-backup",
      payload: {
        _v: 2,
        exportedAt: raw.exportedAt,
        localStorage: safeObject(raw?.appData?.localStorage),
        history: {
          _v: 1,
          rows,
          ...(raw?.historyV4?.schemaVersion === 4 ? {
            historySchemaVersion: 4,
            tombstones: safeObject(raw?.historyV4?.tombstones),
          } : {}),
        },
        portableAccountData: {
          _v: 1,
          profiles: raw.localProfiles,
          dartSets: raw.dartsets,
          bots: [],
          teams: [],
        },
        running: raw?.appData?.running || null,
      },
    };
  }
  return { payload: raw || {}, format: raw && typeof raw === "object" ? "cloud-snapshot" : "unknown" };
}

function extractStoreCandidates(payload: any): any[] {
  const idb = safeObject(payload?.idb);
  const out: any[] = [];
  for (const [key, value] of Object.entries<any>(idb)) {
    if (key === "store" || key.startsWith("store:")) {
      if (value && typeof value === "object") out.push(value);
    }
  }
  return out;
}

function scoreStore(store: any): number {
  const profiles = asArray(store?.profiles).length;
  const dartSets = asArray(store?.dartSets).length;
  const teams = asArray(store?.teams).length;
  const active = clean(store?.activeProfileId) ? 20 : 0;
  return profiles * 10 + dartSets * 3 + teams * 2 + active;
}

function bestStore(payload: any): any {
  const portable = safeObject(payload?.portableAccountData || payload?.portable_account_data);
  const candidates = extractStoreCandidates(payload);
  const synthetic = {
    profiles: asArray(portable.profiles),
    dartSets: asArray(portable.dartSets),
    teams: asArray(portable.teams),
    bots: asArray(portable.bots),
    activeProfileId: portable.activeProfileId,
  };
  candidates.push(synthetic);
  candidates.sort((a, b) => scoreStore(b) - scoreStore(a));
  return candidates[0] || synthetic;
}

function mergeProfileFillMissing(targetInput: any, sourceInput: any, allowAvatarUpgrade = true): any {
  const target = { ...(targetInput || {}) };
  const source = sourceInput || {};
  if (!clean(target?.id) && clean(source?.id)) target.id = clean(source.id);
  const targetUpdated = Number(target?.updatedAt || target?.avatarUpdatedAt || 0) || 0;
  const sourceUpdated = Number(source?.updatedAt || source?.avatarUpdatedAt || 0) || 0;
  for (const [key, value] of Object.entries<any>(source)) {
    if (key === "id") continue;
    const current = target[key];
    const currentEmpty = current == null || current === "" || (Array.isArray(current) && current.length === 0) || (typeof current === "object" && current && !Array.isArray(current) && Object.keys(current).length === 0);
    if (currentEmpty) target[key] = value;
  }
  target.privateInfo = { ...safeObject(source?.privateInfo), ...safeObject(target?.privateInfo) };
  target.preferences = { ...safeObject(source?.preferences), ...safeObject(target?.preferences) };
  target.collectibleCards = target?.collectibleCards || source?.collectibleCards;
  if (allowAvatarUpgrade && sourceUpdated > targetUpdated && clean(source?.avatarUrl)) {
    target.avatarUrl = source.avatarUrl;
    if (source.avatarPath) target.avatarPath = source.avatarPath;
    if (source.avatarUpdatedAt) target.avatarUpdatedAt = source.avatarUpdatedAt;
  }
  return target;
}

function extractProfiles(payload: any): any[] {
  const portable = safeObject(payload?.portableAccountData || payload?.portable_account_data);
  const store = bestStore(payload);
  const rows = asArray(portable?.profiles).length ? asArray(portable.profiles) : asArray(store?.profiles);
  const byId = new Map<string, any>();
  for (const raw of rows) {
    const id = clean(raw?.id);
    if (!id) continue;
    const next = { ...(raw || {}), id };
    byId.set(id, byId.has(id) ? mergeProfileFillMissing(byId.get(id), next) : next);
  }
  return Array.from(byId.values());
}

function explicitIdentityLinks(profiles: any[], payload: any): {
  links: LegacyIdentityLink[];
  aliasMap: Record<string, string>;
  conflicts: Array<{ aliasId: string; canonicalProfileIds: string[] }>;
} {
  const profileIds = new Set(profiles.map((profile) => clean(profile?.id)).filter(Boolean));
  const claims = new Map<string, Set<string>>();
  const links: LegacyIdentityLink[] = [];
  const ownerId = clean(payload?.portableAccountData?.userId || payload?.portable_account_data?.userId || payload?.backupManifest?.userId);

  for (const profile of profiles) {
    const id = clean(profile?.id);
    if (!id) continue;
    const pi = safeObject(profile?.privateInfo || profile?.private_info);
    const canonical = clean(pi?.canonicalLocalProfileId || profile?.canonicalLocalProfileId);
    if (!canonical || !profileIds.has(canonical)) continue;

    const aliasIds = unique([
      ...(id !== canonical ? [id] : []),
      ...asArray(pi?.linkedLocalProfileIds),
      ...asArray(profile?.linkedLocalProfileIds),
      ...asArray(pi?.accountIdentityAliases),
      ...asArray(profile?.accountIdentityAliases),
      ...asArray(pi?.legacyProfileIds),
      ...asArray(profile?.legacyProfileIds),
      pi?.legacyProfileId,
      profile?.legacyProfileId,
    ]).filter((value) => value !== canonical);

    const accountIds = unique([
      pi?.accountUserId,
      profile?.accountUserId,
      ...asArray(pi?.linkedAccountIds),
      ...asArray(profile?.linkedAccountIds),
      pi?.onlineUserId === ownerId ? pi?.onlineUserId : null,
      profile?.onlineUserId === ownerId ? profile?.onlineUserId : null,
    ]).filter((value) => value !== canonical);

    const allClaims = unique([...aliasIds, ...accountIds]);
    for (const alias of allClaims) {
      if (!claims.has(alias)) claims.set(alias, new Set());
      claims.get(alias)!.add(canonical);
    }
    links.push({ canonicalProfileId: canonical, aliasIds, accountIds, sourceProfileId: id, evidence: "explicit_canonical_profile" });
  }

  const aliasMap: Record<string, string> = {};
  const conflicts: Array<{ aliasId: string; canonicalProfileIds: string[] }> = [];
  for (const [aliasId, owners] of claims.entries()) {
    const ownerIds = Array.from(owners);
    if (ownerIds.length === 1 && profileIds.has(ownerIds[0])) aliasMap[aliasId] = ownerIds[0];
    else if (ownerIds.length > 1) conflicts.push({ aliasId, canonicalProfileIds: ownerIds.sort() });
  }
  return { links, aliasMap, conflicts };
}

function rewriteIdentityValue(value: any, aliasMap: Record<string, string>, repairs: Array<{ from: string; to: string }>): any {
  const id = clean(value);
  if (!id) return value;
  const canonical = clean(aliasMap[id]);
  if (!canonical || canonical === id) return value;
  if (!repairs.some((entry) => entry.from === id && entry.to === canonical)) repairs.push({ from: id, to: canonical });
  return canonical;
}

const ID_FIELDS = new Set(["playerId", "profileId", "winnerId", "captainId", "shooterId", "ownerProfileId"]);
const PLAYER_ARRAY_KEYS = new Set(["players", "participants", "ranking", "rankings"]);
const PLAYER_KEYED_OBJECTS = new Set(["statsByPlayer", "playerStats", "scoresByPlayer", "resultsByPlayer", "scoreTimelineById"]);

function rewriteKnownIdentityFields(value: any, aliasMap: Record<string, string>, repairs: Array<{ from: string; to: string }>, parentKey = ""): any {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteKnownIdentityFields(item, aliasMap, repairs, parentKey));
  }
  if (!value || typeof value !== "object") return value;
  const out: Record<string, any> = {};
  for (const [key, raw] of Object.entries<any>(value)) {
    if (ID_FIELDS.has(key)) {
      out[key] = rewriteIdentityValue(raw, aliasMap, repairs);
      continue;
    }
    if (key === "id" && PLAYER_ARRAY_KEYS.has(parentKey)) {
      out[key] = rewriteIdentityValue(raw, aliasMap, repairs);
      continue;
    }
    if (PLAYER_KEYED_OBJECTS.has(key) && raw && typeof raw === "object" && !Array.isArray(raw)) {
      const keyed: Record<string, any> = {};
      for (const [playerId, playerValue] of Object.entries<any>(raw)) {
        const canonical = rewriteIdentityValue(playerId, aliasMap, repairs);
        keyed[canonical] = keyed[canonical] && typeof keyed[canonical] === "object" && typeof playerValue === "object"
          ? { ...keyed[canonical], ...rewriteKnownIdentityFields(playerValue, aliasMap, repairs, key) }
          : rewriteKnownIdentityFields(playerValue, aliasMap, repairs, key);
      }
      out[key] = keyed;
      continue;
    }
    out[key] = rewriteKnownIdentityFields(raw, aliasMap, repairs, key);
  }
  return out;
}

function historyRowsFromStatsIndex(payload: any): Record<string, any> {
  const idb = safeObject(payload?.idb);
  const candidates = Object.entries<any>(idb)
    .filter(([key, value]) => key === "dc_stats_index_v2" || key.startsWith("dc_stats_index_v2:"))
    .map(([, value]) => value)
    .filter((value) => value && typeof value === "object")
    .sort((a, b) => Number(b?.meta?.rowsScanned || b?.totals?.matches || 0) - Number(a?.meta?.rowsScanned || a?.totals?.matches || 0));
  const best = candidates[0];
  if (!best) return {};
  const rows: Record<string, any> = {};
  const matchIdsByMode = safeObject(best?.matchIdsByMode);
  for (const [mode, idsRaw] of Object.entries<any>(matchIdsByMode)) {
    for (const idRaw of asArray(idsRaw)) {
      const id = clean(idRaw);
      if (!id || rows[id]) continue;
      rows[id] = {
        id,
        matchId: id,
        mode,
        kind: mode,
        status: "finished",
        legacyMigration: { statsOnly: true, source: "dc_stats_index_v2" },
        summary: { finished: true, restoredFromStatsIndex: true },
      };
    }
  }
  return rows;
}

function extractHistoryRows(payload: any): { rows: Record<string, any>; source: "history" | "stats-index" } {
  const direct = safeObject(payload?.history?.rows);
  if (Object.keys(direct).length) return { rows: direct, source: "history" };
  return { rows: historyRowsFromStatsIndex(payload), source: "stats-index" };
}

function normalizedMode(row: any): string {
  const raw = row?.mode;
  if (typeof raw === "string" && raw.trim() && !raw.trim().startsWith("{")) return raw.trim().toLowerCase();
  if (raw && typeof raw === "object") return clean(raw?.mode || raw?.variant || row?.game || row?.kind || "unknown").toLowerCase() || "unknown";
  const config = row?.config;
  if (config && typeof config === "object") return clean(config?.mode || config?.variant || row?.game || row?.kind || "unknown").toLowerCase() || "unknown";
  return clean(row?.game || row?.kind || "unknown").toLowerCase() || "unknown";
}

function normalizedTimestamp(row: any): number {
  for (const value of [row?.createdAt, row?.finishedAt, row?.updatedAt, row?.startedAt, row?.timestamp]) {
    const num = Number(value || 0);
    if (Number.isFinite(num) && num > 0) return num;
    const parsed = Date.parse(String(value || ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function extractPlayerRefs(row: any): Array<{ id: string; name: string }> {
  const out: Array<{ id: string; name: string }> = [];
  const add = (player: any) => {
    const id = clean(player?.profileId || player?.playerId || player?.id || player?.uid);
    const name = clean(player?.name || player?.displayName || player?.nickname);
    if (id && !out.some((entry) => entry.id === id)) out.push({ id, name });
  };
  for (const player of asArray(row?.players)) add(player);
  for (const player of asArray(row?.summary?.players)) add(player);
  return out;
}

function isTemporaryPlayerId(idInput: any): boolean {
  const id = clean(idInput).toLowerCase();
  return /^quick[-_:]/.test(id) || /^j\d+$/.test(id) || /^guest[-_:]/.test(id) || /^temp[-_:]/.test(id) || /^bss_/.test(id) || /^bot[-_:]/.test(id) || /^cpu[-_:]/.test(id);
}

function tinyHash(input: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0");
}

export function legacyMatchFingerprint(row: any): string {
  const players = extractPlayerRefs(row)
    .map((entry) => `${entry.id}:${entry.name.toLocaleLowerCase()}`)
    .sort();
  const basis = [
    normalizedMode(row),
    normalizedTimestamp(row),
    clean(row?.winnerId || row?.summary?.winnerId),
    players.join("|"),
    clean(row?.id || row?.matchId),
  ].join("::");
  return tinyHash(basis);
}

function analyzeHistory(
  payload: any,
  aliasMap: Record<string, string>,
  knownProfileIds: Set<string>,
  options: LegacyMigrationAnalysisOptions,
): LegacyMigrationPlan["history"] {
  const { rows, source } = extractHistoryRows(payload);
  const currentIds = new Set(unique(options?.currentMatchIds || []));
  const currentFingerprints = new Set(unique(options?.currentMatchFingerprints || []));
  const tombstones = new Set(unique(options?.currentTombstoneIds || []));
  const acceptedRows: Record<string, any> = {};
  const quarantinedRows: Record<string, any> = {};
  const actions: LegacyMatchAction[] = [];

  for (const [key, rawInput] of Object.entries<any>(rows)) {
    const raw = rawInput && typeof rawInput === "object" ? rawInput : {};
    const id = clean(raw?.id || raw?.matchId || key);
    if (!id) {
      const qid = `legacy-no-id-${Object.keys(quarantinedRows).length + 1}`;
      quarantinedRows[qid] = raw;
      actions.push({ matchId: qid, disposition: "quarantined", reason: "missing-match-id", source });
      continue;
    }
    if (tombstones.has(id)) {
      quarantinedRows[id] = raw;
      actions.push({ matchId: id, disposition: "quarantined", reason: "canonical-tombstone-wins", source });
      continue;
    }

    const repairs: Array<{ from: string; to: string }> = [];
    const rewritten = rewriteKnownIdentityFields({ ...raw, id, matchId: clean(raw?.matchId || id) || id }, aliasMap, repairs);
    const fp = legacyMatchFingerprint(rewritten);
    if (currentIds.has(id) || currentFingerprints.has(fp)) {
      actions.push({ matchId: id, disposition: "duplicate", reason: currentIds.has(id) ? "same-match-id-already-canonical" : "same-structural-fingerprint", source, fingerprint: fp });
      continue;
    }

    const refs = extractPlayerRefs(rewritten);
    const unresolved = unique(refs
      .map((entry) => entry.id)
      .filter((playerId) => playerId && !knownProfileIds.has(playerId) && !isTemporaryPlayerId(playerId)));

    let disposition: LegacyMatchDisposition = "migrate";
    let reason = "legacy-row-valid";
    if (source === "stats-index" || raw?.legacyMigration?.statsOnly) {
      disposition = "incomplete";
      reason = "stats-index-only-no-original-payload";
    } else if (unresolved.length) {
      disposition = "incomplete";
      reason = "unresolved-player-id-preserved";
    } else if (repairs.length) {
      disposition = "repaired";
      reason = "explicit-identity-alias-rewritten";
    }

    const mode = normalizedMode(rewritten);
    if ((!clean(rewritten?.mode) || typeof rewritten?.mode === "object") && mode && mode !== "unknown") {
      rewritten.legacyMode = rewritten.mode;
      rewritten.mode = mode;
      if (disposition === "migrate") {
        disposition = "repaired";
        reason = "legacy-mode-normalized";
      }
    }

    rewritten.legacyMigration = {
      ...(safeObject(rewritten?.legacyMigration)),
      version: LEGACY_MIGRATION_VERSION,
      disposition,
      migratedFrom: source,
      repairedPlayerIds: repairs,
      unresolvedPlayerIds: unresolved,
    };
    acceptedRows[id] = rewritten;
    actions.push({ matchId: id, disposition, reason, source, repairedPlayerIds: repairs.length ? repairs : undefined, unresolvedPlayerIds: unresolved.length ? unresolved : undefined, fingerprint: fp });
  }

  return { acceptedRows, actions, quarantinedRows };
}

function analyzeAgenda(payload: any): LegacyAgendaPlan {
  const idb = safeObject(payload?.idb);
  const sourceKeys = Object.keys(idb).filter((key) => key === "mss-multisport-agenda-v2" || key.startsWith("mss-multisport-agenda-v2:"));
  const recursiveKeys = sourceKeys.filter((key) => key.split(":").length > 2);
  const byId = new Map<string, any>();
  let total = 0;
  for (const key of sourceKeys) {
    for (const raw of asArray(idb[key])) {
      const id = clean(raw?.id);
      if (!id) continue;
      total += 1;
      const previous = byId.get(id);
      const prevTs = Number(previous?.updatedAt || previous?.createdAt || 0) || 0;
      const nextTs = Number(raw?.updatedAt || raw?.createdAt || 0) || 0;
      if (!previous || nextTs >= prevTs) byId.set(id, { ...(raw || {}), id });
    }
  }
  const events = Array.from(byId.values()).sort((a, b) => Number(a?.startAt || 0) - Number(b?.startAt || 0));
  return { sourceKeys, recursiveKeys, events, duplicatesCollapsed: Math.max(0, total - events.length) };
}

function buildProfilePlan(profiles: any[], aliasMap: Record<string, string>, currentProfileIds: Set<string>): LegacyMigrationPlan["profiles"] {
  const byId = new Map(profiles.map((profile) => [clean(profile?.id), profile]));
  const importableById = new Map<string, any>();
  const actions: LegacyProfileAction[] = [];

  // Passe 1 : les vrais profils/canoniques constituent toujours la base. Un
  // ancien alias ne doit jamais écraser un avatar, une préférence ou un champ
  // d'identité plus récent du profil canonique simplement parce qu'il apparaît
  // plus tôt dans le tableau legacy.
  for (const profile of profiles) {
    const id = clean(profile?.id);
    if (!id) continue;
    const canonical = clean(aliasMap[id]);
    if (canonical && canonical !== id) {
      actions.push({ profileId: id, action: "alias-skip", canonicalProfileId: canonical, reason: "explicit-alias-of-canonical-profile" });
      continue;
    }
    importableById.set(id, mergeProfileFillMissing(importableById.get(id) || profile, profile));
    actions.push({
      profileId: id,
      action: currentProfileIds.has(id) ? "canonical" : "import",
      canonicalProfileId: id,
      reason: currentProfileIds.has(id) ? "same-profile-id-already-present" : "stable-legacy-profile-id",
    });
  }

  // Passe 2 : les profils techniques/anciens servent uniquement à combler les
  // trous du canonique et à enrichir legacyProfileIds. Ils ne prennent jamais
  // priorité sur les valeurs canoniques déjà présentes.
  for (const profile of profiles) {
    const id = clean(profile?.id);
    const canonical = clean(aliasMap[id]);
    if (!id || !canonical || canonical === id) continue;
    const canonicalProfile = byId.get(canonical);
    if (!canonicalProfile) continue;
    const target = importableById.get(canonical) || { ...canonicalProfile };
    const merged = mergeProfileFillMissing(target, profile, false);
    const pi = safeObject(merged.privateInfo);
    merged.privateInfo = {
      ...pi,
      legacyProfileIds: unique([...(asArray(pi.legacyProfileIds)), id]),
    };
    importableById.set(canonical, merged);
  }

  return { importable: Array.from(importableById.values()), actions };
}

function portableLocalStorage(payload: any, predicate?: (key: string) => boolean): Record<string, string> {
  const input = safeObject(payload?.localStorage);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries<any>(input)) {
    if (predicate && !predicate(key)) continue;
    if (typeof value === "string") out[key] = value;
    else {
      try { out[key] = JSON.stringify(value); } catch {}
    }
  }
  return out;
}

function sourceFingerprint(payload: any, format: LegacyMigrationPlan["source"]["format"], historyRows: Record<string, any>, profiles: any[]): string {
  const owner = clean(payload?.portableAccountData?.userId || payload?.portable_account_data?.userId || payload?.backupManifest?.userId);
  const exportedAt = clean(payload?.exportedAt || payload?.backupManifest?.createdAt);
  const matchIds = Object.keys(historyRows).sort();
  const profileIds = profiles.map((profile) => clean(profile?.id)).filter(Boolean).sort();
  return `legacy-v1-${tinyHash([format, owner, exportedAt, matchIds.join(","), profileIds.join(",")].join("|"))}`;
}

export function legacyMigrationJournalKey(accountUserId?: any): string {
  const uid = clean(accountUserId);
  return uid ? `${LEGACY_MIGRATION_JOURNAL_KEY_PREFIX}:${uid}` : LEGACY_MIGRATION_JOURNAL_KEY_PREFIX;
}

export function isLegacyMigrationCandidate(input: any): boolean {
  const { payload, format } = normalizeInput(input);
  if (format === "unknown" || !payload || typeof payload !== "object") return false;
  if (payload?.format === "mss-backup-artifact" || payload?.artifactType === "mss-canonical-backup") return false;
  if (Number(payload?.backupManifest?._v || 0) >= 2) return false;
  if (format === "cloud-backup") return true;
  return !!(
    Object.keys(safeObject(payload?.history?.rows)).length ||
    asArray(payload?.portableAccountData?.profiles).length ||
    asArray(payload?.portable_account_data?.profiles).length ||
    Object.keys(safeObject(payload?.idb)).some((key) => key === "store" || key.startsWith("store:") || key.startsWith("dc_stats_index_v2"))
  );
}

export function analyzeLegacySnapshot(input: any, options: LegacyMigrationAnalysisOptions = {}): LegacyMigrationPlan {
  const normalized = normalizeInput(input);
  const payload = normalized.payload;
  const profiles = extractProfiles(payload);
  const currentProfileIds = new Set(unique(options.currentProfileIds || []));
  const identity = explicitIdentityLinks(profiles, payload);
  const profilePlan = buildProfilePlan(profiles, identity.aliasMap, currentProfileIds);
  const knownProfileIds = new Set<string>([
    ...currentProfileIds,
    ...profilePlan.importable.map((profile) => clean(profile?.id)).filter(Boolean),
    ...Object.values(identity.aliasMap).map(clean).filter(Boolean),
  ]);
  const history = analyzeHistory(payload, identity.aliasMap, knownProfileIds, options);
  const agenda = analyzeAgenda(payload);
  const sourceRows = extractHistoryRows(payload).rows;
  const portable = safeObject(payload?.portableAccountData || payload?.portable_account_data);
  const store = bestStore(payload);
  const warnings: string[] = [];
  if (identity.conflicts.length) warnings.push(`${identity.conflicts.length} conflit(s) d'alias explicite mis en quarantaine.`);
  const incompleteCount = history.actions.filter((action) => action.disposition === "incomplete").length;
  if (incompleteCount) warnings.push(`${incompleteCount} partie(s) conservée(s) comme incomplète(s) sans inventer de données.`);
  if (agenda.recursiveKeys.length) warnings.push(`${agenda.recursiveKeys.length} clé(s) Agenda récursive(s) seront consolidées en un seul dataset canonique.`);

  const counts = (disposition: LegacyMatchDisposition) => history.actions.filter((action) => action.disposition === disposition).length;
  const source = {
    format: normalized.format,
    exportedAt: clean(payload?.exportedAt || payload?.backupManifest?.createdAt) || null,
    ownerUserId: clean(portable?.userId || payload?.backupManifest?.userId) || null,
    fingerprint: sourceFingerprint(payload, normalized.format, sourceRows, profiles),
  } as const;

  return {
    _v: LEGACY_MIGRATION_VERSION,
    source,
    identityLinks: identity.links,
    aliasMap: identity.aliasMap,
    aliasConflicts: identity.conflicts,
    profiles: profilePlan,
    history,
    agenda,
    portableLocalStorage: portableLocalStorage(payload, options.portableLocalStoragePredicate),
    passthrough: {
      bots: asArray(portable?.bots || store?.bots),
      dartSets: asArray(portable?.dartSets || store?.dartSets),
      teams: asArray(portable?.teams || store?.teams || payload?.teams),
      teamMedia: safeObject(portable?.teamMedia),
      avatarGalleries: safeObject(portable?.avatarGalleries),
      legacyAiGallery: asArray(portable?.legacyAiGallery),
      tournaments: payload?.tournaments || payload?.competitions || portable?.tournaments || null,
      running: payload?.running || payload?.outdoorActivities || null,
      userMediaFallbacks: payload?.userMediaFallbacks || payload?.user_media_fallbacks || null,
      avatarFallbacks: payload?.avatarFallbacks || payload?.avatar_fallbacks || null,
    },
    summary: {
      profilesTotal: profiles.length,
      profilesImportable: profilePlan.importable.length,
      profileAliasesSkipped: profilePlan.actions.filter((action) => action.action === "alias-skip").length,
      matchesTotal: history.actions.length,
      migrate: counts("migrate"),
      duplicate: counts("duplicate"),
      repaired: counts("repaired"),
      incomplete: counts("incomplete"),
      quarantined: counts("quarantined"),
      agendaSourceKeys: agenda.sourceKeys.length,
      agendaRecursiveKeys: agenda.recursiveKeys.length,
      agendaEvents: agenda.events.length,
      agendaDuplicatesCollapsed: agenda.duplicatesCollapsed,
    },
    warnings,
  };
}

export function buildLegacyMigrationSnapshot(plan: LegacyMigrationPlan, originalInput?: any): any {
  const normalized = normalizeInput(originalInput || {});
  const originalPayload = normalized.payload;
  const portableOriginal = safeObject(originalPayload?.portableAccountData || originalPayload?.portable_account_data);
  const activeRaw = clean(portableOriginal?.activeProfileId || bestStore(originalPayload)?.activeProfileId);
  const activeProfileId = clean(plan.aliasMap[activeRaw] || activeRaw) || null;
  const importableIds = new Set(plan.profiles.importable.map((profile) => clean(profile?.id)).filter(Boolean));
  const safeActive = activeProfileId && importableIds.has(activeProfileId) ? activeProfileId : null;

  const portable = {
    _v: Math.max(1, Number(portableOriginal?._v || 1)),
    exportedAt: plan.source.exportedAt || new Date().toISOString(),
    userId: plan.source.ownerUserId,
    activeProfileId: safeActive,
    profiles: plan.profiles.importable,
    bots: plan.passthrough.bots,
    dartSets: plan.passthrough.dartSets,
    teams: plan.passthrough.teams,
    teamMedia: plan.passthrough.teamMedia,
    avatarGalleries: plan.passthrough.avatarGalleries,
    legacyAiGallery: plan.passthrough.legacyAiGallery,
    tournaments: plan.passthrough.tournaments,
    counts: {
      profiles: plan.profiles.importable.length,
      bots: plan.passthrough.bots.length,
      dartSets: plan.passthrough.dartSets.length,
      teams: plan.passthrough.teams.length,
      tournaments: Number(plan.passthrough.tournaments?.counts?.tournaments || plan.passthrough.tournaments?.tournaments?.length || 0) || 0,
    },
  };

  return {
    _v: 2,
    idb: {},
    localStorage: plan.portableLocalStorage,
    history: {
      _v: 1,
      rows: plan.history.acceptedRows,
      historySchemaVersion: 4,
      tombstones: {},
    },
    tournaments: plan.passthrough.tournaments || undefined,
    competitions: plan.passthrough.tournaments || undefined,
    running: plan.passthrough.running || undefined,
    outdoorActivities: plan.passthrough.running || undefined,
    portableAccountData: portable,
    userMediaFallbacks: plan.passthrough.userMediaFallbacks || undefined,
    avatarFallbacks: plan.passthrough.avatarFallbacks || undefined,
    exportedAt: plan.source.exportedAt || new Date().toISOString(),
    legacyMigration: {
      _v: LEGACY_MIGRATION_VERSION,
      sourceFingerprint: plan.source.fingerprint,
      summary: plan.summary,
      warnings: plan.warnings,
    },
  };
}
