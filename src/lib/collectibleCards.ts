import { loadNormalizedHistory, type NormalizedMatch } from "./statsNormalized";
import { loadDartsFirefighterStatsUnified } from "./dartsFirefighterStats";

export type CollectibleCollectionId = "awena" | "firefighter";
export type CollectibleCardId =
  | "awena_bronze"
  | "awena_argent"
  | "awena_platine"
  | "awena_or"
  | "awena_diamant"
  | "firefighter_lyna"
  | "firefighter_zephyr"
  | "firefighter_kael"
  | "firefighter_braze"
  | "firefighter_aero"
  | "firefighter_malysia";

export type CollectibleMetricKey =
  | "matches"
  | "wins"
  | "modes"
  | "firefighterTacticalActions"
  | "firefighterWindMatches"
  | "firefighterWins"
  | "firefighterCriticalExtinguishes"
  | "firefighterCanadairs"
  | "firefighterMatches";

export type CollectibleMetrics = Record<CollectibleMetricKey, number>;
export type LocalizedText = { fr: string; en: string; es: string };
export type CollectibleRequirement = { metric: CollectibleMetricKey; target: number; label: LocalizedText };
export type CollectibleCardDefinition = {
  id: CollectibleCardId;
  collection: CollectibleCollectionId;
  name: string;
  subtitle: LocalizedText;
  tier?: "bronze" | "argent" | "platine" | "or" | "diamant";
  stars?: number;
  accent: string;
  requirements: CollectibleRequirement[];
};
export type CollectibleUnlock = { unlockedAt: number };
export type CollectibleUnlockMap = Partial<Record<CollectibleCardId, CollectibleUnlock>>;

export const COLLECTIBLE_CARDS: CollectibleCardDefinition[] = [
  { id: "awena_bronze", collection: "awena", name: "AWENA · BRONZE", tier: "bronze", stars: 5, accent: "#c77645", subtitle: { fr: "Premiers pas", en: "First steps", es: "Primeros pasos" }, requirements: [
    { metric: "matches", target: 5, label: { fr: "Parties terminées", en: "Completed matches", es: "Partidas terminadas" } },
  ] },
  { id: "awena_argent", collection: "awena", name: "AWENA · ARGENT", tier: "argent", stars: 7, accent: "#c7ced8", subtitle: { fr: "Compétitrice régulière", en: "Regular competitor", es: "Competidora habitual" }, requirements: [
    { metric: "matches", target: 25, label: { fr: "Parties terminées", en: "Completed matches", es: "Partidas terminadas" } },
    { metric: "wins", target: 5, label: { fr: "Victoires", en: "Wins", es: "Victorias" } },
  ] },
  { id: "awena_platine", collection: "awena", name: "AWENA · PLATINE", tier: "platine", stars: 10, accent: "#c9e7ff", subtitle: { fr: "Polyvalence confirmée", en: "Proven versatility", es: "Versatilidad confirmada" }, requirements: [
    { metric: "matches", target: 75, label: { fr: "Parties terminées", en: "Completed matches", es: "Partidas terminadas" } },
    { metric: "modes", target: 3, label: { fr: "Modes différents", en: "Different modes", es: "Modos diferentes" } },
  ] },
  { id: "awena_or", collection: "awena", name: "AWENA · OR", tier: "or", stars: 12, accent: "#f3c557", subtitle: { fr: "Joueuse accomplie", en: "Accomplished player", es: "Jugadora consolidada" }, requirements: [
    { metric: "matches", target: 150, label: { fr: "Parties terminées", en: "Completed matches", es: "Partidas terminadas" } },
    { metric: "wins", target: 50, label: { fr: "Victoires", en: "Wins", es: "Victorias" } },
    { metric: "modes", target: 5, label: { fr: "Modes différents", en: "Different modes", es: "Modos diferentes" } },
  ] },
  { id: "awena_diamant", collection: "awena", name: "AWENA · DIAMANT", tier: "diamant", stars: 14, accent: "#d879ff", subtitle: { fr: "Collection ultime", en: "Ultimate collection", es: "Colección definitiva" }, requirements: [
    { metric: "matches", target: 300, label: { fr: "Parties terminées", en: "Completed matches", es: "Partidas terminadas" } },
    { metric: "wins", target: 100, label: { fr: "Victoires", en: "Wins", es: "Victorias" } },
    { metric: "modes", target: 5, label: { fr: "Modes différents", en: "Different modes", es: "Modos diferentes" } },
  ] },
  { id: "firefighter_lyna", collection: "firefighter", name: "LYNA", accent: "#e5b24a", subtitle: { fr: "Éclaireuse tactique", en: "Tactical scout", es: "Exploradora táctica" }, requirements: [
    { metric: "firefighterTacticalActions", target: 25, label: { fr: "Protections / propagations bloquées", en: "Protections / blocked spreads", es: "Protecciones / propagaciones bloqueadas" } },
  ] },
  { id: "firefighter_zephyr", collection: "firefighter", name: "ZÉPHYR", accent: "#4bc7ff", subtitle: { fr: "Experte météo & vent", en: "Weather & wind expert", es: "Experta en clima y viento" }, requirements: [
    { metric: "firefighterWindMatches", target: 10, label: { fr: "Parties avec vent actif", en: "Matches with wind enabled", es: "Partidas con viento activo" } },
  ] },
  { id: "firefighter_kael", collection: "firefighter", name: "KAËL", accent: "#ffb23f", subtitle: { fr: "Chef d’intervention", en: "Incident commander", es: "Jefe de intervención" }, requirements: [
    { metric: "firefighterWins", target: 10, label: { fr: "Victoires Firefighter", en: "Firefighter wins", es: "Victorias Firefighter" } },
  ] },
  { id: "firefighter_braze", collection: "firefighter", name: "BRAZE", accent: "#ff5140", subtitle: { fr: "Attaque lourde", en: "Heavy attack", es: "Ataque pesado" }, requirements: [
    { metric: "firefighterCriticalExtinguishes", target: 25, label: { fr: "Feux critiques éteints", en: "Critical fires extinguished", es: "Incendios críticos extinguidos" } },
  ] },
  { id: "firefighter_aero", collection: "firefighter", name: "AERO", accent: "#ff8b2e", subtitle: { fr: "Pilote Canadair", en: "Water bomber pilot", es: "Piloto de hidroavión" }, requirements: [
    { metric: "firefighterCanadairs", target: 10, label: { fr: "Interventions Canadair", en: "Water bomber interventions", es: "Intervenciones aéreas" } },
  ] },
  { id: "firefighter_malysia", collection: "firefighter", name: "MALYSIA", accent: "#ff9a34", subtitle: { fr: "Spécialiste feux de forêt", en: "Wildfire specialist", es: "Especialista en incendios forestales" }, requirements: [
    { metric: "firefighterMatches", target: 12, label: { fr: "Missions Firefighter jouées", en: "Firefighter missions played", es: "Misiones Firefighter jugadas" } },
  ] },
];

