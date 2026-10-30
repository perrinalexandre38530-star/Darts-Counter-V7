export type DataDomainId =
  | "account_store"
  | "profiles"
  | "identity"
  | "bots"
  | "dart_sets"
  | "teams"
  | "organizations"
  | "agenda"
  | "planning"
  | "tournaments"
  | "history"
  | "stats_cache"
  | "training"
  | "fit"
  | "running"
  | "petanque"
  | "pingpong"
  | "babyfoot"
  | "dice"
  | "game_progress"
  | "settings"
  | "media"
  | "legacy_migration";

export type DataAuthority = "indexeddb" | "localstorage" | "history" | "supabase" | "r2" | "derived" | "mixed";
export type DataScope = "account" | "device" | "organization" | "global" | "mixed" | "derived";
export type PersistentKeyScope = "account" | "organization" | "device" | "cache" | "technical";

export type DataDomainDefinition = {
  id: DataDomainId;
  label: string;
  schemaVersion: number;
  requiredForPortableBackup: boolean;
  authority: DataAuthority;
  scope: DataScope;
  idbKeyPatterns?: RegExp[];
  localStorageKeyPatterns?: RegExp[];
  notes?: string;
};

export type PersistentLocalStorageRule = {
  key: string;
  domain: DataDomainId;
  scope: PersistentKeyScope;
  portable: boolean;
  maxBytes?: number;
  notes?: string;
};

/**
 * WAVE 5 — contrat explicite des clés modernes persistantes.
 *
 * Règle : une nouvelle clé mss- / mss_ / msc_ qui contient des données utilisateur
 * doit être ajoutée ici. Elle ne devient jamais sauvegardable uniquement parce que
 * son nom possède un préfixe particulier.
 */
