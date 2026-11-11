/** Verified, provider-attributed match adapters for individual LIVE competition pages.
 * Both APIs are queried only on the server using their respective Cloudflare secrets.
 * A match is never attributed to a competition based on an approximate string match.
 */
import { normalizeVerifiedMatch } from "./officialCompetitionMatches";
import type { CompetitionMatchesResponse, VerifiedCompetitionMatch } from "./officialCompetitionMatches";

const clean = (value: unknown) => String(value ?? "").trim();
const norm = (value: unknown) => clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\b(?:19[7-9]\d|20\d{2})\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const rows = (body: any): any[] => {
  if (Array.isArray(body)) return body;
  for (const part of [body?.data,body?.data?.events,body?.data?.matches,body?.events,body?.matches])
    if (Array.isArray(part)) return part;
  return [];
};
const numberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const yearOf = (value: unknown): string | null => {
  const match = clean(value).match(/(?:19[7-9]\d|20\d{2})/);
  return match?.[0] || null;
};
const iso = (value: unknown): string | null => {
  const str = clean(value);
  if (!str || !Number.isFinite(Date.parse(str))) return null;
  return new Date(str).toISOString();
};
const accurateTime = (value: unknown): string | null => {
  const raw = clean(value);
  return /[T ]\d{1,2}:\d{2}/.test(raw) ? iso(raw) : null;
};
const calendarDate = (value: unknown): string | null => {
  const raw = clean(value).slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) && Number.isFinite(Date.parse(raw)) ? raw : null;
};
const stage = (value: unknown): string | null => {
  const key = clean(value).replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  const stages: Record<string, string> = {
    QUARTER_FINAL:"QUARTER_FINALS", QUARTER_FINALS:"QUARTER_FINALS", QF:"QUARTER_FINALS",
    SEMI_FINAL:"SEMI_FINALS", SEMI_FINALS:"SEMI_FINALS", SF:"SEMI_FINALS",
    FINAL:"FINAL", ROUND_OF_16:"ROUND_OF_16", LAST_16:"ROUND_OF_16", R16:"ROUND_OF_16",
    LAST_32:"LAST_32", ROUND_OF_32:"LAST_32", LAST_64:"LAST_64",
    GROUP_STAGE:"GROUP_STAGE", ROUND_ROBIN:"GROUP_STAGE", PLAYOFFS:"PLAYOFFS", PLAY_OFFS:"PLAYOFFS",
  };
  if (!key) return null;
  return stages[key] || key.slice(0,90);
};
function unavailable(sport: string, competition: string, season: string | null, reason: string): CompetitionMatchesResponse {
  return { available:false, sport, competition, season, sourceName:null, sourceUrl:null, updatedAt:null, matches:[], reason };
}
const seasonYear = (value: string | null): string | null => /^(?:19[7-9]\d|20\d{2})$/.test(clean(value)) ? clean(value) : null;
const exactNames = <T>(data: T[], requested: string, name: (item: T) => unknown) => data.filter(item => norm(name(item)) === norm(requested));

/** Resolve an exact, unique DartsAPI competition ID. No fuzzy title / country guessing. */
export function dartsCompetitionIdentity(body: any, requested: string): string | null {
  const found = exactNames(rows(body), requested, (r:any) => r.name || r.competition_name)
    .map((r:any) => clean(r.competition_id || r.id))
    .filter(id => /^cp_[a-z0-9]{6,20}$/i.test(id));
  return new Set(found).size === 1 ? found[0] : null;
}

