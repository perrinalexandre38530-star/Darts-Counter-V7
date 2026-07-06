// src/lib/profileUsage.ts
// ------------------------------------------------------------
// Tri des profils par utilisation, isolé par mode de jeu.
// Exemple: X01 possède son classement, Killer le sien, Golf le sien, etc.
// Ordre attendu: profils les plus utilisés dans CE mode, puis alphabétique.
// ------------------------------------------------------------

export type ProfileUsageCounts = Record<string, number>;
export type ProfileUsageStore = Record<string, ProfileUsageCounts>;

export const PROFILE_USAGE_KEY = "dc_profile_usage_by_mode_v1";
export const PROFILE_USAGE_UPDATED_EVENT = "dc-profile-usage-updated";

const LEGACY_X01_USAGE_KEY = "dc_x01_v3_player_usage_counts";
const LEGACY_X01_UPDATED_EVENT = "dc-x01-player-usage-updated";

function hasWindow(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function clean(raw: any): string {
  return String(raw ?? "").trim();
}

function nameKey(value: any): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeProfileUsageMode(mode: any, fallback = "global"): string {
  const raw = clean(mode || fallback).toLowerCase();
  const v = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!v) return fallback;
  if (v === "x01v3" || v === "x01_v3" || v === "x01setup" || v === "x01_play" || v === "x01_play_v3") return "x01";
  if (v === "killer_play" || v === "killer_config") return "killer";
  if (v === "killer_progressive" || v === "killer_progressif" || v === "progressive_killer") return "killer_progressif";
  if (v === "five_lives" || v === "5_lives" || v === "cinq_vies") return "five_lives";
  if (v === "battle_royale" || v === "battleroyale") return "battle_royale";
  if (v === "departements" || v === "departement" || v === "territory" || v === "territories") return "territories";
  if (v === "baby_foot" || v === "babyfoot" || v === "baby") return "babyfoot";
  if (v === "ping_pong" || v === "pingpong" || v === "table_tennis") return "pingpong";
  if (v === "petanque" || v === "petanque_play") return "petanque";
  if (v === "foot" || v === "football") return "foot";
  if (v === "molkky" || v === "molky") return "molkky";
  return v;
}

