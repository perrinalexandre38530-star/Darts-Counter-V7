import { loadNormalizedHistory, type NormalizedMatch, type NormalizedPlayer } from "../lib/statsNormalized";
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

function norm(v: unknown) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_%'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAwenaRecordsQuestion(question: string) {
  const q = norm(question);
  return /record|records|stat|statistique|classement|ranking|top\s*\d*|meilleur|meilleure|pire|plus mauvais|plus mauvaise|pourcentage.*victoire|taux.*victoire|%.*victoire|moyenne/.test(q);
}

function periodFromQuestion(question: string) {
  const q = norm(question);
  const now = Date.now();
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
  if (/nombre.*victoire|victoires|wins/.test(q)) return "wins";
  if (/nombre.*partie|parties jouees|parties jouées/.test(q)) return "games";
  if (/checkout|sortie/.test(q)) return "bestCheckout";
  if (/avg3|moyenne 3|moyenne.*flechette|moyenne.*fléchette/.test(q)) return mode.id === "x01" ? "avg3" : "average";
  if (/moyenne/.test(q)) return mode.id === "x01" ? "avg3" : "average";
  return "winRate";
}

function requestedCount(question: string) {
  const q = norm(question);
  const explicit = q.match(/\btop\s*(\d{1,2})\b|\b(\d{1,2})\s*(?:meilleurs|meilleures|premiers|premieres)\b/);
  if (explicit) return Math.max(1, Math.min(10, Number(explicit[1] || explicit[2] || 3)));
  if (/classement|ranking/.test(q)) return 5;
  if (/qui est|qui a|quel joueur|quelle joueuse|le meilleur|la meilleure|le pire|plus mauvais/.test(q)) return 1;
  return 3;
}

function asksWorst(question: string) {
  return /pire|plus mauvais|plus mauvaise|moins bon|moins bonne|dernier|derniere/.test(norm(question));
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

  // Fallback par mode normalisé uniquement pour le mode de base, jamais pour une
  // variante partageant le même moteur (ex. Enculette/Cricket ou Killer Progressif).
  const expected = NORMALIZED_MODE_BY_AWENA[mode.id];
  if (expected && mode.id === expected && String(m.mode) === expected) return true;
  if (mode.id === "x01" && m.mode === "x01") return true;
  return false;
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

function lineList(ranked: ReturnType<typeof rankRows>, metric: Metric) {
  return ranked.map((item, index) => `${index + 1}. ${item.row.name} — ${formatValue(metric, item.value, item.row)}`).join(" ; ");
}

function dashboard(rows: PlayerAgg[], mode: AwenaModeKnowledge, periodLabel: string) {
  const sections: string[] = [];
  const rate = rankRows(rows, "winRate", false, 3);
  if (rate.length) sections.push(`% de victoire : ${lineList(rate, "winRate")}`);
  const wins = rankRows(rows, "wins", false, 3);
  if (wins.length) sections.push(`Victoires : ${lineList(wins, "wins")}`);
  if (mode.id === "x01") {
    const avg = rankRows(rows, "avg3", false, 3);
    if (avg.length) sections.push(`Moyenne 3 fléchettes : ${lineList(avg, "avg3")}`);
    const co = rankRows(rows, "bestCheckout", false, 3);
    if (co.length) sections.push(`Checkout : ${lineList(co, "bestCheckout")}`);
  }
  if (!sections.length) return `Je n'ai pas encore assez de statistiques exploitables pour établir les records de ${mode.label} ${periodLabel}.`;
  return `Records ${mode.label} ${periodLabel}. ${sections.join(". ")}. Tu peux me demander un top 3, le meilleur ou le plus mauvais, un % de victoire, le nombre de victoires, ou une période comme « depuis 1 mois ».`;
}

export async function buildAwenaRecordsReply(question: string, context: AwenaRuntimeContext): Promise<AwenaReply | null> {
  if (!isAwenaRecordsQuestion(question)) return null;
  const mode = findAwenaMode(question, context.mode || context.route) || findAwenaModeById(context.mode);
  if (!mode) {
    return { text: "Pour établir un classement ou un record, indique-moi le mode concerné, par exemple « top 3 X01 au pourcentage de victoire »." };
  }

  const period = periodFromQuestion(question);
  const all = await loadNormalizedHistory();
  const matches = all.filter((m) => (!period.since || m.date >= period.since) && matchMode(m, mode));
  if (!matches.length) {
    return { text: `Je ne trouve aucune partie ${mode.label} exploitable ${period.label}. Je ne vais pas inventer un classement.`, modeId: mode.id };
  }

  const rows = aggregate(matches);
  if (!rows.length) {
    return { text: `Les parties ${mode.label} existent, mais je n'arrive pas à identifier suffisamment les joueurs pour produire un classement fiable.`, modeId: mode.id };
  }

  const q = norm(question);
  const specificMetric = /pourcentage|taux|%|victoire|parties jouees|parties jouées|avg3|moyenne|checkout|sortie|top|classement|meilleur|meilleure|pire|plus mauvais|plus mauvaise/.test(q);
  if (!specificMetric || (/records?/.test(q) && !/top|meilleur|moyenne|victoire|checkout|partie|pire|mauvais/.test(q.replace(/records?/g, "")))) {
    return { text: dashboard(rows, mode, period.label), modeId: mode.id };
  }

  const metric = metricFromQuestion(question, mode);
  const worst = asksWorst(question);
  const count = requestedCount(question);
  const ranked = rankRows(rows, metric, worst, count);
  if (!ranked.length) {
    return {
      text: `Je n'ai pas encore de donnée « ${metricLabel(metric)} » suffisamment exploitable pour ${mode.label} ${period.label}. Les autres métriques disponibles sont notamment le % de victoire, les victoires et les parties jouées${mode.id === "x01" ? ", ainsi que la moyenne 3 fléchettes et le meilleur checkout" : ""}.`,
      modeId: mode.id,
    };
  }

  const direction = worst ? "Classement du plus faible au plus fort" : count === 1 ? "Meilleur résultat" : `Top ${count}`;
  return {
    text: `${direction} ${mode.label} — ${metricLabel(metric)} ${period.label} : ${lineList(ranked, metric)}.`,
    modeId: mode.id,
  };
}
