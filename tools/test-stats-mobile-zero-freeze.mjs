import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const quick = read("src/hooks/useQuickStats.ts");
const hub = read("src/pages/StatsHub.tsx");
const app = read("src/App.tsx");
const dartsets = read("src/components/StatsDartSetsSection.tsx");
const rebuild = read("src/lib/stats/rebuildStatsFromHistory.ts");
const avatar = read("src/components/ProfileAvatar.tsx");

assert(!quick.includes("setInterval("), "QuickStats ne doit pas poller");
assert(!quick.includes("force: true"), "QuickStats ne doit pas forcer un rebuild");
assert(!quick.includes("dc-history-updated"), "QuickStats ne doit pas scanner l'historique à chaque événement");
assert(hub.includes("STATS_RENDER_PROFILE_PREFIX"), "Cache de rendu par profil absent");
assert(hub.includes("const storeHistory: SavedMatch[] = [];"), "StatsHub décompresse encore store.history");
assert(hub.includes('currentMode !== "dashboard" || !pid || rows.length === 0'), "Dashboard global non protégé");
assert(hub.includes('const wantsCricket = currentMode === "cricket"'), "Chargements étendus non limités au mode actif");
assert(hub.includes('lazyWithRetry(() => import("../components/StatsDartSetsSection"))'), "Mes fléchettes n'est pas lazy-loadé");
assert(app.includes("prewarmDartSetStatsRenderCache?.(activeId, activeName, force)"), "Préparation idle manquante");
assert(!dartsets.includes("ric(() => void run(), { timeout: 900 })"), "Recalcul Mes fléchettes encore forcé");
assert(dartsets.includes("const shouldRefresh = !cacheAtStart || refreshTick > 0"), "Cache Mes fléchettes recalculé au montage");
assert(dartsets.includes("const batchSize = isConstrainedDartSetDevice() ? 4 : 12"), "Lots mobiles Mes fléchettes absents");
assert(rebuild.includes("const HYDRATE_CHUNK = isConstrainedStatsIndexDevice() ? 4 : 12"), "Lots mobiles index stats absents");
assert(rebuild.includes("if (isConstrainedStatsIndexDevice()) ric(run);"), "Idle mobile encore forcé par timeout");
assert(avatar.includes("getCachedLocalProfilesForSafety"), "Avatar recharge encore le store complet en priorité");

console.log("✅ STATS MOBILE ZERO-FREEZE CONTRACT OK");