function emptyMetrics(): CollectibleMetrics {
  return { matches: 0, wins: 0, modes: 0, firefighterTacticalActions: 0, firefighterWindMatches: 0, firefighterWins: 0, firefighterCriticalExtinguishes: 0, firefighterCanadairs: 0, firefighterMatches: 0 };
}

function sameProfile(value: unknown, profileId: string): boolean {
  return String(value ?? "").trim() === profileId;
}

function normalizedMatchIsFinished(match: NormalizedMatch): boolean {
  const raw: any = match.raw || {};
  const status = String(raw?.status || raw?.summary?.status || raw?.payload?.status || "").toLowerCase();
  if (status) return status === "finished" || status === "complete" || status === "completed";
  if (raw?.finished === false || raw?.summary?.finished === false || raw?.payload?.finished === false) return false;
  if (raw?.finished === true || raw?.summary?.finished === true || raw?.payload?.finished === true) return true;
  if (raw?.finishedAt || raw?.endedAt || raw?.completedAt || raw?.summary?.finishedAt || raw?.payload?.finishedAt) return true;
  return true;
}

function collectibleModeKey(match: NormalizedMatch): string {
  const raw: any = match.raw || {};
  const normalized = String(match?.mode || "").trim().toLowerCase();
  const fallback = String(
    raw?.game?.mode || raw?.mode || raw?.kind || raw?.summary?.mode || raw?.summary?.kind || raw?.payload?.mode || raw?.payload?.kind || ""
  ).trim().toLowerCase();
  const mode = normalized && normalized !== "unknown" ? normalized : fallback;
  if (!mode || mode === "unknown" || mode.includes("training") || mode.includes("entrainement") || mode.includes("entraînement")) return "";
  return mode.replace(/\s+/g, "_");
}

function normalizedMatchHasProfile(match: NormalizedMatch, profileId: string): boolean {
  if ((match.players || []).some((player) => sameProfile(player.playerId, profileId) || sameProfile(player.profileId, profileId))) return true;
  const raw: any = match.raw || {};
  const candidateLists = [raw?.players, raw?.summary?.players, raw?.summary?.perPlayer, raw?.payload?.players, raw?.payload?.stats?.players];
  return candidateLists.some((list) => Array.isArray(list) && list.some((player: any) => sameProfile(player?.id ?? player?.playerId ?? player?.profileId, profileId)));
}

