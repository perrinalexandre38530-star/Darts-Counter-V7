import {
  DATA_REGISTRY,
  classifyPersistentKey,
  looksLikePersistentUserKey,
  persistentLocalStorageRule,
  type DataDomainId,
} from "./dataRegistry";
import { organizationManagedTeams } from "./organizationDataBoundary";

export type BackupDomainManifestV2 = {
  id: DataDomainId;
  label: string;
  schemaVersion: number;
  authority: string;
  required: boolean;
  status: "ok" | "empty" | "warning" | "missing";
  count: number;
  storageKeys: string[];
  warnings: string[];
};

export type BackupManifestV2 = {
  _v: 2;
  registryVersion: 3;
  schemaVersion: 2;
  userId: string | null;
  createdAt: string;
  status: "ok" | "warning" | "invalid";
  domains: Record<DataDomainId, BackupDomainManifestV2>;
  coverage: {
    persistentKeys: number;
    classifiedKeys: number;
    unclassifiedKeys: number;
    unclassifiedKeySample: string[];
    recursiveScopedKeys: number;
    recursiveScopedKeySample: string[];
    runtimePersistentKeys: number;
    runtimeExcludedKeys: number;
    runtimeExcludedKeySample: string[];
    runtimeNonPortableKeys: number;
    runtimeNonPortableKeySample: string[];
    runtimeUnregisteredKeys: number;
    runtimeUnregisteredKeySample: string[];
  };
  structuralChecksum: string;
  checksumMode: "structure-v1";
  warnings: string[];
};

export type BackupManifestValidation = {
  ok: boolean;
  legacy: boolean;
  errors: string[];
  warnings: string[];
};

const ACCOUNT_TOKEN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|usr_[a-z0-9_-]{8,})$/i;

function recursiveScopeDepth(keyInput: string): number {
  const parts = String(keyInput || "").split(":").slice(1).filter(Boolean);
  return parts.filter((part) => ACCOUNT_TOKEN.test(part)).length;
}

function commonEntityIds(value: any): string[] {
  const out = new Set<string>();
  const pushRow = (row: any) => {
    if (!row || typeof row !== "object") return;
    const id = String(row?.id || row?.matchId || row?.profileId || row?.playerId || row?.teamId || row?.routeId || "").trim();
    if (id) out.add(id);
  };
  const pushList = (rows: any) => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) pushRow(row);
  };

  if (Array.isArray(value)) pushList(value);
  else if (value && typeof value === "object") {
    for (const key of ["items", "rows", "sessions", "activities", "routes", "drafts", "profiles", "bots", "dartSets", "teams", "tournaments", "events"]) {
      const candidate = value?.[key];
      if (Array.isArray(candidate)) pushList(candidate);
      else if (candidate && typeof candidate === "object" && key === "rows") {
        for (const [rowId, row] of Object.entries<any>(candidate)) {
          const id = String((row as any)?.id || (row as any)?.matchId || rowId || "").trim();
          if (id) out.add(id);
        }
      }
    }
  }
  return Array.from(out);
}

function shallowCount(value: any): number {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return 0;
  for (const key of ["rows", "items", "sessions", "activities", "routes", "drafts", "profiles", "bots", "dartSets", "teams", "tournaments", "events"]) {
    const candidate = value?.[key];
    if (Array.isArray(candidate)) return candidate.length;
    if (candidate && typeof candidate === "object") return Object.keys(candidate).length;
  }
  const matches = Number(value?.totals?.matches || value?.matches || 0);
  return Number.isFinite(matches) && matches > 0 ? Math.floor(matches) : 0;
}

function parseLocalStorageValue(raw: any): any {
  if (typeof raw !== "string") return raw;
  const text = raw.trim();
  if (!text || (text[0] !== "[" && text[0] !== "{")) return raw;
  // WAVE 1 doit rester un diagnostic léger. Les gros blobs sont comptés par clé,
  // pas reparsés une seconde fois juste pour produire le manifeste.
  if (text.length > 1_000_000) return raw;
  try { return JSON.parse(text); } catch { return raw; }
}