export const PERSISTENT_LOCAL_STORAGE_RULES: readonly PersistentLocalStorageRule[] = [
  // WAVE 9 — journal de migration legacy, account-scoped et portable.
  { key: "dc_legacy_migration_v1", domain: "legacy_migration", scope: "account", portable: true, maxBytes: 500_000, notes: "Journal idempotent des sources legacy déjà migrées et des quarantaines." },

  // FIT PERF — données utilisateur.
  { key: "mss-fit-perf-sessions-v1", domain: "fit", scope: "account", portable: true, maxBytes: 2_500_000 },
  { key: "mss-fit-custom-programs-v1", domain: "fit", scope: "account", portable: true, maxBytes: 2_500_000 },
  { key: "mss-fit-active-program-v2", domain: "fit", scope: "account", portable: true },
  { key: "mss-fit-user-preferences-v1", domain: "fit", scope: "account", portable: true },
  { key: "mss-fit-perf-favorite-exercises-v1", domain: "fit", scope: "account", portable: true },
  { key: "mss-fit-perf-rest-seconds-v1", domain: "fit", scope: "account", portable: true },
  // Catalogues exercices = caches régénérables, jamais autorité utilisateur.
  { key: "mss-fit-perf-free-exercise-db-v1", domain: "fit", scope: "cache", portable: false },
  { key: "mss-fit-perf-wger-exercises-v1", domain: "fit", scope: "cache", portable: false },

  // Planification multisports.
  { key: "mss-multisport-weekly-plans-v1", domain: "planning", scope: "account", portable: true, maxBytes: 1_500_000 },
  { key: "mss-multisport-active-plan-v1", domain: "planning", scope: "account", portable: true },
  { key: "mss-multisport-agenda-v1", domain: "agenda", scope: "account", portable: true, maxBytes: 1_500_000 },
  { key: "mss-multisport-agenda-backup-v1", domain: "agenda", scope: "account", portable: true, maxBytes: 1_500_000 },

  // RUNNING / OUTDOOR — préférences et données créées par l'utilisateur.
  { key: "mss-running-plan-v1", domain: "running", scope: "account", portable: true, maxBytes: 1_500_000 },
  { key: "mss-running-audio-coach-v1", domain: "running", scope: "account", portable: true },
  { key: "mss-running-segments-v1", domain: "running", scope: "account", portable: true, maxBytes: 1_500_000 },
  { key: "mss-running-race-calendar-v1", domain: "running", scope: "account", portable: true, maxBytes: 1_500_000 },
  { key: "mss-running-active-sessions-v1", domain: "running", scope: "account", portable: true, maxBytes: 1_500_000 },
  { key: "mss-running-shoes-v1", domain: "running", scope: "account", portable: true },
  { key: "mss-outdoor-route-extras-v1", domain: "running", scope: "account", portable: true, maxBytes: 1_500_000 },
  { key: "mss-running-race-goal-v1", domain: "running", scope: "account", portable: true },
  { key: "mss-outdoor-goals-v1", domain: "running", scope: "account", portable: true },
  { key: "mss-running-weekly-goal-km-v1", domain: "running", scope: "account", portable: true },
  { key: "mss-outdoor-long-distance-v1", domain: "running", scope: "account", portable: true },
  { key: "mss-running-performance-activity-v1", domain: "running", scope: "account", portable: true },
  { key: "mss-running-privacy-v1", domain: "running", scope: "account", portable: true },
  { key: "mss-running-routes-v1", domain: "running", scope: "account", portable: true, maxBytes: 2_500_000 },
  { key: "mss-running-session-drafts-fallback-v1", domain: "running", scope: "account", portable: true, maxBytes: 1_500_000 },
  { key: "mss-activities-fallback-v1", domain: "running", scope: "account", portable: true, maxBytes: 2_500_000 },
  { key: "mss-outdoor-offline-fallback-v1", domain: "running", scope: "account", portable: true, maxBytes: 2_500_000 },
  { key: "mss-outdoor-safety-v1", domain: "running", scope: "account", portable: true },
  { key: "mss-running-map-theme-v1", domain: "running", scope: "account", portable: true },
  // État matériel / synchronisation : spécifique à l'appareil.
  { key: "mss-running-native-tracking-owner-v1", domain: "running", scope: "device", portable: false },
  { key: "mss-health-connect-last-sync-v1", domain: "running", scope: "technical", portable: false },
  { key: "mss-health-connect-last-export-v1", domain: "running", scope: "technical", portable: false },
  // Caches de cartes/photos/élévation : régénérables.
  { key: "mss-route-elevation-cache-v1", domain: "running", scope: "cache", portable: false },
  { key: "mss-route-place-context-v1", domain: "running", scope: "cache", portable: false },
  { key: "mss-route-photo-cache-v4", domain: "running", scope: "cache", portable: false },
  { key: "mss-route-cover-photo-cache-v2", domain: "running", scope: "cache", portable: false },
  { key: "mss-route-place-photo-cache-v1", domain: "running", scope: "cache", portable: false },
  { key: "mss-outdoor-route-scout-v6", domain: "running", scope: "cache", portable: false },

  // Progressions / badges de jeux.
  { key: "mss_darts_poker_progress_v1", domain: "game_progress", scope: "account", portable: true },
  { key: "mss_premium_party_progress_v1", domain: "game_progress", scope: "account", portable: true },

  // Réglages applicatifs réellement choisis par l'utilisateur.
  { key: "mss-enabled-sports-v1", domain: "settings", scope: "account", portable: true },
  { key: "mss-unlocked-sports-v1", domain: "settings", scope: "account", portable: true },
  { key: "mss:x01:quick-config:v1", domain: "settings", scope: "account", portable: true },
  { key: "mss:football:guide-v12", domain: "settings", scope: "account", portable: true },
  { key: "mss_content_packs_v3", domain: "settings", scope: "device", portable: false, notes: "État d'installation CacheStorage, régénérable sur chaque appareil." },
  { key: "settings_x01", domain: "settings", scope: "account", portable: true },
  { key: "cloudStatsEnabled", domain: "settings", scope: "account", portable: true },

  // Organisations : données de cache local utiles, l'autorité distante reste Supabase.
  { key: "msc_organizations_v1", domain: "organizations", scope: "organization", portable: false, maxBytes: 2_500_000, notes: "WAVE 8 : cache/projection locale du collectif. Supabase est l’autorité live ; le secours voyage uniquement dans organizationData." },
  { key: "msc_organization_workspace_v1", domain: "organizations", scope: "account", portable: true, maxBytes: 2_500_000 },
  { key: "mss-organization-config-v1", domain: "organizations", scope: "organization", portable: false, notes: "Format d’export collectif, pas une préférence personnelle à répliquer." },
  { key: "mss-organization-play-context-v1", domain: "organizations", scope: "device", portable: false, notes: "Contexte QR temporaire avec TTL." },

  // Médias legacy : la galerie utilisateur doit voyager, les crédits sont autorité serveur/NAS.
  { key: "msc_avatar_ia_gallery_v1", domain: "media", scope: "account", portable: true, maxBytes: 2_500_000 },
  { key: "msc_avatar_ai_credits_v1", domain: "media", scope: "technical", portable: false },

  // Baby-foot reste portable. Les anciens historiques multisports sont désormais
  // des caches dérivés de History V4 : ils ne voyagent plus dans les backups.
  { key: "babyfoot_league_store_v1", domain: "babyfoot", scope: "account", portable: true, maxBytes: 2_500_000 },
  { key: "babyfoot_state_v3", domain: "babyfoot", scope: "account", portable: true, maxBytes: 1_500_000 },
  { key: "babyfoot_state_v2", domain: "babyfoot", scope: "account", portable: true, maxBytes: 1_500_000 },
  { key: "babyfoot_league_create_draft_v1", domain: "babyfoot", scope: "account", portable: true },
  { key: "babyfoot_league_return_create", domain: "babyfoot", scope: "device", portable: false },
  { key: "pingpong_history", domain: "stats_cache", scope: "cache", portable: false, notes: "W2: cache dérivé de History V4." },
  { key: "dc-petanque-history-v1", domain: "stats_cache", scope: "cache", portable: false, notes: "W2: cache dérivé de History V4." },
  { key: "dc_molkky_history_v2", domain: "stats_cache", scope: "cache", portable: false, notes: "W2: cache/résumé local dérivé de History V4 ; une session active reste locale." },
  { key: "dc_molkky_history_v1", domain: "stats_cache", scope: "cache", portable: false, notes: "Legacy migration input only." },
  { key: "dc_molkky_history_v1_migrated_to_v2", domain: "stats_cache", scope: "technical", portable: false },
  { key: "dc_darts_firefighter_history_v1", domain: "stats_cache", scope: "cache", portable: false, notes: "W2: cache dérivé de History V4." },
  { key: "dc_territories_history_v1", domain: "stats_cache", scope: "cache", portable: false, notes: "W2: cache dérivé de History V4." },
  { key: "mss_multisport_history_cache_owner_v1", domain: "stats_cache", scope: "technical", portable: false },

  // Données sociales/locales non portables.
  { key: "mss_nearby_encounters_v1", domain: "settings", scope: "device", portable: false },
  { key: "mss-public-shared-match-status-v1", domain: "settings", scope: "device", portable: false },
  { key: "mss_samsung_tv_last_viewer_code_v1", domain: "settings", scope: "device", portable: false },
  { key: "mss_account_owned_sync_revisions_v1", domain: "settings", scope: "technical", portable: false },
  { key: "mss_account_stats_sources_mirror_v1", domain: "stats_cache", scope: "cache", portable: false },
  { key: "mss_account_stats_sources_owner_v1", domain: "stats_cache", scope: "technical", portable: false },
  { key: "mss_force_premium_themes", domain: "settings", scope: "device", portable: false },
  { key: "mss.admob.inline.telemetry.v1", domain: "settings", scope: "technical", portable: false },

  // OAuth / callbacks : secrets ou état transactionnel, jamais exportés.
  { key: "msc_social_auth_pending_v1", domain: "settings", scope: "technical", portable: false },
  { key: "msc_social_auth_callback_v1", domain: "settings", scope: "technical", portable: false },
  { key: "msc_social_pkce_backup_v1", domain: "settings", scope: "technical", portable: false },
  { key: "msc_personal_cloud_pending_v1", domain: "settings", scope: "technical", portable: false },
  { key: "msc_personal_cloud_callback_v1", domain: "settings", scope: "technical", portable: false },
] as const;

