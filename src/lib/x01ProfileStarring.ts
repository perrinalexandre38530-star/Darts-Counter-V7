// @ts-nocheck
import { StatsBridge } from "./statsBridge";
import { History } from "./history";
import { loadNormalizedHistory } from "./statsNormalized";
import { buildDashboardFromNormalized } from "./statsUnifiedAgg";
import { computeX01MultiAgg } from "./x01MultiAgg";

export type X01ProfileStarData = { kind: "avg3d"; value: number } | { kind: "level"; value: number };

type MiniStats = {
  avg3?: number;
  avg3d?: number;
  avg3D?: number;
  average3Darts?: number;
  games?: number;
  matches?: number;
  sessions?: number;
  darts?: number;
  totalDarts?: number;
  bestVisit?: number;
  bestCheckout?: number;
  bestCO?: number;
  [key: string]: any;
};

const statsCache = new Map<string, Promise<MiniStats | null> | MiniStats | null>();
let normalizedHistoryPromise: Promise<any[]> | null = null;
let fullHistoryRowsPromise: Promise<any[]> | null = null;

export function x01StarringNormText(value: any): string {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function x01ProfileIdentityKeys(profile: any): string[] {
  const keys = [
    profile?.id,
    profile?.profileId,
    profile?.playerId,
    profile?.localProfileId,
    profile?.uid,
    profile?.uuid,
    profile?.localId,
    profile?.profile_id,
    profile?.player_id,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  return Array.from(new Set(keys));
}

function numberFromAny(value: any): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return 0;
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : 0;
}

function statsQuality(stats: any): number {
  if (!stats || typeof stats !== "object") return 0;
  return (
    Number(stats.avg3 ?? stats.avg3d ?? stats.avg3D ?? stats.average3Darts ?? 0) +
    Number(stats.games ?? stats.matches ?? stats.sessions ?? 0) * 3 +
    Number(stats.darts ?? stats.totalDarts ?? 0) / 20 +
    Number(stats.bestVisit ?? stats.best_visit ?? 0) / 10 +
    Number(stats.bestCheckout ?? stats.bestCO ?? stats.best_checkout ?? 0) / 10
  );
}

function pickBestStats(...items: any[]): MiniStats | null {
  let best: any = null;
  let bestQuality = -1;
  for (const item of items) {
    const q = statsQuality(item);
    if (q > bestQuality) {
      best = item;
      bestQuality = q;
    }
  }
  return bestQuality > 0 ? best : null;
}

function readQuickStatsFromLocalStorage(profile: any): any | null {
  try {
    if (typeof window === "undefined") return null;
    const keys = ["dc-quick-stats", "dc_quick_stats", "dc_profile_quick_stats_v1", "dc-basic-profile-stats"];
    for (const key of keys) {
      const raw = window.localStorage?.getItem(key);
      if (!raw) continue;
      const bag = JSON.parse(raw);
      for (const id of x01ProfileIdentityKeys(profile)) {
        if (bag?.[id]) return bag[id];
      }
    }
    return null;
  } catch {
    return null;
  }
}

function readLinkedStatsOverride(profile: any): any | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage?.getItem("dc_linked_profile_stats_overrides_v1");
    if (!raw) return null;
    const bag = JSON.parse(raw);
    for (const id of x01ProfileIdentityKeys(profile)) {
      const row = bag?.[id];
      if (row) return row?.miniStats || row?.stats || row;
    }
  } catch {}
  return null;
}

function getProfileName(profile: any): string {
  return String(profile?.name || profile?.displayName || profile?.nickname || profile?.playerName || profile?.label || profile?.profileName || "").trim();
}

async function getNormalizedHistoryOnce() {
  if (!normalizedHistoryPromise) {
    normalizedHistoryPromise = Promise.resolve(loadNormalizedHistory()).catch(() => []);
  }
  return normalizedHistoryPromise;
}

async function getFullHistoryRowsOnce() {
  if (!fullHistoryRowsPromise) {
    fullHistoryRowsPromise = (async () => {
      try {
        const lightRows = ((await (History as any).listFinished?.()) ?? (await (History as any).list?.()) ?? []) as any[];
        const ids = Array.from(new Set((Array.isArray(lightRows) ? lightRows : [])
          .map((r: any) => String(r?.matchId ?? r?.id ?? "").trim())
          .filter(Boolean)));
        const fullRows = await Promise.all(ids.slice(0, 700).map((id) => (History as any).get(id).catch(() => null)));
        return fullRows.filter(Boolean) as any[];
      } catch {
        return [];
      }
    })();
  }
  return fullHistoryRowsPromise;
}