async function sha256Hex(text: string): Promise<string> {
  try {
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }
  } catch {}
  // Fallback déterministe non cryptographique uniquement pour environnements de test.
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function newDomainState() {
  const domains = {} as Record<DataDomainId, BackupDomainManifestV2>;
  for (const definition of DATA_REGISTRY) {
    domains[definition.id] = {
      id: definition.id,
      label: definition.label,
      schemaVersion: definition.schemaVersion,
      authority: definition.authority,
      required: definition.requiredForPortableBackup,
      status: "empty",
      count: 0,
      storageKeys: [],
      warnings: [],
    };
  }
  return domains;
}

function addCount(domain: BackupDomainManifestV2, value: number) {
  const n = Number(value || 0);
  if (Number.isFinite(n) && n > domain.count) domain.count = Math.floor(n);
}

function addKey(domain: BackupDomainManifestV2, key: string) {
  if (!domain.storageKeys.includes(key)) domain.storageKeys.push(key);
}

function explicitPortableCounts(snapshot: any, domains: Record<DataDomainId, BackupDomainManifestV2>) {
  const portable = snapshot?.portableAccountData && typeof snapshot.portableAccountData === "object"
    ? snapshot.portableAccountData
    : null;
  if (portable) {
    addCount(domains.profiles, Number(portable?.counts?.profiles || portable?.profiles?.length || 0));
    addCount(domains.bots, Number(portable?.counts?.bots || portable?.bots?.length || 0));
    addCount(domains.dart_sets, Number(portable?.counts?.dartSets || portable?.dartSets?.length || 0));
    addCount(domains.teams, Number(portable?.counts?.teams || portable?.teams?.length || 0));
    addCount(domains.tournaments, Number(portable?.counts?.tournaments || portable?.tournaments?.tournaments?.length || 0));
    addCount(domains.media, Number(portable?.counts?.galleryItems || 0));
    addKey(domains.profiles, "portableAccountData.profiles");
    addKey(domains.bots, "portableAccountData.bots");
    addKey(domains.dart_sets, "portableAccountData.dartSets");
    addKey(domains.teams, "portableAccountData.teams");
  }

  const historyRows = snapshot?.history?.rows && typeof snapshot.history.rows === "object"
    ? Object.keys(snapshot.history.rows).length
    : 0;
  addCount(domains.history, historyRows);
  if (snapshot?.history) addKey(domains.history, "history.rows");
  const historyTombstones = snapshot?.history?.tombstones && typeof snapshot.history.tombstones === "object"
    ? Object.keys(snapshot.history.tombstones).length
    : 0;
  if (historyTombstones > 0) addKey(domains.history, "history.tombstones");
  if (snapshot?.history && Number(snapshot?.history?.historySchemaVersion || 0) !== 4) {
    domains.history.warnings.push("Snapshot History encore au format legacy : History V4 sera backfillé à la restauration.");
  }

  // WAVE 3 — vérifier que les entités portant un média exposent une référence
  // canonique. On ne rend pas le snapshot invalide tant que Media Vault V2
  // n'est pas déployé, mais le manifeste ne doit plus masquer ces trous.
  const portableBots = Array.isArray(portable?.bots) ? portable.bots : [];
  const portableDartSets = Array.isArray(portable?.dartSets) ? portable.dartSets : [];
  const portableTeams = Array.isArray(portable?.teams) ? portable.teams : [];
  let missingBotMediaRefs = 0;
  let missingDartSetMediaRefs = 0;
  let missingTeamMediaRefs = 0;
  for (const bot of portableBots) {
    const hasAvatar = Boolean(bot?.avatarAssetId || bot?.avatarThumbAssetId || bot?.avatarFullAssetId || bot?.avatarCastAssetId || bot?.avatarUrl || bot?.avatarDataUrl);
    if (hasAvatar && !String(bot?.avatarMediaKey || "").trim()) missingBotMediaRefs += 1;
  }
  for (const set of portableDartSets) {
    const hasPhoto = set?.kind === "photo" || Boolean(set?.mainImageAssetId || set?.thumbImageAssetId || set?.photoAssetId || set?.photoDataUrl || set?.mainImageDataUrl);
    if (hasPhoto && !String(set?.mainMediaKey || set?.r2MainMediaKey || "").trim()) missingDartSetMediaRefs += 1;
  }
  for (const team of portableTeams) {
    const libraryLogo = Boolean(team?.logoLibraryId || team?.logoLibraryFileName);
    const hasCustomLogo = !libraryLogo && Boolean(team?.logoAssetId || team?.logoUrl || team?.logoDataUrl || team?.avatarUrl || team?.imageUrl);
    const hasCover = Boolean(team?.coverAssetId || team?.coverUrl || team?.coverDataUrl);
    if (hasCustomLogo && !String(team?.logoMediaKey || "").trim()) missingTeamMediaRefs += 1;
    if (hasCover && !String(team?.coverMediaKey || "").trim()) missingTeamMediaRefs += 1;
  }
  if (missingBotMediaRefs) domains.bots.warnings.push(`${missingBotMediaRefs} BOT(s) avec avatar sans avatarMediaKey canonique.`);
  if (missingDartSetMediaRefs) domains.dart_sets.warnings.push(`${missingDartSetMediaRefs} DartSet(s) photo sans mainMediaKey canonique.`);
  if (missingTeamMediaRefs) domains.teams.warnings.push(`${missingTeamMediaRefs} média(s) Team sans clé canonique.`);

  const mediaVaultV2Assets = snapshot?.mediaVaultV2?.assets && typeof snapshot.mediaVaultV2.assets === "object"
    ? Object.keys(snapshot.mediaVaultV2.assets).length
    : 0;
  const mediaVaultV2Refs = snapshot?.mediaVaultV2?.refs && typeof snapshot.mediaVaultV2.refs === "object"
    ? Object.keys(snapshot.mediaVaultV2.refs).length
    : 0;
  const legacyMedia = snapshot?.userMediaFallbacks?.media && typeof snapshot.userMediaFallbacks.media === "object"
    ? Object.keys(snapshot.userMediaFallbacks.media).length
    : 0;
  const avatarFallbacks = snapshot?.avatarFallbacks?.profiles && typeof snapshot.avatarFallbacks.profiles === "object"
    ? Object.keys(snapshot.avatarFallbacks.profiles).length
    : 0;
  if (mediaVaultV2Assets > 0 || mediaVaultV2Refs > 0) {
    domains.media.count = Math.max(domains.media.count, mediaVaultV2Assets);
    addKey(domains.media, "mediaVaultV2.assets");
    addKey(domains.media, "mediaVaultV2.refs");
    const missingRequired = Array.isArray(snapshot?.mediaVaultV2?.summary?.missingRequiredRefs)
      ? snapshot.mediaVaultV2.summary.missingRequiredRefs.length
      : 0;
    const integrityErrors = Array.isArray(snapshot?.mediaVaultV2?.summary?.integrityErrors)
      ? snapshot.mediaVaultV2.summary.integrityErrors.length
      : 0;
    if (missingRequired > 0) domains.media.warnings.push(`${missingRequired} référence(s) média requise(s) absente(s) du Media Vault V2.`);
    if (integrityErrors > 0) domains.media.warnings.push(`${integrityErrors} erreur(s) d’intégrité détectée(s) dans le Media Vault V2.`);
  } else {
    addCount(domains.media, legacyMedia + avatarFallbacks);
    if (legacyMedia) addKey(domains.media, "userMediaFallbacks.media");
  }
  if (avatarFallbacks) addKey(domains.media, "avatarFallbacks.profiles");

  const orgs = Array.isArray(snapshot?.organizationData?.organizations) ? snapshot.organizationData.organizations.length : 0;
  addCount(domains.organizations, orgs);
  if (snapshot?.organizationData) addKey(domains.organizations, "organizationData");

  const tournaments = Number(snapshot?.tournaments?.counts?.tournaments || snapshot?.tournaments?.tournaments?.length || 0) || 0;
  addCount(domains.tournaments, tournaments);
  if (snapshot?.tournaments) addKey(domains.tournaments, "tournaments");

  const running = snapshot?.running || snapshot?.outdoorActivities;
  if (running && typeof running === "object") {
    const total = [running.activities, running.routes, running.drafts, running.offlineRoutePacks]
      .reduce((sum: number, rows: any) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
    addCount(domains.running, total);
    addKey(domains.running, "running");
  }
}

const RUNTIME_TECHNICAL_KEYS = new Set([
  "dc_online_auth_supabase_v1",
  "dc_user_id",
  "dc_storage_user_id_v1",
  "dc_online_presence_v1",
  "dc_presence_v1",
  "dc_last_crash",
  "dc_last_runtime_error_v1",
  "dc_safe_mode_v1",
  "dc_sw_purge_once",
  "dc_force_purge_sw",
  "dc_nas_access_token_v1",
  "dc_nas_refresh_token_v1",
  "dc_nas_sync_dirty_v1",
  "dc_nas_sync_dirty_reason_v1",
  "dc_nas_sync_last_push_v1",
  "dc_nas_sync_last_pull_v1",
]);

function runtimePersistentLocalStorageInventory(): { portable: string[]; nonPortable: string[]; unregistered: string[] } {
  if (typeof window === "undefined" || !window.localStorage) return { portable: [], nonPortable: [], unregistered: [] };
  const portable = new Set<string>();
  const nonPortable = new Set<string>();
  const unregistered = new Set<string>();
  try {
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i += 1) {
      const key = String(ls.key(i) || "").trim();
      if (!key || RUNTIME_TECHNICAL_KEYS.has(key) || key.startsWith("sb-") || key.startsWith("supabase.")) continue;
      const rule = persistentLocalStorageRule(key);
      if (rule) {
        if (rule.portable) portable.add(key);
        else nonPortable.add(key);
        continue;
      }
      if (!looksLikePersistentUserKey(key)) continue;
      // Les anciennes clés dc_* restent portables par compatibilité jusqu'à leur
      // migration. Une clé moderne mss*/msc* non déclarée est signalée : elle ne
      // doit plus devenir sauvegardable par simple préfixe.
      if (/^dc(?:[-_:]|$)/i.test(key) || key === "cloudStatsEnabled") portable.add(key);
      else unregistered.add(key);
    }
  } catch {}
  return {
    portable: Array.from(portable).sort(),
    nonPortable: Array.from(nonPortable).sort(),
    unregistered: Array.from(unregistered).sort(),
  };
}