const LOCAL_STORAGE_RULE_BY_KEY = new Map<string, PersistentLocalStorageRule>(
  PERSISTENT_LOCAL_STORAGE_RULES.map((rule) => [rule.key, rule]),
);

export function persistentLocalStorageRule(keyInput: string): PersistentLocalStorageRule | null {
  const key = String(keyInput || "").trim();
  if (!key) return null;
  const exact = LOCAL_STORAGE_RULE_BY_KEY.get(key);
  if (exact) return exact;
  // Plusieurs stores modernes sont account-scoped sous la forme base:<uid>.
  // WAVE 8 exige que la règle d'autorité de la base continue de s'appliquer à
  // ces variantes ; sinon `msc_organizations_v1:<uid>` contournerait le contrat.
  for (const rule of PERSISTENT_LOCAL_STORAGE_RULES) {
    if (key.startsWith(`${rule.key}:`)) return rule;
  }
  return null;
}

export function isRegisteredPortableLocalStorageKey(keyInput: string): boolean {
  return persistentLocalStorageRule(keyInput)?.portable === true;
}

export function portableLocalStorageKeysForDomain(domain: DataDomainId): string[] {
  return PERSISTENT_LOCAL_STORAGE_RULES
    .filter((rule) => rule.domain === domain && rule.portable)
    .map((rule) => rule.key);
}