function dashboardStatsFromAny(raw: any): MiniStats | null {
  if (!raw || typeof raw !== "object") return null;
  const out: MiniStats = {
    avg3: Number(raw?.avg3Overall ?? raw?.avg3 ?? raw?.avg3d ?? raw?.avg3D ?? 0) || 0,
    avg3d: Number(raw?.avg3Overall ?? raw?.avg3 ?? raw?.avg3d ?? raw?.avg3D ?? 0) || 0,
    games: Number(raw?.sessions ?? raw?.matches ?? raw?.games ?? 0) || 0,
    sessions: Number(raw?.sessions ?? raw?.matches ?? raw?.games ?? 0) || 0,
    darts: Number(raw?.totalDarts ?? raw?.darts ?? 0) || 0,
    bestVisit: Number(raw?.bestVisit ?? raw?.best_visit ?? 0) || 0,
    bestCheckout: Number(raw?.bestCheckout ?? raw?.bestCO ?? raw?.best_checkout ?? 0) || 0,
  };
  return statsQuality(out) > 0 ? out : null;
}

async function computeStatsLikeProfilesPage(profileId: string, profile?: any): Promise<MiniStats | null> {
  const id = String(profileId || "").trim();
  const name = getProfileName(profile);
  let normalizedStats: MiniStats | null = null;

  try {
    const normalized = await getNormalizedHistoryOnce();
    const dash: any = buildDashboardFromNormalized(id, name || "Joueur", normalized || []);
    normalizedStats = dashboardStatsFromAny(dash);
  } catch {}

  if (normalizedStats && Number(normalizedStats.avg3 ?? normalizedStats.avg3d ?? 0) > 0) return normalizedStats;

  try {
    const rows = await getFullHistoryRowsOnce();
    if (rows.length) {
      let agg: any = computeX01MultiAgg(rows as any, id, name || "Joueur");
      if ((Number(agg?.sessions || 0) <= 0) && name) {
        const target = x01StarringNormText(name);
        let candidateId = "";
        for (const r of rows) {
          const session = r?.payload?.session || r?.payload || r;
          const players = session?.players || session?.session?.players || session?.config?.players || [];
          const found = (Array.isArray(players) ? players : []).find((pl: any) => x01StarringNormText(pl?.name ?? pl?.public_name ?? pl?.displayName) === target);
          if (found?.id) { candidateId = String(found.id); break; }
        }
        if (candidateId) {
          const alt = computeX01MultiAgg(rows as any, candidateId, name || "Joueur");
          if (Number(alt?.sessions || 0) > Number(agg?.sessions || 0)) agg = alt;
        }
      }
      const sessions = Number(agg?.sessions || 0);
      if (sessions > 0) {
        const avg3 = Number(agg?.sumAvg3D || 0) > 0
          ? Number(agg.sumAvg3D) / sessions
          : Number(agg?.darts || 0) > 0 && Number(agg?.scoreTotal || 0) > 0
            ? (Number(agg.scoreTotal) / Number(agg.darts)) * 3
            : 0;
        const full: MiniStats = {
          avg3,
          avg3d: avg3,
          avg3D: avg3,
          games: sessions,
          sessions,
          darts: Number(agg?.darts || 0) || 0,
          bestVisit: Number(agg?.bestVisit || 0) || 0,
          bestCheckout: Number(agg?.bestCheckout || 0) || 0,
        };
        return pickBestStats(full, normalizedStats);
      }
    }
  } catch {}

  return normalizedStats;
}

export async function loadX01ProfileStatsForStarring(profileId: string, profile?: any): Promise<MiniStats | null> {
  const id = String(profileId || "").trim();
  const name = getProfileName(profile);
  const cacheKey = `${id}::${x01StarringNormText(name)}`;
  if (statsCache.has(cacheKey)) {
    const cached = statsCache.get(cacheKey);
    return cached && typeof (cached as any).then === "function" ? await (cached as Promise<MiniStats | null>) : (cached as MiniStats | null);
  }

  const promise = (async () => {
    let syncStats: any = null;
    let asyncStats: any = null;
    try { syncStats = StatsBridge.getBasicProfileStats(id); } catch {}
    try { asyncStats = await StatsBridge.getBasicProfileStatsAsync(id); } catch {}
    const quick = profile ? readQuickStatsFromLocalStorage(profile) : null;
    const linked = profile ? readLinkedStatsOverride(profile) : null;
    const statsHub = await computeStatsLikeProfilesPage(id, profile);
    const best = pickBestStats(syncStats, asyncStats, quick, linked, statsHub);
    statsCache.set(cacheKey, best || null);
    return best || null;
  })().catch(() => null);

  statsCache.set(cacheKey, promise);
  const result = await promise;
  statsCache.set(cacheKey, result || null);
  return result || null;
}

function collectNumbersByKeys(root: any, names: Set<string>, maxDepth = 5): any[] {
  const out: any[] = [];
  const seen = new Set<any>();
  const walk = (node: any, depth: number) => {
    if (node == null || depth > maxDepth) return;
    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const child of node.slice(0, 60)) walk(child, depth + 1);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      const k = String(key || "").trim();
      if (names.has(k)) out.push(value);
      if (value && typeof value === "object") walk(value, depth + 1);
    }
  };
  walk(root, 0);
  return out;
}

