import type { SportId } from "../contexts/SportContext";
import {
  DARTS_LIVE_SOURCES,
  getAvailableRegions as getDartsAvailableRegions,
  getRecommendedSources as getDartsRecommendedSources,
} from "../dartsLive/sources";
import type { SportLiveLocaleProfile, SportLiveMeta, SportLiveRegion, SportLiveSource } from "./types";

export const SPORT_LIVE_ORDER: SportId[] = [
  "darts",
  "petanque",
  "pingpong",
  "babyfoot",
  "molkky",
  "padel",
  "badminton",
  "cornhole",
  "palet",
  "bowling",
];

export const SPORT_LIVE_META: Record<SportId, SportLiveMeta> = {
  darts: { id: "darts", icon: "🎯", label: "Fléchettes", shortLabel: "Darts", accent: "#ffcf5a" },
  petanque: { id: "petanque", icon: "🟠", label: "Pétanque", shortLabel: "Pétanque", accent: "#ffb65a" },
  pingpong: { id: "pingpong", icon: "🏓", label: "Ping-Pong", shortLabel: "Ping-Pong", accent: "#70d8ff" },
  babyfoot: { id: "babyfoot", icon: "⚽", label: "Baby-foot", shortLabel: "Baby-foot", accent: "#7fe2a9" },
  molkky: { id: "molkky", icon: "🪵", label: "Mölkky", shortLabel: "Mölkky", accent: "#d9b37c" },
  padel: { id: "padel", icon: "🎾", label: "Padel", shortLabel: "Padel", accent: "#d7ff75" },
  badminton: { id: "badminton", icon: "🏸", label: "Badminton", shortLabel: "Badminton", accent: "#d3a4ff" },
  cornhole: { id: "cornhole", icon: "🟫", label: "Cornhole", shortLabel: "Cornhole", accent: "#ff9b74" },
  palet: { id: "palet", icon: "🥏", label: "Palet", shortLabel: "Palet", accent: "#b8c7d9" },
  bowling: { id: "bowling", icon: "🎳", label: "Bowling", shortLabel: "Bowling", accent: "#ff84c0" },
};

export const SPORT_LIVE_REGION_LABELS: Record<SportLiveRegion, string> = {
  global: "International",
  france: "France",
  francophone: "Francophone",
  uk_ireland: "UK & Irlande",
  north_america: "Amérique du Nord",
  oceania: "Australie & Nouvelle-Zélande",
  spain: "Espagne",
  latin_america: "Amérique latine & Caraïbes",
  dach: "Allemagne / Autriche / Suisse",
  benelux: "Benelux",
  italy: "Italie",
  portugal: "Portugal / lusophone",
  nordic_baltic: "Nordique & Baltique",
  poland: "Pologne",
  czechia: "Tchéquie",
  balkans: "Balkans",
  eastern_europe: "Europe de l'Est",
  turkey: "Turquie",
  arab_middle_east: "Monde arabe & Moyen-Orient",
  india_asia: "Inde & Asie du Sud",
  japan_asia: "Japon & Asie",
  china_asia: "Chine & Asie",
  europe: "Europe",
  asia: "Asie",
};