function normalizedMatchWonByProfile(match: NormalizedMatch, profileId: string): boolean {
  if ((match.winnerIds || []).some((id) => sameProfile(id, profileId))) return true;
  const raw: any = match.raw || {};
  const candidateLists = [raw?.players, raw?.summary?.players, raw?.summary?.perPlayer, raw?.payload?.players, raw?.payload?.stats?.players];
  for (const list of candidateLists) {
    if (!Array.isArray(list)) continue;
    const player = list.find((entry: any) => sameProfile(entry?.id ?? entry?.playerId ?? entry?.profileId, profileId));
    if (player && (player?.win === true || player?.winner === true || (Number(player?.rank) === 1 && raw?.tied !== true))) return true;
  }
  return false;
}

function recordPlayer(row: any, profileId: string): any | null {
  const players = Array.isArray(row?.players) ? row.players : [];
  return players.find((player: any) => sameProfile(player?.id ?? player?.playerId ?? player?.profileId, profileId)) || null;
}

function countCriticalExtinguishes(row: any, profileId: string): number {
  const visits = Array.isArray(row?.visits) ? row.visits : [];
  const finalTerritories = Array.isArray(row?.finalTerritories) ? row.finalTerritories : [];
  const criticalIds = new Set(finalTerritories.filter((territory: any) => territory?.critical).map((territory: any) => String(territory?.id || "")));
  let count = 0;
  for (const visit of visits) {
    if (!sameProfile(visit?.playerId, profileId)) continue;
    for (const event of Array.isArray(visit?.events) ? visit.events : []) {
      if (String(event?.type || "") !== "extinguished") continue;
      const territoryId = String(event?.territoryId || "");
      const explicitlyCritical = String(event?.label || "").toUpperCase().includes("ZONE CRITIQUE");
      if ((territoryId && criticalIds.has(territoryId)) || explicitlyCritical) count += 1;
    }
  }
  return count;
}

function countCanadairs(row: any, profileId: string): number {
  const visits = Array.isArray(row?.visits) ? row.visits : [];
  return visits.reduce((sum: number, visit: any) => {
    if (!sameProfile(visit?.playerId, profileId)) return sum;
    return sum + (Array.isArray(visit?.events) ? visit.events.filter((event: any) => String(event?.type || "") === "canadair").length : 0);
  }, 0);
}

export async function computeCollectibleMetrics(profileIdInput: string): Promise<CollectibleMetrics> {
  const profileId = String(profileIdInput || "").trim();
  const metrics = emptyMetrics();
  if (!profileId) return metrics;

  const [history, firefighter] = await Promise.all([
    loadNormalizedHistory().catch(() => [] as NormalizedMatch[]),
    loadDartsFirefighterStatsUnified().catch(() => [] as any[]),
  ]);

  const modes = new Set<string>();
  for (const match of history || []) {
    if (!normalizedMatchIsFinished(match) || !normalizedMatchHasProfile(match, profileId)) continue;
    const mode = collectibleModeKey(match);
    if (!mode) continue;
    metrics.matches += 1;
    modes.add(mode);
    if (normalizedMatchWonByProfile(match, profileId)) metrics.wins += 1;
  }
  metrics.modes = modes.size;

  for (const row of firefighter || []) {
    const player = recordPlayer(row, profileId);
    if (!player) continue;
    metrics.firefighterTacticalActions += Number(player?.protectionsPlaced || 0) + Number(player?.propagationBlocked || 0);
    if ((row?.payload?.config?.windEnabled ?? row?.summary?.windEnabled ?? true) !== false) metrics.firefighterWindMatches += 1;
    metrics.firefighterMatches += 1;
    if (row?.won === true || player?.win === true || player?.winner === true) metrics.firefighterWins += 1;
    metrics.firefighterCriticalExtinguishes += countCriticalExtinguishes(row, profileId);
    metrics.firefighterCanadairs += countCanadairs(row, profileId);
  }

  return metrics;
}

export function cardRequirementProgress(card: CollectibleCardDefinition, metrics: CollectibleMetrics): number {
  if (!card.requirements.length) return 1;
  const ratios = card.requirements.map((req) => Math.max(0, Math.min(1, Number(metrics[req.metric] || 0) / Math.max(1, req.target))));
  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
}

export function isCollectibleCardEligible(card: CollectibleCardDefinition, metrics: CollectibleMetrics): boolean {
  return card.requirements.every((req) => Number(metrics[req.metric] || 0) >= req.target);
}

export function reconcileCollectibleUnlocks(previous: CollectibleUnlockMap | null | undefined, metrics: CollectibleMetrics, now = Date.now()): { unlocks: CollectibleUnlockMap; newlyUnlocked: CollectibleCardId[] } {
  const unlocks: CollectibleUnlockMap = { ...(previous || {}) };
  const newlyUnlocked: CollectibleCardId[] = [];
  for (const card of COLLECTIBLE_CARDS) {
    if (unlocks[card.id] || !isCollectibleCardEligible(card, metrics)) continue;
    unlocks[card.id] = { unlockedAt: now };
    newlyUnlocked.push(card.id);
  }
  return { unlocks, newlyUnlocked };
}
