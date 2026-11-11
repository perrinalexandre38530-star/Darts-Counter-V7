/** Pure, sport-agnostic projections for the LIVE competition screen.
 *  None of these projections is an official ranking or a linked knockout draw.
 */
import type { DartsLiveFixture, DartsLiveResult } from "../dartsLive/types";
import type { SportLiveCompetitionIndexEntry } from "./types";

export const competitionTextKey = (value?: string | null) => String(value || "").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export const competitionDate = (value?: string | null) => {
  const stamp = Date.parse(value || "");
  return Number.isFinite(stamp) ? stamp : 0;
};

export function completeMatchScore(match: DartsLiveResult): boolean {
  return Boolean(match.winner?.name && match.loser?.name &&
    match.winner.score !== null && match.winner.score !== undefined &&
    match.loser.score !== null && match.loser.score !== undefined &&
    Number.isFinite(Number(match.winner.score)) && Number.isFinite(Number(match.loser.score)));
}

function groupName(value?: string | null): string | null {
  const match = String(value || "").match(/(?:group|groupe|poule|pool)s?\s*[-:\s]+([A-Z0-9]{1,3})(?:\b|$)/i);
  return match ? `Groupe ${match[1].toUpperCase()}` : null;
}

export type ComputedStandingRow = { name: string; played: number; won: number; drawn: number; lost: number };
export type ComputedStandings = { name: string; kind: "group" | "league"; rows: ComputedStandingRow[] };