export const SPORT_LIVE_LOCALE_PROFILES: Record<string, SportLiveLocaleProfile> = {
  fr: { locale: "fr", label: "France / francophone", preferredRegions: ["france", "francophone", "global"], fallbackRegions: ["europe", "global"] },
  en: { locale: "en", label: "UK / Ireland / English-speaking", preferredRegions: ["uk_ireland", "north_america", "oceania", "global"], fallbackRegions: ["global"] },
  es: { locale: "es", label: "España / Latinoamérica", preferredRegions: ["spain", "latin_america", "global"], fallbackRegions: ["europe", "global"] },
  de: { locale: "de", label: "DACH", preferredRegions: ["dach", "global"], fallbackRegions: ["europe", "global"] },
  it: { locale: "it", label: "Italia", preferredRegions: ["italy", "global"], fallbackRegions: ["europe", "global"] },
  pt: { locale: "pt", label: "Portugal / lusophone", preferredRegions: ["portugal", "global"], fallbackRegions: ["europe", "global"] },
  nl: { locale: "nl", label: "Nederland / Benelux", preferredRegions: ["benelux", "global"], fallbackRegions: ["europe", "global"] },
  ru: { locale: "ru", label: "Europe de l'Est", preferredRegions: ["eastern_europe", "global"], fallbackRegions: ["europe", "global"] },
  zh: { locale: "zh", label: "China / Asia", preferredRegions: ["china_asia", "asia", "global"], fallbackRegions: ["global"] },
  ja: { locale: "ja", label: "Japan / Asia", preferredRegions: ["japan_asia", "asia", "global"], fallbackRegions: ["global"] },
  ar: { locale: "ar", label: "Arab / Middle East", preferredRegions: ["arab_middle_east", "asia", "global"], fallbackRegions: ["global"] },
  hi: { locale: "hi", label: "India / Asia", preferredRegions: ["india_asia", "asia", "global"], fallbackRegions: ["global"] },
  tr: { locale: "tr", label: "Türkiye", preferredRegions: ["turkey", "global"], fallbackRegions: ["europe", "global"] },
  da: { locale: "da", label: "Danmark / Nordic", preferredRegions: ["nordic_baltic", "global"], fallbackRegions: ["europe", "global"] },
  no: { locale: "no", label: "Norge / Nordic", preferredRegions: ["nordic_baltic", "global"], fallbackRegions: ["europe", "global"] },
  sv: { locale: "sv", label: "Sverige / Nordic", preferredRegions: ["nordic_baltic", "global"], fallbackRegions: ["europe", "global"] },
  is: { locale: "is", label: "Ísland / Nordic", preferredRegions: ["nordic_baltic", "global"], fallbackRegions: ["europe", "global"] },
  pl: { locale: "pl", label: "Polska", preferredRegions: ["poland", "eastern_europe", "global"], fallbackRegions: ["europe", "global"] },
  ro: { locale: "ro", label: "România", preferredRegions: ["eastern_europe", "global"], fallbackRegions: ["europe", "global"] },
  sr: { locale: "sr", label: "Srbija / Balkans", preferredRegions: ["balkans", "global"], fallbackRegions: ["europe", "global"] },
  hr: { locale: "hr", label: "Hrvatska / Balkans", preferredRegions: ["balkans", "global"], fallbackRegions: ["europe", "global"] },
  cs: { locale: "cs", label: "Česko", preferredRegions: ["czechia", "eastern_europe", "global"], fallbackRegions: ["europe", "global"] },
};