/** DartsAPI: result winner/loser have actual leg/set counts, fixture sides may be unconfirmed. */
export function projectDartsCompetitionMatches(results: any[], fixtures: any[], id: string, competition: string, season: string | null): CompetitionMatchesResponse {
  const found: VerifiedCompetitionMatch[] = [];
  const seen = new Set<string>();
  const requestedYear = seasonYear(season);
  const add = (row:any, scheduled:boolean) => {
    const declaredCompetitionId = clean(row?.event?.competition_id || row?.competition_id);
    // The authenticated endpoint is already scoped by competition_id; reject
    // only an explicit mismatch in its response (some fixtures omit the field).
    if (declaredCompetitionId && declaredCompetitionId !== id) return;
    const day = scheduled ? (row?.starts_at || row?.date || row?.event?.date) : (row?.played_on || row?.date || row?.finished_at);
    // Date-local event rows without a timestamp still belong to their stated year.
    if (requestedYear && yearOf(day) !== requestedYear) return;
    const matchId = clean(row?.match_id || row?.fixture_id || row?.id);
    if (!matchId || seen.has(matchId)) return;
    const suppliedSides = Array.isArray(row?.players) ? row.players : [];
    const left = scheduled ? (row?.home || row?.home_player || row?.player1 || row?.player_1 || suppliedSides[0]) : row?.winner;
    const right = scheduled ? (row?.away || row?.away_player || row?.player2 || row?.player_2 || suppliedSides[1]) : row?.loser;
    const participantA = clean(left?.name || left?.player_name || (scheduled ? row?.home_player_name : ""));
    const participantB = clean(right?.name || right?.player_name || (scheduled ? row?.away_player_name : ""));
    if (!participantA && !participantB) return;
    const isCancelled = /cancel|abandon/i.test(clean(row?.status || row?.result_status));
    const status = isCancelled ? "cancelled" : scheduled ? "scheduled" : /final|finished|settled/i.test(clean(row?.result_status || "final")) ? "finished" : "unknown";
    const match = normalizeVerifiedMatch({id:matchId,participantA:participantA || "À confirmer",participantB:participantB || "À confirmer",
      scoreA:status === "finished" ? left?.score : null,scoreB:status === "finished" ? right?.score : null,
      status,startsAt:accurateTime(day),dateOnly:calendarDate(day),stage:stage(row?.round?.name || row?.round),group:null,matchday:null});
    if (match) {seen.add(matchId);found.push(match);}
  };
  results.slice(0,900).forEach(row => add(row,false));
  fixtures.slice(0,500).forEach(row => add(row,true));
  return {available:found.length > 0,sport:"darts",competition,season:requestedYear,sourceName:"DartsAPI",sourceUrl:"https://dartsapi.com/",
    updatedAt:new Date().toISOString(),matches:found,
    ...(!found.length ? {reason:"Cette compétition n'a pas de rencontres disponibles dans la fenêtre ou le forfait du fournisseur."}: {})};
}

/** Select one exact TT event, never merge separate tournaments with similar names. */
export function tableTennisEventIdentity(body: any, requested: string, season: string | null): string | null {
  const year = seasonYear(season);
  const found = exactNames(rows(body),requested,(r:any) => r.name || r.event_name)
    .filter((r:any) => !year || yearOf(r?.start_date || r?.date || r?.starts_at || r?.name) === year)
    .map((r:any) => clean(r.event_id || r.id))
    .filter(id => /^ev_[a-z0-9]{3,30}$/i.test(id));
  return new Set(found).size === 1 ? found[0] : null;
}
export function projectTableTennisCompetitionMatches(body: any, id: string, competition: string, season: string | null): CompetitionMatchesResponse {
  const year = seasonYear(season);
  const found: VerifiedCompetitionMatch[] = [];
  const seen = new Set<string>();
  for (const row of rows(body).slice(0,3000)) {
    const eventId = clean(row?.event?.id || row?.event?.event_id || row?.event_id);
    if (eventId && eventId !== id) continue;
    const matchId = clean(row?.id || row?.match_id);
    if (!matchId || seen.has(matchId)) continue;
    const day = row?.start_time || row?.starts_at || row?.date;
    if (year && yearOf(day) !== year) continue;
    const sides = Array.isArray(row?.sides) ? row.sides : [];
    if (sides.length < 2) continue;
    const participant = (side:any) => clean(side?.name || side?.display_name || side?.team_name) ||
      (Array.isArray(side?.players) ? side.players.map((p:any) => clean(p?.name || p?.full_name)).filter(Boolean).join(" / ") : "");
    const a = participant(sides[0]), b = participant(sides[1]);
    if (!a && !b) continue;
    const rawStatus = clean(row?.status).toLowerCase();
    const status = ["finished","final","complete"].includes(rawStatus) ? "finished" :
      ["live","in_progress","playing"].includes(rawStatus) ? "live" :
      ["scheduled","upcoming","not_started"].includes(rawStatus) ? "scheduled" :
      ["postponed","suspended"].includes(rawStatus) ? "postponed" :
      ["cancelled","canceled"].includes(rawStatus) ? "cancelled" : "unknown";
    const scores = Array.isArray(row?.score) ? row.score :
      row?.score && typeof row.score === "object" ? [row.score.home ?? row.score.a ?? row.score.side1, row.score.away ?? row.score.b ?? row.score.side2] :
      [row?.score1 ?? row?.home_score, row?.score2 ?? row?.away_score];
    const scored = status === "finished" || status === "live";
    const match = normalizeVerifiedMatch({id:matchId,participantA:a || "À confirmer",participantB:b || "À confirmer",
      scoreA:scored ? numberOrNull(scores[0]) : null,scoreB:scored ? numberOrNull(scores[1]) : null,
      status,startsAt:accurateTime(day),dateOnly:calendarDate(day),stage:stage(row?.round_name || row?.round),group:row?.group || null,matchday:null});
    if (match) {seen.add(matchId);found.push(match);}
  }
  return {available:found.length > 0,sport:"pingpong",competition,season:year,sourceName:"Table Tennis API",sourceUrl:"https://tabletennisapi.com/",
    updatedAt:new Date().toISOString(),matches:found,
    ...(!found.length ? {reason:"Aucune rencontre disponible pour cette compétition et cette saison."} : {})};
}

export const providerNoData = unavailable;
