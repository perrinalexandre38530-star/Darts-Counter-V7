/** Display-only metadata for externally sourced Agenda events.
 * No badge, broadcaster or region is inferred from a generic source favicon.
 */
import type { DartsLiveFixture } from "../../dartsLive/types";
import type { SportLiveEvent } from "../../sportsLive/types";
import type { AgendaLiveVisual, AgendaLiveParticipant } from "../../planning/multisportAgenda";

function record(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}
function label(value: unknown, max = 150): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function safeAgendaImageUrl(value: unknown): string | undefined {
  const valueString = label(value, 1600);
  if (!/^https:\/\//i.test(valueString)) return undefined;
  try {
    const url = new URL(valueString);
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local") || /^(?:127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || host === "[::1]") return undefined;
    return url.toString();
  } catch { return undefined; }
}
function code(raw: unknown): string | undefined {
  const value = label(raw, 8).toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : undefined;
}

// Use country flags for *national teams only*; clubs sharing a country's name
// elsewhere must not be reclassified as a national team.
const NATIONAL_TEAMS: Record<string, string> = {
  turkey:"TR", turkiye:"TR", turquie:"TR", belgium:"BE", belgique:"BE", germany:"DE", allemagne:"DE", deutschland:"DE", france:"FR",
  netherlands:"NL", paysbas:"NL", hollande:"NL", greece:"GR", grece:"GR", serbia:"RS", serbie:"RS", slovakia:"SK", slovaquie:"SK",
  "faroe islands":"FO", "iles feroe":"FO", england:"GB", angleterre:"GB", scotland:"GB", ecosse:"GB", wales:"GB", paysdegalles:"GB",
  portugal:"PT", spain:"ES", espagne:"ES", italy:"IT", italie:"IT", croatia:"HR", croatie:"HR", austria:"AT", autriche:"AT",
  switzerland:"CH", suisse:"CH", poland:"PL", pologne:"PL", denmark:"DK", danemark:"DK", sweden:"SE", suede:"SE",
  norway:"NO", norvege:"NO", finland:"FI", finlande:"FI", iceland:"IS", islande:"IS", ireland:"IE", irlande:"IE",
  romania:"RO", roumanie:"RO", bulgaria:"BG", bulgarie:"BG", ukraine:"UA", hungary:"HU", hongrie:"HU",
  brazil:"BR", bresil:"BR", argentina:"AR", argentine:"AR", usa:"US", "united states":"US", etatsunis:"US",
  canada:"CA", mexico:"MX", mexique:"MX", japan:"JP", japon:"JP", china:"CN", chine:"CN", southkorea:"KR", coreedusud:"KR",
  australia:"AU", australie:"AU", newzealand:"NZ", nouvellezelande:"NZ", morocco:"MA", maroc:"MA", egypt:"EG", egypte:"EG",
};
function normalized(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").trim().replace(/\s+/g, " "); }
function isInternationalCompetition(name: string, family?: string | null) {
  return family === "national_teams" || /nations league|world cup|coupe du monde|euro 20\d\d|world championship qualifiers|international friendly|qualification.*mondial/i.test(name);
}
function countryOfNationalTeam(name: string, isNational: boolean): string | undefined {
  if (!isNational) return undefined;
  const value = normalized(name);
  return NATIONAL_TEAMS[value] || NATIONAL_TEAMS[value.replaceAll(" ", "")];
}
export function agendaCountryFlag(countryCode?: string | null): string | undefined {
  const iso = code(countryCode);
  return iso ? String.fromCodePoint(...[...iso].map((letter) => 127397 + letter.charCodeAt(0))) : undefined;
}

function broadcaster(rawValue: unknown): AgendaLiveVisual["broadcast"] {
  const raw = record(rawValue);
  const provider = record(raw?.broadcast);
  const source = record(raw?.broadcastInfo);
  const tv = raw?.strTVStation || raw?.strTVStation2 || raw?.strChannel || raw?.tvStation || raw?.tvChannel
    || provider.name || source.name || (typeof raw?.broadcaster === "string" ? raw.broadcaster : record(raw?.broadcaster).name);
  const name = label(tv, 70);
  if (!name || /^(?:n\/a|unknown|tbc|none|no|tbd)$/i.test(name)) return undefined;
  const logoUrl = safeAgendaImageUrl(raw?.strTVStationThumb || raw?.strTVStationLogo || provider.logoUrl || source.logoUrl);
  const watchUrl = safeAgendaImageUrl(raw?.watchUrl || provider.watchUrl || source.watchUrl);
  return { name, logoUrl, watchUrl };
}

function participant(rawPlayer: DartsLiveFixture["players"][number] | undefined, raw: Record<string, any>, home: boolean, national: boolean, sport: string): AgendaLiveParticipant | undefined {
  if (!rawPlayer?.name || rawPlayer.name === "—") return undefined;
  const nested = record(home ? raw?.homeTeam : raw?.awayTeam);
  const crest = home
    ? raw?.strHomeTeamBadge || raw?.strHomeBadge || raw?.homeBadge || nested.crest || nested.logo || nested.badge
    : raw?.strAwayTeamBadge || raw?.strAwayBadge || raw?.awayBadge || nested.crest || nested.logo || nested.badge;
  const logoUrl = safeAgendaImageUrl(rawPlayer.logoUrl || crest);
  const photoUrl = !logoUrl && sport !== "foot" ? safeAgendaImageUrl(rawPlayer.photoUrl) : undefined;
  const suppliedCountry = code(rawPlayer.countryCode || nested.countryCode || (home ? raw?.strHomeTeamCountryCode : raw?.strAwayTeamCountryCode));
  return { name: rawPlayer.name, countryCode: suppliedCountry || countryOfNationalTeam(rawPlayer.name, national), logoUrl: logoUrl || photoUrl };
}

export function agendaVisualFromFixture(sport: string, fixture: DartsLiveFixture): AgendaLiveVisual {
  const raw = record(fixture.raw);
  const competition = label(fixture.competition) || "Compétition";
  const international = isInternationalCompetition(competition, fixture.competitionMeta?.family);
  return {
    competition,
    round: label(fixture.round) || undefined,
    countryCode: code(fixture.competitionMeta?.countryCode),
    countryName: label(fixture.competitionMeta?.countryName) || undefined,
    competitionLogoUrl: safeAgendaImageUrl(fixture.competitionMeta?.logoUrl),
    participants: (fixture.players || []).slice(0,2).map((p,index)=>participant(p,raw,index===0,international,sport)).filter((p):p is AgendaLiveParticipant=>!!p),
    broadcast: broadcaster(raw),
  };
}

export function agendaVisualFromEvent(event: SportLiveEvent): AgendaLiveVisual {
  const competition = label(event.subtitle) || label(event.title) || "Compétition";
  return {
    competition,
    countryCode: code(event.competitionMeta?.countryCode),
    countryName: label(event.competitionMeta?.countryName) || undefined,
    competitionLogoUrl: safeAgendaImageUrl(event.competitionMeta?.logoUrl),
    participants: [],
  };
}
