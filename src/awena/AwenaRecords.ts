import { normalizeMany, type NormalizedMatch, type NormalizedPlayer } from "../lib/statsNormalized";
import { sampleFromRec as x01SampleFromRec } from "../lib/x01StatsSource";
import { History } from "../lib/history";
import { findAwenaMode, findAwenaModeById, type AwenaModeKnowledge } from "./AwenaKnowledge";
import type { AwenaReply, AwenaRuntimeContext } from "./awena.types";

type Metric = "winRate" | "wins" | "games" | "avg3" | "bestCheckout" | "average";

type PlayerAgg = {
  key: string;
  name: string;
  games: number;
  wins: number;
  avg3Sum: number;
  avg3Count: number;
  genericAvgSum: number;
  genericAvgCount: number;
  bestCheckout: number;
};

type AuthoritativeHistorySnapshot = {
  at: number;
  raw: any[];
  normalized: NormalizedMatch[];
  fingerprint: string;
};

type DynamicMetric = {
  id: string;
  label: string;
  aliases: string[];
  aggregation: "sum" | "avg" | "max";
  preferLower?: boolean;
};

type DynamicPlayerAgg = {
  key: string;
  name: string;
  games: number;
  wins: number;
  values: Record<string, { sum: number; count: number; max: number }>;
};

let authoritativeHistoryCache: AuthoritativeHistorySnapshot | null = null;
let authoritativeHistoryPromise: Promise<AuthoritativeHistorySnapshot> | null = null;
let detailedModeCache = new Map<string, { at: number; fingerprint: string; raw: any[]; normalized: NormalizedMatch[] }>();

// Les tableaux Records ouverts sans métrique précise varient à chaque clic.
const lastRecordDashboardSelection = new Map<string, string>();
type RecordDashboardSection = { id: string; text: string };

function randomDashboardSections(modeId: string, candidates: RecordDashboardSection[], maxSections = 5) {
  const unique = [...new Map(candidates.filter((item) => item.text.trim()).map((item) => [item.id, item])).values()];
  if (unique.length <= 1) return unique;
  const maxWanted = Math.min(maxSections, unique.length);
  const minWanted = Math.min(2, maxWanted);
  let selected: RecordDashboardSection[] = [];
  let signature = "";
  const previous = lastRecordDashboardSelection.get(modeId) || "";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const wanted = minWanted + Math.floor(Math.random() * Math.max(1, maxWanted - minWanted + 1));
    const shuffled = [...unique];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    selected = shuffled.slice(0, wanted);
    signature = selected.map((item) => item.id).sort().join("|");
    if (signature !== previous || unique.length <= wanted) break;
  }
  lastRecordDashboardSelection.set(modeId, signature);
  return selected;
}

const AUTHORITATIVE_CACHE_MS = 12_000;
const DETAILED_MODE_CACHE_MS = 45_000;

function norm(v: unknown) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s_%']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactWords(v: unknown) {
  return norm(v).replace(/\s+/g, " ");
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function firstFinite(...values: unknown[]) {
  for (const value of values) {
    const n = num(value);
    if (n != null) return n;
  }
  return null;
}

function boolish(v: unknown) {
  if (v === true || v === 1 || v === "1") return true;
  const s = norm(v);
  return ["true", "yes", "oui", "win", "winner", "won", "victory", "victoire", "gagne", "gagnant", "vainqueur"].includes(s);
}

function getTimestamp(rec: any) {
  return Number(
    rec?.updatedAt ??
    rec?.finishedAt ??
    rec?.createdAt ??
    rec?.ts ??
    rec?.date ??
    rec?.summary?.finishedAt ??
    rec?.summary?.updatedAt ??
    rec?.payload?.finishedAt ??
    rec?.payload?.updatedAt ??
    rec?.payload?.createdAt ??
    0
  ) || 0;
}


function isFinishedHistoryRecord(rec: any) {
  const status = norm(rec?.status);
  const explicitlyFinished = ["finished", "done", "ended", "match end", "match_end"].includes(status);
  if (explicitlyFinished) return true;
  if (rec?.summary?.finished === true || rec?.payload?.summary?.finished === true || rec?.resume?.summary?.finished === true) return true;
  if (rec?.winnerId || rec?.summary?.winnerId || rec?.payload?.winnerId || rec?.payload?.summary?.winnerId) return true;
  if (Array.isArray(rec?.summary?.rankings) && rec.summary.rankings.length > 0) return true;
  if (["in progress", "in_progress", "inprogress", "playing", "live"].includes(status)) return false;
  // Compatibilité legacy : les anciens matchs n'avaient pas toujours de status,
  // mais une ligne Historique sans marqueur "en cours" est traitée comme terminée.
  return true;
}

function fingerprint(rows: any[]) {
  let latest = 0;
  for (const row of rows || []) latest = Math.max(latest, getTimestamp(row));
  return `${rows?.length || 0}:${latest}`;
}

function normalizeSnapshot(raw: any[]): AuthoritativeHistorySnapshot {
  let normalized: NormalizedMatch[] = [];
  try {
    normalized = normalizeMany(Array.isArray(raw) ? raw : []);
  } catch (error) {
    console.warn("[AwenaRecords] normalisation Historique indisponible", error);
  }
  return {
    at: Date.now(),
    raw: Array.isArray(raw) ? raw : [],
    normalized,
    fingerprint: fingerprint(raw),
  };
}

/**
 * SOURCE DE VÉRITÉ AWENA RECORDS
 * --------------------------------
 * Les records doivent partir de History.list(), donc de TOUTES les parties
 * réellement enregistrées dans IndexedDB + fallback localStorage. History.readAll()
 * n'est qu'un cache UI léger (limité et possiblement vide au démarrage) : il ne doit
 * jamais décider qu'une partie/statistique n'existe pas.
 */
async function authoritativeHistory(force = false): Promise<AuthoritativeHistorySnapshot> {
  const now = Date.now();
  if (!force && authoritativeHistoryCache && now - authoritativeHistoryCache.at < AUTHORITATIVE_CACHE_MS) {
    return authoritativeHistoryCache;
  }
  if (!force && authoritativeHistoryPromise) return authoritativeHistoryPromise;

  authoritativeHistoryPromise = (async () => {
    try {
      const rows = await History.list();
      const snapshot = normalizeSnapshot(Array.isArray(rows) ? rows : []);
      authoritativeHistoryCache = snapshot;
      return snapshot;
    } catch (error) {
      console.warn("[AwenaRecords] History.list indisponible, fallback cache UI", error);
      let fallback: any[] = [];
      try {
        const rows = History.readAll();
        fallback = Array.isArray(rows) ? rows : [];
      } catch {}
      const snapshot = normalizeSnapshot(fallback);
      authoritativeHistoryCache = snapshot;
      return snapshot;
    } finally {
      authoritativeHistoryPromise = null;
    }
  })();

  return authoritativeHistoryPromise;
}

function invalidateAwenaRecordsCaches() {
  authoritativeHistoryCache = null;
  authoritativeHistoryPromise = null;
  detailedModeCache.clear();
}

try {
  if (typeof window !== "undefined") {
    window.addEventListener("dc-history-updated", invalidateAwenaRecordsCaches as EventListener);
    window.addEventListener("dc-stats-index-updated", invalidateAwenaRecordsCaches as EventListener);
    window.addEventListener("storage", (event: StorageEvent) => {
      const key = String(event?.key || "").toLowerCase();
      if (!key || key.includes("history") || key.includes("stats")) invalidateAwenaRecordsCaches();
    });
  }
} catch {}

/** Précharge l'index COMPLET de l'Historique en arrière-plan. */
export function warmAwenaRecordsCache() {
  void authoritativeHistory().catch(() => {});
}

export function isAwenaRecordsQuestion(question: string, context?: AwenaRuntimeContext) {
  const q = norm(question);
  if (!q) return false;

  const definitionOnly = /^(qu est ce que|c est quoi|que signifie|ca veut dire quoi|ça veut dire quoi|a quoi correspond|a quoi sert|comment fonctionne (?:la|le|les) |que contient|explique moi ce qu est|definition de|définition de)/.test(q);
  if (definitionOnly && !/\brecords?\b|\bstats?\b|statistique|classement|ranking|top/.test(q)) return false;

  // Intentions statistiques explicites. Les simples mots de vocabulaire
  // (« c'est quoi un double ? », « qu'est-ce qu'un Bull ? ») ne doivent PAS
  // être détournés vers Records.
  if (/\brecords?\b|\bstats?\b|statistique|classement|ranking|\btop\s*\d*\b|tableau des scores|leaderboard/.test(q)) return true;
  if (/pourcentage.*victoire|taux.*victoire|%.*victoire|win rate|moyenne|avg3|avg 1|best visit|best 9|meilleure volee|meilleure volée|meilleur checkout|meilleure sortie|hits? %|taux de touches|miss %|simple %|double %|triple %|bull %|dbull %|bust %|co %|ratio legs|ratio sets/.test(q)) return true;

  const comparative =
    /^(qui|quel joueur|quelle joueuse|quel profil|quelle equipe|quelle équipe).*(plus|moins|premier|premiere|dernier|derniere|meilleur|meilleure|pire)/.test(q)
    || /\b(plus|moins) de\b.*\b(kill|mort|elimination|degat|vie|flechette|lancer|hit|touche|bull|double|triple|miss|bust|checkout|capture|vol|territoire|180|140|100|60)/.test(q);
  if (comparative) return true;

  const numericQuestion = /\bcombien\b.*\b(kill|mort|elimination|degat|vie|flechette|lancer|hit|touche|bull|double|triple|miss|bust|checkout|capture|vol|territoire|victoire|partie|180|140|100|60)/.test(q);
  if (numericQuestion) return true;

  // Relance courte après un sujet Records déjà actif.
  const remembered = String(context?.extra?.awenaKnowledgeTopic || "");
  if (/record|stat/.test(norm(remembered)) && /^(et |sinon |alors )?(qui|combien|lequel|laquelle|top|meilleur|pire|plus|moins)/.test(q)) return true;

  return false;
}

function periodFromQuestion(question: string) {
  const q = norm(question);
  const now = Date.now();
  if (/aujourd hui|24 h|24h|journee|journée/.test(q)) return { since: now - 86400000, label: "sur les dernières 24 heures" };
  if (/7 jours|semaine|hebdo/.test(q)) return { since: now - 7 * 86400000, label: "sur les 7 derniers jours" };
  if (/30 jours|1 mois|un mois|ce mois|mensuel/.test(q)) return { since: now - 30 * 86400000, label: "sur les 30 derniers jours" };
  if (/3 mois|90 jours/.test(q)) return { since: now - 90 * 86400000, label: "sur les 3 derniers mois" };
  if (/6 mois|180 jours/.test(q)) return { since: now - 180 * 86400000, label: "sur les 6 derniers mois" };
  if (/12 mois|1 an|un an|annee|année/.test(q)) return { since: now - 365 * 86400000, label: "sur les 12 derniers mois" };
  return { since: 0, label: "sur tout l'historique disponible" };
}

function metricFromQuestion(question: string, mode: AwenaModeKnowledge): Metric {
  const q = norm(question);
  if (/pourcentage.*victoire|taux.*victoire|%.*victoire|win rate/.test(q)) return "winRate";
  if (/nombre.*victoire|victoires|wins|qui a gagne le plus|qui gagne le plus/.test(q)) return "wins";
  if (/nombre.*partie|parties jouees|parties jouées|le plus de parties/.test(q)) return "games";
  if (/checkout|sortie/.test(q)) return "bestCheckout";
  if (/avg3|moyenne 3|moyenne.*flechette|moyenne.*fléchette/.test(q)) return mode.id === "x01" ? "avg3" : "average";
  if (/moyenne/.test(q)) return mode.id === "x01" ? "avg3" : "average";
  return "winRate";
}

