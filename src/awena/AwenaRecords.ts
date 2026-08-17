import { loadNormalizedHistory, normalizeMany, type NormalizedMatch, type NormalizedPlayer } from "../lib/statsNormalized";
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

type FastHistorySnapshot = {
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

let fastHistoryCache: FastHistorySnapshot | null = null;
let hydratedHistoryCache: { at: number; rows: NormalizedMatch[] } | null = null;
let hydratedHistoryPromise: Promise<NormalizedMatch[]> | null = null;

const FAST_CACHE_MS = 2_500;
const HYDRATED_CACHE_MS = 30_000;

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

function fingerprint(rows: any[]) {
  let latest = 0;
  for (const row of rows || []) latest = Math.max(latest, getTimestamp(row));
  return `${rows?.length || 0}:${latest}`;
}

function fastHistory(): FastHistorySnapshot {
  const now = Date.now();
  if (fastHistoryCache && now - fastHistoryCache.at < FAST_CACHE_MS) return fastHistoryCache;

  let raw: any[] = [];
  try {
    const rows = History.readAll();
    raw = Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn("[AwenaRecords] History.readAll indisponible", error);
  }

  const fp = fingerprint(raw);
  if (fastHistoryCache?.fingerprint === fp) {
    fastHistoryCache = { ...fastHistoryCache, at: now, raw };
    return fastHistoryCache;
  }

  let normalized: NormalizedMatch[] = [];
  try {
    normalized = normalizeMany(raw as any[]);
  } catch (error) {
    console.warn("[AwenaRecords] normalisation légère indisponible", error);
  }

  fastHistoryCache = { at: now, raw, normalized, fingerprint: fp };
  return fastHistoryCache;
}

export function warmAwenaRecordsCache() {
  try {
    fastHistory();
  } catch {
    // Le préchauffage est une optimisation uniquement : jamais bloquant.
  }
}

async function hydratedHistory(): Promise<NormalizedMatch[]> {
  const now = Date.now();
  if (hydratedHistoryCache && now - hydratedHistoryCache.at < HYDRATED_CACHE_MS) {
    return hydratedHistoryCache.rows;
  }
  if (hydratedHistoryPromise) return hydratedHistoryPromise;

  hydratedHistoryPromise = (async () => {
    try {
      const rows = await loadNormalizedHistory();
      const safe = Array.isArray(rows) ? rows : [];
      hydratedHistoryCache = { at: Date.now(), rows: safe };
      return safe;
    } catch (error) {
      console.warn("[AwenaRecords] historique détaillé indisponible", error);
      return fastHistory().normalized;
    } finally {
      hydratedHistoryPromise = null;
    }
  })();

  return hydratedHistoryPromise;
}

export function isAwenaRecordsQuestion(question: string, context?: AwenaRuntimeContext) {
  const q = norm(question);
  const explicitStats =
    /record|records|stat|statistique|classement|ranking|top\s*\d*|meilleur|meilleure|pire|plus mauvais|plus mauvaise|pourcentage.*victoire|taux.*victoire|%.*victoire|moyenne|kills?|morts?|deces|décès|eliminations?|dégats|degats|vies|lancers?|flechettes?|fléchettes?|hits?|touches?|bulls?|dbulls?|doubles?|triples?|miss|ratés?|rates?|resurrections?|désarmements?|desarmements?|boucliers?|shields?|auto hits?|auto kills?|checkout|sortie|captures?|vols?|steals?|territoires?|precision|précision|\b180\b|\b140\+?\b|\b100\+?\b|\b60\+?\b|meilleure volee|meilleure volée|best visit/.test(q);
  if (explicitStats) return true;

  // Une question comparative dans le contexte d'un mode est presque toujours
  // une demande de statistiques : "qui a le plus de...", "qui est premier...", etc.
  const comparative = /^(qui|quel joueur|quelle joueuse).*(plus|moins|premier|premiere|dernier|derniere|meilleur|meilleure|pire)|\bcombien\b.*\b(a|ont|de)\b/.test(q);
  return !!context?.mode && comparative;
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
};

function matchMode(m: NormalizedMatch, mode: AwenaModeKnowledge) {
  const blob = rawBlob(m);
  const directAliases = [mode.id, mode.label, ...mode.aliases].map(norm).filter(Boolean);
  if (directAliases.some((alias) => alias.length >= 3 && blob.includes(alias))) return true;

  const expected = NORMALIZED_MODE_BY_AWENA[mode.id];
  if (expected && mode.id === expected && String(m.mode) === expected) return true;
  if (mode.id === "x01" && m.mode === "x01") return true;
  return false;
}

function rawMatchesMode(rec: any, mode: AwenaModeKnowledge) {
  const blob = norm([
    rec?.kind, rec?.mode, rec?.gameId, rec?.variant, rec?.variantId, rec?.sport,
    rec?.game?.mode, rec?.game?.id,
    rec?.summary?.mode, rec?.summary?.gameId, rec?.summary?.variant, rec?.summary?.variantId,
    rec?.payload?.kind, rec?.payload?.mode, rec?.payload?.gameId, rec?.payload?.variant, rec?.payload?.variantId,
    rec?.payload?.summary?.mode, rec?.payload?.summary?.gameId,
    rec?.payload?.stats?.mode,
  ].filter(Boolean).join(" "));
  const aliases = [mode.id, mode.label, ...mode.aliases].map(norm).filter((x) => x.length >= 3);
  if (aliases.some((alias) => blob.includes(alias))) return true;
  const expected = NORMALIZED_MODE_BY_AWENA[mode.id];
  return !!expected && blob.includes(norm(expected));
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

function dashboard(rows: PlayerAgg[], mode: AwenaModeKnowledge, periodLabel: string) {
  const sections: string[] = [`## RECORDS — ${mode.label.toUpperCase()}\n${periodLabel}.`];
  const rate = rankRows(rows, "winRate", false, 3);
  if (rate.length) sections.push(`## % DE VICTOIRE\n${bulletList(rate, "winRate")}`);
  const wins = rankRows(rows, "wins", false, 3);
  if (wins.length) sections.push(`## VICTOIRES\n${bulletList(wins, "wins")}`);
  if (mode.id === "x01") {
    const avg = rankRows(rows, "avg3", false, 3);
    if (avg.length) sections.push(`## MOYENNE 3 FLÉCHETTES\n${bulletList(avg, "avg3")}`);
    const co = rankRows(rows, "bestCheckout", false, 3);
    if (co.length) sections.push(`## MEILLEUR CHECKOUT\n${bulletList(co, "bestCheckout")}`);
  }
  if (sections.length === 1) return `Je n'ai pas encore assez de statistiques exploitables pour établir les records de ${mode.label} ${periodLabel}.`;
  sections.push(`> Tu peux me demander une statistique précise, un top 3, le meilleur ou le plus mauvais joueur, et une période comme « depuis 1 mois ». Si la statistique demandée n'existe pas dans les données enregistrées, je te le dirai clairement.`);
  return sections.join("\n\n");
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

function unavailableMetricReply(mode: AwenaModeKnowledge, question: string, periodLabel: string) {
  return {
    text:
      `## STATISTIQUE NON DISPONIBLE — ${mode.label.toUpperCase()}\n` +
      `Je comprends ta demande, mais je ne trouve pas cette statistique dans les données enregistrées ${periodLabel}.\n\n` +
      `> Je préfère te dire clairement que je n'ai pas cette donnée plutôt que d'inventer un résultat. Si cette statistique est ajoutée aux sauvegardes du mode, je pourrai ensuite la classer, faire un Top 3, calculer une moyenne ou filtrer par période.`,
    modeId: mode.id,
  } satisfies AwenaReply;
}

function killerDashboard(records: any[], mode: AwenaModeKnowledge, periodLabel: string, fallbackRows: PlayerAgg[]) {
  const sections = [dashboard(fallbackRows, mode, periodLabel)];
  const killsMetric = KILLER_METRICS.find((m) => m.id === "kills")!;
  const deathsMetric = KILLER_METRICS.find((m) => m.id === "killsReceived")!;
  const kills = rankDynamic(aggregateKillerMetric(records, killsMetric), killsMetric, "top 3 kills");
  const deaths = rankDynamic(aggregateKillerMetric(records, deathsMetric), deathsMetric, "top 3 kills reçus");
  if (kills.length) sections.push(`## KILLS RÉALISÉS\n${dynamicMetricBulletList(kills)}`);
  if (deaths.length) sections.push(`## KILLS REÇUS / ÉLIMINATIONS SUBIES\n${dynamicMetricBulletList(deaths)}`);
  return sections.join("\n\n");
}

async function universalRowsForMode(mode: AwenaModeKnowledge, periodSince: number, preferDetailed: boolean) {
  const snapshot = fastHistory();
  let all = snapshot.normalized;
  let matches = all.filter((m) => (!periodSince || m.date >= periodSince) && matchMode(m, mode));
  let rows = aggregate(matches);

  const needsDetailedFallback =
    preferDetailed &&
    (!rows.length ||
      rows.every((row) => row.avg3Count === 0 && row.genericAvgCount === 0 && row.bestCheckout === 0));

  if (needsDetailedFallback) {
    all = await hydratedHistory();
    matches = all.filter((m) => (!periodSince || m.date >= periodSince) && matchMode(m, mode));
    rows = aggregate(matches);
  }

  return { matches, rows };
}

export async function buildAwenaRecordsReply(question: string, context: AwenaRuntimeContext): Promise<AwenaReply | null> {
  if (!isAwenaRecordsQuestion(question, context)) return null;

  try {
    const mode = findAwenaMode(question, context.mode || context.route) || findAwenaModeById(context.mode);
    if (!mode) {
      return { text: "Pour établir un classement ou un record, indique-moi le mode concerné, par exemple « top 3 X01 au pourcentage de victoire »." };
    }

    const period = periodFromQuestion(question);
    const q = norm(question);
    const snapshot = fastHistory();
    const rawModeRecords = snapshot.raw.filter((rec) => (!period.since || getTimestamp(rec) >= period.since) && rawMatchesMode(rec, mode));

    const asksOnlyDashboard =
      /records?/.test(q) &&
      !/top|meilleur|moyenne|victoire|checkout|partie|pire|mauvais|kill|mort|deces|degat|vie|lancer|flechette|hit|touche|bull|double|triple|resurrection|desarmement|bouclier|capture|vol|precision/.test(q.replace(/records?/g, ""));

    // Killer : catalogue riche prioritaire, y compris "kills reçus".
    if (mode.id === "killer") {
      const killerMetric = resolveKillerMetric(question);
      if (killerMetric) {
        if (!rawModeRecords.length) {
          return { text: `Je ne trouve aucune partie ${mode.label} exploitable ${period.label}. Je ne vais pas inventer un classement.`, modeId: mode.id };
        }
        const rows = aggregateKillerMetric(rawModeRecords, killerMetric);
        const wantedPlayer = requestedPlayerKey(question, rows, context);
        if (wantedPlayer) {
          const player = rows.find((row) => norm(row.key || row.name) === wantedPlayer);
          if (!player) return unavailableMetricReply(mode, question, period.label);
          const value = metricValue(player, killerMetric, asksAverage(question));
          if (!Number.isFinite(value)) return unavailableMetricReply(mode, question, period.label);
          return {
            text: `## ${player.name.toUpperCase()} — ${mode.label.toUpperCase()}\n**${killerMetric.label}** ${period.label}\n\n**${formatDynamicValue(killerMetric, value, asksAverage(question))}**`,
            modeId: mode.id,
          };
        }

        const ranked = rankDynamic(rows, killerMetric, question);
        if (!ranked.length || ranked.every((x) => !Number.isFinite(x.value))) {
          return unavailableMetricReply(mode, question, period.label);
        }
        const title = asksWorst(question) ? "CLASSEMENT INVERSÉ" : requestedCount(question) === 1 ? "MEILLEUR RÉSULTAT" : `TOP ${requestedCount(question)}`;
        return {
          text: `## ${title} — ${mode.label.toUpperCase()}\n**${killerMetric.label}** ${period.label}\n\n${dynamicMetricBulletList(ranked)}`,
          modeId: mode.id,
        };
      }
    }

    const preferDetailed = mode.id === "x01" && /moyenne|avg3|checkout|sortie/.test(q);
    const { matches, rows } = await universalRowsForMode(mode, period.since, preferDetailed);

    if (!matches.length && !rawModeRecords.length) {
      return { text: `Je ne trouve aucune partie ${mode.label} exploitable ${period.label}. Je ne vais pas inventer un classement.`, modeId: mode.id };
    }

    if (asksOnlyDashboard || /^records?$/.test(q)) {
      if (!rows.length) {
        return { text: `Les parties ${mode.label} existent, mais je n'arrive pas à identifier suffisamment les joueurs pour produire un classement fiable.`, modeId: mode.id };
      }
      return {
        text: mode.id === "killer" ? killerDashboard(rawModeRecords, mode, period.label, rows) : dashboard(rows, mode, period.label),
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
              text: `## ${player.name.toUpperCase()} — ${mode.label.toUpperCase()}\n**${metricLabel(metric)}** ${period.label}\n\n**${formatValue(metric, value, player)}**`,
              modeId: mode.id,
            };
          }
        }
        return unavailableMetricReply(mode, question, period.label);
      }

      const worst = asksWorst(question);
      const count = requestedCount(question);
      const ranked = rankRows(rows, metric, worst, count);
      if (ranked.length) {
        const direction = worst ? "Classement du plus faible au plus fort" : count === 1 ? "Meilleur résultat" : `Top ${count}`;
        return {
          text: `## ${direction.toUpperCase()} — ${mode.label.toUpperCase()}\n**${metricLabel(metric)}** ${period.label}\n\n${bulletList(ranked, metric)}`,
          modeId: mode.id,
        };
      }
      // Si la métrique universelle était explicitement demandée mais absente,
      // on ne retombe pas sur une réponse vague.
      if (/avg3|moyenne|checkout|sortie/.test(q)) return unavailableMetricReply(mode, question, period.label);
    }

    // Dernier niveau : introspection des champs numériques réellement sauvegardés.
    // Cela permet à Awena de répondre à de nombreuses stats propres aux modes
    // sans inventer un catalogue figé.
    if (rawModeRecords.length) {
      const dynamicMetric = resolveDynamicFieldMetric(question, rawModeRecords);
      if (dynamicMetric) {
        const dynamicRows = aggregateDynamicField(rawModeRecords, dynamicMetric);
        const wantedPlayer = requestedPlayerKey(question, dynamicRows, context);
        if (wantedPlayer) {
          const player = dynamicRows.find((row) => norm(row.key || row.name) === wantedPlayer);
          if (player) {
            const value = metricValue(player, dynamicMetric, asksAverage(question));
            if (Number.isFinite(value)) {
              return {
                text: `## ${player.name.toUpperCase()} — ${mode.label.toUpperCase()}\n**${dynamicMetric.label}** ${period.label}\n\n**${formatDynamicValue(dynamicMetric, value, asksAverage(question))}**`,
                modeId: mode.id,
              };
            }
          }
          return unavailableMetricReply(mode, question, period.label);
        }

        const ranked = rankDynamic(dynamicRows, dynamicMetric, question);
        if (ranked.length && ranked.some((x) => Number.isFinite(x.value))) {
          const title = asksWorst(question) ? "CLASSEMENT INVERSÉ" : requestedCount(question) === 1 ? "MEILLEUR RÉSULTAT" : `TOP ${requestedCount(question)}`;
          return {
            text: `## ${title} — ${mode.label.toUpperCase()}\n**${dynamicMetric.label}** ${period.label}\n\n${dynamicMetricBulletList(ranked)}`,
            modeId: mode.id,
          };
        }
      }
    }

    // Toute question qui a été reconnue comme demande de stats doit terminer
    // par une réponse explicite d'indisponibilité, jamais par le fallback
    // conversationnel générique.
    return unavailableMetricReply(mode, question, period.label);
  } catch (error) {
    console.warn("[AwenaRecords] erreur neutralisée", error);
    const mode = findAwenaMode(question, context.mode || context.route) || findAwenaModeById(context.mode);
    return {
      text: mode
        ? `## RECORDS — ${mode.label.toUpperCase()}\nJe n'arrive pas à lire les statistiques pour le moment. Je n'invente aucun résultat. Réessaie après avoir ouvert l'écran Stats ou après une nouvelle partie.`
        : "Je n'arrive pas à lire les statistiques pour le moment. Indique-moi aussi le mode concerné et je réessaierai.",
      modeId: mode?.id || context.mode || null,
    };
  }
}
