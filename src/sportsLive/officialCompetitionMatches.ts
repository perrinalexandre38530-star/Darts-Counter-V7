/** Competition match contract shared by every LIVE discipline. Only provider
 * matches or authenticated federation uploads belong in this feed; never
 * manufacture a match from a news headline or an unverified score.
 */
export type VerifiedCompetitionMatch = {
  id: string;
  participantA: string;
  participantB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled" | "unknown";
  startsAt: string | null;
  stage: string | null;
  group: string | null;
  matchday: number | null;
};
export type CompetitionMatchesResponse = {
  available: boolean;
  sport: string;
  competition: string;
  season: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  updatedAt: string | null;
  matches: VerifiedCompetitionMatch[];
  reason?: string;
};
const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const text = (value: unknown, limit = 140) => String(value ?? "").trim().slice(0,limit);
const iso = (value: unknown): string | null => typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const STATUS: Record<string, VerifiedCompetitionMatch["status"]> = {
  SCHEDULED: "scheduled", TIMED: "scheduled", IN_PLAY: "live", LIVE: "live", PAUSED: "live",
  FINISHED: "finished", AWARDED: "finished", POSTPONED: "postponed", SUSPENDED: "postponed", CANCELLED: "cancelled",
};
/** Safely normalize the bounded match data of an authorized provider. */
export function normalizeVerifiedMatch(row: unknown): VerifiedCompetitionMatch | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const r = row as Record<string, unknown>;
  const id = text(r.id, 100);
  if (!id) return null;
  const status = ["scheduled","live","finished","postponed","cancelled","unknown"].includes(String(r.status))
    ? r.status as VerifiedCompetitionMatch["status"] : "unknown";
  const matchday = num(r.matchday);
  return {
    id, participantA:text(r.participantA) || "À confirmer",participantB:text(r.participantB) || "À confirmer",
    scoreA:num(r.scoreA),scoreB:num(r.scoreB),status,
    startsAt:iso(r.startsAt),stage:text(r.stage,90) || null,group:text(r.group,90) || null,
    matchday:matchday !== null && Number.isInteger(matchday) && matchday > 0 ? matchday : null,
  };
}
/** Trust only the football-data competition match resource, not search results.
 * Do not infer the winner when a leg, shootout or penalty score is missing.
 */
export function projectFootballCompetitionMatches(raw: any, requestedCompetition: string, requestedSeason: string | null): CompetitionMatchesResponse {
  const sourceName = "football-data.org";
  const seen = new Set<string>();
  const matches: VerifiedCompetitionMatch[] = [];
  for (const row of Array.isArray(raw?.matches) ? raw.matches.slice(0, 3000) : []) {
    if (!row || (typeof row.id !== "number" && typeof row.id !== "string")) continue;
    const id = String(row.id);
    if (seen.has(id)) continue;
    const home = text(row?.homeTeam?.name || row?.homeTeam?.shortName) || "À confirmer";
    const away = text(row?.awayTeam?.name || row?.awayTeam?.shortName) || "À confirmer";
    if (home === "À confirmer" && away === "À confirmer") continue;
    const status = STATUS[text(row.status).toUpperCase()] || "unknown";
    // If a match is upcoming, fullTime may be blank or be a stale 0-0.
    const played = status === "finished" || status === "live";
    const match = normalizeVerifiedMatch({
      id,participantA:home,participantB:away,
      scoreA:played ? row?.score?.fullTime?.home : null,
      scoreB:played ? row?.score?.fullTime?.away : null,
      status,startsAt:row.utcDate,stage:row.stage,group:row.group,matchday:row.matchday,
    });
    if (match) { seen.add(id); matches.push(match); }
  }
  const seasonFromProvider = text(raw?.filters?.season || raw?.season?.startDate).match(/^(?:19|20)\d{2}/)?.[0] || null;
  const season = requestedSeason || seasonFromProvider;
  if (requestedSeason && seasonFromProvider && seasonFromProvider !== requestedSeason) {
    return {available:false,sport:"foot",competition:requestedCompetition,season:requestedSeason,
      sourceName,sourceUrl:"https://www.football-data.org/",updatedAt:new Date().toISOString(),matches:[],
      reason:"La saison renvoyée par le fournisseur ne correspond pas à l'édition demandée."};
  }
  return {available:matches.length > 0,sport:"foot",competition:text(raw?.competition?.name) || requestedCompetition,
    season,sourceName,sourceUrl:"https://www.football-data.org/",updatedAt:new Date().toISOString(),matches,
    ...(!matches.length ? {reason:"Aucune rencontre structurée disponible pour cette compétition."} : {})};
}

const knockoutStages = new Set(["LAST_64", "LAST_32", "LAST_16", "ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL", "THIRD_PLACE", "PLAYOFFS", "PLAY_OFFS", "PRELIMINARY_ROUND"]);
const STAGE_ORDER: Record<string,number> = {PRELIMINARY_ROUND:10,LAST_64:20,LAST_32:30,LAST_16:40,ROUND_OF_16:40,QUARTER_FINALS:50,SEMI_FINALS:60,THIRD_PLACE:65,FINAL:70,PLAYOFFS:80,PLAY_OFFS:80};
export function isVerifiedKnockoutStage(stage: string | null): boolean {
  return knockoutStages.has(String(stage || "").toUpperCase());
}
export function verifiedStageLabel(stage: string | null, matchday: number | null = null, group: string | null = null): string {
  const code = String(stage || "").toUpperCase();
  const known: Record<string,string> = {LAST_64:"64es de finale",LAST_32:"16es de finale",LAST_16:"Huitièmes de finale",ROUND_OF_16:"Huitièmes de finale",QUARTER_FINALS:"Quarts de finale",SEMI_FINALS:"Demi-finales",FINAL:"Finale",THIRD_PLACE:"Petite finale",GROUP_STAGE:"Phase de groupes",REGULAR_SEASON:"Championnat",PRELIMINARY_ROUND:"Tour préliminaire",PLAYOFFS:"Barrages",PLAY_OFFS:"Barrages"};
  const title = known[code] || text(stage,80).replace(/_/g," ") || "Rencontres";
  return `${title}${group ? ` · ${text(group,30).replace(/^GROUP_/i,"Groupe ")}` : ""}${matchday && !isVerifiedKnockoutStage(stage) ? ` · Journée ${matchday}` : ""}`;
}
export function verifiedKnockoutRounds(matches: VerifiedCompetitionMatch[]) {
  const grouped = new Map<string, {id:string;name:string;order:number;matches:VerifiedCompetitionMatch[]}>();
  for (const match of matches) {
    if (!isVerifiedKnockoutStage(match.stage)) continue;
    const id = String(match.stage).toUpperCase();
    if (!grouped.has(id)) grouped.set(id,{id,name:verifiedStageLabel(id),order:STAGE_ORDER[id] || 99,matches:[]});
    grouped.get(id)!.matches.push(match);
  }
  return [...grouped.values()].sort((a,b)=>a.order-b.order).map(round=>({...round,matches:round.matches.sort((a,b)=>(Date.parse(a.startsAt || "") || 0)-(Date.parse(b.startsAt || "") || 0))}));
}