function requestedCount(question: string) {
  const q = norm(question);
  const explicit = q.match(/\btop\s*(\d{1,2})\b|\b(\d{1,2})\s*(?:meilleurs|meilleures|premiers|premieres)\b/);
  if (explicit) return Math.max(1, Math.min(20, Number(explicit[1] || explicit[2] || 3)));
  if (/classement complet|classement general|classement général/.test(q)) return 20;
  if (/classement|ranking/.test(q)) return 5;
  if (/qui est|qui a|quel joueur|quelle joueuse|le meilleur|la meilleure|le pire|plus mauvais|plus mauvaise/.test(q)) return 1;
  return 3;
}

function asksWorst(question: string) {
  return /pire|plus mauvais|plus mauvaise|moins bon|moins bonne|dernier|derniere/.test(norm(question));
}

function asksAverage(question: string) {
  return /moyenne|par partie|en moyenne/.test(norm(question));
}

function requestedPlayerKey<T extends { name: string; key?: string }>(
  question: string,
  rows: T[],
  context?: AwenaRuntimeContext,
): string | null {
  const q = norm(question);
  if (/\b(moi|mes|mon|ma|mienne|mien)\b/.test(q) && context?.playerName) {
    const wanted = norm(context.playerName);
    const hit = rows.find((row) => norm(row.name) === wanted);
    return hit ? norm(hit.key || hit.name) : null;
  }

  // Plus le nom est long, moins on risque de confondre un prénom avec un mot
  // générique de la question.
  const candidates = rows
    .map((row) => ({ row, n: norm(row.name) }))
    .filter((x) => x.n.length >= 2 && q.includes(x.n))
    .sort((a, b) => b.n.length - a.n.length);
  const hit = candidates[0]?.row;
  return hit ? norm(hit.key || hit.name) : null;
}

function rawBlob(m: NormalizedMatch) {
  const r: any = m.raw || {};
  return norm([
    m.mode,
    r.kind, r.mode, r.variant, r.variantId, r.presetVariantId, r.gameMode, r.sport,
    r.game?.mode, r.game?.id, r.game?.variantId,
    r.summary?.mode, r.summary?.variant, r.summary?.variantId,
    r.payload?.kind, r.payload?.mode, r.payload?.variant, r.payload?.variantId, r.payload?.gameMode,
    r.payload?.game?.mode, r.payload?.config?.mode, r.payload?.config?.variant,
  ].filter(Boolean).join(" "));
}

const NORMALIZED_MODE_BY_AWENA: Record<string, string> = {
  x01: "x01",
  cricket: "cricket",
  killer: "killer",
  shanghai: "shanghai",
  departements: "territories",
  darts_firefighter: "darts_firefighter",
  darts_poker: "darts_poker",
  cargo: "cargo",
  ocean_control: "ocean_control",
  golf: "golf",
  bastard: "batard",
  battle_royale: "battle_royale",
  five_lives: "five_lives",
  scram: "scram",
  warfare: "warfare",
  attrape_moi: "attrape_moi",
  killer_progressive: "killer_progressive",
  mario_kart: "darts_racer",
  bobs_27: "bobs_27",
  shooter: "shooter",
  baseball: "baseball",
  president: "president",
  capital: "capital",
  loterie: "loterie",
  prisoner: "prisoner",
  bowling: "bowling",
  halve_it: "halve_it",
};

function rawModeIdentityValues(rec: any) {
  return [
    rec?.kind, rec?.mode, rec?.gameId, rec?.game?.mode, rec?.game?.id,
    rec?.summary?.mode, rec?.summary?.gameId,
    rec?.payload?.kind, rec?.payload?.mode, rec?.payload?.gameId,
    rec?.payload?.summary?.mode, rec?.payload?.summary?.gameId,
    rec?.payload?.stats?.mode,
  ].map(norm).filter(Boolean);
}

function rawVariantIdentityValues(rec: any) {
  return [
    rec?.variant, rec?.variantId, rec?.summary?.variant, rec?.summary?.variantId,
    rec?.payload?.variant, rec?.payload?.variantId, rec?.payload?.config?.variant,
  ].map(norm).filter(Boolean);
}

function modeIdentityAliases(mode: AwenaModeKnowledge) {
  const expected = NORMALIZED_MODE_BY_AWENA[mode.id];
  return new Set([mode.id, expected, mode.label, ...mode.aliases].map(norm).filter(Boolean));
}

function hasConflictingVariant(rec: any, mode: AwenaModeKnowledge) {
  const variants = rawVariantIdentityValues(rec);
  if (!variants.length) return false;
  const joined = variants.join(" ");
  if (mode.id === "x01" && /training/.test(joined)) return true;
  if (mode.id === "killer" && /progress/.test(joined)) return true;
  if (mode.id === "cricket" && /(cut throat|cutthroat|enculette|vache)/.test(joined)) return true;
  if (mode.id === "shanghai" && /variant/.test(joined) && !/shanghai/.test(joined)) return true;
  return false;
}

function hasConflictingModeIdentity(values: string[], mode: AwenaModeKnowledge) {
  const joined = values.join(" ");
  if (mode.id === "x01" && /training x01|x01 training/.test(joined)) return true;
  if (mode.id === "killer" && /killer progressive|progressive killer/.test(joined)) return true;
  if (mode.id === "cricket" && /cricket cut throat|cricket cutthroat|enculette|vache/.test(joined)) return true;
  return false;
}

function legacyIdentityMatches(value: string, expected: string, aliases: Set<string>) {
  if (aliases.has(value) || value === expected) return true;
  // Compatibilité des anciens kinds : x01_match, cargo_result, killer_game...
  // On n'autorise que des suffixes génériques, jamais un autre nom de variante.
  const suffix = value.startsWith(`${expected} `) ? value.slice(expected.length + 1) : "";
  return /^(match|game|result|history|end|ended|finished|summary)$/.test(suffix);
}

function rawMatchesMode(rec: any, mode: AwenaModeKnowledge) {
  const modeValues = rawModeIdentityValues(rec);
  const variantValues = rawVariantIdentityValues(rec);
  const aliases = modeIdentityAliases(mode);
  const expected = norm(NORMALIZED_MODE_BY_AWENA[mode.id] || mode.id);

  if (hasConflictingVariant(rec, mode) || hasConflictingModeIdentity(modeValues, mode)) return false;

  // Variantes qui partagent un moteur avec un jeu de base : on exige leur
  // identifiant de variante afin de ne jamais mélanger leurs records.
  if (mode.id === "cricket_cut_throat") return variantValues.some((v) => /cut throat|cutthroat/.test(v));
  if (mode.id === "enculette") return variantValues.some((v) => /enculette|vache/.test(v));
  if (mode.id === "killer_progressive") {
    return modeValues.some((v) => v === norm(mode.id) || v === expected) || variantValues.some((v) => /progress/.test(v));
  }

  // Dès qu'un enregistrement possède un identifiant explicite, on compare des
  // valeurs exactes. On évite ainsi "killer" qui avalerait "killer_progressive".
  if (modeValues.length) {
    if (modeValues.some((value) => legacyIdentityMatches(value, expected, aliases))) return true;
    return false;
  }

  // Compatibilité des très vieux historiques sans gameId/mode : seulement ici,
  // on autorise une recherche textuelle prudente.
  const blob = norm([
    rec?.sport, rec?.summary?.variant, rec?.payload?.variant,
  ].filter(Boolean).join(" "));
  return [...aliases].some((alias) => alias.length >= 4 && blob === alias);
}

function matchMode(m: NormalizedMatch, mode: AwenaModeKnowledge) {
  if (m?.raw && rawModeIdentityValues(m.raw).length) return rawMatchesMode(m.raw, mode);
  const expected = norm(NORMALIZED_MODE_BY_AWENA[mode.id] || mode.id);
  const normalizedMode = norm(m.mode);
  if (normalizedMode && (normalizedMode === expected || modeIdentityAliases(mode).has(normalizedMode))) return true;
  return false;
}


async function detailedModeHistory(
  mode: AwenaModeKnowledge,
  snapshot: AuthoritativeHistorySnapshot,
  periodSince = 0,
) {
  const cacheKey = `${mode.id}:${periodSince || 0}`;
  const cached = detailedModeCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.fingerprint === snapshot.fingerprint && now - cached.at < DETAILED_MODE_CACHE_MS) {
    return cached;
  }

  const headers = snapshot.raw.filter(
    (rec) => isFinishedHistoryRecord(rec) && (!periodSince || getTimestamp(rec) >= periodSince) && rawMatchesMode(rec, mode),
  );
  if (!headers.length) {
    const empty = { at: now, fingerprint: snapshot.fingerprint, raw: [] as any[], normalized: [] as NormalizedMatch[] };
    detailedModeCache.set(cacheKey, empty);
    return empty;
  }

  const fullRows = headers.slice();
  const CONCURRENCY = 8;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, headers.length) }, async () => {
    while (cursor < headers.length) {
      const index = cursor++;
      const header = headers[index];
      const id = String(header?.id ?? header?.matchId ?? "").trim();
      if (!id) continue;
      try {
        const full = await History.get(id);
        if (full) fullRows[index] = { ...header, ...full, payload: (full as any)?.payload ?? header?.payload };
      } catch {
        // Le header reste exploitable : une ancienne partie corrompue ne doit
        // pas empêcher les autres parties de participer aux records.
      }
    }
  });
  await Promise.all(workers);

  const result = {
    at: Date.now(),
    fingerprint: snapshot.fingerprint,
    raw: fullRows,
    normalized: normalizeMany(fullRows),
  };
  detailedModeCache.set(cacheKey, result);
  return result;
}

function playerKeys(p: NormalizedPlayer) {
  return Array.from(new Set([p.playerId, p.profileId, p.name].map((v) => norm(v)).filter(Boolean)));
}

function winnerMatches(m: NormalizedMatch, p: NormalizedPlayer) {
  const winners = (m.winnerIds || []).map(norm);
  return playerKeys(p).some((key) => winners.includes(key));
}