export async function buildBackupManifestV2(snapshot: any, userIdInput?: string | null): Promise<BackupManifestV2> {
  const domains = newDomainState();
  const warnings: string[] = [];
  const unclassified = new Set<string>();
  const recursive = new Set<string>();
  const classified = new Set<string>();
  const persistent = new Set<string>();
  const domainEntityIds = new Map<DataDomainId, Set<string>>();
  for (const definition of DATA_REGISTRY) domainEntityIds.set(definition.id, new Set());

  explicitPortableCounts(snapshot, domains);
  const mediaVaultV2Critical = Number(snapshot?.mediaVaultV2?._v || 0) === 2 && (
    (Array.isArray(snapshot?.mediaVaultV2?.summary?.missingRequiredRefs) && snapshot.mediaVaultV2.summary.missingRequiredRefs.length > 0) ||
    (Array.isArray(snapshot?.mediaVaultV2?.summary?.integrityErrors) && snapshot.mediaVaultV2.summary.integrityErrors.length > 0)
  );
  if (mediaVaultV2Critical) warnings.push("Media Vault V2 incomplet ou corrompu : le snapshot portable ne doit pas être considéré comme restaurable.");

  const scan = (rawEntries: Array<[string, any]>, source: "idb" | "localStorage") => {
    for (const [rawKey, rawValue] of rawEntries) {
      const key = String(rawKey || "").trim();
      if (!key) continue;
      if (!looksLikePersistentUserKey(key) && source === "localStorage") continue;
      persistent.add(`${source}:${key}`);
      if (recursiveScopeDepth(key) > 1) recursive.add(`${source}:${key}`);
      const domainId = classifyPersistentKey(key, source);
      if (!domainId) {
        unclassified.add(`${source}:${key}`);
        continue;
      }
      classified.add(`${source}:${key}`);
      const domain = domains[domainId];
      addKey(domain, `${source}:${key}`);

      const value = source === "localStorage" ? parseLocalStorageValue(rawValue) : rawValue;
      const ids = commonEntityIds(value);
      const idSet = domainEntityIds.get(domainId)!;
      for (const id of ids) idSet.add(id);
      if (!ids.length) addCount(domain, shallowCount(value));
    }
  };

  const idb = snapshot?.idb && typeof snapshot.idb === "object" ? snapshot.idb : {};
  const localStorageDump = snapshot?.localStorage && typeof snapshot.localStorage === "object" ? snapshot.localStorage : {};
  scan(Object.entries<any>(idb), "idb");
  scan(Object.entries<any>(localStorageDump), "localStorage");

  // WAVE 2 : le registre d'identités a une structure map<canonicalId, record>.
  // On compte donc les profils canoniques explicitement au lieu de prendre le
  // nombre de propriétés racine de l'objet comme compteur d'entités.
  for (const [key, rawValue] of Object.entries<any>(localStorageDump)) {
    if (!String(key || "").startsWith("dc_identity_aliases_v1")) continue;
    const parsed = parseLocalStorageValue(rawValue);
    const identityProfiles = parsed?.profiles && typeof parsed.profiles === "object"
      ? Object.keys(parsed.profiles).length
      : 0;
    domains.identity.count = Math.max(domains.identity.count, identityProfiles);
    const conflictCount = Array.isArray(parsed?.conflicts) ? parsed.conflicts.length : 0;
    if (conflictCount > 0) domains.identity.warnings.push(`${conflictCount} conflit(s) d'alias d'identité à résoudre.`);
  }

  // Compare le localStorage réellement présent sur l'appareil avec ce qui vient
  // d'entrer dans le snapshot. C'est le garde-fou qui rend visibles les familles
  // `mss-*` encore exclues par l'ancien filtre Darts Counter.
  const runtimeInventory = runtimePersistentLocalStorageInventory();
  const runtimeKeys = runtimeInventory.portable;
  const snapLocalKeys = new Set(Object.keys(localStorageDump));
  const runtimeExcluded = runtimeKeys.filter((key) => !snapLocalKeys.has(key));
  const runtimeUnregistered = runtimeInventory.unregistered;
  if (runtimeExcluded.length > 0) {
    warnings.push(`${runtimeExcluded.length} clé(s) portables présentes sur l'appareil ne sont pas incluses dans le dump localStorage de ce snapshot.`);
    for (const key of runtimeExcluded) {
      const domainId = classifyPersistentKey(key, "localStorage");
      if (domainId) domains[domainId].warnings.push("Données runtime portables présentes mais non incluses dans le snapshot.");
      else unclassified.add(`runtime-localStorage:${key}`);
    }
  }
  if (runtimeUnregistered.length > 0) {
    warnings.push(`${runtimeUnregistered.length} clé(s) moderne(s) persistante(s) ne sont pas déclarées dans le catalogue WAVE 5.`);
    for (const key of runtimeUnregistered) unclassified.add(`runtime-unregistered:${key}`);
  }

  for (const [domainId, ids] of domainEntityIds.entries()) {
    if (domainId === "account_store") continue;
    if (ids.size > 0) addCount(domains[domainId], ids.size);
  }

  // Les collections portables sont la photographie canonique de WAVE 1. Les
  // anciennes copies scopées restent inventoriées dans storageKeys mais ne
  // doivent pas gonfler artificiellement le nombre de profils/Teams/DartSets.
  const portable = snapshot?.portableAccountData && typeof snapshot.portableAccountData === "object"
    ? snapshot.portableAccountData
    : null;
  if (portable) {
    domains.profiles.count = Number(portable?.counts?.profiles ?? portable?.profiles?.length ?? 0) || 0;
    domains.bots.count = Number(portable?.counts?.bots ?? portable?.bots?.length ?? 0) || 0;
    domains.dart_sets.count = Number(portable?.counts?.dartSets ?? portable?.dartSets?.length ?? 0) || 0;
    domains.teams.count = Number(portable?.counts?.teams ?? portable?.teams?.length ?? 0) || 0;
    domains.tournaments.count = Number(portable?.counts?.tournaments ?? portable?.tournaments?.tournaments?.length ?? domains.tournaments.count) || 0;
  }
  domains.account_store.count = domains.account_store.storageKeys.length > 0 ? 1 : 0;
  if (snapshot?.history?.rows && typeof snapshot.history.rows === "object") {
    domains.history.count = Object.keys(snapshot.history.rows).length;
    if (Number(snapshot?.history?.historySchemaVersion || 0) === 4) {
      addKey(domains.history, "history.schema:v4");
    }
    if (snapshot?.history?.tombstones && typeof snapshot.history.tombstones === "object") {
      addKey(domains.history, "history.tombstones");
    }
  }

  if (recursive.size > 0) {
    warnings.push(`${recursive.size} clé(s) avec scopes de compte récursifs détectée(s). Elles restent legacy et devront être migrées.`);
    for (const key of recursive) {
      const rawKey = key.replace(/^(?:idb|localStorage):/, "");
      const source = key.startsWith("idb:") ? "idb" : "localStorage";
      const domainId = classifyPersistentKey(rawKey, source);
      if (domainId) domains[domainId].warnings.push("Namespaces legacy récursifs détectés.");
    }
  }
  if (unclassified.size > 0) {
    warnings.push(`${unclassified.size} clé(s) persistante(s) utilisateur ne sont pas encore classées dans le Data Registry.`);
  }

  if (String(userIdInput || "").trim() && domains.profiles.count > 0 && domains.identity.count <= 0) {
    domains.identity.warnings.push("Compte identifié mais registre d'identités WAVE 2 encore vide : il sera initialisé au prochain passage du bridge compte/profil.");
    warnings.push("Registre d'identités WAVE 2 encore vide pour ce compte.");
  }

  for (const domain of Object.values(domains)) {
    domain.storageKeys = domain.storageKeys.sort().slice(0, 250);
    domain.warnings = Array.from(new Set(domain.warnings));
    if (domain.required && domain.count <= 0 && domain.storageKeys.length === 0) domain.status = "missing";
    else if (domain.warnings.length > 0) domain.status = "warning";
    else if (domain.count > 0 || domain.storageKeys.length > 0) domain.status = "ok";
    else domain.status = "empty";
  }

  // WAVE 8 : un snapshot neuf ne doit jamais remettre des objets collectifs
  // dans la partition privée du compte. `organizationData` est le seul miroir
  // de secours des organisations ; Supabase reste leur autorité live.
  const portableTeams = Array.isArray(snapshot?.portableAccountData?.teams) ? snapshot.portableAccountData.teams : [];
  const leakedOrganizationTeams = organizationManagedTeams(portableTeams);
  if (leakedOrganizationTeams.length > 0) {
    domains.teams.warnings.push(`${leakedOrganizationTeams.length} projection(s) Organisation détectée(s) dans portableAccountData.teams.`);
    warnings.push("Frontière WAVE 8 invalide : des Teams Organisation ont fui dans la partition privée du compte.");
  }

  const missingRequired = Object.values(domains).filter((domain) => domain.status === "missing");
  if (missingRequired.length) {
    warnings.push(`Domaine(s) obligatoire(s) absent(s) : ${missingRequired.map((domain) => domain.id).join(", ")}.`);
  }

  const structuralPayload = JSON.stringify({
    registryVersion: 3,
    userId: String(userIdInput || "").trim() || null,
    domains: Object.values(domains).map((domain) => ({
      id: domain.id,
      count: domain.count,
      keys: domain.storageKeys,
      status: domain.status,
    })),
    recursive: Array.from(recursive).sort(),
    unclassified: Array.from(unclassified).sort(),
    mediaVaultV2: Number(snapshot?.mediaVaultV2?._v || 0) === 2 ? {
      assets: Number(snapshot?.mediaVaultV2?.summary?.assets || 0),
      refs: Number(snapshot?.mediaVaultV2?.summary?.refs || 0),
      bytes: Number(snapshot?.mediaVaultV2?.summary?.bytes || 0),
      missingRequiredRefs: Array.isArray(snapshot?.mediaVaultV2?.summary?.missingRequiredRefs) ? snapshot.mediaVaultV2.summary.missingRequiredRefs.slice().sort() : [],
      integrityErrors: Array.isArray(snapshot?.mediaVaultV2?.summary?.integrityErrors) ? snapshot.mediaVaultV2.summary.integrityErrors.slice().sort() : [],
    } : null,
  });

  return {
    _v: 2,
    registryVersion: 3,
    schemaVersion: 2,
    userId: String(userIdInput || "").trim() || null,
    createdAt: new Date().toISOString(),
    status: (missingRequired.length || mediaVaultV2Critical || leakedOrganizationTeams.length > 0) ? "invalid" : warnings.length ? "warning" : "ok",
    domains,
    coverage: {
      persistentKeys: persistent.size,
      classifiedKeys: classified.size,
      unclassifiedKeys: unclassified.size,
      unclassifiedKeySample: Array.from(unclassified).sort().slice(0, 80),
      recursiveScopedKeys: recursive.size,
      recursiveScopedKeySample: Array.from(recursive).sort().slice(0, 80),
      runtimePersistentKeys: runtimeKeys.length,
      runtimeExcludedKeys: runtimeExcluded.length,
      runtimeExcludedKeySample: runtimeExcluded.slice(0, 80),
      runtimeNonPortableKeys: runtimeInventory.nonPortable.length,
      runtimeNonPortableKeySample: runtimeInventory.nonPortable.slice(0, 80),
      runtimeUnregisteredKeys: runtimeUnregistered.length,
      runtimeUnregisteredKeySample: runtimeUnregistered.slice(0, 80),
    },
    structuralChecksum: await sha256Hex(structuralPayload),
    checksumMode: "structure-v1",
    warnings,
  };
}