export function readProfileUsageStore(): ProfileUsageStore {
  try {
    if (!hasWindow()) return {};
    const raw = window.localStorage.getItem(PROFILE_USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: ProfileUsageStore = {};
    for (const [modeRaw, countsRaw] of Object.entries(parsed as any)) {
      const mode = normalizeProfileUsageMode(modeRaw, "global");
      if (!countsRaw || typeof countsRaw !== "object" || Array.isArray(countsRaw)) continue;
      const counts: ProfileUsageCounts = {};
      for (const [idRaw, valueRaw] of Object.entries(countsRaw as any)) {
        const id = clean(idRaw);
        const n = Number(valueRaw);
        if (id && Number.isFinite(n) && n > 0) counts[id] = n;
      }
      if (Object.keys(counts).length) out[mode] = { ...(out[mode] || {}), ...counts };
    }
    return out;
  } catch {
    return {};
  }
}

function writeProfileUsageStore(store: ProfileUsageStore): void {
  try {
    if (!hasWindow()) return;
    window.localStorage.setItem(PROFILE_USAGE_KEY, JSON.stringify(store || {}));
  } catch {}
}

function readLegacyX01UsageCounts(): ProfileUsageCounts {
  try {
    if (!hasWindow()) return {};
    const raw = window.localStorage.getItem(LEGACY_X01_USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const out: ProfileUsageCounts = {};
    for (const [k, v] of Object.entries(parsed || {})) {
      const id = clean(k);
      const n = Number(v);
      if (id && Number.isFinite(n) && n > 0) out[id] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function writeLegacyX01UsageCounts(counts: ProfileUsageCounts): void {
  try {
    if (!hasWindow()) return;
    window.localStorage.setItem(LEGACY_X01_USAGE_KEY, JSON.stringify(counts || {}));
  } catch {}
}

export function emitProfileUsageUpdated(mode?: any): void {
  try {
    if (typeof window === "undefined") return;
    const detail = { mode: normalizeProfileUsageMode(mode || "global") };
    try { window.dispatchEvent(new CustomEvent(PROFILE_USAGE_UPDATED_EVENT, { detail })); } catch { window.dispatchEvent(new Event(PROFILE_USAGE_UPDATED_EVENT)); }
    if (detail.mode === "x01") window.dispatchEvent(new Event(LEGACY_X01_UPDATED_EVENT));
  } catch {}
}

export function readProfileUsageCounts(mode: any): ProfileUsageCounts {
  const normalized = normalizeProfileUsageMode(mode);
  const store = readProfileUsageStore();
  const counts: ProfileUsageCounts = { ...(store[normalized] || {}) };

  // Compatibilité: l'ancien X01ConfigV3 écrivait déjà cette clé.
  if (normalized === "x01") {
    const legacy = readLegacyX01UsageCounts();
    for (const [id, n] of Object.entries(legacy)) counts[id] = Math.max(Number(counts[id] || 0), Number(n || 0));
  }
  return counts;
}

export function recordProfileUsageForMode(mode: any, ids: any[], weight = 1): ProfileUsageCounts {
  const normalized = normalizeProfileUsageMode(mode);
  const step = Number.isFinite(Number(weight)) && Number(weight) > 0 ? Number(weight) : 1;
  const store = readProfileUsageStore();
  const counts: ProfileUsageCounts = { ...(store[normalized] || {}) };
  const unique = Array.from(new Set((ids || []).map(clean).filter(Boolean)));
  if (!unique.length) return counts;

  for (const id of unique) counts[id] = Number(counts[id] || 0) + step;
  store[normalized] = counts;
  writeProfileUsageStore(store);

  if (normalized === "x01") {
    const legacy = readLegacyX01UsageCounts();
    for (const id of unique) legacy[id] = Math.max(Number(legacy[id] || 0), Number(counts[id] || 0));
    writeLegacyX01UsageCounts(legacy);
  }

  emitProfileUsageUpdated(normalized);
  return counts;
}

function profileIdentityKeys(profile: any): string[] {
  const out: string[] = [];
  const add = (v: any) => {
    const s = clean(v);
    if (s && !out.includes(s)) out.push(s);
  };
  add(profile?.id);
  add(profile?.profileId);
  add(profile?.playerId);
  add(profile?.localProfileId);
  add(profile?.uid);
  add(profile?.uuid);
  add(profile?.userProfileId);
  add(profile?.linkedTargetLocalProfileId);
  add(profile?.name);
  add(profile?.displayName);
  add(profile?.label);
  const nk = nameKey(profile?.name || profile?.displayName || profile?.label);
  if (nk) add(nk);
  return out;
}

function buildProfileLookup(profiles: any[] = []) {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const profile of Array.isArray(profiles) ? profiles : []) {
    const canonical = clean(profile?.id || profile?.profileId || profile?.playerId || profile?.localProfileId || profile?.uid);
    if (!canonical) continue;
    for (const key of profileIdentityKeys(profile)) byId.set(key, canonical);
    const nk = nameKey(profile?.name || profile?.displayName || profile?.label);
    if (nk) byName.set(nk, canonical);
  }
  return { byId, byName };
}

function resolveProfileUsageId(raw: any, lookup?: { byId: Map<string, string>; byName: Map<string, string> }): string {
  const id = clean(raw);
  if (!id) return "";
  if (!lookup) return id;
  return lookup.byId.get(id) || lookup.byName.get(nameKey(id)) || id;
}

export function profileUsageModeFromMatch(row: any, fallback = "x01"): string {
  const candidates = [
    row?.kind,
    row?.mode,
    row?.gameMode,
    row?.game?.mode,
    row?.game?.id,
    row?.summary?.mode,
    row?.summary?.kind,
    row?.summary?.gameId,
    row?.summary?.variantId,
    row?.payload?.kind,
    row?.payload?.mode,
    row?.payload?.gameMode,
    row?.payload?.onlineMode,
    row?.payload?.game?.mode,
    row?.payload?.game?.id,
    row?.payload?.config?.mode,
    row?.payload?.config?.kind,
    row?.payload?.config?.gameId,
    row?.payload?.config?.variantId,
    row?.payload?.summary?.mode,
    row?.payload?.summary?.kind,
    row?.payload?.summary?.gameId,
    row?.payload?.summary?.variantId,
    row?.resume?.config?.mode,
    row?.resume?.config?.gameId,
    row?.resume?.config?.variantId,
  ];
  for (const c of candidates) {
    const mode = normalizeProfileUsageMode(c, "");
    if (mode) return mode;
  }
  return normalizeProfileUsageMode(fallback);
}

export function extractProfileIdsForUsage(row: any, profiles: any[] = []): string[] {
  const lookup = profiles?.length ? buildProfileLookup(profiles) : undefined;
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (value: any) => {
    const id = resolveProfileUsageId(value, lookup);
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };

  const visitPlayer = (value: any, depth = 0) => {
    if (value == null || depth > 4) return;
    if (typeof value === "string") { add(value); return; }
    // Les scores numériques ne doivent pas devenir des faux IDs profils.
    if (typeof value === "number") return;
    if (Array.isArray(value)) { value.forEach((item) => visitPlayer(item, depth + 1)); return; }
    if (typeof value !== "object") return;

    const identityFields = [
      value.id,
      value.profileId,
      value.playerId,
      value.localProfileId,
      value.uid,
      value.uuid,
      value.pid,
      value.userProfileId,
      value.ownerProfileId,
      value.linkedTargetLocalProfileId,
    ];
    identityFields.forEach(add);
    if (!identityFields.some((v) => clean(v))) {
      add(value.name);
      add(value.displayName);
      add(value.label);
    }

    const nestedKeys = [
      "player", "profile", "participant", "players", "profiles", "participants",
      "teamPlayers", "teamAPlayers", "teamBPlayers", "lineup", "members",
      "playerIds", "profileIds", "teamAProfileIds", "teamBProfileIds",
      "teamAPlayerIds", "teamBPlayerIds", "selectedIds", "selectedPlayerIds",
      "config", "state", "summary", "payload", "resume", "game",
    ];
    for (const key of nestedKeys) {
      if (value[key] != null) visitPlayer(value[key], depth + 1);
    }
  };

  const buckets = [
    row?.players,
    row?.participants,
    row?.profiles,
    row?.playerIds,
    row?.profileIds,
    row?.teamAProfileIds,
    row?.teamBProfileIds,
    row?.teamAPlayerIds,
    row?.teamBPlayerIds,
    row?.selectedIds,
    row?.selectedPlayerIds,
    row?.summary?.players,
    row?.summary?.participants,
    row?.summary?.profiles,
    row?.summary?.playerIds,
    row?.summary?.profileIds,
    row?.summary?.teamAProfileIds,
    row?.summary?.teamBProfileIds,
    row?.payload?.players,
    row?.payload?.participants,
    row?.payload?.profiles,
    row?.payload?.playerIds,
    row?.payload?.profileIds,
    row?.payload?.teamAProfileIds,
    row?.payload?.teamBProfileIds,
    row?.payload?.config?.players,
    row?.payload?.config?.participants,
    row?.payload?.config?.profiles,
    row?.payload?.config?.playerIds,
    row?.payload?.config?.profileIds,
    row?.payload?.config?.teamAProfileIds,
    row?.payload?.config?.teamBProfileIds,
    row?.payload?.state?.players,
    row?.payload?.state?.participants,
    row?.resume?.players,
    row?.resume?.participants,
    row?.resume?.config?.players,
    row?.resume?.config?.participants,
    row?.resume?.config?.playerIds,
    row?.resume?.config?.profileIds,
    row?.game?.players,
    row?.game?.participants,
  ];
  buckets.forEach((bucket) => visitPlayer(bucket));

  const idMaps = [
    row?.summary?.avg3ByPlayer,
    row?.summary?.statsByPlayer,
    row?.summary?.scoreByPlayer,
    row?.payload?.summary?.avg3ByPlayer,
    row?.payload?.summary?.statsByPlayer,
    row?.payload?.statsByPlayer,
    row?.payload?.scoreByPlayer,
    row?.resume?.statsByPlayer,
    row?.resume?.scoreByPlayer,
  ];
  for (const map of idMaps) {
    if (map && typeof map === "object" && !Array.isArray(map)) Object.keys(map).forEach(add);
  }

  return out;
}

export function collectProfileUsageFromHistory(rows: any[], mode: any, profiles: any[] = []): ProfileUsageCounts {
  const normalized = normalizeProfileUsageMode(mode);
  const out: ProfileUsageCounts = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const rowMode = profileUsageModeFromMatch(row, normalized);
    if (rowMode !== normalized) continue;
    const ids = extractProfileIdsForUsage(row, profiles);
    for (const id of ids) out[id] = Number(out[id] || 0) + 1;
  }
  return out;
}

export function mergeProfileUsageFromHistory(rows: any[], mode: any, profiles: any[] = []): ProfileUsageCounts {
  const normalized = normalizeProfileUsageMode(mode);
  const historyCounts = collectProfileUsageFromHistory(rows, normalized, profiles);
  const store = readProfileUsageStore();
  const current = { ...(store[normalized] || {}) };
  for (const [id, count] of Object.entries(historyCounts)) current[id] = Math.max(Number(current[id] || 0), Number(count || 0));
  store[normalized] = current;
  writeProfileUsageStore(store);

  if (normalized === "x01") {
    const legacy = readLegacyX01UsageCounts();
    for (const [id, count] of Object.entries(current)) legacy[id] = Math.max(Number(legacy[id] || 0), Number(count || 0));
    writeLegacyX01UsageCounts(legacy);
  }

  emitProfileUsageUpdated(normalized);
  return current;
}

export function recordProfileUsageFromMatch(row: any, fallbackMode?: any, profiles: any[] = []): ProfileUsageCounts {
  const mode = profileUsageModeFromMatch(row, fallbackMode || row?.kind || row?.mode || "x01");
  const ids = extractProfileIdsForUsage(row, profiles);
  return recordProfileUsageForMode(mode, ids, 1);
}

export function profileUsageScore(profile: any, counts: ProfileUsageCounts, mode?: any): number {
  let best = 0;
  for (const key of profileIdentityKeys(profile)) {
    best = Math.max(best, Number(counts?.[key] || 0));
  }

  const normalized = normalizeProfileUsageMode(mode || "global");
  const modeStats = profile?.stats?.[normalized] || profile?.[normalized] || profile?.usage?.[normalized] || null;
  const fallbackStats = [
    modeStats?.played,
    modeStats?.matches,
    modeStats?.matchCount,
    modeStats?.gamesPlayed,
    profile?.usageCount,
    profile?.useCount,
    profile?.uses,
    profile?.timesUsed,
    profile?.matchCount,
    profile?.matchesCount,
    profile?.matchesPlayed,
    profile?.gamesPlayed,
    profile?.played,
  ];
  for (const raw of fallbackStats) {
    const n = Number(raw);
    if (Number.isFinite(n)) best = Math.max(best, n);
  }
  return best;
}

export function sortProfilesByModeUsage<T extends any>(profiles: T[], mode: any, activeProfileId?: any): T[] {
  const counts = readProfileUsageCounts(mode);
  const activeId = clean(activeProfileId);
  return (Array.isArray(profiles) ? profiles : []).slice().sort((a: any, b: any) => {
    const ua = profileUsageScore(a, counts, mode);
    const ub = profileUsageScore(b, counts, mode);
    if (ua !== ub) return ub - ua;
    if (ua === 0 && ub === 0 && activeId) {
      if (clean(a?.id) === activeId && clean(b?.id) !== activeId) return -1;
      if (clean(b?.id) === activeId && clean(a?.id) !== activeId) return 1;
    }
    return clean(a?.name || a?.displayName || a?.label).localeCompare(clean(b?.name || b?.displayName || b?.label), "fr", { sensitivity: "base", numeric: true });
  });
}
