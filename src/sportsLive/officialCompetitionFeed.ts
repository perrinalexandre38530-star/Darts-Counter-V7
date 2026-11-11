/** Versioned, provider-attributed standings / knockout feed shared by every LIVE sport.
 * These records must be uploaded by an authorized data supplier; they are NEVER
 * inferred from article text or from unordered lists of match scores.
 */
import type { OfficialStandingsResponse, OfficialStandingRow, OfficialStandingTable } from "./officialStandings";
import { LIVE_SPORTS_APP_ORDER } from "./support";
import { normalizeVerifiedMatch } from "./officialCompetitionMatches";
import type { VerifiedCompetitionMatch } from "./officialCompetitionMatches";

export type VerifiedBracketMatch = {
  id: string;
  participantA: string;
  participantB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: "scheduled" | "live" | "finished" | "unknown";
  startsAt: string | null;
  nextMatchId: string | null;
};
export type VerifiedBracketRound = { id: string; name: string; order: number; matches: VerifiedBracketMatch[] };
export type ManagedCompetitionResponse = OfficialStandingsResponse & {
  country: string;
  bracket: VerifiedBracketRound[];
  matches?: VerifiedCompetitionMatch[];
};

export function officialIdentity(value: unknown): string {
  return String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}
const fnv = (value: string): string => {
  let acc = 2166136261;
  for (let i = 0; i < value.length; i++) acc = Math.imul(acc ^ value.charCodeAt(i), 16777619);
  return (acc >>> 0).toString(16).padStart(8, "0");
};
const segment = (value: string): string => `${officialIdentity(value).replace(/\s+/g, "-").slice(0, 64) || "unknown"}-${fnv(officialIdentity(value))}`;

export function officialSeason(value: unknown): string | null {
  const season = String(value || "").trim();
  return /^(?:19[7-9]\d|20\d{2})$/.test(season) ? season : season === "current" || season === "" ? "current" : null;
}
export function managedCompetitionKey(sport: string, country: string, competition: string, season: string): string | null {
  if (!LIVE_SPORTS_APP_ORDER.some(id => id === sport) || !officialIdentity(country) || !officialIdentity(competition) || !officialSeason(season)) return null;
  return `sports-live-official/v1/${sport}/${segment(country)}/${segment(competition)}/${officialSeason(season)}.json`;
}
const numberOrNull = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const cleanText = (v: unknown, max = 160): string => String(v ?? "").trim().slice(0, max);
const safeUrl = (value: unknown): string | null => {
  try { const url = new URL(String(value)); return url.protocol === "https:" ? url.toString().slice(0, 500) : null; }
  catch { return null; }
};

/** Returns null for any untrusted/malformed payload, with bounded arrays for R2. */
export function parseManagedCompetitionFeed(input: unknown, sport: string): ManagedCompetitionResponse | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, any>;
  if (raw.sport !== sport || !LIVE_SPORTS_APP_ORDER.some(id => id === sport)) return null;
  const competition = cleanText(raw.competition, 140);
  const country = cleanText(raw.country, 100);
  const season = officialSeason(raw.season);
  const sourceName = cleanText(raw.sourceName, 100);
  const sourceUrl = safeUrl(raw.sourceUrl);
  if (!competition || !country || !season || !sourceName || !sourceUrl) return null;
  if (!Array.isArray(raw.tables) || !Array.isArray(raw.bracket) || raw.tables.length > 30 || raw.bracket.length > 32 || (raw.matches !== undefined && (!Array.isArray(raw.matches) || raw.matches.length > 3000))) return null;
  const tables: OfficialStandingTable[] = [];
  for (const t of raw.tables) {
    if (!t || !Array.isArray(t.rows) || t.rows.length > 300 || !cleanText(t.name)) return null;
    const rows: OfficialStandingRow[] = [];
    for (const r of t.rows) {
      if (!r || typeof r !== "object") return null;
      const position = numberOrNull(r?.position);
      const name = cleanText(r?.name);
      if (!name || position === null || !Number.isInteger(position) || position < 1) return null;
      const nonnegative = (value: unknown): number | null => {
        const n = numberOrNull(value);
        return n !== null && n >= 0 ? n : null;
      };
      rows.push({position,name,played:nonnegative(r.played),won:nonnegative(r.won),drawn:nonnegative(r.drawn),lost:nonnegative(r.lost),
        goalsFor:nonnegative(r.goalsFor),goalsAgainst:nonnegative(r.goalsAgainst),goalDifference:numberOrNull(r.goalDifference),points:numberOrNull(r.points)});
    }
    tables.push({name:cleanText(t.name),stage:cleanText(t.stage) || null,group:cleanText(t.group) || null,rows:rows.sort((a,b)=>a.position-b.position)});
  }
  const bracket: VerifiedBracketRound[] = [];
  const matchIds = new Set<string>();
  for (const b of raw.bracket) {
    if (!b || !Array.isArray(b.matches) || b.matches.length > 256 || !cleanText(b.name)) return null;
    const matches: VerifiedBracketMatch[] = [];
    for (const m of b.matches) {
      const id = cleanText(m?.id, 100);
      if (!id || matchIds.has(id)) return null;
      matchIds.add(id);
      matches.push({id,participantA:cleanText(m.participantA) || "À confirmer",participantB:cleanText(m.participantB) || "À confirmer",
        scoreA:numberOrNull(m.scoreA),scoreB:numberOrNull(m.scoreB),
        status:["scheduled","live","finished"].includes(m.status) ? m.status : "unknown",
        startsAt: typeof m.startsAt === "string" && Number.isFinite(Date.parse(m.startsAt)) ? new Date(m.startsAt).toISOString() : null,
        nextMatchId:cleanText(m.nextMatchId,100) || null});
    }
    bracket.push({id:cleanText(b.id,100) || `round-${bracket.length+1}`,name:cleanText(b.name),order:numberOrNull(b.order) ?? bracket.length+1,matches});
  }
  // Never draw an invented qualifier connection: only a real link to an existing match.
  const matchRound = new Map(bracket.flatMap(round => round.matches.map(match => [match.id, round.order] as const)));
  for (const round of bracket) for (const match of round.matches) {
    // A source may omit bracket links. Reject invalid or backward links; do
    // not draw a path that was not explicitly supplied by the source.
    if (!match.nextMatchId || !matchIds.has(match.nextMatchId) || (matchRound.get(match.nextMatchId) ?? 0) <= round.order) match.nextMatchId = null;
  }
  const matches: VerifiedCompetitionMatch[] = [];
  const feedMatchIds = new Set<string>();
  for (const rawMatch of raw.matches || []) {
    const match = normalizeVerifiedMatch(rawMatch);
    if (!match || feedMatchIds.has(match.id)) return null;
    feedMatchIds.add(match.id);
    matches.push(match);
  }
  if (!tables.length && !bracket.length && !matches.length) return null;
  return {available:true,sport,competition,country,season:season === "current" ? null : season,sourceName,sourceUrl,
    updatedAt:new Date().toISOString(),tables,bracket,matches};
}

export function managedFeedMatches(data: ManagedCompetitionResponse, sport: string, country: string, competition: string, season: string): boolean {
  return data.sport === sport && officialIdentity(data.country) === officialIdentity(country)
    && officialIdentity(data.competition) === officialIdentity(competition)
    && officialSeason(data.season) === officialSeason(season);
}