export function x01ProfileLevelValue(raw: any): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const normalized = raw > 5 ? raw / 20 : raw;
    return Math.max(0, Math.min(5, Math.round(normalized * 2) / 2));
  }
  const text = String(raw ?? "").trim().toLowerCase().replace(",", ".");
  if (!text) return 0;
  const fraction = text.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
  if (fraction) {
    const n = Number(fraction[1]);
    if (Number.isFinite(n) && n > 0) return Math.max(0, Math.min(5, Math.round(n * 2) / 2));
  }
  const n = Number((text.match(/\d+(?:\.5)?/) || [""])[0]);
  if (Number.isFinite(n) && n > 0) {
    const normalized = n > 5 ? n / 20 : n;
    return Math.max(0, Math.min(5, Math.round(normalized * 2) / 2));
  }
  if (text.includes("legend") || text.includes("légende") || text.includes("legende") || text.includes("elite")) return 5;
  if (text.includes("prodige")) return 4.5;
  if (text.includes("pro")) return 4;
  if (text.includes("challenger")) return 4;
  if (text.includes("mixte") || text.includes("mix")) return 3.5;
  if (text.includes("strong") || text.includes("fort") || text.includes("hard") || text.includes("difficile")) return 3;
  if (text.includes("medium") || text.includes("standard") || text.includes("normal") || text.includes("moyen")) return 2;
  if (text.includes("easy") || text.includes("facile") || text.includes("beginner") || text.includes("debutant") || text.includes("débutant") || text.includes("rookie")) return 1;
  return 0;
}

export function getX01ProfileStarData(profile: any, statsById: Record<string, any> = {}): X01ProfileStarData | null {
  const avgKeys = new Set([
    "avg3", "avg3d", "avg3D", "avg3Overall", "average3Darts", "average3D", "moy3d", "moyenne3",
  ]);
  const levelKeys = new Set([
    "profileStarring", "profileStars", "profileStarRating", "starring", "stars", "levelStars", "botLevel", "x01ProfileStarring", "dartsProfileStarring",
  ]);

  // Important : ne pas lire les champs génériques `avg` / `stats.avg*` directement
  // sur le profil local. Certains profils y stockent autre chose ou une valeur transitoire
  // et cela provoquait l'affichage d'une demi-étoile avant la vraie note de la page Profils.
  const quickStatsForStars = readQuickStatsFromLocalStorage(profile);
  const linkedStatsForStars = readLinkedStatsOverride(profile);
  const avgCandidates: any[] = [
    profile?.stats?.x01?.avg3,
    profile?.stats?.x01?.avg3d,
    profile?.stats?.x01?.avg3D,
    profile?.x01?.avg3,
    profile?.x01?.avg3d,
    profile?.x01?.avg3D,
    profile?.x01Stats?.avg3,
    profile?.x01Stats?.avg3d,
    profile?.x01Stats?.avg3D,
    profile?.darts?.avg3,
    profile?.darts?.avg3d,
    profile?.darts?.avg3D,
    profile?.stats?.darts?.avg3,
    profile?.stats?.darts?.avg3d,
    profile?.stats?.darts?.avg3D,
    quickStatsForStars?.avg3,
    quickStatsForStars?.avg3d,
    linkedStatsForStars?.avg3,
    linkedStatsForStars?.avg3d,
  ];

  for (const id of x01ProfileIdentityKeys(profile)) {
    const s = statsById?.[id] || {};
    avgCandidates.push(...collectNumbersByKeys(s, avgKeys, 4));
  }

  const normalizedName = x01StarringNormText(getProfileName(profile));
  if (normalizedName) {
    for (const row of Object.values(statsById || {})) {
      const r: any = row || {};
      const rowName = x01StarringNormText(r?.name || r?.displayName || r?.nickname || r?.playerName || r?.profileName);
      if (rowName && rowName === normalizedName) avgCandidates.push(...collectNumbersByKeys(r, avgKeys, 4));
    }
  }

  const avgValues = avgCandidates
    .map((raw) => numberFromAny(raw))
    .filter((avg3d) => Number.isFinite(avg3d) && avg3d > 0 && avg3d <= 180);
  if (avgValues.length) {
    // On garde la valeur la plus forte disponible pour éviter qu'un vieux mini-cache
    // plus faible masque la vraie moyenne X01 recalculée comme sur la page Profils.
    return { kind: "avg3d", value: Math.max(...avgValues) };
  }

  const levelCandidates: any[] = collectNumbersByKeys(profile, levelKeys, 5);
  for (const id of x01ProfileIdentityKeys(profile)) {
    const s = statsById?.[id] || {};
    levelCandidates.push(...collectNumbersByKeys(s, levelKeys, 4));
  }
  for (const raw of levelCandidates) {
    const level = x01ProfileLevelValue(raw);
    if (level > 0) return { kind: "level", value: level };
  }
  return null;
}