/** Only group/league matches qualify. Knockout matches must not create a fake league table. */
export function buildCompetitionStandings(results: DartsLiveResult[]): ComputedStandings[] {
  const tables = new Map<string, { kind: "group" | "league"; rows: Map<string, ComputedStandingRow> }>();
  const seen = new Set<string>();
  for (const match of results) {
    if (!completeMatchScore(match)) continue;
    const group = groupName(match.round);
    const league = match.competitionMeta?.family === "domestic_league" && !knockoutPhase(match.round);
    if (!group && !league) continue;
    const name = group || "Championnat · bilan des matchs connus";
    const kind: "group" | "league" = group ? "group" : "league";
    const uniqueMatch = `${competitionTextKey(name)}|${String(match.playedOn || "").slice(0, 10)}|${competitionTextKey(match.round)}|${[[competitionTextKey(match.winner.name), match.winner.score], [competitionTextKey(match.loser.name), match.loser.score]].sort((a,b) => String(a[0]).localeCompare(String(b[0]))).map((p) => `${p[0]}:${p[1]}`).join("|")}`;
    if (seen.has(uniqueMatch)) continue;
    seen.add(uniqueMatch);
    const table = tables.get(name) || { kind, rows: new Map<string, ComputedStandingRow>() };
    const as = Number(match.winner.score);
    const bs = Number(match.loser.score);
    for (const [player, score, opposite] of [[match.winner, as, bs], [match.loser, bs, as]] as const) {
      const key = competitionTextKey(player.name);
      const row = table.rows.get(key) || { name: player.name, played: 0, won: 0, drawn: 0, lost: 0 };
      row.played += 1;
      row.won += Number(score > opposite);
      row.drawn += Number(score === opposite);
      row.lost += Number(score < opposite);
      table.rows.set(key, row);
    }
    tables.set(name, table);
  }
  return [...tables.entries()].map(([name, table]) => ({
    name,
    kind: table.kind,
    rows: [...table.rows.values()].sort((a, b) => b.won - a.won || b.drawn - a.drawn || a.lost - b.lost || a.name.localeCompare(b.name)),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export type KnockoutPhase = { order: number; label: string };
/** Accepts French and English round labels; never infers connections between rounds. */
export function knockoutPhase(value?: string | null): KnockoutPhase | null {
  const s = competitionTextKey(value);
  if (!s || /\b(group|groupe|poule|pool|qualif|classement)\b/.test(s)) return null;
  if (/\b(demi finale|demi finales|semi final|semi finals|semifinal|semifinals|last 4|round of 4)\b/.test(s)) return { order: 5, label: "Demi-finales" };
  if (/\b(quart de finale|quarts de finale|quarter final|quarter finals|quarterfinal|quarterfinals|last 8|round of 8)\b/.test(s)) return { order: 4, label: "Quarts de finale" };
  if (/\b(huitieme|huitiemes|last 16|round of 16|1 8)\b/.test(s)) return { order: 3, label: "Huitièmes de finale" };
  if (/\b(seizieme|seiziemes|last 32|round of 32|1 16)\b/.test(s)) return { order: 2, label: "Seizièmes de finale" };
  if (/\b(trente deuxieme|trente deuxiemes|last 64|round of 64|1 32)\b/.test(s)) return { order: 1, label: "Trente-deuxièmes de finale" };
  if (/\b(finale|final|grand final|grand finale)\b/.test(s)) return { order: 6, label: "Finale" };
  return null;
}

export type CompetitionBracketRound = { label: string; order: number; completed: DartsLiveResult[]; scheduled: DartsLiveFixture[] };
export function buildCompetitionBracket(results: DartsLiveResult[], fixtures: DartsLiveFixture[]): CompetitionBracketRound[] {
  const rounds = new Map<string, CompetitionBracketRound>();
  const confirmed = new Set<string>();
  const pairKey = (names: string[], round: string, when?: string | null) => `${competitionTextKey(round)}|${String(when || "").slice(0, 10)}|${names.map(competitionTextKey).sort().join("|")}`;
  for (const match of results) {
    const p = knockoutPhase(match.round);
    if (!p) continue;
    const round = rounds.get(p.label) || { label: p.label, order: p.order, completed: [], scheduled: [] };
    round.completed.push(match);
    confirmed.add(pairKey([match.winner?.name || "", match.loser?.name || ""], p.label, match.playedOn));
    rounds.set(p.label, round);
  }
  for (const match of fixtures) {
    const p = knockoutPhase(match.round);
    if (!p) continue;
    const pair = (match.players || []).map((player) => player.name || "");
    if (confirmed.has(pairKey(pair, p.label, match.startsAt || match.date))) continue;
    const round = rounds.get(p.label) || { label: p.label, order: p.order, completed: [], scheduled: [] };
    round.scheduled.push(match);
    rounds.set(p.label, round);
  }
  return [...rounds.values()].map((round) => ({ ...round,
    completed: round.completed.sort((a, b) => competitionDate(a.playedOn) - competitionDate(b.playedOn)),
    scheduled: round.scheduled.sort((a, b) => competitionDate(a.startsAt || a.date) - competitionDate(b.startsAt || b.date)),
  })).sort((a, b) => a.order - b.order);
}

/** R2's legacy index is keyed by competition name, not by country.
 *  Never borrow a foreign country's badge/counts when names collide.
 */
export function matchCompetitionIndex(entries: SportLiveCompetitionIndexEntry[], name: string, code?: string | null, country?: string | null): SportLiveCompetitionIndexEntry | null {
  const exact = entries.filter((entry) => competitionTextKey(entry.name) === competitionTextKey(name));
  if (!exact.length) return null;
  const countryCode = competitionTextKey(code);
  const countryName = competitionTextKey(country);
  if (countryCode || countryName) {
    const sameCountry = exact.filter((entry) => (countryCode && competitionTextKey(entry.countryCode) === countryCode) || (countryName && competitionTextKey(entry.countryName) === countryName));
    if (sameCountry.length === 1) return sameCountry[0];
    if (sameCountry.length > 1) return sameCountry[0];
    // A legacy index with no geographic metadata can be used only if unambiguous.
    if (exact.length === 1 && !exact[0].countryCode && !exact[0].countryName) return exact[0];
    return null;
  }
  return exact.length === 1 ? exact[0] : null;
}