function recordValue(container: any, keys: string[], player: NormalizedPlayer) {
  if (!container || typeof container !== "object") return null;
  for (const key of keys) {
    const obj = container?.[key];
    if (obj && typeof obj === "object") {
      for (const pkey of [p.playerId, p.profileId, p.name].filter(Boolean) as string[]) {
        const n = Number(obj[pkey]);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return null;
}

function rawAverage(m: NormalizedMatch, p: NormalizedPlayer) {
  const r: any = m.raw || {};
  const direct = recordValue(r.summary, ["avg3ByPlayer", "averageByPlayer", "avgByPlayer"], p)
    ?? recordValue(r.payload?.summary, ["avg3ByPlayer", "averageByPlayer", "avgByPlayer"], p)
    ?? recordValue(r.payload?.stats, ["avg3ByPlayer", "averageByPlayer", "avgByPlayer"], p);
  if (direct != null) return direct;

  const playerStats = [
    ...(Array.isArray(r.payload?.stats?.players) ? r.payload.stats.players : []),
    ...(Array.isArray(r.summary?.players) ? r.summary.players : []),
  ];
  const found = playerStats.find((row: any) => playerKeys(p).some((key) => [row?.id, row?.profileId, row?.name].map(norm).includes(key)));
  const candidate = Number(found?.avg3 ?? found?.average ?? found?.avg ?? found?.meanScore ?? found?.averageScore);
  return Number.isFinite(candidate) ? candidate : null;
}

function x01AverageFromVisits(m: NormalizedMatch, p: NormalizedPlayer) {
  const keys = playerKeys(p);
  let score = 0;
  let darts = 0;
  for (const visit of m.visits || []) {
    if (!keys.includes(norm(visit.playerId))) continue;
    score += Number(visit.score || 0);
    darts += Array.isArray(visit.darts) ? visit.darts.length : 0;
  }
  return darts > 0 ? (score / darts) * 3 : null;
}

function rawBestCheckout(m: NormalizedMatch, p: NormalizedPlayer) {
  const r: any = m.raw || {};
  const direct = recordValue(r.summary, ["bestCheckoutByPlayer", "bestCheckout"], p)
    ?? recordValue(r.payload?.summary, ["bestCheckoutByPlayer", "bestCheckout"], p)
    ?? recordValue(r.payload?.stats, ["bestCheckoutByPlayer", "bestCheckout"], p);
  if (direct != null) return direct;
  const playerStats = [
    ...(Array.isArray(r.payload?.stats?.players) ? r.payload.stats.players : []),
    ...(Array.isArray(r.summary?.players) ? r.summary.players : []),
  ];
  const found = playerStats.find((row: any) => playerKeys(p).some((key) => [row?.id, row?.profileId, row?.name].map(norm).includes(key)));
  const candidate = Number(found?.bestCheckout ?? found?.checkout ?? found?.co);
  return Number.isFinite(candidate) ? candidate : 0;
}

function aggregate(matches: NormalizedMatch[]) {
  const byPlayer = new Map<string, PlayerAgg>();
  for (const m of matches) {
    for (const p of m.players || []) {
      const key = norm(p.profileId || p.playerId || p.name);
      if (!key) continue;
      const row = byPlayer.get(key) || {
        key,
        name: p.name || p.playerId || "Joueur",
        games: 0,
        wins: 0,
        avg3Sum: 0,
        avg3Count: 0,
        genericAvgSum: 0,
        genericAvgCount: 0,
        bestCheckout: 0,
      };
      row.name = p.name || row.name;
      row.games += 1;
      if (winnerMatches(m, p)) row.wins += 1;

      const avgRaw = rawAverage(m, p);
      const avgX01 = m.mode === "x01" ? (avgRaw ?? x01AverageFromVisits(m, p)) : null;
      if (avgX01 != null && Number.isFinite(avgX01)) {
        row.avg3Sum += avgX01;
        row.avg3Count += 1;
      }
      if (avgRaw != null && Number.isFinite(avgRaw)) {
        row.genericAvgSum += avgRaw;
        row.genericAvgCount += 1;
      }
      row.bestCheckout = Math.max(row.bestCheckout, rawBestCheckout(m, p));
      byPlayer.set(key, row);
    }
  }
  return Array.from(byPlayer.values());
}

function valueFor(row: PlayerAgg, metric: Metric) {
  if (metric === "winRate") return row.games > 0 ? (row.wins / row.games) * 100 : 0;
  if (metric === "wins") return row.wins;
  if (metric === "games") return row.games;
  if (metric === "avg3") return row.avg3Count ? row.avg3Sum / row.avg3Count : Number.NaN;
  if (metric === "average") return row.genericAvgCount ? row.genericAvgSum / row.genericAvgCount : Number.NaN;
  return row.bestCheckout;
}

function metricLabel(metric: Metric) {
  if (metric === "winRate") return "% de victoire";
  if (metric === "wins") return "victoires";
  if (metric === "games") return "parties jouées";
  if (metric === "avg3") return "moyenne 3 fléchettes";
  if (metric === "average") return "moyenne enregistrée";
  return "meilleur checkout";
}

function formatValue(metric: Metric, value: number, row: PlayerAgg) {
  if (metric === "winRate") return `${value.toFixed(1)} % (${row.wins}/${row.games})`;
  if (metric === "avg3" || metric === "average") return value.toFixed(2);
  return String(Math.round(value));
}

function rankRows(rows: PlayerAgg[], metric: Metric, worst: boolean, count: number) {
  return rows
    .map((row) => ({ row, value: valueFor(row, metric) }))
    .filter((x) => Number.isFinite(x.value) && (metric !== "bestCheckout" || x.value > 0))
    .sort((a, b) => worst ? a.value - b.value : b.value - a.value)
    .slice(0, count);
}

function bulletList(ranked: ReturnType<typeof rankRows>, metric: Metric) {
  return ranked.map((item, index) => `- **${index + 1}. ${item.row.name}** — ${formatValue(metric, item.value, item.row)}`).join("\n");
}

function universalDashboardCandidates(rows: PlayerAgg[]): RecordDashboardSection[] {
  const candidates: RecordDashboardSection[] = [];
  const rate = rankRows(rows, "winRate", false, 3);
  if (rate.length) candidates.push({ id: "winRate", text: `## % DE VICTOIRE
${bulletList(rate, "winRate")}` });
  const wins = rankRows(rows, "wins", false, 3);
  if (wins.length) candidates.push({ id: "wins", text: `## VICTOIRES
${bulletList(wins, "wins")}` });
  const games = rankRows(rows, "games", false, 3);
  if (games.length) candidates.push({ id: "games", text: `## PARTIES JOUÉES
${bulletList(games, "games")}` });
  const avg3 = rankRows(rows, "avg3", false, 3);
  if (avg3.length) candidates.push({ id: "avg3", text: `## MOYENNE 3 FLÉCHETTES
${bulletList(avg3, "avg3")}` });
  const average = rankRows(rows, "average", false, 3);
  if (average.length) candidates.push({ id: "average", text: `## MOYENNE ENREGISTRÉE
${bulletList(average, "average")}` });
  const checkout = rankRows(rows, "bestCheckout", false, 3);
  if (checkout.length) candidates.push({ id: "bestCheckout", text: `## MEILLEUR CHECKOUT
${bulletList(checkout, "bestCheckout")}` });
  return candidates;
}

function dashboard(rows: PlayerAgg[], mode: AwenaModeKnowledge, periodLabel: string) {
  const chosen = randomDashboardSections(`${mode.id}:universal`, universalDashboardCandidates(rows), 4);
  if (!chosen.length) return `Je n'ai pas encore assez de statistiques exploitables pour établir les records de ${mode.label} ${periodLabel}.`;
  return [`## RECORDS — ${mode.label.toUpperCase()}
${periodLabel}.`, ...chosen.map((item) => item.text)].join("\n\n");
}

// ---------------------------------------------------------------------------
// Statistiques riches / dynamiques
// ---------------------------------------------------------------------------

const KILLER_METRICS: DynamicMetric[] = [
  { id: "killsReceived", label: "kills reçus / éliminations subies", aliases: ["kill recu", "kills recus", "recu le plus de kills", "kills subis", "eliminations subies", "morts", "deces", "deaths"], aggregation: "sum" },
  { id: "kills", label: "kills réalisés", aliases: ["kill", "kills", "eliminations infligees", "joueurs elimines", "tues"], aggregation: "sum" },
  { id: "damage", label: "dégâts / vies prises", aliases: ["degats", "damage", "vies prises", "lives taken"], aggregation: "sum" },
  { id: "damageReceived", label: "dégâts / vies perdues", aliases: ["degats recus", "damage taken", "vies perdues", "lives lost"], aggregation: "sum" },
  { id: "darts", label: "fléchettes / lancers", aliases: ["flechettes", "lancers", "darts", "throws"], aggregation: "sum" },
  { id: "hits", label: "touches réussies", aliases: ["touches", "hits", "coups touches"], aggregation: "sum" },
  { id: "autoKills", label: "auto-kills", aliases: ["auto kill", "auto kills", "autokill", "autokills"], aggregation: "sum" },
  { id: "autoHits", label: "auto-hits", aliases: ["auto hit", "auto hits", "autohit", "autohits"], aggregation: "sum" },
  { id: "livesStolen", label: "vies volées", aliases: ["vies volees", "lives stolen", "vol de vies"], aggregation: "sum" },
  { id: "livesHealed", label: "vies gagnées / soignées", aliases: ["vies gagnees", "vies soignees", "lives healed", "soins"], aggregation: "sum" },
  { id: "disarmsTriggered", label: "désarmements déclenchés", aliases: ["desarmements declenches", "desarmements", "disarms triggered"], aggregation: "sum" },
  { id: "disarmsReceived", label: "désarmements reçus", aliases: ["desarmements recus", "disarms received"], aggregation: "sum" },
  { id: "shieldBreaks", label: "boucliers cassés", aliases: ["boucliers casses", "shield breaks", "boucliers brises"], aggregation: "sum" },
  { id: "shieldHalfBreaks", label: "boucliers affaiblis", aliases: ["boucliers affaiblis", "shield half breaks"], aggregation: "sum" },
  { id: "resurrectionsGiven", label: "résurrections données", aliases: ["resurrections donnees", "resurrections effectuees", "resurrections given"], aggregation: "sum" },
  { id: "resurrectionsReceived", label: "résurrections reçues", aliases: ["resurrections recues", "resurrections received"], aggregation: "sum" },
  { id: "uselessHits", label: "touches inutiles", aliases: ["touches inutiles", "useless hits"], aggregation: "sum", preferLower: true },
  { id: "rearmThrows", label: "lancers pour devenir Killer", aliases: ["lancers pour devenir killer", "throws to become killer", "rearm throws", "devenir killer"], aggregation: "avg", preferLower: true },
];

const FIELD_TRANSLATIONS: Record<string, string[]> = {
  kills: ["kills", "eliminations", "tues"],
  killcount: ["kills", "nombre de kills"],
  deaths: ["morts", "deces", "kills recus", "eliminations subies"],
  deathcount: ["morts", "deces", "kills recus"],
  damagedealt: ["degats", "degats infliges"],
  dmgdealt: ["degats", "degats infliges"],
  damagetaken: ["degats recus"],
  dmgtaken: ["degats recus"],
  livestaken: ["vies prises", "degats"],
  liveslost: ["vies perdues", "degats recus"],
  autokills: ["auto kills", "autokills"],
  autohits: ["auto hits", "autohits"],
  selfpenaltyhits: ["auto hits", "penalites personnelles"],
  livesstolen: ["vies volees"],
  liveshealed: ["vies gagnees", "soins"],
  disarmstriggered: ["desarmements declenches", "desarmements"],
  disarmsreceived: ["desarmements recus"],
  shieldbreaks: ["boucliers casses"],
  shieldhalfbreaks: ["boucliers affaiblis"],
  resurrectionsgiven: ["resurrections donnees"],
  resurrectionsreceived: ["resurrections recues"],
  thrown: ["flechettes", "lancers"],
  darts: ["flechettes", "lancers"],
  totalthrows: ["flechettes", "lancers"],
  hits: ["touches", "hits"],
  totalhits: ["touches", "hits"],
  bulls: ["bulls", "bull"],
  dbulls: ["double bulls", "dbulls", "double bull"],
  doubles: ["doubles"],
  triples: ["triples"],
  singles: ["simples"],
  misses: ["miss", "rates", "manques"],
  count180: ["180", "nombre de 180"],
  hits180: ["180", "nombre de 180"],
  visits180: ["180", "nombre de 180"],
  total180: ["180", "nombre de 180"],
  n180: ["180", "nombre de 180"],
  count140: ["140 plus", "140+"],
  hits140: ["140 plus", "140+"],
  count100: ["100 plus", "100+"],
  hits100: ["100 plus", "100+"],
  count60: ["60 plus", "60+"],
  hits60: ["60 plus", "60+"],
  bestscore: ["meilleur score"],
  bestvisit: ["meilleure volee", "best visit"],
  captures: ["captures"],
  steals: ["vols", "steals"],
  territories: ["territoires"],
  bestcheckout: ["meilleur checkout", "meilleure sortie"],
  avg3: ["moyenne 3 flechettes", "avg3"],
  average: ["moyenne"],
  precision: ["precision"],
  accuracy: ["precision"],
};

function resolveKillerMetric(question: string): DynamicMetric | null {
  const q = norm(question);

  // La formulation "reçu le plus de kills" doit être testée avant "kills".
  if (/recu.*kills?|kills?.*recu|subi.*kills?|kills?.*subi|eliminations? subies|morts?|deces/.test(q)) {
    return KILLER_METRICS.find((m) => m.id === "killsReceived") || null;
  }

  for (const metric of KILLER_METRICS) {
    if (metric.id === "killsReceived") continue;
    if (metric.aliases.some((alias) => q.includes(norm(alias)))) return metric;
  }
  return null;
}

function rawPlayerIdentity(row: any, fallbackKey = "") {
  const key = String(
    row?.profileId ??
    row?.playerId ??
    row?.id ??
    row?.sourceProfileId ??
    row?.sourcePlayerId ??
    fallbackKey ??
    row?.name ??
    ""
  ).trim();
  const name = String((row?.name ?? row?.playerName ?? row?.displayName ?? row?.nickname ?? key) || "Joueur").trim();
  return { key: norm(key || name), name };
}

function addPlayerContainer(target: Map<string, any>, value: any) {
  if (!value) return;
  const add = (row: any, fallbackKey = "") => {
    if (!row || typeof row !== "object") return;
    const ident = rawPlayerIdentity(row, fallbackKey);
    if (!ident.key) return;
    const previous = target.get(ident.key) || {};
    target.set(ident.key, {
      ...previous,
      ...row,
      name: row?.name || previous?.name || ident.name,
      special: { ...(previous?.special || {}), ...(row?.special || {}) },
      darts: { ...(previous?.darts || {}), ...(row?.darts || {}) },
      stats: { ...(previous?.stats || {}), ...(row?.stats || {}) },
    });
  };
  if (Array.isArray(value)) {
    value.forEach((row) => add(row));
    return;
  }
  if (typeof value === "object") {
    for (const [key, row] of Object.entries(value)) add(row, key);
  }
}

function playerRowsForRecord(rec: any) {
  const target = new Map<string, any>();
  const summary = rec?.summary || {};
  const payload = rec?.payload || {};
  const ps = payload?.summary || {};
  const stats = payload?.stats || {};

  // Les blocs les plus riches sont ajoutés en dernier pour écraser les champs
  // simplifiés sans perdre l'identité du joueur.
  addPlayerContainer(target, rec?.players);
  addPlayerContainer(target, payload?.players);
  addPlayerContainer(target, summary?.players);
  addPlayerContainer(target, ps?.players);
  addPlayerContainer(target, summary?.perPlayer);
  addPlayerContainer(target, ps?.perPlayer);
  addPlayerContainer(target, summary?.detailedByPlayer);
  addPlayerContainer(target, summary?.perPlayerMap);
  addPlayerContainer(target, ps?.detailedByPlayer);
  addPlayerContainer(target, ps?.perPlayerMap);
  addPlayerContainer(target, stats?.players);
  addPlayerContainer(target, stats?.killer?.perPlayer);

  return Array.from(target.entries()).map(([key, row]) => ({ key, row }));
}


type X01MetricId =
  | "avg3" | "avg1" | "bestVisit" | "best9" | "bestCheckout" | "darts" | "visits" | "points"
  | "hitsTotal" | "hitRate" | "singles" | "singleRate" | "doubles" | "doubleRate"
  | "triples" | "tripleRate" | "bulls" | "bullRate" | "dbulls" | "dbullRate"
  | "misses" | "missRate" | "busts" | "bustRate"
  | "h50" | "h60" | "h80" | "h100" | "h120" | "h140" | "h180"
  | "checkoutHits" | "checkoutAttempts" | "checkoutRate"
  | "legsWon" | "legsPlayed" | "legWinRate" | "setsWon" | "setsPlayed" | "setWinRate";

type X01MetricDef = {
  id: X01MetricId;
  label: string;
  aggregation: "sum" | "max" | "avg3" | "avg1" | "rate";
  aliases: string[];
};

const X01_METRICS: X01MetricDef[] = [
  { id: "avg3", label: "AVG3D / moyenne 3 fléchettes", aggregation: "avg3", aliases: ["avg3", "avg3d", "moyenne", "moyenne 3 flechettes", "moyenne trois flechettes", "moyenne generale", "moyenne globale"] },
  { id: "avg1", label: "AVG 1 dart", aggregation: "avg1", aliases: ["avg 1 dart", "avg1", "moyenne 1 flechette", "moyenne une flechette", "moyenne par flechette"] },
  { id: "bestVisit", label: "meilleure volée / Best visit", aggregation: "max", aliases: ["meilleure volee", "best visit", "meilleur score sur une volee", "meilleure visite"] },
  { id: "best9", label: "Best 9 darts", aggregation: "max", aliases: ["best 9", "best9", "9 meilleures flechettes", "neuf meilleures flechettes", "meilleur debut 9 flechettes"] },
  { id: "bestCheckout", label: "meilleur checkout", aggregation: "max", aliases: ["meilleur checkout", "best checkout", "meilleure sortie", "plus grosse sortie"] },
  { id: "checkoutRate", label: "CO % / réussite checkout", aggregation: "rate", aliases: ["co %", "co%", "taux de checkout", "reussite checkout", "pourcentage checkout", "precision checkout", "checkout rate", "best co %"] },
  { id: "checkoutAttempts", label: "CO tentés / tentatives de checkout", aggregation: "sum", aliases: ["co tentes", "tentatives checkout", "checkout attempts", "tentatives de sortie"] },
  { id: "checkoutHits", label: "CO réussis / checkouts réussis", aggregation: "sum", aliases: ["co reussis", "checkouts reussis", "sorties reussies", "checkout hits", "nombre de checkout"] },
  { id: "hitRate", label: "Hits % / taux de touches", aggregation: "rate", aliases: ["hits %", "hit %", "taux de touches", "pourcentage de touches", "precision globale", "taux de hit"] },
  { id: "hitsTotal", label: "Hits totaux / touches", aggregation: "sum", aliases: ["hits totaux", "total hits", "touches totales", "nombre de touches", "hits"] },
  { id: "missRate", label: "Miss %", aggregation: "rate", aliases: ["miss %", "taux de miss", "pourcentage de miss", "taux de rates", "pourcentage de rates"] },
  { id: "singleRate", label: "Simple %", aggregation: "rate", aliases: ["simple %", "taux de simples", "pourcentage de simples"] },
  { id: "doubleRate", label: "Double %", aggregation: "rate", aliases: ["double %", "taux de doubles", "pourcentage de doubles"] },
  { id: "tripleRate", label: "Triple %", aggregation: "rate", aliases: ["triple %", "taux de triples", "pourcentage de triples"] },
  { id: "bullRate", label: "Bull %", aggregation: "rate", aliases: ["bull %", "taux de bull", "pourcentage de bull"] },
  { id: "dbullRate", label: "DBull %", aggregation: "rate", aliases: ["dbull %", "double bull %", "taux de dbull", "pourcentage de dbull"] },
  { id: "bustRate", label: "Bust %", aggregation: "rate", aliases: ["bust %", "taux de bust", "pourcentage de bust"] },
  { id: "h180", label: "180", aggregation: "sum", aliases: ["180", "nombre de 180"] },
  { id: "h140", label: "140+", aggregation: "sum", aliases: ["140+", "140 plus", "nombre de 140"] },
  { id: "h120", label: "120+", aggregation: "sum", aliases: ["120+", "120 plus", "nombre de 120"] },
  { id: "h100", label: "100+", aggregation: "sum", aliases: ["100+", "100 plus", "nombre de 100"] },
  { id: "h80", label: "80+", aggregation: "sum", aliases: ["80+", "80 plus", "nombre de 80"] },
  { id: "h60", label: "60+", aggregation: "sum", aliases: ["60+", "60 plus", "nombre de 60"] },
  { id: "h50", label: "50+", aggregation: "sum", aliases: ["50+", "50 plus", "nombre de 50"] },
  { id: "dbulls", label: "DBull (50)", aggregation: "sum", aliases: ["dbull", "dbulls", "double bull", "double bulls"] },
  { id: "bulls", label: "Bull (25)", aggregation: "sum", aliases: ["bull", "bulls"] },
  { id: "triples", label: "triples", aggregation: "sum", aliases: ["triple", "triples"] },
  { id: "doubles", label: "doubles", aggregation: "sum", aliases: ["double", "doubles"] },
  { id: "singles", label: "simples", aggregation: "sum", aliases: ["simple", "simples"] },
  { id: "misses", label: "MISS / ratés", aggregation: "sum", aliases: ["miss", "misses", "rates", "rates", "manques"] },
  { id: "busts", label: "busts", aggregation: "sum", aliases: ["bust", "busts"] },
  { id: "darts", label: "fléchettes lancées", aggregation: "sum", aliases: ["flechettes", "darts", "lancers", "flechettes lancees"] },
  { id: "visits", label: "volées / visites", aggregation: "sum", aliases: ["volees", "visites", "visits", "nombre de volees"] },
  { id: "points", label: "points scorés", aggregation: "sum", aliases: ["points", "points scores", "score total"] },
  { id: "legWinRate", label: "Ratio legs W %", aggregation: "rate", aliases: ["ratio legs", "legs w %", "taux de legs", "pourcentage de legs", "legs win rate"] },
  { id: "legsPlayed", label: "legs joués", aggregation: "sum", aliases: ["legs joues", "manches jouees"] },
  { id: "legsWon", label: "legs gagnés", aggregation: "sum", aliases: ["legs gagnes", "manches gagnees"] },
  { id: "setWinRate", label: "Ratio sets W %", aggregation: "rate", aliases: ["ratio sets", "sets w %", "taux de sets", "pourcentage de sets", "sets win rate"] },
  { id: "setsPlayed", label: "sets joués", aggregation: "sum", aliases: ["sets joues"] },
  { id: "setsWon", label: "sets gagnés", aggregation: "sum", aliases: ["sets gagnes"] },
];

function resolveX01Metric(question: string): X01MetricDef | null {
  const q = norm(question);
  // Les formulations les plus spécifiques d'abord pour éviter que « checkout »
  // masque « taux de checkout » ou « tentatives de checkout ».
  const ordered = [
    "checkoutRate", "checkoutAttempts", "checkoutHits", "bestCheckout", "best9", "bestVisit",
    "legWinRate", "setWinRate", "hitRate", "missRate", "singleRate", "doubleRate", "tripleRate", "bullRate", "dbullRate", "bustRate",
    "hitsTotal", "h180", "h140", "h120", "h100", "h80", "h60", "h50",
    "dbulls", "bulls", "triples", "doubles", "singles", "misses", "busts",
    "avg1", "avg3", "darts", "visits", "points", "legsPlayed", "legsWon", "setsPlayed", "setsWon",
  ] as X01MetricId[];
  for (const id of ordered) {
    const metric = X01_METRICS.find((item) => item.id === id)!;
    if (metric.aliases.some((alias) => q.includes(norm(alias)))) return metric;
  }
  return null;
}

function rawIdentityKeys(row: any, fallbackKey = "") {
  return Array.from(new Set([
    row?.id, row?.playerId, row?.profileId, row?.sourcePlayerId, row?.sourceProfileId, fallbackKey, row?.name,
  ].map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function mappedNumber(container: any, mapNames: string[], identities: string[]) {
  if (!container || typeof container !== "object") return null;
  for (const mapName of mapNames) {
    const map = container?.[mapName];
    if (!map || typeof map !== "object" || Array.isArray(map)) continue;
    for (const identity of identities) {
      if (Object.prototype.hasOwnProperty.call(map, identity)) {
        const n = num(map[identity]);
        if (n != null) return n;
      }
      const wanted = norm(identity);
      for (const [key, value] of Object.entries(map)) {
        if (norm(key) !== wanted) continue;
        const n = num(value);
        if (n != null) return n;
      }
    }
  }
  return null;
}

const x01SampleCache = new WeakMap<object, Map<string, any>>();

function x01SampleForRecord(rec: any, row: any, fallbackKey: string) {
  if (!rec || typeof rec !== "object") return null;
  const identities = rawIdentityKeys(row, fallbackKey);
  const cacheKey = identities[0] || norm(row?.name || fallbackKey);
  let byPlayer = x01SampleCache.get(rec);
  if (!byPlayer) {
    byPlayer = new Map<string, any>();
    x01SampleCache.set(rec, byPlayer);
  }
  if (byPlayer.has(cacheKey)) return byPlayer.get(cacheKey);
  const profileLike = {
    id: row?.profileId ?? row?.playerId ?? row?.id ?? fallbackKey,
    profileId: row?.profileId,
    playerId: row?.playerId ?? row?.id,
    name: row?.name ?? row?.playerName ?? row?.displayName ?? fallbackKey,
  };
  let sample = null;
  try { sample = x01SampleFromRec(rec, profileLike); } catch {}
  byPlayer.set(cacheKey, sample);
  return sample;
}

function x01HitTotalFromRecord(rec: any, row: any, fallbackKey: string) {
  const direct = firstFinite(row?.hitsTotal, row?.totalHits, row?.stats?.hitsTotal);
  if (direct != null) return direct;
  const components = ["singles", "doubles", "triples", "bulls", "dbulls"] as X01MetricId[];
  let total = 0;
  let found = false;
  for (const id of components) {
    const value = x01ValueFromRecord(rec, row, fallbackKey, id);
    if (value != null) { total += value; found = true; }
  }
  if (found) return total;
  const sample = x01SampleForRecord(rec, row, fallbackKey);
  if (!sample) return null;
  return Number(sample.singleHits || 0) + Number(sample.doubleHits || 0) + Number(sample.tripleHits || 0) + Number(sample.bull25 || 0) + Number(sample.bull50 || 0);
}

function x01ValueFromRecord(rec: any, row: any, fallbackKey: string, metricId: X01MetricId) {
  const identities = rawIdentityKeys(row, fallbackKey);
  const summary = rec?.summary || {};
  const payloadSummary = rec?.payload?.summary || {};
  const legacy = summary?.legacy || rec?.payload?.legacy || payloadSummary?.legacy || {};
  const buckets = row?.buckets || row?.stats?.buckets || {};

  const mapSources = [summary, payloadSummary, legacy, rec?.payload || {}, rec || {}];
  const fromMaps = (names: string[]) => {
    for (const source of mapSources) {
      const value = mappedNumber(source, names, identities);
      if (value != null) return value;
    }
    return null;
  };

  if (metricId === "avg3") return firstFinite(row?.avg3, row?.avg3d, row?.average, row?.stats?.avg3, fromMaps(["avg3ByPlayer", "avg3", "averageByPlayer"]), x01SampleForRecord(rec, row, fallbackKey)?.avg3);
  if (metricId === "avg1") {
    const points = x01ValueFromRecord(rec, row, fallbackKey, "points");
    const darts = x01ValueFromRecord(rec, row, fallbackKey, "darts");
    if (points != null && darts != null && darts > 0) return points / darts;
    const avg3 = x01ValueFromRecord(rec, row, fallbackKey, "avg3");
    return avg3 != null ? avg3 / 3 : null;
  }
  if (metricId === "bestVisit") return firstFinite(row?.bestVisit, row?.bestScore, row?.stats?.bestVisit, fromMaps(["bestVisitByPlayer", "bestVisit"]), x01SampleForRecord(rec, row, fallbackKey)?.bestVisit);
  if (metricId === "best9") return firstFinite(row?.best9Score, row?.best9, row?.stats?.best9Score, fromMaps(["best9ScoreByPlayer", "best9Score", "best9"]), x01SampleForRecord(rec, row, fallbackKey)?.best9Score);
  if (metricId === "bestCheckout") return firstFinite(row?.bestCheckout, row?.bestCO, row?.checkout, row?.co, row?.stats?.bestCheckout, fromMaps(["bestCheckoutByPlayer", "bestCheckout"]), x01SampleForRecord(rec, row, fallbackKey)?.bestCheckout);
  if (metricId === "darts") return firstFinite(row?.darts, row?.totalDarts, row?._sumDarts, row?.dartsThrown, row?.stats?.darts, fromMaps(["dartsByPlayer", "darts", "totalDartsByPlayer"]));
  if (metricId === "visits") return firstFinite(row?.visits, row?.totalVisits, row?._sumVisits, row?.stats?.visits, fromMaps(["visitsByPlayer", "visits"]));
  if (metricId === "points") return firstFinite(row?.points, row?._sumPoints, row?.totalPoints, row?.score, row?.stats?.points, fromMaps(["pointsByPlayer", "points"]));
  if (metricId === "hitsTotal") return x01HitTotalFromRecord(rec, row, fallbackKey);
  if (metricId === "singles") return firstFinite(row?.singles, row?.hits?.S, row?.hits?.s, row?.stats?.singles, fromMaps(["singlesByPlayer", "singles"]), x01SampleForRecord(rec, row, fallbackKey)?.singleHits);
  if (metricId === "doubles") return firstFinite(row?.doubles, row?.hits?.D, row?.hits?.d, row?.stats?.doubles, fromMaps(["doublesByPlayer", "doubles"]), x01SampleForRecord(rec, row, fallbackKey)?.doubleHits);
  if (metricId === "triples") return firstFinite(row?.triples, row?.hits?.T, row?.hits?.t, row?.stats?.triples, fromMaps(["triplesByPlayer", "triples"]), x01SampleForRecord(rec, row, fallbackKey)?.tripleHits);
  if (metricId === "bulls") return firstFinite(row?.bulls, row?.bull, row?.stats?.bulls, fromMaps(["bullsByPlayer", "bulls"]), x01SampleForRecord(rec, row, fallbackKey)?.bull25);
  if (metricId === "dbulls") return firstFinite(row?.dbulls, row?.dbull, row?.stats?.dbulls, fromMaps(["dbullsByPlayer", "dbulls"]), x01SampleForRecord(rec, row, fallbackKey)?.bull50);
  if (metricId === "misses") return firstFinite(row?.misses, row?.miss, row?.hits?.M, row?.hits?.m, row?.stats?.misses, fromMaps(["missesByPlayer", "misses", "miss"]), x01SampleForRecord(rec, row, fallbackKey)?.miss);
  if (metricId === "busts") return firstFinite(row?.busts, row?.bust, row?.stats?.busts, fromMaps(["bustsByPlayer", "busts", "bust"]), x01SampleForRecord(rec, row, fallbackKey)?.bust);
  if (metricId === "h50") return firstFinite(buckets?.["50+"], buckets?.h50, row?.h50, fromMaps(["h50", "hits50", "count50"]), x01SampleForRecord(rec, row, fallbackKey)?.h50);
  if (metricId === "h60") return firstFinite(buckets?.["60+"], buckets?.h60, row?.h60, fromMaps(["h60", "hits60", "count60"]), x01SampleForRecord(rec, row, fallbackKey)?.h60);
  if (metricId === "h80") return firstFinite(buckets?.["80+"], buckets?.h80, row?.h80, fromMaps(["h80", "hits80", "count80"]), x01SampleForRecord(rec, row, fallbackKey)?.h80);
  if (metricId === "h100") return firstFinite(buckets?.["100+"], buckets?.h100, row?.h100, fromMaps(["h100", "hits100", "count100"]), x01SampleForRecord(rec, row, fallbackKey)?.h100);
  if (metricId === "h120") return firstFinite(buckets?.["120+"], buckets?.h120, row?.h120, fromMaps(["h120", "hits120", "count120"]), x01SampleForRecord(rec, row, fallbackKey)?.h120);
  if (metricId === "h140") return firstFinite(buckets?.["140+"], buckets?.h140, row?.h140, fromMaps(["h140", "hits140", "count140"]), x01SampleForRecord(rec, row, fallbackKey)?.h140);
  if (metricId === "h180") return firstFinite(buckets?.["180"], buckets?.h180, row?.h180, row?.count180, fromMaps(["h180", "hits180", "count180", "visits180"]), x01SampleForRecord(rec, row, fallbackKey)?.h180);
  if (metricId === "checkoutHits") return firstFinite(row?.checkoutHits, row?.checkouts, row?.stats?.checkoutHits, fromMaps(["checkoutHitsByPlayer", "checkoutHits"]), x01SampleForRecord(rec, row, fallbackKey)?.coSuccess);
  if (metricId === "checkoutAttempts") return firstFinite(row?.checkoutAttempts, row?.stats?.checkoutAttempts, fromMaps(["checkoutAttemptsByPlayer", "checkoutAttempts"]), x01SampleForRecord(rec, row, fallbackKey)?.coAttempts);
  if (metricId === "legsWon") return firstFinite(row?.legsWon, row?.stats?.legsWon, fromMaps(["legsByPlayer", "legsWon", "legsScore"]), x01SampleForRecord(rec, row, fallbackKey)?.legsWon);
  if (metricId === "legsPlayed") return firstFinite(row?.legsPlayed, row?.stats?.legsPlayed, fromMaps(["legsPlayedByPlayer", "legsPlayed"]));
  if (metricId === "setsWon") return firstFinite(row?.setsWon, row?.stats?.setsWon, fromMaps(["setsByPlayer", "setsWon", "setsScore"]), x01SampleForRecord(rec, row, fallbackKey)?.setsWon);
  if (metricId === "setsPlayed") return firstFinite(row?.setsPlayed, row?.stats?.setsPlayed, fromMaps(["setsPlayedByPlayer", "setsPlayed"]));
  return null;
}

type X01MetricRow = {
  key: string;
  name: string;
  games: number;
  wins: number;
  value: number;
  coverage: number;
};

function aggregateX01Metric(records: any[], metric: X01MetricDef, averageRequested = false): X01MetricRow[] {
  const buckets = new Map<string, {
    key: string; name: string; games: number; wins: number; coverage: number;
    sum: number; max: number; avgSum: number; avgCount: number;
    points: number; darts: number; checkoutHits: number; checkoutAttempts: number;
    rateNumerator: number; rateDenominator: number;
  }>();

  for (const rec of records) {
    const winner = winnerIdFor(rec);
    for (const { key, row } of playerRowsForRecord(rec)) {
      const ident = rawPlayerIdentity(row, key);
      if (!ident.key) continue;
      const current = buckets.get(ident.key) || {
        key: ident.key, name: ident.name, games: 0, wins: 0, coverage: 0,
        sum: 0, max: 0, avgSum: 0, avgCount: 0, points: 0, darts: 0,
        checkoutHits: 0, checkoutAttempts: 0, rateNumerator: 0, rateDenominator: 0,
      };
      current.name = ident.name || current.name;
      current.games += 1;
      if ((winner && winner === ident.key) || boolish(row?.winner) || boolish(row?.win) || Number(row?.rank ?? row?.place ?? 0) === 1) current.wins += 1;

      if (metric.id === "avg3" || metric.id === "avg1") {
        const points = x01ValueFromRecord(rec, row, key, "points");
        const darts = x01ValueFromRecord(rec, row, key, "darts");
        const avg = x01ValueFromRecord(rec, row, key, metric.id);
        if (points != null && darts != null && darts > 0) {
          current.points += points;
          current.darts += darts;
          current.coverage += 1;
        } else if (avg != null) {
          current.avgSum += avg;
          current.avgCount += 1;
          current.coverage += 1;
        }
      } else if (metric.aggregation === "rate") {
        let numerator: number | null = null;
        let denominator: number | null = null;
        if (metric.id === "checkoutRate") { numerator = x01ValueFromRecord(rec, row, key, "checkoutHits"); denominator = x01ValueFromRecord(rec, row, key, "checkoutAttempts"); }
        else if (metric.id === "hitRate") { numerator = x01ValueFromRecord(rec, row, key, "hitsTotal"); denominator = x01ValueFromRecord(rec, row, key, "darts"); }
        else if (metric.id === "missRate") { numerator = x01ValueFromRecord(rec, row, key, "misses"); denominator = x01ValueFromRecord(rec, row, key, "darts"); }
        else if (metric.id === "singleRate") { numerator = x01ValueFromRecord(rec, row, key, "singles"); denominator = x01ValueFromRecord(rec, row, key, "hitsTotal"); }
        else if (metric.id === "doubleRate") { numerator = x01ValueFromRecord(rec, row, key, "doubles"); denominator = x01ValueFromRecord(rec, row, key, "hitsTotal"); }
        else if (metric.id === "tripleRate") { numerator = x01ValueFromRecord(rec, row, key, "triples"); denominator = x01ValueFromRecord(rec, row, key, "hitsTotal"); }
        else if (metric.id === "bullRate") { numerator = x01ValueFromRecord(rec, row, key, "bulls"); denominator = x01ValueFromRecord(rec, row, key, "hitsTotal"); }
        else if (metric.id === "dbullRate") { numerator = x01ValueFromRecord(rec, row, key, "dbulls"); denominator = x01ValueFromRecord(rec, row, key, "hitsTotal"); }
        else if (metric.id === "bustRate") { numerator = x01ValueFromRecord(rec, row, key, "busts"); denominator = x01ValueFromRecord(rec, row, key, "hitsTotal"); }
        else if (metric.id === "legWinRate") { numerator = x01ValueFromRecord(rec, row, key, "legsWon"); denominator = x01ValueFromRecord(rec, row, key, "legsPlayed"); }
        else if (metric.id === "setWinRate") { numerator = x01ValueFromRecord(rec, row, key, "setsWon"); denominator = x01ValueFromRecord(rec, row, key, "setsPlayed"); }
        if (numerator != null && denominator != null && denominator > 0) {
          current.rateNumerator += numerator;
          current.rateDenominator += denominator;
          current.coverage += 1;
        }
      } else {
        const value = x01ValueFromRecord(rec, row, key, metric.id);
        if (value != null) {
          current.sum += value;
          current.max = Math.max(current.max, value);
          current.coverage += 1;
        }
      }
      buckets.set(ident.key, current);
    }
  }

  return Array.from(buckets.values()).map((row) => {
    let value = Number.NaN;
    if (metric.aggregation === "avg3") {
      value = row.darts > 0 ? (row.points / row.darts) * 3 : row.avgCount > 0 ? row.avgSum / row.avgCount : Number.NaN;
    } else if (metric.aggregation === "avg1") {
      value = row.darts > 0 ? row.points / row.darts : row.avgCount > 0 ? row.avgSum / row.avgCount : Number.NaN;
    } else if (metric.aggregation === "rate") {
      value = row.rateDenominator > 0 ? (row.rateNumerator / row.rateDenominator) * 100 : Number.NaN;
    } else if (metric.aggregation === "max") {
      value = row.coverage > 0 ? row.max : Number.NaN;
    } else {
      value = row.coverage > 0 ? (averageRequested && row.games > 0 ? row.sum / row.games : row.sum) : Number.NaN;
    }
    return { key: row.key, name: row.name, games: row.games, wins: row.wins, value, coverage: row.coverage };
  });
}

function formatX01MetricValue(metric: X01MetricDef, value: number, averageRequested = false) {
  if (metric.aggregation === "rate") return `${value.toFixed(1)} %`;
  if (metric.aggregation === "avg3" || metric.aggregation === "avg1") return value.toFixed(2);
  if (averageRequested && metric.aggregation === "sum") return `${value.toFixed(2)} par partie`;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function rankX01Metric(rows: X01MetricRow[], metric: X01MetricDef, question: string) {
  const count = requestedCount(question);
  const worst = asksWorst(question);
  return rows
    .filter((row) => Number.isFinite(row.value))
    .sort((a, b) => worst ? a.value - b.value : b.value - a.value)
    .slice(0, count)
    .map((row, index) => ({ ...row, rank: index + 1, formatted: formatX01MetricValue(metric, row.value, asksAverage(question)) }));
}

function x01MetricBulletList(rows: ReturnType<typeof rankX01Metric>) {
  return rows.map((row) => `- **${row.rank}. ${row.name}** — ${row.formatted}`).join("\n");
}

function winnerIdFor(rec: any) {
  return norm(
    rec?.winnerId ??
    rec?.summary?.winnerId ??
    rec?.payload?.winnerId ??
    rec?.payload?.summary?.winnerId ??
    rec?.payload?.stats?.global?.winnerId ??
    ""
  );
}

function sumHitsMap(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.values(value).reduce((sum, entry) => sum + (num(entry) || 0), 0);
}

function killerValue(row: any, metricId: string) {
  const s = row?.special || {};
  const d = row?.darts || {};
  if (metricId === "kills") return firstFinite(row?.kills, row?.killCount, row?.k, s?.kills) ?? 0;
  if (metricId === "killsReceived") {
    const direct = firstFinite(row?.deaths, row?.deathCount, s?.deaths);
    if (direct != null) return direct;
    return boolish(row?.eliminated) || boolish(row?.isDead) ? 1 : 0;
  }
  if (metricId === "damage") return firstFinite(row?.livesTaken, row?.damageDealt, row?.dmgDealt, s?.livesTaken, s?.damageDealt) ?? 0;
  if (metricId === "damageReceived") return firstFinite(row?.livesLost, row?.damageTaken, row?.dmgTaken, s?.livesLost, s?.damageTaken) ?? 0;
  if (metricId === "darts") return firstFinite(row?.totalThrows, row?.throws, row?.dartsThrown, row?.totalDarts, d?.thrown, row?.darts) ?? 0;
  if (metricId === "hits") {
    return firstFinite(row?.totalHits, row?.hitsTotal, row?.killerHits, d?.hits)
      ?? Math.max(sumHitsMap(row?.hitsBySegment), sumHitsMap(row?.hitsByNumber));
  }
  if (metricId === "autoKills") return firstFinite(row?.autoKills, row?.auto_kills, s?.autoKills) ?? 0;
  if (metricId === "autoHits") return Math.max(
    firstFinite(row?.autoHits, row?.auto_hits, s?.autoHits) ?? 0,
    firstFinite(row?.selfPenaltyHits, row?.self_penalty_hits, row?.hitsOnSelf, s?.selfPenaltyHits) ?? 0,
  );
  if (metricId === "livesStolen") return firstFinite(row?.livesStolen, row?.lives_stolen, s?.livesStolen) ?? 0;
  if (metricId === "livesHealed") return firstFinite(row?.livesHealed, row?.lives_healed, s?.livesHealed) ?? 0;
  if (metricId === "disarmsTriggered") return firstFinite(row?.disarmsTriggered, row?.disarms_triggered, s?.disarmsTriggered) ?? 0;
  if (metricId === "disarmsReceived") return firstFinite(row?.disarmsReceived, row?.disarms_received, s?.disarmsReceived) ?? 0;
  if (metricId === "shieldBreaks") return firstFinite(row?.shieldBreaks, row?.shield_breaks, s?.shieldBreaks) ?? 0;
  if (metricId === "shieldHalfBreaks") return firstFinite(row?.shieldHalfBreaks, row?.shield_half_breaks, s?.shieldHalfBreaks) ?? 0;
  if (metricId === "resurrectionsGiven") return firstFinite(row?.resurrectionsGiven, row?.resurrections_given, s?.resurrectionsGiven) ?? 0;
  if (metricId === "resurrectionsReceived") return firstFinite(row?.resurrectionsReceived, row?.resurrections_received, s?.resurrectionsReceived) ?? 0;
  if (metricId === "uselessHits") return firstFinite(row?.uselessHits, s?.uselessHits) ?? 0;
  if (metricId === "rearmThrows") return firstFinite(row?.throwsToBecomeKiller, row?.rearmThrows, row?.becomeThrows) ?? 0;
  return 0;
}

function aggregateKillerMetric(records: any[], metric: DynamicMetric) {
  const byPlayer = new Map<string, { key: string; name: string; games: number; wins: number; sum: number; count: number; max: number }>();

  for (const rec of records) {
    const winnerId = winnerIdFor(rec);
    for (const { key, row } of playerRowsForRecord(rec)) {
      const ident = rawPlayerIdentity(row, key);
      if (!ident.key) continue;
      const current = byPlayer.get(ident.key) || { key: ident.key, name: ident.name, games: 0, wins: 0, sum: 0, count: 0, max: 0 };
      current.name = ident.name || current.name;
      current.games += 1;
      if ((winnerId && winnerId === ident.key) || boolish(row?.win) || boolish(row?.winner) || Number(row?.rank ?? row?.place ?? 0) === 1) {
        current.wins += 1;
      }
      const value = killerValue(row, metric.id);
      if (Number.isFinite(value)) {
        current.sum += value;
        current.count += 1;
        current.max = Math.max(current.max, value);
      }
      byPlayer.set(ident.key, current);
    }
  }
  return Array.from(byPlayer.values());
}

function metricValue(row: { games: number; sum: number; count: number; max: number }, metric: DynamicMetric, averageRequested: boolean) {
  if (averageRequested || metric.aggregation === "avg") return row.games > 0 ? row.sum / row.games : Number.NaN;
  if (metric.aggregation === "max") return row.max;
  return row.sum;
}

function formatDynamicValue(metric: DynamicMetric, value: number, averageRequested: boolean) {
  if (averageRequested || metric.aggregation === "avg") return `${value.toFixed(2)} par partie`;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function rankDynamic(
  rows: Array<{ key: string; name: string; games: number; wins: number; sum: number; count: number; max: number }>,
  metric: DynamicMetric,
  question: string,
) {
  const averageRequested = asksAverage(question);
  const worst = asksWorst(question);
  const count = requestedCount(question);
  const directionLower = worst ? !metric.preferLower : !!metric.preferLower;
  return rows
    .map((row) => ({ row, value: metricValue(row, metric, averageRequested) }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => directionLower ? a.value - b.value : b.value - a.value)
    .slice(0, count)
    .map((item, index) => ({ ...item, rank: index + 1, formatted: formatDynamicValue(metric, item.value, averageRequested) }));
}

function dynamicMetricBulletList(ranked: ReturnType<typeof rankDynamic>) {
  return ranked.map((item) => `- **${item.rank}. ${item.row.name}** — ${item.formatted}`).join("\n");
}

function flattenedNumericLeaves(input: any, prefix = "", depth = 0, out: Array<{ key: string; path: string; value: number }> = []) {
  if (!input || typeof input !== "object" || depth > 3) return out;
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = norm(rawKey).replace(/\s/g, "");
    if (!key || /^(id|playerid|profileid|sourceid|rank|place|position|number|killerphase|lives|livesend)$/.test(key)) continue;
    const path = prefix ? `${prefix}.${rawKey}` : rawKey;
    const n = num(rawValue);
    if (n != null) {
      out.push({ key, path, value: n });
      continue;
    }
    if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
      flattenedNumericLeaves(rawValue, path, depth + 1, out);
    }
  }
  return out;
}

function candidateAliases(key: string) {
  const compact = norm(key).replace(/\s/g, "");
  return Array.from(new Set([
    norm(key),
    ...(FIELD_TRANSLATIONS[compact] || []),
  ].map(norm).filter(Boolean)));
}

function queryMetricTokens(question: string) {
  const stop = new Set(["qui","a","le","la","les","de","du","des","plus","moins","meilleur","meilleure","pire","top","classement","joueur","joueuse","recu","reçus","recus","dans","sur","killer","x01","record","records","stat","statistique"]);
  return norm(question).split(" ").filter((token) => token.length >= 3 && !stop.has(token));
}

function resolveDynamicFieldMetric(question: string, records: any[]): DynamicMetric | null {
  const q = norm(question);
  const tokens = queryMetricTokens(question);
  if (!tokens.length) return null;

  const seen = new Map<string, { key: string; aliases: string[]; count: number }>();
  for (const rec of records.slice(0, 150)) {
    for (const { row } of playerRowsForRecord(rec)) {
      for (const leaf of flattenedNumericLeaves(row)) {
        const existing = seen.get(leaf.key) || { key: leaf.key, aliases: candidateAliases(leaf.key), count: 0 };
        existing.count += 1;
        seen.set(leaf.key, existing);
      }
    }
  }

  let best: { key: string; aliases: string[]; count: number; score: number } | null = null;
  for (const entry of seen.values()) {
    let score = 0;
    for (const alias of entry.aliases) {
      if (q.includes(alias) && alias.length >= 3) score += 8;
      const aliasTokens = alias.split(" ");
      for (const token of tokens) if (aliasTokens.includes(token) || alias.includes(token)) score += 2;
    }
    if (score > 0 && (!best || score > best.score || (score === best.score && entry.count > best.count))) {
      best = { ...entry, score };
    }
  }

  if (!best || best.score < 3) return null;
  const rawLabel = best.aliases.find((x) => x && !/^[a-z0-9]+$/.test(x)) || best.aliases[1] || best.aliases[0] || best.key;
  const aggregation = /avg|average|moyenne|rate|ratio|precision|accuracy|percent/.test(best.key) ? "avg"
    : /best|max|record/.test(best.key) ? "max"
    : "sum";
  return {
    id: `raw:${best.key}`,
    label: rawLabel,
    aliases: best.aliases,
    aggregation,
  };
}

function aggregateDynamicField(records: any[], metric: DynamicMetric) {
  const fieldKey = metric.id.replace(/^raw:/, "");
  const byPlayer = new Map<string, DynamicPlayerAgg>();

  for (const rec of records) {
    const winnerId = winnerIdFor(rec);
    for (const { key, row } of playerRowsForRecord(rec)) {
      const ident = rawPlayerIdentity(row, key);
      if (!ident.key) continue;
      const current = byPlayer.get(ident.key) || { key: ident.key, name: ident.name, games: 0, wins: 0, values: {} };
      current.name = ident.name || current.name;
      current.games += 1;
      if ((winnerId && winnerId === ident.key) || boolish(row?.win) || boolish(row?.winner) || Number(row?.rank ?? row?.place ?? 0) === 1) current.wins += 1;

      const leaves = flattenedNumericLeaves(row).filter((leaf) => leaf.key === fieldKey);
      if (leaves.length) {
        // Un même champ peut apparaître dans plusieurs sous-blocs du même joueur.
        // On prend la valeur maximale du match pour éviter de compter deux fois un alias.
        const matchValue = Math.max(...leaves.map((leaf) => leaf.value));
        const bucket = current.values[fieldKey] || { sum: 0, count: 0, max: 0 };
        bucket.sum += matchValue;
        bucket.count += 1;
        bucket.max = Math.max(bucket.max, matchValue);
        current.values[fieldKey] = bucket;
      }
      byPlayer.set(ident.key, current);
    }
  }

  return Array.from(byPlayer.values()).map((row) => {
    const b = row.values[fieldKey] || { sum: Number.NaN, count: 0, max: Number.NaN };
    return { key: row.key, name: row.name, games: row.games, wins: row.wins, sum: b.sum, count: b.count, max: b.max };
  });
}

function discoverDynamicFieldMetrics(records: any[]): DynamicMetric[] {
  const seen = new Map<string, number>();
  for (const rec of records.slice(0, 300)) {
    for (const { row } of playerRowsForRecord(rec)) {
      for (const leaf of flattenedNumericLeaves(row)) {
        if (!FIELD_TRANSLATIONS[leaf.key]) continue;
        seen.set(leaf.key, (seen.get(leaf.key) || 0) + 1);
      }
    }
  }
  return [...seen.keys()].map((key) => {
    const aliases = candidateAliases(key);
    const label = FIELD_TRANSLATIONS[key]?.[0] || aliases[0] || key;
    const aggregation: DynamicMetric["aggregation"] = /avg|average|moyenne|rate|ratio|precision|accuracy|percent/.test(key)
      ? "avg" : /best|max|record/.test(key) ? "max" : "sum";
    return { id: `raw:${key}`, label, aliases, aggregation };
  });
}

function unavailableMetricReply(mode: AwenaModeKnowledge, question: string, periodLabel: string, matchCount?: number) {
  const source = typeof matchCount === "number"
    ? `\n\n> J'ai vérifié **${matchCount} partie${matchCount > 1 ? "s" : ""} ${mode.label} enregistrée${matchCount > 1 ? "s" : ""} dans Historique** pour cette période.`
    : "";
  return {
    text:
      `## STATISTIQUE NON DISPONIBLE — ${mode.label.toUpperCase()}\n` +
      `Je comprends ta demande, mais je ne trouve pas cette statistique dans les données enregistrées ${periodLabel}.` + source + `\n\n` +
      `> Je préfère te dire clairement que je n'ai pas cette donnée plutôt que d'inventer un résultat. Si cette statistique est ajoutée aux sauvegardes du mode, je pourrai ensuite la classer, faire un Top 3, calculer une moyenne ou filtrer par période.`,
    modeId: mode.id,
  } satisfies AwenaReply;
}

function killerDashboard(records: any[], mode: AwenaModeKnowledge, periodLabel: string, fallbackRows: PlayerAgg[]) {
  const candidates: RecordDashboardSection[] = [...universalDashboardCandidates(fallbackRows)];
  for (const metric of KILLER_METRICS) {
    const ranked = rankDynamic(aggregateKillerMetric(records, metric), metric, `top 3 ${metric.aliases[0]}`);
    if (!ranked.length || ranked.every((item) => !Number.isFinite(item.value) || item.value === 0)) continue;
    candidates.push({ id: `killer:${metric.id}`, text: `## ${metric.label.toUpperCase()}
${dynamicMetricBulletList(ranked)}` });
  }
  const chosen = randomDashboardSections(`${mode.id}:records`, candidates, 5);
  if (!chosen.length) return `Je ne trouve pas encore de records exploitables pour ${mode.label} ${periodLabel}.`;
  return [
    `## RECORDS — ${mode.label.toUpperCase()}
${periodLabel}.

${historySourceLine(records.length)}`,
    ...chosen.map((item) => item.text),
    `> Sélection variable : Awena pioche à chaque ouverture parmi les records Killer réellement enregistrés.`,
  ].join("\n\n");
}

function x01Dashboard(records: any[], rows: PlayerAgg[], mode: AwenaModeKnowledge, periodLabel: string) {
  const candidates: RecordDashboardSection[] = [...universalDashboardCandidates(rows).filter((item) => !["avg3", "bestCheckout"].includes(item.id))];
  for (const metric of X01_METRICS) {
    const ranked = rankX01Metric(aggregateX01Metric(records, metric), metric, `top 3 ${metric.aliases[0]}`);
    if (!ranked.length || ranked.every((item) => !Number.isFinite(item.value) || item.value === 0)) continue;
    candidates.push({ id: `x01:${metric.id}`, text: `## ${metric.label.toUpperCase()}
${x01MetricBulletList(ranked)}` });
  }
  const chosen = randomDashboardSections(`${mode.id}:records`, candidates, 6);
  if (!chosen.length) return `Je ne trouve pas encore de records X01 exploitables ${periodLabel}.`;
  return [
    `## RECORDS — ${mode.label.toUpperCase()}
${periodLabel}.

${historySourceLine(records.length)}`,
    ...chosen.map((item) => item.text),
    `> Sélection aléatoire parmi les records X01 réellement disponibles. Rouvre Records pour afficher d'autres rubriques.`,
  ].join("\n\n");
}

function genericModeDashboard(records: any[], rows: PlayerAgg[], mode: AwenaModeKnowledge, periodLabel: string) {
  const candidates: RecordDashboardSection[] = [...universalDashboardCandidates(rows)];
  for (const metric of discoverDynamicFieldMetrics(records)) {
    const ranked = rankDynamic(aggregateDynamicField(records, metric), metric, `top 3 ${metric.aliases[0] || metric.label}`);
    if (!ranked.length || ranked.every((item) => !Number.isFinite(item.value) || item.value === 0)) continue;
    candidates.push({ id: `${mode.id}:${metric.id}`, text: `## ${metric.label.toUpperCase()}
${dynamicMetricBulletList(ranked)}` });
  }
  const chosen = randomDashboardSections(`${mode.id}:records`, candidates, 5);
  if (!chosen.length) return `Je n'ai pas encore assez de statistiques exploitables pour établir les records de ${mode.label} ${periodLabel}.`;
  return [
    `## RECORDS — ${mode.label.toUpperCase()}
${periodLabel}.

${historySourceLine(records.length)}`,
    ...chosen.map((item) => item.text),
    `> Awena affiche une sélection différente parmi les records réellement enregistrés pour **${mode.label}**. Aucun autre mode n'est mélangé.`,
  ].join("\n\n");
}


function historySourceLine(matchCount: number) {
  return `> Source : **${matchCount} partie${matchCount > 1 ? "s" : ""} enregistrée${matchCount > 1 ? "s" : ""} dans Historique**.`;
}

async function universalRowsForMode(
  mode: AwenaModeKnowledge,
  periodSince: number,
  preferDetailed: boolean,
  snapshot: AuthoritativeHistorySnapshot,
) {
  // Toujours partir de History.list() : c'est la base de référence complète.
  let matches = snapshot.normalized.filter((m) => isFinishedHistoryRecord(m.raw) && (!periodSince || m.date >= periodSince) && matchMode(m, mode));
  let rows = aggregate(matches);

  const needsDetailedFallback =
    preferDetailed &&
    (!rows.length ||
      rows.every((row) => row.avg3Count === 0 && row.genericAvgCount === 0 && row.bestCheckout === 0));

  // Pour les anciennes parties dont les métriques n'étaient présentes que dans
  // le payload, hydrate TOUTES les parties du mode concerné (sans limite à 260).
  if (needsDetailedFallback) {
    const detailed = await detailedModeHistory(mode, snapshot, periodSince);
    matches = detailed.normalized.filter((m) => matchMode(m, mode));
    rows = aggregate(matches);
  }

  return { matches, rows };
}

export async function buildAwenaRecordsReply(question: string, context: AwenaRuntimeContext): Promise<AwenaReply | null> {
  if (!isAwenaRecordsQuestion(question, context)) return null;

  try {
    const rememberedModeId = String(context.extra?.awenaRememberedMode || "");
    const mode = findAwenaMode(question, context.mode || rememberedModeId || context.route)
      || findAwenaModeById(context.mode)
      || findAwenaModeById(rememberedModeId);
    if (!mode) {
      return { text: "Pour établir un classement ou un record, indique-moi le mode concerné, par exemple « top 3 X01 au pourcentage de victoire »." };
    }

    const period = periodFromQuestion(question);
    const q = norm(question);
    const snapshot = await authoritativeHistory();
    let rawModeRecords = snapshot.raw.filter((rec) => isFinishedHistoryRecord(rec) && (!period.since || getTimestamp(rec) >= period.since) && rawMatchesMode(rec, mode));

    const asksOnlyDashboard =
      /records?|stats?|statistiques?/.test(q) &&
      !/top|meilleur|moyenne|victoire|checkout|partie|pire|mauvais|kill|mort|deces|degat|vie|lancer|flechette|hit|touche|bull|double|triple|resurrection|desarmement|bouclier|capture|vol|precision|180|140|100|60|bust|miss|leg|set/.test(q.replace(/records?|stats?|statistiques?/g, ""));


    // X01 : moteur dédié basé en priorité sur les résumés de TOUTES les parties
    // enregistrées dans Historique. Les payloads complets ne sont relus que si
    // une ancienne partie ne contient pas la métrique demandée dans son header.
    if (mode.id === "x01") {
      const x01Metric = resolveX01Metric(question);
      if (x01Metric) {
        if (!rawModeRecords.length) {
          return { text: `Je ne trouve aucune partie ${mode.label} enregistrée ${period.label}. Je ne vais pas inventer une statistique.`, modeId: mode.id };
        }

        let metricRows = aggregateX01Metric(rawModeRecords, x01Metric, asksAverage(question));
        let hasMetric = metricRows.some((row) => Number.isFinite(row.value));

        // Compatibilité historique : certaines anciennes sauvegardes n'avaient
        // les stats détaillées que dans payload. On hydrate alors toutes les
        // parties X01 concernées, sans limite arbitraire, puis on recalcule.
        if (!hasMetric) {
          const detailed = await detailedModeHistory(mode, snapshot, period.since);
          if (detailed.raw.length) {
            rawModeRecords = detailed.raw;
            metricRows = aggregateX01Metric(rawModeRecords, x01Metric, asksAverage(question));
            hasMetric = metricRows.some((row) => Number.isFinite(row.value));
          }
        }

        if (!hasMetric) {
          return unavailableMetricReply(mode, question, period.label, rawModeRecords.length);
        }

        const wantedPlayer = requestedPlayerKey(question, metricRows, context);
        if (wantedPlayer) {
          const player = metricRows.find((row) => norm(row.key || row.name) === wantedPlayer);
          if (!player || !Number.isFinite(player.value)) {
            return unavailableMetricReply(mode, question, period.label, rawModeRecords.length);
          }
          return {
            text: `## ${player.name.toUpperCase()} — X01\n**${x01Metric.label}** ${period.label}\n\n**${formatX01MetricValue(x01Metric, player.value, asksAverage(question))}**\n\n${historySourceLine(rawModeRecords.length)}`,
            modeId: mode.id,
          };
        }

        const ranked = rankX01Metric(metricRows, x01Metric, question);
        if (!ranked.length) return unavailableMetricReply(mode, question, period.label, rawModeRecords.length);
        const title = asksWorst(question) ? "CLASSEMENT INVERSÉ" : requestedCount(question) === 1 ? "MEILLEUR RÉSULTAT" : `TOP ${requestedCount(question)}`;
        return {
          text: `## ${title} — X01\n**${x01Metric.label}** ${period.label}\n\n${x01MetricBulletList(ranked)}\n\n${historySourceLine(rawModeRecords.length)}`,
          modeId: mode.id,
        };
      }
    }

    // Killer : catalogue riche prioritaire, y compris "kills reçus".
    if (mode.id === "killer") {
      const killerMetric = resolveKillerMetric(question);
      if (killerMetric) {
        if (!rawModeRecords.length) {
          return { text: `Je ne trouve aucune partie ${mode.label} enregistrée ${period.label}. Je ne vais pas inventer un classement.`, modeId: mode.id };
        }

        let killerRows = aggregateKillerMetric(rawModeRecords, killerMetric);
        let hasKillerMetric = killerRows.some((row) => Number.isFinite(metricValue(row, killerMetric, asksAverage(question))));
        if (!hasKillerMetric) {
          const detailed = await detailedModeHistory(mode, snapshot, period.since);
          if (detailed.raw.length) {
            rawModeRecords = detailed.raw;
            killerRows = aggregateKillerMetric(rawModeRecords, killerMetric);
            hasKillerMetric = killerRows.some((row) => Number.isFinite(metricValue(row, killerMetric, asksAverage(question))));
          }
        }
        if (!hasKillerMetric) return unavailableMetricReply(mode, question, period.label, rawModeRecords.length);

        const wantedPlayer = requestedPlayerKey(question, killerRows, context);
        if (wantedPlayer) {
          const player = killerRows.find((row) => norm(row.key || row.name) === wantedPlayer);
          if (!player) return unavailableMetricReply(mode, question, period.label, rawModeRecords.length);
          const value = metricValue(player, killerMetric, asksAverage(question));
          if (!Number.isFinite(value)) return unavailableMetricReply(mode, question, period.label, rawModeRecords.length);
          return {
            text: `## ${player.name.toUpperCase()} — ${mode.label.toUpperCase()}\n**${killerMetric.label}** ${period.label}\n\n**${formatDynamicValue(killerMetric, value, asksAverage(question))}**\n\n${historySourceLine(rawModeRecords.length)}`,
            modeId: mode.id,
          };
        }

        const ranked = rankDynamic(killerRows, killerMetric, question);
        if (!ranked.length || ranked.every((x) => !Number.isFinite(x.value))) {
          return unavailableMetricReply(mode, question, period.label, rawModeRecords.length);
        }
        const title = asksWorst(question) ? "CLASSEMENT INVERSÉ" : requestedCount(question) === 1 ? "MEILLEUR RÉSULTAT" : `TOP ${requestedCount(question)}`;
        return {
          text: `## ${title} — ${mode.label.toUpperCase()}\n**${killerMetric.label}** ${period.label}\n\n${dynamicMetricBulletList(ranked)}\n\n${historySourceLine(rawModeRecords.length)}`,
          modeId: mode.id,
        };
      }
    }

    const preferDetailed = mode.id === "x01" && /moyenne|avg3|checkout|sortie/.test(q);
    const { matches, rows } = await universalRowsForMode(mode, period.since, preferDetailed, snapshot);

    if (!matches.length && !rawModeRecords.length) {
      return { text: `Je ne trouve aucune partie ${mode.label} exploitable ${period.label}. Je ne vais pas inventer un classement.`, modeId: mode.id };
    }

    if (asksOnlyDashboard || /^(?:records?|stats?|statistiques?)$/.test(q)) {
      if (!rows.length) {
        return { text: `Les parties ${mode.label} existent, mais je n'arrive pas à identifier suffisamment les joueurs pour produire un classement fiable.`, modeId: mode.id };
      }
      if (mode.id === "x01") {
        let dashboardRecords = rawModeRecords;
        const probes = ["avg3", "bestCheckout", "hitRate", "h180"] as X01MetricId[];
        const hasDetailedHeaderStats = probes.some((metricId) => {
          const metric = X01_METRICS.find((item) => item.id === metricId)!;
          return aggregateX01Metric(dashboardRecords, metric).some((row) => Number.isFinite(row.value));
        });
        if (!hasDetailedHeaderStats && dashboardRecords.length) {
          const detailed = await detailedModeHistory(mode, snapshot, period.since);
          if (detailed.raw.length) dashboardRecords = detailed.raw;
        }
        return { text: x01Dashboard(dashboardRecords, rows, mode, period.label), modeId: mode.id };
      }
      return {
        text: mode.id === "killer"
          ? killerDashboard(rawModeRecords, mode, period.label, rows)
          : genericModeDashboard(rawModeRecords, rows, mode, period.label),
        modeId: mode.id,
      };
    }

    // Métriques universelles.
    const universalRequested =
      /pourcentage|taux|%|victoire|parties jouees|parties jouées|avg3|moyenne|checkout|sortie/.test(q);
    if (universalRequested && rows.length) {
      const metric = metricFromQuestion(question, mode);
      const wantedPlayer = requestedPlayerKey(question, rows, context);
      if (wantedPlayer) {
        const player = rows.find((row) => norm(row.key || row.name) === wantedPlayer);
        if (player) {
          const value = valueFor(player, metric);
          if (Number.isFinite(value) && (metric !== "bestCheckout" || value > 0)) {
            return {
              text: `## ${player.name.toUpperCase()} — ${mode.label.toUpperCase()}\n**${metricLabel(metric)}** ${period.label}\n\n**${formatValue(metric, value, player)}**\n\n${historySourceLine(rawModeRecords.length || matches.length)}`,
              modeId: mode.id,
            };
          }
        }
        return unavailableMetricReply(mode, question, period.label, rawModeRecords.length || matches.length);
      }

      const worst = asksWorst(question);
      const count = requestedCount(question);
      const ranked = rankRows(rows, metric, worst, count);
      if (ranked.length) {
        const direction = worst ? "Classement du plus faible au plus fort" : count === 1 ? "Meilleur résultat" : `Top ${count}`;
        return {
          text: `## ${direction.toUpperCase()} — ${mode.label.toUpperCase()}\n**${metricLabel(metric)}** ${period.label}\n\n${bulletList(ranked, metric)}\n\n${historySourceLine(rawModeRecords.length || matches.length)}`,
          modeId: mode.id,
        };
      }
      // Si la métrique universelle était explicitement demandée mais absente,
      // on ne retombe pas sur une réponse vague.
      if (/avg3|moyenne|checkout|sortie/.test(q)) return unavailableMetricReply(mode, question, period.label, rawModeRecords.length || matches.length);
    }

    // Dernier niveau : introspection des champs numériques réellement sauvegardés.
    // Cela permet à Awena de répondre à de nombreuses stats propres aux modes
    // sans inventer un catalogue figé.
    if (rawModeRecords.length) {
      let dynamicMetric = resolveDynamicFieldMetric(question, rawModeRecords);
      if (!dynamicMetric) {
        const detailed = await detailedModeHistory(mode, snapshot, period.since);
        if (detailed.raw.length) {
          rawModeRecords = detailed.raw;
          dynamicMetric = resolveDynamicFieldMetric(question, rawModeRecords);
        }
      }
      if (dynamicMetric) {
        const dynamicRows = aggregateDynamicField(rawModeRecords, dynamicMetric);
        const wantedPlayer = requestedPlayerKey(question, dynamicRows, context);
        if (wantedPlayer) {
          const player = dynamicRows.find((row) => norm(row.key || row.name) === wantedPlayer);
          if (player) {
            const value = metricValue(player, dynamicMetric, asksAverage(question));
            if (Number.isFinite(value)) {
              return {
                text: `## ${player.name.toUpperCase()} — ${mode.label.toUpperCase()}\n**${dynamicMetric.label}** ${period.label}\n\n**${formatDynamicValue(dynamicMetric, value, asksAverage(question))}**\n\n${historySourceLine(rawModeRecords.length)}`,
                modeId: mode.id,
              };
            }
          }
          return unavailableMetricReply(mode, question, period.label, rawModeRecords.length);
        }

        const ranked = rankDynamic(dynamicRows, dynamicMetric, question);
        if (ranked.length && ranked.some((x) => Number.isFinite(x.value))) {
          const title = asksWorst(question) ? "CLASSEMENT INVERSÉ" : requestedCount(question) === 1 ? "MEILLEUR RÉSULTAT" : `TOP ${requestedCount(question)}`;
          return {
            text: `## ${title} — ${mode.label.toUpperCase()}\n**${dynamicMetric.label}** ${period.label}\n\n${dynamicMetricBulletList(ranked)}\n\n${historySourceLine(rawModeRecords.length)}`,
            modeId: mode.id,
          };
        }
      }
    }

    // Toute question qui a été reconnue comme demande de stats doit terminer
    // par une réponse explicite d'indisponibilité, jamais par le fallback
    // conversationnel générique.
    return unavailableMetricReply(mode, question, period.label, rawModeRecords.length || matches.length);
  } catch (error) {
    console.warn("[AwenaRecords] erreur neutralisée", error);
    const rememberedModeId = String(context.extra?.awenaRememberedMode || "");
    const mode = findAwenaMode(question, context.mode || rememberedModeId || context.route)
      || findAwenaModeById(context.mode)
      || findAwenaModeById(rememberedModeId);
    return {
      text: mode
        ? `## RECORDS — ${mode.label.toUpperCase()}\nJe n'arrive pas à lire les statistiques pour le moment. Je n'invente aucun résultat. Réessaie après avoir ouvert l'écran Stats ou après une nouvelle partie.`
        : "Je n'arrive pas à lire les statistiques pour le moment. Indique-moi aussi le mode concerné et je réessaierai.",
      modeId: mode?.id || context.mode || null,
    };
  }
}