const OTHER_SPORT_SOURCES: SportLiveSource[] = [
  // PÉTANQUE
  {
    id: "petanque-fipjp", sport: "petanque", name: "Fédération Internationale de Pétanque et Jeu Provençal", shortName: "FIPJP",
    description: "Fédération internationale : championnats du monde, actualités et informations officielles.", kind: "governing_body",
    regions: ["global", "europe", "francophone"], official: true, homeUrl: "https://www.fipjp.org/", watchUrl: "https://www.youtube.com/@FIPJP", badges: ["MONDE", "FIPJP"]
  },
  {
    id: "petanque-ffpjp", sport: "petanque", name: "FFPJP Compétitions", shortName: "FFPJP",
    description: "Compétitions fédérales françaises, calendriers, championnats et résultats officiels.", kind: "results",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://compet.ffpjp.org/", resultsUrl: "https://compet.ffpjp.org/", calendarUrl: "https://compet.ffpjp.org/", badges: ["FRANCE", "FFPJP"]
  },

  // TENNIS DE TABLE / PING-PONG
  {
    id: "pingpong-ittf", sport: "pingpong", name: "International Table Tennis Federation", shortName: "ITTF",
    description: "Calendrier international officiel ITTF et accès aux grandes compétitions mondiales.", kind: "governing_body",
    regions: ["global", "europe", "asia", "north_america", "oceania"], official: true, homeUrl: "https://www.ittf.com/", calendarUrl: "https://www.ittf.com/2026-events-calendar/", badges: ["MONDE", "ITTF"]
  },
  {
    id: "pingpong-wtt", sport: "pingpong", name: "World Table Tennis", shortName: "WTT",
    description: "Circuit WTT : événements, tableaux, résultats et contenus officiels.", kind: "tour",
    regions: ["global", "europe", "asia", "north_america", "oceania"], official: true, homeUrl: "https://worldtabletennis.com/", scoresUrl: "https://worldtabletennis.com/", resultsUrl: "https://worldtabletennis.com/", badges: ["WTT", "LIVE"]
  },
  {
    id: "pingpong-fftt", sport: "pingpong", name: "Fédération Française de Tennis de Table", shortName: "FFTT",
    description: "Compétitions françaises, live scoring, tableaux, programme et diffusion officielle lorsqu'elle est proposée.", kind: "live_scores",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.fftt.com/", scoresUrl: "https://www.fftt.com/competition/", resultsUrl: "https://www.fftt.com/competition/", badges: ["FRANCE", "LIVE"]
  },

  // BABY-FOOT / TABLE SOCCER
  {
    id: "babyfoot-itsf", sport: "babyfoot", name: "International Table Soccer Federation", shortName: "ITSF",
    description: "Tournois internationaux, World Series, classements, résultats et streams officiels de baby-foot.", kind: "governing_body",
    regions: ["global", "europe", "uk_ireland", "north_america", "oceania", "asia"], official: true, homeUrl: "https://www.tablesoccer.org/", scoresUrl: "https://www.tablesoccer.org/", resultsUrl: "https://www.tablesoccer.org/", calendarUrl: "https://www.tablesoccer.org/", watchUrl: "https://www.tablesoccer.org/", badges: ["MONDE", "ITSF", "LIVE"]
  },
  {
    id: "babyfoot-ffbf", sport: "babyfoot", name: "Fédération Française de Baby-Foot", shortName: "FFBF",
    description: "Tournois, classements et compétitions officielles de baby-foot en France.", kind: "results",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://ffbabyfoot.fr/", resultsUrl: "https://ffbabyfoot.fr/competition", calendarUrl: "https://ffbabyfoot.fr/competition", badges: ["FRANCE", "FFBF"]
  },

  // MÖLKKY
  {
    id: "molkky-imo", sport: "molkky", name: "International Mölkky Organisation", shortName: "IMO",
    description: "Organisation internationale : championnats du monde et d'Europe, membres et compétitions officielles.", kind: "governing_body",
    regions: ["global", "europe", "oceania", "asia", "north_america"], official: true, homeUrl: "https://www.international-molkky.org/", calendarUrl: "https://www.international-molkky.org/world-championships", resultsUrl: "https://www.international-molkky.org/world-championships", badges: ["MONDE", "IMO"]
  },
  {
    id: "molkky-ffm", sport: "molkky", name: "Fédération Française de Mölkky", shortName: "FFM",
    description: "Calendrier français et informations sur les tournois officiels nationaux et internationaux.", kind: "calendar",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://ff-molkky.fr/", calendarUrl: "https://ff-molkky.fr/partout-dans-le-monde/", badges: ["FRANCE", "FFM"]
  },

  // PADEL
  {
    id: "padel-fip", sport: "padel", name: "International Padel Federation", shortName: "FIP",
    description: "Tournois FIP, compétitions en cours, résultats, tableaux et calendrier international.", kind: "live_scores",
    regions: ["global", "europe", "spain", "latin_america", "arab_middle_east", "asia"], official: true, homeUrl: "https://www.padelfip.com/", scoresUrl: "https://www.padelfip.com/live/", resultsUrl: "https://www.padelfip.com/titles-and-finals/", calendarUrl: "https://www.padelfip.com/", badges: ["MONDE", "FIP", "LIVE"]
  },
  {
    id: "padel-premier", sport: "padel", name: "Premier Padel", shortName: "Premier Padel",
    description: "Circuit professionnel officiel : calendrier, événements en cours, résultats et liens de diffusion.", kind: "tour",
    regions: ["global", "europe", "spain", "latin_america", "arab_middle_east"], official: true, homeUrl: "https://premierpadel.com/", scoresUrl: "https://premierpadel.com/en/tournaments", resultsUrl: "https://premierpadel.com/en/tournaments", calendarUrl: "https://premierpadel.com/en/tournaments", watchUrl: "https://premierpadel.com/en/tournaments", badges: ["PRO", "LIVE"]
  },
  {
    id: "padel-fft", sport: "padel", name: "Fédération Française de Tennis · Padel", shortName: "FFT Padel",
    description: "Compétitions nationales françaises de padel, championnats, calendriers et palmarès.", kind: "calendar",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.fft.fr/nos-sports/padel", resultsUrl: "https://www.fft.fr/nos-sports/padel/competitions-padel", calendarUrl: "https://www.fft.fr/nos-sports/padel/competitions-padel", badges: ["FRANCE", "FFT"]
  },

  // BADMINTON
  {
    id: "badminton-bwf", sport: "badminton", name: "Badminton World Federation", shortName: "BWF",
    description: "Fédération mondiale et circuits internationaux : calendrier, événements, rankings et résultats.", kind: "governing_body",
    regions: ["global", "europe", "asia", "north_america", "oceania"], official: true, homeUrl: "https://bwfbadminton.com/", calendarUrl: "https://bwfbadminton.com/calendar/", resultsUrl: "https://bwfbadminton.com/", badges: ["MONDE", "BWF"]
  },
  {
    id: "badminton-ffbad", sport: "badminton", name: "Fédération Française de Badminton", shortName: "FFBaD",
    description: "Compétitions françaises, classements et résultats officiels.", kind: "results",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.ffbad.org/", resultsUrl: "https://www.ffbad.org/", badges: ["FRANCE", "FFBaD"]
  },

  // CORNHOLE
  {
    id: "cornhole-acl", sport: "cornhole", name: "American Cornhole League", shortName: "ACL",
    description: "Circuit majeur nord-américain de cornhole : événements, joueurs, compétitions et diffusion.", kind: "tour",
    regions: ["north_america", "global"], locales: ["en"], official: true, homeUrl: "https://www.iplayacl.com/", badges: ["USA", "ACL"]
  },
  {
    id: "cornhole-aco", sport: "cornhole", name: "American Cornhole Organization", shortName: "ACO",
    description: "Événements ACO, classements, brackets et résultats de tournois.", kind: "results",
    regions: ["north_america", "global"], locales: ["en"], official: true, homeUrl: "https://americancornhole.com/", resultsUrl: "https://americancornhole.com/results/", badges: ["USA", "ACO", "RÉSULTATS"]
  },
  {
    id: "cornhole-ofch", sport: "cornhole", name: "Organisation Française de Cornhole", shortName: "OFCH",
    description: "Championnat français, tournois officiels, calendrier et informations de l'équipe de France.", kind: "calendar",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.ofch.fr/", calendarUrl: "https://www.ofch.fr/evenements/", resultsUrl: "https://www.ofch.fr/", badges: ["FRANCE", "OFCH"]
  },

  // PALET
  {
    id: "palet-fnsmr", sport: "palet", name: "Palet FNSMR", shortName: "Palet FNSMR",
    description: "Site officiel du palet : Coupes de France, résultats, informations de compétition et directs YouTube lorsqu'ils existent.", kind: "results",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.le-palet.com/", resultsUrl: "https://www.le-palet.com/", watchUrl: "https://www.youtube.com/@crsmrpays-de-la-loire", badges: ["FRANCE", "COUPE DE FRANCE"]
  },

  // BOWLING
  {
    id: "bowling-ibf", sport: "bowling", name: "International Bowling Federation", shortName: "IBF",
    description: "Compétitions mondiales officielles avec résultats, scoring en ligne et live streaming selon les événements.", kind: "governing_body",
    regions: ["global", "europe", "asia", "north_america", "oceania"], official: true, homeUrl: "https://bowling.sport/", resultsUrl: "https://bowling.sport/", calendarUrl: "https://bowling.sport/", watchUrl: "https://bowling.sport/", badges: ["MONDE", "IBF"]
  },
  {
    id: "bowling-pba", sport: "bowling", name: "Professional Bowlers Association", shortName: "PBA",
    description: "PBA Tour : calendrier professionnel, résultats, détails des tournois et diffuseurs officiels.", kind: "tour",
    regions: ["north_america", "global"], locales: ["en"], official: true, homeUrl: "https://www.pba.com/", calendarUrl: "https://www.pba.com/schedule/pba-tour", resultsUrl: "https://www.pba.com/schedule/pba-tour", badges: ["USA", "PBA", "PRO"]
  },
  {
    id: "bowling-ffbsq", sport: "bowling", name: "Fédération Française de Bowling et de Sport de Quilles", shortName: "FFBSQ",
    description: "Fédération française : compétitions, disciplines, calendriers et informations officielles.", kind: "governing_body",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.ffbsq.fr/", badges: ["FRANCE", "FFBSQ"]
  },
];

