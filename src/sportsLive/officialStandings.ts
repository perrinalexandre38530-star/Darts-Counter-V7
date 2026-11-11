/** Football standings adapter. An explicit competition+country allowlist prevents
 * a similarly named league in another country being given the wrong table.
 * All sports share the same display schema; unsupported providers remain absent.
 */
export type OfficialStandingRow = {
  position: number;
  name: string;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number | null;
  points: number | null;
};
export type OfficialStandingTable = {
  name: string;
  stage: string | null;
  group: string | null;
  rows: OfficialStandingRow[];
};
export type OfficialStandingsResponse = {
  available: boolean;
  sport: string;
  competition: string;
  season: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  updatedAt: string | null;
  tables: OfficialStandingTable[];
  reason?: string;
};

function norm(value: unknown): string {
  return String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(?:19|20)\d{2}(?:\s*[-/]\s*(?:19|20)?\d{2})?\b/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}
function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

const PROVIDERS: ReadonlyArray<{ code: string; aliases: string[]; countries?: string[] }> = [
  { code: "PL", aliases: ["premier league", "english premier league"], countries: ["angleterre", "england", "eng", "gb", "uk", "royaume uni"] },
  { code: "FL1", aliases: ["ligue 1", "ligue 1 mcdonalds", "ligue 1 uber eats"], countries: ["france", "fr"] },
  { code: "BL1", aliases: ["bundesliga", "1 bundesliga"], countries: ["allemagne", "germany", "de", "ger", "deu"] },
  { code: "SA", aliases: ["serie a", "serie a enilive", "serie a tim"], countries: ["italie", "italy", "it", "ita"] },
  { code: "PD", aliases: ["la liga", "laliga", "primera division", "laliga ea sports"], countries: ["espagne", "spain", "es", "esp"] },
  { code: "DED", aliases: ["eredivisie", "dutch eredivisie"], countries: ["pays bas", "netherlands", "nl", "ned", "hollande"] },
  { code: "ELC", aliases: ["efl championship", "championship"], countries: ["angleterre", "england", "eng", "gb", "uk", "royaume uni"] },
  { code: "PPL", aliases: ["primeira liga", "liga portugal", "liga portugal betclic"], countries: ["portugal", "pt", "por"] },
  { code: "BSA", aliases: ["brasileirao", "brasileirao serie a", "campeonato brasileiro serie a"], countries: ["bresil", "brazil", "br", "bra"] },
  { code: "CL", aliases: ["uefa champions league", "champions league", "ligue des champions"], countries: ["europe", "uefa", "monde", "world", "international"] },
  { code: "EC", aliases: ["uefa european championship", "uefa euro", "euro", "championnat d europe"], countries: ["europe", "uefa", "monde", "world", "international"] },
  { code: "WC", aliases: ["fifa world cup", "world cup", "coupe du monde", "coupe du monde fifa"], countries: ["monde", "world", "international"] },
];
/** No fuzzy search: league names are not unique around the world. */
export function footballCompetitionCode(name: string, country?: string | null): string | null {
  const match = PROVIDERS.find((item) => item.aliases.includes(norm(name)));
  if (!match) return null;
  const region = norm(country);
  if (region && !(match.countries || []).includes(region)) return null;
  // Generic national league names are unsafe without a country.
  if (!region && (match.countries || []).length && !["CL", "EC", "WC"].includes(match.code)) return null;
  return match.code;
}

/** Strictly project the provider's TOTAL tables; HOME/AWAY must not be mixed. */
export function projectFootballStandings(raw: any, requestedName: string): OfficialStandingsResponse {
  const sourceName = "football-data.org";
  const tables: OfficialStandingTable[] = [];
  for (const item of Array.isArray(raw?.standings) ? raw.standings : []) {
    if (item?.type !== "TOTAL" || !Array.isArray(item.table)) continue;
    const rows: OfficialStandingRow[] = (item.table as unknown[]).slice(0, 100).flatMap((row: any): OfficialStandingRow[] => {
      const name = String(row?.team?.name || row?.team?.shortName || "").trim();
      const position = finite(row?.position);
      const points = finite(row?.points);
      if (!name || position === null || points === null) return [];
      return [{position, name, played:finite(row.playedGames) ?? 0, won:finite(row.won) ?? 0,
        drawn:finite(row.draw) ?? 0, lost:finite(row.lost) ?? 0,
        goalsFor:finite(row.goalsFor), goalsAgainst:finite(row.goalsAgainst),
        goalDifference:finite(row.goalDifference), points}];
    }).sort((a,b) => a.position - b.position);
    if (!rows.length) continue;
    const group = typeof item.group === "string" && item.group ? item.group.replace(/^GROUP_/, "Groupe ") : null;
    const stage = typeof item.stage === "string" ? item.stage : null;
    tables.push({name: group || (stage === "REGULAR_SEASON" ? "Classement général" : stage?.replace(/_/g, " ") || "Classement"), stage, group, rows});
  }
  const startDate = String(raw?.season?.startDate || "");
  const season = /^\d{4}-/.test(startDate) ? startDate.slice(0, 4) : null;
  return {available:tables.length > 0, sport:"foot", competition:String(raw?.competition?.name || requestedName),
    season, sourceName, sourceUrl:"https://www.football-data.org/", updatedAt:new Date().toISOString(), tables,
    ...(!tables.length ? {reason:"Aucun classement TOTAL disponible pour cette compétition."} : {})};
}