export function validateBackupManifestV2(snapshot: any): BackupManifestValidation {
  const manifest = snapshot?.backupManifest;
  if (!manifest || Number(manifest?._v || 0) < 2) {
    return { ok: true, legacy: true, errors: [], warnings: ["Snapshot legacy sans Manifest V2."] };
  }

  const errors: string[] = [];
  const warnings: string[] = Array.isArray(manifest?.warnings) ? manifest.warnings.map(String) : [];
  if (Number(manifest?.schemaVersion || 0) !== 2) errors.push("Version de schéma Manifest V2 invalide.");
  if (!manifest?.domains || typeof manifest.domains !== "object") errors.push("Bloc domains absent du Manifest V2.");
  if (!manifest?.structuralChecksum) errors.push("Empreinte structurelle absente du Manifest V2.");
  if (manifest?.status === "invalid") errors.push("Le snapshot a été marqué invalide lors de sa création.");

  for (const definition of DATA_REGISTRY) {
    const domain = manifest?.domains?.[definition.id];
    if (!domain) {
      if (definition.requiredForPortableBackup) errors.push(`Domaine obligatoire absent du manifeste : ${definition.id}.`);
      else warnings.push(`Domaine non déclaré dans le manifeste : ${definition.id}.`);
      continue;
    }
    if (definition.requiredForPortableBackup && domain?.status === "missing") {
      errors.push(`Domaine obligatoire manquant dans le snapshot : ${definition.id}.`);
    }
  }

  return { ok: errors.length === 0, legacy: false, errors, warnings: Array.from(new Set(warnings)) };
}