const DARTS_AS_GENERIC: SportLiveSource[] = DARTS_LIVE_SOURCES.map((source) => ({
  ...source,
  sport: "darts" as const,
  regions: source.regions as SportLiveRegion[],
}));

export const SPORT_LIVE_SOURCES: SportLiveSource[] = [...DARTS_AS_GENERIC, ...OTHER_SPORT_SOURCES];

export function getLocaleProfile(locale: string | null | undefined): SportLiveLocaleProfile {
  const key = String(locale || "fr").toLowerCase().split("-")[0];
  return SPORT_LIVE_LOCALE_PROFILES[key] || SPORT_LIVE_LOCALE_PROFILES.en;
}

export function getSportSources(sport: SportId): SportLiveSource[] {
  return SPORT_LIVE_SOURCES.filter((source) => source.sport === sport);
}

export function getRecommendedSportSources(sport: SportId, locale: string | null | undefined): SportLiveSource[] {
  if (sport === "darts") {
    return getDartsRecommendedSources(locale).map((source) => ({ ...source, sport: "darts" as const, regions: source.regions as SportLiveRegion[] }));
  }

  const profile = getLocaleProfile(locale);
  const localeKey = String(locale || "fr").toLowerCase().split("-")[0];
  const preferred = new Set<SportLiveRegion>(profile.preferredRegions);
  const sources = getSportSources(sport);

  const scored = sources
    .map((source) => {
      let score = 0;
      if (source.locales?.includes(localeKey)) score += 100;
      if (source.regions.some((region) => preferred.has(region))) score += 50;
      if (source.regions.includes("global")) score += 15;
      if (source.official) score += 5;
      return { source, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.source.name.localeCompare(b.source.name));

  return scored.length ? scored.map((item) => item.source) : sources;
}

export function getAvailableRegions(sport: SportId, locale: string | null | undefined): SportLiveRegion[] {
  if (sport === "darts") return getDartsAvailableRegions(locale) as SportLiveRegion[];
  const profile = getLocaleProfile(locale);
  const sourceRegions = new Set(getSportSources(sport).flatMap((source) => source.regions));
  const result: SportLiveRegion[] = [];
  const candidates = [...profile.preferredRegions, ...profile.fallbackRegions, "global" as SportLiveRegion, ...Array.from(sourceRegions)];
  for (const region of candidates) {
    if (sourceRegions.has(region) && !result.includes(region)) result.push(region);
  }
  return result;
}