export function registeredLocalStorageMaxBytes(keyInput: string): number | null {
  const max = persistentLocalStorageRule(keyInput)?.maxBytes;
  return Number.isFinite(max) && Number(max) > 0 ? Number(max) : null;
}

/**
 * WAVE 1 → WAVE 6 : registre central des familles persistantes.
 * `scope` décrit maintenant l'autorité logique ; le catalogue exact ci-dessus
 * décide, lui, si une clé localStorage moderne est portable ou non.
 */
export const DATA_REGISTRY: readonly DataDomainDefinition[] = [
  { id: "account_store", label: "Store principal du compte", schemaVersion: 1, requiredForPortableBackup: true, authority: "indexeddb", scope: "account", idbKeyPatterns: [/^store(?:$|:)/i] },
  { id: "profiles", label: "Profils et préférences joueur", schemaVersion: 1, requiredForPortableBackup: true, authority: "mixed", scope: "account", idbKeyPatterns: [/^dc_profiles?(?:$|[:_-])/i, /^dc_active_profile/i], localStorageKeyPatterns: [/^dc_profiles?(?:$|[:_-])/i, /^dc_active_profile/i, /^dc-profile/i] },
  { id: "identity", label: "Identités canoniques / alias joueur", schemaVersion: 1, requiredForPortableBackup: false, authority: "localstorage", scope: "account", localStorageKeyPatterns: [/^dc_identity_aliases_v1(?:$|:)/i, /^dc_account_profile_binding_v16:/i], notes: "WAVE 2 : mapping non destructif accountUserId/profileId/legacyIds. Aucun rapprochement par nom seul." },
  { id: "bots", label: "Bots / CPU", schemaVersion: 2, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/bot/i], localStorageKeyPatterns: [/bot/i, /cpu/i], notes: "WAVE 3 : bots.ts est l’autorité des BOT personnalisés ; les BOT officiels restent code-derived." },
  { id: "dart_sets", label: "DartSets", schemaVersion: 2, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/dart.?set/i], localStorageKeyPatterns: [/dart.?set/i] },
  { id: "teams", label: "Teams", schemaVersion: 3, requiredForPortableBackup: false, authority: "mixed", scope: "mixed", idbKeyPatterns: [/team/i], localStorageKeyPatterns: [/^dc[-_:]?teams?/i, /petanque.*team/i], notes: "WAVE 8 : le store UI contient deux partitions : Teams personnelles (account) et projections Organisation (Supabase). Seule la partition account voyage dans portableAccountData/account_sync_documents." },
  { id: "organizations", label: "Organisations / partenariats", schemaVersion: 3, requiredForPortableBackup: false, authority: "supabase", scope: "organization", idbKeyPatterns: [/organi[sz]ation/i, /partnership/i], localStorageKeyPatterns: [/organi[sz]ation/i, /partnership/i, /workspace/i], notes: "WAVE 8 : Supabase/RLS est l’autorité des données collectives ; organizationData est un miroir de secours, jamais une source de sync compte." },
  { id: "agenda", label: "Agenda multisports", schemaVersion: 3, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/mss[-_:]?multisport[-_:]?agenda/i, /agenda/i], localStorageKeyPatterns: [/mss[-_:]?multisport[-_:]?agenda/i, /agenda/i] },
  { id: "planning", label: "Plans multisports", schemaVersion: 1, requiredForPortableBackup: false, authority: "localstorage", scope: "account", idbKeyPatterns: [/multisport.*plan/i], localStorageKeyPatterns: [/multisport.*plan/i] },
  { id: "tournaments", label: "Compétitions / tournois", schemaVersion: 1, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/tournament/i, /competition/i, /league/i], localStorageKeyPatterns: [/tournament/i, /competition/i, /league/i] },
  { id: "history", label: "Historique des parties", schemaVersion: 4, requiredForPortableBackup: false, authority: "history", scope: "account", idbKeyPatterns: [/history/i, /match(?:es)?/i], localStorageKeyPatterns: [/history/i, /match(?:es)?/i], notes: "WAVE 6 : match_headers_v4 + match_payloads_v4 + match_tombstones_v4 + match_index_v4 sont l’autorité canonique ; les anciens stores restent un miroir de compatibilité." },
  { id: "stats_cache", label: "Caches statistiques dérivés", schemaVersion: 4, requiredForPortableBackup: false, authority: "derived", scope: "derived", idbKeyPatterns: [/stats/i], localStorageKeyPatterns: [/stats/i], notes: "WAVE 6 : les statistiques sont des caches entièrement reconstruisibles depuis History V4 et les alias d’identité explicites." },
  { id: "training", label: "Training / progression d'entraînement", schemaVersion: 1, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/training/i, /practice/i], localStorageKeyPatterns: [/training/i, /practice/i] },
  { id: "fit", label: "FIT PERF", schemaVersion: 2, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/^(?:mss[-_:])?fit/i], localStorageKeyPatterns: [/^(?:mss[-_:])?fit/i] },
  { id: "running", label: "Running / Outdoor", schemaVersion: 3, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/running/i, /outdoor/i, /route/i], localStorageKeyPatterns: [/running/i, /outdoor/i, /route/i] },
  { id: "petanque", label: "Pétanque", schemaVersion: 1, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/petanque/i, /p[eé]tanque/i], localStorageKeyPatterns: [/petanque/i, /p[eé]tanque/i] },
  { id: "pingpong", label: "Ping-pong", schemaVersion: 2, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/ping.?pong/i, /table.?tennis/i], localStorageKeyPatterns: [/ping.?pong/i, /table.?tennis/i] },
  { id: "babyfoot", label: "Baby-foot", schemaVersion: 2, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/babyfoot/i, /foosball/i], localStorageKeyPatterns: [/babyfoot/i, /foosball/i] },
  { id: "dice", label: "Dice", schemaVersion: 1, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/(?:^|[-_:])dice(?:$|[-_:])/i], localStorageKeyPatterns: [/(?:^|[-_:])dice(?:$|[-_:])/i] },
  { id: "game_progress", label: "Progressions / badges / carrières de jeux", schemaVersion: 2, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/progress/i, /badge/i, /career/i, /darts.?poker/i, /premium.?party/i, /achievement/i], localStorageKeyPatterns: [/progress/i, /badge/i, /career/i, /darts.?poker/i, /premium.?party/i, /achievement/i] },
  { id: "media", label: "Médias utilisateur", schemaVersion: 2, requiredForPortableBackup: false, authority: "indexeddb", scope: "account", idbKeyPatterns: [/media/i, /avatar/i, /gallery/i, /image/i, /photo/i], localStorageKeyPatterns: [/avatar/i, /gallery/i, /image/i, /photo/i, /media/i], notes: "WAVE 4 : Media Vault V2 est l’autorité locale des médias portables." },
  { id: "settings", label: "Réglages et préférences application", schemaVersion: 2, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/setting/i, /preference/i, /prefs/i, /config/i], localStorageKeyPatterns: [/setting/i, /preference/i, /prefs/i, /config/i, /theme/i, /language/i, /sound/i] },
  { id: "legacy_migration", label: "Journal de migration legacy", schemaVersion: 1, requiredForPortableBackup: false, authority: "mixed", scope: "account", idbKeyPatterns: [/^dc_legacy_(?:migration|quarantine)_v1(?:$|:)/i], localStorageKeyPatterns: [/^dc_legacy_migration_v1(?:$|:)/i], notes: "WAVE 9 : audit, fingerprint, classifications et quarantaine brute des anciens backups. Aucun merge d’identité par nom." },
] as const;

export function dataDomainById(id: DataDomainId): DataDomainDefinition {
  const found = DATA_REGISTRY.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown data domain: ${id}`);
  return found;
}

export function classifyPersistentKey(keyInput: string, source: "idb" | "localStorage"): DataDomainId | null {
  const key = String(keyInput || "").trim();
  if (!key) return null;
  if (source === "localStorage") {
    const exact = persistentLocalStorageRule(key);
    if (exact) return exact.domain;
  }
  for (const domain of DATA_REGISTRY) {
    const patterns = source === "idb" ? domain.idbKeyPatterns : domain.localStorageKeyPatterns;
    if (!patterns?.length) continue;
    if (patterns.some((pattern) => pattern.test(key))) return domain.id;
  }
  return null;
}

export function looksLikePersistentUserKey(keyInput: string): boolean {
  const key = String(keyInput || "").trim();
  if (!key) return false;
  if (persistentLocalStorageRule(key)) return true;
  return /^(?:dc(?:[-_:]|$)|mss(?:[-_:]|$)|msc(?:[-_:]|$)|babyfoot(?:[-_:]|$)|settings(?:[-_:]|$)|cloudStatsEnabled$)/i.test(key);
}
